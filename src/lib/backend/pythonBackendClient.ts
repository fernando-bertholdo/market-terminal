import type { NewsFetchResult } from '@/lib/fetchers/news';
import type { YahooQuoteResult } from '@/lib/fetchers/yahoo';
import type { HistorySeries } from '@/lib/fetchers/yahooHistory';

function backendUrl(): string | null {
  return (
    process.env.ATLAS_BACKEND_URL?.trim() ||
    process.env.MODEL_ENGINE_URL?.trim() ||
    ''
  ).replace(/\/$/, '') || null;
}

function backendToken(): string {
  return process.env.ATLAS_BACKEND_TOKEN || process.env.MODEL_ENGINE_TOKEN || '';
}

function backendTimeoutMs(): number {
  return Number(process.env.ATLAS_BACKEND_TIMEOUT_MS ?? process.env.MODEL_ENGINE_TIMEOUT_MS ?? 8_000);
}

export function isPythonBackendConfigured(): boolean {
  return Boolean(backendUrl());
}

export function isPythonBackendRequired(): boolean {
  return (
    process.env.ATLAS_BACKEND_REQUIRED === 'true' ||
    process.env.ATLAS_BACKEND_REQUIRED === '1' ||
    process.env.MODEL_ENGINE_REQUIRED === 'true' ||
    process.env.MODEL_ENGINE_REQUIRED === '1'
  );
}

export async function fetchPythonNews(): Promise<NewsFetchResult | null> {
  const url = backendUrl();
  if (!url) return null;

  const token = backendToken();
  const res = await fetch(`${url}/news`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
    signal: AbortSignal.timeout(backendTimeoutMs()),
  });
  if (!res.ok) {
    throw new Error(`Python backend /news HTTP ${res.status}: ${await res.text()}`);
  }
  const payload = await res.json();
  return {
    items: (payload.items ?? []).map((item: any) => ({
      ...item,
      publishedAt: new Date(item.publishedAt),
    })),
    sources: payload.sources ?? {},
    intelligence: payload.intelligence ?? {
      asOf: new Date().toISOString(),
      itemCount: 0,
      classifiedCount: 0,
      assets: {},
      factors: {},
    },
    freshness: payload.freshness ?? {
      ttlMs: 0,
      staleIfErrorMs: 0,
      oldestSourceAgeMs: null,
      newestPublishedAt: null,
    },
    classification: payload.classification ?? {
      mode: 'fallback',
      mlEnabled: false,
      mlConfigured: false,
      mlAttempted: false,
      mlSuccess: false,
      requestedItems: payload.items?.length ?? 0,
      sentItems: 0,
      mlClassifiedItems: 0,
      fallbackItems: payload.items?.length ?? 0,
      maxItemsPerBatch: 0,
      durationMs: null,
      error: 'Python backend did not return classification status',
      httpStatus: null,
    },
  };
}

async function fetchPythonJson<T>(path: string): Promise<T | null> {
  const url = backendUrl();
  if (!url) return null;

  const token = backendToken();
  const res = await fetch(`${url}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
    signal: AbortSignal.timeout(backendTimeoutMs()),
  });
  if (!res.ok) {
    throw new Error(`Python backend ${path} HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json() as T;
}

export async function fetchPythonHistory(
  symbols: string[],
  range: string
): Promise<Record<string, HistorySeries> | null> {
  const params = new URLSearchParams({
    symbols: symbols.join(','),
    range,
  });
  const payload = await fetchPythonJson<{ data?: Record<string, HistorySeries> }>(`/history?${params}`);
  return payload?.data ?? null;
}

export interface PythonMarketPayload {
  mode?: string;
  yahoo?: Record<string, YahooQuoteResult>;
  bcb?: Record<string, { value: number; date: string }>;
  ptax?: Record<string, unknown>;
  fred?: Record<string, { current: number; previous: number; date: string }>;
  b3?: Record<string, unknown>;
}

export async function fetchPythonMarket(params: {
  symbols?: string[];
  bcb?: string[];
  fred?: string[];
  includePtax?: boolean;
  includeB3?: boolean;
}): Promise<PythonMarketPayload | null> {
  const search = new URLSearchParams({
    symbols: (params.symbols ?? []).join(','),
    bcb: (params.bcb ?? []).join(','),
    fred: (params.fred ?? []).join(','),
    includePtax: params.includePtax ? 'true' : 'false',
    includeB3: params.includeB3 ? 'true' : 'false',
  });
  return await fetchPythonJson<PythonMarketPayload>(`/market?${search}`);
}

export async function fetchPythonEarningsRisks<T>(symbols: string[]): Promise<Record<string, T> | null> {
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  const payload = await fetchPythonJson<{ data?: Record<string, T> }>(`/earnings?${params}`);
  return payload?.data ?? null;
}

export async function fetchPythonMacro<T>(): Promise<T | null> {
  const payload = await fetchPythonJson<{ data?: T }>('/macro');
  return payload?.data ?? null;
}

export async function fetchPythonTerminalMarket<T>(): Promise<{
  data: T;
  sources: Record<string, unknown>;
} | null> {
  return await fetchPythonJson<{ data: T; sources: Record<string, unknown> }>('/market/terminal');
}
