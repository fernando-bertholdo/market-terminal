'use client';

import useSWR from 'swr';

async function fetcher(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export function useNewsMlStatus(refreshInterval: number = 30_000) {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/news/ml-status', fetcher, {
    refreshInterval,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10_000,
    errorRetryCount: 2,
    errorRetryInterval: 10_000,
  });

  return {
    data: data?.data ?? null,
    error: error?.message ?? data?.error ?? null,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    refresh: mutate,
  };
}
