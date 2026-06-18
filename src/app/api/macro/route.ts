// GET /api/macro — macroeconomic dashboard data.
// US: inflation (CPI/core YoY computed from index levels), labor, credit
// spreads, financial conditions, real yields, breakevens (FRED).
// Brazil: IPCA 12m accumulated (SGS), Focus survey medians for IPCA and SELIC
// (current + next year). All values null-safe; cached ~30 min server-side.

import { NextResponse } from 'next/server';
import { fetchFredHistory, type FredObservationParsed } from '@/lib/fetchers/fred';
import { fetchBcbSeries } from '@/lib/fetchers/bcb';
import { fetchFocusAnnual, type FocusExpectation } from '@/lib/fetchers/focus';
import {
  fetchPythonMacro,
  isPythonBackendRequired,
} from '@/lib/backend/pythonBackendClient';

export const dynamic = 'force-dynamic';

export interface MacroSeriesPoint {
  value: number | null;
  prev: number | null;       // previous observation
  yearAgo: number | null;    // ~12 months earlier
  date: string | null;
}

export interface MacroData {
  us: {
    cpiYoY: MacroSeriesPoint;       // computed from CPIAUCSL index
    coreCpiYoY: MacroSeriesPoint;   // computed from CPILFESL index
    unemployment: MacroSeriesPoint; // UNRATE
    hyOas: MacroSeriesPoint;        // BAMLH0A0HYM2 (high-yield spread, %)
    nfci: MacroSeriesPoint;         // Chicago Fed financial conditions
    breakeven10y: MacroSeriesPoint; // T10YIE
    real10y: MacroSeriesPoint;      // DFII10 (10y TIPS)
  };
  brazil: {
    ipca12m: MacroSeriesPoint;      // SGS 13522, % accumulated 12m
    focusIpca: FocusExpectation[];  // medians, current + next year
    focusSelic: FocusExpectation[];
  };
}

const NULL_POINT: MacroSeriesPoint = { value: null, prev: null, yearAgo: null, date: null };

function latestPoint(history: FredObservationParsed[] | null): MacroSeriesPoint {
  if (!history || history.length === 0) return NULL_POINT;
  return {
    value: history[0].value,
    prev: history[1]?.value ?? null,
    yearAgo: history[12]?.value ?? history[history.length - 1]?.value ?? null,
    date: history[0].date,
  };
}

/** YoY % change computed from a monthly index level series (newest first). */
function yoyPoint(history: FredObservationParsed[] | null): MacroSeriesPoint {
  if (!history || history.length < 14) return NULL_POINT;
  const yoy = (i: number): number | null => {
    const now = history[i]?.value;
    const base = history[i + 12]?.value;
    if (now == null || base == null || base === 0) return null;
    return (now / base - 1) * 100;
  };
  return {
    value: yoy(0),
    prev: yoy(1),
    yearAgo: history.length >= 26 ? yoy(12) : null,
    date: history[0].date,
  };
}

export async function GET() {
  const fetchedAt = new Date().toISOString();

  try {
    const pythonData = await fetchPythonMacro<MacroData>();
    if (pythonData) {
      return NextResponse.json({ data: pythonData, fetchedAt, error: null });
    }
  } catch (error) {
    console.error('[PythonBackend] /macro failed:', error);
    if (isPythonBackendRequired()) {
      return NextResponse.json({ data: null, fetchedAt, error: 'Macro backend unavailable' }, { status: 200 });
    }
  }

  const [cpi, coreCpi, unrate, hyOas, nfci, t10yie, dfii10, ipca12m, focusIpca, focusSelic] =
    await Promise.allSettled([
      fetchFredHistory('CPIAUCSL', 30),
      fetchFredHistory('CPILFESL', 30),
      fetchFredHistory('UNRATE', 30),
      fetchFredHistory('BAMLH0A0HYM2', 280),
      fetchFredHistory('NFCI', 60),
      fetchFredHistory('T10YIE', 280),
      fetchFredHistory('DFII10', 280),
      fetchBcbSeries('13522'),
      fetchFocusAnnual('IPCA'),
      fetchFocusAnnual('Selic'),
    ]);

  const settled = <T,>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null;

  // Daily series: "prev" ≈ 1 month ago (21 obs), "yearAgo" ≈ 252 obs.
  const dailyPoint = (history: FredObservationParsed[] | null): MacroSeriesPoint => {
    if (!history || history.length === 0) return NULL_POINT;
    return {
      value: history[0].value,
      prev: history[21]?.value ?? history[history.length - 1]?.value ?? null,
      yearAgo: history[252]?.value ?? history[history.length - 1]?.value ?? null,
      date: history[0].date,
    };
  };

  const ipca = settled(ipca12m);

  const data: MacroData = {
    us: {
      cpiYoY: yoyPoint(settled(cpi)),
      coreCpiYoY: yoyPoint(settled(coreCpi)),
      unemployment: latestPoint(settled(unrate)),
      hyOas: dailyPoint(settled(hyOas)),
      nfci: latestPoint(settled(nfci)),
      breakeven10y: dailyPoint(settled(t10yie)),
      real10y: dailyPoint(settled(dfii10)),
    },
    brazil: {
      ipca12m: ipca
        ? { value: ipca.value, prev: null, yearAgo: null, date: ipca.date }
        : NULL_POINT,
      focusIpca: settled(focusIpca) ?? [],
      focusSelic: settled(focusSelic) ?? [],
    },
  };

  return NextResponse.json({ data, fetchedAt, error: null });
}
