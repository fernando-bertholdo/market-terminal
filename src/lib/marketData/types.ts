export type MarketDataQuality =
  | 'LIVE'
  | 'DELAYED'
  | 'INDICATIVE'
  | 'INTERPOLATED'
  | 'STALE'
  | 'DIVERGENT'
  | 'UNAVAILABLE';

export type ObservationKind = 'DIRECT' | 'INDICATIVE' | 'INTERPOLATED';

export interface MarketObservation {
  instrumentId: string;
  providerId: string;
  sourceSymbol: string;
  value: number;
  bid?: number | null;
  ask?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  average?: number | null;
  volume?: number | null;
  sourceTimestamp: string | null;
  receivedAt: string;
  expectedDelayMs: number;
  kind: ObservationKind;
  unit: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ScoredObservation extends MarketObservation {
  ageMs: number;
  qualityScore: number;
  quality: MarketDataQuality;
  deviationBps: number | null;
}

export interface ConsolidatedMarketQuote {
  instrumentId: string;
  value: number | null;
  bid: number | null;
  ask: number | null;
  asOf: string | null;
  receivedAt: string;
  quality: MarketDataQuality;
  confidence: number;
  dispersionBps: number | null;
  selectedProvider: string | null;
  observations: ScoredObservation[];
}

export interface ProviderHealth {
  providerId: string;
  ok: boolean;
  configured: boolean;
  observations: number;
  freshObservations: number;
  latestAt: string | null;
  message: string | null;
}

