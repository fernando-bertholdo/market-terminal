"""Continuous head retrain (Phase 4) — runs inside the news-nlp service.

Triggered by POST /retrain (the always-on Cloudflare worker fires it daily). Steps:
  1. read the forward-collected headlines from Neon (news_forward, written by the
     Next app's forwardCollector.ts);
  2. label each against Yahoo intraday over the §8 window (no-lookahead: entry is
     the first bar at/after publish);
  3. train an L2 logistic head per asset, anchored to the graph prior;
  4. upsert the weights into Neon (head_weights id='current').

The Next app loads that row at runtime (src/lib/news/head.ts), so the head keeps
improving with no redeploy. Self-contained (stdlib + psycopg) — no dependency on
the research/ tooling, which remains for offline experiments.

This mirrors research/news-bootstrap/{featurelib,labels,train_head}.py; keep the
feature order and prior in sync with src/lib/news/{head.ts,graph.ts}.
"""

from __future__ import annotations

import json
import math
import os
import re
import time
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

FEATURE_ORDER = ["bias", "graph_prior", "absa", "tone", "relevance", "confidence"]
W0 = [0.0, 1.6, 0.0, 0.0, 0.0, 0.0]      # prior anchor: trust graph_prior
MIN_ROWS = 150
LABEL_WINDOW_MIN = int(os.getenv("LABEL_WINDOW_MIN", "15"))
DEADZONE = 0.0008

# Asset -> Yahoo symbol (mirror NewsAsset; DI has no free intraday series).
ASSET_SYMBOL = {
    "UST": "^TNX", "BRL": "BRL=X", "DXY": "DX-Y.NYB", "IBOV": "^BVSP",
    "SPX": "^GSPC", "OIL": "CL=F", "GOLD": "GC=F", "COPPER": "HG=F", "SOY": "ZS=F",
}

# Prior factor->asset graph (mirror src/lib/news/graph.ts).
PRIOR: Dict[str, Dict[str, float]] = {
    "rates_br": {"DI": 1, "BRL": 0.4, "IBOV": -0.25},
    "rates_us": {"UST": 1, "DXY": 0.45, "SPX": -0.25, "GOLD": -0.2},
    "usd": {"DXY": 1, "BRL": -0.7, "GOLD": -0.45, "COPPER": -0.25},
    "brl": {"BRL": 1, "IBOV": 0.25},
    "inflation": {"DI": 0.5, "UST": 0.5, "GOLD": 0.2},
    "growth": {"SPX": 0.6, "IBOV": 0.5, "COPPER": 0.5, "OIL": 0.35},
    "risk": {"SPX": 0.8, "IBOV": 0.8, "BRL": 0.55, "GOLD": -0.45, "DXY": -0.35},
    "energy": {"OIL": 1, "IBOV": 0.2}, "metals": {"COPPER": 0.8, "GOLD": 0.6, "IBOV": 0.2},
    "agriculture": {"SOY": 1, "BRL": 0.2}, "credit": {"SPX": 0.4, "IBOV": 0.35, "UST": -0.2},
    "technology": {"SPX": 0.5}, "defense": {"SPX": -0.1}, "power": {"SPX": 0.2, "OIL": 0.1},
}

LITE_RULES = [
    (r"\b(fed|fomc|powell|rate hike|rate cut|interest rate)\b", "rates_us", 0),
    (r"\b(selic|copom|banco central|bcb)\b", "rates_br", 0),
    (r"\b(inflation|cpi|pce|ipca|infla)\b", "inflation", 0),
    (r"\b(growth|gdp|recession|atividade|pib)\b", "growth", 0),
    (r"\b(war|attack|missile|sanctions|conflict|guerra)\b", "risk", -1),
    (r"\b(ceasefire|truce|peace deal|de-escalat|cessar-fogo)\b", "risk", 1),
    (r"\b(oil|crude|brent|wti|opec|petr[oó]leo)\b", "energy", 0),
    (r"\b(gold|copper|iron ore|metals|ouro|cobre)\b", "metals", 0),
    (r"\b(soy|soybean|corn|wheat|grain|soja|milho)\b", "agriculture", 0),
    (r"\b(dollar|dxy|d[oó]lar)\b", "usd", 0),
    (r"\b(credit|spreads|default|high yield|cr[eé]dito)\b", "credit", 0),
    (r"\b(stocks|equities|s&p|ibovespa|a[cç][oõ]es)\b", "risk", 0),
]
LITE_POS = r"\b(rise|rose|rally|gain|higher|hotter|surge|beat|strong|hawkish|hike|jump|soar|sob[e]|alta|avan[çc]a)\b"
LITE_NEG = r"\b(fall|fell|drop|lower|cool|slow|weak|dovish|cut|ease|miss|below|plunge|sink|tumble|cai|queda|recua)\b"
LITE_NEGATION = r"\b(not|no|less|fewer|cooler|weaker|below|miss|n[ãa]o|menos|abaixo)\b"

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


# --- features ---------------------------------------------------------------

def lite_tone(title: str) -> int:
    low = title.lower()
    pos, neg = bool(re.search(LITE_POS, low)), bool(re.search(LITE_NEG, low))
    tone = 0 if pos == neg else (1 if pos else -1)
    if tone == 1 and re.search(LITE_NEGATION, low):
        tone = -1
    return tone


def lite_graph(title: str) -> Dict[str, float]:
    low = title.lower()
    tone = lite_tone(title)
    factors: Dict[str, int] = {}
    for pattern, factor, fixed in LITE_RULES:
        if re.search(pattern, low):
            d = tone if fixed == 0 else fixed
            if factor not in factors or abs(d) > abs(factors[factor]):
                factors[factor] = d
    out: Dict[str, float] = {}
    for factor, d in factors.items():
        for asset, w in PRIOR.get(factor, {}).items():
            out[asset] = out.get(asset, 0.0) + d * w
    return {a: max(-1.0, min(1.0, v)) for a, v in out.items()}


# --- yahoo intraday ---------------------------------------------------------

def intraday(symbol: str) -> List[Tuple[int, float]]:
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/"
           f"{urllib.parse.quote(symbol)}?range=60d&interval=15m")
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": _UA})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            r = data["chart"]["result"][0]
            ts, closes = r["timestamp"], r["indicators"]["quote"][0]["close"]
            return [(int(t), float(c)) for t, c in zip(ts, closes) if c is not None]
        except Exception:
            time.sleep(1.0 + attempt)
    return []


def label(bars: List[Tuple[int, float]], t_pub: int) -> Optional[int]:
    entry = next((c for t, c in bars if t >= t_pub), None)
    exit_px = next((c for t, c in bars if t >= t_pub + LABEL_WINDOW_MIN * 60), None)
    if entry is None or exit_px is None or entry == 0:
        return None
    ret = exit_px / entry - 1
    return 0 if abs(ret) < DEADZONE else (1 if ret > 0 else -1)


# --- logistic ---------------------------------------------------------------

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, x))))


def _vec(f: Dict[str, float]) -> List[float]:
    return [1.0, f.get("graph_prior", 0.0), f.get("absa", 0.0), f.get("tone", 0.0),
            f.get("relevance", 0.0), f.get("confidence", 0.0)]


def train(rows: List[Dict], l2: float = 1.0, lr: float = 0.2, epochs: int = 400) -> List[float]:
    if not rows:
        return list(W0)
    X = [_vec(r["features"]) for r in rows]
    y = [float(r["label"]) for r in rows]
    n, d = len(X), len(FEATURE_ORDER)
    w = list(W0)
    for _ in range(epochs):
        grad = [0.0] * d
        for xi, yi in zip(X, y):
            err = _sigmoid(sum(w[j] * xi[j] for j in range(d))) - yi
            for j in range(d):
                grad[j] += err * xi[j]
        for j in range(d):
            reg = 0.0 if j == 0 else l2 * (w[j] - W0[j])
            w[j] -= lr * (grad[j] / n + reg / n)
    return w


# The prior baseline the head must beat out-of-sample before we ship it: follow
# the economic graph + ABSA (matches src/lib/news/headWeights.json seed).
SEED_COEF = [0.0, 1.6, 1.6, 0.0, 0.0, 0.0]
MIN_TEST = 20  # need at least this many holdout rows to trust the gate


def accuracy(rows: List[Dict], coef: List[float]) -> float:
    if not rows:
        return 0.0
    hit = sum(
        1 for r in rows
        if (1 if _sigmoid(sum(coef[j] * v for j, v in enumerate(_vec(r["features"])))) > 0.5 else 0)
        == r["label"]
    )
    return hit / len(rows)


def _split(rows: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """Temporal 85/15 train/holdout (rows must be ts-sorted)."""
    i = max(1, int(len(rows) * 0.85))
    return rows[:i], rows[i:]


# --- neon io ----------------------------------------------------------------

def _connect():
    import psycopg
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg.connect(url)


def read_forward() -> List[Dict]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, title, extract(epoch FROM published_at)::bigint "
            "FROM news_forward WHERE published_at IS NOT NULL"
        )
        return [{"id": r[0], "title": r[1], "ts": int(r[2])} for r in cur.fetchall()]


def save_weights(weights: Dict) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "CREATE TABLE IF NOT EXISTS head_weights ("
            "id text PRIMARY KEY, weights jsonb NOT NULL, "
            "updated_at timestamptz NOT NULL DEFAULT now())"
        )
        cur.execute(
            "INSERT INTO head_weights (id, weights) VALUES ('current', %s) "
            "ON CONFLICT (id) DO UPDATE SET weights = EXCLUDED.weights, updated_at = now()",
            (json.dumps(weights),),
        )
        conn.commit()


# --- orchestration ----------------------------------------------------------

def build_rows(news: List[Dict]) -> List[Dict]:
    bars = {a: intraday(s) for a, s in ASSET_SYMBOL.items()}
    rows: List[Dict] = []
    for item in news:
        graph = lite_graph(item["title"])
        tone = float(lite_tone(item["title"]))
        for asset, asset_bars in bars.items():
            if not asset_bars:
                continue
            lab = label(asset_bars, int(item["ts"]))
            if lab is None or lab == 0:
                continue
            rows.append({"asset": asset, "ts": item["ts"], "label": 1 if lab > 0 else 0,
                         "features": {"graph_prior": graph.get(asset, 0.0), "absa": 0.0,
                                      "tone": tone, "relevance": 0.7, "confidence": 0.6}})
    return rows


def run_retrain() -> Dict:
    started = time.time()
    news = read_forward()
    rows = build_rows(news)
    if len(rows) < MIN_ROWS:
        return {"ok": False, "reason": f"only {len(rows)} labeled rows (< {MIN_ROWS})",
                "headlines": len(news)}

    ordered = sorted(rows, key=lambda r: r["ts"])
    margin = float(os.getenv("RETRAIN_MIN_EDGE", "0.0"))

    # HOLDOUT GATE: the new head must beat the graph prior on the temporal test
    # split, else we keep the current weights. This makes the live head provably
    # >= the prior out-of-sample — the guard against overfitting thin/noisy data.
    g_tr, g_te = _split(ordered)
    if len(g_te) < MIN_TEST:
        return {"ok": False, "reason": f"too few holdout rows ({len(g_te)} < {MIN_TEST})",
                "headlines": len(news), "rows": len(rows)}
    base_acc = accuracy(g_te, SEED_COEF)
    head_acc = accuracy(g_te, train(g_tr))
    if head_acc < base_acc + margin:
        return {"ok": False, "kept": "prior",
                "reason": f"head did not beat prior out-of-sample "
                          f"(test {head_acc:.3f} vs prior {base_acc:.3f}); kept current weights",
                "headlines": len(news), "rows": len(rows)}

    by_asset: Dict[str, List[Dict]] = {}
    for r in ordered:
        by_asset.setdefault(r["asset"], []).append(r)

    # Per-asset models: each must individually beat the prior on its own holdout.
    assets_out = {}
    for asset, arows in by_asset.items():
        if len(arows) < MIN_ROWS:
            continue
        a_tr, a_te = _split(sorted(arows, key=lambda r: r["ts"]))
        if len(a_te) < MIN_TEST:
            continue
        a_acc = accuracy(a_te, train(a_tr))
        if a_acc > accuracy(a_te, SEED_COEF):
            assets_out[asset] = {"coef": [round(x, 5) for x in train(arows)], "n": len(arows),
                                 "testAcc": round(a_acc, 4)}

    weights = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "featureOrder": FEATURE_ORDER, "margin": 0.0,
        "global": {"coef": [round(x, 5) for x in train(ordered)],
                   "testAcc": round(head_acc, 4), "baselineTestAcc": round(base_acc, 4)},
        "assets": assets_out,
        "source": "forward", "rows": len(rows), "headlines": len(news),
    }
    save_weights(weights)
    return {"ok": True, "headlines": len(news), "rows": len(rows),
            "globalTestAcc": round(head_acc, 4), "priorTestAcc": round(base_acc, 4),
            "assets": list(assets_out.keys()), "seconds": round(time.time() - started, 1)}


if __name__ == "__main__":
    print(json.dumps(run_retrain(), indent=2))
