'use client';

import useSWR from 'swr';

async function fetcher(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface MacroState {
  data: any | null;
  isLoading: boolean;
  error: string | null;
}

/** Macro dashboard data — slow-moving, refreshes every 10 minutes. */
export function useMacro(): MacroState {
  const { data: raw, error, isLoading } = useSWR('/api/macro', fetcher, {
    refreshInterval: 10 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    data: raw?.data ?? null,
    isLoading,
    error: error?.message ?? raw?.error ?? null,
  };
}
