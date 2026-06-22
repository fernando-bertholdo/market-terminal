// Classification orchestrator.
//
// Single entry point used by the news fetcher. When the ML pipeline is enabled
// (NEWS_ML_ENABLED=true + NEWS_NLP_URL set), it classifies the batch via the
// Python service and fills any gaps — items the service skipped, or the whole
// batch on service failure — with the deterministic regex classifier. With the
// flag off (default), this is byte-for-byte the original regex behaviour.

import type { NewsClassification, NewsClassificationStatus, NewsItem } from '@/types/market';
import { classifyHeadline } from '@/lib/news/classifier';
import { classifyHeadlinesMLDetailed, mlEnabled } from '@/lib/news/mlClassifier';

export async function classifyHeadlines(
  items: NewsItem[],
  now: Date = new Date()
): Promise<Map<string, NewsClassification>> {
  return (await classifyHeadlinesWithStatus(items, now)).classifications;
}

export async function classifyHeadlinesWithStatus(
  items: NewsItem[],
  now: Date = new Date()
): Promise<{ classifications: Map<string, NewsClassification>; status: NewsClassificationStatus }> {
  const ml = mlEnabled()
    ? await classifyHeadlinesMLDetailed(items, now)
    : await classifyHeadlinesMLDetailed([], now).then((result) => ({
        results: new Map<string, NewsClassification>(),
        status: {
          ...result.status,
          requestedItems: items.length,
          fallbackItems: items.length,
        },
      }));

  const out = new Map<string, NewsClassification>();
  for (const item of items) {
    out.set(
      item.id,
      ml.results.get(item.id) ?? classifyHeadline(item.title, item.publishedAt, now)
    );
  }
  return { classifications: out, status: ml.status };
}
