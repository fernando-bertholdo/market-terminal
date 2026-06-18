// B3 listed-instrument quotation fetcher.
// Unofficial public endpoint; no authentication required.
import { fetchWithTimeout } from './http';

const B3_COTACAO_BASE = 'https://cotacao.b3.com.br/mds/api/v1/instrumentQuotation';

interface B3SctyQtn {
  opngPric?: number | null;
  minPric?: number | null;
  maxPric?: number | null;
  avrgPric?: number | null;
  curPrc?: number | null;
  prcFlcn?: number | null;
}

interface B3TradItem {
  scty?: {
    SctyQtn?: B3SctyQtn;
    symb?: string;
  };
}

interface B3Response {
  BizSts?: {
    cd?: string;
    desc?: string;
  };
  Msg?: {
    dtTm?: string;
  };
  Trad?: B3TradItem[];
}

export interface B3SnapshotStatus {
  code: string;
  description: string | null;
  ok: boolean;
}

export interface B3Snapshot {
  symbol: string;
  open: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  current: number | null;
  change: number | null;
  receivedAt: string;
  status: B3SnapshotStatus;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Fetch a rich quotation snapshot for any instrument exposed by the B3
 * instrumentQuotation endpoint. A valid B3 NOK response is returned with its
 * status and null quote fields; transport and malformed-response errors return
 * null, matching the other fetcher adapters.
 */
export async function fetchB3Snapshot(symbol: string): Promise<B3Snapshot | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const url = `${B3_COTACAO_BASE}/${encodeURIComponent(normalizedSymbol)}`;
  const receivedAt = new Date().toISOString();

  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      console.error(`[B3] HTTP ${res.status} for symbol ${normalizedSymbol}`);
      return null;
    }

    const json: B3Response = await res.json();
    const code = json.BizSts?.cd;
    if (typeof code !== 'string') {
      console.error(`[B3] Missing business status for symbol ${normalizedSymbol}`);
      return null;
    }

    const status: B3SnapshotStatus = {
      code,
      description: json.BizSts?.desc ?? null,
      ok: code === 'OK',
    };
    const quote = json.Trad?.[0]?.scty?.SctyQtn;

    if (status.ok && !quote) {
      console.error(`[B3] Empty Trad array for symbol ${normalizedSymbol}`);
      return null;
    }

    return {
      symbol: json.Trad?.[0]?.scty?.symb ?? normalizedSymbol,
      open: finiteOrNull(quote?.opngPric),
      min: finiteOrNull(quote?.minPric),
      max: finiteOrNull(quote?.maxPric),
      avg: finiteOrNull(quote?.avrgPric),
      current: finiteOrNull(quote?.curPrc),
      change: finiteOrNull(quote?.prcFlcn),
      receivedAt,
      status,
    };
  } catch (err) {
    console.error(`[B3] Fetch error for symbol ${normalizedSymbol}:`, err);
    return null;
  }
}

/**
 * Backward-compatible DI adapter used by the existing market API route.
 */
export async function fetchB3DI(
  symbol: string
): Promise<{ rate: number; symbol: string } | null> {
  const snapshot = await fetchB3Snapshot(symbol);
  if (!snapshot?.status.ok || snapshot.current == null) return null;
  return { rate: snapshot.current, symbol: snapshot.symbol };
}

export async function fetchB3Snapshots(
  symbols: readonly string[]
): Promise<Map<string, B3Snapshot>> {
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => ({
      symbol,
      snapshot: await fetchB3Snapshot(symbol),
    }))
  );
  const snapshots = new Map<string, B3Snapshot>();
  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value.snapshot) continue;
    snapshots.set(result.value.symbol, result.value.snapshot);
  }
  return snapshots;
}
