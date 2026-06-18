// GET /api/news
// Returns aggregated headlines from Bloomberg RSS and Google News.
// Runtime route; client SWR refreshes every 120 seconds.

import { NextResponse } from 'next/server';
import { fetchNewsHeadlines } from '@/lib/fetchers/news';
import type { NewsApiResponse } from '@/types/market';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(): Promise<NextResponse<NewsApiResponse>> {
  const fetchedAt = new Date().toISOString();

  try {
    const result = await fetchNewsHeadlines();

    return NextResponse.json(
      {
        data: result.items,
        fetchedAt,
        error: result.items.length > 0 ? null : 'News data is temporarily unavailable',
        sources: result.sources,
        intelligence: result.intelligence,
        freshness: result.freshness,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[/api/news] Unhandled error:', err);

    return NextResponse.json(
      {
        data: [],
        fetchedAt,
        error: 'News data is temporarily unavailable',
        sources: {
          news: {
            ok: false,
            label: 'NEWS',
            message: 'Unavailable',
            stale: false,
            cache: 'miss',
            fetchedAt: null,
            lastSuccessAt: null,
            ageMs: null,
            itemCount: 0,
            invalidItemCount: 0,
          },
        },
        intelligence: {
          asOf: fetchedAt,
          itemCount: 0,
          classifiedCount: 0,
          assets: {},
          factors: {},
        },
        freshness: {
          ttlMs: 0,
          staleIfErrorMs: 0,
          oldestSourceAgeMs: null,
          newestPublishedAt: null,
        },
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }
}
