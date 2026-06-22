import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getHeadRuntimeStatus } from '@/lib/news/head';
import { getMlClassifierRuntimeStatus } from '@/lib/news/mlClassifier';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function envFlag(name: string): boolean {
  const value = process.env[name];
  return value === 'true' || value === '1';
}

function safeServiceLabel(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}

async function probeHealth(serviceUrl: string | null, timeoutMs: number) {
  if (!serviceUrl) {
    return {
      ok: false,
      skipped: true,
      statusCode: null,
      latencyMs: null,
      message: 'NEWS_NLP_URL is not configured',
      payload: null,
    };
  }

  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${serviceUrl.replace(/\/+$/, '')}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text.slice(0, 240) };
    }
    return {
      ok: response.ok,
      skipped: false,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      message: response.ok ? null : text.slice(0, 240),
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      statusCode: null,
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : 'unknown health probe error',
      payload: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function tableExists(sql: any, table: string): Promise<boolean> {
  const rows = await sql`SELECT to_regclass(${`public.${table}`}) AS name` as Array<{ name: string | null }>;
  return Boolean(rows[0]?.name);
}

async function loadDatabaseStatus() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return {
      configured: false,
      ok: false,
      error: 'DATABASE_URL is not configured',
      forward: { tableExists: false, rows: null, latestPublishedAt: null, latestObservedAt: null },
      headWeights: { tableExists: false, updatedAt: null, generatedAt: null, source: null, rows: null, headlines: null, assetModels: null },
    };
  }

  try {
    const sql = neon(url);
    const [hasForward, hasHeadWeights] = await Promise.all([
      tableExists(sql, 'news_forward'),
      tableExists(sql, 'head_weights'),
    ]);

    const forward = hasForward
      ? await sql`
          SELECT
            count(*)::int AS rows,
            max(published_at)::text AS latest_published_at,
            max(observed_at)::text AS latest_observed_at
          FROM news_forward
        ` as Array<{ rows: number; latest_published_at: string | null; latest_observed_at: string | null }>
      : [];

    const headColumnRows = hasHeadWeights
      ? await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'head_weights'
        ` as Array<{ column_name: string }>
      : [];
    const headColumns = new Set(headColumnRows.map((row) => String(row.column_name)));
    const hasUpdatedAt = headColumns.has('updated_at');
    const head = hasHeadWeights
      ? hasUpdatedAt
        ? await sql`SELECT weights, updated_at::text AS updated_at FROM head_weights WHERE id = 'current'` as Array<{ weights: unknown; updated_at: string | null }>
        : await sql`SELECT weights, NULL::text AS updated_at FROM head_weights WHERE id = 'current'` as Array<{ weights: unknown; updated_at: string | null }>
      : [];

    const weights = head[0]?.weights as
      | { generatedAt?: string; source?: string; rows?: number; headlines?: number; assets?: Record<string, unknown> }
      | undefined;

    return {
      configured: true,
      ok: true,
      error: null,
      forward: {
        tableExists: hasForward,
        rows: forward[0]?.rows ?? null,
        latestPublishedAt: forward[0]?.latest_published_at ?? null,
        latestObservedAt: forward[0]?.latest_observed_at ?? null,
      },
      headWeights: {
        tableExists: hasHeadWeights,
        updatedAt: head[0]?.updated_at ?? null,
        generatedAt: weights?.generatedAt ?? null,
        source: weights?.source ?? null,
        rows: typeof weights?.rows === 'number' ? weights.rows : null,
        headlines: typeof weights?.headlines === 'number' ? weights.headlines : null,
        assetModels: weights?.assets ? Object.keys(weights.assets).length : null,
      },
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown database status error',
      forward: { tableExists: false, rows: null, latestPublishedAt: null, latestObservedAt: null },
      headWeights: { tableExists: false, updatedAt: null, generatedAt: null, source: null, rows: null, headlines: null, assetModels: null },
    };
  }
}

export async function GET() {
  const runtime = getMlClassifierRuntimeStatus();
  const serviceUrl = runtime.serviceUrl;
  const healthTimeoutMs = (() => {
    const value = Number(process.env.NEWS_NLP_HEALTH_TIMEOUT_MS);
    return Number.isFinite(value) ? Math.min(10_000, Math.max(500, value)) : 3_000;
  })();

  const [health, database] = await Promise.all([
    probeHealth(serviceUrl, healthTimeoutMs),
    loadDatabaseStatus(),
  ]);

  const head = getHeadRuntimeStatus();
  const usingTrainedWeights = head.source === 'database' || Boolean(database.headWeights.generatedAt);
  const lastSuccessAt = runtime.lastSuccessAt ? Date.parse(runtime.lastSuccessAt) : 0;
  const lastFailureAt = runtime.lastFailureAt ? Date.parse(runtime.lastFailureAt) : 0;
  const classifierHealthy = runtime.attempts === 0 || lastSuccessAt > lastFailureAt;
  const liveMlHealthy = runtime.enabled && runtime.configured && health.ok && classifierHealthy;
  const mode = !runtime.enabled
    ? 'disabled'
    : !runtime.configured
      ? 'unconfigured'
      : liveMlHealthy
        ? usingTrainedWeights
          ? 'ml-trained'
          : 'ml-seed'
        : 'fallback';

  return NextResponse.json(
    {
      data: {
        asOf: new Date().toISOString(),
        mode,
        flags: {
          mlEnabled: envFlag('NEWS_ML_ENABLED'),
          forwardEnabled: envFlag('NEWS_FORWARD_ENABLED'),
          headEnabled: envFlag('NEWS_HEAD_ENABLED'),
        },
        service: {
          url: safeServiceLabel(serviceUrl),
          timeoutMs: runtime.timeoutMs,
          healthTimeoutMs,
          health,
          runtime,
        },
        database,
        head,
      },
      fetchedAt: new Date().toISOString(),
      error: null,
    },
    { headers: NO_STORE_HEADERS }
  );
}
