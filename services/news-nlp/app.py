"""FastAPI app exposing the news NLP pipeline.

POST /classify  { items: [{ id, title, publishedAt? }] }
                -> { results: [{ id, themes, factors, assets, relevance, confidence }] }
GET  /health    -> { status, models_loaded }

Auth: if NEWS_NLP_TOKEN is set, requests must send `Authorization: Bearer <token>`
(matches the TS client's NEWS_NLP_TOKEN). The TS side treats any error/timeout as
"fall back to regex", so this service failing never takes news down.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

import threading

import pipeline

AUTH_TOKEN = os.getenv("NEWS_NLP_TOKEN", "")
WARMUP = os.getenv("WARMUP", "false").lower() in ("1", "true", "yes")

_retrain_lock = threading.Lock()
_retrain_status: dict = {"running": False, "last": None}
_warmup_status: dict = {
    "enabled": WARMUP,
    "running": False,
    "ok": None,
    "started_at": None,
    "finished_at": None,
    "seconds": None,
    "error": None,
}

app = FastAPI(title="atlas-news-nlp", version="0.1.0")


class HeadlineIn(BaseModel):
    id: str
    title: str
    publishedAt: Optional[str] = None  # echoed only; pipeline never uses price/time


class ClassifyRequest(BaseModel):
    items: List[HeadlineIn]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _do_warmup() -> None:
    started = time.time()
    _warmup_status.update({
        "running": True,
        "ok": None,
        "started_at": _utc_now(),
        "finished_at": None,
        "seconds": None,
        "error": None,
    })
    try:
        pipeline.warmup()
        _warmup_status["ok"] = True
    except Exception as err:  # noqa: BLE001
        _warmup_status["ok"] = False
        _warmup_status["error"] = str(err)
    finally:
        _warmup_status["running"] = False
        _warmup_status["finished_at"] = _utc_now()
        _warmup_status["seconds"] = round(time.time() - started, 1)


@app.on_event("startup")
def _startup() -> None:
    if WARMUP:
        # Keep /health responsive even when HF free-tier CPU is still loading
        # transformer weights. Classification waits for lazy model loading.
        threading.Thread(target=_do_warmup, daemon=True).start()


def _check_auth(authorization: Optional[str]) -> None:
    if not AUTH_TOKEN:
        return
    expected = f"Bearer {AUTH_TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "models_loaded": sorted(pipeline._models.keys()),
        "warmup": _warmup_status,
    }


@app.post("/classify")
def classify(req: ClassifyRequest, authorization: Optional[str] = Header(default=None)) -> dict:
    _check_auth(authorization)
    items = [{"id": h.id, "title": h.title} for h in req.items]
    results = pipeline.classify_batch(items)
    return {"results": results}


def _do_retrain() -> None:
    import retrain
    try:
        _retrain_status["last"] = retrain.run_retrain()
    except Exception as err:  # noqa: BLE001
        _retrain_status["last"] = {"ok": False, "error": str(err)}
    finally:
        _retrain_status["running"] = False


@app.post("/retrain")
def retrain_endpoint(authorization: Optional[str] = Header(default=None)) -> dict:
    """Continuous refinement (Phase 4). Fired daily by the Cloudflare worker.

    Reads the Neon forward store, labels via Yahoo, retrains the per-asset head,
    and writes the weights back to Neon. Runs in a background thread so the worker
    request returns immediately; single-flight via a lock.
    """
    _check_auth(authorization)
    with _retrain_lock:
        if _retrain_status["running"]:
            return {"accepted": False, "reason": "already running", "last": _retrain_status["last"]}
        _retrain_status["running"] = True
    threading.Thread(target=_do_retrain, daemon=True).start()
    return {"accepted": True}


@app.get("/retrain/status")
def retrain_status() -> dict:
    return _retrain_status
