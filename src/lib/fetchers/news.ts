import Parser from 'rss-parser';
import { NEWS_FILTER_KEYWORDS, NEWS_SOURCES } from '@/lib/constants';
import {
  fetchPythonNews,
  isPythonBackendRequired,
} from '@/lib/backend/pythonBackendClient';
import { aggregateNews } from '@/lib/news/aggregates';
import { classifyHeadlines } from '@/lib/news/classify';
import { dedupeNewsItems } from '@/lib/news/dedupe';
import { ensureHeadWeights } from '@/lib/news/head';
import { recordForwardHeadlines } from '@/lib/news/forwardCollector';
import type {
  NewsFreshness,
  NewsIntelligence,
  NewsItem,
  SourceStatus,
} from '@/types/market';

const parser = new Parser({
  timeout: 20_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});

type NewsSource = (typeof NEWS_SOURCES)[number];

interface SourceSnapshot {
  items: NewsItem[];
  fetchedAt: Date;
  invalidItemCount: number;
}

interface SourceCacheEntry {
  snapshot?: SourceSnapshot;
  expiresAt: number;
  staleUntil: number;
  inFlight?: Promise<SourceSnapshot>;
}

interface SourceResult {
  items: NewsItem[];
  status: SourceStatus;
}

class EmptyNewsFeedError extends Error {
  constructor(readonly invalidItemCount: number) {
    super('Feed returned no valid items');
    this.name = 'EmptyNewsFeedError';
  }
}

export interface NewsFetchResult {
  items: NewsItem[];
  sources: Record<string, SourceStatus>;
  intelligence: NewsIntelligence;
  freshness: NewsFreshness;
}

const MAX_HEADLINES = 50;
const FILTERED_MEDIA_SOURCES = new Set(['bloomberg', 'cnbc']);
const MEDIA_KEYWORD_PATTERNS = NEWS_FILTER_KEYWORDS.map((keyword) => {
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i');
});
const cache = new Map<string, SourceCacheEntry>();

function configurableMs(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

const CACHE_TTL_MS = configurableMs('NEWS_CACHE_TTL_MS', 30_000, 1_000, 300_000);
const STALE_IF_ERROR_MS = configurableMs(
  'NEWS_STALE_IF_ERROR_MS',
  15 * 60_000,
  CACHE_TTL_MS,
  24 * 60 * 60_000
);

function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function validPublishedAt(value: string | undefined, now: Date): Date | null {
  if (!value) return null;
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return null;
  if (timestamp < Date.UTC(2000, 0, 1)) return null;
  if (timestamp > now.getTime() + 24 * 60 * 60_000) return null;
  return date;
}

async function fetchSource(source: NewsSource): Promise<SourceSnapshot> {
  const feed = await parser.parseURL(source.url);
  const now = new Date();
  const items: NewsItem[] = [];
  let invalidItemCount = 0;

  for (const item of feed.items) {
    const rawTitle = item.title?.trim();
    const url = item.link?.trim();
    if (!rawTitle || !url) {
      invalidItemCount += 1;
      continue;
    }

    // Google News can mix publishers into a Reuters search. Only accept items
    // explicitly attributed to Reuters in the title.
    const isReutersItem = /(?:\s[-–—]\s)Reuters$/i.test(rawTitle);
    if (source.id === 'reuters' && !isReutersItem) {
      invalidItemCount += 1;
      continue;
    }
    const title = source.id === 'reuters'
      ? rawTitle.replace(/(?:\s[-–—]\s)Reuters$/i, '').trim()
      : rawTitle;
    if (
      FILTERED_MEDIA_SOURCES.has(source.id) &&
      !MEDIA_KEYWORD_PATTERNS.some((pattern) => pattern.test(title))
    ) {
      continue;
    }

    const publishedAt =
      validPublishedAt(item.isoDate, now) ??
      validPublishedAt(item.pubDate, now);
    if (!publishedAt) {
      invalidItemCount += 1;
      continue;
    }

    items.push({
      id: stableId(`${source.id}:${url}`),
      title,
      source: source.label,
      url,
      publishedAt,
    });
  }

  items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  if (items.length === 0) {
    throw new EmptyNewsFeedError(invalidItemCount);
  }

  return {
    items: items.slice(0, source.maxItems),
    fetchedAt: now,
    invalidItemCount,
  };
}

function beginRefresh(source: NewsSource, entry: SourceCacheEntry): Promise<SourceSnapshot> {
  if (entry.inFlight) return entry.inFlight;

  const refresh = fetchSource(source)
    .then((snapshot) => {
      const completedAt = Date.now();
      entry.snapshot = snapshot;
      entry.expiresAt = completedAt + CACHE_TTL_MS;
      entry.staleUntil = completedAt + STALE_IF_ERROR_MS;
      return snapshot;
    })
    .finally(() => {
      if (entry.inFlight === refresh) {
        entry.inFlight = undefined;
      }
    });

  entry.inFlight = refresh;
  return refresh;
}

function statusFromSnapshot(
  source: NewsSource,
  snapshot: SourceSnapshot,
  cacheState: SourceStatus['cache'],
  stale: boolean,
  message: string | null,
  nowMs: number
): SourceStatus {
  return {
    ok: snapshot.items.length > 0,
    label: source.label,
    message,
    stale,
    cache: cacheState,
    fetchedAt: snapshot.fetchedAt.toISOString(),
    lastSuccessAt: snapshot.fetchedAt.toISOString(),
    ageMs: Math.max(0, nowMs - snapshot.fetchedAt.getTime()),
    itemCount: snapshot.items.length,
    invalidItemCount: snapshot.invalidItemCount,
  };
}

async function getSource(source: NewsSource): Promise<SourceResult> {
  const nowMs = Date.now();
  const entry = cache.get(source.id) ?? {
    expiresAt: 0,
    staleUntil: 0,
  };
  cache.set(source.id, entry);

  if (entry.snapshot && nowMs < entry.expiresAt) {
    return {
      items: entry.snapshot.items,
      status: statusFromSnapshot(source, entry.snapshot, 'hit', false, null, nowMs),
    };
  }

  const sharedRefresh = Boolean(entry.inFlight);
  const hadSnapshot = Boolean(entry.snapshot);

  try {
    const snapshot = await beginRefresh(source, entry);
    return {
      items: snapshot.items,
      status: statusFromSnapshot(
        source,
        snapshot,
        sharedRefresh || hadSnapshot ? 'refresh' : 'miss',
        false,
        null,
        Date.now()
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error';
    console.error(`[News] Failed to refresh ${source.label}:`, error);

    if (entry.snapshot && Date.now() <= entry.staleUntil) {
      return {
        items: entry.snapshot.items,
        status: statusFromSnapshot(
          source,
          entry.snapshot,
          'stale',
          true,
          `Refresh failed; serving stale data: ${message}`,
          Date.now()
        ),
      };
    }

    return {
      items: [],
      status: {
        ok: false,
        label: source.label,
        message,
        stale: false,
        cache: entry.snapshot ? 'refresh' : 'miss',
        fetchedAt: null,
        lastSuccessAt: entry.snapshot?.fetchedAt.toISOString() ?? null,
        ageMs: entry.snapshot
          ? Math.max(0, Date.now() - entry.snapshot.fetchedAt.getTime())
          : null,
        itemCount: 0,
        invalidItemCount: error instanceof EmptyNewsFeedError
          ? error.invalidItemCount
          : entry.snapshot?.invalidItemCount ?? 0,
      },
    };
  }
}

export async function fetchNewsHeadlines(): Promise<NewsFetchResult> {
  try {
    const pythonNews = await fetchPythonNews();
    if (pythonNews) return pythonNews;
  } catch (error) {
    console.error('[PythonBackend] /news failed:', error);
    if (isPythonBackendRequired()) throw error;
  }

  const now = new Date();
  const results = await Promise.all(NEWS_SOURCES.map((source) => getSource(source)));
  const sourceStatuses: Record<string, SourceStatus> = {};
  const allItems: NewsItem[] = [];

  results.forEach((result, index) => {
    sourceStatuses[NEWS_SOURCES[index].id] = result.status;
    allItems.push(...result.items);
  });

  // Sort + cap to the headlines we actually keep BEFORE classifying, so the ML
  // pipeline only runs on the <=MAX_HEADLINES items we render. The final item set
  // is unchanged (sort order does not depend on classification).
  const ranked = dedupeNewsItems(allItems)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_HEADLINES);
  // Pull the latest continuously-retrained head weights (Phase 4) before scoring.
  await ensureHeadWeights();
  const classifications = await classifyHeadlines(ranked, now);
  const items = ranked.map((item) => ({
    ...item,
    classification: classifications.get(item.id),
  }));

  // Forward collection (Phase 4): persist newly-seen headlines for periodic
  // head retraining. Best-effort — never blocks or breaks the response.
  await recordForwardHeadlines(items);

  const healthySources = Object.values(sourceStatuses).filter((status) => status.ok);
  const staleSources = healthySources.filter((status) => status.stale);
  const ages = healthySources
    .map((status) => status.ageMs)
    .filter((age): age is number => age !== null && age !== undefined);

  sourceStatuses.news = {
    ok: items.length > 0,
    label: 'NEWS',
    message: items.length === 0
      ? 'No valid headlines available'
      : staleSources.length > 0
        ? `${staleSources.length} source(s) serving stale data`
        : null,
    stale: staleSources.length > 0,
    cache: staleSources.length > 0 ? 'stale' : undefined,
    fetchedAt: now.toISOString(),
    lastSuccessAt: healthySources
      .map((status) => status.lastSuccessAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
    ageMs: ages.length > 0 ? Math.max(...ages) : null,
    itemCount: items.length,
    invalidItemCount: Object.values(sourceStatuses).reduce(
      (total, status) => total + (status.invalidItemCount ?? 0),
      0
    ),
  };

  return {
    items,
    sources: sourceStatuses,
    intelligence: aggregateNews(items, now),
    freshness: {
      ttlMs: CACHE_TTL_MS,
      staleIfErrorMs: STALE_IF_ERROR_MS,
      oldestSourceAgeMs: ages.length > 0 ? Math.max(...ages) : null,
      newestPublishedAt: items[0]?.publishedAt.toISOString() ?? null,
    },
  };
}
