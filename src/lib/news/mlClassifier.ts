// ML classification client (Phase 1).
//
// Talks to the external Python NLP micro-service (MT PT->EN -> FinBERT ->
// zero-shot NLI -> ABSA) and adapts its response into the *unchanged*
// `NewsClassification` contract. The service is treated as untrusted: every
// field is validated against the runtime vocab, and any network/timeout/shape
// failure resolves to "no result" so the orchestrator can fall back to regex.
//
// Invariants honoured here:
//  - No LLM and no paid API: the service runs open classifier weights only.
//  - No-lookahead: we send the headline title + its own publishedAt, nothing else.
//  - Contract unchanged: output is a plain `NewsClassification`.

import type {
  NewsClassificationStatus,
  NewsClassification,
  NewsItem,
  NewsSignal,
  NewsTheme,
} from '@/types/market';
import { clamp, deriveTimeDecay } from '@/lib/news/decay';
import {
  createSignalMap,
  finalizeSignals,
  mergeSignal,
  propagateFactorsToAssets,
} from '@/lib/news/graph';
import { isNewsAsset, isNewsFactor, isNewsTheme } from '@/lib/news/vocab';
import { applyHead, buildVector, headEnabled } from '@/lib/news/head';
import type { NewsAsset } from '@/types/market';

type Direction = -1 | 0 | 1;

interface ServiceSignal {
  id: string;
  direction: Direction;
  strength: number;
}

interface ServiceResult {
  id: string;
  region?: unknown;
  themes?: unknown;
  factors?: unknown;
  assets?: unknown;
  relevance?: unknown;
  confidence?: unknown;
  tone?: unknown;
}

interface ServiceResponse {
  results?: ServiceResult[];
}

type NewsRegion = 'br' | 'us';

export interface MlClassifierRuntimeStatus {
  enabled: boolean;
  configured: boolean;
  serviceUrl: string | null;
  timeoutMs: number;
  maxItemsPerBatch: number;
  attempts: number;
  successes: number;
  failures: number;
  requestedItems: number;
  classifiedItems: number;
  fallbackItems: number;
  fallbackRate: number | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastHttpStatus: number | null;
  lastResultCount: number | null;
}

const BR_DOMESTIC_FACTORS = new Set(['rates_br', 'brl', 'inflation']);
const BR_DOMESTIC_ASSETS = new Set(['DI', 'BRL', 'IBOV']);
const GLOBAL_MARKERS =
  /\b(?:fed|federal reserve|treasury|wall street|s&p|nasdaq|dow|united states|estados unidos|eua|u\.?s\.?a?|american|americano|americana|china|chinese|beijing|europe|europa|ecb|global|world|mundial|oil|petróleo|petroleo|crude|brent|wti|gold|ouro|copper|cobre|soy|soja|commodity|commodities|nvidia|nvda|microsoft|msft|apple|amazon|meta|google|alphabet)\b/i;

const ML_ENABLED = process.env.NEWS_ML_ENABLED === 'true' || process.env.NEWS_ML_ENABLED === '1';
const SERVICE_URL = process.env.NEWS_NLP_URL?.replace(/\/+$/, '') ?? '';
const AUTH_TOKEN = process.env.NEWS_NLP_TOKEN ?? '';
const TIMEOUT_MS = (() => {
  const value = Number(process.env.NEWS_NLP_TIMEOUT_MS);
  return Number.isFinite(value) ? Math.min(30_000, Math.max(500, value)) : 8_000;
})();
const MAX_ITEMS_PER_BATCH = (() => {
  const value = Number(process.env.NEWS_ML_MAX_ITEMS);
  return Number.isFinite(value) ? Math.min(50, Math.max(1, Math.floor(value))) : 2;
})();

const runtimeStatus = {
  attempts: 0,
  successes: 0,
  failures: 0,
  requestedItems: 0,
  classifiedItems: 0,
  fallbackItems: 0,
  lastAttemptAt: null as string | null,
  lastSuccessAt: null as string | null,
  lastFailureAt: null as string | null,
  lastError: null as string | null,
  lastHttpStatus: null as number | null,
  lastResultCount: null as number | null,
};

export function mlEnabled(): boolean {
  return ML_ENABLED && SERVICE_URL.length > 0;
}

function baseBatchStatus(items: NewsItem[]): NewsClassificationStatus {
  const mode = !ML_ENABLED ? 'disabled' : !SERVICE_URL ? 'unconfigured' : 'fallback';
  return {
    mode,
    mlEnabled: ML_ENABLED,
    mlConfigured: SERVICE_URL.length > 0,
    mlAttempted: false,
    mlSuccess: false,
    requestedItems: items.length,
    sentItems: 0,
    mlClassifiedItems: 0,
    fallbackItems: items.length,
    maxItemsPerBatch: MAX_ITEMS_PER_BATCH,
    durationMs: null,
    error: mode === 'disabled'
      ? 'NEWS_ML_ENABLED is off'
      : mode === 'unconfigured'
      ? 'NEWS_NLP_URL is not configured'
      : null,
    httpStatus: null,
  };
}

export function getMlClassifierRuntimeStatus(): MlClassifierRuntimeStatus {
  return {
    enabled: ML_ENABLED,
    configured: SERVICE_URL.length > 0,
    serviceUrl: SERVICE_URL || null,
    timeoutMs: TIMEOUT_MS,
    maxItemsPerBatch: MAX_ITEMS_PER_BATCH,
    ...runtimeStatus,
    fallbackRate:
      runtimeStatus.requestedItems > 0
        ? runtimeStatus.fallbackItems / runtimeStatus.requestedItems
        : null,
  };
}

function recordAttempt(itemCount: number): void {
  runtimeStatus.attempts += 1;
  runtimeStatus.requestedItems += itemCount;
  runtimeStatus.lastAttemptAt = new Date().toISOString();
  runtimeStatus.lastError = null;
  runtimeStatus.lastHttpStatus = null;
}

function recordSuccess(itemCount: number, resultCount: number): void {
  runtimeStatus.successes += 1;
  runtimeStatus.classifiedItems += resultCount;
  runtimeStatus.fallbackItems += Math.max(0, itemCount - resultCount);
  runtimeStatus.lastSuccessAt = new Date().toISOString();
  runtimeStatus.lastResultCount = resultCount;
  runtimeStatus.lastHttpStatus = 200;
}

function recordFailure(itemCount: number, error: string, httpStatus: number | null = null): void {
  runtimeStatus.failures += 1;
  runtimeStatus.fallbackItems += itemCount;
  runtimeStatus.lastFailureAt = new Date().toISOString();
  runtimeStatus.lastError = error;
  runtimeStatus.lastHttpStatus = httpStatus;
  runtimeStatus.lastResultCount = null;
}

function toDirection(value: unknown): Direction {
  if (value === 1 || value === -1) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  }
  return 0;
}

function parseSignals(
  raw: unknown,
  isValidId: (id: unknown) => boolean
): ServiceSignal[] {
  if (!Array.isArray(raw)) return [];
  const out: ServiceSignal[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, direction, strength } = entry as Record<string, unknown>;
    if (!isValidId(id)) continue;
    const s = typeof strength === 'number' && Number.isFinite(strength) ? clamp(strength) : 0;
    if (s <= 0) continue;
    out.push({ id: id as string, direction: toDirection(direction), strength: s });
  }
  return out;
}

function parseThemes(raw: unknown): NewsTheme[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<NewsTheme>();
  for (const value of raw) {
    if (isNewsTheme(value)) seen.add(value);
  }
  return [...seen];
}

function parseRegion(raw: unknown): NewsRegion | null {
  return raw === 'br' || raw === 'us' ? raw : null;
}

function isBrazilDomesticOnly(region: NewsRegion | null, title: string): boolean {
  return region === 'br' && !GLOBAL_MARKERS.test(title);
}

// Merge the graph-propagated asset signals (the prior) with the ABSA asset
// signals from the service. Additive: where ABSA is more confident it dominates;
// where the two agree they reinforce.
function combineAssets(
  factors: NewsSignal[],
  absaAssets: ServiceSignal[],
  tone: number,
  relevance: number,
  confidence: number
): NewsSignal[] {
  const graphSignals = propagateFactorsToAssets(factors);

  // Default (head off): graph prior merged with ABSA, as before.
  const map = createSignalMap();
  for (const signal of graphSignals) {
    mergeSignal(map, signal.id, signal.direction, signal.strength);
  }
  for (const signal of absaAssets) {
    mergeSignal(map, signal.id, signal.direction, signal.strength);
  }
  const merged = finalizeSignals<NewsAsset>(map);
  if (!headEnabled()) return merged;

  // Head on: the trained per-asset model produces the final signal from the
  // feature vector. Falls back to the merged graph+ABSA signal for any asset the
  // head can't score.
  const graphSigned = new Map<string, number>(
    graphSignals.map((s) => [s.id, s.direction * s.strength])
  );
  const absaSigned = new Map<string, number>(
    absaAssets.map((s) => [s.id, s.direction * s.strength])
  );
  const mergedById = new Map(merged.map((s) => [s.id, s]));
  const candidates = new Set<string>([...graphSigned.keys(), ...absaSigned.keys()]);

  const out: NewsSignal[] = [];
  for (const id of candidates) {
    if (!isNewsAsset(id)) continue;
    const vector = buildVector(graphSigned.get(id) ?? 0, absaSigned.get(id) ?? 0, tone, relevance, confidence);
    const head = applyHead(id, vector);
    if (head) out.push(head);
    else {
      const fallback = mergedById.get(id);
      if (fallback) out.push(fallback);
    }
  }
  return out.sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
}

function toClassification(result: ServiceResult, item: NewsItem, now: Date): NewsClassification {
  const themes = parseThemes(result.themes);
  const region = parseRegion(result.region);
  const brazilDomesticOnly = isBrazilDomesticOnly(region, item.title);
  const factors: NewsSignal[] = parseSignals(result.factors, isNewsFactor)
    .filter((signal) => !brazilDomesticOnly || BR_DOMESTIC_FACTORS.has(signal.id))
    .map((s) => ({
    id: s.id as NewsSignal['id'],
    direction: s.direction,
    strength: s.strength,
  }));
  const absaAssets = parseSignals(result.assets, isNewsAsset).filter(
    (signal) => !brazilDomesticOnly || BR_DOMESTIC_ASSETS.has(signal.id)
  );

  const { ageMinutes, halfLifeMinutes, decay } = deriveTimeDecay(themes, item.publishedAt, now);
  const relevance =
    typeof result.relevance === 'number' && Number.isFinite(result.relevance)
      ? clamp(result.relevance)
      : 0;
  const confidence =
    typeof result.confidence === 'number' && Number.isFinite(result.confidence)
      ? clamp(result.confidence)
      : 0;
  const tone =
    typeof result.tone === 'number' && Number.isFinite(result.tone)
      ? Math.max(-1, Math.min(1, result.tone))
      : 0;

  const assets = combineAssets(factors, absaAssets, tone, relevance, confidence).filter(
    (signal) => !brazilDomesticOnly || BR_DOMESTIC_ASSETS.has(signal.id)
  );

  return {
    themes,
    factors,
    assets,
    relevance,
    confidence,
    decay,
    ageMinutes,
    halfLifeMinutes,
  };
}

// Classify a batch of headlines via the ML service. Returns a map keyed by item
// id, containing only the items the service successfully classified. Any failure
// (disabled, no URL, timeout, non-200, malformed body) resolves to an empty map
// so callers transparently fall back to the regex classifier.
export async function classifyHeadlinesML(
  items: NewsItem[],
  now: Date
): Promise<Map<string, NewsClassification>> {
  return (await classifyHeadlinesMLDetailed(items, now)).results;
}

export async function classifyHeadlinesMLDetailed(
  items: NewsItem[],
  now: Date
): Promise<{ results: Map<string, NewsClassification>; status: NewsClassificationStatus }> {
  const out = new Map<string, NewsClassification>();
  if (!mlEnabled() || items.length === 0) {
    return { results: out, status: baseBatchStatus(items) };
  }
  const serviceItems = items.slice(0, MAX_ITEMS_PER_BATCH);
  recordAttempt(serviceItems.length);
  const started = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${SERVICE_URL}/classify`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        items: serviceItems.map((item) => ({
          id: item.id,
          title: item.title,
          publishedAt: item.publishedAt.toISOString(),
        })),
      }),
    });

    if (!response.ok) {
      console.error(`[News/ML] Service returned HTTP ${response.status}`);
      recordFailure(serviceItems.length, `HTTP ${response.status}`, response.status);
      return {
        results: out,
        status: {
          ...baseBatchStatus(items),
          mlAttempted: true,
          sentItems: serviceItems.length,
          durationMs: Date.now() - started,
          error: `HTTP ${response.status}`,
          httpStatus: response.status,
        },
      };
    }

    const payload = (await response.json()) as ServiceResponse;
    const byId = new Map(serviceItems.map((item) => [item.id, item]));
    for (const result of payload.results ?? []) {
      const item = result && typeof result.id === 'string' ? byId.get(result.id) : undefined;
      if (!item) continue;
      out.set(item.id, toClassification(result, item, now));
    }
    recordSuccess(serviceItems.length, out.size);
    return {
      results: out,
      status: {
        mode: 'ml',
        mlEnabled: ML_ENABLED,
        mlConfigured: true,
        mlAttempted: true,
        mlSuccess: true,
        requestedItems: items.length,
        sentItems: serviceItems.length,
        mlClassifiedItems: out.size,
        fallbackItems: Math.max(0, items.length - out.size),
        maxItemsPerBatch: MAX_ITEMS_PER_BATCH,
        durationMs: Date.now() - started,
        error: null,
        httpStatus: 200,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    console.error(`[News/ML] Classification request failed (${reason}); falling back to regex`);
    recordFailure(serviceItems.length, reason);
    return {
      results: out,
      status: {
        ...baseBatchStatus(items),
        mlAttempted: true,
        sentItems: serviceItems.length,
        durationMs: Date.now() - started,
        error: reason,
        httpStatus: null,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
