'use client';

import useSWR from 'swr';
import type { HistorySeries } from '@/lib/fetchers/yahooHistory';

async function fetcher(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface HistoryState {
  data: Record<string, HistorySeries> | null;
  isLoading: boolean;
  error: string | null;
}

/** Fetch daily close history for a set of Yahoo symbols. Refreshes hourly. */
export function useHistory(symbols: string[], range: string = '1y'): HistoryState {
  const key =
    symbols.length > 0
      ? `/api/history?symbols=${encodeURIComponent(symbols.join(','))}&range=${range}`
      : null;

  const { data: raw, error, isLoading } = useSWR(key, fetcher, {
    refreshInterval: 60 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    data: raw?.data ?? null,
    isLoading,
    error: error?.message ?? raw?.error ?? null,
  };
}
