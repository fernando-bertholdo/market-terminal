// Per-asset head (Phase 3/4, A4) — runtime inference with live weight refresh.
//
// Turns the Fase-1 feature vector into a final signed per-asset signal, replacing
// the fixed graph propagation when NEWS_HEAD_ENABLED=true. The graph remains the
// prior (it is the `graph_prior` feature *and* the fallback when the head is
// disabled or an asset has no trained model).
//
// CONTINUOUS REFINEMENT (Phase 4): the news-nlp service retrains the head on the
// forward-collected tape and writes the weights to Neon (`head_weights` row
// id='current'). This module loads that row at runtime, TTL-cached, so the head
// improves with NO redeploy. The bundled headWeights.json is the seed/fallback
// (used locally, before the first retrain, or on any DB error).
//
// FEATURE_ORDER MUST match research/news-bootstrap/featurelib.py.

import { neon } from '@neondatabase/serverless';
import type { NewsAsset, NewsSignal } from '@/types/market';
import { clamp } from '@/lib/news/decay';
import seedWeights from '@/lib/news/headWeights.json';

export const FEATURE_ORDER = ['bias', 'graph_prior', 'absa', 'tone', 'relevance', 'confidence'] as const;

interface AssetModel {
  coef: number[];
}
interface HeadWeights {
  featureOrder?: string[];
  margin?: number;
  global?: { coef: number[] };
  assets?: Partial<Record<NewsAsset, AssetModel>>;
  generatedAt?: string;
  source?: string;
  rows?: number;
  headlines?: number;
  note?: string;
}

const REFRESH_TTL_MS = (() => {
  const value = Number(process.env.NEWS_HEAD_REFRESH_MS);
  return Number.isFinite(value) ? Math.min(3_600_000, Math.max(30_000, value)) : 600_000;
})();

let activeWeights: HeadWeights = seedWeights as HeadWeights;
let activeSource: 'seed' | 'database' = 'seed';
let lastLoadedAt = 0;
let lastLoadError: string | null = null;
let inFlight: Promise<void> | null = null;

function headFlagOn(): boolean {
  return process.env.NEWS_HEAD_ENABLED === 'true' || process.env.NEWS_HEAD_ENABLED === '1';
}

export function headEnabled(): boolean {
  return headFlagOn() && Array.isArray(activeWeights.global?.coef);
}

export function getHeadRuntimeStatus() {
  return {
    enabled: headFlagOn(),
    ready: headEnabled(),
    source: headFlagOn() ? activeSource : 'disabled',
    lastLoadedAt: lastLoadedAt > 0 ? new Date(lastLoadedAt).toISOString() : null,
    lastLoadError,
    generatedAt: activeWeights.generatedAt ?? null,
    trainedSource: activeWeights.source ?? null,
    rows: typeof activeWeights.rows === 'number' ? activeWeights.rows : null,
    headlines: typeof activeWeights.headlines === 'number' ? activeWeights.headlines : null,
    assetModels: activeWeights.assets ? Object.keys(activeWeights.assets).length : 0,
    seedNote: activeSource === 'seed' ? activeWeights.note ?? null : null,
  };
}

// Refresh the head weights from Neon if enabled and the TTL has elapsed. Awaited
// once per /api/news request before classification. No DB / any error -> keep the
// current (seed or last-good) weights. Never throws.
export async function ensureHeadWeights(): Promise<void> {
  if (!headFlagOn()) return;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return; // local dev: use the bundled seed weights
  if (Date.now() - lastLoadedAt < REFRESH_TTL_MS) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const sql = neon(url);
      const rows = await sql`SELECT weights FROM head_weights WHERE id = 'current'`;
      const loaded = rows[0]?.weights as HeadWeights | undefined;
      if (loaded && Array.isArray(loaded.global?.coef)) {
        activeWeights = loaded;
        activeSource = 'database';
        lastLoadError = null;
      } else {
        activeSource = 'seed';
      }
      lastLoadedAt = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastLoadError = message;
      console.error('[News/head] weight refresh failed; keeping current weights:', error);
      lastLoadedAt = Date.now(); // back off; don't hammer the DB on every request
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function buildVector(
  graphPrior: number,
  absa: number,
  tone: number,
  relevance: number,
  confidence: number
): number[] {
  return [1, graphPrior, absa, tone, relevance, confidence];
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
}

function coefFor(asset: NewsAsset): number[] | null {
  const assetModel = activeWeights.assets?.[asset];
  if (assetModel?.coef) return assetModel.coef;
  return activeWeights.global?.coef ?? null;
}

// Apply the head to one asset's feature vector. Returns a signed signal, or null
// if the head is unavailable for this asset (caller falls back to the graph).
export function applyHead(asset: NewsAsset, vector: number[]): NewsSignal | null {
  const coef = coefFor(asset);
  if (!coef || coef.length !== vector.length) return null;
  const margin = typeof activeWeights.margin === 'number' ? activeWeights.margin : 0;
  const p = sigmoid(coef.reduce((sum, c, i) => sum + c * vector[i], 0));
  const edge = p - 0.5;
  const direction = edge > margin ? 1 : edge < -margin ? -1 : 0;
  return { id: asset, direction, strength: clamp(Math.abs(edge) * 2) };
}
