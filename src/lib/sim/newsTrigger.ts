// ─── News-Triggered Pre-Market Decision Layer ─────────────────────────────────
// Desk-style behaviour: a fresh, high-impact, confident headline about an asset
// we can trade is treated as an explicit TRIGGER — not just a diluted nudge in
// the macro sleeve. A trigger (a) boosts the news weight for the touched
// symbols in computeSignals and (b) forces an immediate event-driven rebalance
// (subject to the usual fresh-quote + session execution gates, so cash equities
// queue and fill at the open while FX/futures react now).
//
// Detection is a pure function of the current headlines, so GET and tick agree;
// the persisted state only tracks which headline ids were already acted on, to
// avoid re-firing the same story every minute.

import type { NewsAsset, NewsFactor, NewsItem } from '@/types/market';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Map a classified NewsAsset onto the tradeable SIM_UNIVERSE symbols it moves. */
const ASSET_TO_SYMBOLS: Partial<Record<NewsAsset, string[]>> = {
  BRL: ['BRL=X'],
  OIL: ['CL=F', 'BZ=F', 'XLE', 'PBR', 'XOM'],
  GOLD: ['GC=F'],
  COPPER: ['HG=F', 'VALE', 'CAT'],
  SOY: ['ZS=F'],
  SPX: ['^GSPC', 'XLF', 'XLI', 'XLK', 'EEM', 'JPM', 'NVDA', 'MSFT'],
  IBOV: ['^BVSP', 'EWZ', 'ITUB'],
  // DXY / DI / UST are context or untraded in this universe.
};

/** Map a classified NewsFactor onto the symbols whose thesis it touches. */
const FACTOR_TO_SYMBOLS: Partial<Record<NewsFactor, string[]>> = {
  energy: ['CL=F', 'BZ=F', 'XLE', 'PBR', 'XOM', 'VST'],
  metals: ['HG=F', 'VALE'],
  technology: ['XLK', 'NVDA', 'MSFT'],
  defense: ['LMT'],
  power: ['VST'],
  credit: ['XLF', 'JPM', 'ITUB'],
  growth: ['HG=F', 'CAT', 'XLI', 'EEM', 'VALE'],
  brl: ['BRL=X', '^BVSP', 'EWZ'],
  usd: ['BRL=X', 'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'GC=F'],
};

export interface NewsTriggerEvent {
  /** stable headline id (hash of URL) — used to de-duplicate firings */
  itemId: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  /** relevance × confidence × decay — the project's standard impact score */
  impact: number;
  ageMinutes: number;
  /** tradeable universe symbols this headline touches */
  symbols: string[];
  /** net signed direction across the headline's signals, in [-1, 1] */
  direction: number;
}

export interface DetectOptions {
  /** minimum impact (relevance×confidence×decay) to count as a trigger */
  minImpact?: number;
  /** ignore headlines older than this (minutes) */
  maxAgeMinutes?: number;
}

/**
 * Pure detection: scan the current headlines and return the ones fresh and
 * impactful enough to act on, attributed to the symbols they move.
 */
export function detectNewsTriggers(
  items: NewsItem[],
  options: DetectOptions = {}
): NewsTriggerEvent[] {
  const minImpact = options.minImpact ?? 0.4;
  const maxAgeMinutes = options.maxAgeMinutes ?? 240;

  const events: NewsTriggerEvent[] = [];
  for (const item of items) {
    const classification = item.classification;
    if (!classification) continue;

    const impact =
      classification.relevance * classification.confidence * classification.decay;
    if (impact < minImpact) continue;
    if (classification.ageMinutes > maxAgeMinutes) continue;

    const symbols = new Set<string>();
    let directionSum = 0;
    let directionWeight = 0;

    for (const signal of classification.assets) {
      for (const symbol of ASSET_TO_SYMBOLS[signal.id as NewsAsset] ?? []) {
        symbols.add(symbol);
      }
      directionSum += signal.direction * signal.strength;
      directionWeight += signal.strength;
    }
    for (const signal of classification.factors) {
      for (const symbol of FACTOR_TO_SYMBOLS[signal.id as NewsFactor] ?? []) {
        symbols.add(symbol);
      }
    }
    if (symbols.size === 0) continue;

    events.push({
      itemId: item.id,
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt.toISOString(),
      impact: Number(impact.toFixed(4)),
      ageMinutes: Math.round(classification.ageMinutes),
      symbols: Array.from(symbols),
      direction: directionWeight > 0
        ? Number(clamp(directionSum / directionWeight, -1, 1).toFixed(3))
        : 0,
    });
  }

  return events.sort((a, b) => b.impact - a.impact);
}

/** The union of symbols currently under an active news trigger. */
export function triggeredSymbolSet(events: NewsTriggerEvent[]): Set<string> {
  const set = new Set<string>();
  for (const event of events) {
    for (const symbol of event.symbols) set.add(symbol);
  }
  return set;
}

/** Trigger events whose headline has not yet been acted on (by item id). */
export function unseenTriggerEvents(
  events: NewsTriggerEvent[],
  seenIds: Iterable<string>
): NewsTriggerEvent[] {
  const seen = new Set(seenIds);
  return events.filter((event) => !seen.has(event.itemId));
}
