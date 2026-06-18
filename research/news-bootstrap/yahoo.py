"""Minimal Yahoo Finance chart client (stdlib only).

Mirrors the server-side fetcher the terminal already uses (direct v8 chart API
with a browser User-Agent). No API key, no third-party package — so the graph
calibration and labeling demos run anywhere Python does.

Daily closes go back years; intraday (<=15m) is only ~60 days, per the plan §4.2.
"""

from __future__ import annotations

import json
import time
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/"


def _fetch(symbol: str, params: str, retries: int = 3) -> Optional[dict]:
    url = f"{_BASE}{urllib.parse.quote(symbol)}?{params}"
    last_err: Optional[Exception] = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": _UA})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as err:  # noqa: BLE001 - network is best-effort
            last_err = err
            time.sleep(1.0 + attempt)
    print(f"[yahoo] failed {symbol}: {last_err}")
    return None


def _extract_closes(data: Optional[dict]) -> List[Tuple[int, float]]:
    try:
        result = data["chart"]["result"][0]
        ts = result["timestamp"]
        closes = result["indicators"]["quote"][0]["close"]
    except (KeyError, IndexError, TypeError):
        return []
    out: List[Tuple[int, float]] = []
    for t, c in zip(ts, closes):
        if c is None:
            continue
        out.append((int(t), float(c)))
    return out


def daily_closes(symbol: str, rng: str = "2y") -> List[Dict[str, float]]:
    """Daily closes as [{date: 'YYYY-MM-DD', close}], for cross-asset correlation."""
    data = _fetch(symbol, f"range={rng}&interval=1d")
    rows: List[Dict[str, float]] = []
    for t, c in _extract_closes(data):
        date = datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d")
        rows.append({"date": date, "close": c})
    return rows


def intraday_bars(symbol: str, rng: str = "60d", interval: str = "15m") -> List[Tuple[int, float]]:
    """Intraday (unix_ts, close) bars for fine-grained §8 labeling (~60d window)."""
    data = _fetch(symbol, f"range={rng}&interval={interval}")
    return _extract_closes(data)
