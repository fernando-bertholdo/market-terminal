"""Inference pipeline: MT (PT->EN) -> FinBERT (tone) -> zero-shot NLI -> ABSA.

All weights are open and loaded lazily on first use. No LLM, no paid API, no
network at inference time beyond the one-off model download (cache to disk /
bake into the image). The pipeline only ever sees a headline title — never any
price — preserving the no-lookahead invariant.

Smart-multilingual path: the zero-shot model is multilingual, so NLI runs on the
ORIGINAL headline (keeps nuance, per the plan's plan-B hedge), while FinBERT and
ABSA — English-only — run on the translated text.
"""

from __future__ import annotations

import os
import re
import threading
from typing import Dict, List, Tuple

import mapping

# --- Config (env-overridable) ----------------------------------------------

MT_MODEL = os.getenv("MT_MODEL", "Helsinki-NLP/opus-mt-mul-en")
FINBERT_MODEL = os.getenv("FINBERT_MODEL", "ProsusAI/finbert")
NLI_MODEL = os.getenv("NLI_MODEL", "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli")
ABSA_MODEL = os.getenv("ABSA_MODEL", "yangheng/deberta-v3-base-absa-v1.1")
DEVICE = os.getenv("DEVICE", "cpu")
NLI_THRESHOLD = float(os.getenv("NLI_THRESHOLD", "0.5"))
MAX_ASPECTS = int(os.getenv("MAX_ASPECTS", "3"))
TRANSLATE = os.getenv("TRANSLATE", "true").lower() in ("1", "true", "yes")
PIPELINE_MODE = os.getenv("PIPELINE_MODE", "lite").lower()

_lock = threading.Lock()
_models: Dict[str, object] = {}


def _device_index() -> int:
    return -1 if DEVICE == "cpu" else 0


def _get(name: str):
    """Lazily build and cache a transformers pipeline / model."""
    if name in _models:
        return _models[name]
    with _lock:
        if name in _models:
            return _models[name]
        from transformers import pipeline as hf_pipeline  # local import: heavy

        if name == "translate":
            obj = hf_pipeline("translation", model=MT_MODEL, device=_device_index())
        elif name == "finbert":
            obj = hf_pipeline("text-classification", model=FINBERT_MODEL,
                              top_k=None, device=_device_index())
        elif name == "nli":
            obj = hf_pipeline("zero-shot-classification", model=NLI_MODEL,
                              device=_device_index())
        elif name == "absa":
            obj = hf_pipeline("text-classification", model=ABSA_MODEL,
                              top_k=None, device=_device_index())
        else:  # pragma: no cover
            raise ValueError(f"unknown model {name}")
        _models[name] = obj
        return obj


def warmup() -> None:
    """Preload all models (used at startup when WARMUP=true)."""
    if PIPELINE_MODE in ("lite", "fast"):
        return
    for name in ("translate", "finbert", "nli", "absa"):
        _get(name)


def _detect_lang(text: str) -> str:
    try:
        from langdetect import detect  # local import
        return detect(text)
    except Exception:
        return "en"


def _translate(text: str, lang: str) -> str:
    if not TRANSLATE or lang.startswith("en"):
        return text
    try:
        out = _get("translate")(text, max_length=200)
        return out[0]["translation_text"]
    except Exception:
        return text  # degrade to original; FinBERT/ABSA still attempt


def _finbert_tone(english_text: str) -> Tuple[str, float]:
    try:
        scores = _get("finbert")(english_text)
        # top_k=None -> list (possibly nested) of {label, score}
        rows = scores[0] if scores and isinstance(scores[0], list) else scores
        best = max(rows, key=lambda r: r["score"])
        return best["label"].lower(), float(best["score"])
    except Exception:
        return "neutral", 0.0


def _nli_scores(text: str) -> Dict[str, float]:
    try:
        out = _get("nli")(
            text,
            candidate_labels=mapping.HYPOTHESES,
            hypothesis_template="{}",
            multi_label=True,
        )
        return dict(zip(out["labels"], out["scores"]))
    except Exception:
        return {}


_ABSA_POS = {"positive", "pos", "label_2"}
_ABSA_NEG = {"negative", "neg", "label_0"}


def _absa_signals(english_text: str) -> List[Tuple[str, int, float]]:
    aspects = mapping.detected_aspects(english_text, MAX_ASPECTS)
    if not aspects:
        return []
    signals: List[Tuple[str, int, float]] = []
    absa = _get("absa")
    for keyword, asset in aspects:
        try:
            out = absa({"text": english_text, "text_pair": keyword})
            rows = out[0] if out and isinstance(out[0], list) else out
            best = max(rows, key=lambda r: r["score"])
            label = best["label"].lower()
            direction = 1 if label in _ABSA_POS else -1 if label in _ABSA_NEG else 0
            if direction != 0:
                signals.append((asset, direction, float(best["score"])))
        except Exception:
            continue
    return signals


def classify_one(title: str) -> Dict[str, object]:
    if PIPELINE_MODE in ("lite", "fast"):
        return classify_one_lite(title)

    region = mapping.detect_region(title)
    lang = _detect_lang(title)
    english_text = _translate(title, lang)

    nli = _nli_scores(title)  # multilingual: run on original
    absa = _absa_signals(english_text)
    tone_label, tone_score = _finbert_tone(english_text)

    result = mapping.aggregate(region, nli, NLI_THRESHOLD, absa)

    # FinBERT tone nudges confidence when the directional model is confident too.
    if tone_label in ("positive", "negative") and result["confidence"] > 0:
        result["confidence"] = min(1.0, result["confidence"] + 0.05 * tone_score)

    # Signed tone in [-1, 1] — a feature for the Phase 3 per-asset head (head.ts).
    tone_sign = 1.0 if tone_label == "positive" else -1.0 if tone_label == "negative" else 0.0
    result["tone"] = round(tone_sign * tone_score, 4)
    result["lang"] = lang
    result["region"] = region
    return result


LITE_RULES = [
    (r"\b(fed|fomc|powell|federal reserve|interest rates?|rate (?:hike|cut|decision))\b", "monetary_policy", 0.9, {"RATES": 0, "usd": 0, "risk": 0}),
    (r"\b(selic|copom|banco central do brasil|bcb|campos neto|galipolo)\b", "monetary_policy", 1.0, {"rates_br": 0, "brl": 0, "risk": 0}),
    (r"\b(inflation|consumer prices?|cpi|pce|ipca|prices? pressure|infla)\b", "inflation", 0.9, {"inflation": 0, "RATES": 0}),
    (r"\b(gdp|economic growth|recession|economic activity|industrial production|retail sales|pib|atividade)\b", "growth", 0.8, {"growth": 0, "risk": 0, "RATES": 0}),
    (r"\b(payrolls?|employment|unemployment|jobless|labor market|wages?)\b", "labor", 0.75, {"growth": 0, "inflation": 0, "rates_us": 0}),
    (r"\b(fiscal|budget|debt ceiling|government spending|primary deficit|public debt|haddad|arcabou[cç]o)\b", "fiscal", 0.8, {"RATES": 1, "risk": -1, "LOCAL_CCY": -1}),
    (r"\b(war|attack|missile|sanctions?|geopolitic|conflict|invasion|blockade|hormuz|guerra)\b", "geopolitics", 0.85, {"risk": -1, "energy": 1, "defense": 1}),
    (r"\b(ceasefire|peace deal|peace agreement|deal to end|truce|de-escalat|cessar-fogo|acordo de paz)\b", "geopolitics", 0.95, {"risk": 1, "energy": -1, "defense": -1}),
    (r"\b(oil|crude|brent|wti|opec|natural gas|petroleum|petr[oó]leo)\b", "energy", 0.85, {"energy": 0, "inflation": 0, "risk": 0}),
    (r"\b(gold|copper|iron ore|metals?|mining|ouro|cobre|min[eé]rio)\b", "metals", 0.75, {"metals": 0, "growth": 0, "risk": 0}),
    (r"\b(soy|soybeans?|corn|wheat|crop|agriculture|coffee|sugar|soja|milho)\b", "agriculture", 0.7, {"agriculture": 0, "inflation": 0, "brl": 0}),
    (r"\b(dollar|dxy|currency|currencies|forex|fx|real|brl|usd/?brl|d[oó]lar)\b", "fx", 0.75, {"usd": 0, "brl": 0, "risk": 0}),
    (r"\b(credit|spreads?|default|high yield|investment grade|banking stress|cr[eé]dito)\b", "credit", 0.75, {"credit": 0, "risk": 0}),
    (r"\b(ai|artificial intelligence|semiconductors?|chips?|data centers?|export controls?|advanced computing|nvidia|nvda)\b", "equities", 0.8, {"technology": 0, "growth": 0, "risk": 0}),
    (r"\b(electricity|power demand|power grid|nuclear|uranium|generation capacity|data center power)\b", "energy", 0.8, {"power": 0, "energy": 0, "growth": 0}),
    (r"\b(defense spending|defence spending|military spending|weapons?|munitions?|pentagon|nato)\b", "geopolitics", 0.85, {"defense": 1, "risk": -1}),
    (r"\b(stocks?|equities|s&p 500|spx|ibovespa|ibov|shares?|a[cç][oõ]es)\b", "equities", 0.65, {"risk": 0, "growth": 0}),
    (r"\b(tariffs?|trade war|exports?|imports?|trade deal|tarifas?)\b", "trade", 0.7, {"growth": 0, "risk": 0, "usd": 0}),
]
LITE_POSITIVE = re.compile(r"\b(rise[sn]?|rose|rally|rallies|gain[sed]*|higher|hotter|accelerat(?:e|es|ed|ing)|strong(?:er)?|hawkish|hike[sd]?|tighten(?:s|ed|ing)?|surge[sd]?|beat[sed]*|above|sobe|alta|avan[cç]a)\b", re.I)
LITE_NEGATIVE = re.compile(r"\b(fall[sn]?|fell|drop[sped]*|lower|cool(?:s|ed|ing)?|slow(?:s|ed|ing)?|weak(?:er)?|dovish|cut[st]?|eas(?:e|es|ed|ing)|recession|miss(?:es|ed)?|below|contract(?:s|ed|ing)?|cai|queda|recua)\b", re.I)
LITE_RISK_OFF = re.compile(r"\b(risk[- ]off|selloff|turmoil|crisis|fear|tensions?|uncertainty|default|downgrade)\b", re.I)
LITE_RISK_ON = re.compile(r"\b(risk[- ]on|relief rally|optimism|soft landing|ceasefire|trade deal|cessar-fogo)\b", re.I)


def _lite_direction(title: str) -> int:
    positive = bool(LITE_POSITIVE.search(title))
    negative = bool(LITE_NEGATIVE.search(title))
    if positive == negative:
        return 0
    return 1 if positive else -1


def _lite_factor(token: str, region: str) -> str:
    if token == "RATES":
        return "rates_br" if region == "br" else "rates_us"
    if token == "LOCAL_CCY":
        return "brl" if region == "br" else "usd"
    return token


def classify_one_lite(title: str) -> Dict[str, object]:
    region = mapping.detect_region(title)
    direction = _lite_direction(title)
    themes = []
    theme_seen = set()
    factors: Dict[str, Tuple[float, float]] = {}
    relevance = 0.0
    match_count = 0

    for pattern, theme, strength, rule_factors in LITE_RULES:
        if not re.search(pattern, title, re.I):
            continue
        if theme not in theme_seen:
            theme_seen.add(theme)
            themes.append(theme)
        relevance = max(relevance, strength)
        match_count += 1
        for token, fixed_direction in rule_factors.items():
            factor = _lite_factor(token, region)
            resolved = direction if fixed_direction == 0 else fixed_direction
            signed, max_strength = factors.get(factor, (0.0, 0.0))
            factors[factor] = (signed + resolved * strength, max(max_strength, strength))

    if LITE_RISK_OFF.search(title):
        if "geopolitics" not in theme_seen:
            themes.append("geopolitics")
        signed, max_strength = factors.get("risk", (0.0, 0.0))
        factors["risk"] = (signed - 0.9, max(max_strength, 0.9))
        relevance = max(relevance, 0.85)
        match_count += 1
    elif LITE_RISK_ON.search(title):
        signed, max_strength = factors.get("risk", (0.0, 0.0))
        factors["risk"] = (signed + 0.85, max(max_strength, 0.85))
        relevance = max(relevance, 0.8)
        match_count += 1

    factor_rows = []
    for factor, (signed, strength) in factors.items():
        factor_rows.append({
            "id": factor,
            "direction": 0 if signed == 0 else (1 if signed > 0 else -1),
            "strength": max(0.0, min(1.0, strength)),
        })
    factor_rows.sort(key=lambda row: (-row["strength"], row["id"]))

    has_direction = any(row["direction"] != 0 for row in factor_rows)
    confidence = 0.0 if match_count == 0 else min(1.0, 0.45 + min(match_count, 3) * 0.12 + (0.12 if has_direction else 0.0))
    return {
        "themes": themes,
        "factors": factor_rows,
        "assets": [],
        "relevance": max(0.0, min(1.0, relevance)),
        "confidence": confidence,
        "tone": float(direction),
        "lang": _detect_lang(title),
        "region": region,
        "mode": "lite",
    }


def classify_batch(items: List[Dict[str, str]]) -> List[Dict[str, object]]:
    results: List[Dict[str, object]] = []
    for item in items:
        title = (item.get("title") or "").strip()
        item_id = item.get("id")
        if not title or not item_id:
            continue
        try:
            res = classify_one(title)
        except Exception:
            # Skip on failure -> the TS orchestrator falls back to regex for this id.
            continue
        res["id"] = item_id
        results.append(res)
    return results
