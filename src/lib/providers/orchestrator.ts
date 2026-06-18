import { alpacaAdapter } from './adapters/alpaca';
import { awesomeApiAdapter } from './adapters/awesomeApi';
import { finnhubAdapter } from './adapters/finnhub';
import { tiingoAdapter } from './adapters/tiingo';
import { twelveDataAdapter } from './adapters/twelveData';
import { resolveProviderConfigs } from './registry';
import type {
  ProviderAdapter,
  ProviderCollectionResult,
  ProviderId,
  ProviderOrchestratorRequest,
  ProviderOrchestratorResult,
} from './types';

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  awesomeapi: awesomeApiAdapter,
  finnhub: finnhubAdapter,
  'twelve-data': twelveDataAdapter,
  tiingo: tiingoAdapter,
  alpaca: alpacaAdapter,
};

function unexpectedFailure(provider: ProviderId, error: unknown): ProviderCollectionResult {
  const now = new Date().toISOString();
  return {
    provider,
    state: 'error',
    observations: [],
    requestedSymbols: 0,
    returnedSymbols: 0,
    startedAt: now,
    completedAt: now,
    message: error instanceof Error ? error.message : 'Unexpected provider failure',
  };
}

export async function collectProviderObservations(
  request: ProviderOrchestratorRequest
): Promise<ProviderOrchestratorResult> {
  const configs = resolveProviderConfigs(request.config);
  const selected = request.providers ?? (
    Object.values(configs).filter((config) => config.enabled).map((config) => config.id)
  );
  const settled = await Promise.allSettled(selected.map((provider) =>
    ADAPTERS[provider].collect({
      instruments: request.instruments,
      config: configs[provider],
      signal: request.signal,
    })
  ));

  const sources = {} as Record<ProviderId, ProviderCollectionResult>;
  for (let index = 0; index < selected.length; index += 1) {
    const provider = selected[index];
    const result = settled[index];
    sources[provider] = result.status === 'fulfilled'
      ? result.value
      : unexpectedFailure(provider, result.reason);
  }

  for (const provider of Object.keys(ADAPTERS) as ProviderId[]) {
    if (sources[provider]) continue;
    const now = new Date().toISOString();
    sources[provider] = {
      provider,
      state: 'skipped',
      observations: [],
      requestedSymbols: 0,
      returnedSymbols: 0,
      startedAt: now,
      completedAt: now,
      message: 'Provider not selected or disabled',
    };
  }

  return {
    observations: selected.flatMap((provider) => sources[provider].observations),
    sources,
    collectedAt: new Date().toISOString(),
  };
}
