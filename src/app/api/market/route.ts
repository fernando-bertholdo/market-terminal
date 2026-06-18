// GET /api/market — aggregates all market data from BCB, FRED, Yahoo Finance, and B3.
// Partial failures are acceptable — failed fetches set values to null.
// Runtime route; client SWR refreshes every 30 seconds.

import { NextResponse } from 'next/server';
import { fetchBcbSeries, fetchPtaxEurBrl, fetchPtaxUsdBrl } from '@/lib/fetchers/bcb';
import { fetchFredSeries } from '@/lib/fetchers/fred';
import { fetchYahooQuotes } from '@/lib/fetchers/yahoo';
import { fetchB3Snapshots, type B3Snapshot } from '@/lib/fetchers/b3';
import { calculateFixedIncomeRisk, type FixedIncomeRiskData } from '@/lib/fixedIncomeRisk';
import { buildFixedIncomeCurves, type FixedIncomeCurves } from '@/lib/fixedIncomeCurves';
import { getB3MarketSymbols } from '@/lib/marketData/b3Universe';
import { b3SnapshotsToObservations, yahooQuotesToObservations } from '@/lib/marketData/adapters';
import { consolidateByInstrument, summarizeProviderHealth } from '@/lib/marketData/consolidator';
import { persistMarketSnapshot } from '@/lib/marketData/store';
import type { ConsolidatedMarketQuote, ProviderHealth } from '@/lib/marketData/types';
import {
  providerConfigFromEnvironment,
  providerInstruments,
  providerResultToMarketObservations,
} from '@/lib/marketData/providerBridge';
import { collectProviderObservations } from '@/lib/providers';
import type { ApiResponse, SourceStatus } from '@/types/market';

export const dynamic = 'force-dynamic';

// ─── Response types ────────────────────────────────────────────────────────────

interface DiContract {
  rate: number | null;
  open?: number | null;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  receivedAt?: string | null;
  change: number | null; // bps — B3 API has no prev close so always null
}

interface BrazilData {
  selic: number | null;
  selicChange: number | null;
  cdi: number | null;
  cdiChange: number | null;
  ipca: number | null;
  usdbrl: { bid: number; ask: number; mid: number; timestamp: string } | null;
  eurbrl: { bid: number; ask: number; mid: number; timestamp: string } | null;
  di: {
    DI1N26: DiContract;
    DI1F27: DiContract;
    DI1F28: DiContract;
    DI1F30: DiContract;
  };
}

interface UsData {
  fedFunds: number | null;
  fedFundsChange: number | null;
  ust2y: number | null;
  ust2yChange: number | null;
  ust5y: number | null;
  ust5yChange: number | null;
  ust10y: number | null;
  ust10yChange: number | null;
  ust30y: number | null;
  ust30yChange: number | null;
}

interface FxData {
  usdbrl: number | null;
  usdbrlChangePct: number | null;
  eurbrl: number | null;
  eurbrlChangePct: number | null;
  dxy: number | null;
  dxyChangePct: number | null;
  eurbrlOfficial: number | null;
  eurusd: number | null;
  eurusdChangePct: number | null;
  usdjpy: number | null;
  usdjpyChangePct: number | null;
  gbpusd: number | null;
  gbpusdChangePct: number | null;
}

interface CommoditiesData {
  wti: number | null;
  wtiChangePct: number | null;
  brent: number | null;
  brentChangePct: number | null;
  gold: number | null;
  goldChangePct: number | null;
  ironOre: number | null;
  ironOreChangePct: number | null;
  soybeans: number | null;
  soybeansChangePct: number | null;
  copper: number | null;
  copperChangePct: number | null;
}

interface GlobalData {
  spx: number | null;
  spxChangePct: number | null;
  vix: number | null;
  vixChangePct: number | null;
  ibov: number | null;
  ibovChangePct: number | null;
  ewz: number | null;
  ewzChangePct: number | null;
  eem: number | null;
  eemChangePct: number | null;
  xle: number | null;
  xleChangePct: number | null;
  xlf: number | null;
  xlfChangePct: number | null;
  xli: number | null;
  xliChangePct: number | null;
  xlk: number | null;
  xlkChangePct: number | null;
}

interface MarketData {
  brazil: BrazilData;
  us: UsData;
  fx: FxData;
  commodities: CommoditiesData;
  global: GlobalData;
  fixedIncomeRisk: FixedIncomeRiskData;
  fixedIncomeCurves: FixedIncomeCurves;
  b3Futures: Record<string, B3Snapshot>;
  marketIntelligence: {
    quotes: Record<string, ConsolidatedMarketQuote>;
    providers: ProviderHealth[];
    persistence: 'postgres' | 'disabled' | 'throttled' | 'error';
  };
}

const NULL_DI: DiContract = { rate: null, change: null };
const NULL_BRAZIL: BrazilData = {
  selic: null, selicChange: null, cdi: null, cdiChange: null, ipca: null, usdbrl: null,
  eurbrl: null,
  di: { DI1N26: NULL_DI, DI1F27: NULL_DI, DI1F28: NULL_DI, DI1F30: NULL_DI },
};
const NULL_US: UsData = {
  fedFunds: null, fedFundsChange: null,
  ust2y: null, ust2yChange: null,
  ust5y: null, ust5yChange: null,
  ust10y: null, ust10yChange: null,
  ust30y: null, ust30yChange: null,
};
const NULL_FX: FxData = {
  usdbrl: null, usdbrlChangePct: null, eurbrl: null, eurbrlChangePct: null,
  dxy: null, dxyChangePct: null, eurbrlOfficial: null, eurusd: null, eurusdChangePct: null,
  usdjpy: null, usdjpyChangePct: null, gbpusd: null, gbpusdChangePct: null,
};
const NULL_CMDTY: CommoditiesData = {
  wti: null, wtiChangePct: null, brent: null, brentChangePct: null,
  gold: null, goldChangePct: null, ironOre: null, ironOreChangePct: null,
  soybeans: null, soybeansChangePct: null, copper: null, copperChangePct: null,
};
const NULL_GLOBAL: GlobalData = {
  spx: null, spxChangePct: null, vix: null, vixChangePct: null,
  ibov: null, ibovChangePct: null,
  ewz: null, ewzChangePct: null, eem: null, eemChangePct: null,
  xle: null, xleChangePct: null, xlf: null, xlfChangePct: null,
  xli: null, xliChangePct: null, xlk: null, xlkChangePct: null,
};

// ─── Helper: safely unwrap PromiseSettledResult ────────────────────────────────
function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

// Compute yield change in bps from FRED current/previous values
function bpsChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 100 * 10) / 10; // 1 decimal place
}

function sourceStatus(ok: boolean, label: string, message: string | null = null): SourceStatus {
  return { ok, label, message };
}

function diContract(snapshot: B3Snapshot | null): DiContract {
  return {
    rate: snapshot?.current ?? null,
    change: snapshot?.change == null ? null : snapshot.change * 100,
    open: snapshot?.open ?? null,
    min: snapshot?.min ?? null,
    max: snapshot?.max ?? null,
    average: snapshot?.avg ?? null,
    receivedAt: snapshot?.receivedAt ?? null,
  };
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse<ApiResponse<MarketData>>> {
  const fetchedAt = new Date().toISOString();

  try {
    const YAHOO_TICKERS = [
      'BRL=X', 'EURBRL=X', 'DX-Y.NYB',
      'EURUSD=X', 'USDJPY=X', 'GBPUSD=X',
      'CL=F', 'BZ=F', 'GC=F', 'TIO=F', 'ZS=F', 'HG=F',
      '^GSPC', '^VIX', '^BVSP',
      'EWZ', 'EEM', 'XLE', 'XLF', 'XLI', 'XLK',
    ];

    const [
      selicResult, cdiResult, ipcaResult, ptaxResult, eurPtaxResult,
      b3Result,
      dgs2Result, dgs5Result, dgs10Result, dgs30Result, fedFundsResult,
      yahooResult,
    ] = await Promise.allSettled([
      fetchBcbSeries('1178'),  // SELIC annualized
      fetchBcbSeries('4392'),  // CDI overnight
      fetchBcbSeries('433'),   // IPCA monthly
      fetchPtaxUsdBrl(),
      fetchPtaxEurBrl(),
      fetchB3Snapshots(getB3MarketSymbols()),
      fetchFredSeries('DGS2'),
      fetchFredSeries('DGS5'),
      fetchFredSeries('DGS10'),
      fetchFredSeries('DGS30'),
      fetchFredSeries('FEDFUNDS'),
      fetchYahooQuotes(YAHOO_TICKERS),
    ]);

    const selic     = settled(selicResult);
    const cdi       = settled(cdiResult);
    const ipca      = settled(ipcaResult);
    const ptax      = settled(ptaxResult);
    const eurPtax   = settled(eurPtaxResult);
    const b3Snapshots = settled(b3Result) ?? new Map<string, B3Snapshot>();
    const diN26     = b3Snapshots.get('DI1N26') ?? null;
    const diF27     = b3Snapshots.get('DI1F27') ?? null;
    const diF28     = b3Snapshots.get('DI1F28') ?? null;
    const diF30     = b3Snapshots.get('DI1F30') ?? null;
    const dgs2      = settled(dgs2Result);
    const dgs5      = settled(dgs5Result);
    const dgs10     = settled(dgs10Result);
    const dgs30     = settled(dgs30Result);
    const fedFunds  = settled(fedFundsResult);
    const yahoo     = settled(yahooResult) ?? new Map();
    const providerResult = await collectProviderObservations({
      instruments: providerInstruments(),
      config: providerConfigFromEnvironment(),
    });
    const hasAnyDi = [diN26, diF27, diF28, diF30].some(
      (snapshot) => snapshot?.status.ok && snapshot.current != null
    );

    const q = (ticker: string) => yahoo.get(ticker) ?? null;
    const sources = {
      bcb: sourceStatus(Boolean(selic || cdi || ipca || ptax || eurPtax), 'BCB', ptax ? null : 'PTAX unavailable'),
      fred: sourceStatus(Boolean(dgs2 || dgs5 || dgs10 || dgs30 || fedFunds), 'FRED', process.env.FRED_API_KEY ? null : 'Missing FRED_API_KEY'),
      b3: sourceStatus(hasAnyDi, 'B3', hasAnyDi ? null : 'DI quotations unavailable'),
      yahoo: sourceStatus(yahoo.size > 0, 'YAHOO', null),
      ...Object.fromEntries(
        Object.values(providerResult.sources)
          .filter((provider) => provider.state !== 'skipped')
          .map((provider) => [
            provider.provider,
            sourceStatus(
              provider.state === 'ok' || provider.state === 'partial',
              provider.provider,
              provider.message
            ),
          ])
      ),
    };

    const data = {
      brazil: {
        selic: selic?.value ?? null,
        selicChange: null, // BCB SGS only returns latest value, no previous
        cdi: cdi?.value ?? null,
        cdiChange: null,
        ipca: ipca?.value ?? null,
        usdbrl: ptax,
        eurbrl: eurPtax,
        di: {
          DI1N26: diContract(diN26),
          DI1F27: diContract(diF27),
          DI1F28: diContract(diF28),
          DI1F30: diContract(diF30),
        },
      },
      us: {
        fedFunds:      fedFunds?.current ?? null,
        fedFundsChange: bpsChange(fedFunds?.current ?? null, fedFunds?.previous ?? null),
        ust2y:         dgs2?.current ?? null,
        ust2yChange:   bpsChange(dgs2?.current ?? null, dgs2?.previous ?? null),
        ust5y:         dgs5?.current ?? null,
        ust5yChange:   bpsChange(dgs5?.current ?? null, dgs5?.previous ?? null),
        ust10y:        dgs10?.current ?? null,
        ust10yChange:  bpsChange(dgs10?.current ?? null, dgs10?.previous ?? null),
        ust30y:        dgs30?.current ?? null,
        ust30yChange:  bpsChange(dgs30?.current ?? null, dgs30?.previous ?? null),
      },
      fx: {
        usdbrl:         q('BRL=X')?.price ?? null,
        usdbrlChangePct: q('BRL=X')?.changePct ?? null,
        eurbrl:         q('EURBRL=X')?.price ?? null,
        eurbrlChangePct: q('EURBRL=X')?.changePct ?? null,
        dxy:            q('DX-Y.NYB')?.price ?? null,
        dxyChangePct:   q('DX-Y.NYB')?.changePct ?? null,
        eurbrlOfficial: eurPtax?.mid ?? null,
        eurusd:         q('EURUSD=X')?.price ?? null,
        eurusdChangePct: q('EURUSD=X')?.changePct ?? null,
        usdjpy:         q('USDJPY=X')?.price ?? null,
        usdjpyChangePct: q('USDJPY=X')?.changePct ?? null,
        gbpusd:         q('GBPUSD=X')?.price ?? null,
        gbpusdChangePct: q('GBPUSD=X')?.changePct ?? null,
      },
      commodities: {
        wti:             q('CL=F')?.price ?? null,
        wtiChangePct:    q('CL=F')?.changePct ?? null,
        brent:           q('BZ=F')?.price ?? null,
        brentChangePct:  q('BZ=F')?.changePct ?? null,
        gold:            q('GC=F')?.price ?? null,
        goldChangePct:   q('GC=F')?.changePct ?? null,
        ironOre:         q('TIO=F')?.price ?? null,
        ironOreChangePct: q('TIO=F')?.changePct ?? null,
        soybeans:        q('ZS=F')?.price ?? null,
        soybeansChangePct: q('ZS=F')?.changePct ?? null,
        copper:          q('HG=F')?.price ?? null,
        copperChangePct: q('HG=F')?.changePct ?? null,
      },
      global: {
        spx:          q('^GSPC')?.price ?? null,
        spxChangePct: q('^GSPC')?.changePct ?? null,
        vix:          q('^VIX')?.price ?? null,
        vixChangePct: q('^VIX')?.changePct ?? null,
        ibov:         q('^BVSP')?.price ?? null,
        ibovChangePct: q('^BVSP')?.changePct ?? null,
        ewz:           q('EWZ')?.price ?? null,
        ewzChangePct:  q('EWZ')?.changePct ?? null,
        eem:           q('EEM')?.price ?? null,
        eemChangePct:  q('EEM')?.changePct ?? null,
        xle:           q('XLE')?.price ?? null,
        xleChangePct:  q('XLE')?.changePct ?? null,
        xlf:           q('XLF')?.price ?? null,
        xlfChangePct:  q('XLF')?.changePct ?? null,
        xli:           q('XLI')?.price ?? null,
        xliChangePct:  q('XLI')?.changePct ?? null,
        xlk:           q('XLK')?.price ?? null,
        xlkChangePct:  q('XLK')?.changePct ?? null,
      },
    };

    const responseData: MarketData = {
      ...data,
      fixedIncomeRisk: calculateFixedIncomeRisk(data),
      fixedIncomeCurves: buildFixedIncomeCurves([...b3Snapshots.values()]),
      b3Futures: Object.fromEntries(b3Snapshots),
      marketIntelligence: {
        quotes: {},
        providers: [],
        persistence: 'disabled',
      },
    };

    const observations = [
      ...yahooQuotesToObservations(yahoo),
      ...b3SnapshotsToObservations(b3Snapshots),
      ...providerResultToMarketObservations(providerResult),
    ];
    const consolidated = consolidateByInstrument(observations);
    const configuredProviderIds = [
      'yahoo',
      'b3',
      ...Object.values(providerResult.sources)
        .filter((provider) => provider.state !== 'skipped')
        .map((provider) => provider.provider === 'twelve-data' ? 'twelvedata' : provider.provider),
    ];
    const providerErrors = Object.fromEntries(
      Object.values(providerResult.sources).flatMap((provider) =>
        provider.state === 'error'
          ? [[provider.provider === 'twelve-data' ? 'twelvedata' : provider.provider, provider.message ?? 'Provider error']]
          : []
      )
    );
    const providerHealth = summarizeProviderHealth(
      configuredProviderIds,
      observations,
      providerErrors
    );
    responseData.marketIntelligence.quotes = Object.fromEntries(consolidated);
    responseData.marketIntelligence.providers = providerHealth;
    try {
      responseData.marketIntelligence.persistence = await persistMarketSnapshot(
        observations,
        [...consolidated.values()],
        providerHealth
      );
    } catch (persistError) {
      console.error('[/api/market] Snapshot persistence failed:', persistError);
      responseData.marketIntelligence.persistence = 'error';
    }

    return NextResponse.json({ data: responseData, fetchedAt, error: null, sources });
  } catch (err) {
    console.error('[/api/market] Unhandled error:', err);
    return NextResponse.json(
      {
        data: {
          brazil: NULL_BRAZIL,
          us: NULL_US,
          fx: NULL_FX,
          commodities: NULL_CMDTY,
          global: NULL_GLOBAL,
          fixedIncomeRisk: calculateFixedIncomeRisk({
            brazil: NULL_BRAZIL,
            us: NULL_US,
          }),
          fixedIncomeCurves: buildFixedIncomeCurves([]),
          b3Futures: {},
          marketIntelligence: {
            quotes: {},
            providers: [],
            persistence: 'disabled',
          },
        },
        fetchedAt,
        error: 'Market data is temporarily unavailable',
        sources: {
          bcb: sourceStatus(false, 'BCB', 'Unavailable'),
          fred: sourceStatus(false, 'FRED', 'Unavailable'),
          b3: sourceStatus(false, 'B3', 'Unavailable'),
          yahoo: sourceStatus(false, 'YAHOO', 'Unavailable'),
        },
      },
      { status: 200 }
    );
  }
}
