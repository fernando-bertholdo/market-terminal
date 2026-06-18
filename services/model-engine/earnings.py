from __future__ import annotations

import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set

from market import get_json

LOOKAHEAD_DAYS = 8
EXIT_BUSINESS_DAYS = 2


def iso_date(value: datetime) -> str:
    return value.date().isoformat()


def business_days_between(start: datetime, end: datetime) -> int:
    days = 0
    cursor = start.replace(hour=0, minute=0, second=0, microsecond=0)
    target = end.replace(hour=0, minute=0, second=0, microsecond=0)
    while cursor < target:
        cursor += timedelta(days=1)
        if cursor.weekday() < 5:
            days += 1
    return days


def fetch_nasdaq_date(day: str) -> Set[str]:
    url = f"https://api.nasdaq.com/api/calendar/earnings?date={day}"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://www.nasdaq.com",
            "Referer": "https://www.nasdaq.com/market-activity/earnings",
            "User-Agent": "Mozilla/5.0 (compatible; ATLAS-Macro-Terminal/1.0)",
        },
    )
    with urllib.request.urlopen(req, timeout=8) as response:
        import json

        payload = json.loads(response.read().decode("utf-8"))
    rows = ((payload.get("data") or {}).get("rows") or [])
    return {str(row["symbol"]).upper() for row in rows if row.get("symbol")}


def earnings_risks(symbols: List[str], now: Optional[datetime] = None) -> Dict[str, Dict[str, Any]]:
    now = now or datetime.now(timezone.utc)
    normalized = [symbol.strip().upper() for symbol in symbols if symbol.strip()]
    dates = [iso_date(now + timedelta(days=offset)) for offset in range(LOOKAHEAD_DAYS + 1)]
    event_by_symbol: Dict[str, str] = {}
    failed = False

    for day in dates:
        try:
            symbols_on_day = fetch_nasdaq_date(day)
            for symbol in symbols_on_day:
                event_by_symbol.setdefault(symbol, day)
        except Exception:
            failed = True

    risks: Dict[str, Dict[str, Any]] = {}
    for symbol in normalized:
        next_date = event_by_symbol.get(symbol)
        business_days_until = (
            business_days_between(now, datetime.fromisoformat(f"{next_date}T12:00:00+00:00"))
            if next_date
            else None
        )
        if failed:
            status = "UNKNOWN"
            note = "Calendar incomplete; new exposure is blocked conservatively"
        else:
            blocked = business_days_until is not None and business_days_until <= EXIT_BUSINESS_DAYS
            status = "BLOCKED" if blocked else "CLEAR"
            if blocked:
                note = f"Earnings window: {business_days_until} business day(s) until expected report"
            elif next_date:
                note = f"Expected report in {business_days_until} business day(s)"
            else:
                note = f"No expected report in the next {LOOKAHEAD_DAYS} calendar days"
        risks[symbol] = {
            "symbol": symbol,
            "status": status,
            "nextDate": next_date,
            "businessDaysUntil": business_days_until,
            "source": "NASDAQ",
            "note": note,
        }
    return risks
