import type { ProviderConfig, ProviderConfigOverride, ProviderId } from './types';

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderConfig> = {
  awesomeapi: {
    id: 'awesomeapi',
    label: 'AwesomeAPI FX',
    enabled: true,
    baseUrl: 'https://economia.awesomeapi.com.br',
    apiKeyEnv: 'AWESOMEAPI_API_KEY',
    requiresApiKey: false,
    budget: {
      policy: 'application-default',
      requestsPerMinute: 30,
      requestsPerDay: null,
      requestsPerMonth: 90_000,
      symbolsPerRequest: 20,
      requestTimeoutMs: 8_000,
      notes: 'Conservative client budget. Public requests are documented as cached for one minute.',
    },
    coverage: {
      assetClasses: ['fx', 'crypto'],
      regions: ['global', 'Brazil'],
      venues: ['aggregated FX'],
      notes: 'Currency pairs supported by the provider, with strong BRL coverage.',
    },
    latency: {
      tier: 'near-realtime',
      expectedMaxAgeMs: 2 * 60_000,
      notes: 'Unauthenticated observations may include the provider public cache delay.',
    },
    license: {
      model: 'public-api',
      redistribution: 'not-assumed',
      termsUrl: 'https://docs.awesomeapi.com.br/',
      notes: 'Public access does not imply redistribution rights; review current terms.',
    },
  },
  finnhub: {
    id: 'finnhub',
    label: 'Finnhub Quote',
    enabled: false,
    baseUrl: 'https://finnhub.io/api/v1',
    apiKeyEnv: 'FINNHUB_API_KEY',
    requiresApiKey: true,
    budget: {
      policy: 'application-default',
      requestsPerMinute: 30,
      requestsPerDay: null,
      requestsPerMonth: null,
      symbolsPerRequest: 1,
      requestTimeoutMs: 8_000,
      notes: 'Quote is single-symbol; this budget intentionally leaves headroom for plan limits.',
    },
    coverage: {
      assetClasses: ['equity', 'etf', 'index', 'fx', 'crypto'],
      regions: ['global'],
      venues: ['plan-dependent'],
      notes: 'Symbol availability and real-time entitlement depend on account plan and exchange.',
    },
    latency: {
      tier: 'delayed-or-plan-dependent',
      expectedMaxAgeMs: 20 * 60_000,
      notes: 'Real-time versus delayed data is entitlement-dependent.',
    },
    license: {
      model: 'commercial-terms',
      redistribution: 'restricted',
      termsUrl: 'https://finnhub.io/terms-of-service',
      notes: 'Do not redistribute without confirming the subscribed data rights.',
    },
  },
  'twelve-data': {
    id: 'twelve-data',
    label: 'Twelve Data Quote',
    enabled: false,
    baseUrl: 'https://api.twelvedata.com',
    apiKeyEnv: 'TWELVE_DATA_API_KEY',
    requiresApiKey: true,
    budget: {
      policy: 'application-default',
      requestsPerMinute: 6,
      requestsPerDay: 700,
      requestsPerMonth: null,
      symbolsPerRequest: 8,
      requestTimeoutMs: 10_000,
      notes: 'Conservative defaults for credit-based plans; override from the active subscription.',
    },
    coverage: {
      assetClasses: ['equity', 'etf', 'index', 'fx', 'crypto'],
      regions: ['global'],
      venues: ['multiple exchanges'],
      notes: 'Coverage and exchange suffixes vary by instrument and plan.',
    },
    latency: {
      tier: 'delayed-or-plan-dependent',
      expectedMaxAgeMs: 20 * 60_000,
      notes: 'Quote freshness and exchange delay depend on plan entitlement.',
    },
    license: {
      model: 'commercial-terms',
      redistribution: 'restricted',
      termsUrl: 'https://twelvedata.com/terms',
      notes: 'Display and redistribution rights are subscription-dependent.',
    },
  },
  tiingo: {
    id: 'tiingo',
    label: 'Tiingo IEX / FX',
    enabled: false,
    baseUrl: 'https://api.tiingo.com',
    apiKeyEnv: 'TIINGO_API_KEY',
    requiresApiKey: true,
    budget: {
      policy: 'application-default',
      requestsPerMinute: 30,
      requestsPerDay: null,
      requestsPerMonth: null,
      symbolsPerRequest: 50,
      requestTimeoutMs: 10_000,
      notes: 'Batches IEX and FX separately; limits should be adjusted to the account plan.',
    },
    coverage: {
      assetClasses: ['equity', 'etf', 'fx'],
      regions: ['United States', 'global FX'],
      venues: ['IEX', 'aggregated FX'],
      notes: 'Equity observations use Tiingo IEX; currency pairs use Tiingo FX.',
    },
    latency: {
      tier: 'delayed-or-plan-dependent',
      expectedMaxAgeMs: 20 * 60_000,
      notes: 'IEX and FX freshness depend on endpoint entitlement and market hours.',
    },
    license: {
      model: 'commercial-terms',
      redistribution: 'restricted',
      termsUrl: 'https://www.tiingo.com/about/terms',
      notes: 'External display and redistribution require the appropriate data license.',
    },
  },
  alpaca: {
    id: 'alpaca',
    label: 'Alpaca Latest Trades / Quotes',
    enabled: false,
    baseUrl: 'https://data.alpaca.markets',
    apiKeyEnv: ['ALPACA_API_KEY_ID', 'ALPACA_API_SECRET_KEY'],
    requiresApiKey: true,
    budget: {
      policy: 'application-default',
      requestsPerMinute: 60,
      requestsPerDay: null,
      requestsPerMonth: null,
      symbolsPerRequest: 100,
      requestTimeoutMs: 8_000,
      notes: 'Each symbol batch consumes two requests: latest trades and latest quotes.',
    },
    coverage: {
      assetClasses: ['equity', 'etf'],
      regions: ['United States'],
      venues: ['IEX by default'],
      notes: 'Adapter requests the IEX feed to remain compatible with basic market-data plans.',
    },
    latency: {
      tier: 'realtime',
      expectedMaxAgeMs: 5 * 60_000,
      notes: 'IEX is real-time but represents a subset of consolidated US market activity.',
    },
    license: {
      model: 'commercial-terms',
      redistribution: 'restricted',
      termsUrl: 'https://alpaca.markets/data',
      notes: 'Market-data display and redistribution are governed by feed and account terms.',
    },
  },
};

export function resolveProviderConfigs(
  overrides: Partial<Record<ProviderId, ProviderConfigOverride>> = {}
): Record<ProviderId, ProviderConfig> {
  return Object.fromEntries(
    Object.entries(PROVIDER_REGISTRY).map(([id, base]) => {
      const override = overrides[id as ProviderId];
      return [
        id,
        {
          ...base,
          ...override,
          budget: { ...base.budget, ...override?.budget },
          coverage: { ...base.coverage, ...override?.coverage },
          latency: { ...base.latency, ...override?.latency },
          license: { ...base.license, ...override?.license },
        },
      ];
    })
  ) as Record<ProviderId, ProviderConfig>;
}
