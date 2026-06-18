'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { MarketDataState } from '@/hooks/useMarketData';
import { formatYield, formatBps, formatRelativeTime } from '@/lib/formatters';
import { useTerminalActions } from '@/components/terminal/TerminalContext';
import { findInstrument } from '@/lib/instrumentCatalog';

// ─── Design tokens (globals.css) ───────────────────────────────────────────────
const YIELD_COLOR = 'var(--value)';
// Inverted convention for yields: rate UP = bad (red), rate DOWN = good (green)
const YIELD_UP_COLOR = 'var(--down)';
const YIELD_DOWN_COLOR = 'var(--up)';
const UNCH_COLOR = 'var(--text-3)';
const SECONDARY = 'var(--text-2)';
const DIM = 'var(--text-3)';
const PANEL_BG = 'var(--surface)';
const HEADER_BG = 'var(--surface-2)';
const HEADER_BORDER = 'var(--border)';
const ROW_HOVER_BG = 'var(--surface-3)';
const ORANGE = 'var(--accent)';

interface RateRow {
  label: string;
  value: number | null;
  change: number | null; // in bps
  isLoading?: boolean;
  instrumentId?: string;
  onOpenChart?: (instrumentId: string) => void;
}

function getYieldChangeColor(change: number | null): string {
  if (change === null || change === 0) return UNCH_COLOR;
  return change > 0 ? YIELD_UP_COLOR : YIELD_DOWN_COLOR;
}

function formatChangeBps(bps: number | null): string {
  if (bps === null) return 'unch';
  if (bps === 0) return 'unch';
  const s = bps > 0 ? '+' : '';
  return `${s}${bps.toFixed(1)} bps`;
}

// ─── Flash hook ───────────────────────────────────────────────────────────────
function useFlash(value: number | null): string {
  const prevRef = useRef<number | null>(null);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (prevRef.current !== null && value !== null && value !== prevRef.current) {
      const cls = value > prevRef.current ? 'flash-up' : 'flash-down';
      setFlashClass(cls);
      const t = setTimeout(() => setFlashClass(''), 600);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
    prevRef.current = value;
  }, [value]);

  return flashClass;
}

// ─── Individual row ───────────────────────────────────────────────────────────
function RateRow({ label, value, change, isLoading, instrumentId, onOpenChart }: RateRow) {
  const [hovered, setHovered] = useState(false);
  const flashClass = useFlash(value);
  const changeColor = getYieldChangeColor(change);
  const clickable = Boolean(
    instrumentId && onOpenChart && findInstrument(instrumentId)?.symbol
  );

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 90px',
    alignItems: 'center',
    height: 'var(--terminal-row-height)',
    padding: '0 8px',
    borderBottom: `1px solid var(--border)`,
    backgroundColor: hovered ? ROW_HOVER_BG : 'transparent',
    borderLeft: hovered ? `2px solid ${ORANGE}` : '2px solid transparent',
    transition: 'background-color 75ms, border-left-color 75ms',
    cursor: clickable ? 'pointer' : 'default',
  };

  if (isLoading) {
    return (
      <div style={rowStyle}>
        <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)', fontFamily: 'inherit' }}>
          {label}
        </span>
        <span
          style={{
            textAlign: 'right',
            fontSize: 'var(--terminal-text-size)',
            color: DIM,
            fontFamily: 'inherit',
          }}
          className="animate-pulse"
        >
          ---
        </span>
        <span
          style={{
            textAlign: 'right',
            fontSize: 'var(--terminal-text-size)',
            color: DIM,
            fontFamily: 'inherit',
          }}
          className="animate-pulse"
        >
          ---
        </span>
      </div>
    );
  }

  return (
    <div
      style={rowStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => clickable && onOpenChart!(instrumentId!)}
      title={clickable ? `Open ${label} chart` : undefined}
    >
      <span
        style={{
          color: SECONDARY,
          fontSize: 'var(--terminal-text-size)',
          fontFamily: 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${flashClass}`}
        style={{
          color: YIELD_COLOR,
          fontSize: 'var(--terminal-text-size)',
          fontFamily: 'inherit',
          textAlign: 'right',
        }}
      >
        {formatYield(value)}
      </span>
      <span
        className="tabular-nums"
        style={{
          color: changeColor,
          fontSize: 'var(--terminal-text-size)',
          fontFamily: 'inherit',
          textAlign: 'right',
        }}
      >
        {formatChangeBps(change)}
      </span>
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <RateRow key={i} label="------" value={null} change={null} isLoading />
      ))}
    </>
  );
}

// ─── Group label ──────────────────────────────────────────────────────────────
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
        fontFamily: 'inherit',
      }}
    >
      {text}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: '1px', backgroundColor: HEADER_BORDER }} />;
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
export default function RatesPanel({
  active,
  marketState,
}: {
  active: boolean;
  marketState: MarketDataState;
}) {
  const { data, isLoading, isStale, lastUpdated } = marketState;
  const { openChart } = useTerminalActions();

  // Extract Brazil rows
  const brazil = data?.brazil ?? null;
  const us = data?.us ?? null;

  const brazilRows: RateRow[] = [
    { label: 'SELIC', value: brazil?.selic ?? null, change: brazil?.selicChange ?? null, instrumentId: 'selic' },
    { label: 'CDI', value: brazil?.cdi ?? null, change: brazil?.cdiChange ?? null, instrumentId: 'cdi' },
    { label: 'DI Jul/26', value: brazil?.di?.DI1N26?.rate ?? null, change: brazil?.di?.DI1N26?.change ?? null, instrumentId: 'di-jul26' },
    { label: 'DI Jan/27', value: brazil?.di?.DI1F27?.rate ?? null, change: brazil?.di?.DI1F27?.change ?? null, instrumentId: 'di-jan27' },
    { label: 'DI Jan/28', value: brazil?.di?.DI1F28?.rate ?? null, change: brazil?.di?.DI1F28?.change ?? null, instrumentId: 'di-jan28' },
    { label: 'DI Jan/30', value: brazil?.di?.DI1F30?.rate ?? null, change: brazil?.di?.DI1F30?.change ?? null, instrumentId: 'di-jan30' },
  ];

  const usRows: RateRow[] = [
    { label: 'Fed Funds', value: us?.fedFunds ?? null, change: us?.fedFundsChange ?? null, instrumentId: 'fedfunds' },
    { label: 'US 2Y', value: us?.ust2y ?? null, change: us?.ust2yChange ?? null, instrumentId: 'ust2y' },
    { label: 'US 5Y', value: us?.ust5y ?? null, change: us?.ust5yChange ?? null, instrumentId: 'ust5y' },
    { label: 'US 10Y', value: us?.ust10y ?? null, change: us?.ust10yChange ?? null, instrumentId: 'ust10y' },
    { label: 'US 30Y', value: us?.ust30y ?? null, change: us?.ust30yChange ?? null, instrumentId: 'ust30y' },
  ];

  const statusDotColor = isStale ? 'var(--warn)' : isLoading ? DIM : 'var(--up)';

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
        fontFamily: 'var(--font-ui)',
      }}
      data-panel="rates"
    >
      {/* Panel header */}
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
        <span
          style={{
            color: 'var(--text-1)',
            fontSize: 'var(--terminal-text-size)',
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          Rates
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Brazil / US</span>
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: SECONDARY,
            fontSize: 'var(--terminal-meta-size)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusDotColor,
            }}
          />
          {lastUpdated ? formatRelativeTime(lastUpdated) : 'LOADING'}
        </span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 90px',
            height: 'var(--terminal-column-height)',
            padding: '0 8px',
            borderBottom: `1px solid var(--border)`,
            alignItems: 'center',
          }}
        >
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>INSTRUMENT</span>
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>RATE</span>
          <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>CHANGE</span>
        </div>

        <GroupLabel text="BRAZIL" />
        {isLoading ? (
          <SkeletonRows count={6} />
        ) : (
          brazilRows.map((row) => (
            <RateRow key={row.label} {...row} onOpenChart={openChart} />
          ))
        )}

        <Divider />

        <GroupLabel text="US TREASURIES" />
        {isLoading ? (
          <SkeletonRows count={5} />
        ) : (
          usRows.map((row) => (
            <RateRow key={row.label} {...row} onOpenChart={openChart} />
          ))
        )}
      </div>
    </div>
  );
}
