import type { NewsIntelligence } from '@/types/market';
import {
  computeSignals as computeSignalsLegacy,
  type SignalSet,
  type StrategyParams,
} from './strategies';

interface ModelEngineOptions {
  newsIntelligence?: NewsIntelligence | null;
  newsTriggeredSymbols?: Set<string> | null;
}

function modelEngineUrl(): string | null {
  return (
    process.env.ATLAS_BACKEND_URL?.trim() ||
    process.env.MODEL_ENGINE_URL?.trim() ||
    ''
  ).replace(/\/$/, '') || null;
}

function modelEngineRequired(): boolean {
  return (
    process.env.ATLAS_BACKEND_REQUIRED === 'true' ||
    process.env.ATLAS_BACKEND_REQUIRED === '1' ||
    process.env.MODEL_ENGINE_REQUIRED === 'true' ||
    process.env.MODEL_ENGINE_REQUIRED === '1'
  );
}

function historiesPayload(closesBySymbol: Map<string, number[]>): Record<string, number[]> {
  return Object.fromEntries(closesBySymbol);
}

async function computeSignalsPython(
  closesBySymbol: Map<string, number[]>,
  params: StrategyParams,
  options: ModelEngineOptions
): Promise<SignalSet | null> {
  const url = modelEngineUrl();
  if (!url) return null;

  const res = await fetch(`${url}/signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ATLAS_BACKEND_TOKEN || process.env.MODEL_ENGINE_TOKEN
        ? { Authorization: `Bearer ${process.env.ATLAS_BACKEND_TOKEN || process.env.MODEL_ENGINE_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      histories: historiesPayload(closesBySymbol),
      params,
      newsIntelligence: options.newsIntelligence ?? null,
      newsTriggeredSymbols: [...(options.newsTriggeredSymbols ?? new Set<string>())],
    }),
    signal: AbortSignal.timeout(Number(process.env.ATLAS_BACKEND_TIMEOUT_MS ?? process.env.MODEL_ENGINE_TIMEOUT_MS ?? 8_000)),
  });

  if (!res.ok) {
    throw new Error(`Model engine HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json() as SignalSet;
}

export async function computeSignals(
  closesBySymbol: Map<string, number[]>,
  params: StrategyParams,
  options: ModelEngineOptions = {}
): Promise<SignalSet> {
  try {
    const pythonResult = await computeSignalsPython(closesBySymbol, params, options);
    if (pythonResult) return pythonResult;
  } catch (error) {
    console.error('[ModelEngine] Python signal engine failed:', error);
    if (modelEngineRequired()) throw error;
  }

  return computeSignalsLegacy(closesBySymbol, params, {
    newsIntelligence: options.newsIntelligence ?? null,
    newsTriggeredSymbols: options.newsTriggeredSymbols ?? null,
  });
}
