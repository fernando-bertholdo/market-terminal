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
