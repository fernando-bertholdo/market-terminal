"""Train the per-asset head (A4) and export src/lib/news/headWeights.json.

Per asset: L2-regularized logistic regression by batch gradient descent (stdlib,
no numpy). The graph stays the PRIOR via an L2 ANCHOR: coefficients are pulled
toward w0 = strong positive weight on `graph_prior`, zero elsewhere. With little
data the head ≈ "trust the economic graph"; with more data it moves toward what
the price tape actually rewards. Splits are temporal (no shuffle) — validation
headlines are strictly newer than training ones.

    python train_head.py --data head_train.jsonl
"""

from __future__ import annotations

import argparse
import json
import math
import os
from typing import Dict, List

import featurelib
import splits

FO = featurelib.FEATURE_ORDER
# Prior anchor: trust the graph_prior feature, nothing else, by default.
W0 = [0.0, 1.6, 0.0, 0.0, 0.0, 0.0]
MIN_ROWS = 150        # below this, fall back to the global model for that asset


def _vec(features: Dict[str, float]) -> List[float]:
    return featurelib.build_vector(
        features.get("graph_prior", 0.0), features.get("absa", 0.0),
        features.get("tone", 0.0), features.get("relevance", 0.0),
        features.get("confidence", 0.0),
    )


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, x))))


def train_logistic(rows: List[Dict], l2: float = 1.0, lr: float = 0.2,
                   epochs: int = 400) -> List[float]:
    if not rows:
        return list(W0)
    X = [_vec(r["features"]) for r in rows]
    y = [float(r["label"]) for r in rows]
    n, d = len(X), len(FO)
    w = list(W0)
    for _ in range(epochs):
        grad = [0.0] * d
        for xi, yi in zip(X, y):
            p = _sigmoid(sum(w[j] * xi[j] for j in range(d)))
            err = p - yi
            for j in range(d):
                grad[j] += err * xi[j]
        for j in range(d):
            # L2 anchor toward W0 (don't regularize the bias term).
            reg = 0.0 if j == 0 else l2 * (w[j] - W0[j])
            w[j] -= lr * (grad[j] / n + reg / n)
    return w


def accuracy(rows: List[Dict], w: List[float], margin: float = 0.0) -> float:
    if not rows:
        return float("nan")
    correct = 0
    for r in rows:
        p = _sigmoid(sum(w[j] * v for j, v in enumerate(_vec(r["features"]))))
        pred = 1 if p > 0.5 else 0
        correct += int(pred == r["label"])
    return correct / len(rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(os.path.dirname(__file__), "head_train.jsonl"))
    ap.add_argument("--l2", type=float, default=1.0)
    ap.add_argument(
        "--out",
        default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "news", "headWeights.json"),
    )
    args = ap.parse_args()

    with open(args.data, encoding="utf-8") as f:
        rows = [json.loads(l) for l in f if l.strip()]
    print(f"[train] {len(rows)} rows")

    # Global model (fallback for thin assets), trained on everything.
    gtr, gval, gte = splits.temporal_split(rows)
    gw = train_logistic(gtr, l2=args.l2)
    print(f"[train] GLOBAL  train={accuracy(gtr, gw):.3f} val={accuracy(gval, gw):.3f} "
          f"test={accuracy(gte, gw):.3f}  coef={[round(x,3) for x in gw]}")

    by_asset: Dict[str, List[Dict]] = {}
    for r in rows:
        by_asset.setdefault(r["asset"], []).append(r)

    assets_out: Dict[str, Dict] = {}
    for asset, arows in sorted(by_asset.items()):
        if len(arows) < MIN_ROWS:
            print(f"[train] {asset:7s} {len(arows)} rows < {MIN_ROWS} -> use global")
            continue
        tr, val, te = splits.temporal_split(arows)
        w = train_logistic(tr, l2=args.l2)
        assets_out[asset] = {
            "coef": [round(x, 5) for x in w], "n": len(arows),
            "trainAcc": round(accuracy(tr, w), 4), "valAcc": round(accuracy(val, w), 4),
            "testAcc": round(accuracy(te, w), 4),
        }
        print(f"[train] {asset:7s} n={len(arows):5d} train={assets_out[asset]['trainAcc']:.3f} "
              f"val={assets_out[asset]['valAcc']:.3f} test={assets_out[asset]['testAcc']:.3f}")

    payload = {
        "generatedAt": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc).isoformat(),
        "featureOrder": FO,
        "priorAnchor": W0,
        "margin": 0.0,
        "global": {"coef": [round(x, 5) for x in gw],
                   "valAcc": round(accuracy(gval, gw), 4), "testAcc": round(accuracy(gte, gw), 4)},
        "assets": assets_out,
    }
    out_path = os.path.abspath(args.out)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"[train] wrote {out_path}")


if __name__ == "__main__":
    main()
