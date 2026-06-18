'use client';

// ─── Quant Simulator Panel ──────────────────────────────────────────────────────
// Paper-trading book + 2y walk-forward backtest of the three strategy sleeves
// (TSMOM / CARRY / MACRO). No real orders are ever sent — fills are simulated
// at the latest close with transaction costs.

import React, { useMemo, useState } from 'react';
import { useSim } from '@/hooks/useSim';

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

function signColor(value: number | null | undefined): string {
  if (value == null || value === 0) return UNCH;
  return value > 0 ? UP : DOWN;
}

function fmtUsd(value: number | null | undefined): string {
  if (value == null) return '---';
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value == null) return '---';
  const s = value > 0 ? '+' : '';
  return `${s}${(value * 100).toFixed(digits)}%`;
}

function fmtWeight(value: number | null | undefined): string {
  if (value == null) return '---';
  const s = value > 0 ? '+' : '';
  return `${s}${(value * 100).toFixed(1)}%`;
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

function EquitySparkline({ values, height = 64 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null;
  const width = 600;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - ((v - min) / span) * (height - 6) - 3).toFixed(1)}`)
    .join(' ');
  // SVG attributes can't resolve CSS vars — use concrete palette colors here.
  const last = values[values.length - 1];
  const lineColor = last >= values[0] ? '#34c98e' : '#f0647a';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: `${height}px`, display: 'block', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}
    >
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StatCells({ stats }: { stats: any }) {
  return (
    <>
      <span className="tabular-nums" style={{ color: signColor(stats?.totalReturn), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {fmtPct(stats?.totalReturn)}
      </span>
      <span className="tabular-nums" style={{ color: VALUE_COLOR, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {stats?.annualVol != null ? `${(stats.annualVol * 100).toFixed(1)}%` : '---'}
      </span>
      <span className="tabular-nums" style={{ color: signColor(stats?.sharpe), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {stats?.sharpe != null ? stats.sharpe.toFixed(2) : '---'}
      </span>
      <span className="tabular-nums" style={{ color: DOWN, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {stats?.maxDrawdown != null ? `${(stats.maxDrawdown * 100).toFixed(1)}%` : '---'}
      </span>
      <span className="tabular-nums" style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
        {stats?.hitRate != null ? `${(stats.hitRate * 100).toFixed(0)}%` : '---'}
      </span>
    </>
  );
}

const STAT_GRID = '1fr 70px 60px 56px 64px 50px';

export default function SimPanel({ active }: { active: boolean }) {
  const sim = useSim(60_000);
  const [confirmReset, setConfirmReset] = useState(false);
  const data = sim.data;
  const backtest = data?.backtest ?? null;
  const portfolio = data?.portfolio ?? null;
  const signals: any[] = data?.signals ?? [];

  const sleeveRows = useMemo(
    () => [
      { key: 'tsmom', label: 'TSMOM (12m/3m trend)' },
      { key: 'carry', label: 'CARRY (SELIC−FF, BRL)' },
      { key: 'macro', label: 'MACRO (econ trend)' },
    ],
    []
  );

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setConfirmReset(false);
    await sim.reset();
  };

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
      data-panel="sim"
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
          Quant Sim
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Paper only</span>
        </span>
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => sim.rebalance()}
            style={{ color: SECONDARY, fontSize: 'var(--terminal-meta-size)', background: 'var(--surface-3)', border: `1px solid var(--border-strong)`, borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}
            title="Force rebalance to current target weights"
          >
            Rebalance
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              color: confirmReset ? DOWN : SECONDARY,
              fontSize: 'var(--terminal-meta-size)',
              background: 'var(--surface-3)',
              border: `1px solid ${confirmReset ? DOWN : 'var(--border-strong)'}`,
              borderRadius: '6px',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
            title="Reset paper book to $1,000,000"
          >
            {confirmReset ? 'Sure?' : 'Reset'}
          </button>
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {sim.error && !data && (
          <div style={{ padding: '12px 8px', color: DOWN, fontSize: 'var(--terminal-text-size)' }}>
            SIM UNAVAILABLE — {sim.error}
          </div>
        )}
        {sim.isLoading && !data && (
          <div className="animate-pulse" style={{ padding: '12px 8px', color: DIM, fontSize: 'var(--terminal-text-size)' }}>
            LOADING BACKTEST + PAPER BOOK...
          </div>
        )}

        {portfolio && (
          <>
            <GroupLabel text="PAPER PORTFOLIO" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                padding: '6px 8px',
                gap: '4px',
                borderBottom: `1px solid var(--border)`,
              }}
            >
              <div>
                <div style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>EQUITY</div>
                <div className="tabular-nums" style={{ color: VALUE_COLOR, fontSize: 'var(--terminal-text-size)' }}>
                  ${fmtUsd(portfolio.equity)}
                </div>
              </div>
              <div>
                <div style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>P&L</div>
                <div className="tabular-nums" style={{ color: signColor(portfolio.totalReturnPct), fontSize: 'var(--terminal-text-size)' }}>
                  {portfolio.totalReturnPct != null ? `${portfolio.totalReturnPct > 0 ? '+' : ''}${portfolio.totalReturnPct.toFixed(2)}%` : '---'}
                </div>
              </div>
              <div>
                <div style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>CASH</div>
                <div className="tabular-nums" style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>
                  ${fmtUsd(portfolio.cash)}
                </div>
              </div>
              <div>
                <div style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>LAST REBAL</div>
                <div className="tabular-nums" style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>
                  {portfolio.lastRebalanceDate ?? '---'}
                </div>
              </div>
            </div>
          </>
        )}

        {backtest && (
          <>
            <GroupLabel text="BACKTEST EQUITY — 2Y WALK-FORWARD, NET OF COSTS" />
            <div style={{ padding: '4px 8px', borderBottom: `1px solid var(--border)` }}>
              <EquitySparkline values={backtest.equity} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: DIM, fontSize: 'var(--terminal-meta-size)', paddingTop: '2px' }}>
                <span>{backtest.dates[0]}</span>
                <span>cost drag {fmtPct(-backtest.costDrag, 2)}</span>
                <span>{backtest.dates[backtest.dates.length - 1]}</span>
              </div>
            </div>

            <GroupLabel text="STRATEGY STATS — RET / VOL / SHARPE / MAXDD / HIT" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: STAT_GRID,
                height: 'var(--terminal-column-height)',
                padding: '0 8px',
                borderBottom: `1px solid var(--border)`,
                alignItems: 'center',
              }}
            >
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>SLEEVE</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>RET</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>VOL</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>SHP</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>MAXDD</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>HIT</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: STAT_GRID,
                alignItems: 'center',
                height: 'var(--terminal-row-height)',
                padding: '0 8px',
                borderBottom: `1px solid var(--border)`,
              }}
            >
              <span style={{ color: ORANGE, fontSize: 'var(--terminal-text-size)' }}>COMBINED</span>
              <StatCells stats={backtest.combined} />
            </div>
            {sleeveRows.map((row) => (
              <div
                key={row.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: STAT_GRID,
                  alignItems: 'center',
                  height: 'var(--terminal-row-height)',
                  padding: '0 8px',
                  borderBottom: `1px solid var(--border)`,
                }}
              >
                <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.label}
                </span>
                <StatCells stats={backtest.sleeves?.[row.key]} />
              </div>
            ))}
          </>
        )}

        {signals.length > 0 && (
          <>
            <GroupLabel text="CURRENT SIGNALS & TARGET WEIGHTS" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 64px 64px 64px 70px',
                height: 'var(--terminal-column-height)',
                padding: '0 8px',
                borderBottom: `1px solid var(--border)`,
                alignItems: 'center',
              }}
            >
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>ASSET</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>TREND</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>CARRY</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>MREV</span>
              <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>TGT WGT</span>
            </div>
            {signals.map((signal) => (
              <div
                key={signal.symbol}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 64px 64px 64px 70px',
                  alignItems: 'center',
                  height: 'var(--terminal-row-height)',
                  padding: '0 8px',
                  borderBottom: `1px solid var(--border)`,
                }}
              >
                <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>{signal.label}</span>
                {(['tsmom', 'carry', 'macro'] as const).map((sleeve) => (
                  <span
                    key={sleeve}
                    className="tabular-nums"
                    style={{ color: signColor(signal.signals?.[sleeve]), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}
                  >
                    {signal.signals?.[sleeve] != null && signal.signals[sleeve] !== 0
                      ? (signal.signals[sleeve] > 0 ? '▲' : '▼') + Math.abs(signal.signals[sleeve]).toFixed(1)
                      : 'Â·'}
                  </span>
                ))}
                <span className="tabular-nums" style={{ color: signColor(signal.totalWeight), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
                  {fmtWeight(signal.totalWeight)}
                </span>
              </div>
            ))}
          </>
        )}

        {portfolio?.positions?.length > 0 && (
          <>
            <GroupLabel text="OPEN POSITIONS" />
            {portfolio.positions.map((pos: any) => (
              <div
                key={pos.symbol}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 90px 80px',
                  alignItems: 'center',
                  height: 'var(--terminal-row-height)',
                  padding: '0 8px',
                  borderBottom: `1px solid var(--border)`,
                }}
              >
                <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>
                  {pos.notional >= 0 ? 'L ' : 'S '}
                  {pos.label}
                </span>
                <span className="tabular-nums" style={{ color: VALUE_COLOR, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
                  {fmtWeight(pos.weight)}
                </span>
                <span className="tabular-nums" style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
                  ${fmtUsd(Math.abs(pos.notional))}
                </span>
                <span className="tabular-nums" style={{ color: signColor(pos.unrealizedPnl), fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}
                  {fmtUsd(pos.unrealizedPnl)}
                </span>
              </div>
            ))}
          </>
        )}

        {portfolio?.recentTrades?.length > 0 && (
          <>
            <GroupLabel text="RECENT SIMULATED FILLS" />
            {portfolio.recentTrades.slice(0, 10).map((trade: any, i: number) => (
              <div
                key={`${trade.date}-${trade.symbol}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 50px 90px',
                  alignItems: 'center',
                  height: 'var(--terminal-row-height)',
                  padding: '0 8px',
                  borderBottom: `1px solid var(--border)`,
                }}
              >
                <span className="tabular-nums" style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>
                  {trade.date.slice(5, 10)} {trade.date.slice(11, 16)}
                </span>
                <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)' }}>{trade.symbol}</span>
                <span style={{ color: trade.side === 'BUY' ? UP : DOWN, fontSize: 'var(--terminal-text-size)' }}>
                  {trade.side}
                </span>
                <span className="tabular-nums" style={{ color: VALUE_COLOR, fontSize: 'var(--terminal-text-size)', textAlign: 'right' }}>
                  ${fmtUsd(trade.notional)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
