import type { AssetSignal, SimAsset } from './strategies';

export type EarningsStatus = 'CLEAR' | 'BLOCKED' | 'UNKNOWN';

export interface EarningsRisk {
  symbol: string;
  status: EarningsStatus;
  nextDate: string | null;
  businessDaysUntil: number | null;
  source: 'NASDAQ';
  note: string;
}

const LOOKAHEAD_DAYS = 8;
const EXIT_BUSINESS_DAYS = 2;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cache: { fetchedAt: number; risks: Map<string, EarningsRisk> } | null = null;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function businessDaysBetween(start: Date, end: Date): number {
  let days = 0;
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const target = new Date(end);
  target.setUTCHours(0, 0, 0, 0);
  while (cursor < target) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

async function fetchNasdaqDate(date: string): Promise<Set<string>> {
  const response = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${date}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://www.nasdaq.com',
      referer: 'https://www.nasdaq.com/market-activity/earnings',
      'user-agent': 'Mozilla/5.0 (compatible; ATLAS-Macro-Terminal/1.0)',
    },
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Nasdaq earnings HTTP ${response.status}`);
  const payload = await response.json() as {
    data?: { rows?: Array<{ symbol?: string }> | null };
  };
  return new Set((payload.data?.rows ?? []).flatMap((row) => row.symbol ? [row.symbol] : []));
}

export async function getEarningsRisks(
  universe: SimAsset[],
  now = new Date()
): Promise<Map<string, EarningsRisk>> {
  const stocks = universe.filter((asset) => asset.thematicEquity);
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.risks;

  const dates = Array.from({ length: LOOKAHEAD_DAYS + 1 }, (_, offset) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + offset);
    return isoDate(date);
  });
  const results = await Promise.allSettled(
    dates.map(async (date) => ({ date, symbols: await fetchNasdaqDate(date) }))
  );
  const failed = results.some((result) => result.status === 'rejected');
  const eventBySymbol = new Map<string, string>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const symbol of result.value.symbols) {
      if (!eventBySymbol.has(symbol)) eventBySymbol.set(symbol, result.value.date);
    }
  }

  const risks = new Map<string, EarningsRisk>();
  for (const asset of stocks) {
    const nextDate = eventBySymbol.get(asset.symbol) ?? null;
    if (failed) {
      risks.set(asset.symbol, {
        symbol: asset.symbol,
        status: 'UNKNOWN',
        nextDate,
        businessDaysUntil: nextDate ? businessDaysBetween(now, new Date(`${nextDate}T12:00:00Z`)) : null,
        source: 'NASDAQ',
        note: 'Calendar incomplete; new exposure is blocked conservatively',
      });
      continue;
    }
    const businessDaysUntil = nextDate
      ? businessDaysBetween(now, new Date(`${nextDate}T12:00:00Z`))
      : null;
    const blocked = businessDaysUntil != null && businessDaysUntil <= EXIT_BUSINESS_DAYS;
    risks.set(asset.symbol, {
      symbol: asset.symbol,
      status: blocked ? 'BLOCKED' : 'CLEAR',
      nextDate,
      businessDaysUntil,
      source: 'NASDAQ',
      note: blocked
        ? `Earnings window: ${businessDaysUntil} business day(s) until expected report`
        : nextDate
          ? `Expected report in ${businessDaysUntil} business day(s)`
          : `No expected report in the next ${LOOKAHEAD_DAYS} calendar days`,
    });
  }

  cache = { fetchedAt: Date.now(), risks };
  return risks;
}

export function applyEarningsPolicy(
  signals: AssetSignal[],
  risks: Map<string, EarningsRisk>
): AssetSignal[] {
  return signals.map((signal) => {
    if (!signal.thematicEquity) return signal;
    const risk = risks.get(signal.symbol);
    if (!risk || risk.status === 'CLEAR') return signal;
    return {
      ...signal,
      totalWeight: 0,
      weights: { tsmom: 0, carry: 0, macro: 0 },
      rationale: [
        ...signal.rationale,
        risk.status === 'BLOCKED'
          ? `${risk.note}; position forced flat before earnings`
          : `${risk.note}; target forced flat`,
      ],
    };
  });
}
