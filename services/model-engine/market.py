from __future__ import annotations

import os
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def get_json(url: str, timeout: float = 10) -> Any:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        import json

        return json.loads(response.read().decode("utf-8"))


def yahoo_quote(symbol: str) -> Optional[Dict[str, Any]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval=1d&range=5d"
    try:
        payload = get_json(url)
        result = (payload.get("chart", {}).get("result") or [None])[0]
        if not result:
            return None
        meta = result.get("meta") or {}
        timestamps = result.get("timestamp") or []
        closes = (((result.get("indicators") or {}).get("quote") or [{}])[0].get("close") or [])
        points = [
            (timestamps[i], closes[i])
            for i in range(min(len(timestamps), len(closes)))
            if closes[i] is not None
        ]
        price = meta.get("regularMarketPrice")
        if price is None and points:
            price = points[-1][1]
        if price is None:
            return None
        previous = (
            meta.get("regularMarketPreviousClose")
            or meta.get("chartPreviousClose")
            or meta.get("previousClose")
            or (points[-2][1] if len(points) >= 2 else price)
        )
        change = meta.get("regularMarketChange", price - previous)
        change_pct = meta.get("regularMarketChangePercent", ((price - previous) / previous) * 100 if previous else 0)
        market_time = meta.get("regularMarketTime")
        return {
            "symbol": symbol,
            "price": price,
            "previousClose": previous,
            "change": change,
            "changePct": change_pct,
            "currency": meta.get("currency", "USD"),
            "marketTime": None if market_time is None else __import__("datetime").datetime.utcfromtimestamp(market_time).isoformat() + "Z",
        }
    except Exception:
        return None


def yahoo_quotes(symbols: List[str]) -> Dict[str, Any]:
    return {symbol: quote for symbol in symbols if (quote := yahoo_quote(symbol)) is not None}


def bcb_series(series_code: str) -> Optional[Dict[str, Any]]:
    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_code}/dados/ultimos/1?formato=json"
    try:
        data = get_json(url)
        if not data:
            return None
        obs = data[0]
        return {"value": float(str(obs["valor"]).replace(",", ".")), "date": obs["data"]}
    except Exception:
        return None


def fred_series(series_id: str) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        return None
    params = urllib.parse.urlencode({
        "series_id": series_id,
        "api_key": api_key,
        "limit": "10",
        "sort_order": "desc",
        "file_type": "json",
    })
    try:
        payload = get_json(f"https://api.stlouisfed.org/fred/series/observations?{params}")
        values = [o for o in payload.get("observations", []) if o.get("value") not in (None, "", ".")]
        if not values:
            return None
        current = float(values[0]["value"])
        previous = float(values[1]["value"]) if len(values) > 1 else current
        return {"current": current, "previous": previous, "date": values[0]["date"]}
    except Exception:
        return None


def market_snapshot(symbols: List[str], bcb_codes: List[str], fred_ids: List[str]) -> Dict[str, Any]:
    return {
        "mode": "python-backend",
        "yahoo": yahoo_quotes(symbols),
        "bcb": {code: value for code in bcb_codes if (value := bcb_series(code)) is not None},
        "fred": {series: value for series in fred_ids if (value := fred_series(series)) is not None},
    }
