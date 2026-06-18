// GET  /api/sim — live signals + paper portfolio (marked to market)
// POST /api/sim — { action: "reset" } wipes the paper book,
//                 { action: "rebalance" } forces an intraday rebalance.
//
// Historical closes used by the live model are cached in module memory for 1h;
// the paper book is persisted to data/sim-state.json across restarts.

import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooQuotes, type YahooQuoteResult } from '@/lib/fetchers/yahoo';
import { fetchYahooHistories, type HistorySeries } from '@/lib/fetchers/yahooHistory';
import { fetchBcbSeries } from '@/lib/fetchers/bcb';
import { fetchFredSeries } from '@/lib/fetchers/fred';
import { fetchNewsHeadlines } from '@/lib/fetchers/news';
import {
  computeSignals, CONTEXT_SYMBOLS, DEFAULT_PARAMS, SIM_UNIVERSE, type StrategyParams,
} from '@/lib/sim/strategies';
import { runScenarios } from '@/lib/sim/scenarios';
import {
  describePositions, recordSimulatorMutation, stepPaperPortfolio,
} from '@/lib/sim/engine';
import {
  detectNewsTriggers, triggeredSymbolSet, unseenTriggerEvents,
  type NewsTriggerEvent,
} from '@/lib/sim/newsTrigger';
import {
  loadSimState, resetSimState, saveSimState,
} from '@/lib/sim/stateStore';
import { LIVE_BARRIER_POLICY } from '@/lib/sim/barriers';
import {
  applyEarningsPolicy, getEarningsRisks,
} from '@/lib/sim/earnings';
import {
  consolidateByInstrument, isExecutionEligible,
} from '@/lib/marketData/consolidator';
import { yahooQuotesToObservations } from '@/lib/marketData/adapters';
import {
  providerConfigFromEnvironment,
  providerInstruments,
  providerResultToMarketObservations,
} from '@/lib/marketData/providerBridge';
import {
  mappingForInstrumentId,
} from '@/lib/marketData/instruments';
import { collectProviderObservations } from '@/lib/providers';

export const dynamic = 'force-dynamic';

const HISTORY_TTL_MS = 60 * 60 * 1000;

interface SimCache {
  fetchedAt: number;
  histories: Map<string, HistorySeries>;
  params: StrategyParams;
}

let cache: SimCache | null = null;

// Live quotes micro-cache: protects Yahoo from rapid polling by multiple tabs.
const LIVE_TTL_MS = 10_000;
let liveCache: { fetchedAt: number; quotes: Map<string, YahooQuoteResult> } | null = null;
let mutationQueue: Promise<void> = Promise.resolve();

async function getLiveQuotes(): Promise<Map<string, YahooQuoteResult>> {
  if (liveCache && Date.now() - liveCache.fetchedAt < LIVE_TTL_MS) return liveCache.quotes;
  const quotes = await fetchYahooQuotes([
    ...SIM_UNIVERSE.map((a) => a.symbol),
    ...CONTEXT_SYMBOLS,
  ]);
  if (quotes.size > 0) liveCache = { fetchedAt: Date.now(), quotes };
  return liveCache?.quotes ?? quotes;
}

/**
 * Daily closes with today's live print appended (or replacing today's
 * partial bar) so signals react to the live tape without double-counting.
 */
function closesWithLive(
  histories: Map<string, HistorySeries>,
  live: Map<string, YahooQuoteResult>
): Map<string, number[]> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const dates = Array.from(
    new Set(Array.from(histories.values()).flatMap((series) => series.bars.map((bar) => bar.date)))
  ).sort();
  if (!dates.includes(today)) dates.push(today);

  const out = new Map<string, number[]>();
  for (const [symbol, series] of Array.from(histories.entries())) {
    const byDate = new Map(series.bars.map((bar) => [bar.date, bar.close]));
    const livePrice = live.get(symbol)?.price;
    if (livePrice != null && livePrice > 0) {
      byDate.set(today, livePrice);
    }
    const closes: number[] = [];
    let last: number | null = null;
    for (const date of dates) {
      const close = byDate.get(date);
      if (close != null) last = close;
      if (last != null) closes.push(last);
    }
    out.set(symbol, closes);
  }
  return out;
}

async function getSimData(): Promise<SimCache | null> {
  if (cache && Date.now() - cache.fetchedAt < HISTORY_TTL_MS) return cache;

  const [histories, selicResult, ffResult] = await Promise.all([
    fetchYahooHistories([...SIM_UNIVERSE.map((a) => a.symbol), ...CONTEXT_SYMBOLS], '2y'),
    fetchBcbSeries('1178').catch(() => null),
    fetchFredSeries('FEDFUNDS').catch(() => null),
  ]);

  if (histories.size === 0) return cache; // keep stale cache if refresh failed

  const params: StrategyParams = {
    ...DEFAULT_PARAMS,
    selic: selicResult?.value ?? null,
    fedFunds: ffResult?.current ?? null,
  };

  cache = {
    fetchedAt: Date.now(),
    histories,
    params,
  };
  return cache;
}

function latestPrices(histories: Map<string, HistorySeries>): Map<string, number> {
  const prices = new Map<string, number>();
  for (const [symbol, series] of Array.from(histories.entries())) {
    const last = series.bars[series.bars.length - 1];
    if (last) prices.set(symbol, last.close);
  }
  return prices;
}

function quotePrices(
  histories: Map<string, HistorySeries>,
  quotes: Map<string, YahooQuoteResult>
): Map<string, number> {
  const prices = latestPrices(histories);
  for (const [symbol, quote] of quotes) {
    prices.set(symbol, quote.price);
  }
  return prices;
}

function freshExecutionSymbols(
  quotes: Map<string, YahooQuoteResult>
): Set<string> {
  const now = Date.now();
  return new Set(
    Array.from(quotes.entries())
      .filter(([, quote]) => {
        if (!quote.marketTime) return false;
        return now - new Date(quote.marketTime).getTime() <= 15 * 60 * 1000;
      })
      .map(([symbol]) => symbol)
      .filter((symbol) => isExecutionSessionOpen(symbol))
  );
}

function marketClock(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: value('weekday'),
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

function isExecutionSessionOpen(symbol: string, now = new Date()): boolean {
  const ny = marketClock('America/New_York', now);
  const weekday = ny.weekday;
  const fx = symbol.endsWith('=X');
  const futures = symbol.endsWith('=F');
  const brazil = symbol === '^BVSP';

  if (fx || futures) {
    if (weekday === 'Sat') return false;
    if (weekday === 'Sun') return ny.minutes >= (futures ? 18 * 60 : 17 * 60);
    if (weekday === 'Fri') return ny.minutes < 17 * 60;
    return true;
  }
  if (brazil) {
    const brt = marketClock('America/Sao_Paulo', now);
    return !['Sat', 'Sun'].includes(brt.weekday) &&
      brt.minutes >= 10 * 60 &&
      brt.minutes < 18 * 60;
  }
  return !['Sat', 'Sun'].includes(weekday) &&
    ny.minutes >= 9 * 60 + 30 &&
    ny.minutes < 16 * 60;
}

function consolidatedLiveTape(
  live: Map<string, YahooQuoteResult>,
  providerObservations: ReturnType<typeof providerResultToMarketObservations>
) {
  const observations = [
    ...yahooQuotesToObservations(live),
    ...providerObservations,
  ];
  const quotes = consolidateByInstrument(observations);
  const prices = new Map<string, number>();
  const executableSymbols = new Set<string>();
  for (const [instrumentId, quote] of quotes) {
    const yahooSymbol = mappingForInstrumentId(instrumentId)?.yahoo;
    if (!yahooSymbol || quote.value == null) continue;
    prices.set(yahooSymbol, quote.value);
    if (isExecutionEligible(quote)) executableSymbols.add(yahooSymbol);
  }
  return { observations, quotes, prices, executableSymbols };
}

async function buildResponse(
  sim: SimCache,
  options: {
    mutate?: boolean;
    forceRebalance?: boolean;
    mutationSource?: 'cron' | 'manual';
  } = {}
) {
  // Live tape: real-time quotes layered over the daily history.
  const [live, news, earningsRisks, providers] = await Promise.all([
    getLiveQuotes(),
    fetchNewsHeadlines().catch(() => null),
    getEarningsRisks(SIM_UNIVERSE),
    collectProviderObservations({
      instruments: providerInstruments(),
      config: providerConfigFromEnvironment(),
    }),
  ]);
  const consolidated = consolidatedLiveTape(
    live,
    providerResultToMarketObservations(providers)
  );
  const executableSymbols = new Set([
    ...freshExecutionSymbols(live),
    ...[...consolidated.executableSymbols].filter((symbol) => isExecutionSessionOpen(symbol)),
  ]);
  const liveForSignals = new Map(live);
  for (const [symbol, price] of consolidated.prices) {
    const original = live.get(symbol);
    liveForSignals.set(symbol, {
      symbol,
      price,
      previousClose: original?.previousClose ?? price,
      change: original?.change ?? 0,
      changePct: original?.changePct ?? 0,
      currency: original?.currency ?? 'USD',
      marketTime: original?.marketTime ?? new Date().toISOString(),
    });
  }
  // Pre-market news triggers: fresh, high-impact headlines elevate the news
  // weight on the symbols they touch (desk-style — news leads the trade).
  const triggerEvents = news
    ? detectNewsTriggers(news.items, { minImpact: 0.45, maxAgeMinutes: 180 })
    : [];
  const universeSymbols = new Set(SIM_UNIVERSE.map((asset) => asset.symbol));
  const triggeredSymbols = new Set(
    [...triggeredSymbolSet(triggerEvents)].filter((symbol) => universeSymbols.has(symbol))
  );

  const closes = closesWithLive(sim.histories, liveForSignals);
  const signalSet = computeSignals(closes, sim.params, {
    newsIntelligence: news?.intelligence ?? null,
    newsTriggeredSymbols: triggeredSymbols,
  });
  const signals = applyEarningsPolicy(signalSet.signals, earningsRisks);
  const assetsBySymbol = new Map(SIM_UNIVERSE.map((asset) => [asset.symbol, asset]));
  const liveDecisions = signals.map((signal) => ({
    ...(() => {
      const asset = assetsBySymbol.get(signal.symbol);
      const cap = Math.min(sim.params.maxAssetWeight, asset?.maxWeight ?? sim.params.maxAssetWeight);
      return {
        conviction: Math.min(1, Math.abs(signal.totalWeight) / cap),
        thematicEquity: Boolean(asset?.thematicEquity),
        theme: asset?.theme ?? null,
        benchmarkSymbol: asset?.benchmarkSymbol ?? null,
        earnings: earningsRisks.get(signal.symbol) ?? null,
      };
    })(),
    symbol: signal.symbol,
    label: signal.label,
    exAnteVol: signal.exAnteVol,
    targetWeight: signal.totalWeight,
    newsTriggered: triggeredSymbols.has(signal.symbol),
    direction:
      signal.totalWeight > 0.005 ? 'LONG' :
      signal.totalWeight < -0.005 ? 'SHORT' :
      'FLAT',
    rationale: signal.rationale,
  }));

  // Mark and fill at live prices, falling back to the last daily close.
  const prices = quotePrices(sim.histories, liveForSignals);

  const stored = await loadSimState();
  let state = stored.state;
  if (options.mutate) {
    // A new high-impact headline forces an event-driven rebalance (anchor),
    // beyond the normal once-a-day anchor and intraday drift bands.
    const firedEvents = unseenTriggerEvents(triggerEvents, state.seenNewsTriggerIds)
      .filter((event) => event.symbols.some((symbol) => universeSymbols.has(symbol)));
    const newsForcesRebalance = firedEvents.length > 0;

    state = stepPaperPortfolio(state, signals, prices, {
      forceRebalance: options.forceRebalance || newsForcesRebalance,
      expressions: signalSet.expressions,
      executableSymbols,
    });
    recordSimulatorMutation(state, options.mutationSource ?? 'manual');

    if (firedEvents.length > 0) {
      const firedAt = new Date().toISOString();
      for (const event of firedEvents) {
        const symbols = event.symbols.filter((symbol) => universeSymbols.has(symbol));
        state.newsTriggers.push({
          itemId: event.itemId,
          firedAt,
          title: event.title,
          url: event.url,
          source: event.source,
          impact: event.impact,
          direction: event.direction,
          symbols,
          executedSymbols: symbols.filter((symbol) => executableSymbols.has(symbol)),
          pendingSymbols: symbols.filter((symbol) => !executableSymbols.has(symbol)),
        });
        state.seenNewsTriggerIds.push(event.itemId);
      }
      state.newsTriggers = state.newsTriggers.slice(-50);
      state.seenNewsTriggerIds = state.seenNewsTriggerIds.slice(-300);
    }

    const savedVersion = await saveSimState(state, stored.version);
    if (savedVersion == null) {
      throw new Error('Simulator state changed concurrently; retry the tick');
    }
  }

  const { positions, equity } = describePositions(state, signals, prices);

  // Stress the live book through correlation-derived betas.
  const weights = new Map(positions.map((p) => [p.symbol, p.weight]));
  const labels = new Map<string, string>([
    ...SIM_UNIVERSE.map((a) => [a.symbol, a.label] as [string, string]),
    ['^VIX', 'VIX'],
    ['DX-Y.NYB', 'DXY'],
  ]);
  const scenarios = runScenarios(closes, weights, labels, equity);
  const lastCronTickAt = state.automation.lastCronTickAt;
  const cronAgeSeconds = lastCronTickAt
    ? Math.max(0, Math.round((Date.now() - new Date(lastCronTickAt).getTime()) / 1000))
    : null;
  const cronStatus =
    cronAgeSeconds == null ? 'UNKNOWN' :
    cronAgeSeconds <= 150 ? 'HEALTHY' :
    cronAgeSeconds <= 300 ? 'LATE' :
    'STALE';

  return {
    data: {
      decisions: liveDecisions,
      expressions: signalSet.expressions,
      regime: signalSet.regime,
      exAnteVol: signalSet.exAnteVol,
      scenarios,
      live: {
        asOf: new Date().toISOString(),
        quoteCount: live.size,
        freshExecutionQuoteCount: executableSymbols.size,
      },
      marketData: {
        mode: 'MULTI_PROVIDER_SHADOW',
        consolidated: Object.fromEntries(consolidated.quotes),
        providers: Object.fromEntries(
          Object.entries(providers.sources).map(([id, source]) => [
            id,
            {
              state: source.state,
              observations: source.observations.length,
              message: source.message,
            },
          ])
        ),
        executionPolicy: 'DIRECT_FRESH_CONFIDENCE_GATED',
      },
      news: news
        ? {
            asOf: news.intelligence.asOf,
            itemCount: news.intelligence.itemCount,
            classifiedCount: news.intelligence.classifiedCount,
            factors: news.intelligence.factors,
          }
        : null,
      newsTriggers: {
        // Headlines currently hot enough to lead the book, and the symbols
        // each one is driving right now.
        active: triggerEvents
          .filter((event: NewsTriggerEvent) =>
            event.symbols.some((symbol) => universeSymbols.has(symbol)))
          .slice(0, 8)
          .map((event: NewsTriggerEvent) => ({
            ...event,
            symbols: event.symbols.filter((symbol) => universeSymbols.has(symbol)),
          })),
        triggeredSymbols: [...triggeredSymbols],
        recent: state.newsTriggers.slice(-12).reverse(),
      },
      earnings: {
        source: 'NASDAQ',
        policy: 'FLAT_AT_D_MINUS_2_BUSINESS_DAYS_FAIL_CLOSED',
        assets: Object.fromEntries(earningsRisks),
      },
      params: sim.params,
      portfolio: {
        initialCapital: state.initialCapital,
        equity,
        cash: state.cash,
        totalReturnPct: (equity / state.initialCapital - 1) * 100,
        positions,
        equityHistory: state.equityHistory,
        intradayEquity: state.intradayEquity,
        recentTrades: state.trades.slice(-20).reverse(),
        recentBarrierExits: state.barrierExits.slice(-20).reverse(),
        reentryBlocks: state.reentryBlocks,
        expressionLifecycles: Object.values(state.expressionLifecycles),
        automation: {
          ...state.automation,
          expectedIntervalSeconds: 60,
          cronAgeSeconds,
          status: cronStatus,
        },
        riskManagement: {
          mode: 'THESIS_AWARE_STOP_AND_TRAILING',
          ...LIVE_BARRIER_POLICY,
        },
        lastRebalanceDate: state.lastRebalanceDate,
        createdAt: state.createdAt,
        persistence: stored.backend,
      },
    },
    fetchedAt: new Date().toISOString(),
    error: null,
  };
}

export async function GET() {
  const sim = await getSimData();
  if (!sim) {
    return NextResponse.json(
      { data: null, fetchedAt: new Date().toISOString(), error: 'Historical data unavailable' },
      { status: 200 }
    );
  }
  return NextResponse.json(await buildResponse(sim));
}

async function withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const previous = mutationQueue;
  mutationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function POST(req: NextRequest) {
  let action = '';
  try {
    const body = await req.json();
    action = body?.action ?? '';
  } catch {
    // fall through to error below
  }

  const cronSecret = process.env.CRON_SECRET;
  const isCron =
    Boolean(cronSecret) &&
    req.headers.get('authorization') === `Bearer ${cronSecret}`;
  if (isCron && action !== 'tick') {
    return NextResponse.json(
      { data: null, fetchedAt: new Date().toISOString(), error: 'Cron may only execute ticks' },
      { status: 403 }
    );
  }

  if (action === 'reset') {
    return withMutationLock(async () => {
      await resetSimState();
      cache = null;
      const sim = await getSimData();
      if (!sim) {
        return NextResponse.json(
          { data: null, fetchedAt: new Date().toISOString(), error: 'Historical data unavailable' },
          { status: 200 }
        );
      }
      return NextResponse.json(await buildResponse(sim));
    });
  }

  if (action === 'rebalance' || action === 'tick') {
    return withMutationLock(async () => {
      const sim = await getSimData();
      if (!sim) {
        return NextResponse.json(
          { data: null, fetchedAt: new Date().toISOString(), error: 'Historical data unavailable' },
          { status: 200 }
        );
      }
      return NextResponse.json(await buildResponse(sim, {
        mutate: true,
        forceRebalance: action === 'rebalance',
        mutationSource: isCron ? 'cron' : 'manual',
      }));
    });
  }

  return NextResponse.json(
    { data: null, fetchedAt: new Date().toISOString(), error: `Unknown action "${action}"` },
    { status: 400 }
  );
}
