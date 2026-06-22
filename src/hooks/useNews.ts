'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import type { NewsItem, SourceStatus } from '@/types/market';

async function fetcher(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

function parseItems(raw: any[]): NewsItem[] {
  return raw.map((item: any) => ({
    ...item,
    publishedAt: new Date(item.publishedAt),
  }));
}

export interface NewsState {
  items: NewsItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  source: SourceStatus | null;
  sources: Record<string, SourceStatus>;
  error: string | null;
  fetchedAt: Date | null;
  newestPublishedAt: Date | null;
  headlineAgeSeconds: number | null;
  intelligence: any | null;
  freshness: any | null;
  classification: any | null;
  refreshInterval: number;
  refresh: () => void;
}

export function useNews(refreshInterval: number = 30_000): NewsState {
  const [items, setItems] = useState<NewsItem[]>([]);

  const { data: raw, error, isLoading, isValidating, mutate } = useSWR('/api/news', fetcher, {
    refreshInterval,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10_000,
    errorRetryCount: 3,
    errorRetryInterval: 5_000,
  });

  useEffect(() => {
    if (!raw) return;

    // Support both { data: [...] } and plain array responses
    const rawArray: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : [];

    setItems(parseItems(rawArray).slice(0, 50));
  }, [raw]);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const sources = raw?.sources ?? {};
  const newestPublishedAt = raw?.freshness?.newestPublishedAt
    ? new Date(raw.freshness.newestPublishedAt)
    : items[0]?.publishedAt ?? null;

  return {
    items,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    source: sources.news ?? null,
    sources,
    error: error?.message ?? raw?.error ?? null,
    fetchedAt: raw?.fetchedAt ? new Date(raw.fetchedAt) : null,
    newestPublishedAt,
    headlineAgeSeconds:
      newestPublishedAt
        ? Math.max(0, (Date.now() - newestPublishedAt.getTime()) / 1000)
        : null,
    intelligence: raw?.intelligence ?? null,
    freshness: raw?.freshness ?? null,
    classification: raw?.classification ?? null,
    refreshInterval,
    refresh,
  };
}
