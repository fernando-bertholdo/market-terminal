from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import median
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

TRADING_DAYS = 252
SLEEVES = ("tsmom", "carry", "macro")
THEMATIC_EQUITY_THEME_CAP = 0.08
HEDGE_WINDOW = 120
MIN_HEDGE_OBSERVATIONS = 60
MAX_ABS_HEDGE_RATIO = 2.0
MIN_EXPRESSION_WEIGHT = 0.005


@dataclass(frozen=True)
class Asset:
    symbol: str
    label: str
    assetClass: str
    costBps: float
    carryQuote: Optional[str] = None
    thematicEquity: bool = False
    theme: Optional[str] = None
    benchmarkSymbol: Optional[str] = None
    maxWeight: Optional[float] = None


SIM_UNIVERSE: List[Asset] = [
    Asset("BRL=X", "USD/BRL", "fx", 4, carryQuote="brl"),
    Asset("EURUSD=X", "EUR/USD", "fx", 2),
    Asset("USDJPY=X", "USD/JPY", "fx", 2),
    Asset("GBPUSD=X", "GBP/USD", "fx", 2),
    Asset("CL=F", "WTI", "commodity", 5),
    Asset("BZ=F", "Brent", "commodity", 5),
    Asset("GC=F", "Gold", "commodity", 3),
    Asset("HG=F", "Copper", "commodity", 5),
    Asset("ZS=F", "Soybeans", "commodity", 5),
    Asset("^GSPC", "S&P 500", "equity", 2),
    Asset("^BVSP", "Ibovespa", "equity", 5),
    Asset("EWZ", "Brazil Equities (EWZ)", "equity", 3),
    Asset("EEM", "Emerging Markets (EEM)", "equity", 3),
    Asset("XLE", "US Energy (XLE)", "equity", 2),
    Asset("XLF", "US Financials (XLF)", "equity", 2),
    Asset("XLI", "US Industrials (XLI)", "equity", 2),
    Asset("XLK", "US Technology (XLK)", "equity", 2),
    Asset("PBR", "Petrobras ADR", "equity", 5, thematicEquity=True, theme="energy", benchmarkSymbol="XLE", maxWeight=0.05),
    Asset("XOM", "Exxon Mobil", "equity", 2, thematicEquity=True, theme="energy", benchmarkSymbol="XLE", maxWeight=0.05),
    Asset("VALE", "Vale ADR", "equity", 5, thematicEquity=True, theme="china-metals", benchmarkSymbol="EWZ", maxWeight=0.05),
    Asset("ITUB", "Itau Unibanco ADR", "equity", 5, thematicEquity=True, theme="rates-credit", benchmarkSymbol="EWZ", maxWeight=0.05),
    Asset("JPM", "JPMorgan Chase", "equity", 2, thematicEquity=True, theme="rates-credit", benchmarkSymbol="XLF", maxWeight=0.05),
    Asset("LMT", "Lockheed Martin", "equity", 3, thematicEquity=True, theme="defense", benchmarkSymbol="ITA", maxWeight=0.05),
    Asset("NVDA", "NVIDIA", "equity", 2, thematicEquity=True, theme="ai-capex", benchmarkSymbol="SOXX", maxWeight=0.05),
    Asset("MSFT", "Microsoft", "equity", 2, thematicEquity=True, theme="ai-capex", benchmarkSymbol="XLK", maxWeight=0.05),
    Asset("VST", "Vistra", "equity", 3, thematicEquity=True, theme="power-demand", benchmarkSymbol="XLU", maxWeight=0.05),
    Asset("CAT", "Caterpillar", "equity", 2, thematicEquity=True, theme="industrial-cycle", benchmarkSymbol="XLI", maxWeight=0.05),
]


def clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return min(hi, max(lo, x))


def finite_series(values: Iterable[float]) -> List[float]:
    return [float(v) for v in values if isinstance(v, (int, float)) and math.isfinite(v)]


def daily_returns(closes: List[float]) -> List[float]:
    out: List[float] = []
    for i in range(1, len(closes)):
        if closes[i - 1] != 0:
            out.append(closes[i] / closes[i - 1] - 1)
    return out


def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def stdev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


def ewma_vol(returns: List[float], com: int = 60) -> float:
    if not returns:
        return 0.0
    delta = com / (1 + com)
    variance = returns[0] ** 2
    for value in returns[1:]:
        variance = delta * variance + (1 - delta) * value ** 2
    return math.sqrt(variance * TRADING_DAYS)


def trend_pct(closes: List[float], lookback: int) -> Optional[float]:
    if len(closes) < lookback + 1:
        return None
    last = closes[-1]
    base = closes[-1 - lookback]
    if not math.isfinite(last) or not math.isfinite(base) or base == 0:
        return None
    return last / base - 1


def tsmom_signal(closes: List[float]) -> float:
    if len(closes) < 64:
        return 0.0
    last = closes[-1]
    lookback12 = closes[-253] if len(closes) > 252 else closes[0]
    lookback3 = closes[-64]
    sign12 = 1 if last / lookback12 - 1 > 0 else -1 if last / lookback12 - 1 < 0 else 0
    sign3 = 1 if last / lookback3 - 1 > 0 else -1 if last / lookback3 - 1 < 0 else 0
    return 0.5 * sign12 + 0.5 * sign3


def carry_signal(asset: Asset, params: Dict[str, Any]) -> float:
    if asset.carryQuote != "brl":
        return 0.0
    selic = params.get("selic")
    fed = params.get("fedFunds")
    if selic is None or fed is None:
        return 0.0
    return -clamp((selic - fed) / 10)


def aggregate_score(bucket: Optional[Dict[str, Any]]) -> float:
    if not bucket or bucket.get("mentions", 0) <= 0:
        return 0.0
    conviction = clamp(float(bucket.get("intensity", 0)) / 1.5, 0, 1)
    return float(bucket.get("score", 0)) * conviction


def news_signal(asset: Asset, intelligence: Optional[Dict[str, Any]]) -> float:
    if not intelligence:
        return 0.0
    assets = intelligence.get("assets") or {}
    factors = intelligence.get("factors") or {}
    asset_map: Dict[str, Tuple[str, float]] = {
        "BRL=X": ("BRL", -1), "CL=F": ("OIL", 1), "BZ=F": ("OIL", 1),
        "GC=F": ("GOLD", 1), "HG=F": ("COPPER", 1), "ZS=F": ("SOY", 1),
        "^GSPC": ("SPX", 1), "^BVSP": ("IBOV", 1), "EWZ": ("IBOV", 1),
        "EEM": ("SPX", 1), "XLE": ("OIL", 1), "XLF": ("SPX", 1),
        "XLI": ("SPX", 1), "XLK": ("SPX", 1), "PBR": ("OIL", 1),
        "XOM": ("OIL", 1), "VALE": ("COPPER", 1), "ITUB": ("IBOV", 1),
        "JPM": ("SPX", 1), "LMT": ("SPX", -1), "NVDA": ("SPX", 1),
        "MSFT": ("SPX", 1), "VST": ("SPX", 1), "CAT": ("COPPER", 1),
    }
    asset_score = 0.0
    if asset.symbol in asset_map:
        asset_id, direction = asset_map[asset.symbol]
        asset_score = aggregate_score(assets.get(asset_id)) * direction

    thematic: Dict[str, List[Tuple[str, float]]] = {
        "PBR": [("energy", 1)], "XOM": [("energy", 1)],
        "VALE": [("metals", 0.65), ("growth", 0.35)],
        "ITUB": [("credit", 0.45), ("growth", 0.30), ("risk", 0.25)],
        "JPM": [("credit", 0.45), ("growth", 0.30), ("rates_us", 0.25)],
        "LMT": [("defense", 1)],
        "NVDA": [("technology", 0.8), ("growth", 0.2)],
        "MSFT": [("technology", 0.8), ("growth", 0.2)],
        "VST": [("power", 0.75), ("growth", 0.25)],
        "CAT": [("growth", 0.7), ("metals", 0.3)],
    }
    factor_score = sum(aggregate_score(factors.get(fid)) * weight for fid, weight in thematic.get(asset.symbol, []))
    if asset.thematicEquity:
        return clamp(0.45 * asset_score + 0.55 * factor_score)
    return clamp(asset_score)


def compute_macro_factors(closes_by_symbol: Dict[str, List[float]]) -> Dict[str, Any]:
    vix = closes_by_symbol.get("^VIX", [])
    spx = closes_by_symbol.get("^GSPC", [])
    dxy = closes_by_symbol.get("DX-Y.NYB", [])
    us10y = closes_by_symbol.get("^TNX", [])
    oil = closes_by_symbol.get("CL=F", [])
    copper = closes_by_symbol.get("HG=F", [])
    gold = closes_by_symbol.get("GC=F", [])

    risk = 0.0
    vix_level = vix[-1] if vix else None
    if len(vix) >= 120 and vix_level is not None:
        med = median(vix[-252:])
        if med > 0:
            risk -= clamp((vix_level / med - 1) * 2) * 0.6
    spx_trend = trend_pct(spx, 63)
    if spx_trend is not None:
        risk += clamp(spx_trend / 0.08) * 0.4
    risk = clamp(risk)

    growth = 0.0
    if len(copper) >= 64 and len(gold) >= 64:
        n = min(len(copper), len(gold))
        ratio = [copper[-n + i] / gold[-n + i] for i in range(n) if gold[-n + i] != 0]
        ratio_trend = trend_pct(ratio, min(63, len(ratio) - 1))
        if ratio_trend is not None:
            growth = clamp(ratio_trend / 0.20)

    usd_trend = trend_pct(dxy, 63)
    rates_trend = trend_pct(us10y, 63)
    oil_trend = trend_pct(oil, 63)
    return {
        "risk": risk,
        "growth": clamp(growth),
        "usd": clamp(usd_trend / 0.08) if usd_trend is not None else 0.0,
        "rates": clamp(rates_trend / 0.15) if rates_trend is not None else 0.0,
        "energy": clamp(oil_trend / 0.25) if oil_trend is not None else 0.0,
        "vixLevel": vix_level,
    }


def macro_signal(asset: Asset, f: Dict[str, float], params: Dict[str, Any]) -> float:
    r, g, u, rates, e = f["risk"], f["growth"], f["usd"], f["rates"], f["energy"]
    symbol = asset.symbol
    if symbol == "^GSPC":
        return clamp(0.6 * g + 0.4 * r)
    if symbol == "^BVSP":
        return clamp(0.4 * g + 0.4 * r - 0.2 * u)
    if symbol == "EWZ":
        return clamp(0.30 * g + 0.30 * r - 0.25 * u + 0.15 * e)
    if symbol == "EEM":
        return clamp(0.35 * g + 0.35 * r - 0.30 * u)
    if symbol == "XLE":
        return clamp(0.45 * e + 0.30 * g + 0.25 * r)
    if symbol in ("XLF", "JPM"):
        return clamp(0.35 * g + 0.30 * r + 0.35 * rates)
    if symbol == "XLI":
        return clamp(0.55 * g + 0.35 * r - 0.10 * u)
    if symbol == "XLK":
        return clamp(0.30 * g + 0.45 * r - 0.20 * rates - 0.05 * u)
    if symbol in ("PBR", "XOM"):
        return clamp(0.50 * e + 0.25 * g + 0.25 * r)
    if symbol == "VALE":
        return clamp(0.55 * g - 0.25 * u + 0.20 * r)
    if symbol == "ITUB":
        return clamp(0.35 * g + 0.35 * r - 0.30 * u)
    if symbol == "LMT":
        return clamp(-0.55 * r + 0.25 * u + 0.20 * rates)
    if symbol in ("NVDA", "MSFT"):
        return clamp(0.35 * g + 0.45 * r - 0.20 * rates)
    if symbol == "VST":
        return clamp(0.40 * g + 0.35 * r + 0.25 * e)
    if symbol == "CAT":
        return clamp(0.65 * g + 0.25 * r - 0.10 * u)
    if symbol == "GC=F":
        return clamp(-0.6 * u - 0.3 * r)
    if symbol in ("CL=F", "BZ=F", "HG=F"):
        return clamp(0.7 * g + 0.3 * r)
    if symbol == "ZS=F":
        return clamp(0.5 * g - 0.3 * u)
    if symbol == "BRL=X":
        selic, fed = params.get("selic"), params.get("fedFunds")
        carry_pull = clamp((selic - fed) / 10, 0, 1) * 0.3 if selic is not None and fed is not None and r > 0 else 0
        return clamp(0.45 * u - 0.45 * r - carry_pull)
    if symbol in ("EURUSD=X", "GBPUSD=X"):
        return clamp(-0.8 * u)
    if symbol == "USDJPY=X":
        return clamp(0.5 * u + 0.5 * r)
    return 0.0


def asset_weight_cap(asset: Asset, params: Dict[str, Any]) -> float:
    return min(float(params["maxAssetWeight"]), asset.maxWeight if asset.maxWeight is not None else float(params["maxAssetWeight"]))


def relative_move(asset: Asset, closes_by_symbol: Dict[str, List[float]]) -> Optional[float]:
    if not asset.benchmarkSymbol:
        return None
    asset_trend = trend_pct(closes_by_symbol.get(asset.symbol, []), 63)
    benchmark_trend = trend_pct(closes_by_symbol.get(asset.benchmarkSymbol, []), 63)
    if asset_trend is None or benchmark_trend is None:
        return None
    return asset_trend - benchmark_trend


def regime_from_factors(f: Dict[str, Any]) -> Dict[str, Any]:
    risk_score = f["risk"]
    label = "RISK-ON" if risk_score > 0.2 else "RISK-OFF" if risk_score < -0.2 else "NEUTRAL"
    gross_scale = 0.6 if label == "RISK-OFF" else 1.1 if label == "RISK-ON" else 1.0
    detail = f"risk {f['risk']:.2f} · growth {f['growth']:.2f} · usd {f['usd']:.2f}"
    if f.get("vixLevel") is not None:
        detail += f" · VIX {f['vixLevel']:.1f}"
    return {
        "riskScore": risk_score,
        "label": label,
        "grossScale": gross_scale,
        "factors": {k: f[k] for k in ("risk", "growth", "usd", "rates", "energy")},
        "detail": detail,
    }


def portfolio_vol(weights: Dict[str, float], returns_by_symbol: Dict[str, List[float]]) -> float:
    symbols = [s for s, w in weights.items() if len(returns_by_symbol.get(s, [])) >= 40]
    if not symbols:
        return 0.0
    n = min(90, *(len(returns_by_symbol[s]) for s in symbols))
    series = [returns_by_symbol[s][-n:] for s in symbols]
    means = [mean(values) for values in series]
    variance = 0.0
    for i, sym_i in enumerate(symbols):
        for j, sym_j in enumerate(symbols):
            cov = sum((series[i][t] - means[i]) * (series[j][t] - means[j]) for t in range(n)) / (n - 1)
            variance += weights[sym_i] * weights[sym_j] * cov
    return math.sqrt(max(variance, 0) * TRADING_DAYS)


def beta_hedge_ratio(alpha_returns: List[float], hedge_returns: List[float]) -> Dict[str, Any]:
    obs = min(HEDGE_WINDOW, len(alpha_returns), len(hedge_returns))
    if obs < MIN_HEDGE_OBSERVATIONS:
        return {"ratio": None, "observations": obs}
    alpha, hedge = alpha_returns[-obs:], hedge_returns[-obs:]
    ma, mh = mean(alpha), mean(hedge)
    cov = sum((alpha[i] - ma) * (hedge[i] - mh) for i in range(obs))
    var_h = sum((hedge[i] - mh) ** 2 for i in range(obs))
    if var_h <= 1e-12:
        return {"ratio": None, "observations": obs}
    return {"ratio": clamp(-cov / var_h, -MAX_ABS_HEDGE_RATIO, MAX_ABS_HEDGE_RATIO), "observations": obs}


def returns_for(closes_by_symbol: Dict[str, List[float]], symbol: str) -> List[float]:
    return [v for v in daily_returns(closes_by_symbol.get(symbol, [])) if math.isfinite(v)]


def usd_basket_returns(closes_by_symbol: Dict[str, List[float]]) -> List[float]:
    components = [("EURUSD=X", -1), ("USDJPY=X", 1), ("GBPUSD=X", -1)]
    returns = [returns_for(closes_by_symbol, symbol) for symbol, _ in components]
    obs = min((len(r) for r in returns), default=0)
    if obs <= 0:
        return []
    out: List[float] = []
    for idx in range(obs):
        out.append(sum(direction * returns[i][len(returns[i]) - obs + idx] for i, (_, direction) in enumerate(components)) / len(components))
    return out


def metadata(kind: str, estimate: Dict[str, Any], active: bool) -> Dict[str, Any]:
    return {
        "method": "beta=-cov/var",
        "kind": kind,
        "window": HEDGE_WINDOW,
        "minObservations": MIN_HEDGE_OBSERVATIONS,
        "observations": estimate["observations"],
        "beta": estimate["ratio"],
        "cap": MAX_ABS_HEDGE_RATIO,
        "status": "inactive" if not active else "insufficient-data" if estimate["ratio"] is None else "applied",
        "dv01": None,
        "dv01Status": "unsupported",
    }


def add_adjustment(adjustments: Dict[str, Dict[str, float]], symbol: str, sleeve: str, weight: float) -> None:
    current = adjustments.setdefault(symbol, {s: 0.0 for s in SLEEVES})
    current[sleeve] += weight


def add_reason(reasons: Dict[str, List[str]], symbol: str, reason: str) -> None:
    reasons.setdefault(symbol, []).append(reason)


def build_hedged_expressions(closes_by_symbol: Dict[str, List[float]], signals: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, float]], Dict[str, List[str]]]:
    expressions: List[Dict[str, Any]] = []
    adjustments: Dict[str, Dict[str, float]] = {}
    reasons: Dict[str, List[str]] = {}
    by_symbol = {s["symbol"]: s for s in signals}

    def single(config: Dict[str, Any]) -> None:
        alpha = by_symbol.get(config["alphaSymbol"])
        hedge = by_symbol.get(config["hedgeSymbol"])
        if not alpha or not hedge:
            return
        alpha_weight = sum(alpha["weights"][sleeve] for sleeve in config["sleeves"])
        active = abs(alpha_weight) >= MIN_EXPRESSION_WEIGHT
        est = beta_hedge_ratio(returns_for(closes_by_symbol, config["alphaSymbol"]), returns_for(closes_by_symbol, config["hedgeSymbol"]))
        hedge_weight = alpha_weight * est["ratio"] if active and est["ratio"] is not None else 0.0
        if hedge_weight != 0:
            for sleeve in config["sleeves"]:
                add_adjustment(adjustments, config["hedgeSymbol"], sleeve, alpha["weights"][sleeve] * est["ratio"])
            add_reason(reasons, config["alphaSymbol"], f"Alpha leg in {config['label']}")
            add_reason(reasons, config["hedgeSymbol"], f"Hedge leg for {config['alphaSymbol']}: beta {est['ratio']:.2f}")
        expressions.append({
            "id": config["id"],
            "label": config["label"],
            "alphaSymbol": config["alphaSymbol"],
            "sourceSleeves": config["sleeves"],
            "legs": [
                {"symbol": config["alphaSymbol"], "role": "alpha", "weight": alpha_weight, "ratioToAlpha": 1, "rationale": config["rationale"]},
                {"symbol": config["hedgeSymbol"], "role": "hedge", "weight": hedge_weight, "ratioToAlpha": est["ratio"] or 0, "rationale": f"Empirical beta hedge using at most {HEDGE_WINDOW} observations available at decision time"},
            ],
            "hedge": metadata(config["kind"], est, active),
            "rationale": [
                config["rationale"],
                f"Hedge not applied: {est['observations']}/{MIN_HEDGE_OBSERVATIONS} required observations" if est["ratio"] is None else f"Hedge ratio {est['ratio']:.2f} from beta=-cov/var, capped at +/-{MAX_ABS_HEDGE_RATIO:g}",
            ],
        })

    single({"id": "wti-vs-brent", "label": "WTI alpha vs Brent hedge", "alphaSymbol": "CL=F", "hedgeSymbol": "BZ=F", "kind": "cross-asset-beta", "sleeves": ["tsmom", "macro"], "rationale": "Retain the WTI signal while neutralizing common crude-oil beta with Brent"})
    single({"id": "ibov-vs-spx", "label": "Ibovespa alpha vs S&P 500 hedge", "alphaSymbol": "^BVSP", "hedgeSymbol": "^GSPC", "kind": "cross-asset-beta", "sleeves": ["tsmom", "macro"], "rationale": "Retain Brazil equity alpha while reducing broad global-equity beta"})
    single({"id": "ibov-fx-brl", "label": "Ibovespa BRL FX hedge", "alphaSymbol": "^BVSP", "hedgeSymbol": "BRL=X", "kind": "fx-beta", "sleeves": ["tsmom", "macro"], "rationale": "Reduce the empirical USD/BRL component of the Ibovespa expression when estimable"})

    brl = by_symbol.get("BRL=X")
    if brl:
        carry_weight = brl["weights"]["carry"]
        est = beta_hedge_ratio(returns_for(closes_by_symbol, "BRL=X"), usd_basket_returns(closes_by_symbol))
        active = abs(carry_weight) >= MIN_EXPRESSION_WEIGHT
        basket_weight = carry_weight * est["ratio"] if active and est["ratio"] is not None else 0.0
        basket_legs = [("EURUSD=X", -1), ("USDJPY=X", 1), ("GBPUSD=X", -1)]
        if basket_weight != 0:
            for symbol, direction in basket_legs:
                add_adjustment(adjustments, symbol, "carry", basket_weight * direction / len(basket_legs))
                add_reason(reasons, symbol, "USD-basket hedge for the BRL rate-differential trade")
            add_reason(reasons, "BRL=X", "Alpha leg in BRL rate-differential expression")
        expressions.append({
            "id": "brl-carry-vs-usd-basket",
            "label": "BRL rate differential vs USD basket",
            "alphaSymbol": "BRL=X",
            "sourceSleeves": ["carry"],
            "legs": [{"symbol": "BRL=X", "role": "alpha", "weight": carry_weight, "ratioToAlpha": 1, "rationale": "SELIC minus Fed Funds differential is the alpha leg"}] + [
                {"symbol": symbol, "role": "hedge", "weight": basket_weight * direction / len(basket_legs), "ratioToAlpha": (est["ratio"] or 0) * direction / len(basket_legs), "rationale": "Diversified proxy for broad USD direction"}
                for symbol, direction in basket_legs
            ],
            "hedge": metadata("usd-basket-beta", est, active),
            "rationale": [
                "Hedge broad USD direction through EURUSD, USDJPY, and GBPUSD while retaining the BRL rate differential",
                f"Hedge not applied: {est['observations']}/{MIN_HEDGE_OBSERVATIONS} required observations" if est["ratio"] is None else f"Basket hedge ratio {est['ratio']:.2f} from beta=-cov/var",
            ],
        })
    return expressions, adjustments, reasons


def describe_macro_drivers(asset: Asset, f: Dict[str, float]) -> str:
    parts: List[str] = []
    if abs(f["risk"]) >= 0.2:
        parts.append("risk-on tape" if f["risk"] > 0 else "risk-off tape")
    if abs(f["growth"]) >= 0.2 and asset.assetClass != "fx":
        parts.append(("improving" if f["growth"] > 0 else "fading") + " growth (Cu/Au)")
    if abs(f["usd"]) >= 0.2:
        parts.append(("strong" if f["usd"] > 0 else "weak") + " dollar trend")
    if abs(f["rates"]) >= 0.2 and asset.symbol in ("XLF", "XLK"):
        parts.append(("rising" if f["rates"] > 0 else "falling") + " US 10Y trend")
    if abs(f["energy"]) >= 0.2 and asset.symbol in ("EWZ", "XLE"):
        parts.append(("firm" if f["energy"] > 0 else "soft") + " oil trend")
    return ", ".join(parts) if parts else "mixed macro reads"


def compute_signals(closes_by_symbol: Dict[str, List[float]], params: Dict[str, Any], news_intelligence: Optional[Dict[str, Any]], news_triggered_symbols: Set[str]) -> Dict[str, Any]:
    closes = {symbol: finite_series(values) for symbol, values in closes_by_symbol.items()}
    factors = compute_macro_factors(closes)
    regime = regime_from_factors(factors)
    active_assets = [asset for asset in SIM_UNIVERSE if len(closes.get(asset.symbol, [])) >= 64]
    if not active_assets:
        return {"signals": [], "regime": regime, "exAnteVol": 0, "expressions": []}

    returns_by_symbol: Dict[str, List[float]] = {}
    signals: List[Dict[str, Any]] = []
    for asset in active_assets:
        asset_closes = closes[asset.symbol]
        returns = daily_returns(asset_closes)
        returns_by_symbol[asset.symbol] = returns
        vol = max(ewma_vol(returns), 0.02)
        vol_scale = float(params["portfolioVolTarget"]) / vol
        relative = relative_move(asset, closes)
        idio_scale = 0.5 if relative is not None and abs(relative) >= 0.20 else 0.75 if relative is not None and abs(relative) >= 0.12 else 1
        triggered = asset.symbol in news_triggered_symbols
        news_coeff = 0.9 if triggered else 0.35
        raw = {
            "tsmom": 0.0 if asset.thematicEquity else tsmom_signal(asset_closes),
            "carry": carry_signal(asset, params),
            "macro": clamp(macro_signal(asset, factors, params) + news_coeff * news_signal(asset, news_intelligence)) * idio_scale,
        }
        weights = {sleeve: raw[sleeve] * vol_scale / len(active_assets) for sleeve in SLEEVES}
        cap = asset_weight_cap(asset, params)
        total_weight = clamp(sum(weights.values()), -cap, cap)
        rationale: List[str] = []
        if raw["tsmom"] != 0:
            rationale.append(("Positive" if raw["tsmom"] > 0 else "Negative") + " 12m/3m price trend")
        if raw["carry"] != 0 and params.get("selic") is not None and params.get("fedFunds") is not None:
            rationale.append(f"Rate differential: SELIC-Fed Funds {(params['selic'] - params['fedFunds']):.1f}pp favors {'BRL' if raw['carry'] < 0 else 'USD'}")
        if abs(raw["macro"]) >= 0.15:
            rationale.append(f"Economic context supports {'long' if raw['macro'] > 0 else 'short'}: {describe_macro_drivers(asset, factors)}")
        if asset.thematicEquity:
            rationale.append(f"Macro equity theme: {asset.theme}; single-stock cap 5%")
            if relative is not None:
                suffix = f"; target reduced to {round(idio_scale * 100)}%" if idio_scale < 1 else ""
                rationale.append(f"3m move vs {asset.benchmarkSymbol}: {relative * 100:.1f}pp{suffix}")
        live_news = news_signal(asset, news_intelligence)
        if triggered and abs(live_news) >= 0.05:
            rationale.insert(0, f"PRE-MARKET NEWS TRIGGER - headline flow {'leads long' if live_news > 0 else 'leads short'} ({live_news:.2f}); news weight promoted to primary driver")
        elif abs(live_news) >= 0.1:
            rationale.append(f"Recent news {'supports long' if live_news > 0 else 'supports short'} ({live_news:.2f})")
        if not rationale:
            rationale.append("No active signal - flat")
        signals.append({
            "symbol": asset.symbol,
            "label": asset.label,
            "exAnteVol": vol,
            "signals": raw,
            "weights": weights,
            "totalWeight": total_weight,
            "rationale": rationale,
            "thematicEquity": asset.thematicEquity,
            "theme": asset.theme,
            "benchmarkSymbol": asset.benchmarkSymbol,
        })

    expressions, adjustments, hedge_reasons = build_hedged_expressions(closes, signals)
    by_symbol = {signal["symbol"]: signal for signal in signals}
    by_asset = {asset.symbol: asset for asset in active_assets}
    for symbol, adj in adjustments.items():
        signal = by_symbol.get(symbol)
        asset = by_asset.get(symbol)
        if not signal or not asset:
            continue
        for sleeve in SLEEVES:
            signal["weights"][sleeve] += adj[sleeve]
        signal["totalWeight"] = clamp(sum(signal["weights"].values()), -asset_weight_cap(asset, params), asset_weight_cap(asset, params))
    for symbol, reasons in hedge_reasons.items():
        signal = by_symbol.get(symbol)
        if not signal:
            continue
        if len(signal["rationale"]) == 1 and "flat" in signal["rationale"][0]:
            signal["rationale"] = []
        signal["rationale"].extend(reasons)

    for signal in signals:
        signal["totalWeight"] *= regime["grossScale"]
        for sleeve in SLEEVES:
            signal["weights"][sleeve] *= regime["grossScale"]

    ex_ante = portfolio_vol({s["symbol"]: s["totalWeight"] for s in signals}, returns_by_symbol)
    scale = clamp(float(params["portfolioVolTarget"]) / ex_ante, 0.25, 4) if ex_ante > 0.001 else 1.0
    gross = sum(abs(s["totalWeight"] * scale) for s in signals)
    if gross > float(params["maxGrossLeverage"]):
        scale *= float(params["maxGrossLeverage"]) / gross

    for signal in signals:
        asset = by_asset[signal["symbol"]]
        cap = asset_weight_cap(asset, params)
        signal["totalWeight"] = clamp(signal["totalWeight"] * scale, -cap, cap)
        for sleeve in SLEEVES:
            signal["weights"][sleeve] *= scale

    themes: Dict[str, List[Dict[str, Any]]] = {}
    for signal in signals:
        if signal.get("thematicEquity") and signal.get("theme"):
            themes.setdefault(signal["theme"], []).append(signal)
    for theme, group in themes.items():
        theme_gross = sum(abs(signal["totalWeight"]) for signal in group)
        if theme_gross <= THEMATIC_EQUITY_THEME_CAP:
            continue
        theme_scale = THEMATIC_EQUITY_THEME_CAP / theme_gross
        for signal in group:
            signal["totalWeight"] *= theme_scale
            for sleeve in SLEEVES:
                signal["weights"][sleeve] *= theme_scale
            signal["rationale"].append(f"Theme {theme} capped at {THEMATIC_EQUITY_THEME_CAP * 100:.0f}% gross")

    expression_scale = regime["grossScale"] * scale
    for expression in expressions:
        status = expression["hedge"]["status"]
        expression["lifecycle"] = "ACTIVE" if status == "applied" else "BLOCKED" if status == "insufficient-data" else "INACTIVE"
        for leg in expression["legs"]:
            leg["targetWeight"] = clamp(leg["weight"] * expression_scale, -float(params["maxAssetWeight"]), float(params["maxAssetWeight"]))

    for signal in signals:
        try:
            idx = signal["rationale"].index("USD-basket hedge for the BRL rate-differential trade")
        except ValueError:
            continue
        hedge_weight = signal["weights"]["carry"]
        independent_weight = signal["weights"]["tsmom"] + signal["weights"]["macro"]
        net = "net long" if signal["totalWeight"] > 0.005 else "net short" if signal["totalWeight"] < -0.005 else "net flat"
        signal["rationale"][idx] = (
            f"USD-basket hedge contributes {'long' if hedge_weight >= 0 else 'short'} {abs(hedge_weight) * 100:.1f}%; "
            f"independent drivers contribute {'long' if independent_weight >= 0 else 'short'} {abs(independent_weight) * 100:.1f}%, leaving {net}"
        )

    final_vol = portfolio_vol({s["symbol"]: s["totalWeight"] for s in signals}, returns_by_symbol)
    return {"signals": signals, "regime": regime, "exAnteVol": final_vol, "expressions": expressions}
