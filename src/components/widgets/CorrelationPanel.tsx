'use client';

// ─── Correlation Panel ──────────────────────────────────────────────────────────
// Rolling 60-day correlation matrix of daily returns across the core
// cross-asset set, plus the most notable pairs. Returns are aligned on shared
// trading dates so FX (5-day week) and futures correlate correctly.

import React, { useMemo, useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { alignedReturns, correlation } from '@/lib/analytics';

const PANEL_BG = 'var(--surface)';
const HEADER_BG = 'var(--surface-2)';
const HEADER_BORDER = 'var(--border)';
const DIM = 'var(--text-3)';
const SECONDARY = 'var(--text-2)';
const ORANGE = 'var(--accent)';
const MONO = 'var(--font-ui)';

const ASSETS = [
  { symbol: 'BRL=X', label: 'BRL' },
  { symbol: 'DX-Y.NYB', label: 'DXY' },
  { symbol: '^TNX', label: 'US10' },
  { symbol: 'CL=F', label: 'WTI' },
  { symbol: 'GC=F', label: 'GOLD' },
  { symbol: 'HG=F', label: 'COPR' },
  { symbol: '^GSPC', label: 'SPX' },
  { symbol: '^BVSP', label: 'IBOV' },
];

const WINDOWS = [
  { days: 30, label: '30D' },
  { days: 60, label: '60D' },
  { days: 120, label: '120D' },
] as const;

/** Diverging color: red (-1) → near-black (0) → green (+1). */
function corrColor(value: number): string {
  const t = Math.max(-1, Math.min(1, value));
  const intensity = Math.round(Math.abs(t) * 110) + 20;
  return t >= 0 ? `rgb(20, ${intensity + 30}, 40)` : `rgb(${intensity + 60}, 30, 30)`;
}

export default function CorrelationPanel({ active }: { active: boolean }) {
  const history = useHistory(ASSETS.map((a) => a.symbol), '1y');
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]['days']>(60);

  const matrix = useMemo(() => {
    if (!history.data) return null;
    const out: Array<Array<number | null>> = [];
    for (let i = 0; i < ASSETS.length; i += 1) {
      const row: Array<number | null> = [];
      for (let j = 0; j < ASSETS.length; j += 1) {
        if (i === j) {
          row.push(1);
          continue;
        }
        const barsA = history.data[ASSETS[i].symbol]?.bars;
        const barsB = history.data[ASSETS[j].symbol]?.bars;
        if (!barsA || !barsB) {
          row.push(null);
          continue;
        }
        const pairs = alignedReturns(barsA, barsB);
        row.push(correlation(pairs.a.slice(-windowDays), pairs.b.slice(-windowDays)));
      }
      out.push(row);
    }
    return out;
  }, [history.data, windowDays]);

  const notable = useMemo(() => {
    if (!matrix) return [];
    const pairs: Array<{ a: string; b: string; value: number }> = [];
    for (let i = 0; i < ASSETS.length; i += 1) {
      for (let j = i + 1; j < ASSETS.length; j += 1) {
        const value = matrix[i][j];
        if (value != null) pairs.push({ a: ASSETS[i].label, b: ASSETS[j].label, value });
      }
    }
    pairs.sort((x, y) => Math.abs(y.value) - Math.abs(x.value));
    return pairs.slice(0, 5);
  }, [matrix]);

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
      data-panel="correlations"
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
          Correlations
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Cross-asset</span>
        </span>
        <span style={{ display: 'flex', gap: '4px' }}>
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setWindowDays(w.days)}
              style={{
                color: windowDays === w.days ? ORANGE : SECONDARY,
                border: `1px solid ${windowDays === w.days ? ORANGE : 'var(--border-strong)'}`,
                background: windowDays === w.days ? 'var(--accent-soft)' : 'var(--surface-3)',
                borderRadius: '6px',
                padding: '1px 8px',
                fontSize: 'var(--terminal-meta-size)',
                cursor: 'pointer',
              }}
            >
              {w.label}
            </button>
          ))}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '8px' }}>
        {history.isLoading && !matrix ? (
          <div className="animate-pulse" style={{ color: DIM, fontSize: 'var(--terminal-text-size)' }}>
            LOADING 1Y HISTORY...
          </div>
        ) : !matrix ? (
          <div style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>
            HISTORY UNAVAILABLE{history.error ? ` — ${history.error}` : ''}
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `44px repeat(${ASSETS.length}, minmax(36px, 1fr))`,
                gap: '1px',
              }}
            >
              <span />
              {ASSETS.map((asset) => (
                <span
                  key={asset.symbol}
                  style={{ color: DIM, fontSize: '9px', textAlign: 'center', letterSpacing: '0.04em' }}
                >
                  {asset.label}
                </span>
              ))}
              {matrix.map((row, i) => (
                <React.Fragment key={ASSETS[i].symbol}>
                  <span style={{ color: DIM, fontSize: '9px', display: 'flex', alignItems: 'center' }}>
                    {ASSETS[i].label}
                  </span>
                  {row.map((value, j) => (
                    <span
                      key={`${i}-${j}`}
                      className="tabular-nums"
                      title={`${ASSETS[i].label} × ${ASSETS[j].label}: ${value?.toFixed(2) ?? 'n/a'}`}
                      style={{
                        backgroundColor: i === j ? 'var(--surface-3)' : value == null ? 'var(--surface-2)' : corrColor(value),
                        color: i === j ? DIM : '#e2e6ee',
                        fontSize: '9px',
                        textAlign: 'center',
                        padding: '4px 0',
                        borderRadius: '3px',
                      }}
                    >
                      {i === j ? '—' : value == null ? '·' : (value * 100).toFixed(0)}
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div style={{ color: DIM, fontSize: '9px', marginTop: '4px' }}>
              {windowDays}d daily-return correlation ×100 · green +, red −
            </div>

            <div style={{ marginTop: '8px', borderTop: `1px solid ${HEADER_BORDER}`, paddingTop: '6px' }}>
              <div style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', letterSpacing: '0.08em', marginBottom: '4px' }}>
                STRONGEST PAIRS
              </div>
              {notable.map((pair) => (
                <div
                  key={`${pair.a}-${pair.b}`}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--terminal-text-size)', padding: '1px 0' }}
                >
                  <span style={{ color: SECONDARY }}>
                    {pair.a} × {pair.b}
                  </span>
                  <span className="tabular-nums" style={{ color: pair.value > 0 ? 'var(--up)' : 'var(--down)' }}>
                    {pair.value > 0 ? '+' : ''}
                    {pair.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
