// ─── BCB (Banco Central do Brasil) Fetcher ────────────────────────────────────
// Fetches SGS series data and PTAX FX rates from BCB's public APIs.
// No authentication required. Revalidates every 5 minutes.
import { fetchWithTimeout } from './http';

const BCB_SGS_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const BCB_PTAX_BASE = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';

interface BcbSgsObservation {
  data: string;   // "DD/MM/YYYY"
  valor: string;  // numeric string
}

interface PtaxObservation {
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacao: string;
}

interface PtaxResponse {
  value: PtaxObservation[];
}

export interface PtaxRate {
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

/**
 * Format a JS Date into the MM-DD-YYYY string BCB PTAX expects.
 */
function formatPtaxDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/**
 * Subtract one calendar day from a Date, returning a new Date.
 */
function subtractDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Fetch the latest observation for a BCB SGS series.
 *
 * @param seriesCode - The BCB SGS series code (e.g. "1178" for SELIC)
 * @returns { value, date } or null on error/empty response
 */
export async function fetchBcbSeries(
  seriesCode: string
): Promise<{ value: number; date: string } | null> {
  const url = `${BCB_SGS_BASE}.${seriesCode}/dados/ultimos/1?formato=json`;

  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      console.error(`[BCB SGS] HTTP ${res.status} for series ${seriesCode}`);
      return null;
    }

    const data: BcbSgsObservation[] = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.error(`[BCB SGS] Empty response for series ${seriesCode}`);
      return null;
    }

    const obs = data[0];
    const value = parseFloat(obs.valor);

    if (isNaN(value)) {
      console.error(`[BCB SGS] Non-numeric valor "${obs.valor}" for series ${seriesCode}`);
      return null;
    }

    return { value, date: obs.data };
  } catch (err) {
    console.error(`[BCB SGS] Fetch error for series ${seriesCode}:`, err);
    return null;
  }
}

/**
 * Fetch the official BCB PTAX USD/BRL rate.
 * Tries today first; falls back to yesterday if the result is empty
 * (PTAX is published around 13:00 BRT, so morning requests will be empty).
 *
 * @returns { bid, ask, mid, timestamp } or null on error
 */
function normalizePtaxObservation(obs: PtaxObservation): PtaxRate {
  const bid = obs.cotacaoCompra;
  const ask = obs.cotacaoVenda;
  const mid = (bid + ask) / 2;

  return {
    bid,
    ask,
    mid,
    timestamp: obs.dataHoraCotacao,
  };
}

export async function fetchPtaxUsdBrl(): Promise<PtaxRate | null> {
  const today = new Date();

  for (let i = 0; i < 7; i += 1) {
    const date = subtractDays(today, i);
    const dateStr = formatPtaxDate(date);
    const url =
      `${BCB_PTAX_BASE}/CotacaoDolarDia(dataCotacao=@dataCotacao)` +
      `?@dataCotacao='${dateStr}'&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`;

    try {
      const res = await fetchWithTimeout(url, { next: { revalidate: 300 } });

      if (!res.ok) {
        console.error(`[BCB PTAX] HTTP ${res.status} for date ${dateStr}`);
        continue;
      }

      const json: PtaxResponse = await res.json();

      if (!json.value || json.value.length === 0) {
        // PTAX not published yet for this date — try previous day
        continue;
      }

      return normalizePtaxObservation(json.value[json.value.length - 1]);
    } catch (err) {
      console.error(`[BCB PTAX] Fetch error for date ${dateStr}:`, err);
    }
  }

  console.error('[BCB PTAX] Could not fetch USD PTAX in the last 7 days');
  return null;
}

export async function fetchPtaxCurrencyBrl(
  currency: string
): Promise<PtaxRate | null> {
  const today = new Date();

  for (let i = 0; i < 7; i += 1) {
    const date = subtractDays(today, i);
    const dateStr = formatPtaxDate(date);
    const url =
      `${BCB_PTAX_BASE}/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` +
      `?@moeda='${currency.toUpperCase()}'&@dataCotacao='${dateStr}'` +
      `&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`;

    try {
      const res = await fetchWithTimeout(url, { next: { revalidate: 300 } });

      if (!res.ok) {
        console.error(`[BCB PTAX] HTTP ${res.status} for ${currency} on ${dateStr}`);
        continue;
      }

      const json: PtaxResponse = await res.json();

      if (!json.value || json.value.length === 0) {
        continue;
      }

      return normalizePtaxObservation(json.value[json.value.length - 1]);
    } catch (err) {
      console.error(`[BCB PTAX] Fetch error for ${currency} on ${dateStr}:`, err);
    }
  }

  console.error(`[BCB PTAX] Could not fetch ${currency} PTAX in the last 7 days`);
  return null;
}

export function fetchPtaxEurBrl(): Promise<PtaxRate | null> {
  return fetchPtaxCurrencyBrl('EUR');
}
