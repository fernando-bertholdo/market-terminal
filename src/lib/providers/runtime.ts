import type {
  NormalizedObservation,
  ProviderCollectRequest,
  ProviderCollectionResult,
} from './types';

export function readApiKey(apiKeyEnv: string | readonly string[] | null): string | null {
  if (apiKeyEnv == null) return null;
  const names = typeof apiKeyEnv === 'string' ? [apiKeyEnv] : apiKeyEnv;
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function skippedResult(
  request: ProviderCollectRequest,
  startedAt: string,
  message: string
): ProviderCollectionResult {
  const completedAt = new Date().toISOString();
  return {
    provider: request.config.id,
    state: 'skipped',
    observations: [],
    requestedSymbols: request.instruments.length,
    returnedSymbols: 0,
    startedAt,
    completedAt,
    message,
  };
}

export function completedResult(
  request: ProviderCollectRequest,
  startedAt: string,
  observations: NormalizedObservation[],
  failures: number,
  message: string | null = null
): ProviderCollectionResult {
  const requestedSymbols = request.instruments.length;
  const returnedSymbols = new Set(observations.map((item) => item.symbol)).size;
  const state =
    failures === 0 && returnedSymbols === requestedSymbols
      ? 'ok'
      : returnedSymbols > 0
        ? 'partial'
        : 'error';

  return {
    provider: request.config.id,
    state,
    observations,
    requestedSymbols,
    returnedSymbols,
    startedAt,
    completedAt: new Date().toISOString(),
    message:
      message ??
      (state === 'ok'
        ? null
        : `${failures} request batch(es) failed or returned no usable observations`),
  };
}

export function keyMissingMessage(request: ProviderCollectRequest): string {
  const names = request.config.apiKeyEnv;
  const display = typeof names === 'string' ? names : names?.join(' + ') ?? 'API key';
  return `Provider disabled for this run: missing ${display}`;
}
