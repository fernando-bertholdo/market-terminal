import type {
  FreshnessState,
  NormalizedObservation,
  ObservationKind,
  ProviderConfig,
  ProviderInstrument,
} from './types';

export function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isoTimestamp(value: unknown, unit: 'seconds' | 'milliseconds' = 'milliseconds'): string | null {
  if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const millis = unit === 'seconds' ? numeric * 1000 : numeric;
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }

  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function providerSymbol(
  instrument: ProviderInstrument,
  provider: ProviderConfig['id']
): string {
  return instrument.providerSymbols?.[provider] ?? instrument.symbol;
}

export function chunked<T>(items: readonly T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks;
}

export function makeObservation(input: {
  config: ProviderConfig;
  instrument: ProviderInstrument;
  providerSymbol: string;
  kind?: ObservationKind;
  price?: number | null;
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  currency?: string | null;
  observedAt?: string | null;
  receivedAt: string;
  metadata?: NormalizedObservation['metadata'];
}): NormalizedObservation {
  const bid = input.bid ?? null;
  const ask = input.ask ?? null;
  const derivedMid = bid != null && ask != null ? (bid + ask) / 2 : null;
  const mid = input.mid ?? derivedMid;
  const price = input.price ?? mid;
  const observedTime = input.observedAt ? Date.parse(input.observedAt) : NaN;
  const receivedTime = Date.parse(input.receivedAt);
  const ageMs =
    Number.isFinite(observedTime) && Number.isFinite(receivedTime)
      ? Math.max(0, receivedTime - observedTime)
      : null;
  const freshness: FreshnessState =
    ageMs == null
      ? 'unknown'
      : ageMs <= input.config.latency.expectedMaxAgeMs
        ? 'fresh'
        : 'stale';

  return {
    provider: input.config.id,
    symbol: input.instrument.symbol,
    providerSymbol: input.providerSymbol,
    assetClass: input.instrument.assetClass,
    kind: input.kind ?? 'quote',
    price,
    bid,
    ask,
    mid,
    currency: input.currency ?? input.instrument.quoteCurrency ?? input.instrument.currency ?? null,
    observedAt: input.observedAt ?? null,
    receivedAt: input.receivedAt,
    ageMs,
    freshness,
    metadata: input.metadata,
  };
}
