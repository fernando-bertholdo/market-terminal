// ─── Simulator Engine ─────────────────────────────────────────────────────────
// Two modes:
//  1. Backtest — walk-forward daily simulation over the fetched history:
//     signals computed only from data up to t, applied to the t→t+1 return,
//     minus transaction costs on turnover. Produces equity curves and stats
//     per sleeve and combined.
//  2. Paper portfolio — persistent simulated book (data/sim-state.json):
//     marked to market on every API call, rebalanced to current target
//     weights at most once per day with simulated fills at the latest close.

import {
  equityCurve, hitRate, maxDrawdown, sharpe, stdev, TRADING_DAYS,
} from '@/lib/analytics';
import {
  computeSignals, SIM_UNIVERSE, SLEEVES,
  type AssetSignal, type Sleeve, type StrategyParams, type TradeExpression,
} from './strategies';
import {
  createPositionBarrier,
  evaluateBarrier,
  isReentryBlocked,
  type BarrierExitReason,
  type PositionBarrier,
  type ReentryBlock,
} from './barriers';
import type { HistorySeries } from '@/lib/fetchers/yahooHistory';

const WARMUP_DAYS = 260; // ~12m lookback before the backtest starts trading

// ─── Backtest ──────────────────────────────────────────────────────────────────

export interface SleeveStats {
  totalReturn: number;
  annualVol: number;
  sharpe: number;
  maxDrawdown: number;
  hitRate: number;
}

export interface BacktestResult {
  dates: string[];
  equity: number[];               // combined, starts at 1.0
  sleeveEquity: Record<Sleeve, number[]>;
  combined: SleeveStats;
  sleeves: Record<Sleeve, SleeveStats>;
  latestSignals: AssetSignal[];
  costDrag: number;               // total return lost to transaction costs
  /** daily risk-regime score (-1 risk-off … +1 risk-on), aligned with dates */
  regimeScores: number[];
}

interface AlignedData {
  dates: string[];
  closes: Map<string, number[]>; // aligned to dates, forward-filled
}

/** Align all series onto the union of trading dates, forward-filling gaps. */
function alignSeries(histories: Map<string, HistorySeries>): AlignedData {
  const dateSet = new Set<string>();
  for (const series of Array.from(histories.values())) {
    for (const bar of series.bars) dateSet.add(bar.date);
  }
  const dates = Array.from(dateSet).sort();

  const closes = new Map<string, number[]>();
  for (const [symbol, series] of Array.from(histories.entries())) {
    const bySymbol = new Map(series.bars.map((b) => [b.date, b.close]));
    const aligned: number[] = [];
    let last: number | null = null;
    for (const date of dates) {
      const v = bySymbol.get(date);
      if (v != null) last = v;
      aligned.push(last ?? NaN);
    }
    closes.set(symbol, aligned);
  }
  return { dates, closes };
}

function statsFor(returns: number[], equity: number[]): SleeveStats {
  return {
    totalReturn: equity[equity.length - 1] - 1,
    annualVol: stdev(returns) * Math.sqrt(TRADING_DAYS),
    sharpe: sharpe(returns),
    maxDrawdown: maxDrawdown(equity),
    hitRate: hitRate(returns),
  };
}

export function runBacktest(
  histories: Map<string, HistorySeries>,
  params: StrategyParams
): BacktestResult | null {
  const { dates, closes } = alignSeries(histories);
  if (dates.length < WARMUP_DAYS + 20) return null;

  const costBps = new Map(SIM_UNIVERSE.map((a) => [a.symbol, a.costBps]));

  const combinedReturns: number[] = [];
  const sleeveReturns: Record<Sleeve, number[]> = { tsmom: [], carry: [], macro: [] };
  const outDates: string[] = [];
  const regimeScores: number[] = [];
  let prevWeights = new Map<string, number>();
  let totalCost = 0;
  let latestSignals: AssetSignal[] = [];

  for (let t = WARMUP_DAYS; t < dates.length - 1; t += 1) {
    // Signals use data up to and including day t.
    const window = new Map<string, number[]>();
    for (const [symbol, series] of Array.from(closes.entries())) {
      const slice = series.slice(0, t + 1).filter((v) => !isNaN(v));
      if (slice.length >= 64) window.set(symbol, slice);
    }
    const signalSet = computeSignals(window, params, { disableCarry: true });
    const signals = signalSet.signals;
    latestSignals = signals;
    regimeScores.push(signalSet.regime.riskScore);

    // Apply weights to the t → t+1 return.
    let dayReturn = 0;
    const dayBySleeve: Record<Sleeve, number> = { tsmom: 0, carry: 0, macro: 0 };
    let dayCost = 0;
    const newWeights = new Map<string, number>();

    for (const signal of signals) {
      const series = closes.get(signal.symbol)!;
      const p0 = series[t];
      const p1 = series[t + 1];
      if (isNaN(p0) || isNaN(p1) || p0 === 0) continue;
      const assetReturn = p1 / p0 - 1;

      dayReturn += signal.totalWeight * assetReturn;
      for (const sleeve of SLEEVES) {
        dayBySleeve[sleeve] += signal.weights[sleeve] * assetReturn;
      }

      const turnover = Math.abs(signal.totalWeight - (prevWeights.get(signal.symbol) ?? 0));
      dayCost += turnover * ((costBps.get(signal.symbol) ?? 5) / 10_000);
      newWeights.set(signal.symbol, signal.totalWeight);
    }

    totalCost += dayCost;
    combinedReturns.push(dayReturn - dayCost);
    for (const sleeve of SLEEVES) sleeveReturns[sleeve].push(dayBySleeve[sleeve]);
    outDates.push(dates[t + 1]);
    prevWeights = newWeights;
  }

  const equity = equityCurve(combinedReturns);
  const sleeveEquity = {
    tsmom: equityCurve(sleeveReturns.tsmom),
    carry: equityCurve(sleeveReturns.carry),
    macro: equityCurve(sleeveReturns.macro),
  };

  return {
    dates: outDates,
    equity,
    sleeveEquity,
    combined: statsFor(combinedReturns, equity),
    sleeves: {
      tsmom: statsFor(sleeveReturns.tsmom, sleeveEquity.tsmom),
      carry: statsFor(sleeveReturns.carry, sleeveEquity.carry),
      macro: statsFor(sleeveReturns.macro, sleeveEquity.macro),
    },
    latestSignals,
    costDrag: totalCost,
    regimeScores,
  };
}

// ─── Paper portfolio ────────────────────────────────────────────────────────────

export interface SimPosition {
  symbol: string;
  label: string;
  units: number;       // signed; negative = short
  avgPrice: number;
  lastPrice: number;
  notional: number;    // units * lastPrice (signed)
  unrealizedPnl: number;
  weight: number;      // notional / equity
  barrier: {
    openedAt: string;
    returnSinceEntryPct: number;
    holdingDays: number;
    stopPrice: number;
    trailingStopPrice: number;
    trailingArmed: boolean;
  } | null;
}

export interface SimTrade {
  date: string;        // ISO timestamp
  symbol: string;
  side: 'BUY' | 'SELL';
  units: number;
  price: number;
  notional: number;
  costUsd: number;
  reason?: 'REBALANCE' | BarrierExitReason;
}

export interface BarrierExit {
  date: string;
  symbol: string;
  reason: BarrierExitReason;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

export interface SimState {
  createdAt: string;
  initialCapital: number;
  cash: number;
  positions: Record<string, { units: number; avgPrice: number }>;
  trades: SimTrade[];
  equityHistory: Array<{ date: string; equity: number }>;
  /** rolling intraday marks (ISO timestamps) so the live P&L can be watched */
  intradayEquity: Array<{ time: string; equity: number }>;
  lastRebalanceDate: string | null; // "YYYY-MM-DD"
  positionBarriers: Record<string, PositionBarrier>;
  reentryBlocks: Record<string, ReentryBlock>;
  barrierExits: BarrierExit[];
  expressionLifecycles: Record<string, SimExpressionLifecycle>;
  /** audit log of pre-market news triggers that moved the book */
  newsTriggers: NewsTriggerRecord[];
  /** headline ids already acted on, so a story fires at most once */
  seenNewsTriggerIds: string[];
  /** persisted proof that the cloud executor is mutating the book */
  automation: SimAutomationAudit;
}

export interface SimAutomationAudit {
  lastCronTickAt: string | null;
  lastManualMutationAt: string | null;
  cronTickCount: number;
  lastCronGapSeconds: number | null;
  recentCronTicks: string[];
}

export interface SimExpressionLifecycle {
  id: string;
  label: string;
  status: 'ACTIVE' | 'BLOCKED' | 'CLOSED';
  openedAt: string;
  updatedAt: string;
  alphaSymbol: string;
  legs: Array<{ symbol: string; role: 'alpha' | 'hedge'; targetWeight: number }>;
}

/** A persisted record of a pre-market news trigger that moved the book. */
export interface NewsTriggerRecord {
  itemId: string;
  firedAt: string;
  title: string;
  url: string;
  source: string;
  impact: number;
  direction: number;
  /** universe symbols the headline touched */
  symbols: string[];
  /** of those, the ones that filled immediately (session open + fresh quote) */
  executedSymbols: string[];
  /** of those, the ones queued to fill at the next open */
  pendingSymbols: string[];
}

const INITIAL_CAPITAL = 1_000_000;
const MIN_TRADE_NOTIONAL = 1_000; // skip dust rebalance trades

export function newSimState(): SimState {
  return {
    createdAt: new Date().toISOString(),
    initialCapital: INITIAL_CAPITAL,
    cash: INITIAL_CAPITAL,
    positions: {},
    trades: [],
    equityHistory: [],
    intradayEquity: [],
    lastRebalanceDate: null,
    positionBarriers: {},
    reentryBlocks: {},
    barrierExits: [],
    expressionLifecycles: {},
    newsTriggers: [],
    seenNewsTriggerIds: [],
    automation: {
      lastCronTickAt: null,
      lastManualMutationAt: null,
      cronTickCount: 0,
      lastCronGapSeconds: null,
      recentCronTicks: [],
    },
  };
}

export function migrateSimState(state: SimState): SimState {
  state.intradayEquity ??= [];
  state.positionBarriers ??= {};
  state.reentryBlocks ??= {};
  state.barrierExits ??= [];
  state.expressionLifecycles ??= {};
  state.newsTriggers ??= [];
  state.seenNewsTriggerIds ??= [];
  state.automation ??= {
    lastCronTickAt: null,
    lastManualMutationAt: null,
    cronTickCount: 0,
    lastCronGapSeconds: null,
    recentCronTicks: [],
  };
  state.automation.recentCronTicks ??= [];
  return state;
}

export function recordSimulatorMutation(
  state: SimState,
  source: 'cron' | 'manual',
  now: Date = new Date()
): SimState {
  const nowIso = now.toISOString();
  if (source === 'cron') {
    const previous = state.automation.lastCronTickAt;
    state.automation.lastCronGapSeconds = previous
      ? Math.max(0, Math.round((now.getTime() - new Date(previous).getTime()) / 1000))
      : null;
    state.automation.lastCronTickAt = nowIso;
    state.automation.cronTickCount += 1;
    state.automation.recentCronTicks.push(nowIso);
    state.automation.recentCronTicks = state.automation.recentCronTicks.slice(-180);
  } else {
    state.automation.lastManualMutationAt = nowIso;
  }
  return state;
}

function saoPauloDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function syncExpressionLifecycles(
  state: SimState,
  expressions: TradeExpression[],
  nowIso: string
): Set<string> {
  const protectedSymbols = new Set<string>();
  const seen = new Set<string>();

  for (const expression of expressions) {
    seen.add(expression.id);
    if (expression.lifecycle !== 'ACTIVE') {
      const existing = state.expressionLifecycles[expression.id];
      if (existing?.status === 'ACTIVE') {
        existing.status = expression.lifecycle === 'BLOCKED' ? 'BLOCKED' : 'CLOSED';
        existing.updatedAt = nowIso;
      }
      continue;
    }

    const legs = expression.legs
      .filter((leg) => Math.abs(leg.targetWeight ?? 0) >= 0.005)
      .map((leg) => ({
        symbol: leg.symbol,
        role: leg.role,
        targetWeight: leg.targetWeight ?? 0,
      }));
    if (legs.length === 0) continue;
    for (const leg of legs) protectedSymbols.add(leg.symbol);

    const existing = state.expressionLifecycles[expression.id];
    state.expressionLifecycles[expression.id] = {
      id: expression.id,
      label: expression.label,
      status: 'ACTIVE',
      openedAt: existing?.openedAt ?? nowIso,
      updatedAt: nowIso,
      alphaSymbol: expression.alphaSymbol,
      legs,
    };
  }

  for (const lifecycle of Object.values(state.expressionLifecycles)) {
    if (lifecycle.status === 'ACTIVE' && !seen.has(lifecycle.id)) {
      lifecycle.status = 'CLOSED';
      lifecycle.updatedAt = nowIso;
    }
  }
  return protectedSymbols;
}

function markEquity(state: SimState, prices: Map<string, number>): number {
  let equity = state.cash;
  for (const [symbol, pos] of Object.entries(state.positions)) {
    const price = prices.get(symbol);
    if (price != null) equity += pos.units * price;
  }
  return equity;
}

/**
 * Mark the book to market with live prices and trade toward targets:
 * - Daily anchor: once per day the book fully rebalances to target weights.
 * - Intraday: tolerance-band rebalancing — an asset only trades when its
 *   actual weight drifts more than `driftBandPct` from target (institutional
 *   band rebalancing: live decisions without day-trading churn).
 */
export function stepPaperPortfolio(
  state: SimState,
  signals: AssetSignal[],
  prices: Map<string, number>,
  options: {
    forceRebalance?: boolean;
    driftBandPct?: number;
    expressions?: TradeExpression[];
    executableSymbols?: Set<string>;
  } = {}
): SimState {
  const today = saoPauloDate();
  const nowIso = new Date().toISOString();
  const costBps = new Map(SIM_UNIVERSE.map((a) => [a.symbol, a.costBps]));
  const driftBand = options.driftBandPct ?? 0.02; // 2% of equity
  const signalBySymbol = new Map(signals.map((signal) => [signal.symbol, signal]));
  const protectedSymbols = syncExpressionLifecycles(
    state,
    options.expressions ?? [],
    nowIso
  );

  let equity = markEquity(state, prices);

  // Migrate existing positions without surprising exits from old entry prices.
  for (const [symbol, position] of Object.entries(state.positions)) {
    const price = prices.get(symbol);
    const signal = signalBySymbol.get(symbol);
    if (!state.positionBarriers[symbol] && price != null && price > 0) {
      state.positionBarriers[symbol] = createPositionBarrier(
        position.units >= 0 ? 1 : -1,
        price,
        signal?.exAnteVol ?? 0.15,
        nowIso
      );
    }
  }

  // Risk exits run before target rebalancing and can override the live target.
  for (const [symbol, position] of Object.entries(state.positions)) {
    const price = prices.get(symbol);
    const barrier = state.positionBarriers[symbol];
    if (price == null || price <= 0 || !barrier) continue;
    if (options.executableSymbols && !options.executableSymbols.has(symbol)) continue;
    if (protectedSymbols.has(symbol)) continue;

    const evaluation = evaluateBarrier(barrier, price, nowIso);
    barrier.bestPrice = evaluation.bestPrice;
    if (!evaluation.reason) continue;

    const notional = position.units * price;
    const cost = Math.abs(notional) * ((costBps.get(symbol) ?? 5) / 10_000);
    state.cash += notional - cost;
    state.trades.push({
      date: nowIso,
      symbol,
      side: position.units > 0 ? 'SELL' : 'BUY',
      units: Math.abs(position.units),
      price,
      notional: Math.abs(notional),
      costUsd: cost,
      reason: evaluation.reason,
    });
    state.barrierExits.push({
      date: nowIso,
      symbol,
      reason: evaluation.reason,
      direction: position.units > 0 ? 'LONG' : 'SHORT',
      entryPrice: barrier.entryPrice,
      exitPrice: price,
      returnPct: evaluation.returnSinceEntryPct,
    });
    state.reentryBlocks[symbol] = {
      direction: barrier.direction,
      targetWeightAtExit: signalBySymbol.get(symbol)?.totalWeight ?? 0,
      exitedAt: nowIso,
      reason: evaluation.reason,
    };
    delete state.positions[symbol];
    delete state.positionBarriers[symbol];
  }
  state.barrierExits = state.barrierExits.slice(-100);
  equity = markEquity(state, prices);

  const dailyAnchor = options.forceRebalance || state.lastRebalanceDate !== today;
  if (signals.length > 0) {
    for (const signal of signals) {
      const price = prices.get(signal.symbol);
      if (price == null || price <= 0) continue;
      if (options.executableSymbols && !options.executableSymbols.has(signal.symbol)) continue;

      const block = state.reentryBlocks[signal.symbol];
      if (block && !isReentryBlocked(block, signal.totalWeight, nowIso)) {
        delete state.reentryBlocks[signal.symbol];
      }
      if (isReentryBlocked(state.reentryBlocks[signal.symbol], signal.totalWeight, nowIso)) {
        continue;
      }

      const current = state.positions[signal.symbol] ?? { units: 0, avgPrice: price };
      const targetNotional = signal.totalWeight * equity;
      const deltaNotional = targetNotional - current.units * price;
      if (Math.abs(deltaNotional) < MIN_TRADE_NOTIONAL) continue;
      // Outside the daily anchor, only chase drift beyond the tolerance band.
      if (!dailyAnchor && equity > 0 && Math.abs(deltaNotional) / equity < driftBand) continue;

      const deltaUnits = deltaNotional / price;
      const cost = Math.abs(deltaNotional) * ((costBps.get(signal.symbol) ?? 5) / 10_000);

      // Cash accounting: buying spends cash, selling/shorting raises it.
      state.cash -= deltaNotional + cost;

      const newUnits = current.units + deltaUnits;
      const sameDirection = Math.sign(newUnits) === Math.sign(current.units) && current.units !== 0;
      const increasing = Math.abs(newUnits) > Math.abs(current.units);
      const avgPrice = sameDirection && increasing
        ? (Math.abs(current.units) * current.avgPrice + Math.abs(deltaUnits) * price) / Math.abs(newUnits)
        : sameDirection ? current.avgPrice : price;

      if (Math.abs(newUnits * price) < MIN_TRADE_NOTIONAL / 10) {
        delete state.positions[signal.symbol];
        delete state.positionBarriers[signal.symbol];
      } else {
        state.positions[signal.symbol] = { units: newUnits, avgPrice };
        const newDirection = Math.sign(newUnits) as 1 | -1;
        const existingBarrier = state.positionBarriers[signal.symbol];
        if (!existingBarrier || existingBarrier.direction !== newDirection) {
          state.positionBarriers[signal.symbol] = createPositionBarrier(
            newDirection,
            avgPrice,
            signal.exAnteVol,
            nowIso
          );
        } else if (increasing) {
          existingBarrier.entryPrice = avgPrice;
          existingBarrier.bestPrice =
            newDirection > 0
              ? Math.max(existingBarrier.bestPrice, price)
              : Math.min(existingBarrier.bestPrice, price);
        }
      }

      state.trades.push({
        date: nowIso,
        symbol: signal.symbol,
        side: deltaUnits > 0 ? 'BUY' : 'SELL',
        units: Math.abs(deltaUnits),
        price,
        notional: Math.abs(deltaNotional),
        costUsd: cost,
        reason: 'REBALANCE',
      });
    }
    state.lastRebalanceDate = today;
    state.trades = state.trades.slice(-200);
    equity = markEquity(state, prices);
  }

  const lastPoint = state.equityHistory[state.equityHistory.length - 1];
  if (lastPoint?.date === today) {
    lastPoint.equity = equity;
  } else {
    state.equityHistory.push({ date: today, equity });
  }
  state.equityHistory = state.equityHistory.slice(-500);

  // Intraday tape: one mark per minute at most, rolling window.
  const lastMark = state.intradayEquity[state.intradayEquity.length - 1];
  if (!lastMark || Date.now() - new Date(lastMark.time).getTime() >= 60_000) {
    state.intradayEquity.push({ time: nowIso, equity });
    state.intradayEquity = state.intradayEquity.slice(-400);
  } else {
    lastMark.equity = equity;
  }

  return state;
}

export function describePositions(
  state: SimState,
  signals: AssetSignal[],
  prices: Map<string, number>
): { positions: SimPosition[]; equity: number } {
  const labels = new Map(SIM_UNIVERSE.map((a) => [a.symbol, a.label]));
  const equity = markEquity(state, prices);

  const positions: SimPosition[] = Object.entries(state.positions).map(([symbol, pos]) => {
    const lastPrice = prices.get(symbol) ?? pos.avgPrice;
    const notional = pos.units * lastPrice;
    const positionBarrier = state.positionBarriers[symbol];
    const barrier = positionBarrier
      ? evaluateBarrier(positionBarrier, lastPrice, new Date().toISOString())
      : null;
    return {
      symbol,
      label: labels.get(symbol) ?? symbol,
      units: pos.units,
      avgPrice: pos.avgPrice,
      lastPrice,
      notional,
      unrealizedPnl: pos.units * (lastPrice - pos.avgPrice),
      weight: equity !== 0 ? notional / equity : 0,
      barrier: positionBarrier && barrier
        ? {
            openedAt: positionBarrier.openedAt,
            returnSinceEntryPct: barrier.returnSinceEntryPct,
            holdingDays: barrier.holdingDays,
            stopPrice: barrier.stopPrice,
            trailingStopPrice: barrier.trailingStopPrice,
            trailingArmed: barrier.trailingArmed,
          }
        : null,
    };
  });

  positions.sort((a, b) => Math.abs(b.notional) - Math.abs(a.notional));
  return { positions, equity };
}
