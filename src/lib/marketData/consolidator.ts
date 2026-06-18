import type {
  ConsolidatedMarketQuote,
  MarketDataQuality,
  MarketObservation,
  ProviderHealth,
  ScoredObservation,
} from './types';

export interface ConsolidationPolicy {
  liveMaxAgeMs: number;
  delayedMaxAgeMs: number;
  staleMaxAgeMs: number;
  divergenceBps: number;
  minimumExecutionConfidence: number;
  providerReliability?: Record<string, number>;
}

export const DEFAULT_CONSOLIDATION_POLICY: ConsolidationPolicy = {
  liveMaxAgeMs: 15_000,
  delayedMaxAgeMs: 5 * 60_000,
  staleMaxAgeMs: 24 * 60 * 60_000,
  divergenceBps: 35,
  minimumExecutionConfidence: 0.55,
  providerReliability: {
    b3: 0.90,
    yahoo: 0.76,
    awesomeapi: 0.72,
    finnhub: 0.82,
    twelvedata: 0.80,
    tiingo: 0.80,
    alpaca: 0.84,
    bcb: 0.96,
    fred: 0.98,
  },
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function timestampMs(observation: MarketObservation): number {
  const candidate = observation.sourceTimestamp ?? observation.receivedAt;
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : Date.parse(observation.receivedAt);
}

function baseQuality(
  observation: MarketObservation,
  ageMs: number,
  policy: ConsolidationPolicy
): MarketDataQuality {
  if (observation.kind === 'INTERPOLATED') return 'INTERPOLATED';
  if (observation.kind === 'INDICATIVE') return 'INDICATIVE';
  if (ageMs <= policy.liveMaxAgeMs + observation.expectedDelayMs) return 'LIVE';
  if (ageMs <= policy.delayedMaxAgeMs + observation.expectedDelayMs) return 'DELAYED';
  return ageMs <= policy.staleMaxAgeMs ? 'STALE' : 'UNAVAILABLE';
}

function weightedMedian(
  entries: Array<{ value: number; weight: number }>
): number | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= total / 2) return item.value;
  }
  return sorted[sorted.length - 1].value;
}

function deviationBps(value: number, reference: number): number {
  if (reference === 0) return Math.abs(value - reference) * 10_000;
  return Math.abs(value / reference - 1) * 10_000;
}

export function consolidateObservations(
  instrumentId: string,
  observations: MarketObservation[],
  policy: ConsolidationPolicy = DEFAULT_CONSOLIDATION_POLICY,
  now = new Date()
): ConsolidatedMarketQuote {
  const receivedAt = now.toISOString();
  const candidates = observations.filter(
    (observation) =>
      observation.instrumentId === instrumentId &&
      Number.isFinite(observation.value)
  );

  const preliminary = candidates.map((observation) => {
    const ageMs = Math.max(0, now.getTime() - timestampMs(observation));
    const quality = baseQuality(observation, ageMs, policy);
    const reliability = policy.providerReliability?.[observation.providerId] ?? 0.65;
    const freshness = Math.exp(
      -ageMs / Math.max(policy.delayedMaxAgeMs + observation.expectedDelayMs, 1)
    );
    const kindFactor =
      observation.kind === 'DIRECT' ? 1 :
      observation.kind === 'INDICATIVE' ? 0.65 :
      0.35;
    const qualityScore = clamp(reliability * freshness * kindFactor);
    return { ...observation, ageMs, quality, qualityScore, deviationBps: null };
  });

  const usable = preliminary.filter(
    (observation) =>
      observation.quality !== 'STALE' &&
      observation.quality !== 'UNAVAILABLE' &&
      observation.qualityScore > 0
  );
  const direct = usable.filter((observation) => observation.kind === 'DIRECT');
  const consensusPool = direct.length > 0 ? direct : usable;
  const center = weightedMedian(
    consensusPool.map((observation) => ({
      value: observation.value,
      weight: observation.qualityScore,
    }))
  );

  const scored: ScoredObservation[] = preliminary.map((observation) => {
    const deviation = center == null ? null : deviationBps(observation.value, center);
    const divergent =
      deviation != null &&
      deviation > policy.divergenceBps &&
      observation.quality !== 'STALE' &&
      observation.quality !== 'UNAVAILABLE';
    return {
      ...observation,
      deviationBps: deviation,
      quality: divergent ? 'DIVERGENT' : observation.quality,
      qualityScore: divergent ? observation.qualityScore * 0.15 : observation.qualityScore,
    };
  });

  const accepted = scored.filter(
    (observation) =>
      !['STALE', 'UNAVAILABLE', 'DIVERGENT'].includes(observation.quality)
  );
  const finalPool =
    accepted.filter((observation) => observation.kind === 'DIRECT').length > 0
      ? accepted.filter((observation) => observation.kind === 'DIRECT')
      : accepted;
  const value = weightedMedian(
    finalPool.map((observation) => ({
      value: observation.value,
      weight: observation.qualityScore,
    }))
  );
  const selected =
    finalPool.length === 0
      ? null
      : [...finalPool].sort((a, b) => b.qualityScore - a.qualityScore)[0];
  const maxDeviation =
    value == null || finalPool.length < 2
      ? null
      : Math.max(...finalPool.map((observation) => deviationBps(observation.value, value)));
  const confidence =
    finalPool.length === 0
      ? 0
      : clamp(
          finalPool.reduce((sum, observation) => sum + observation.qualityScore, 0) /
            Math.max(1, Math.min(finalPool.length, 2)) *
            (maxDeviation == null ? 0.85 : clamp(1 - maxDeviation / (policy.divergenceBps * 2)))
        );

  let quality: MarketDataQuality = 'UNAVAILABLE';
  if (selected) {
    quality =
      scored.some((observation) => observation.quality === 'DIVERGENT') &&
      confidence < policy.minimumExecutionConfidence
        ? 'DIVERGENT'
        : selected.quality;
  }

  return {
    instrumentId,
    value,
    bid: selected?.bid ?? null,
    ask: selected?.ask ?? null,
    asOf: selected?.sourceTimestamp ?? selected?.receivedAt ?? null,
    receivedAt,
    quality,
    confidence,
    dispersionBps: maxDeviation,
    selectedProvider: selected?.providerId ?? null,
    observations: scored,
  };
}

export function consolidateByInstrument(
  observations: MarketObservation[],
  policy: ConsolidationPolicy = DEFAULT_CONSOLIDATION_POLICY,
  now = new Date()
): Map<string, ConsolidatedMarketQuote> {
  const ids = new Set(observations.map((observation) => observation.instrumentId));
  return new Map(
    [...ids].map((instrumentId) => [
      instrumentId,
      consolidateObservations(instrumentId, observations, policy, now),
    ])
  );
}

export function summarizeProviderHealth(
  configuredProviders: string[],
  observations: MarketObservation[],
  errors: Partial<Record<string, string>> = {},
  now = new Date()
): ProviderHealth[] {
  return configuredProviders.map((providerId) => {
    const providerObservations = observations.filter(
      (observation) => observation.providerId === providerId
    );
    const fresh = providerObservations.filter(
      (observation) =>
        now.getTime() - timestampMs(observation) <=
        DEFAULT_CONSOLIDATION_POLICY.delayedMaxAgeMs + observation.expectedDelayMs
    );
    const latest = providerObservations
      .map((observation) => observation.sourceTimestamp ?? observation.receivedAt)
      .sort()
      .at(-1) ?? null;
    return {
      providerId,
      configured: true,
      ok: fresh.length > 0 && !errors[providerId],
      observations: providerObservations.length,
      freshObservations: fresh.length,
      latestAt: latest,
      message: errors[providerId] ?? (providerObservations.length === 0 ? 'No observations' : null),
    };
  });
}

export function isExecutionEligible(
  quote: ConsolidatedMarketQuote,
  policy: ConsolidationPolicy = DEFAULT_CONSOLIDATION_POLICY
): boolean {
  return (
    quote.value != null &&
    ['LIVE', 'DELAYED'].includes(quote.quality) &&
    quote.confidence >= policy.minimumExecutionConfidence &&
    quote.observations.some(
      (observation) =>
        observation.kind === 'DIRECT' &&
        !['STALE', 'UNAVAILABLE', 'DIVERGENT'].includes(observation.quality)
    )
  );
}

