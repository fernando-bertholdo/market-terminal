// ─── Yahoo Finance Fetcher ────────────────────────────────────────────────────
// Server-side only. Calls Yahoo Finance v8 chart API directly with fetch().
// No API key required. Must be called from Next.js API routes, not the browser.
import { fetchWithTimeout } from './http';

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Headers that Yahoo Finance expects to avoid bot detection
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export interface YahooQuoteResult {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  currency: string;
  marketTime: string | null;
}

interface YfMeta {
  symbol: string;
  regularMarketPrice: number;
  regularMarketTime?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
}

interface YfResponse {
  chart: {
    result: Array<{
      meta: YfMeta;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }> | null;
    error: { message: string } | null;
  };
}

const MAX_META_STALENESS_SECONDS = 7 * 24 * 60 * 60;

function latestChartCloses(
  result: NonNullable<YfResponse['chart']['result']>[number]
): Array<{ timestamp: number; close: number }> {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points: Array<{ timestamp: number; close: number }> = [];

  for (let i = 0; i < Math.min(timestamps.length, closes.length); i += 1) {
    const close = closes[i];
    if (close != null && Number.isFinite(close)) {
      points.push({ timestamp: timestamps[i], close });
    }
  }
  return points;
}

export async function fetchYahooQuote(ticker: string): Promise<YahooQuoteResult | null> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=5d`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: YF_HEADERS,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error(`[Yahoo] HTTP ${res.status} for ticker ${ticker}`);
      return null;
    }

    const json: YfResponse = await res.json();

    if (json.chart.error || !json.chart.result?.[0]) {
      console.error(`[Yahoo] No data for ticker ${ticker}:`, json.chart.error?.message);
      return null;
    }

    const result = json.chart.result[0];
    const meta = result.meta;
    const chartPoints = latestChartCloses(result);
    const latestChartPoint = chartPoints[chartPoints.length - 1];
    const previousChartPoint = chartPoints[chartPoints.length - 2];
    const metaIsStale =
      latestChartPoint != null &&
      (meta.regularMarketTime == null ||
        latestChartPoint.timestamp - meta.regularMarketTime > MAX_META_STALENESS_SECONDS);
    const price = metaIsStale ? latestChartPoint.close : meta.regularMarketPrice;

    if (price == null) {
      console.error(`[Yahoo] No regularMarketPrice for ticker ${ticker}`);
      return null;
    }

    const prevClose = metaIsStale
      ? previousChartPoint?.close ?? latestChartPoint?.close ?? price
      : meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = meta.regularMarketChange ?? (price - prevClose);
    const changePct = meta.regularMarketChangePercent ?? ((price - prevClose) / prevClose) * 100;

    return {
      symbol: ticker,
      price,
      previousClose: prevClose,
      change,
      changePct,
      currency: meta.currency ?? 'USD',
      marketTime: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : latestChartPoint
          ? new Date(latestChartPoint.timestamp * 1000).toISOString()
          : null,
    };
  } catch (err) {
    console.error(`[Yahoo] Fetch error for ticker ${ticker}:`, err);
    return null;
  }
}

export async function fetchYahooQuotes(tickers: string[]): Promise<Map<string, YahooQuoteResult>> {
  const results = await Promise.allSettled(
    tickers.map((ticker) => fetchYahooQuote(ticker).then((q) => ({ ticker, q })))
  );

  const map = new Map<string, YahooQuoteResult>();
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.q !== null) {
      map.set(result.value.ticker, result.value.q);
    }
  }
  return map;
}
