"""FastAPI backend for ATLAS market data, news intelligence and model signals."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from market import macro_snapshot, market_snapshot, terminal_market_snapshot, yahoo_histories
from news import news_snapshot
from strategy import compute_signals

AUTH_TOKEN = os.getenv("ATLAS_BACKEND_TOKEN", "") or os.getenv("MODEL_ENGINE_TOKEN", "")

app = FastAPI(title="atlas-backend", version="0.2.0")


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
    return {
        "status": "ok",
        "backend": "python",
        "version": "0.2.0",
        "capabilities": ["market", "news", "signals"],
    }


@app.get("/market")
def market(
    symbols: str = "",
    bcb: str = "1178,4392,433",
    fred: str = "DGS2,DGS5,DGS10,DGS30,FEDFUNDS",
    authorization: Optional[str] = Header(default=None),
) -> dict:
    _check_auth(authorization)
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()]
    bcb_codes = [item.strip() for item in bcb.split(",") if item.strip()]
    fred_ids = [item.strip() for item in fred.split(",") if item.strip()]
    return market_snapshot(symbol_list, bcb_codes, fred_ids)


@app.get("/market/terminal")
def terminal_market(authorization: Optional[str] = Header(default=None)) -> dict:
    _check_auth(authorization)
    return terminal_market_snapshot()


@app.get("/history")
def history(
    symbols: str,
    range: str = "1y",
    authorization: Optional[str] = Header(default=None),
) -> dict:
    _check_auth(authorization)
    allowed = {"3mo", "6mo", "1y", "2y", "5y"}
    range_ = range if range in allowed else "1y"
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()][:20]
    return {"data": yahoo_histories(symbol_list, range_), "range": range_}


@app.get("/macro")
def macro(authorization: Optional[str] = Header(default=None)) -> dict:
    _check_auth(authorization)
    return {"data": macro_snapshot()}


@app.get("/news")
def news(authorization: Optional[str] = Header(default=None)) -> dict:
    _check_auth(authorization)
    return news_snapshot()


@app.post("/signals")
def signals(req: SignalsRequest, authorization: Optional[str] = Header(default=None)) -> dict:
    _check_auth(authorization)
    return compute_signals(
        closes_by_symbol=req.histories,
        params=req.params.model_dump(),
        news_intelligence=req.newsIntelligence,
        news_triggered_symbols=set(req.newsTriggeredSymbols),
    )
