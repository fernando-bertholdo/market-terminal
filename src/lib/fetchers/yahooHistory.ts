// ─── Yahoo Finance History Fetcher ────────────────────────────────────────────
// Server-side only. Fetches daily OHLC history from the Yahoo v8 chart API.
// Used by /api/history and the quant simulator backtest engine.
import { fetchWithTimeout } from './http';

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export interface HistoryBar {
  date: string;   // "YYYY-MM-DD"
  close: number;
}

export interface HistorySeries {
  symbol: string;
  bars: HistoryBar[];
}

interface YfChartResponse {
  chart: {
    result: Array<{
      timestamp?: number[];
      indicators: { quote: Array<{ close: Array<number | null> }> };
    }> | null;
    error: { message: string } | null;
  };
}

/**
 * Fetch daily closes for a symbol.
 * @param range Yahoo range string: "3mo" | "6mo" | "1y" | "2y" | "5y"
 */
export async function fetchYahooHistory(
  symbol: string,
  range: string = '2y'
): Promise<HistorySeries | null> {
  const url = `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=${encodeURIComponent(range)}`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: YF_HEADERS,
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`[YahooHistory] HTTP ${res.status} for ${symbol}`);
      return null;
    }

    const json: YfChartResponse = await res.json();
    const result = json.chart.result?.[0];
    if (json.chart.error || !result?.timestamp) {
      console.error(`[YahooHistory] No data for ${symbol}:`, json.chart.error?.message);
      return null;
    }

    const closes = result.indicators.quote[0]?.close ?? [];
    const bars: HistoryBar[] = [];
    for (let i = 0; i < result.timestamp.length; i += 1) {
      const close = closes[i];
      if (close == null || isNaN(close)) continue;
      bars.push({
        date: new Date(result.timestamp[i] * 1000).toISOString().slice(0, 10),
        close,
      });
    }

    if (bars.length === 0) return null;
    return { symbol, bars };
  } catch (err) {
    console.error(`[YahooHistory] Fetch error for ${symbol}:`, err);
    return null;
  }
}

export async function fetchYahooHistories(
  symbols: string[],
  range: string = '2y'
): Promise<Map<string, HistorySeries>> {
  const results = await Promise.allSettled(
    symbols.map((symbol) => fetchYahooHistory(symbol, range))
  );

  const map = new Map<string, HistorySeries>();
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      map.set(result.value.symbol, result.value);
    }
  }
  return map;
}
