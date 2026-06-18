// ─── Scenario Stress Engine ─────────────────────────────────────────────────────
// Shock a driver (USD, oil, S&P, BRL, gold) and propagate the move to every
// book position through empirical betas estimated from trailing-120d daily
// returns: beta_i = corr(i, driver) × vol_i / vol_driver. Book impact is then
// Σ wᵢ × betaᵢ × shock. This is standard factor-shock stress testing — the
// correlation structure of the market decides how a macro event hits the book.

import { dailyReturns } from '@/lib/analytics';

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  driverSymbol: string;
  driverLabel: string;
  shockPct: number; // e.g. -7 = driver falls 7%
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'risk-off',
    name: 'Equity sell-off',
    description: 'S&P 500 drops 7% — classic risk-off shock',
    driverSymbol: '^GSPC',
    driverLabel: 'S&P 500',
    shockPct: -7,
  },
  {
    id: 'usd-rally',
    name: 'Dollar rally',
    description: 'DXY gains 3% — global USD squeeze',
    driverSymbol: 'DX-Y.NYB',
    driverLabel: 'DXY',
    shockPct: 3,
  },
  {
    id: 'oil-spike',
    name: 'Oil supply shock',
    description: 'WTI jumps 10% — supply disruption',
    driverSymbol: 'CL=F',
    driverLabel: 'WTI',
    shockPct: 10,
  },
  {
    id: 'brl-selloff',
    name: 'BRL sell-off',
    description: 'USD/BRL up 4% — local risk premium shock',
    driverSymbol: 'BRL=X',
    driverLabel: 'USD/BRL',
    shockPct: 4,
  },
  {
    id: 'gold-bid',
    name: 'Flight to gold',
    description: 'Gold rallies 5% — haven demand surge',
    driverSymbol: 'GC=F',
    driverLabel: 'Gold',
    shockPct: 5,
  },
];

export interface ScenarioImpact {
  symbol: string;
  label: string;
  beta: number;          // vs the driver
  shockPct: number;      // implied asset move, %
  pnlUsd: number;        // weight × shock × equity
}

export interface ScenarioResult {
  id: string;
  name: string;
  description: string;
  driverLabel: string;
  driverShockPct: number;
  bookPnlPct: number;    // % of equity
  bookPnlUsd: number;
  impacts: ScenarioImpact[]; // largest contributors first
}

const BETA_WINDOW = 120;

function corrAndVols(a: number[], b: number[]): { corr: number; volA: number; volB: number } | null {
  const n = Math.min(a.length, b.length, BETA_WINDOW);
  if (n < 40) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i += 1) {
    cov += (xa[i] - ma) * (xb[i] - mb);
    va += (xa[i] - ma) ** 2;
    vb += (xb[i] - mb) ** 2;
  }
  if (va === 0 || vb === 0) return null;
  return { corr: cov / Math.sqrt(va * vb), volA: Math.sqrt(va / (n - 1)), volB: Math.sqrt(vb / (n - 1)) };
}

/**
 * Run every scenario against the current book.
 * `weightsBySymbol` are signed portfolio weights (notional / equity).
 */
export function runScenarios(
  closesBySymbol: Map<string, number[]>,
  weightsBySymbol: Map<string, number>,
  labels: Map<string, string>,
  equity: number
): ScenarioResult[] {
  const returnsBySymbol = new Map<string, number[]>();
  for (const [symbol, closes] of Array.from(closesBySymbol.entries())) {
    returnsBySymbol.set(symbol, dailyReturns(closes.filter((v) => isFinite(v))));
  }

  const out: ScenarioResult[] = [];
  for (const scenario of SCENARIOS) {
    const driverReturns = returnsBySymbol.get(scenario.driverSymbol);
    if (!driverReturns || driverReturns.length < 40) continue;

    const impacts: ScenarioImpact[] = [];
    let bookPnlPct = 0;

    for (const [symbol, weight] of Array.from(weightsBySymbol.entries())) {
      if (Math.abs(weight) < 0.001) continue;
      let beta: number;
      if (symbol === scenario.driverSymbol) {
        beta = 1;
      } else {
        const assetReturns = returnsBySymbol.get(symbol);
        if (!assetReturns) continue;
        const stats = corrAndVols(assetReturns, driverReturns);
        if (!stats) continue;
        beta = stats.corr * (stats.volA / stats.volB);
      }
      const assetShockPct = beta * scenario.shockPct;
      const pnlPct = weight * (assetShockPct / 100);
      bookPnlPct += pnlPct;
      impacts.push({
        symbol,
        label: labels.get(symbol) ?? symbol,
        beta,
        shockPct: assetShockPct,
        pnlUsd: pnlPct * equity,
      });
    }

    impacts.sort((a, b) => Math.abs(b.pnlUsd) - Math.abs(a.pnlUsd));
    out.push({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      driverLabel: scenario.driverLabel,
      driverShockPct: scenario.shockPct,
      bookPnlPct: bookPnlPct * 100,
      bookPnlUsd: bookPnlPct * equity,
      impacts: impacts.slice(0, 5),
    });
  }
  return out;
}
