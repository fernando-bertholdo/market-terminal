import { dailyReturns } from '@/lib/analytics';
import type { AssetSignal, Sleeve } from './strategies';

const HEDGE_WINDOW = 120;
const MIN_HEDGE_OBSERVATIONS = 60;
const MAX_ABS_HEDGE_RATIO = 2;
const MIN_EXPRESSION_WEIGHT = 0.005;

export type ExpressionLegRole = 'alpha' | 'hedge';
export type HedgeKind = 'cross-asset-beta' | 'fx-beta' | 'usd-basket-beta';

export interface ExpressionLeg {
  symbol: string;
  role: ExpressionLegRole;
  /** Weight before regime and portfolio-level risk scaling. */
  weight: number;
  /** Executable target after regime and portfolio-level scaling. */
  targetWeight?: number;
  /** Leg notional per unit of the alpha leg. */
  ratioToAlpha: number;
  rationale: string;
}

export interface HedgeMetadata {
  method: 'beta=-cov/var';
  kind: HedgeKind;
  window: number;
  minObservations: number;
  observations: number;
  beta: number | null;
  cap: number;
  status: 'applied' | 'insufficient-data' | 'inactive';
  /** Rates DV01 is not available for the current futures/ETF-free universe. */
  dv01: null;
  dv01Status: 'unsupported';
}

export interface TradeExpression {
  id: string;
  label: string;
  alphaSymbol: string;
  sourceSleeves: Sleeve[];
  legs: ExpressionLeg[];
  hedge: HedgeMetadata;
  rationale: string[];
  lifecycle?: 'INACTIVE' | 'ACTIVE' | 'BLOCKED' | 'CLOSED';
}

export interface HedgeBuildResult {
  expressions: TradeExpression[];
  sleeveAdjustments: Map<string, Record<Sleeve, number>>;
  rationaleBySymbol: Map<string, string[]>;
}

interface BetaEstimate {
  ratio: number | null;
  observations: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function betaHedgeRatio(alphaReturns: number[], hedgeReturns: number[]): BetaEstimate {
  const observations = Math.min(HEDGE_WINDOW, alphaReturns.length, hedgeReturns.length);
  if (observations < MIN_HEDGE_OBSERVATIONS) return { ratio: null, observations };

  const alpha = alphaReturns.slice(-observations);
  const hedge = hedgeReturns.slice(-observations);
  const meanAlpha = alpha.reduce((sum, value) => sum + value, 0) / observations;
  const meanHedge = hedge.reduce((sum, value) => sum + value, 0) / observations;
  let covariance = 0;
  let hedgeVariance = 0;

  for (let i = 0; i < observations; i += 1) {
    const alphaDeviation = alpha[i] - meanAlpha;
    const hedgeDeviation = hedge[i] - meanHedge;
    covariance += alphaDeviation * hedgeDeviation;
    hedgeVariance += hedgeDeviation * hedgeDeviation;
  }

  if (hedgeVariance <= 1e-12) return { ratio: null, observations };
  const ratio = -covariance / hedgeVariance;
  return {
    ratio: clamp(ratio, -MAX_ABS_HEDGE_RATIO, MAX_ABS_HEDGE_RATIO),
    observations,
  };
}

function returnsFor(closesBySymbol: Map<string, number[]>, symbol: string): number[] {
  const closes = closesBySymbol.get(symbol) ?? [];
  return dailyReturns(closes).filter(Number.isFinite);
}

function usdBasketReturns(closesBySymbol: Map<string, number[]>): number[] {
  const components = [
    { symbol: 'EURUSD=X', usdDirection: -1 },
    { symbol: 'USDJPY=X', usdDirection: 1 },
    { symbol: 'GBPUSD=X', usdDirection: -1 },
  ];
  const returns = components.map((component) => returnsFor(closesBySymbol, component.symbol));
  const observations = Math.min(...returns.map((series) => series.length));
  if (!isFinite(observations) || observations === 0) return [];

  return Array.from({ length: observations }, (_, index) => {
    const offsets = returns.map((series) => series.length - observations);
    return components.reduce(
      (sum, component, componentIndex) =>
        sum + component.usdDirection * returns[componentIndex][offsets[componentIndex] + index],
      0
    ) / components.length;
  });
}

function emptySleeves(): Record<Sleeve, number> {
  return { tsmom: 0, carry: 0, macro: 0 };
}

function addAdjustment(
  adjustments: Map<string, Record<Sleeve, number>>,
  symbol: string,
  sleeve: Sleeve,
  weight: number
): void {
  const current = adjustments.get(symbol) ?? emptySleeves();
  current[sleeve] += weight;
  adjustments.set(symbol, current);
}

function addRationale(map: Map<string, string[]>, symbol: string, rationale: string): void {
  const current = map.get(symbol) ?? [];
  current.push(rationale);
  map.set(symbol, current);
}

function metadata(kind: HedgeKind, estimate: BetaEstimate, active: boolean): HedgeMetadata {
  return {
    method: 'beta=-cov/var',
    kind,
    window: HEDGE_WINDOW,
    minObservations: MIN_HEDGE_OBSERVATIONS,
    observations: estimate.observations,
    beta: estimate.ratio,
    cap: MAX_ABS_HEDGE_RATIO,
    status: !active ? 'inactive' : estimate.ratio == null ? 'insufficient-data' : 'applied',
    dv01: null,
    dv01Status: 'unsupported',
  };
}

function addSingleHedgeExpression(
  result: HedgeBuildResult,
  closesBySymbol: Map<string, number[]>,
  signalBySymbol: Map<string, AssetSignal>,
  config: {
    id: string;
    label: string;
    alphaSymbol: string;
    hedgeSymbol: string;
    kind: HedgeKind;
    sleeves: Sleeve[];
    rationale: string;
  }
): void {
  const alpha = signalBySymbol.get(config.alphaSymbol);
  const hedge = signalBySymbol.get(config.hedgeSymbol);
  if (!alpha || !hedge) return;

  const alphaWeight = config.sleeves.reduce((sum, sleeve) => sum + alpha.weights[sleeve], 0);
  const active = Math.abs(alphaWeight) >= MIN_EXPRESSION_WEIGHT;
  const estimate = betaHedgeRatio(
    returnsFor(closesBySymbol, config.alphaSymbol),
    returnsFor(closesBySymbol, config.hedgeSymbol)
  );
  const hedgeWeight = active && estimate.ratio != null ? alphaWeight * estimate.ratio : 0;

  if (hedgeWeight !== 0) {
    for (const sleeve of config.sleeves) {
      addAdjustment(result.sleeveAdjustments, config.hedgeSymbol, sleeve, alpha.weights[sleeve] * estimate.ratio!);
    }
    addRationale(result.rationaleBySymbol, config.alphaSymbol, `Alpha leg in ${config.label}`);
    addRationale(
      result.rationaleBySymbol,
      config.hedgeSymbol,
      `Hedge leg for ${config.alphaSymbol}: beta ${estimate.ratio!.toFixed(2)}`
    );
  }

  result.expressions.push({
    id: config.id,
    label: config.label,
    alphaSymbol: config.alphaSymbol,
    sourceSleeves: config.sleeves,
    legs: [
      {
        symbol: config.alphaSymbol,
        role: 'alpha',
        weight: alphaWeight,
        ratioToAlpha: 1,
        rationale: config.rationale,
      },
      {
        symbol: config.hedgeSymbol,
        role: 'hedge',
        weight: hedgeWeight,
        ratioToAlpha: estimate.ratio ?? 0,
        rationale: `Empirical beta hedge using at most ${HEDGE_WINDOW} observations available at decision time`,
      },
    ],
    hedge: metadata(config.kind, estimate, active),
    rationale: [
      config.rationale,
      estimate.ratio == null
        ? `Hedge not applied: ${estimate.observations}/${MIN_HEDGE_OBSERVATIONS} required observations`
        : `Hedge ratio ${estimate.ratio.toFixed(2)} from beta=-cov/var, capped at +/-${MAX_ABS_HEDGE_RATIO}`,
    ],
  });
}

/**
 * Build only the explicitly supported relative-value expressions. All inputs
 * are histories already truncated at the decision time by the caller.
 */
export function buildHedgedExpressions(
  closesBySymbol: Map<string, number[]>,
  signals: AssetSignal[]
): HedgeBuildResult {
  const result: HedgeBuildResult = {
    expressions: [],
    sleeveAdjustments: new Map(),
    rationaleBySymbol: new Map(),
  };
  const signalBySymbol = new Map(signals.map((signal) => [signal.symbol, signal]));

  addSingleHedgeExpression(result, closesBySymbol, signalBySymbol, {
    id: 'wti-vs-brent',
    label: 'WTI alpha vs Brent hedge',
    alphaSymbol: 'CL=F',
    hedgeSymbol: 'BZ=F',
    kind: 'cross-asset-beta',
    sleeves: ['tsmom', 'macro'],
    rationale: 'Retain the WTI signal while neutralizing common crude-oil beta with Brent',
  });

  addSingleHedgeExpression(result, closesBySymbol, signalBySymbol, {
    id: 'ibov-vs-spx',
    label: 'Ibovespa alpha vs S&P 500 hedge',
    alphaSymbol: '^BVSP',
    hedgeSymbol: '^GSPC',
    kind: 'cross-asset-beta',
    sleeves: ['tsmom', 'macro'],
    rationale: 'Retain Brazil equity alpha while reducing broad global-equity beta',
  });

  addSingleHedgeExpression(result, closesBySymbol, signalBySymbol, {
    id: 'ibov-fx-brl',
    label: 'Ibovespa BRL FX hedge',
    alphaSymbol: '^BVSP',
    hedgeSymbol: 'BRL=X',
    kind: 'fx-beta',
    sleeves: ['tsmom', 'macro'],
    rationale: 'Reduce the empirical USD/BRL component of the Ibovespa expression when estimable',
  });

  const brl = signalBySymbol.get('BRL=X');
  const carryWeight = brl?.weights.carry ?? 0;
  if (brl) {
    const estimate = betaHedgeRatio(returnsFor(closesBySymbol, 'BRL=X'), usdBasketReturns(closesBySymbol));
    const active = Math.abs(carryWeight) >= MIN_EXPRESSION_WEIGHT;
    const basketWeight = active && estimate.ratio != null ? carryWeight * estimate.ratio : 0;
    const basketLegs = [
      { symbol: 'EURUSD=X', direction: -1 },
      { symbol: 'USDJPY=X', direction: 1 },
      { symbol: 'GBPUSD=X', direction: -1 },
    ];

    if (basketWeight !== 0) {
      for (const leg of basketLegs) {
        const legWeight = basketWeight * leg.direction / basketLegs.length;
        addAdjustment(result.sleeveAdjustments, leg.symbol, 'carry', legWeight);
        addRationale(result.rationaleBySymbol, leg.symbol, `USD-basket hedge for the BRL rate-differential trade`);
      }
      addRationale(result.rationaleBySymbol, 'BRL=X', 'Alpha leg in BRL rate-differential expression');
    }

    result.expressions.push({
      id: 'brl-carry-vs-usd-basket',
      label: 'BRL rate differential vs USD basket',
      alphaSymbol: 'BRL=X',
      sourceSleeves: ['carry'],
      legs: [
        {
          symbol: 'BRL=X',
          role: 'alpha',
          weight: carryWeight,
          ratioToAlpha: 1,
          rationale: 'SELIC minus Fed Funds differential is the alpha leg',
        },
        ...basketLegs.map((leg) => ({
          symbol: leg.symbol,
          role: 'hedge' as const,
          weight: basketWeight * leg.direction / basketLegs.length,
          ratioToAlpha: (estimate.ratio ?? 0) * leg.direction / basketLegs.length,
          rationale: 'Diversified proxy for broad USD direction',
        })),
      ],
      hedge: metadata('usd-basket-beta', estimate, active),
      rationale: [
        'Hedge broad USD direction through EURUSD, USDJPY, and GBPUSD while retaining the BRL rate differential',
        estimate.ratio == null
          ? `Hedge not applied: ${estimate.observations}/${MIN_HEDGE_OBSERVATIONS} required observations`
          : `Basket hedge ratio ${estimate.ratio.toFixed(2)} from beta=-cov/var`,
      ],
    });
  }

  return result;
}
