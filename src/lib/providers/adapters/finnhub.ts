import { fetchProviderJson } from '../http';
import { finiteNumber, isoTimestamp, makeObservation, providerSymbol } from '../normalize';
import { completedResult, keyMissingMessage, readApiKey, skippedResult } from '../runtime';
import type { ProviderAdapter } from '../types';

interface FinnhubQuote {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
}

export const finnhubAdapter: ProviderAdapter = {
  id: 'finnhub',
  async collect(request) {
    const startedAt = new Date().toISOString();
    const apiKey = readApiKey(request.config.apiKeyEnv);
    if (!apiKey) return skippedResult(request, startedAt, keyMissingMessage(request));

    const settled = await Promise.allSettled(request.instruments.map(async (instrument) => {
      const symbol = providerSymbol(instrument, request.config.id);
      const url = new URL('/api/v1/quote', request.config.baseUrl);
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('token', apiKey);
      const quote = await fetchProviderJson<FinnhubQuote>(url.toString(), {
        signal: request.signal,
        timeoutMs: request.config.budget.requestTimeoutMs,
      });
      const price = finiteNumber(quote.c);
      if (price == null || price === 0) return null;
      return makeObservation({
        config: request.config,
        instrument,
        providerSymbol: symbol,
        price,
        observedAt: isoTimestamp(quote.t, 'seconds'),
        receivedAt: new Date().toISOString(),
        metadata: {
          change: finiteNumber(quote.d),
          changePct: finiteNumber(quote.dp),
          previousClose: finiteNumber(quote.pc),
          open: finiteNumber(quote.o),
          high: finiteNumber(quote.h),
          low: finiteNumber(quote.l),
        },
      });
    }));

    const observations = settled.flatMap((item) =>
      item.status === 'fulfilled' && item.value ? [item.value] : []
    );
    const failures = settled.filter(
      (item) => item.status === 'rejected' || item.value == null
    ).length;
    return completedResult(request, startedAt, observations, failures);
  },
};
