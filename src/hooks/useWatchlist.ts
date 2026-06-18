'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_WATCHLIST_IDS, findInstrument } from '@/lib/instrumentCatalog';

const STORAGE_KEY = 'terminal.watchlist.v1';

function sanitize(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [...DEFAULT_WATCHLIST_IDS];
  const valid = ids.filter((id): id is string => typeof id === 'string' && Boolean(findInstrument(id)));
  return valid.length > 0 ? valid : [...DEFAULT_WATCHLIST_IDS];
}

export function useWatchlist() {
  const [ids, setIds] = useState<string[]>([...DEFAULT_WATCHLIST_IDS]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setIds(sanitize(JSON.parse(stored)));
    } catch {
      // Ignore unavailable/corrupt storage.
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Ignore unavailable storage.
    }
  }, [ids, hasHydrated]);

  const add = useCallback((id: string) => {
    if (!findInstrument(id)) return;
    setIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const remove = useCallback((id: string) => {
    setIds((current) => current.filter((item) => item !== id));
  }, []);

  const move = useCallback((id: string, direction: -1 | 1) => {
    setIds((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => setIds([...DEFAULT_WATCHLIST_IDS]), []);

  return { ids, add, remove, move, resetDefaults };
}
