import type {
  NewsAggregate,
  NewsAsset,
  NewsFactor,
  NewsIntelligence,
  NewsItem,
  NewsSignal,
} from '@/types/market';

interface MutableAggregate extends NewsAggregate {
  weightedScore: number;
  weight: number;
}

function updateAggregate(
  map: Map<string, MutableAggregate>,
  signal: NewsSignal,
  item: NewsItem
): void {
  const classification = item.classification;
  if (!classification) return;

  const weight =
    classification.relevance *
    classification.confidence *
    classification.decay *
    signal.strength;
  const current = map.get(signal.id) ?? {
    id: signal.id,
    score: 0,
    intensity: 0,
    mentions: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    latestAt: null,
    weightedScore: 0,
    weight: 0,
  };

  current.mentions += 1;
  current.weight += weight;
  current.weightedScore += signal.direction * weight;
  current.intensity += weight;
  if (signal.direction > 0) current.positive += 1;
  else if (signal.direction < 0) current.negative += 1;
  else current.neutral += 1;

  const publishedAt = item.publishedAt.toISOString();
  if (!current.latestAt || publishedAt > current.latestAt) {
    current.latestAt = publishedAt;
  }
  map.set(signal.id, current);
}

function finalize<T extends NewsFactor | NewsAsset>(
  map: Map<string, MutableAggregate>
): Partial<Record<T, NewsAggregate>> {
  const result: Partial<Record<T, NewsAggregate>> = {};

  for (const [id, aggregate] of map) {
    result[id as T] = {
      id: id as T,
      score: aggregate.weight > 0
        ? Number((aggregate.weightedScore / aggregate.weight).toFixed(4))
        : 0,
      intensity: Number(aggregate.intensity.toFixed(4)),
      mentions: aggregate.mentions,
      positive: aggregate.positive,
      negative: aggregate.negative,
      neutral: aggregate.neutral,
      latestAt: aggregate.latestAt,
    };
  }

  return result;
}

export function aggregateNews(
  items: NewsItem[],
  asOf: Date = new Date()
): NewsIntelligence {
  const factors = new Map<string, MutableAggregate>();
  const assets = new Map<string, MutableAggregate>();

  for (const item of items) {
    for (const signal of item.classification?.factors ?? []) {
      updateAggregate(factors, signal, item);
    }
    for (const signal of item.classification?.assets ?? []) {
      updateAggregate(assets, signal, item);
    }
  }

  return {
    asOf: asOf.toISOString(),
    itemCount: items.length,
    classifiedCount: items.filter(
      (item) => (item.classification?.themes.length ?? 0) > 0
    ).length,
    assets: finalize<NewsAsset>(assets),
    factors: finalize<NewsFactor>(factors),
  };
}
