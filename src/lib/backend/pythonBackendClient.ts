import type { NewsFetchResult } from '@/lib/fetchers/news';

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
  };
}
