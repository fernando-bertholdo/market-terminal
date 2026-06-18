'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { MarketDataState } from '@/hooks/useMarketData';
import { formatCommodity, formatRelativeTime } from '@/lib/formatters';
import { useTerminalActions } from '@/components/terminal/TerminalContext';

// ─── Design tokens (globals.css) ───────────────────────────────────────────────
const CMDTY_COLOR = 'var(--value)';
const UP_COLOR = 'var(--up)';
const DOWN_COLOR = 'var(--down)';
const UNCH_COLOR = 'var(--text-3)';
const SECONDARY = 'var(--text-2)';
const DIM = 'var(--text-3)';
const PANEL_BG = 'var(--surface)';
const HEADER_BG = 'var(--surface-2)';
const HEADER_BORDER = 'var(--border)';
const ROW_HOVER_BG = 'var(--surface-3)';
const ORANGE = 'var(--accent)';

interface CmdtyRow {
  label: string;
  value: number | null;
  changePct: number | null;
  unit?: string;
  decimals?: number;
  isLoading?: boolean;
  instrumentId?: string;
  onOpenChart?: (instrumentId: string) => void;
}

function getChangeColor(change: number | null): string {
  if (change === null || change === 0) return UNCH_COLOR;
  return change > 0 ? UP_COLOR : DOWN_COLOR;
}

function formatPctChange(pct: number | null): string {
  if (pct === null) return 'unch';
  if (pct === 0) return 'unch';
  const s = pct > 0 ? '+' : '';
  return `${s}${pct.toFixed(2)}%`;
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
function CmdtyRow({ label, value, changePct, unit, decimals = 2, isLoading, instrumentId, onOpenChart }: CmdtyRow) {
  const [hovered, setHovered] = useState(false);
  const flashClass = useFlash(value);
  const changeColor = getChangeColor(changePct);
  const clickable = Boolean(instrumentId && onOpenChart);

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 88px 76px',
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
        <span style={{ color: SECONDARY, fontSize: 'var(--terminal-text-size)', fontFamily: 'inherit' }}>{label}</span>
        <span style={{ textAlign: 'right', fontSize: 'var(--terminal-text-size)', color: DIM, fontFamily: 'inherit' }} className="animate-pulse">---</span>
        <span style={{ textAlign: 'right', fontSize: 'var(--terminal-text-size)', color: DIM, fontFamily: 'inherit' }} className="animate-pulse">---</span>
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
        style={{ color: CMDTY_COLOR, fontSize: 'var(--terminal-text-size)', fontFamily: 'inherit', textAlign: 'right' }}
      >
        {formatCommodity(value, decimals)}
      </span>
      <span
        className="tabular-nums"
        style={{ color: changeColor, fontSize: 'var(--terminal-text-size)', fontFamily: 'inherit', textAlign: 'right' }}
      >
        {formatPctChange(changePct)}
      </span>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function CommodityPanel({
  active,
  marketState,
}: {
  active: boolean;
  marketState: MarketDataState;
}) {
  const { data, isLoading, isStale, lastUpdated } = marketState;
  const { openChart } = useTerminalActions();

  const cmdty = data?.commodities ?? null;

  const rows: CmdtyRow[] = [
    { label: 'WTI', value: cmdty?.wti ?? null, changePct: cmdty?.wtiChangePct ?? null, unit: 'USD/bbl', instrumentId: 'wti' },
    { label: 'Brent', value: cmdty?.brent ?? null, changePct: cmdty?.brentChangePct ?? null, unit: 'USD/bbl', instrumentId: 'brent' },
    { label: 'Gold', value: cmdty?.gold ?? null, changePct: cmdty?.goldChangePct ?? null, unit: 'USD/oz', decimals: 0, instrumentId: 'gold' },
    { label: 'Iron Ore', value: cmdty?.ironOre ?? null, changePct: cmdty?.ironOreChangePct ?? null, unit: 'USD/t', instrumentId: 'ironore' },
    { label: 'Soybeans', value: cmdty?.soybeans ?? null, changePct: cmdty?.soybeansChangePct ?? null, unit: 'USc/bu', decimals: 2, instrumentId: 'soybeans' },
    { label: 'Copper', value: cmdty?.copper ?? null, changePct: cmdty?.copperChangePct ?? null, unit: 'USD/lb', decimals: 4, instrumentId: 'copper' },
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
      data-panel="commodities"
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
        <span style={{ color: 'var(--text-1)', fontSize: 'var(--terminal-text-size)', fontWeight: 600, letterSpacing: '0.01em' }}>
          Commodities
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Global</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: SECONDARY, fontSize: 'var(--terminal-meta-size)' }}>
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

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 88px 76px',
          height: 'var(--terminal-column-height)',
          padding: '0 8px',
          borderBottom: `1px solid var(--border)`,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)' }}>COMMODITY</span>
        <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>PRICE</span>
        <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', textAlign: 'right' }}>CHG %</span>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {isLoading
          ? rows.map((r) => <CmdtyRow key={r.label} {...r} value={null} changePct={null} isLoading />)
          : rows.map((r) => <CmdtyRow key={r.label} {...r} onOpenChart={openChart} />)
        }
      </div>
    </div>
  );
}
