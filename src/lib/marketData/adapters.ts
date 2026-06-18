import type { B3Snapshot } from '@/lib/fetchers/b3';
import type { YahooQuoteResult } from '@/lib/fetchers/yahoo';
import { mappingForYahooSymbol } from './instruments';
import type { MarketObservation } from './types';

export function yahooQuotesToObservations(
  quotes: Map<string, YahooQuoteResult>,
  receivedAt = new Date().toISOString()
): MarketObservation[] {
  return Array.from(quotes.entries()).flatMap(([symbol, quote]) => {
    const mapping = mappingForYahooSymbol(symbol);
    if (!mapping) return [];
    return [{
      instrumentId: mapping.instrumentId,
      providerId: 'yahoo',
      sourceSymbol: symbol,
      value: quote.price,
      sourceTimestamp: quote.marketTime,
      receivedAt,
      expectedDelayMs: 15 * 60_000,
      kind: 'DIRECT' as const,
      unit: mapping.unit,
      metadata: {
        previousClose: quote.previousClose,
        changePct: quote.changePct,
        currency: quote.currency,
      },
    }];
  });
}

export function b3SnapshotsToObservations(
  snapshots: Map<string, B3Snapshot>
): MarketObservation[] {
  return Array.from(snapshots.values()).flatMap((snapshot) => {
    if (!snapshot.status.ok || snapshot.current == null) return [];
    const family =
      snapshot.symbol.startsWith('DI1') ? 'DI1' :
      snapshot.symbol.startsWith('DDI') ? 'DDI' :
      snapshot.symbol.startsWith('DAP') ? 'DAP' :
      snapshot.symbol.startsWith('DOL') ? 'DOL' :
      snapshot.symbol.startsWith('WDO') ? 'WDO' :
      snapshot.symbol.startsWith('IND') ? 'IND' :
      snapshot.symbol.startsWith('WIN') ? 'WIN' :
      'B3';
    const isRate = ['DI1', 'DDI', 'DAP'].includes(family);
    return [{
      instrumentId: `B3:${family}:${snapshot.symbol}`,
      providerId: 'b3',
      sourceSymbol: snapshot.symbol,
      value: snapshot.current,
      open: snapshot.open,
      high: snapshot.max,
      low: snapshot.min,
      average: snapshot.avg,
      sourceTimestamp: null,
      receivedAt: snapshot.receivedAt,
      expectedDelayMs: 60_000,
      // The public endpoint exposes no exchange timestamp, so freshness cannot
      // be proven from receipt time alone.
      kind: 'INDICATIVE' as const,
      unit: isRate ? '%' : family === 'DOL' || family === 'WDO' ? 'BRL/1000USD' : 'points',
      metadata: {
        changePct: snapshot.change,
        status: snapshot.status.code,
      },
    }];
  });
}
