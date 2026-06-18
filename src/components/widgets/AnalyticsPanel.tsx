'use client';

// ─── Analytics Panel ────────────────────────────────────────────────────────────
// Curve spreads and cross-asset stats: slopes, policy-implied moves, trailing
// returns, realized vol, and 20d z-scores computed from /api/history closes.

import React, { useMemo } from 'react';
import type { MarketDataState } from '@/hooks/useMarketData';
import { useHistory } from '@/hooks/useHistory';
import { dailyReturns, realizedVol, trailingReturn, zScore } from '@/lib/analytics';

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

const STAT_SYMBOLS = [
  { symbol: 'BRL=X', label: 'USD/BRL' },
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
  { symbol: 'DX-Y.NYB', label: 'DXY' },
  { symbol: 'CL=F', label: 'WTI' },
  { symbol: 'GC=F', label: 'Gold' },
  { symbol: 'HG=F', label: 'Copper' },
  { symbol: 'ZS=F', label: 'Soybeans' },
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^BVSP', label: 'IBOV' },
  { symbol: '^VIX', label: 'VIX' },
];

function pctColor(value: number | null): string {
  if (value == null || value === 0) return UNCH;
  return value > 0 ? UP : DOWN;
}

function fmtPct(value: number | null, digits = 1): string {
  if (value == null) return '---';
  const s = value > 0 ? '+' : '';
  return `${s}${(value * 100).toFixed(digits)}%`;
}

function fmtBps(value: number | null): string {
  if (value == null) return '---';
  const s = value > 0 ? '+' : '';
  return `${s}${value.toFixed(0)} bps`;
}

function fmtZ(value: number | null): string {
  if (value == null) return '---';
  const s = value > 0 ? '+' : '';
  return `${s}${value.toFixed(2)}σ`;
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

function SpreadRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 90px',
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
      <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {note ?? ''}
      </span>
    </div>
  );
}

export default function AnalyticsPanel({
  active,
  marketState,
}: {
  active: boolean;
  marketState: MarketDataState;
}) {
  const history = useHistory(STAT_SYMBOLS.map((s) => s.symbol), '1y');
  const { data } = marketState;
  const us = data?.us ?? null;
  const brazil = data?.brazil ?? null;

  const spreads = useMemo(() => {
    const rows: Array<{ label: string; value: string; note?: string }> = [];
    const bp = (a: number | null | undefined, b: number | null | undefined) =>
      a != null && b != null ? (a - b) * 100 : null;

    rows.push({ label: 'US 2s10s', value: fmtBps(bp(us?.ust10y, us?.ust2y)), note: 'curve slope' });
    rows.push({ label: 'US 5s30s', value: fmtBps(bp(us?.ust30y, us?.ust5y)), note: 'curve slope' });

    const di27 = brazil?.di?.DI1F27?.rate ?? null;
    const di30 = brazil?.di?.DI1F30?.rate ?? null;
    rows.push({ label: 'DI Jan27 → Jan30', value: fmtBps(bp(di30, di27)), note: 'DI steepness' });
    rows.push({ label: 'DI Jan27 − SELIC', value: fmtBps(bp(di27, brazil?.selic)), note: 'implied policy' });
    rows.push({
      label: 'DI Jan30 − UST 10Y',
      value: di30 != null && us?.ust10y != null ? `${(di30 - us.ust10y).toFixed(2)} pp` : '---',
      note: 'BR-US spread',
    });

    const ipca = brazil?.ipca ?? null; // monthly %
    const ipcaAnnual = ipca != null ? ((1 + ipca / 100) ** 12 - 1) * 100 : null;
    rows.push({
      label: 'SELIC real (ex-IPCA ann.)',
      value:
        brazil?.selic != null && ipcaAnnual != null
          ? `${(((1 + brazil.selic / 100) / (1 + ipcaAnnual / 100) - 1) * 100).toFixed(2)}%`
          : '---',
      note: 'real rate proxy',
    });
    return rows;
  }, [us, brazil]);

  const statRows = useMemo(() => {
    return STAT_SYMBOLS.map(({ symbol, label }) => {
      const closes = history.data?.[symbol]?.bars.map((b) => b.close) ?? [];
      if (closes.length < 30) {
        return { label, last: null as number | null, m1: null, m12: null, vol: null, z: null };
      }
      const returns = dailyReturns(closes);
      return {
        label,
        last: closes[closes.length - 1],
        m1: trailingReturn(closes, 21),
        m12: trailingReturn(closes, Math.min(252, closes.length - 1)),
        vol: realizedVol(returns, 60),
        z: zScore(closes, 20),
      };
    });
  }, [history.data]);

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
      data-panel="analytics"
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
          Analytics
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Curves &amp; Stats</span>
        </span>
        <span style={{ color: SECONDARY, fontSize: 'var(--terminal-meta-size)' }}>
          {history.isLoading ? 'LOADING HIST' : '1Y DAILY'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <GroupLabel text="CURVES & SPREADS" />
        {spreads.map((row) => (
          <SpreadRow key={row.label} {...row} />
        ))}

        <GroupLabel text="CROSS-ASSET STATS — 1M / 12M / VOL60D / Z20D" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 70px 70px 64px 64px',
            height: 'var(--terminal-column-height)',
            padding: '0 8px',
            borderBottom: `1px solid var(--border)`,
            alignItems: 'center',
          }}
        >
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>ASSET</span>
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>1M</span>
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>12M</span>
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>VOL</span>
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>Z</span>
        </div>
        {statRows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 70px 70px 64px 64px',
              alignItems: 'center',
              height: 'var(--terminal-row-height)',
              padding: '0 8px',
              borderBottom: `1px solid var(--border)`,
            }}
          >
            <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>{row.label}</span>
            <span className="tabular-nums" style={{ color: pctColor(row.m1), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
              {fmtPct(row.m1)}
            </span>
            <span className="tabular-nums" style={{ color: pctColor(row.m12), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
              {fmtPct(row.m12)}
            </span>
            <span className="tabular-nums" style={{ color: VALUE_COLOR, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
              {row.vol != null ? `${(row.vol * 100).toFixed(0)}%` : '---'}
            </span>
            <span
              className="tabular-nums"
              style={{
                color: row.z != null && Math.abs(row.z) >= 2 ? ORANGE : SECONDARY,
                fontSize: 'var(--terminal-text-size)',
                textAlign: 'right',
              }}
            >
              {fmtZ(row.z)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
