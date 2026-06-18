from __future__ import annotations

import os
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def get_json(url: str, timeout: float = 10) -> Any:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        import json

        return json.loads(response.read().decode("utf-8"))


MONTH_CODES = {
    "F": 1, "G": 2, "H": 3, "J": 4, "K": 5, "M": 6,
    "N": 7, "Q": 8, "U": 9, "V": 10, "X": 11, "Z": 12,
}


def month_code(month: int) -> str:
    return "FGHJKMNQUVXZ"[month - 1]


def contract(prefix: str, month: int, year: int) -> str:
    return f"{prefix}{month_code(month)}{str(year)[-2:]}"


def b3_market_symbols(now: Optional[datetime] = None) -> List[str]:
    now = now or datetime.now(timezone.utc)
    year = now.year
    month = now.month
    symbols = set()
    if month <= 7:
        symbols.add(contract("DI1", 7, year))
    for offset in range(0 if month == 1 else 1, 8):
        symbols.add(contract("DI1", 1, year + offset))
    for offset in range(4):
        index = month - 1 + offset
        symbols.add(contract("DDI", index % 12 + 1, year + index // 12))
    for offset in range(1, 5):
        symbols.add(contract("DDI", 1, year + offset))
    for offset in range(5):
        for maturity_month in (1, 5, 8):
            if offset == 0 and maturity_month < month:
                continue
            symbols.add(contract("DAP", maturity_month, year + offset))
    front_index = month
    front_month = front_index % 12 + 1
    front_year = year + front_index // 12
    for prefix in ("DOL", "WDO", "IND", "WIN"):
        symbols.add(contract(prefix, front_month, front_year))
    return sorted(symbols)


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


def ptax_date(value: date) -> str:
    return value.strftime("%m-%d-%Y")


def ptax(currency: str = "USD") -> Optional[Dict[str, Any]]:
    endpoint = "CotacaoDolarDia" if currency.upper() == "USD" else "CotacaoMoedaDia"
    today = datetime.now(timezone.utc).date()
    for offset in range(7):
        day = today - timedelta(days=offset)
        if currency.upper() == "USD":
            url = (
                "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
                f"{endpoint}(dataCotacao=@dataCotacao)?@dataCotacao='{ptax_date(day)}'"
                "&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao"
            )
        else:
            url = (
                "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
                f"{endpoint}(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='{currency.upper()}'"
                f"&@dataCotacao='{ptax_date(day)}'"
                "&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao"
            )
        try:
            payload = get_json(url)
            values = payload.get("value") or []
            if not values:
                continue
            obs = values[0]
            bid = float(obs["cotacaoCompra"])
            ask = float(obs["cotacaoVenda"])
            return {"bid": bid, "ask": ask, "mid": (bid + ask) / 2, "timestamp": obs["dataHoraCotacao"]}
        except Exception:
            continue
    return None


def focus_annual(indicator: str) -> List[Dict[str, Any]]:
    this_year = datetime.now(timezone.utc).year
    years = [str(this_year), str(this_year + 1)]
    raw_filter = f"Indicador eq '{indicator}' and (DataReferencia eq '{years[0]}' or DataReferencia eq '{years[1]}')"
    url = (
        "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/"
        "ExpectativasMercadoAnuais?"
        f"$filter={urllib.parse.quote(raw_filter)}"
        "&$orderby=Data%20desc&$top=30&$format=json"
        "&$select=Indicador,Data,DataReferencia,Mediana,numeroRespondentes"
    )
    try:
        payload = get_json(url)
        by_year: Dict[str, Dict[str, Any]] = {}
        for row in payload.get("value") or []:
            by_year.setdefault(row["DataReferencia"], row)
        return [
            {
                "referenceYear": row["DataReferencia"],
                "median": row["Mediana"],
                "surveyDate": row["Data"],
                "respondents": row["numeroRespondentes"],
            }
            for year in years
            if (row := by_year.get(year))
        ]
    except Exception:
        return []


def b3_snapshot(symbol: str) -> Optional[Dict[str, Any]]:
    normalized = symbol.strip().upper()
    url = f"https://cotacao.b3.com.br/mds/api/v1/instrumentQuotation/{urllib.parse.quote(normalized)}"
    received_at = datetime.now(timezone.utc).isoformat()
    try:
        payload = get_json(url)
        code = ((payload.get("BizSts") or {}).get("cd"))
        if not isinstance(code, str):
            return None
        quote = (((payload.get("Trad") or [{}])[0].get("scty") or {}).get("SctyQtn") or {})
        symbol_from_payload = (((payload.get("Trad") or [{}])[0].get("scty") or {}).get("symb") or normalized)

        def finite(value: Any) -> Optional[float]:
            return value if isinstance(value, (int, float)) else None

        return {
            "symbol": symbol_from_payload,
            "open": finite(quote.get("opngPric")),
            "min": finite(quote.get("minPric")),
            "max": finite(quote.get("maxPric")),
            "avg": finite(quote.get("avrgPric")),
            "current": finite(quote.get("curPrc")),
            "change": finite(quote.get("prcFlcn")),
            "receivedAt": received_at,
            "status": {"code": code, "description": (payload.get("BizSts") or {}).get("desc"), "ok": code == "OK"},
        }
    except Exception:
        return None


def b3_snapshots(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    out = {}
    for symbol in symbols:
        snap = b3_snapshot(symbol)
        if snap:
            out[symbol] = snap
    return out


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


def market_snapshot(
    symbols: List[str],
    bcb_codes: List[str],
    fred_ids: List[str],
    include_ptax: bool = False,
    include_b3: bool = False,
) -> Dict[str, Any]:
    return {
        "mode": "python-backend",
        "yahoo": yahoo_quotes(symbols),
        "bcb": {code: value for code in bcb_codes if (value := bcb_series(code)) is not None},
        "ptax": {"USD": ptax("USD"), "EUR": ptax("EUR")} if include_ptax else {},
        "fred": {series: value for series in fred_ids if (value := fred_series(series)) is not None},
        "b3": b3_snapshots(b3_market_symbols()) if include_b3 else {},
    }


def bps_change(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None:
        return None
    return round((current - previous) * 100 * 10) / 10


def quote_field(quotes: Dict[str, Any], symbol: str, field: str) -> Optional[float]:
    quote = quotes.get(symbol)
    return None if quote is None else quote.get(field)


def date_key(value: date) -> str:
    return value.isoformat()


def easter_sunday(year: int) -> date:
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def brazil_holidays(year: int) -> set[str]:
    easter = easter_sunday(year)
    fixed = [
        date(year, 1, 1), date(year, 4, 21), date(year, 5, 1),
        date(year, 9, 7), date(year, 10, 12), date(year, 11, 2),
        date(year, 11, 15), date(year, 11, 20), date(year, 12, 25),
    ]
    movable = [easter - timedelta(days=48), easter - timedelta(days=47), easter - timedelta(days=2), easter + timedelta(days=60)]
    return {date_key(item) for item in fixed + movable}


def is_brazil_business_day(value: date) -> bool:
    return value.weekday() < 5 and date_key(value) not in brazil_holidays(value.year)


def following_business_day(value: date) -> date:
    while not is_brazil_business_day(value):
        value += timedelta(days=1)
    return value


def first_business_day(year: int, month: int) -> date:
    return following_business_day(date(year, month, 1))


def business_days_between(start: date, end: date) -> int:
    if end <= start:
        return 0
    days = 0
    current = start + timedelta(days=1)
    while current <= end:
        if is_brazil_business_day(current):
            days += 1
        current += timedelta(days=1)
    return days


def sao_paulo_today() -> date:
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date()


def contract_maturity(symbol: str) -> Optional[date]:
    import re

    match = re.match(r"^(DI1|DDI|DAP)([FGHJKMNQUVXZ])(\d{2})$", symbol.strip().upper())
    if not match:
        return None
    family, code, yy = match.groups()
    month = MONTH_CODES[code]
    year = 2000 + int(yy)
    return following_business_day(date(year, month, 15)) if family == "DAP" else first_business_day(year, month)


def curve_day_count(family: str) -> str:
    return "ACT/360" if family == "DDI" else "DU/252"


def discount_factor(family: str, rate: float, year_fraction: float) -> float:
    decimal = rate / 100
    if family == "DDI":
        return 1 / (1 + decimal * year_fraction)
    return (1 + decimal) ** (-year_fraction)


def rate_from_discount(family: str, discount: float, year_fraction: float) -> float:
    if discount <= 0 or year_fraction <= 0:
        return float("nan")
    if family == "DDI":
        return ((1 / discount - 1) / year_fraction) * 100
    return (discount ** (-1 / year_fraction) - 1) * 100


def interpolate_log_linear(points: List[Dict[str, Any]], year_fraction: float) -> Optional[Dict[str, float]]:
    sorted_points = sorted([p for p in points if p["yearFraction"] > 0 and p["discountFactor"] > 0], key=lambda p: p["yearFraction"])
    if not sorted_points or year_fraction < sorted_points[0]["yearFraction"] or year_fraction > sorted_points[-1]["yearFraction"]:
        return None
    for point in sorted_points:
        if abs(point["yearFraction"] - year_fraction) < 1e-10:
            return {"rate": point["rate"], "discountFactor": point["discountFactor"]}
    upper_index = next((i for i, p in enumerate(sorted_points) if p["yearFraction"] > year_fraction), -1)
    if upper_index <= 0:
        return None
    lower = sorted_points[upper_index - 1]
    upper = sorted_points[upper_index]
    weight = (year_fraction - lower["yearFraction"]) / (upper["yearFraction"] - lower["yearFraction"])
    log_discount = __import__("math").log(lower["discountFactor"]) + weight * (__import__("math").log(upper["discountFactor"]) - __import__("math").log(lower["discountFactor"]))
    discount = __import__("math").exp(log_discount)
    return {"discountFactor": discount, "rate": rate_from_discount(lower["family"], discount, year_fraction)}


def interpolate_flat_forward_252(previous: Dict[str, Any], next_point: Dict[str, Any], target_business_days: int) -> Optional[Dict[str, float]]:
    if previous["family"] == "DDI" or next_point["family"] == "DDI":
        return None
    du_prev = previous["days"]
    du_next = next_point["days"]
    if target_business_days < du_prev or target_business_days > du_next or du_next <= du_prev or target_business_days <= 0:
        return None
    prev_factor = (1 + previous["rate"] / 100) ** (du_prev / 252)
    next_factor = (1 + next_point["rate"] / 100) ** (du_next / 252)
    weight = (target_business_days - du_prev) / (du_next - du_prev)
    target_factor = prev_factor * (next_factor / prev_factor) ** weight
    rate = (target_factor ** (252 / target_business_days) - 1) * 100
    forward_rate = ((next_factor / prev_factor) ** (252 / (du_next - du_prev)) - 1) * 100
    return {"rate": rate, "discountFactor": 1 / target_factor, "forwardRate": forward_rate, "weight": weight}


def add_business_days(value: date, business_days: int) -> date:
    current = value
    remaining = business_days
    while remaining > 0:
        current += timedelta(days=1)
        if is_brazil_business_day(current):
            remaining -= 1
    return current


CONSTANT_VERTICES = [
    ("1M", 1 / 12), ("3M", 3 / 12), ("6M", 6 / 12), ("1Y", 1), ("2Y", 2),
    ("3Y", 3), ("5Y", 5), ("10Y", 10),
]


def build_fixed_income_curve(family: str, snapshots: List[Dict[str, Any]], as_of: Optional[date] = None) -> Dict[str, Any]:
    as_of = as_of or sao_paulo_today()
    points = []
    for snapshot in snapshots:
        symbol = snapshot.get("symbol", "").upper()
        if not snapshot.get("status", {}).get("ok") or not symbol.startswith(family) or snapshot.get("current") is None:
            continue
        maturity = contract_maturity(symbol)
        if maturity is None or maturity <= as_of:
            continue
        days = (maturity - as_of).days if family == "DDI" else business_days_between(as_of, maturity)
        year_fraction = days / (360 if family == "DDI" else 252)
        discount = discount_factor(family, snapshot["current"], year_fraction)
        points.append({
            "symbol": symbol, "family": family, "maturityDate": date_key(maturity),
            "days": days, "yearFraction": year_fraction, "rate": snapshot["current"],
            "discountFactor": discount, "source": "snapshot", "receivedAt": snapshot.get("receivedAt"),
        })
    points.sort(key=lambda item: item["yearFraction"])
    vertices = []
    for label, years in CONSTANT_VERTICES:
        target = as_of + timedelta(days=round(years * 360)) if family == "DDI" else add_business_days(as_of, round(years * 252))
        days = (target - as_of).days if family == "DDI" else business_days_between(as_of, target)
        next_index = next((i for i, point in enumerate(points) if point["days"] >= days), -1)
        previous = points[next_index - 1] if next_index > 0 else None
        next_point = points[next_index] if next_index >= 0 else None
        interpolated = interpolate_flat_forward_252(previous, next_point, days) if family != "DDI" and previous and next_point else None
        interpolated = interpolated or interpolate_log_linear(points, years)
        if not interpolated:
            continue
        vertices.append({
            "symbol": label, "family": family, "maturityDate": date_key(target), "days": days,
            "yearFraction": years, "rate": interpolated["rate"], "discountFactor": interpolated["discountFactor"],
            "source": "interpolated", "receivedAt": None,
        })
    return {"family": family, "asOf": date_key(as_of), "dayCount": curve_day_count(family), "points": points, "vertices": vertices}


def build_fixed_income_curves(snapshots: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {family: build_fixed_income_curve(family, snapshots) for family in ("DI1", "DDI", "DAP")}


def di_pu(rate_pct: float, business_days: int) -> float:
    return 100_000 / ((1 + rate_pct / 100) ** (business_days / 252))


def di_risk(symbol: str, label: str, year: int, month: int, rate: Optional[float], as_of: date) -> Dict[str, Any]:
    maturity = first_business_day(year, month)
    days = business_days_between(as_of, maturity)
    base = {
        "id": symbol, "label": label, "market": "BR", "instrumentType": "DI_FUTURE",
        "rate": rate, "maturityDate": date_key(maturity), "businessDays": days,
        "dv01Currency": "BRL", "riskNotional": 1, "methodology": "B3 DI1 zero-coupon PU; risk per contract",
    }
    if rate is None or days <= 0:
        return {**base, "macaulayDuration": days / 252, "modifiedDuration": None, "convexity": None, "price": None, "dv01": None, "contractsPerRiskUnit": None}
    years = days / 252
    y = rate / 100
    price = di_pu(rate, days)
    up = di_pu(rate + 0.01, days)
    down = di_pu(rate - 0.01, days)
    dv01 = abs(down - up) / 2
    return {**base, "macaulayDuration": years, "modifiedDuration": years / (1 + y), "convexity": years * (years + 1) / ((1 + y) ** 2), "price": price, "dv01": dv01, "contractsPerRiskUnit": 1000 / dv01 if dv01 > 0 else None}


def bond_price(yield_pct: float, coupon_pct: float, years: int, face_value: float) -> float:
    periods = years * 2
    period_yield = yield_pct / 100 / 2
    coupon = face_value * coupon_pct / 100 / 2
    return sum(((coupon + face_value) if period == periods else coupon) / ((1 + period_yield) ** period) for period in range(1, periods + 1))


def treasury_risk(symbol: str, label: str, years: int, rate: Optional[float]) -> Dict[str, Any]:
    base = {"id": symbol, "label": label, "market": "US", "instrumentType": "PAR_BOND_PROXY", "rate": rate, "maturityDate": None, "businessDays": None, "dv01Currency": "USD", "riskNotional": 1_000_000, "contractsPerRiskUnit": None, "methodology": "Par Treasury proxy; semiannual coupon equals current yield"}
    if rate is None:
        return {**base, "macaulayDuration": None, "modifiedDuration": None, "convexity": None, "price": None, "dv01": None}
    price = bond_price(rate, rate, years, 100)
    up = bond_price(rate + 0.01, rate, years, 100)
    down = bond_price(rate - 0.01, rate, years, 100)
    dv01_per_100 = abs(down - up) / 2
    modified = dv01_per_100 / (price * 0.0001)
    return {**base, "macaulayDuration": modified * (1 + rate / 100 / 2), "modifiedDuration": modified, "convexity": (up + down - 2 * price) / (price * 0.0001 * 0.0001), "price": price, "dv01": dv01_per_100 * 10_000}


def calculate_fixed_income_risk(market: Dict[str, Any]) -> Dict[str, Any]:
    as_of = sao_paulo_today()
    di = market.get("brazil", {}).get("di", {})
    return {
        "asOf": date_key(as_of),
        "brazil": [
            di_risk("DI1N26", "DI Jul/26", 2026, 7, (di.get("DI1N26") or {}).get("rate"), as_of),
            di_risk("DI1F27", "DI Jan/27", 2027, 1, (di.get("DI1F27") or {}).get("rate"), as_of),
            di_risk("DI1F28", "DI Jan/28", 2028, 1, (di.get("DI1F28") or {}).get("rate"), as_of),
            di_risk("DI1F30", "DI Jan/30", 2030, 1, (di.get("DI1F30") or {}).get("rate"), as_of),
        ],
        "us": [
            treasury_risk("UST2Y", "US 2Y", 2, market.get("us", {}).get("ust2y")),
            treasury_risk("UST5Y", "US 5Y", 5, market.get("us", {}).get("ust5y")),
            treasury_risk("UST10Y", "US 10Y", 10, market.get("us", {}).get("ust10y")),
            treasury_risk("UST30Y", "US 30Y", 30, market.get("us", {}).get("ust30y")),
        ],
        "assumptions": [
            "DI1 uses the B3 zero-coupon PU convention with 100,000 points at maturity; DV01 is per contract.",
            "Brazil business-day counts use weekends and the standard national/B3 holiday set.",
            "Treasury rows are par-bond proxies per USD 1 million, not identified deliverable securities.",
            "Positive DV01 is reported as the absolute P&L magnitude for a parallel 1 bp yield move.",
        ],
    }


def terminal_market_snapshot() -> Dict[str, Any]:
    yahoo_symbols = [
        "BRL=X", "EURBRL=X", "DX-Y.NYB", "EURUSD=X", "USDJPY=X", "GBPUSD=X",
        "CL=F", "BZ=F", "GC=F", "TIO=F", "ZS=F", "HG=F",
        "^GSPC", "^VIX", "^BVSP", "EWZ", "EEM", "XLE", "XLF", "XLI", "XLK",
    ]
    quotes = yahoo_quotes(yahoo_symbols)
    bcb = {code: bcb_series(code) for code in ["1178", "4392", "433"]}
    ptax_usd = ptax("USD")
    ptax_eur = ptax("EUR")
    fred = {series: fred_series(series) for series in ["DGS2", "DGS5", "DGS10", "DGS30", "FEDFUNDS"]}
    b3 = b3_snapshots(b3_market_symbols())
    di_n26 = b3.get("DI1N26")
    di_f27 = b3.get("DI1F27")
    di_f28 = b3.get("DI1F28")
    di_f30 = b3.get("DI1F30")

    def di_contract(snapshot: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "rate": None if snapshot is None else snapshot.get("current"),
            "change": None if snapshot is None or snapshot.get("change") is None else snapshot.get("change") * 100,
            "open": None if snapshot is None else snapshot.get("open"),
            "min": None if snapshot is None else snapshot.get("min"),
            "max": None if snapshot is None else snapshot.get("max"),
            "average": None if snapshot is None else snapshot.get("avg"),
            "receivedAt": None if snapshot is None else snapshot.get("receivedAt"),
        }

    data = {
        "brazil": {
            "selic": (bcb.get("1178") or {}).get("value"),
            "selicChange": None,
            "cdi": (bcb.get("4392") or {}).get("value"),
            "cdiChange": None,
            "ipca": (bcb.get("433") or {}).get("value"),
            "usdbrl": ptax_usd,
            "eurbrl": ptax_eur,
            "di": {
                "DI1N26": di_contract(di_n26),
                "DI1F27": di_contract(di_f27),
                "DI1F28": di_contract(di_f28),
                "DI1F30": di_contract(di_f30),
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
            "eurbrlOfficial": None if ptax_eur is None else ptax_eur.get("mid"),
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
    snapshots = list(b3.values())
    has_any_di = any(s.get("status", {}).get("ok") and s.get("current") is not None for s in [di_n26, di_f27, di_f28, di_f30] if s)
    data["fixedIncomeRisk"] = calculate_fixed_income_risk(data)
    data["fixedIncomeCurves"] = build_fixed_income_curves(snapshots)
    data["b3Futures"] = b3
    data["marketIntelligence"] = {
        "quotes": {},
        "providers": [
            {"provider": "yahoo", "ok": bool(quotes), "freshObservations": len(quotes), "staleObservations": 0, "missingObservations": 0},
            {"provider": "b3", "ok": bool(snapshots), "freshObservations": len(snapshots), "staleObservations": 0, "missingObservations": 0},
        ],
        "persistence": "disabled",
    }

    sources = {
        "bcb": {"ok": any(bcb.values()) or ptax_usd is not None or ptax_eur is not None, "label": "BCB", "message": None if ptax_usd else "PTAX unavailable"},
        "fred": {"ok": any(fred.values()), "label": "FRED", "message": None if os.getenv("FRED_API_KEY") else "Missing FRED_API_KEY"},
        "b3": {"ok": has_any_di, "label": "B3", "message": None if has_any_di else "DI quotations unavailable"},
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
            "focusIpca": focus_annual("IPCA"),
            "focusSelic": focus_annual("Selic"),
        },
    }
