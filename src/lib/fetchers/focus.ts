// ─── BCB Focus Survey Fetcher ───────────────────────────────────────────────────
// Weekly market expectations survey (~100 institutions) published by the BCB.
// Olinda OData API, no auth. We pull median annual expectations for IPCA and
// SELIC for the current and next calendar years.
import { fetchWithTimeout } from './http';

const FOCUS_BASE =
  'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata';

interface FocusAnnualRecord {
  Indicador: string;
  Data: string;           // survey date "YYYY-MM-DD"
  DataReferencia: string; // reference year "YYYY"
  Mediana: number;
  numeroRespondentes: number;
}

interface FocusResponse {
  value: FocusAnnualRecord[];
}

export interface FocusExpectation {
  referenceYear: string;
  median: number;
  surveyDate: string;
  respondents: number;
}

/**
 * Fetch the latest median annual Focus expectations for an indicator
 * ("IPCA" or "Selic"), for the current and next calendar years.
 */
export async function fetchFocusAnnual(
  indicador: 'IPCA' | 'Selic'
): Promise<FocusExpectation[] | null> {
  const thisYear = new Date().getFullYear();
  const years = [String(thisYear), String(thisYear + 1)];
  const filter = encodeURIComponent(
    `Indicador eq '${indicador}' and (DataReferencia eq '${years[0]}' or DataReferencia eq '${years[1]}')`
  );
  const url =
    `${FOCUS_BASE}/ExpectativasMercadoAnuais?$filter=${filter}` +
    `&$orderby=Data%20desc&$top=30&$format=json` +
    `&$select=Indicador,Data,DataReferencia,Mediana,numeroRespondentes`;

  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[Focus] HTTP ${res.status} for ${indicador}`);
      return null;
    }
    const json: FocusResponse = await res.json();
    if (!json.value || json.value.length === 0) return null;

    // Records are newest-first; keep the most recent record per reference year.
    const byYear = new Map<string, FocusAnnualRecord>();
    for (const record of json.value) {
      if (!byYear.has(record.DataReferencia)) byYear.set(record.DataReferencia, record);
    }

    return years
      .map((year) => byYear.get(year))
      .filter((r): r is FocusAnnualRecord => Boolean(r))
      .map((r) => ({
        referenceYear: r.DataReferencia,
        median: r.Mediana,
        surveyDate: r.Data,
        respondents: r.numeroRespondentes,
      }));
  } catch (err) {
    console.error(`[Focus] Fetch error for ${indicador}:`, err);
    return null;
  }
}
