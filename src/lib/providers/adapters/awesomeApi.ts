import { fetchProviderJson } from '../http';
import { chunked, finiteNumber, isoTimestamp, makeObservation, providerSymbol } from '../normalize';
import { completedResult, readApiKey } from '../runtime';
import type { ProviderAdapter } from '../types';

interface AwesomeQuote {
  code?: string;
  codein?: string;
  bid?: string;
  ask?: string;
  timestamp?: string;
  pctChange?: string;
  varBid?: string;
}

export const awesomeApiAdapter: ProviderAdapter = {
  id: 'awesomeapi',
  async collect(request) {
    const startedAt = new Date().toISOString();
    const apiKey = readApiKey(request.config.apiKeyEnv);
    const instruments = request.instruments.filter(
      (item) => item.assetClass === 'fx' || item.assetClass === 'crypto'
    );
    const observations = [];
    let failures = 0;

    for (const batch of chunked(instruments, request.config.budget.symbolsPerRequest)) {
      const symbols = batch.map((item) => providerSymbol(item, request.config.id));
      const url = new URL(
        `/json/last/${symbols.map(encodeURIComponent).join(',')}`,
        request.config.baseUrl
      );
      if (apiKey) url.searchParams.set('token', apiKey);

      try {
        const data = await fetchProviderJson<Record<string, AwesomeQuote>>(url.toString(), {
          signal: request.signal,
          timeoutMs: request.config.budget.requestTimeoutMs,
        });
        const receivedAt = new Date().toISOString();

        for (let index = 0; index < batch.length; index += 1) {
          const instrument = batch[index];
          const symbol = symbols[index];
          const key = symbol.replace(/[^a-z0-9]/gi, '').toUpperCase();
          const quote = data[key];
          if (!quote) continue;
          const observedAt = isoTimestamp(quote.timestamp, 'seconds');
          observations.push(makeObservation({
            config: request.config,
            instrument,
            providerSymbol: symbol,
            bid: finiteNumber(quote.bid),
            ask: finiteNumber(quote.ask),
            currency: quote.codein ?? instrument.quoteCurrency ?? null,
            observedAt,
            receivedAt,
            metadata: {
              baseCurrency: quote.code ?? instrument.baseCurrency ?? null,
              change: finiteNumber(quote.varBid),
              changePct: finiteNumber(quote.pctChange),
              authenticated: apiKey != null,
            },
          }));
        }
      } catch {
        failures += 1;
      }
    }

    return completedResult(
      { ...request, instruments },
      startedAt,
      observations,
      failures,
      apiKey ? null : 'Using documented public mode; responses may be cached for one minute'
    );
  },
};
