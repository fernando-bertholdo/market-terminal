import { fetchProviderJson } from '../http';
import { chunked, finiteNumber, isoTimestamp, makeObservation, providerSymbol } from '../normalize';
import { completedResult, keyMissingMessage, readApiKey, skippedResult } from '../runtime';
import type { ProviderAdapter, ProviderInstrument } from '../types';

interface TwelveQuote {
  symbol?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  bid?: string;
  ask?: string;
  status?: string;
}

function isQuote(value: unknown): value is TwelveQuote {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function quoteMap(
  data: TwelveQuote | Record<string, TwelveQuote>,
  batch: readonly ProviderInstrument[],
  symbols: readonly string[]
): Array<{ instrument: ProviderInstrument; symbol: string; quote: TwelveQuote }> {
  if ('symbol' in data || 'close' in data || 'status' in data) {
    return batch.length === 1 && isQuote(data)
      ? [{ instrument: batch[0], symbol: symbols[0], quote: data }]
      : [];
  }

  const batchResponse = data as Record<string, TwelveQuote>;
  return batch.flatMap((instrument, index) => {
    const symbol = symbols[index];
    const quote = batchResponse[symbol];
    return isQuote(quote) ? [{ instrument, symbol, quote }] : [];
  });
}

export const twelveDataAdapter: ProviderAdapter = {
  id: 'twelve-data',
  async collect(request) {
    const startedAt = new Date().toISOString();
    const apiKey = readApiKey(request.config.apiKeyEnv);
    if (!apiKey) return skippedResult(request, startedAt, keyMissingMessage(request));

    const observations = [];
    let failures = 0;
    for (const batch of chunked(request.instruments, request.config.budget.symbolsPerRequest)) {
      const symbols = batch.map((item) => providerSymbol(item, request.config.id));
      const url = new URL('/quote', request.config.baseUrl);
      url.searchParams.set('symbol', symbols.join(','));
      url.searchParams.set('apikey', apiKey);

      try {
        const data = await fetchProviderJson<TwelveQuote | Record<string, TwelveQuote>>(
          url.toString(),
          { signal: request.signal, timeoutMs: request.config.budget.requestTimeoutMs }
        );
        const receivedAt = new Date().toISOString();
        for (const { instrument, symbol, quote } of quoteMap(data, batch, symbols)) {
          if (quote.status === 'error') continue;
          const price = finiteNumber(quote.close);
          const bid = finiteNumber(quote.bid);
          const ask = finiteNumber(quote.ask);
          if (price == null && bid == null && ask == null) continue;
          observations.push(makeObservation({
            config: request.config,
            instrument,
            providerSymbol: symbol,
            price,
            bid,
            ask,
            currency: quote.currency ?? null,
            observedAt: isoTimestamp(quote.timestamp, 'seconds') ?? isoTimestamp(quote.datetime),
            receivedAt,
            metadata: {
              previousClose: finiteNumber(quote.previous_close),
              change: finiteNumber(quote.change),
              changePct: finiteNumber(quote.percent_change),
            },
          }));
        }
      } catch {
        failures += 1;
      }
    }
    return completedResult(request, startedAt, observations, failures);
  },
};
