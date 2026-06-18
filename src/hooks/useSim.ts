'use client';

import { useCallback, useEffect } from 'react';
import useSWR from 'swr';

async function fetcher(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface SimState {
  data: any | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  reset: () => Promise<void>;
  rebalance: () => Promise<void>;
}

export function useSim(refreshInterval: number = 60_000): SimState {
  const { data: raw, error, isLoading, mutate } = useSWR('/api/sim', fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const postAction = useCallback(
    async (action: 'reset' | 'rebalance' | 'tick') => {
      const res = await fetch('/api/sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const json = await res.json();
        mutate(json, { revalidate: false });
      }
    },
    [mutate]
  );

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      await mutate();
    };
    void tick();
    const timer = window.setInterval(() => void tick(), refreshInterval);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mutate, refreshInterval]);

  return {
    data: raw?.data ?? null,
    isLoading,
    error: error?.message ?? raw?.error ?? null,
    refresh,
    reset: () => postAction('reset'),
    rebalance: () => postAction('rebalance'),
  };
}
