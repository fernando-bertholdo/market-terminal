import {
  GLOBAL_PROVIDER_SYMBOLS,
  type ProviderSymbolMap,
} from './instruments';
import type { MarketObservation } from './types';
import type {
  NormalizedObservation,
  ProviderConfigOverride,
  ProviderId,
  ProviderInstrument,
  ProviderOrchestratorResult,
} from '@/lib/providers';

const PROVIDER_KEY: Record<ProviderId, keyof ProviderSymbolMap | null> = {
  awesomeapi: 'awesomeapi',
  finnhub: 'finnhub',
  'twelve-data': 'twelvedata',
  tiingo: 'tiingo',
  alpaca: 'alpaca',
};

function assetClass(instrumentId: string): ProviderInstrument['assetClass'] {
  if (instrumentId.startsWith('FX:')) return 'fx';
  if (instrumentId.startsWith('INDEX:')) return 'index';
  if (instrumentId.startsWith('ETF:')) return 'etf';
  return 'equity';
}

export function providerInstruments(): ProviderInstrument[] {
  return GLOBAL_PROVIDER_SYMBOLS.map((mapping) => {
    const providerSymbols: ProviderInstrument['providerSymbols'] = {};
    for (const [provider, field] of Object.entries(PROVIDER_KEY) as Array<
      [ProviderId, keyof ProviderSymbolMap | null]
    >) {
      const symbol = field ? mapping[field] : null;
      if (typeof symbol === 'string') providerSymbols[provider] = symbol;
    }
    return {
      symbol: mapping.instrumentId,
      assetClass: assetClass(mapping.instrumentId),
      providerSymbols,
      currency: mapping.unit,
    };
  });
}

export function providerConfigFromEnvironment(): Partial<
  Record<ProviderId, ProviderConfigOverride>
> {
  return {
    awesomeapi: { enabled: true },
    finnhub: { enabled: Boolean(process.env.FINNHUB_API_KEY) },
    'twelve-data': { enabled: Boolean(process.env.TWELVE_DATA_API_KEY) },
    tiingo: { enabled: Boolean(process.env.TIINGO_API_KEY) },
    alpaca: {
      enabled: Boolean(
        process.env.ALPACA_API_KEY_ID && process.env.ALPACA_API_SECRET_KEY
      ),
    },
  };
}

export function providerResultToMarketObservations(
  result: ProviderOrchestratorResult
): MarketObservation[] {
  const unitById = new Map(
    GLOBAL_PROVIDER_SYMBOLS.map((mapping) => [mapping.instrumentId, mapping.unit])
  );
  return result.observations.flatMap((observation: NormalizedObservation) => {
    const value = observation.mid ?? observation.price;
    if (value == null || !Number.isFinite(value)) return [];
    const providerConfig =
      observation.provider === 'twelve-data' ? 'twelvedata' : observation.provider;
    return [{
      instrumentId: observation.symbol,
      providerId: providerConfig,
      sourceSymbol: observation.providerSymbol,
      value,
      bid: observation.bid,
      ask: observation.ask,
      sourceTimestamp: observation.observedAt,
      receivedAt: observation.receivedAt,
      expectedDelayMs:
        observation.freshness === 'fresh' ? 5_000 :
        observation.freshness === 'stale' ? 20 * 60_000 :
        5 * 60_000,
      kind: 'DIRECT' as const,
      unit: unitById.get(observation.symbol) ?? observation.currency ?? '',
      metadata: {
        providerKind: observation.kind,
        freshness: observation.freshness,
        ageMs: observation.ageMs,
        ...observation.metadata,
      },
    }];
  });
}

