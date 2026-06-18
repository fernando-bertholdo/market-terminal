"""§9 trap set — qualitative harness for the head.

Hard cases the regex baseline is supposed to fail and the head is supposed to get:
ceasefire vs escalation, negation ("not as hot as feared"), miss vs beat, a
cross-effect (dollar up -> gold down), and at least one Portuguese headline.

Runs the transformers-free lite featurizer -> graph propagation -> head, and the
tone-only baseline, and prints predicted vs expected per (headline, asset).

NOTE: with a head trained only on the synthetic source, some traps will miss —
this file is the READY harness for the real run (head trained on the offline
GDELT/FNSPID + service features). The expected directions are the ground truth.

    python trap_set.py
"""

from __future__ import annotations

import json
import os
from typing import Dict, List

import featurelib
from calibrate_graph import PRIOR

# (headline, lang, {asset: expected_direction})
TRAPS: List[Dict] = [
    {"title": "Israel and Hamas agree ceasefire, oil slides",
     "expect": {"OIL": -1, "SPX": 1}},
    {"title": "Missiles strike oil facilities as conflict escalates",
     "expect": {"OIL": 1, "SPX": -1}},
    {"title": "US inflation not as hot as feared, cooling more than expected",
     "expect": {"GOLD": 1, "SPX": 1}},      # softer inflation -> rates down, risk up
    {"title": "Payrolls badly miss expectations, far below forecast",
     "expect": {"SPX": -1}},
    {"title": "Dollar surges to two-year high",
     "expect": {"GOLD": -1, "COPPER": -1}},  # cross-effect: strong USD -> metals down
    {"title": "Copom eleva a taxa Selic e sinaliza juros mais altos",
     "expect": {"BRL": 1, "IBOV": -1}},      # PT: hawkish BCB
    {"title": "Oil prices jump as OPEC announces deeper supply cuts",
     "expect": {"OIL": 1}},
]


def propagate(factors: Dict[str, int]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for factor, direction in factors.items():
        for asset, w in PRIOR.get(factor, {}).items():
            out[asset] = out.get(asset, 0.0) + direction * w
    return {a: max(-1.0, min(1.0, v)) for a, v in out.items()}


def sigmoid(x: float) -> float:
    import math
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, x))))


def main() -> None:
    wpath = os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "news", "headWeights.json")
    with open(wpath, encoding="utf-8") as f:
        weights = json.load(f)

    def coef_for(asset: str) -> List[float]:
        a = weights.get("assets", {}).get(asset)
        return a["coef"] if a else weights["global"]["coef"]

    head_hits = base_hits = total = 0
    print(f"{'headline':52s} {'asset':6s} {'exp':>3s} {'head':>4s} {'base':>4s}")
    for trap in TRAPS:
        title = trap["title"]
        factors = featurelib.lite_factor_signals(title)
        tone = featurelib.lite_tone(title)
        graph = propagate(factors)
        for asset, exp in trap["expect"].items():
            v = featurelib.build_vector(graph.get(asset, 0.0), 0.0, float(tone), 0.7, 0.6)
            coef = coef_for(asset)
            p = sigmoid(sum(coef[j] * v[j] for j in range(len(coef))))
            head_dir = 1 if p > 0.5 else -1
            base_dir = 1 if tone > 0 else -1 if tone < 0 else 0
            head_hits += int(head_dir == exp)
            base_hits += int(base_dir == exp)
            total += 1
            print(f"{title[:52]:52s} {asset:6s} {exp:>+3d} {head_dir:>+4d} {base_dir:>+4d}")

    print(f"\ntrap accuracy:  head {head_hits}/{total} ({head_hits/total:.0%})   "
          f"tone baseline {base_hits}/{total} ({base_hits/total:.0%})")
    print("(head trained on synthetic here — real metric comes from the offline run.)")


if __name__ == "__main__":
    main()
