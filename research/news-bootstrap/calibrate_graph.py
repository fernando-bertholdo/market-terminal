"""A3 — calibrate the factor->asset economic graph by price correlation.

The hand-tuned graph in `src/lib/news/graph.ts` defines WHICH edges exist (the
economic structure). This script keeps that sparse structure and re-grounds each
edge's WEIGHT in measured co-movement: for edge (factor -> asset), weight =
Pearson correlation of the asset's daily returns vs the factor's price-proxy
returns, aligned on shared trading dates.

Why keep the prior's edge set instead of a dense matrix: it preserves economic
meaning (no spurious edges from coincidental correlation) while letting the data
set magnitudes and signs. This is "the prior" of the plan (§2/§7) — Phase 3's
per-asset head refines on top of it.

No-lookahead: this is an OFFLINE build step over historical closes only. The
live product never sees future prices; it just loads the emitted weights.

Output: src/lib/news/calibratedGraph.json  (consumed by graph.ts behind a flag).
Run:    python research/news-bootstrap/calibrate_graph.py [--range 2y]
"""

from __future__ import annotations

import argparse
import json
import math
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

import yahoo

# --- Asset universe -> Yahoo symbol (mirror NewsAsset in src/types/market.ts) --
ASSET_SYMBOL: Dict[str, Optional[str]] = {
    "DI": None,          # Brazil DI rate: no free Yahoo series -> keep prior weight
    "UST": "^TNX",       # US 10y yield index
    "BRL": "BRL=X",      # USD/BRL
    "DXY": "DX-Y.NYB",
    "IBOV": "^BVSP",
    "SPX": "^GSPC",
    "OIL": "CL=F",
    "GOLD": "GC=F",
    "COPPER": "HG=F",
    "SOY": "ZS=F",
}

# --- Factor -> price proxy (None => no proxy, edges keep their prior weight) ----
FACTOR_PROXY: Dict[str, Optional[str]] = {
    "rates_us": "^TNX",
    "rates_br": None,        # no free proxy
    "usd": "DX-Y.NYB",
    "brl": "BRL=X",
    "inflation": None,       # breakevens not on the chart API -> prior
    "growth": "HG=F",        # copper as a growth proxy
    "risk": "^GSPC",
    "energy": "CL=F",
    "metals": "HG=F",
    "agriculture": "ZS=F",
    "credit": "HYG",         # HY credit ETF
    "technology": "^IXIC",   # Nasdaq composite
    "defense": "ITA",        # aerospace & defense ETF
    "power": "XLU",          # utilities ETF
}

# --- Prior edge set (mirror FACTOR_ASSET_EXPOSURES in src/lib/news/graph.ts) ----
PRIOR: Dict[str, Dict[str, float]] = {
    "rates_br": {"DI": 1, "BRL": 0.4, "IBOV": -0.25},
    "rates_us": {"UST": 1, "DXY": 0.45, "SPX": -0.25, "GOLD": -0.2},
    "usd": {"DXY": 1, "BRL": -0.7, "GOLD": -0.45, "COPPER": -0.25},
    "brl": {"BRL": 1, "IBOV": 0.25},
    "inflation": {"DI": 0.5, "UST": 0.5, "GOLD": 0.2},
    "growth": {"SPX": 0.6, "IBOV": 0.5, "COPPER": 0.5, "OIL": 0.35},
    "risk": {"SPX": 0.8, "IBOV": 0.8, "BRL": 0.55, "GOLD": -0.45, "DXY": -0.35},
    "energy": {"OIL": 1, "IBOV": 0.2},
    "metals": {"COPPER": 0.8, "GOLD": 0.6, "IBOV": 0.2},
    "agriculture": {"SOY": 1, "BRL": 0.2},
    "credit": {"SPX": 0.4, "IBOV": 0.35, "UST": -0.2},
    "technology": {"SPX": 0.5},
    "defense": {"SPX": -0.1},
    "power": {"SPX": 0.2, "OIL": 0.1},
}

MIN_OBS = 30  # minimum aligned return pairs to trust a correlation


def aligned_returns(a: List[dict], b: List[dict]) -> tuple[List[float], List[float]]:
    """Mirror of analytics.alignedReturns: returns on shared trading dates."""
    b_by_date = {bar["date"]: bar["close"] for bar in b}
    ra: List[float] = []
    rb: List[float] = []
    prev_a: Optional[float] = None
    prev_b: Optional[float] = None
    for bar in a:
        cb = b_by_date.get(bar["date"])
        if cb is None:
            continue
        ca = bar["close"]
        if prev_a not in (None, 0) and prev_b not in (None, 0):
            ra.append(ca / prev_a - 1)
            rb.append(cb / prev_b - 1)
        prev_a, prev_b = ca, cb
    return ra, rb


def correlation(xs: List[float], ys: List[float]) -> Optional[float]:
    n = min(len(xs), len(ys))
    if n < MIN_OBS:
        return None
    xs, ys = xs[-n:], ys[-n:]
    mx = sum(xs) / n
    my = sum(ys) / n
    cov = vx = vy = 0.0
    for x, y in zip(xs, ys):
        dx, dy = x - mx, y - my
        cov += dx * dy
        vx += dx * dx
        vy += dy * dy
    if vx == 0 or vy == 0:
        return None
    return cov / math.sqrt(vx * vy)


def clamp(v: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _sign(v: float) -> float:
    return 1.0 if v > 0 else -1.0 if v < 0 else 0.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--range", default="2y", help="Yahoo daily range (e.g. 1y, 2y, 5y)")
    ap.add_argument(
        "--out",
        default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "news", "calibratedGraph.json"),
    )
    args = ap.parse_args()

    symbols = set(s for s in ASSET_SYMBOL.values() if s)
    symbols |= set(s for s in FACTOR_PROXY.values() if s)

    print(f"Fetching {len(symbols)} daily series (range={args.range})...")
    closes: Dict[str, List[dict]] = {}
    for sym in sorted(symbols):
        rows = yahoo.daily_closes(sym, args.range)
        closes[sym] = rows
        print(f"  {sym:12s} {len(rows)} bars")

    weights: Dict[str, Dict[str, float]] = {}
    edges = []
    calibrated_count = 0
    prior_count = 0

    for factor, asset_weights in PRIOR.items():
        proxy = FACTOR_PROXY.get(factor)
        weights[factor] = {}
        for asset, prior_w in asset_weights.items():
            asset_sym = ASSET_SYMBOL.get(asset)
            source = "prior"
            corr: Optional[float] = None
            n = 0
            if proxy and asset_sym and closes.get(proxy) and closes.get(asset_sym):
                ra, rp = aligned_returns(closes[asset_sym], closes[proxy])
                n = len(ra)
                corr = correlation(ra, rp)
            if corr is not None:
                # Sign-PRESERVING calibration: keep the economically-vetted prior
                # direction, let |corr| set the magnitude. This avoids two traps a
                # naive corr would hit: (a) BRL=X is USD/BRL, so raw corr inverts
                # the terminal's BRL-strength convention; (b) sector-ETF proxies
                # (ITA, ^IXIC) carry market beta, not the factor's causal channel.
                # Phase 3's price-trained head is where signs are free to flip.
                weight = round(_sign(prior_w) * abs(clamp(corr)), 4)
                source = "calibrated"
                calibrated_count += 1
            else:
                weight = prior_w
                prior_count += 1
            weights[factor][asset] = weight
            edges.append({
                "factor": factor, "asset": asset,
                "prior": prior_w, "weight": weight,
                "source": source, "corr": None if corr is None else round(corr, 4),
                "n": n, "proxy": proxy, "assetSymbol": asset_sym,
            })

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "range": args.range,
        "minObs": MIN_OBS,
        "method": "pearson_corr(asset_returns, factor_proxy_returns) over prior edge set",
        "calibratedEdges": calibrated_count,
        "priorEdges": prior_count,
        "factorProxies": FACTOR_PROXY,
        "assetSymbols": ASSET_SYMBOL,
        "weights": weights,
        "edges": edges,
    }

    out_path = os.path.abspath(args.out)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"\nWrote {out_path}")
    print(f"calibrated={calibrated_count} prior={prior_count}")


if __name__ == "__main__":
    main()
