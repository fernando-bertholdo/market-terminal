'use client';

// ─── Macro Panel ────────────────────────────────────────────────────────────────
// Regime scoring + macroeconomic dashboard. Combines /api/macro (FRED inflation/
// labor/credit, BCB Focus survey) with market data and price history to answer
// "what environment are we in", not just "what moved today".

import React, { useMemo } from 'react';
import type { MarketDataState } from '@/hooks/useMarketData';
import { useMacro } from '@/hooks/useMacro';
import { useHistory } from '@/hooks/useHistory';
import { trailingReturn } from '@/lib/analytics';

const PANEL_BG = 'var(--surface)';
const HEADER_BG = 'var(--surface-2)';
const HEADER_BORDER = 'var(--border)';
const DIM = 'var(--text-3)';
const SECONDARY = 'var(--text-2)';
const ORANGE = 'var(--accent)';
const VALUE_COLOR = 'var(--value)';
const UP = 'var(--up)';
const DOWN = 'var(--down)';
const UNCH = 'var(--text-3)';
const MONO = 'var(--font-ui)';

const REGIME_SYMBOLS = ['^GSPC', 'DX-Y.NYB', '^VIX'];

interface MacroRow {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
  note: string;
}

function fmtPt(value: number | null | undefined, digits = 2, suffix = '%'): string {
  if (value == null) return '---';
  return `${value.toFixed(digits)}${suffix}`;
}

function deltaInfo(
  value: number | null | undefined,
  prev: number | null | undefined,
  options: { higherIsBad?: boolean; digits?: number; unit?: string } = {}
): { text: string; color: string } {
  const { higherIsBad = true, digits = 2, unit = 'pp' } = options;
  if (value == null || prev == null) return { text: '---', color: UNCH };
  const diff = value - prev;
  if (Math.abs(diff) < 1e-9) return { text: 'unch', color: UNCH };
  const worse = higherIsBad ? diff > 0 : diff < 0;
  return {
    text: `${diff > 0 ? '+' : ''}${diff.toFixed(digits)}${unit}`,
    color: worse ? DOWN : UP,
  };
}

interface Regime {
  label: string;
  state: string;
  color: string;
  detail: string;
}

function GroupLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        height: 'var(--terminal-group-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        backgroundColor: HEADER_BG,
        borderBottom: `1px solid ${HEADER_BORDER}`,
        color: SECONDARY,
        fontSize: 'var(--terminal-meta-size)',
        letterSpacing: '0.1em',
      }}
    >
      {text}
    </div>
  );
}

function Row({ label, value, delta, deltaColor, note }: MacroRow) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 76px 76px 110px',
        alignItems: 'center',
        height: 'var(--terminal-row-height)',
        padding: '0 8px',
        borderBottom: `1px solid var(--border)`,
      }}
    >
      <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span className="tabular-nums" style={{ color: VALUE_COLOR, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {value}
      </span>
      <span className="tabular-nums" style={{ color: deltaColor, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {delta}
      </span>
      <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {note}
      </span>
    </div>
  );
}

export default function MacroPanel({
  active,
  marketState,
}: {
  active: boolean;
  marketState: MarketDataState;
}) {
  const macro = useMacro();
  const history = useHistory(REGIME_SYMBOLS, '1y');
  const market = marketState.data;
  const us = macro.data?.us ?? null;
  const br = macro.data?.brazil ?? null;

  const regimes = useMemo<Regime[]>(() => {
    const out: Regime[] = [];
    const closes = (symbol: string) =>
      history.data?.[symbol]?.bars.map((b) => b.close) ?? [];

    // ── RISK: SPX 3m momentum + VIX level + HY OAS 1m trend ──
    {
      let score = 0;
      const spx3m = trailingReturn(closes('^GSPC'), 63);
      const vix = market?.global?.vix ?? null;
      const hy = us?.hyOas?.value ?? null;
      const hyPrev = us?.hyOas?.prev ?? null;
      if (spx3m != null) score += spx3m > 0 ? 1 : -1;
      if (vix != null) score += vix < 16 ? 1 : vix > 24 ? -1 : 0;
      if (hy != null && hyPrev != null) score += hy < hyPrev ? 1 : -1;
      out.push({
        label: 'RISK',
        state: score >= 2 ? 'RISK-ON' : score <= -2 ? 'RISK-OFF' : 'NEUTRAL',
        color: score >= 2 ? UP : score <= -2 ? DOWN : SECONDARY,
        detail: `SPX3m ${spx3m != null ? (spx3m > 0 ? '+' : '') + (spx3m * 100).toFixed(1) + '%' : '--'} · VIX ${vix?.toFixed(0) ?? '--'} · HY ${hy != null && hyPrev != null ? (hy < hyPrev ? 'tighter' : 'wider') : '--'}`,
      });
    }

    // ── USD: DXY 3m momentum + US 10y real yield 1m trend ──
    {
      let score = 0;
      const dxy3m = trailingReturn(closes('DX-Y.NYB'), 63);
      const real = us?.real10y?.value ?? null;
      const realPrev = us?.real10y?.prev ?? null;
      if (dxy3m != null) score += dxy3m > 0 ? 1 : -1;
      if (real != null && realPrev != null) score += real > realPrev ? 1 : -1;
      out.push({
        label: 'USD',
        state: score >= 2 ? 'STRONG' : score <= -2 ? 'WEAK' : 'MIXED',
        color: score >= 2 ? UP : score <= -2 ? DOWN : SECONDARY,
        detail: `DXY3m ${dxy3m != null ? (dxy3m > 0 ? '+' : '') + (dxy3m * 100).toFixed(1) + '%' : '--'} · real10y ${real != null ? real.toFixed(2) + '%' : '--'}`,
      });
    }

    // ── US INFLATION: CPI YoY direction + breakeven trend ──
    {
      const cpi = us?.cpiYoY?.value ?? null;
      const cpiPrev = us?.cpiYoY?.prev ?? null;
      const be = us?.breakeven10y?.value ?? null;
      const bePrev = us?.breakeven10y?.prev ?? null;
      const falling = cpi != null && cpiPrev != null ? cpi < cpiPrev : null;
      const beFalling = be != null && bePrev != null ? be < bePrev : null;
      const state =
        falling == null ? 'N/A'
        : falling && beFalling !== false ? 'DISINFLATION'
        : !falling && beFalling === false ? 'REFLATION'
        : 'MIXED';
      out.push({
        label: 'US INFL',
        state,
        color: state === 'DISINFLATION' ? UP : state === 'REFLATION' ? DOWN : SECONDARY,
        detail: `CPI ${cpi != null ? cpi.toFixed(1) + '%' : '--'} ${falling == null ? '' : falling ? '↓' : '↑'} · BE10 ${be != null ? be.toFixed(2) + '%' : '--'}`,
      });
    }

    // ── BRAZIL: SELIC vs Focus year-end (implied path) + DI slope ──
    {
      const selic = market?.brazil?.selic ?? null;
      const focusSelic = br?.focusSelic?.[0]?.median ?? null;
      const di27 = market?.brazil?.di?.DI1F27?.rate ?? null;
      const di30 = market?.brazil?.di?.DI1F30?.rate ?? null;
      const implied = selic != null && focusSelic != null ? focusSelic - selic : null;
      const slope = di27 != null && di30 != null ? (di30 - di27) * 100 : null;
      const state =
        implied == null ? 'N/A'
        : implied < -0.25 ? 'EASING AHEAD'
        : implied > 0.25 ? 'HIKES AHEAD'
        : 'ON HOLD';
      out.push({
        label: 'BCB',
        state,
        color: state === 'EASING AHEAD' ? UP : state === 'HIKES AHEAD' ? DOWN : SECONDARY,
        detail: `Focus YE ${focusSelic != null ? focusSelic.toFixed(2) + '%' : '--'} vs SELIC ${selic != null ? selic.toFixed(2) + '%' : '--'} · DI slope ${slope != null ? (slope > 0 ? '+' : '') + slope.toFixed(0) + 'bp' : '--'}`,
      });
    }

    return out;
  }, [history.data, market, us, br]);

  const usRows = useMemo<MacroRow[]>(() => {
    if (!us) return [];
    return [
      { label: 'CPI YoY', value: fmtPt(us.cpiYoY?.value), ...rowDelta(us.cpiYoY), note: noteTrend(us.cpiYoY, 'vs yr ago') },
      { label: 'Core CPI YoY', value: fmtPt(us.coreCpiYoY?.value), ...rowDelta(us.coreCpiYoY), note: noteTrend(us.coreCpiYoY, 'vs yr ago') },
      { label: 'Unemployment U-3', value: fmtPt(us.unemployment?.value, 1), ...rowDelta(us.unemployment, { digits: 1 }), note: us.unemployment?.date ?? '' },
      { label: 'HY OAS', value: fmtPt(us.hyOas?.value), ...rowDelta(us.hyOas), note: '1m Δ · credit stress' },
      { label: 'NFCI', value: fmtPt(us.nfci?.value, 2, ''), ...rowDelta(us.nfci, { unit: '' }), note: '<0 = loose conditions' },
      { label: '10Y Breakeven', value: fmtPt(us.breakeven10y?.value), ...rowDelta(us.breakeven10y), note: 'mkt inflation exp.' },
      { label: '10Y Real (TIPS)', value: fmtPt(us.real10y?.value), ...rowDelta(us.real10y, { higherIsBad: false }), note: 'real yield' },
    ];

    function rowDelta(
      point: any,
      options: { higherIsBad?: boolean; digits?: number; unit?: string } = {}
    ) {
      const info = deltaInfo(point?.value, point?.prev, options);
      return { delta: info.text, deltaColor: info.color };
    }
    function noteTrend(point: any, suffix: string) {
      if (point?.value == null || point?.yearAgo == null) return '';
      const diff = point.value - point.yearAgo;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp ${suffix}`;
    }
  }, [us]);

  const brRows = useMemo<MacroRow[]>(() => {
    if (!br) return [];
    const rows: MacroRow[] = [];
    const selic = market?.brazil?.selic ?? null;

    rows.push({
      label: 'IPCA 12M',
      value: fmtPt(br.ipca12m?.value),
      delta: '',
      deltaColor: UNCH,
      note: 'target 3.0% ±1.5',
    });

    for (const exp of br.focusIpca ?? []) {
      rows.push({
        label: `Focus IPCA ${exp.referenceYear}`,
        value: fmtPt(exp.median),
        delta: '',
        deltaColor: UNCH,
        note: `${exp.respondents} resp · ${exp.surveyDate}`,
      });
    }
    for (const exp of br.focusSelic ?? []) {
      const implied = selic != null ? exp.median - selic : null;
      const info =
        implied == null
          ? { text: '---', color: UNCH }
          : {
              text: `${implied > 0 ? '+' : ''}${(implied * 100).toFixed(0)}bp`,
              color: implied < 0 ? UP : implied > 0 ? DOWN : UNCH,
            };
      rows.push({
        label: `Focus SELIC ${exp.referenceYear}`,
        value: fmtPt(exp.median),
        delta: info.text,
        deltaColor: info.color,
        note: 'implied vs current',
      });
    }
    return rows;
  }, [br, market]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: PANEL_BG,
        border: `1px solid ${active ? ORANGE : HEADER_BORDER}`,
        borderRadius: 'var(--radius)',
        boxShadow: '0 1px 10px rgba(0,0,0,0.30)',
        overflow: 'hidden',
        fontFamily: MONO,
      }}
      data-panel="macro"
    >
      <div
        style={{
          height: 'var(--terminal-panel-header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          backgroundColor: HEADER_BG,
          borderBottom: `1px solid ${HEADER_BORDER}`,
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--text-1)', fontSize: 'var(--terminal-text-size)', fontWeight: 600, letterSpacing: '0.01em' }}>
          Macro
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Regimes · US · Brazil</span>
        </span>
        <span style={{ color: SECONDARY, fontSize: 'var(--terminal-meta-size)' }}>
          {macro.isLoading ? 'LOADING' : 'FRED + BCB FOCUS'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <GroupLabel text="REGIME READ" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', backgroundColor: HEADER_BORDER }}>
          {regimes.map((regime) => (
            <div key={regime.label} style={{ backgroundColor: PANEL_BG, padding: '6px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', letterSpacing: '0.08em' }}>{regime.label}</span>
                <span style={{ color: regime.color, fontSize: 'var(--terminal-text-size)', fontWeight: 600 }}>{regime.state}</span>
              </div>
              <div style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {regime.detail}
              </div>
            </div>
          ))}
        </div>

        <GroupLabel text="US — INFLATION / LABOR / CREDIT" />
        {macro.isLoading && usRows.length === 0 ? (
          <div className="animate-pulse" style={{ padding: '8px', color: DIM, fontSize: 'var(--terminal-text-size)' }}>LOADING FRED...</div>
        ) : (
          usRows.map((row) => <Row key={row.label} {...row} />)
        )}

        <GroupLabel text="BRAZIL — IPCA / FOCUS SURVEY" />
        {macro.isLoading && brRows.length === 0 ? (
          <div className="animate-pulse" style={{ padding: '8px', color: DIM, fontSize: 'var(--terminal-text-size)' }}>LOADING BCB...</div>
        ) : (
          brRows.map((row) => <Row key={row.label} {...row} />)
        )}
      </div>
    </div>
  );
}
