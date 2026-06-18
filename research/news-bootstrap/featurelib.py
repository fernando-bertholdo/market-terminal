"""Shared feature spec for the per-asset head (Phase 3, A4).

The head is a tiny per-asset logistic model: it maps a fixed feature vector to
P(asset up) over the §8 reaction window. The SAME feature vector must be built at
train time (here) and at inference time (src/lib/news/head.ts) — keep FEATURE_ORDER
in lock-step with that file.

Per (headline, asset) features — all bounded, sign-meaningful:
  bias       : 1.0
  graph_prior: signed factor->asset strength from the economic graph, [-1, 1]
  absa       : signed ABSA sentiment toward this asset, [-1, 1] (0 if not cited)
  tone       : signed FinBERT tone * score (regex direction in the lite path), [-1, 1]
  relevance  : headline relevance, [0, 1]
  confidence : classification confidence, [0, 1]

The head's job: learn, from real price reactions, how much to trust the graph
prior vs the ABSA read vs raw tone for each asset — replacing the fixed graph
propagation with something grounded in the tape. The graph stays as the PRIOR
(L2 anchor in train_head.py), so with little data the head ~= the graph.
"""

from __future__ import annotations

from typing import Dict, List

FEATURE_ORDER: List[str] = ["bias", "graph_prior", "absa", "tone", "relevance", "confidence"]


def build_vector(
    graph_prior: float,
    absa: float,
    tone: float,
    relevance: float,
    confidence: float,
) -> List[float]:
    return [1.0, graph_prior, absa, tone, relevance, confidence]


# --- Lite (transformers-free) featurizer -----------------------------------
#
# Used for the runnable trap-set harness and the `lite` training source, so the
# whole Phase 3 pipeline can run without the heavy Fase-1 service. Mirrors the
# spirit of src/lib/news/classifier.ts at a small scale. The real run uses the
# service features (richer FinBERT/NLI/ABSA), but the vector shape is identical.

# Minimal keyword -> (factor, fixed_direction) rules. fixed_direction 0 => use the
# headline tone sign (lets negation flip it). Mirrors classifier.ts RULES subset.
LITE_RULES = [
    (r"\b(fed|fomc|powell|rate hike|rate cut|interest rate)\b", "rates_us", 0),
    (r"\b(selic|copom|banco central|bcb)\b", "rates_br", 0),
    (r"\b(inflation|cpi|pce|ipca)\b", "inflation", 0),
    (r"\b(growth|gdp|recession|activity)\b", "growth", 0),
    (r"\b(war|attack|missile|sanctions|conflict|invasion)\b", "risk", -1),
    (r"\b(ceasefire|truce|peace deal|de-escalat)\b", "risk", 1),
    (r"\b(oil|crude|brent|wti|opec)\b", "energy", 0),
    (r"\b(gold|copper|iron ore|metals)\b", "metals", 0),
    (r"\b(soy|soybean|corn|wheat|grain)\b", "agriculture", 0),
    (r"\b(dollar|dxy|greenback)\b", "usd", 0),
    (r"\b(credit|spreads|default|high yield)\b", "credit", 0),
    (r"\b(stocks|equities|s&p|ibovespa|shares)\b", "risk", 0),
]

LITE_POSITIVE = r"\b(rise|rose|rally|gain|higher|hotter|surge|beat|strong|hawkish|hike|jump|soar)\b"
LITE_NEGATIVE = r"\b(fall|fell|drop|lower|cool|slow|weak|dovish|cut|ease|miss|below|plunge|sink|tumble)\b"
# Negation that flips the apparent tone ("not as hot as feared", "less than expected").
LITE_NEGATION = r"\b(not|no|less|fewer|cooler|weaker|below|miss(?:es|ed)?|not as|softer than|fail)\b"


def lite_tone(title: str) -> int:
    import re
    low = title.lower()
    pos = bool(re.search(LITE_POSITIVE, low))
    neg = bool(re.search(LITE_NEGATIVE, low))
    tone = 0 if pos == neg else (1 if pos else -1)
    # A negation cue near a positive word dampens/flips it (the regex baseline's blind spot).
    if tone == 1 and re.search(LITE_NEGATION, low):
        tone = -1
    return tone


def lite_factor_signals(title: str) -> Dict[str, int]:
    import re
    low = title.lower()
    tone = lite_tone(title)
    factors: Dict[str, int] = {}
    for pattern, factor, fixed in LITE_RULES:
        if re.search(pattern, low):
            direction = tone if fixed == 0 else fixed
            # keep the strongest-magnitude signal per factor
            if factor not in factors or abs(direction) > abs(factors[factor]):
                factors[factor] = direction
    return factors
