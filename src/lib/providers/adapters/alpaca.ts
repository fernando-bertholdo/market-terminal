import { fetchProviderJson } from '../http';
import { chunked, finiteNumber, isoTimestamp, makeObservation, providerSymbol } from '../normalize';
import { completedResult, keyMissingMessage, skippedResult } from '../runtime';
import type { ProviderAdapter } from '../types';

interface AlpacaTrade {
  p?: number;
  s?: number;
  t?: string;
  x?: string;
}

interface AlpacaQuote {
  ap?: number;
  as?: number;
  bp?: number;
  bs?: number;
  t?: string;
  ax?: string;
  bx?: string;
}

interface AlpacaTradesResponse {
  trades?: Record<string, AlpacaTrade>;
}

interface AlpacaQuotesResponse {
  quotes?: Record<string, AlpacaQuote>;
}

export const alpacaAdapter: ProviderAdapter = {
  id: 'alpaca',
  async collect(request) {
    const startedAt = new Date().toISOString();
    const keyId = process.env.ALPACA_API_KEY_ID?.trim();
    const secret = process.env.ALPACA_API_SECRET_KEY?.trim();
    if (!keyId || !secret) return skippedResult(request, startedAt, keyMissingMessage(request));

    const instruments = request.instruments.filter(
      (item) => item.assetClass === 'equity' || item.assetClass === 'etf'
    );
    const observations = [];
    let failures = 0;
    const headers = {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secret,
    };

    for (const batch of chunked(instruments, request.config.budget.symbolsPerRequest)) {
      const symbols = batch.map((item) => providerSymbol(item, request.config.id));
      const query = new URLSearchParams({ symbols: symbols.join(','), feed: 'iex' });
      const tradesUrl = `${request.config.baseUrl}/v2/stocks/trades/latest?${query}`;
      const quotesUrl = `${request.config.baseUrl}/v2/stocks/quotes/latest?${query}`;
      const settled = await Promise.allSettled([
        fetchProviderJson<AlpacaTradesResponse>(tradesUrl, {
          headers,
          signal: request.signal,
          timeoutMs: request.config.budget.requestTimeoutMs,
        }),
        fetchProviderJson<AlpacaQuotesResponse>(quotesUrl, {
          headers,
          signal: request.signal,
          timeoutMs: request.config.budget.requestTimeoutMs,
        }),
      ]);
      failures += settled.filter((item) => item.status === 'rejected').length;
      const trades = settled[0].status === 'fulfilled' ? settled[0].value.trades ?? {} : {};
      const quotes = settled[1].status === 'fulfilled' ? settled[1].value.quotes ?? {} : {};
      const receivedAt = new Date().toISOString();

      for (let index = 0; index < batch.length; index += 1) {
        const instrument = batch[index];
        const symbol = symbols[index];
        const trade = trades[symbol];
        const quote = quotes[symbol];
        if (trade && finiteNumber(trade.p) != null) {
          observations.push(makeObservation({
            config: request.config,
            instrument,
            providerSymbol: symbol,
            kind: 'trade',
            price: finiteNumber(trade.p),
            observedAt: isoTimestamp(trade.t),
            receivedAt,
            metadata: {
              size: finiteNumber(trade.s),
              exchange: trade.x ?? null,
              feed: 'iex',
            },
          }));
        }
        if (quote && (finiteNumber(quote.bp) != null || finiteNumber(quote.ap) != null)) {
          observations.push(makeObservation({
            config: request.config,
            instrument,
            providerSymbol: symbol,
            kind: 'quote',
            bid: finiteNumber(quote.bp),
            ask: finiteNumber(quote.ap),
            observedAt: isoTimestamp(quote.t),
            receivedAt,
            metadata: {
              bidSize: finiteNumber(quote.bs),
              askSize: finiteNumber(quote.as),
              bidExchange: quote.bx ?? null,
              askExchange: quote.ax ?? null,
              feed: 'iex',
            },
          }));
        }
      }
    }

    return completedResult({ ...request, instruments }, startedAt, observations, failures);
  },
};
