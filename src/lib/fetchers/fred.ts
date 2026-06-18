// ─── FRED (Federal Reserve Economic Data) Fetcher ────────────────────────────
// Fetches series observations from the St. Louis Fed public API.
// Requires FRED_API_KEY environment variable (free key from fredaccount.stlouisfed.org).
import { fetchWithTimeout } from './http';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

interface FredObservation {
  date: string;        // "YYYY-MM-DD"
  value: string;       // numeric string or "." for missing
}

interface FredResponse {
  observations: FredObservation[];
}

export interface FredObservationParsed {
  date: string;
  value: number;
}

/**
 * Fetch the most recent N valid observations for a FRED series,
 * newest first. Used for YoY calculations and z-scores on macro series.
 */
export async function fetchFredHistory(
  seriesId: string,
  limit: number = 40
): Promise<FredObservationParsed[] | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    limit: String(limit),
    sort_order: 'desc',
    file_type: 'json',
  });

  try {
    const res = await fetchWithTimeout(`${FRED_BASE}?${params.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[FRED] HTTP ${res.status} for series ${seriesId}`);
      return null;
    }
    const json: FredResponse = await res.json();
    const parsed = (json.observations ?? [])
      .filter((o) => o.value !== '.' && o.value !== '')
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
      .filter((o) => !isNaN(o.value));
    return parsed.length > 0 ? parsed : null;
  } catch (err) {
    console.error(`[FRED] History fetch error for series ${seriesId}:`, err);
    return null;
  }
}

/**
 * Fetch the two most recent observations for a FRED series so we can
 * compute the change (current - previous).
 *
 * @param seriesId - FRED series identifier (e.g. "DGS10")
 * @returns { current, previous, date } or null if unavailable
 */
export async function fetchFredSeries(
  seriesId: string
): Promise<{ current: number; previous: number; date: string } | null> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    console.warn(
      '[FRED] FRED_API_KEY is not set. ' +
      'Get a free key at fredaccount.stlouisfed.org/apikeys'
    );
    return null;
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    limit: '10',
    sort_order: 'desc',
    file_type: 'json',
  });

  const url = `${FRED_BASE}?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      console.error(`[FRED] HTTP ${res.status} for series ${seriesId}`);
      return null;
    }

    const json: FredResponse = await res.json();

    if (!json.observations || json.observations.length < 1) {
      console.error(`[FRED] No observations returned for series ${seriesId}`);
      return null;
    }

    // Observations are sorted descending (newest first)
    const validObs = json.observations.filter(
      (o) => o.value !== '.' && o.value !== ''
    );

    if (validObs.length < 1) {
      console.error(`[FRED] All observations are missing for series ${seriesId}`);
      return null;
    }

    const current = parseFloat(validObs[0].value);
    const previous = validObs.length >= 2 ? parseFloat(validObs[1].value) : current;

    if (isNaN(current)) {
      console.error(`[FRED] Could not parse current value for series ${seriesId}`);
      return null;
    }

    return {
      current,
      previous: isNaN(previous) ? current : previous,
      date: validObs[0].date,
    };
  } catch (err) {
    console.error(`[FRED] Fetch error for series ${seriesId}:`, err);
    return null;
  }
}
