import { fetchProviderJson } from '../http';
import { chunked, finiteNumber, isoTimestamp, makeObservation, providerSymbol } from '../normalize';
import { completedResult, keyMissingMessage, readApiKey, skippedResult } from '../runtime';
import type { ProviderAdapter, ProviderInstrument } from '../types';

interface TiingoQuote {
  ticker?: string;
  timestamp?: string;
  quoteTimestamp?: string;
  last?: number;
  prevClose?: number;
  bidPrice?: number;
  askPrice?: number;
  midPrice?: number;
}

async function collectTiingoGroup(
  request: Parameters<ProviderAdapter['collect']>[0],
  apiKey: string,
  instruments: readonly ProviderInstrument[],
  endpoint: string,
  observations: ReturnType<typeof makeObservation>[]
): Promise<number> {
  let failures = 0;
  for (const batch of chunked(instruments, request.config.budget.symbolsPerRequest)) {
    const symbols = batch.map((item) => providerSymbol(item, request.config.id));
    const url = new URL(endpoint, request.config.baseUrl);
    url.searchParams.set('tickers', symbols.join(','));
    try {
      const data = await fetchProviderJson<TiingoQuote[]>(url.toString(), {
        signal: request.signal,
        timeoutMs: request.config.budget.requestTimeoutMs,
        headers: { Authorization: `Token ${apiKey}` },
      });
      const receivedAt = new Date().toISOString();
      const bySymbol = new Map(data.map((quote) => [quote.ticker?.toUpperCase(), quote]));
      for (let index = 0; index < batch.length; index += 1) {
        const instrument = batch[index];
        const symbol = symbols[index];
        const quote = bySymbol.get(symbol.toUpperCase());
        if (!quote) continue;
        const price = finiteNumber(quote.last);
        const bid = finiteNumber(quote.bidPrice);
        const ask = finiteNumber(quote.askPrice);
        if (price == null && bid == null && ask == null) continue;
        observations.push(makeObservation({
          config: request.config,
          instrument,
          providerSymbol: symbol,
          price,
          bid,
          ask,
          mid: finiteNumber(quote.midPrice),
          observedAt: isoTimestamp(quote.quoteTimestamp) ?? isoTimestamp(quote.timestamp),
          receivedAt,
          metadata: { previousClose: finiteNumber(quote.prevClose), endpoint },
        }));
      }
    } catch {
      failures += 1;
    }
  }
  return failures;
}

export const tiingoAdapter: ProviderAdapter = {
  id: 'tiingo',
  async collect(request) {
    const startedAt = new Date().toISOString();
    const apiKey = readApiKey(request.config.apiKeyEnv);
    if (!apiKey) return skippedResult(request, startedAt, keyMissingMessage(request));

    const fx = request.instruments.filter((item) => item.assetClass === 'fx');
    const iex = request.instruments.filter(
      (item) => item.assetClass === 'equity' || item.assetClass === 'etf'
    );
    const observations: ReturnType<typeof makeObservation>[] = [];
    const failures = (
      await Promise.all([
        collectTiingoGroup(request, apiKey, iex, '/iex/', observations),
        collectTiingoGroup(request, apiKey, fx, '/tiingo/fx/top', observations),
      ])
    ).reduce((sum, value) => sum + value, 0);

    return completedResult(request, startedAt, observations, failures);
  },
};
