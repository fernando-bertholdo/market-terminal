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


def yahoo_history(symbol: str, range_: str = "1y") -> Optional[Dict[str, Any]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval=1d&range={urllib.parse.quote(range_)}"
    try:
        payload = get_json(url)
        result = (payload.get("chart", {}).get("result") or [None])[0]
        if not result:
            return None
        timestamps = result.get("timestamp") or []
        closes = (((result.get("indicators") or {}).get("quote") or [{}])[0].get("close") or [])
        bars = []
        dt = __import__("datetime")
        for index in range(min(len(timestamps), len(closes))):
            close = closes[index]
            if close is None:
                continue
            bars.append({
                "date": dt.datetime.utcfromtimestamp(timestamps[index]).date().isoformat(),
                "close": close,
            })
        return {"symbol": symbol, "bars": bars} if bars else None
    except Exception:
        return None


def yahoo_histories(symbols: List[str], range_: str = "1y") -> Dict[str, Any]:
    return {symbol: series for symbol in symbols if (series := yahoo_history(symbol, range_)) is not None}


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


def fred_history(series_id: str, limit: int = 40) -> Optional[List[Dict[str, Any]]]:
    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        return None
    params = urllib.parse.urlencode({
        "series_id": series_id,
        "api_key": api_key,
        "limit": str(limit),
        "sort_order": "desc",
        "file_type": "json",
    })
    try:
        payload = get_json(f"https://api.stlouisfed.org/fred/series/observations?{params}")
        parsed = []
        for obs in payload.get("observations", []):
            value = obs.get("value")
            if value in (None, "", "."):
                continue
            parsed.append({"date": obs["date"], "value": float(value)})
        return parsed or None
    except Exception:
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


def bps_change(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None:
        return None
    return round((current - previous) * 100 * 10) / 10


def quote_field(quotes: Dict[str, Any], symbol: str, field: str) -> Optional[float]:
    quote = quotes.get(symbol)
    return None if quote is None else quote.get(field)


def terminal_market_snapshot() -> Dict[str, Any]:
    yahoo_symbols = [
        "BRL=X", "EURBRL=X", "DX-Y.NYB", "EURUSD=X", "USDJPY=X", "GBPUSD=X",
        "CL=F", "BZ=F", "GC=F", "TIO=F", "ZS=F", "HG=F",
        "^GSPC", "^VIX", "^BVSP", "EWZ", "EEM", "XLE", "XLF", "XLI", "XLK",
    ]
    quotes = yahoo_quotes(yahoo_symbols)
    bcb = {code: bcb_series(code) for code in ["1178", "4392", "433"]}
    fred = {series: fred_series(series) for series in ["DGS2", "DGS5", "DGS10", "DGS30", "FEDFUNDS"]}

    data = {
        "brazil": {
            "selic": (bcb.get("1178") or {}).get("value"),
            "selicChange": None,
            "cdi": (bcb.get("4392") or {}).get("value"),
            "cdiChange": None,
            "ipca": (bcb.get("433") or {}).get("value"),
            "usdbrl": None,
            "eurbrl": None,
            "di": {
                "DI1N26": {"rate": None, "change": None},
                "DI1F27": {"rate": None, "change": None},
                "DI1F28": {"rate": None, "change": None},
                "DI1F30": {"rate": None, "change": None},
            },
        },
        "us": {
            "fedFunds": (fred.get("FEDFUNDS") or {}).get("current"),
            "fedFundsChange": bps_change((fred.get("FEDFUNDS") or {}).get("current"), (fred.get("FEDFUNDS") or {}).get("previous")),
            "ust2y": (fred.get("DGS2") or {}).get("current"),
            "ust2yChange": bps_change((fred.get("DGS2") or {}).get("current"), (fred.get("DGS2") or {}).get("previous")),
            "ust5y": (fred.get("DGS5") or {}).get("current"),
            "ust5yChange": bps_change((fred.get("DGS5") or {}).get("current"), (fred.get("DGS5") or {}).get("previous")),
            "ust10y": (fred.get("DGS10") or {}).get("current"),
            "ust10yChange": bps_change((fred.get("DGS10") or {}).get("current"), (fred.get("DGS10") or {}).get("previous")),
            "ust30y": (fred.get("DGS30") or {}).get("current"),
            "ust30yChange": bps_change((fred.get("DGS30") or {}).get("current"), (fred.get("DGS30") or {}).get("previous")),
        },
        "fx": {
            "usdbrl": quote_field(quotes, "BRL=X", "price"),
            "usdbrlChangePct": quote_field(quotes, "BRL=X", "changePct"),
            "eurbrl": quote_field(quotes, "EURBRL=X", "price"),
            "eurbrlChangePct": quote_field(quotes, "EURBRL=X", "changePct"),
            "dxy": quote_field(quotes, "DX-Y.NYB", "price"),
            "dxyChangePct": quote_field(quotes, "DX-Y.NYB", "changePct"),
            "eurbrlOfficial": None,
            "eurusd": quote_field(quotes, "EURUSD=X", "price"),
            "eurusdChangePct": quote_field(quotes, "EURUSD=X", "changePct"),
            "usdjpy": quote_field(quotes, "USDJPY=X", "price"),
            "usdjpyChangePct": quote_field(quotes, "USDJPY=X", "changePct"),
            "gbpusd": quote_field(quotes, "GBPUSD=X", "price"),
            "gbpusdChangePct": quote_field(quotes, "GBPUSD=X", "changePct"),
        },
        "commodities": {
            "wti": quote_field(quotes, "CL=F", "price"),
            "wtiChangePct": quote_field(quotes, "CL=F", "changePct"),
            "brent": quote_field(quotes, "BZ=F", "price"),
            "brentChangePct": quote_field(quotes, "BZ=F", "changePct"),
            "gold": quote_field(quotes, "GC=F", "price"),
            "goldChangePct": quote_field(quotes, "GC=F", "changePct"),
            "ironOre": quote_field(quotes, "TIO=F", "price"),
            "ironOreChangePct": quote_field(quotes, "TIO=F", "changePct"),
            "soybeans": quote_field(quotes, "ZS=F", "price"),
            "soybeansChangePct": quote_field(quotes, "ZS=F", "changePct"),
            "copper": quote_field(quotes, "HG=F", "price"),
            "copperChangePct": quote_field(quotes, "HG=F", "changePct"),
        },
        "global": {
            "spx": quote_field(quotes, "^GSPC", "price"),
            "spxChangePct": quote_field(quotes, "^GSPC", "changePct"),
            "vix": quote_field(quotes, "^VIX", "price"),
            "vixChangePct": quote_field(quotes, "^VIX", "changePct"),
            "ibov": quote_field(quotes, "^BVSP", "price"),
            "ibovChangePct": quote_field(quotes, "^BVSP", "changePct"),
            "ewz": quote_field(quotes, "EWZ", "price"),
            "ewzChangePct": quote_field(quotes, "EWZ", "changePct"),
            "eem": quote_field(quotes, "EEM", "price"),
            "eemChangePct": quote_field(quotes, "EEM", "changePct"),
            "xle": quote_field(quotes, "XLE", "price"),
            "xleChangePct": quote_field(quotes, "XLE", "changePct"),
            "xlf": quote_field(quotes, "XLF", "price"),
            "xlfChangePct": quote_field(quotes, "XLF", "changePct"),
            "xli": quote_field(quotes, "XLI", "price"),
            "xliChangePct": quote_field(quotes, "XLI", "changePct"),
            "xlk": quote_field(quotes, "XLK", "price"),
            "xlkChangePct": quote_field(quotes, "XLK", "changePct"),
        },
    }
    sources = {
        "bcb": {"ok": any(bcb.values()), "label": "BCB", "message": None},
        "fred": {"ok": any(fred.values()), "label": "FRED", "message": None if os.getenv("FRED_API_KEY") else "Missing FRED_API_KEY"},
        "b3": {"ok": False, "label": "B3", "message": "B3 migration pending in Python backend"},
        "yahoo": {"ok": bool(quotes), "label": "YAHOO", "message": None},
        "python": {"ok": True, "label": "PYTHON", "message": "ATLAS backend"},
    }
    return {"data": data, "sources": sources, "raw": {"yahoo": quotes, "bcb": bcb, "fred": fred}}


NULL_POINT = {"value": None, "prev": None, "yearAgo": None, "date": None}


def latest_point(history: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    if not history:
        return dict(NULL_POINT)
    return {
        "value": history[0]["value"],
        "prev": history[1]["value"] if len(history) > 1 else None,
        "yearAgo": history[12]["value"] if len(history) > 12 else history[-1]["value"],
        "date": history[0]["date"],
    }


def daily_point(history: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    if not history:
        return dict(NULL_POINT)
    return {
        "value": history[0]["value"],
        "prev": history[21]["value"] if len(history) > 21 else history[-1]["value"],
        "yearAgo": history[252]["value"] if len(history) > 252 else history[-1]["value"],
        "date": history[0]["date"],
    }


def yoy_point(history: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    if not history or len(history) < 14:
        return dict(NULL_POINT)

    def yoy(index: int) -> Optional[float]:
        now = history[index]["value"] if len(history) > index else None
        base = history[index + 12]["value"] if len(history) > index + 12 else None
        if now is None or base in (None, 0):
            return None
        return (now / base - 1) * 100

    return {"value": yoy(0), "prev": yoy(1), "yearAgo": yoy(12) if len(history) >= 26 else None, "date": history[0]["date"]}


def macro_snapshot() -> Dict[str, Any]:
    ipca = bcb_series("13522")
    return {
        "us": {
            "cpiYoY": yoy_point(fred_history("CPIAUCSL", 30)),
            "coreCpiYoY": yoy_point(fred_history("CPILFESL", 30)),
            "unemployment": latest_point(fred_history("UNRATE", 30)),
            "hyOas": daily_point(fred_history("BAMLH0A0HYM2", 280)),
            "nfci": latest_point(fred_history("NFCI", 60)),
            "breakeven10y": daily_point(fred_history("T10YIE", 280)),
            "real10y": daily_point(fred_history("DFII10", 280)),
        },
        "brazil": {
            "ipca12m": {"value": ipca["value"], "prev": None, "yearAgo": None, "date": ipca["date"]} if ipca else dict(NULL_POINT),
            "focusIpca": [],
            "focusSelic": [],
        },
    }
