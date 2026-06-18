// ─── Strategy Signal Engine (v2 — macro book) ─────────────────────────────────
// Research-backed sleeves on daily data, combined into one macro portfolio:
//
// 1. TSMOM — time-series momentum (Moskowitz, Ooi & Pedersen, JFE 2012):
//    long if trailing 12m return > 0, short otherwise (blended with 3m),
//    each position scaled inversely to its ex-ante EWMA volatility.
// 2. CARRY — currency carry (Koijen, Moskowitz, Pedersen & Vrugt, JFE 2017):
//    hold the high-yield currency funded by the low-yield one. Implemented
//    for USD/BRL using SELIC vs Fed Funds.
// 3. MACRO — economic-trend / macro momentum (Brooks, AQR "A Half Century of
//    Macro Momentum" 2017; "Economic Trend" 2023): positions follow trends in
//    macro fundamentals, proxied here from prices so the backtest stays
//    walk-forward clean — risk sentiment (VIX vs its 1y norm + SPX trend),
//    growth (copper/gold ratio trend), USD trend (DXY), and the BRL policy
//    differential. Each asset gets an economically-motivated exposure map.
//
// Risk layer:
// - Regime conditioning (risk-on/off literature): the whole book de-grosses
//   when the risk regime turns off.
// - Covariance-based portfolio vol targeting: weights are scaled so the
//   ex-ante portfolio vol (wᵀΣw, trailing-90d covariance) hits the target —
//   correlations directly size the book, per risk-parity practice.

import { dailyReturns, ewmaVol, stdev, TRADING_DAYS } from '@/lib/analytics';
import type { NewsAsset, NewsIntelligence } from '@/types/market';
import {
  buildHedgedExpressions,
  type TradeExpression,
} from './hedging';

export type { ExpressionLeg, HedgeMetadata, TradeExpression } from './hedging';

export type AssetClass = 'fx' | 'commodity' | 'equity';
export type EquityTheme =
  | 'energy'
  | 'china-metals'
  | 'rates-credit'
  | 'defense'
  | 'ai-capex'
  | 'power-demand'
  | 'industrial-cycle';

export interface SimAsset {
  symbol: string;
  label: string;
  assetClass: AssetClass;
  /** one-way transaction cost in bps of notional */
  costBps: number;
  /** if true, "long the asset" means shorting the quoted pair (e.g. long BRL = short BRL=X) */
  carryQuote?: 'brl';
  /** Single stocks are macro expression vehicles, never standalone price-trend trades. */
  thematicEquity?: boolean;
  theme?: EquityTheme;
  benchmarkSymbol?: string;
  maxWeight?: number;
}

export const SIM_UNIVERSE: SimAsset[] = [
  { symbol: 'BRL=X', label: 'USD/BRL', assetClass: 'fx', costBps: 4, carryQuote: 'brl' },
  { symbol: 'EURUSD=X', label: 'EUR/USD', assetClass: 'fx', costBps: 2 },
  { symbol: 'USDJPY=X', label: 'USD/JPY', assetClass: 'fx', costBps: 2 },
  { symbol: 'GBPUSD=X', label: 'GBP/USD', assetClass: 'fx', costBps: 2 },
  { symbol: 'CL=F', label: 'WTI', assetClass: 'commodity', costBps: 5 },
  { symbol: 'BZ=F', label: 'Brent', assetClass: 'commodity', costBps: 5 },
  { symbol: 'GC=F', label: 'Gold', assetClass: 'commodity', costBps: 3 },
  { symbol: 'HG=F', label: 'Copper', assetClass: 'commodity', costBps: 5 },
  { symbol: 'ZS=F', label: 'Soybeans', assetClass: 'commodity', costBps: 5 },
  { symbol: '^GSPC', label: 'S&P 500', assetClass: 'equity', costBps: 2 },
  { symbol: '^BVSP', label: 'Ibovespa', assetClass: 'equity', costBps: 5 },
  { symbol: 'EWZ', label: 'Brazil Equities (EWZ)', assetClass: 'equity', costBps: 3 },
  { symbol: 'EEM', label: 'Emerging Markets (EEM)', assetClass: 'equity', costBps: 3 },
  { symbol: 'XLE', label: 'US Energy (XLE)', assetClass: 'equity', costBps: 2 },
  { symbol: 'XLF', label: 'US Financials (XLF)', assetClass: 'equity', costBps: 2 },
  { symbol: 'XLI', label: 'US Industrials (XLI)', assetClass: 'equity', costBps: 2 },
  { symbol: 'XLK', label: 'US Technology (XLK)', assetClass: 'equity', costBps: 2 },
  {
    symbol: 'PBR', label: 'Petrobras ADR', assetClass: 'equity', costBps: 5,
    thematicEquity: true, theme: 'energy', benchmarkSymbol: 'XLE', maxWeight: 0.05,
  },
  {
    symbol: 'XOM', label: 'Exxon Mobil', assetClass: 'equity', costBps: 2,
    thematicEquity: true, theme: 'energy', benchmarkSymbol: 'XLE', maxWeight: 0.05,
  },
  {
    symbol: 'VALE', label: 'Vale ADR', assetClass: 'equity', costBps: 5,
    thematicEquity: true, theme: 'china-metals', benchmarkSymbol: 'EWZ', maxWeight: 0.05,
  },
  {
    symbol: 'ITUB', label: 'Itau Unibanco ADR', assetClass: 'equity', costBps: 5,
    thematicEquity: true, theme: 'rates-credit', benchmarkSymbol: 'EWZ', maxWeight: 0.05,
  },
  {
    symbol: 'JPM', label: 'JPMorgan Chase', assetClass: 'equity', costBps: 2,
    thematicEquity: true, theme: 'rates-credit', benchmarkSymbol: 'XLF', maxWeight: 0.05,
  },
  {
    symbol: 'LMT', label: 'Lockheed Martin', assetClass: 'equity', costBps: 3,
    thematicEquity: true, theme: 'defense', benchmarkSymbol: 'ITA', maxWeight: 0.05,
  },
  {
    symbol: 'NVDA', label: 'NVIDIA', assetClass: 'equity', costBps: 2,
    thematicEquity: true, theme: 'ai-capex', benchmarkSymbol: 'SOXX', maxWeight: 0.05,
  },
  {
    symbol: 'MSFT', label: 'Microsoft', assetClass: 'equity', costBps: 2,
    thematicEquity: true, theme: 'ai-capex', benchmarkSymbol: 'XLK', maxWeight: 0.05,
  },
  {
    symbol: 'VST', label: 'Vistra', assetClass: 'equity', costBps: 3,
    thematicEquity: true, theme: 'power-demand', benchmarkSymbol: 'XLU', maxWeight: 0.05,
  },
  {
    symbol: 'CAT', label: 'Caterpillar', assetClass: 'equity', costBps: 2,
    thematicEquity: true, theme: 'industrial-cycle', benchmarkSymbol: 'XLI', maxWeight: 0.05,
  },
];

/** Non-traded series the macro sleeve and regime filter read for context. */
export const CONTEXT_SYMBOLS = ['^VIX', 'DX-Y.NYB', '^TNX', 'ITA', 'SOXX', 'XLU'] as const;
export const THEMATIC_EQUITY_THEME_CAP = 0.08;

export const SLEEVES = ['tsmom', 'carry', 'macro'] as const;
export type Sleeve = (typeof SLEEVES)[number];

export interface StrategyParams {
  /** annualized portfolio volatility target */
  portfolioVolTarget: number;
  /** per-asset gross weight cap */
  maxAssetWeight: number;
  /** portfolio gross leverage cap */
  maxGrossLeverage: number;
  /** carry inputs (annual %, e.g. selic=15, fedFunds=4.5) */
  selic: number | null;
  fedFunds: number | null;
}

export const DEFAULT_PARAMS: Omit<StrategyParams, 'selic' | 'fedFunds'> = {
  portfolioVolTarget: 0.10,
  maxAssetWeight: 0.40,
  maxGrossLeverage: 3,
};

export interface AssetSignal {
  symbol: string;
  label: string;
  exAnteVol: number;
  signals: Record<Sleeve, number>; // raw directional signal in [-1, 1]
  weights: Record<Sleeve, number>; // vol-scaled weight contribution per sleeve
  totalWeight: number;
  /** plain-language reasons behind the position */
  rationale: string[];
  thematicEquity?: boolean;
  theme?: EquityTheme;
  benchmarkSymbol?: string;
}

export interface RegimeState {
  /** -1 (risk-off) … +1 (risk-on) */
  riskScore: number;
  label: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF';
  /** gross-exposure multiplier applied to the whole book */
  grossScale: number;
  /** macro factor reads in [-1, 1] */
  factors: { risk: number; growth: number; usd: number; rates: number; energy: number };
  detail: string;
}

export interface SignalSet {
  signals: AssetSignal[];
  regime: RegimeState;
  /** ex-ante annualized portfolio vol after covariance scaling */
  exAnteVol: number;
  /** Audit trail for selectively hedged trade expressions. */
  expressions: TradeExpression[];
}

export interface ComputeSignalOptions {
  /**
   * Disable carry when its rate inputs are not point-in-time. Intended for
   * honest historical backtests; live calls remain enabled by default.
   */
  disableCarry?: boolean;
  /** Live-only news intelligence. Never pass this to historical backtests. */
  newsIntelligence?: NewsIntelligence | null;
  /**
   * Symbols under an active pre-market news trigger. For these, the news
   * component is promoted from a macro nudge to a primary driver of the
   * position (desk-style: a fresh, high-impact headline leads the trade).
   */
  newsTriggeredSymbols?: Set<string> | null;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function trendPct(closes: number[], lookback: number): number | null {
  if (closes.length < lookback + 1) return null;
  const last = closes[closes.length - 1];
  const base = closes[closes.length - 1 - lookback];
  if (!isFinite(last) || !isFinite(base) || base === 0) return null;
  return last / base - 1;
}

function tsmomSignal(closes: number[]): number {
  if (closes.length < 64) return 0;
  const last = closes[closes.length - 1];
  const lookback12 = closes.length > 252 ? closes[closes.length - 1 - 252] : closes[0];
  const lookback3 = closes[closes.length - 1 - 63];
  const sign12 = Math.sign(last / lookback12 - 1);
  const sign3 = Math.sign(last / lookback3 - 1);
  return 0.5 * sign12 + 0.5 * sign3;
}

function carrySignal(asset: SimAsset, params: StrategyParams): number {
  if (asset.carryQuote !== 'brl') return 0;
  if (params.selic == null || params.fedFunds == null) return 0;
  const differential = params.selic - params.fedFunds; // annual %
  // Positive differential → long BRL → SHORT the USD/BRL quote.
  return -clamp(differential / 10, -1, 1);
}

function newsSignal(asset: SimAsset, intelligence: NewsIntelligence | null | undefined): number {
  if (!intelligence) return 0;
  const assetMap: Partial<Record<string, { id: NewsAsset; direction?: number }>> = {
    'BRL=X': { id: 'BRL', direction: -1 },
    'CL=F': { id: 'OIL' },
    'BZ=F': { id: 'OIL' },
    'GC=F': { id: 'GOLD' },
    'HG=F': { id: 'COPPER' },
    'ZS=F': { id: 'SOY' },
    '^GSPC': { id: 'SPX' },
    '^BVSP': { id: 'IBOV' },
    'EWZ': { id: 'IBOV' },
    'EEM': { id: 'SPX' },
    'XLE': { id: 'OIL' },
    'XLF': { id: 'SPX' },
    'XLI': { id: 'SPX' },
    'XLK': { id: 'SPX' },
    'PBR': { id: 'OIL' },
    'XOM': { id: 'OIL' },
    'VALE': { id: 'COPPER' },
    'ITUB': { id: 'IBOV' },
    'JPM': { id: 'SPX' },
    'LMT': { id: 'SPX', direction: -1 },
    'NVDA': { id: 'SPX' },
    'MSFT': { id: 'SPX' },
    'VST': { id: 'SPX' },
    'CAT': { id: 'COPPER' },
  };
  const mapping = assetMap[asset.symbol];
  let assetScore = 0;
  if (mapping) {
    const aggregate = intelligence.assets[mapping.id];
    if (aggregate && aggregate.mentions > 0) {
      const conviction = clamp(aggregate.intensity / 1.5, 0, 1);
      assetScore = aggregate.score * conviction * (mapping.direction ?? 1);
    }
  }

  const thematicFactors: Partial<Record<string, Array<[keyof NewsIntelligence['factors'], number]>>> = {
    PBR: [['energy', 1]],
    XOM: [['energy', 1]],
    VALE: [['metals', 0.65], ['growth', 0.35]],
    ITUB: [['credit', 0.45], ['growth', 0.30], ['risk', 0.25]],
    JPM: [['credit', 0.45], ['growth', 0.30], ['rates_us', 0.25]],
    LMT: [['defense', 1]],
    NVDA: [['technology', 0.8], ['growth', 0.2]],
    MSFT: [['technology', 0.8], ['growth', 0.2]],
    VST: [['power', 0.75], ['growth', 0.25]],
    CAT: [['growth', 0.7], ['metals', 0.3]],
  };
  let factorScore = 0;
  for (const [factor, weight] of thematicFactors[asset.symbol] ?? []) {
    const aggregate = intelligence.factors[factor];
    if (!aggregate || aggregate.mentions === 0) continue;
    factorScore += aggregate.score * clamp(aggregate.intensity / 1.5, 0, 1) * weight;
  }
  if (asset.thematicEquity) {
    return clamp(0.45 * assetScore + 0.55 * factorScore, -1, 1);
  }
  return clamp(assetScore, -1, 1);
}

// ─── Macro factor reads (price-based proxies, walk-forward safe) ───────────────

interface MacroFactors {
  /** risk sentiment: +1 calm/risk-on, -1 stressed/risk-off */
  risk: number;
  /** global growth pulse from copper/gold ratio trend */
  growth: number;
  /** dollar trend */
  usd: number;
  /** US 10-year yield trend */
  rates: number;
  /** oil-price trend */
  energy: number;
  vixLevel: number | null;
}

function computeMacroFactors(closesBySymbol: Map<string, number[]>): MacroFactors {
  const vix = closesBySymbol.get('^VIX') ?? [];
  const spx = closesBySymbol.get('^GSPC') ?? [];
  const dxy = closesBySymbol.get('DX-Y.NYB') ?? [];
  const us10y = closesBySymbol.get('^TNX') ?? [];
  const oil = closesBySymbol.get('CL=F') ?? [];
  const copper = closesBySymbol.get('HG=F') ?? [];
  const gold = closesBySymbol.get('GC=F') ?? [];

  // Risk: VIX vs its trailing-1y median (stretched = risk-off), plus SPX 3m trend.
  let risk = 0;
  const vixLevel = vix.length ? vix[vix.length - 1] : null;
  if (vix.length >= 120 && vixLevel != null) {
    const window = vix.slice(-252);
    const sorted = [...window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0) risk -= clamp((vixLevel / median - 1) * 2, -1, 1) * 0.6;
  }
  const spxTrend = trendPct(spx, 63);
  if (spxTrend != null) risk += clamp(spxTrend / 0.08, -1, 1) * 0.4;
  risk = clamp(risk, -1, 1);

  // Growth: copper/gold ratio 3m trend (industrial vs safe-haven demand).
  let growth = 0;
  if (copper.length >= 64 && gold.length >= 64) {
    const n = Math.min(copper.length, gold.length);
    const ratio: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const c = copper[copper.length - n + i];
      const g = gold[gold.length - n + i];
      if (isFinite(c) && isFinite(g) && g !== 0) ratio.push(c / g);
    }
    const ratioTrend = trendPct(ratio, Math.min(63, ratio.length - 1));
    // Wide normalization so the factor expresses conviction, not saturation.
    if (ratioTrend != null) growth = clamp(ratioTrend / 0.20, -1, 1);
  }

  // USD: DXY 3m trend.
  const usdTrend = trendPct(dxy, 63);
  const usd = usdTrend != null ? clamp(usdTrend / 0.08, -1, 1) : 0;

  const ratesTrend = trendPct(us10y, 63);
  const rates = ratesTrend != null ? clamp(ratesTrend / 0.15, -1, 1) : 0;
  const oilTrend = trendPct(oil, 63);
  const energy = oilTrend != null ? clamp(oilTrend / 0.25, -1, 1) : 0;

  return { risk, growth, usd, rates, energy, vixLevel };
}

/**
 * Map macro factor reads onto each asset with economically-motivated signs
 * (AQR economic-trend style: trade the macro trend, asset by asset).
 */
function macroSignal(asset: SimAsset, f: MacroFactors, params: StrategyParams): number {
  switch (asset.symbol) {
    case '^GSPC':
      return clamp(0.6 * f.growth + 0.4 * f.risk, -1, 1);
    case '^BVSP':
      // EM equity: growth + risk appetite, hurt by a strong dollar.
      return clamp(0.4 * f.growth + 0.4 * f.risk - 0.2 * f.usd, -1, 1);
    case 'EWZ':
      return clamp(
        0.30 * f.growth + 0.30 * f.risk - 0.25 * f.usd + 0.15 * f.energy,
        -1,
        1
      );
    case 'EEM':
      return clamp(0.35 * f.growth + 0.35 * f.risk - 0.30 * f.usd, -1, 1);
    case 'XLE':
      return clamp(0.45 * f.energy + 0.30 * f.growth + 0.25 * f.risk, -1, 1);
    case 'XLF':
      return clamp(0.35 * f.growth + 0.30 * f.risk + 0.35 * f.rates, -1, 1);
    case 'XLI':
      return clamp(0.55 * f.growth + 0.35 * f.risk - 0.10 * f.usd, -1, 1);
    case 'XLK':
      return clamp(
        0.30 * f.growth + 0.45 * f.risk - 0.20 * f.rates - 0.05 * f.usd,
        -1,
        1
      );
    case 'PBR':
    case 'XOM':
      return clamp(0.50 * f.energy + 0.25 * f.growth + 0.25 * f.risk, -1, 1);
    case 'VALE':
      return clamp(0.55 * f.growth - 0.25 * f.usd + 0.20 * f.risk, -1, 1);
    case 'ITUB':
      return clamp(0.35 * f.growth + 0.35 * f.risk - 0.30 * f.usd, -1, 1);
    case 'JPM':
      return clamp(0.35 * f.growth + 0.30 * f.risk + 0.35 * f.rates, -1, 1);
    case 'LMT':
      return clamp(-0.55 * f.risk + 0.25 * f.usd + 0.20 * f.rates, -1, 1);
    case 'NVDA':
    case 'MSFT':
      return clamp(0.35 * f.growth + 0.45 * f.risk - 0.20 * f.rates, -1, 1);
    case 'VST':
      return clamp(0.40 * f.growth + 0.35 * f.risk + 0.25 * f.energy, -1, 1);
    case 'CAT':
      return clamp(0.65 * f.growth + 0.25 * f.risk - 0.10 * f.usd, -1, 1);
    case 'GC=F':
      // Gold: primarily anti-dollar, secondarily a risk-off haven.
      return clamp(-0.6 * f.usd - 0.3 * f.risk, -1, 1);
    case 'CL=F':
    case 'BZ=F':
    case 'HG=F':
      return clamp(0.7 * f.growth + 0.3 * f.risk, -1, 1);
    case 'ZS=F':
      return clamp(0.5 * f.growth - 0.3 * f.usd, -1, 1);
    case 'BRL=X': {
      // Long USD/BRL when dollar trends up or risk turns off; high local carry
      // supports the BRL when the regime is calm.
      const carryPull =
        params.selic != null && params.fedFunds != null && f.risk > 0
          ? clamp((params.selic - params.fedFunds) / 10, 0, 1) * 0.3
          : 0;
      return clamp(0.45 * f.usd - 0.45 * f.risk - carryPull, -1, 1);
    }
    case 'EURUSD=X':
    case 'GBPUSD=X':
      return clamp(-0.8 * f.usd, -1, 1);
    case 'USDJPY=X':
      // Yen is the classic risk-off haven: stress → USDJPY down.
      return clamp(0.5 * f.usd + 0.5 * f.risk, -1, 1);
    default:
      return 0;
  }
}

function assetWeightCap(asset: SimAsset, params: StrategyParams): number {
  return Math.min(params.maxAssetWeight, asset.maxWeight ?? params.maxAssetWeight);
}

function relativeMove(
  asset: SimAsset,
  closesBySymbol: Map<string, number[]>
): number | null {
  if (!asset.benchmarkSymbol) return null;
  const assetTrend = trendPct(closesBySymbol.get(asset.symbol) ?? [], 63);
  const benchmarkTrend = trendPct(closesBySymbol.get(asset.benchmarkSymbol) ?? [], 63);
  return assetTrend == null || benchmarkTrend == null ? null : assetTrend - benchmarkTrend;
}

function regimeFromFactors(f: MacroFactors): RegimeState {
  const riskScore = f.risk;
  const label = riskScore > 0.2 ? 'RISK-ON' : riskScore < -0.2 ? 'RISK-OFF' : 'NEUTRAL';
  // De-gross into stress, modestly extend in calm (regime-conditioned exposure).
  const grossScale = label === 'RISK-OFF' ? 0.6 : label === 'RISK-ON' ? 1.1 : 1.0;
  const detail =
    `risk ${f.risk.toFixed(2)} · growth ${f.growth.toFixed(2)} · usd ${f.usd.toFixed(2)}` +
    (f.vixLevel != null ? ` · VIX ${f.vixLevel.toFixed(1)}` : '');
  return {
    riskScore,
    label,
    grossScale,
    factors: {
      risk: f.risk,
      growth: f.growth,
      usd: f.usd,
      rates: f.rates,
      energy: f.energy,
    },
    detail,
  };
}

// ─── Covariance scaling ─────────────────────────────────────────────────────────

/** Ex-ante annualized portfolio vol from weights and trailing-90d covariance. */
function portfolioVol(
  weights: Map<string, number>,
  returnsBySymbol: Map<string, number[]>
): number {
  const symbols = Array.from(weights.keys()).filter((s) => (returnsBySymbol.get(s)?.length ?? 0) >= 40);
  if (symbols.length === 0) return 0;
  const len = Math.min(90, ...symbols.map((s) => returnsBySymbol.get(s)!.length));
  const series = symbols.map((s) => returnsBySymbol.get(s)!.slice(-len));
  const means = series.map((r) => r.reduce((a, b) => a + b, 0) / r.length);

  let variance = 0;
  for (let i = 0; i < symbols.length; i += 1) {
    for (let j = 0; j < symbols.length; j += 1) {
      let cov = 0;
      for (let t = 0; t < len; t += 1) cov += (series[i][t] - means[i]) * (series[j][t] - means[j]);
      cov /= len - 1;
      variance += weights.get(symbols[i])! * weights.get(symbols[j])! * cov;
    }
  }
  return Math.sqrt(Math.max(variance, 0) * TRADING_DAYS);
}

// ─── Main entry ─────────────────────────────────────────────────────────────────

/**
 * Compute per-asset, per-sleeve target weights from close histories.
 * `closesBySymbol` must contain history up to (and including) the decision day,
 * including the CONTEXT_SYMBOLS (^VIX, DX-Y.NYB, ^TNX) for the macro sleeve.
 */
export function computeSignals(
  closesBySymbol: Map<string, number[]>,
  params: StrategyParams,
  universeOrOptions: SimAsset[] | ComputeSignalOptions = SIM_UNIVERSE,
  trailingOptions: ComputeSignalOptions = {}
): SignalSet {
  const universe = Array.isArray(universeOrOptions) ? universeOrOptions : SIM_UNIVERSE;
  const options = Array.isArray(universeOrOptions) ? trailingOptions : universeOrOptions;
  // Contemporary rates are valid live, but must not enter historical carry or
  // the BRL macro carry pull when the caller requests a clean backtest.
  const effectiveParams = options.disableCarry
    ? { ...params, selic: null, fedFunds: null }
    : params;
  const factors = computeMacroFactors(closesBySymbol);
  const regime = regimeFromFactors(factors);

  const activeAssets = universe.filter((a) => (closesBySymbol.get(a.symbol)?.length ?? 0) >= 64);
  if (activeAssets.length === 0) return { signals: [], regime, exAnteVol: 0, expressions: [] };

  const returnsBySymbol = new Map<string, number[]>();
  const signals: AssetSignal[] = activeAssets.map((asset) => {
    const closes = closesBySymbol.get(asset.symbol)!;
    const returns = dailyReturns(closes);
    returnsBySymbol.set(asset.symbol, returns);
    const vol = Math.max(ewmaVol(returns), 0.02); // floor 2% to avoid blow-ups
    const volScale = params.portfolioVolTarget / vol;

    const relative = relativeMove(asset, closesBySymbol);
    const idiosyncraticScale =
      relative == null ? 1 :
      Math.abs(relative) >= 0.20 ? 0.5 :
      Math.abs(relative) >= 0.12 ? 0.75 :
      1;
    // News is normally a 35% nudge inside the macro sleeve. When the asset is
    // under an active pre-market trigger, promote it to a primary driver so a
    // fresh, high-impact headline can lead (not just tilt) the position.
    const newsTriggered = options.newsTriggeredSymbols?.has(asset.symbol) ?? false;
    const newsCoeff = newsTriggered ? 0.9 : 0.35;
    const raw: Record<Sleeve, number> = {
      tsmom: asset.thematicEquity ? 0 : tsmomSignal(closes),
      carry: carrySignal(asset, effectiveParams),
      macro: clamp(
        macroSignal(asset, factors, effectiveParams) +
          newsCoeff * newsSignal(asset, options.newsIntelligence),
        -1,
        1
      ) * idiosyncraticScale,
    };

    const weights: Record<Sleeve, number> = { tsmom: 0, carry: 0, macro: 0 };
    for (const sleeve of SLEEVES) {
      // Equal risk budget per sleeve, divided across the universe.
      weights[sleeve] = (raw[sleeve] * volScale) / activeAssets.length;
    }

    const cap = assetWeightCap(asset, params);
    const totalWeight = clamp(
      weights.tsmom + weights.carry + weights.macro,
      -cap,
      cap
    );

    const rationale: string[] = [];
    if (raw.tsmom !== 0) rationale.push(`${raw.tsmom > 0 ? 'Positive' : 'Negative'} 12m/3m price trend`);
    if (raw.carry !== 0 && params.selic != null && params.fedFunds != null) {
      rationale.push(`Rate differential: SELIC−Fed Funds ${(params.selic - params.fedFunds).toFixed(1)}pp favors ${raw.carry < 0 ? 'BRL' : 'USD'}`);
    }
    if (options.disableCarry && asset.carryQuote === 'brl') {
      rationale.push('Carry disabled: policy-rate inputs are not point-in-time');
    }
    if (Math.abs(raw.macro) >= 0.15) {
      rationale.push(`Economic context supports ${raw.macro > 0 ? 'long' : 'short'}: ${describeMacroDrivers(asset, factors)}`);
    }
    if (asset.thematicEquity) {
      rationale.push(`Macro equity theme: ${asset.theme}; single-stock cap 5%`);
      if (relative != null) {
        rationale.push(
          `3m move vs ${asset.benchmarkSymbol}: ${(relative * 100).toFixed(1)}pp` +
          (idiosyncraticScale < 1 ? `; target reduced to ${Math.round(idiosyncraticScale * 100)}%` : '')
        );
      }
    }
    const liveNews = newsSignal(asset, options.newsIntelligence);
    if (newsTriggered && Math.abs(liveNews) >= 0.05) {
      rationale.unshift(
        `PRE-MARKET NEWS TRIGGER — headline flow ${liveNews > 0 ? 'leads long' : 'leads short'} (${liveNews.toFixed(2)}); news weight promoted to primary driver`
      );
    } else if (Math.abs(liveNews) >= 0.1) {
      rationale.push(
        `Recent news ${liveNews > 0 ? 'supports long' : 'supports short'} (${liveNews.toFixed(2)})`
      );
    }
    if (rationale.length === 0) rationale.push('No active signal — flat');

    return {
      symbol: asset.symbol,
      label: asset.label,
      exAnteVol: vol,
      signals: raw,
      weights,
      totalWeight,
      rationale,
      thematicEquity: asset.thematicEquity,
      theme: asset.theme,
      benchmarkSymbol: asset.benchmarkSymbol,
    };
  });

  // Selected relative-value expressions add hedge legs to the existing alpha
  // signals. The helper only sees histories available through decision time.
  const hedgeResult = buildHedgedExpressions(closesBySymbol, signals);
  const signalBySymbol = new Map(signals.map((signal) => [signal.symbol, signal]));
  for (const [symbol, adjustments] of Array.from(hedgeResult.sleeveAdjustments.entries())) {
    const signal = signalBySymbol.get(symbol);
    if (!signal) continue;
    for (const sleeve of SLEEVES) signal.weights[sleeve] += adjustments[sleeve];
    signal.totalWeight = clamp(
      signal.weights.tsmom + signal.weights.carry + signal.weights.macro,
      -assetWeightCap(
        universe.find((asset) => asset.symbol === signal.symbol) ?? {
          symbol: signal.symbol, label: signal.label, assetClass: 'equity', costBps: 0,
        },
        params
      ),
      assetWeightCap(
        universe.find((asset) => asset.symbol === signal.symbol) ?? {
          symbol: signal.symbol, label: signal.label, assetClass: 'equity', costBps: 0,
        },
        params
      )
    );
  }
  for (const [symbol, reasons] of Array.from(hedgeResult.rationaleBySymbol.entries())) {
    const signal = signalBySymbol.get(symbol);
    if (!signal) continue;
    if (signal.rationale.length === 1 && signal.rationale[0].includes('flat')) signal.rationale = [];
    signal.rationale.push(...reasons);
  }

  // Regime-conditioned gross exposure.
  for (const s of signals) {
    s.totalWeight *= regime.grossScale;
    for (const sleeve of SLEEVES) s.weights[sleeve] *= regime.grossScale;
  }

  // Covariance-based portfolio vol targeting: scale the whole book so ex-ante
  // vol hits the target (bounded by the gross leverage cap).
  const weightMap = new Map(signals.map((s) => [s.symbol, s.totalWeight]));
  const exAnte = portfolioVol(weightMap, returnsBySymbol);
  let scale = 1;
  if (exAnte > 0.001) {
    scale = clamp(params.portfolioVolTarget / exAnte, 0.25, 4);
  }
  const gross = signals.reduce((a, s) => a + Math.abs(s.totalWeight * scale), 0);
  if (gross > params.maxGrossLeverage) scale *= params.maxGrossLeverage / gross;

  for (const s of signals) {
    const asset = universe.find((candidate) => candidate.symbol === s.symbol);
    const cap = asset ? assetWeightCap(asset, params) : params.maxAssetWeight;
    s.totalWeight = clamp(s.totalWeight * scale, -cap, cap);
    for (const sleeve of SLEEVES) s.weights[sleeve] *= scale;
  }

  // A theme may have several stocks expressing the same macro thesis. Keep
  // their combined gross below the theme cap to avoid disguised concentration.
  const thematicByTheme = new Map<EquityTheme, AssetSignal[]>();
  for (const signal of signals) {
    if (!signal.thematicEquity || !signal.theme) continue;
    const group = thematicByTheme.get(signal.theme) ?? [];
    group.push(signal);
    thematicByTheme.set(signal.theme, group);
  }
  for (const [theme, group] of thematicByTheme) {
    const themeGross = group.reduce((sum, signal) => sum + Math.abs(signal.totalWeight), 0);
    if (themeGross <= THEMATIC_EQUITY_THEME_CAP) continue;
    const themeScale = THEMATIC_EQUITY_THEME_CAP / themeGross;
    for (const signal of group) {
      signal.totalWeight *= themeScale;
      for (const sleeve of SLEEVES) signal.weights[sleeve] *= themeScale;
      signal.rationale.push(`Theme ${theme} capped at ${(THEMATIC_EQUITY_THEME_CAP * 100).toFixed(0)}% gross`);
    }
  }

  const expressionScale = regime.grossScale * scale;
  for (const expression of hedgeResult.expressions) {
    expression.lifecycle =
      expression.hedge.status === 'applied' ? 'ACTIVE' :
      expression.hedge.status === 'insufficient-data' ? 'BLOCKED' :
      'INACTIVE';
    for (const leg of expression.legs) {
      leg.targetWeight = clamp(
        leg.weight * expressionScale,
        -params.maxAssetWeight,
        params.maxAssetWeight
      );
    }
  }

  // The USD-basket hedge can oppose an asset's independent signal without
  // determining its final net direction. Make that attribution explicit so a
  // net-long EUR/USD is never described simply as a hedge leg.
  for (const s of signals) {
    const hedgeRationaleIndex = s.rationale.findIndex(
      (reason) => reason === 'USD-basket hedge for the BRL rate-differential trade'
    );
    if (hedgeRationaleIndex < 0) continue;

    const hedgeWeight = s.weights.carry;
    const independentWeight = s.weights.tsmom + s.weights.macro;
    const hedgeDirection = hedgeWeight >= 0 ? 'long' : 'short';
    const netDirection =
      s.totalWeight > 0.005 ? 'net long' :
      s.totalWeight < -0.005 ? 'net short' :
      'net flat';

    s.rationale[hedgeRationaleIndex] =
      `USD-basket hedge contributes ${hedgeDirection} ${(Math.abs(hedgeWeight) * 100).toFixed(1)}%; ` +
      `independent drivers contribute ${independentWeight >= 0 ? 'long' : 'short'} ` +
      `${(Math.abs(independentWeight) * 100).toFixed(1)}%, leaving ${netDirection}`;
  }

  const finalWeights = new Map(signals.map((s) => [s.symbol, s.totalWeight]));
  const exAnteVol = portfolioVol(finalWeights, returnsBySymbol);

  return { signals, regime, exAnteVol, expressions: hedgeResult.expressions };
}

function describeMacroDrivers(asset: SimAsset, f: MacroFactors): string {
  const parts: string[] = [];
  if (Math.abs(f.risk) >= 0.2) parts.push(f.risk > 0 ? 'risk-on tape' : 'risk-off tape');
  if (Math.abs(f.growth) >= 0.2 && asset.assetClass !== 'fx') {
    parts.push(`${f.growth > 0 ? 'improving' : 'fading'} growth (Cu/Au)`);
  }
  if (Math.abs(f.usd) >= 0.2) {
    parts.push(`${f.usd > 0 ? 'strong' : 'weak'} dollar trend`);
  }
  if (Math.abs(f.rates) >= 0.2 && ['XLF', 'XLK'].includes(asset.symbol)) {
    parts.push(`${f.rates > 0 ? 'rising' : 'falling'} US 10Y trend`);
  }
  if (Math.abs(f.energy) >= 0.2 && ['EWZ', 'XLE'].includes(asset.symbol)) {
    parts.push(`${f.energy > 0 ? 'firm' : 'soft'} oil trend`);
  }
  return parts.length ? parts.join(', ') : 'mixed macro reads';
}

export function annualVolFromDaily(returns: number[]): number {
  return stdev(returns) * Math.sqrt(TRADING_DAYS);
}
