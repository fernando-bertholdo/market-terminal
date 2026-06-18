"""Evaluate the head vs a tone-sign (regex-like) baseline on the TEST split.

Acceptance spirit (§9): the head must beat the regex baseline on held-out price
reactions. Here we report directional accuracy + Brier score (calibration) on the
temporal test split for both the trained head and a tone-only baseline.

    python eval_head.py --data head_train.jsonl
"""

from __future__ import annotations

import argparse
import json
import math
import os
from typing import Dict, List

import featurelib
import splits
import train_head

FO = featurelib.FEATURE_ORDER


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, x))))


def head_prob(features: Dict[str, float], coef: List[float]) -> float:
    v = train_head._vec(features)
    return _sigmoid(sum(coef[j] * v[j] for j in range(len(FO))))


def baseline_prob(features: Dict[str, float]) -> float:
    """Regex-like: lean on the raw tone sign only."""
    tone = features.get("tone", 0.0)
    return 0.5 + 0.35 * (1 if tone > 0 else -1 if tone < 0 else 0)


def metrics(rows: List[Dict], prob_fn) -> Dict[str, float]:
    if not rows:
        return {"acc": float("nan"), "brier": float("nan"), "n": 0}
    correct = 0
    brier = 0.0
    for r in rows:
        p = prob_fn(r["features"])
        pred = 1 if p > 0.5 else 0
        correct += int(pred == r["label"])
        brier += (p - r["label"]) ** 2
    n = len(rows)
    return {"acc": correct / n, "brier": brier / n, "n": n}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(os.path.dirname(__file__), "head_train.jsonl"))
    ap.add_argument("--weights", default=os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "lib", "news", "headWeights.json"))
    args = ap.parse_args()

    with open(args.data, encoding="utf-8") as f:
        rows = [json.loads(l) for l in f if l.strip()]
    with open(args.weights, encoding="utf-8") as f:
        weights = json.load(f)

    def coef_for(asset: str) -> List[float]:
        a = weights.get("assets", {}).get(asset)
        return a["coef"] if a else weights["global"]["coef"]

    _, _, test = splits.temporal_split(rows)
    head_m = metrics(test, lambda fx: head_prob(fx, weights["global"]["coef"]))
    # per-asset head (uses asset model where available)
    by_asset_pred = [{**r} for r in test]
    head_pa = metrics(test, None) if False else None
    correct = brier = 0.0
    for r in test:
        p = head_prob(r["features"], coef_for(r["asset"]))
        correct += int((1 if p > 0.5 else 0) == r["label"])
        brier += (p - r["label"]) ** 2
    head_pa = {"acc": correct / len(test), "brier": brier / len(test), "n": len(test)}
    base_m = metrics(test, baseline_prob)

    print(f"\nTEST split (n={base_m['n']}, temporal holdout)")
    print(f"  {'model':22s} {'acc':>7s} {'brier':>7s}")
    print(f"  {'tone baseline (regex)':22s} {base_m['acc']:>7.3f} {base_m['brier']:>7.3f}")
    print(f"  {'head (global)':22s} {head_m['acc']:>7.3f} {head_m['brier']:>7.3f}")
    print(f"  {'head (per-asset)':22s} {head_pa['acc']:>7.3f} {head_pa['brier']:>7.3f}")
    verdict = "PASS — head beats baseline" if head_pa["acc"] > base_m["acc"] else "FAIL"
    print(f"\n  acceptance(§9): {verdict} "
          f"(+{(head_pa['acc']-base_m['acc'])*100:.1f} pts acc, "
          f"Brier {base_m['brier']:.3f} -> {head_pa['brier']:.3f})")


if __name__ == "__main__":
    main()
