export type ProviderId =
  | 'awesomeapi'
  | 'finnhub'
  | 'twelve-data'
  | 'tiingo'
  | 'alpaca';

export type ProviderAssetClass = 'fx' | 'equity' | 'etf' | 'index' | 'crypto';
export type ObservationKind = 'quote' | 'trade';
export type FreshnessState = 'fresh' | 'stale' | 'unknown';

export interface ProviderInstrument {
  symbol: string;
  assetClass: ProviderAssetClass;
  providerSymbols?: Partial<Record<ProviderId, string>>;
  currency?: string;
  baseCurrency?: string;
  quoteCurrency?: string;
}

export interface NormalizedObservation {
  provider: ProviderId;
  symbol: string;
  providerSymbol: string;
  assetClass: ProviderAssetClass;
  kind: ObservationKind;
  price: number | null;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  currency: string | null;
  observedAt: string | null;
  receivedAt: string;
  ageMs: number | null;
  freshness: FreshnessState;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ProviderBudget {
  policy: 'application-default';
  requestsPerMinute: number;
  requestsPerDay: number | null;
  requestsPerMonth: number | null;
  symbolsPerRequest: number;
  requestTimeoutMs: number;
  notes: string;
}

export interface ProviderCoverage {
  assetClasses: readonly ProviderAssetClass[];
  regions: readonly string[];
  venues: readonly string[];
  notes: string;
}

export interface ProviderLatency {
  tier: 'realtime' | 'near-realtime' | 'delayed-or-plan-dependent';
  expectedMaxAgeMs: number;
  notes: string;
}

export interface ProviderLicense {
  model: 'public-api' | 'commercial-terms';
  redistribution: 'not-assumed' | 'restricted';
  termsUrl: string;
  notes: string;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  enabled: boolean;
  baseUrl: string;
  apiKeyEnv: string | readonly string[] | null;
  requiresApiKey: boolean;
  budget: ProviderBudget;
  coverage: ProviderCoverage;
  latency: ProviderLatency;
  license: ProviderLicense;
}

export interface ProviderCollectRequest {
  instruments: readonly ProviderInstrument[];
  config: ProviderConfig;
  now?: Date;
  signal?: AbortSignal;
}

export type ProviderRunState = 'ok' | 'partial' | 'skipped' | 'error';

export interface ProviderCollectionResult {
  provider: ProviderId;
  state: ProviderRunState;
  observations: NormalizedObservation[];
  requestedSymbols: number;
  returnedSymbols: number;
  startedAt: string;
  completedAt: string;
  message: string | null;
}

export interface ProviderAdapter {
  readonly id: ProviderId;
  collect(request: ProviderCollectRequest): Promise<ProviderCollectionResult>;
}

export type ProviderConfigOverride =
  Omit<Partial<ProviderConfig>, 'budget' | 'coverage' | 'latency' | 'license'> & {
    budget?: Partial<ProviderBudget>;
    coverage?: Partial<ProviderCoverage>;
    latency?: Partial<ProviderLatency>;
    license?: Partial<ProviderLicense>;
  };

export interface ProviderOrchestratorRequest {
  instruments: readonly ProviderInstrument[];
  providers?: readonly ProviderId[];
  config?: Partial<Record<ProviderId, ProviderConfigOverride>>;
  signal?: AbortSignal;
}

export interface ProviderOrchestratorResult {
  observations: NormalizedObservation[];
  sources: Record<ProviderId, ProviderCollectionResult>;
  collectedAt: string;
}
