// ─── Quant Analytics Helpers ──────────────────────────────────────────────────
// Pure statistical functions shared by the analytics panel and the simulator.
// All functions operate on arrays of daily closes or daily returns.

export const TRADING_DAYS = 252;

/** Simple daily returns from a close series. Length = closes.length - 1. */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i - 1] !== 0) out.push(closes[i] / closes[i - 1] - 1);
  }
  return out;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Exponentially-weighted volatility estimate, annualized.
 * Follows the ex-ante vol estimator in Moskowitz/Ooi/Pedersen (2012):
 * EWMA of squared returns with center-of-mass ~60 days.
 */
export function ewmaVol(returns: number[], com: number = 60): number {
  if (returns.length === 0) return 0;
  const delta = com / (1 + com);
  let variance = returns[0] ** 2;
  for (let i = 1; i < returns.length; i += 1) {
    variance = delta * variance + (1 - delta) * returns[i] ** 2;
  }
  return Math.sqrt(variance * TRADING_DAYS);
}

/** Annualized realized volatility over a trailing window. */
export function realizedVol(returns: number[], window: number = 60): number {
  const slice = returns.slice(-window);
  return stdev(slice) * Math.sqrt(TRADING_DAYS);
}

/** Total return over the last `days` observations (e.g. 21 = 1m, 252 = 12m). */
export function trailingReturn(closes: number[], days: number): number | null {
  if (closes.length <= days) return null;
  const start = closes[closes.length - 1 - days];
  if (start === 0) return null;
  return closes[closes.length - 1] / start - 1;
}

/** Z-score of the latest close vs a trailing window mean/stdev. */
export function zScore(closes: number[], window: number = 20): number | null {
  if (closes.length < window) return null;
  const slice = closes.slice(-window);
  const sd = stdev(slice);
  if (sd === 0) return null;
  return (closes[closes.length - 1] - mean(slice)) / sd;
}

/** Annualized Sharpe ratio of a daily return series (rf = 0 for excess returns). */
export function sharpe(returns: number[]): number {
  const sd = stdev(returns);
  if (sd === 0) return 0;
  return (mean(returns) / sd) * Math.sqrt(TRADING_DAYS);
}

/** Max drawdown of an equity curve (as a negative fraction, e.g. -0.12). */
export function maxDrawdown(equity: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const value of equity) {
    if (value > peak) peak = value;
    const dd = value / peak - 1;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

/** Fraction of positive days in a return series. */
export function hitRate(returns: number[]): number {
  if (returns.length === 0) return 0;
  return returns.filter((r) => r > 0).length / returns.length;
}

/** Compound a daily return series into an equity curve starting at `initial`. */
export function equityCurve(returns: number[], initial: number = 1): number[] {
  const out: number[] = [initial];
  for (const r of returns) out.push(out[out.length - 1] * (1 + r));
  return out;
}

/** Pearson correlation between two equal-length return series. */
export function correlation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const xs = a.slice(-n);
  const ys = b.slice(-n);
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}

/**
 * Align two date-keyed close series on shared dates and return daily-return
 * pairs, for correlation across assets that trade on different calendars.
 */
export function alignedReturns(
  a: Array<{ date: string; close: number }>,
  b: Array<{ date: string; close: number }>
): { a: number[]; b: number[] } {
  const bByDate = new Map(b.map((bar) => [bar.date, bar.close]));
  const pairA: number[] = [];
  const pairB: number[] = [];
  let prevA: number | null = null;
  let prevB: number | null = null;
  for (const bar of a) {
    const closeB = bByDate.get(bar.date);
    if (closeB == null) continue;
    if (prevA != null && prevB != null && prevA !== 0 && prevB !== 0) {
      pairA.push(bar.close / prevA - 1);
      pairB.push(closeB / prevB - 1);
    }
    prevA = bar.close;
    prevB = closeB;
  }
  return { a: pairA, b: pairB };
}
