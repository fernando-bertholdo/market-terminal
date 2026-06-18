"""Build the head training table: rows of (asset, features, label, ts).

Sources:
  synthetic : seeded data with the structure the plan claims — negation flips and
              cross-effects (dollar up -> gold down) where the true label follows
              the GRAPH PRIOR / ABSA, not raw tone. Lets us validate that a learned
              head beats a tone-sign (regex-like) baseline. Runs anywhere.
  lite      : real headlines (jsonl {id,ts,title}) + Yahoo §8 labels + the
              transformers-free lite featurizer. Runnable without the service.
  service   : real headlines + Fase-1 news-nlp features (richest; needs the service).

Output: jsonl rows {asset, ts, label, features:{...}, split?}.

    python make_training_data.py --source synthetic --n 6000 --out head_train.jsonl
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
from typing import Dict, List

import featurelib

ASSETS = ["OIL", "GOLD", "SPX", "BRL", "COPPER"]

# True per-asset generative weights for the synthetic source. graph_prior and absa
# dominate; tone is weak and sometimes misleading -> a tone-only baseline is capped.
_TRUE_W = {"bias": 0.0, "graph_prior": 2.6, "absa": 2.1, "tone": 0.5,
           "relevance": 0.2, "confidence": 0.2}


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, x))))


def gen_synthetic(n: int, seed: int = 7) -> List[Dict]:
    rng = random.Random(seed)
    rows: List[Dict] = []
    for i in range(n):
        asset = rng.choice(ASSETS)
        # graph prior: the economic-graph read for this asset on this headline.
        graph_prior = rng.choice([-1.0, -0.6, -0.3, 0.0, 0.3, 0.6, 1.0]) * rng.uniform(0.6, 1.0)
        # absa: present ~40% of the time; when present it tends to agree with truth.
        absa = 0.0
        if rng.random() < 0.4:
            absa = rng.choice([-1.0, -0.7, 0.7, 1.0]) * rng.uniform(0.6, 1.0)
        # tone: raw headline polarity. Cross-effect/negation: tone often OPPOSES the
        # true driver (e.g. "dollar surges" reads positive, but gold falls).
        if rng.random() < 0.45:
            tone = -1.0 if (graph_prior + absa) > 0 else 1.0   # misleading tone
        else:
            tone = 1.0 if (graph_prior + absa) > 0 else -1.0
        tone *= rng.choice([0.0, 1.0]) if rng.random() < 0.15 else 1.0
        relevance = rng.uniform(0.4, 1.0)
        confidence = rng.uniform(0.4, 1.0)

        logit = (_TRUE_W["graph_prior"] * graph_prior + _TRUE_W["absa"] * absa
                 + _TRUE_W["tone"] * tone + _TRUE_W["relevance"] * (relevance - 0.5)
                 + _TRUE_W["confidence"] * (confidence - 0.5))
        p = _sigmoid(logit)
        label = 1 if rng.random() < p else 0
        rows.append({
            "asset": asset, "ts": i, "label": label,
            "features": {"graph_prior": round(graph_prior, 4), "absa": round(absa, 4),
                         "tone": tone, "relevance": round(relevance, 4),
                         "confidence": round(confidence, 4)},
        })
    return rows


def gen_lite_from_news(news: List[Dict], windows: List[int]) -> List[Dict]:
    """Real headlines (list of {id, ts, title}) + Yahoo §8 labels + lite features.

    Shared by the `lite` source and the forward-collection retrain bridge
    (forward_to_dataset.py) so both produce identical training rows.
    """
    import labels as labels_mod
    import yahoo
    from calibrate_graph import ASSET_SYMBOL, PRIOR

    intraday = {a: yahoo.intraday_bars(s, "60d", "15m")
                for a, s in ASSET_SYMBOL.items() if s}

    def propagate(factors: Dict[str, int]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        for factor, direction in factors.items():
            for asset, w in PRIOR.get(factor, {}).items():
                out[asset] = out.get(asset, 0.0) + direction * w
        return {a: max(-1.0, min(1.0, v)) for a, v in out.items()}

    rows: List[Dict] = []
    for item in news:
        factors = featurelib.lite_factor_signals(item["title"])
        tone = featurelib.lite_tone(item["title"])
        graph = propagate(factors)
        label_rows = labels_mod.build_label_rows([item], intraday, {}, [windows[0]])
        by_asset = {r["asset"]: r for r in label_rows}
        for asset, lab in by_asset.items():
            if lab["label"] == 0:
                continue
            rows.append({
                "asset": asset, "ts": item["ts"], "label": 1 if lab["label"] > 0 else 0,
                "features": {"graph_prior": round(graph.get(asset, 0.0), 4), "absa": 0.0,
                             "tone": float(tone), "relevance": 0.7, "confidence": 0.6},
            })
    return rows


def gen_lite(news_path: str, windows: List[int]) -> List[Dict]:
    with open(news_path, encoding="utf-8") as f:
        news = [json.loads(l) for l in f if l.strip()]
    return gen_lite_from_news(news, windows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["synthetic", "lite", "service"], default="synthetic")
    ap.add_argument("--n", type=int, default=6000)
    ap.add_argument("--news", help="jsonl {id,ts,title} for lite/service")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "head_train.jsonl"))
    args = ap.parse_args()

    if args.source == "synthetic":
        rows = gen_synthetic(args.n)
    elif args.source == "lite":
        if not args.news:
            raise SystemExit("--news jsonl required for lite source")
        rows = gen_lite(args.news, [15, 30, 60])
    else:
        raise SystemExit("service source: run features via services/news-nlp (see README)")

    with open(args.out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"[data] {len(rows)} rows ({args.source}) -> {args.out}")


if __name__ == "__main__":
    main()
