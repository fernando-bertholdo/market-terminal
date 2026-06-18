'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { findInstrument } from '@/lib/instrumentCatalog';

const STORAGE_KEY = 'terminal.alerts.v1';

export interface PriceAlert {
  id: string;
  instrumentId: string;
  label: string;
  direction: 'above' | 'below';
  level: number;
  createdAt: string;
  triggeredAt: string | null;
  /** value observed when the alert fired */
  triggeredValue: number | null;
}

function loadStored(): PriceAlert[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore unavailable/corrupt storage.
  }
  return [];
}

/**
 * Price alerts stored in localStorage and evaluated client-side against the
 * latest /api/market payload on every refresh. Pass the live `data` object.
 */
export function useAlerts(marketData: any | null) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const dataRef = useRef(marketData);
  dataRef.current = marketData;

  useEffect(() => {
    setAlerts(loadStored());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // Ignore unavailable storage.
    }
  }, [alerts, hasHydrated]);

  // Evaluate pending alerts whenever fresh market data arrives.
  useEffect(() => {
    if (!marketData) return;
    setAlerts((current) => {
      let changed = false;
      const next = current.map((alert) => {
        if (alert.triggeredAt) return alert;
        const instrument = findInstrument(alert.instrumentId);
        const value = instrument?.getValue(marketData) ?? null;
        if (value == null) return alert;
        const fired = alert.direction === 'above' ? value >= alert.level : value <= alert.level;
        if (!fired) return alert;
        changed = true;
        return { ...alert, triggeredAt: new Date().toISOString(), triggeredValue: value };
      });
      return changed ? next : current;
    });
  }, [marketData]);

  const addAlert = useCallback((instrumentId: string, direction: 'above' | 'below', level: number) => {
    const instrument = findInstrument(instrumentId);
    if (!instrument || !isFinite(level)) return;
    setAlerts((current) => [
      ...current,
      {
        id: `${instrumentId}-${Date.now()}`,
        instrumentId,
        label: instrument.label,
        direction,
        level,
        createdAt: new Date().toISOString(),
        triggeredAt: null,
        triggeredValue: null,
      },
    ]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const dismissTriggered = useCallback(() => {
    setAlerts((current) => current.filter((alert) => !alert.triggeredAt));
  }, []);

  const pending = alerts.filter((alert) => !alert.triggeredAt);
  const triggered = alerts.filter((alert) => alert.triggeredAt);

  return { alerts, pending, triggered, addAlert, removeAlert, dismissTriggered };
}
