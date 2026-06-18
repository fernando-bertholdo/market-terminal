'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import type { SourceStatus } from '@/types/market';

const STALE_THRESHOLD_MS = 15_000;

async function fetcher(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export interface MarketDataState {
  data: any | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  refreshInterval: number;
  sources: Record<string, SourceStatus> | null;
  error: string | null;
  refresh: () => void;
}

export function useMarketData(refreshInterval: number = 3_000): MarketDataState {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: raw, error, isLoading, mutate } = useSWR(
    '/api/market',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1_000,
      onSuccess: () => {
        setLastUpdated(new Date());
      },
    }
  );

  const isStale =
    lastUpdated !== null
      ? Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS
      : false;

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // raw is the full ApiResponse; expose the inner data object
  const data = raw?.data ?? raw ?? null;

  return {
    data,
    isLoading,
    isStale,
    lastUpdated,
    refreshInterval,
    sources: raw?.sources ?? null,
    error: error?.message ?? raw?.error ?? null,
    refresh,
  };
}
