// Economic graph: signed factor -> asset exposures, plus the signal accumulator
// shared by the regex classifier and the ML adapter.
//
// In Phase 1 the edge weights are the original hand-tuned map (the prior). In
// Phase 2 (agent A3) these weights get *recalibrated from price co-movement* —
// this module is the single seam where that swap happens, so nothing downstream
// changes when it does.

import type { NewsAsset, NewsFactor, NewsSignal } from '@/types/market';
import { clamp } from '@/lib/news/decay';
import calibratedGraph from '@/lib/news/calibratedGraph.json';

type Direction = -1 | 0 | 1;

// Hand-tuned economic prior: which factor->asset edges exist and their default
// signed weights. The edge SET is the economic structure; Phase 2 (A3) keeps it
// and re-grounds the magnitudes in price co-movement (sign-preserving), emitted
// to calibratedGraph.json. See research/news-bootstrap/calibrate_graph.py.
export const STATIC_FACTOR_ASSET_EXPOSURES: Record<
  NewsFactor,
  Partial<Record<NewsAsset, number>>
> = {
  rates_br: { DI: 1, BRL: 0.4, IBOV: -0.25 },
  rates_us: { UST: 1, DXY: 0.45, SPX: -0.25, GOLD: -0.2 },
  usd: { DXY: 1, BRL: -0.7, GOLD: -0.45, COPPER: -0.25 },
  brl: { BRL: 1, IBOV: 0.25 },
  inflation: { DI: 0.5, UST: 0.5, GOLD: 0.2 },
  growth: { SPX: 0.6, IBOV: 0.5, COPPER: 0.5, OIL: 0.35 },
  risk: { SPX: 0.8, IBOV: 0.8, BRL: 0.55, GOLD: -0.45, DXY: -0.35 },
  energy: { OIL: 1, IBOV: 0.2 },
  metals: { COPPER: 0.8, GOLD: 0.6, IBOV: 0.2 },
  agriculture: { SOY: 1, BRL: 0.2 },
  credit: { SPX: 0.4, IBOV: 0.35, UST: -0.2 },
  technology: { SPX: 0.5 },
  defense: { SPX: -0.1 },
  power: { SPX: 0.2, OIL: 0.1 },
};

interface CalibratedGraph {
  generatedAt?: string;
  weights?: Partial<Record<NewsFactor, Partial<Record<NewsAsset, number>>>>;
}

// Merge the price-calibrated weights over the static prior, overriding ONLY edges
// that already exist (calibration never invents edges). Enabled by
// NEWS_GRAPH_CALIBRATED=true; otherwise the static prior is used verbatim.
function resolveExposures(): Record<NewsFactor, Partial<Record<NewsAsset, number>>> {
  const enabled =
    process.env.NEWS_GRAPH_CALIBRATED === 'true' || process.env.NEWS_GRAPH_CALIBRATED === '1';
  if (!enabled) return STATIC_FACTOR_ASSET_EXPOSURES;

  const calibrated = (calibratedGraph as CalibratedGraph).weights ?? {};
  const merged = {} as Record<NewsFactor, Partial<Record<NewsAsset, number>>>;
  for (const factor of Object.keys(STATIC_FACTOR_ASSET_EXPOSURES) as NewsFactor[]) {
    const staticEdges = STATIC_FACTOR_ASSET_EXPOSURES[factor];
    const calibEdges = calibrated[factor] ?? {};
    const edges: Partial<Record<NewsAsset, number>> = {};
    for (const asset of Object.keys(staticEdges) as NewsAsset[]) {
      const calibWeight = calibEdges[asset];
      edges[asset] = typeof calibWeight === 'number' ? calibWeight : (staticEdges[asset] as number);
    }
    merged[factor] = edges;
  }
  return merged;
}

// Active exposures used at runtime (resolved once at module load).
export const FACTOR_ASSET_EXPOSURES = resolveExposures();

interface SignalAccumulatorEntry {
  directionTotal: number;
  strength: number;
}

export type SignalMap = Map<string, SignalAccumulatorEntry>;

export function createSignalMap(): SignalMap {
  return new Map();
}

export function mergeSignal(
  signals: SignalMap,
  id: string,
  direction: Direction,
  strength: number
): void {
  const current = signals.get(id) ?? { directionTotal: 0, strength: 0 };
  current.directionTotal += direction * strength;
  current.strength = Math.max(current.strength, strength);
  signals.set(id, current);
}

export function finalizeSignals<T extends NewsFactor | NewsAsset>(
  signals: SignalMap
): NewsSignal[] {
  return [...signals.entries()]
    .map(([id, value]) => ({
      id: id as T,
      direction: (value.directionTotal === 0
        ? 0
        : value.directionTotal > 0
          ? 1
          : -1) as Direction,
      strength: clamp(value.strength),
    }))
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
}

// Propagate signed factor signals onto assets through the economic graph.
// Identical math to the original inline classifier logic.
export function propagateFactorsToAssets(factors: NewsSignal[]): NewsSignal[] {
  const assetSignals = createSignalMap();

  for (const factor of factors) {
    const exposures = FACTOR_ASSET_EXPOSURES[factor.id as NewsFactor];
    if (!exposures) continue;
    for (const [asset, exposure] of Object.entries(exposures)) {
      const signedExposure = exposure ?? 0;
      const assetDirection = (
        factor.direction === 0 || signedExposure === 0
          ? 0
          : factor.direction * Math.sign(signedExposure)
      ) as Direction;
      mergeSignal(
        assetSignals,
        asset,
        assetDirection,
        factor.strength * Math.abs(signedExposure)
      );
    }
  }

  return finalizeSignals<NewsAsset>(assetSignals);
}
