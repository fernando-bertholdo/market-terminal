"""Economic mapping: model outputs -> the terminal's news vocabulary.

This is the Python mirror of the *factor* vocabulary only. The factor->asset
economic graph deliberately lives on the TypeScript side (`src/lib/news/graph.ts`)
so there is a single calibration seam in Phase 2; this service returns signed
factor signals plus ABSA asset signals, and TS does the graph propagation.

Vocabulary here MUST stay in sync with `src/types/market.ts` and
`src/lib/news/vocab.ts`.
"""

from __future__ import annotations

from typing import Callable, Dict, List, Tuple

# --- Region detection -------------------------------------------------------

_BR_KEYWORDS = (
    "selic", "copom", "banco central do brasil", "bcb", "campos neto",
    "galipolo", "galípolo", "brazil", "brasil", "ibovespa", "ibov", "bovespa",
    "petrobras", "vale", "itau", "itaú", "b3", "ipca", "cdi", " real ",
    "brazilian", "lula", "haddad",
)


def detect_region(text: str) -> str:
    """Return 'br' if the headline is Brazil-centric, else 'us' (global default)."""
    low = f" {text.lower()} "
    return "br" if any(k in low for k in _BR_KEYWORDS) else "us"


def _rates(region: str) -> str:
    return "rates_br" if region == "br" else "rates_us"


def _local_ccy(region: str) -> str:
    # The currency that strengthens on hawkish/strong-fiscal news.
    return "brl" if region == "br" else "usd"


# --- Signed zero-shot hypotheses -------------------------------------------
#
# Each hypothesis is a full natural-language statement scored independently by
# the zero-shot NLI model (hypothesis_template="{}"). Signed pairs let the model
# disambiguate direction (hawkish vs dovish, escalation vs ceasefire, hot vs cool
# inflation) instead of a keyword lexicon — this is the core upgrade over regex.
#
# `factors` maps a factor id -> direction. The tokens RATES and LOCAL_CCY are
# resolved per-region at runtime.

FactorSpec = Dict[str, int]


class Label:
    __slots__ = ("hypothesis", "theme", "factors")

    def __init__(self, hypothesis: str, theme: str, factors: FactorSpec):
        self.hypothesis = hypothesis
        self.theme = theme
        self.factors = factors


LABELS: List[Label] = [
    # Monetary policy
    Label("The central bank is raising interest rates or turning more hawkish.",
          "monetary_policy", {"RATES": 1, "LOCAL_CCY": 1, "risk": -1}),
    Label("The central bank is cutting interest rates or turning more dovish.",
          "monetary_policy", {"RATES": -1, "LOCAL_CCY": -1, "risk": 1}),
    # Inflation
    Label("Inflation is rising or coming in hotter than expected.",
          "inflation", {"inflation": 1, "RATES": 1}),
    Label("Inflation is falling or cooling more than expected.",
          "inflation", {"inflation": -1, "RATES": -1}),
    # Growth
    Label("Economic growth is strengthening or activity beats expectations.",
          "growth", {"growth": 1, "risk": 1}),
    Label("Economic growth is weakening or the economy heads toward recession.",
          "growth", {"growth": -1, "risk": -1}),
    # Labor
    Label("The labor market is strong with rising employment or wages.",
          "labor", {"growth": 1, "inflation": 1, "RATES": 1}),
    Label("The labor market is weakening with rising unemployment or layoffs.",
          "labor", {"growth": -1, "inflation": -1, "RATES": -1}),
    # Fiscal
    Label("Government finances are deteriorating with higher deficits or debt.",
          "fiscal", {"RATES": 1, "risk": -1, "LOCAL_CCY": -1}),
    Label("Government finances are improving with smaller deficits or consolidation.",
          "fiscal", {"RATES": -1, "risk": 1, "LOCAL_CCY": 1}),
    # Geopolitics
    Label("There is geopolitical escalation, war, a military attack, or new sanctions.",
          "geopolitics", {"risk": -1, "energy": 1, "defense": 1}),
    Label("There is geopolitical de-escalation, a ceasefire, or a peace agreement.",
          "geopolitics", {"risk": 1, "energy": -1, "defense": -1}),
    # Energy
    Label("Oil or energy supply is tightening or prices are rising.",
          "energy", {"energy": 1, "inflation": 1}),
    Label("Oil or energy supply is increasing or prices are falling.",
          "energy", {"energy": -1, "inflation": -1}),
    # Metals
    Label("Industrial or precious metals prices are rising.",
          "metals", {"metals": 1}),
    Label("Industrial or precious metals prices are falling.",
          "metals", {"metals": -1}),
    # Agriculture
    Label("Agricultural commodity prices are rising.",
          "agriculture", {"agriculture": 1, "inflation": 1}),
    Label("Agricultural commodity prices are falling.",
          "agriculture", {"agriculture": -1, "inflation": -1}),
    # FX / dollar
    Label("The US dollar is strengthening against other currencies.",
          "fx", {"usd": 1}),
    Label("The US dollar is weakening against other currencies.",
          "fx", {"usd": -1}),
    # Credit
    Label("Credit conditions are deteriorating with wider spreads or banking stress.",
          "credit", {"credit": -1, "risk": -1}),
    Label("Credit conditions are improving with tighter spreads and easing stress.",
          "credit", {"credit": 1, "risk": 1}),
    # Equities / risk
    Label("Stock markets are rallying or risk appetite is rising.",
          "equities", {"risk": 1, "growth": 1}),
    Label("Stock markets are selling off or risk aversion is rising.",
          "equities", {"risk": -1, "growth": -1}),
    # Technology
    Label("Technology, semiconductor, or AI sector news is positive.",
          "equities", {"technology": 1, "growth": 1}),
    Label("Technology, semiconductor, or AI sector faces setbacks or restrictions.",
          "equities", {"technology": -1}),
    # Power
    Label("Electricity or power demand is rising from data centers or the grid.",
          "energy", {"power": 1, "growth": 1}),
    # Trade
    Label("Trade tensions are rising with new tariffs or a trade war.",
          "trade", {"growth": -1, "risk": -1, "usd": 1}),
    Label("Trade tensions are easing with new trade deals or tariff cuts.",
          "trade", {"growth": 1, "risk": 1, "usd": -1}),
    # Defense
    Label("Defense or military spending is increasing.",
          "geopolitics", {"defense": 1, "risk": -1}),
]

HYPOTHESES: List[str] = [label.hypothesis for label in LABELS]
_LABEL_BY_HYP: Dict[str, Label] = {label.hypothesis: label for label in LABELS}


def _resolve_factor(token: str, region: str) -> str:
    if token == "RATES":
        return _rates(region)
    if token == "LOCAL_CCY":
        return _local_ccy(region)
    return token


# --- ABSA aspect -> asset --------------------------------------------------

ASPECT_KEYWORDS: Dict[str, str] = {
    "oil": "OIL", "crude": "OIL", "brent": "OIL", "wti": "OIL", "petroleum": "OIL",
    "gold": "GOLD",
    "copper": "COPPER",
    "soybean": "SOY", "soybeans": "SOY", "soy": "SOY",
    "dollar": "DXY", "greenback": "DXY",
    "ibovespa": "IBOV", "ibov": "IBOV", "bovespa": "IBOV",
    "s&p 500": "SPX", "s&p": "SPX", "nasdaq": "SPX", "dow": "SPX", "stocks": "SPX",
    "treasury": "UST", "treasuries": "UST",
    "real": "BRL",
}


def detected_aspects(english_text: str, max_aspects: int) -> List[Tuple[str, str]]:
    """Return up to `max_aspects` (keyword, asset) pairs present in the text."""
    low = english_text.lower()
    out: List[Tuple[str, str]] = []
    seen_assets = set()
    for keyword, asset in ASPECT_KEYWORDS.items():
        if asset in seen_assets:
            continue
        if keyword in low:
            out.append((keyword, asset))
            seen_assets.add(asset)
        if len(out) >= max_aspects:
            break
    return out


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def aggregate(
    region: str,
    nli_scores: Dict[str, float],
    threshold: float,
    absa_signals: List[Tuple[str, int, float]],
) -> Dict[str, object]:
    """Combine model outputs into the NewsClassification-shaped service result.

    `nli_scores`: hypothesis -> score in [0,1].
    `absa_signals`: list of (asset_id, direction, strength).
    """
    themes: List[str] = []
    theme_seen = set()
    # factor id -> [direction_sum, max_strength]
    factor_acc: Dict[str, List[float]] = {}
    matches = 0

    for hyp, score in nli_scores.items():
        if score < threshold:
            continue
        label = _LABEL_BY_HYP.get(hyp)
        if label is None:
            continue
        matches += 1
        if label.theme not in theme_seen:
            theme_seen.add(label.theme)
            themes.append(label.theme)
        for token, direction in label.factors.items():
            factor = _resolve_factor(token, region)
            acc = factor_acc.setdefault(factor, [0.0, 0.0])
            acc[0] += direction * score
            acc[1] = max(acc[1], score)

    factors = []
    for factor, (dir_sum, strength) in factor_acc.items():
        direction = 0 if dir_sum == 0 else (1 if dir_sum > 0 else -1)
        factors.append({"id": factor, "direction": direction, "strength": _clamp(strength)})
    factors.sort(key=lambda s: (-s["strength"], s["id"]))

    assets = [
        {"id": asset, "direction": direction, "strength": _clamp(strength)}
        for asset, direction, strength in absa_signals
        if strength > 0
    ]
    assets.sort(key=lambda s: (-s["strength"], s["id"]))

    nli_max = max(nli_scores.values(), default=0.0)
    relevance = _clamp(max(nli_max, 0.5 if assets else 0.0))
    has_direction = any(f["direction"] != 0 for f in factors)
    signal_count = min(matches + len(assets), 3)
    confidence = 0.0 if (matches == 0 and not assets) else _clamp(
        0.45 + signal_count * 0.12 + (0.12 if has_direction else 0.0)
    )

    return {
        "themes": themes,
        "factors": factors,
        "assets": assets,
        "relevance": relevance,
        "confidence": confidence,
    }
