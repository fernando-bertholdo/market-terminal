// GET /api/history?symbols=BRL=X,CL=F&range=1y
// Returns daily close history per symbol from Yahoo Finance.
// Used by the analytics panel and charts. Cached 1h server-side per symbol.

import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooHistories, type HistorySeries } from '@/lib/fetchers/yahooHistory';

export const dynamic = 'force-dynamic';

const ALLOWED_RANGES = new Set(['3mo', '6mo', '1y', '2y', '5y']);
const MAX_SYMBOLS = 20;

export async function GET(req: NextRequest) {
  const fetchedAt = new Date().toISOString();
  const params = req.nextUrl.searchParams;
  const symbols = (params.get('symbols') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS);
  const range = ALLOWED_RANGES.has(params.get('range') ?? '') ? params.get('range')! : '1y';

  if (symbols.length === 0) {
    return NextResponse.json(
      { data: null, fetchedAt, error: 'No symbols provided' },
      { status: 400 }
    );
  }

  const histories = await fetchYahooHistories(symbols, range);
  const data: Record<string, HistorySeries> = {};
  for (const [symbol, series] of Array.from(histories.entries())) {
    data[symbol] = series;
  }

  return NextResponse.json({ data, fetchedAt, error: null });
}
