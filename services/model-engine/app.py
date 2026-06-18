"""FastAPI wrapper for the ATLAS quant model engine."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from strategy import compute_signals

AUTH_TOKEN = os.getenv("MODEL_ENGINE_TOKEN", "")

app = FastAPI(title="atlas-model-engine", version="0.1.0")


class StrategyParams(BaseModel):
    portfolioVolTarget: float
    maxAssetWeight: float
    maxGrossLeverage: float
    selic: Optional[float] = None
    fedFunds: Optional[float] = None


class SignalsRequest(BaseModel):
    histories: Dict[str, List[float]]
    params: StrategyParams
    newsIntelligence: Optional[Dict[str, Any]] = None
    newsTriggeredSymbols: List[str] = []


def _check_auth(authorization: Optional[str]) -> None:
    if not AUTH_TOKEN:
        return
    if authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine": "python", "version": "0.1.0"}


@app.post("/signals")
def signals(req: SignalsRequest, authorization: Optional[str] = Header(default=None)) -> dict:
    _check_auth(authorization)
    return compute_signals(
        closes_by_symbol=req.histories,
        params=req.params.model_dump(),
        news_intelligence=req.newsIntelligence,
        news_triggered_symbols=set(req.newsTriggeredSymbols),
    )
