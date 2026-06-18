'use client';

import React, { useState } from 'react';
import type { NewsState } from '@/hooks/useNews';
import { formatRelativeTime } from '@/lib/formatters';
import type { NewsItem } from '@/types/market';

// ─── Design tokens (globals.css) ───────────────────────────────────────────────
const SECONDARY = 'var(--text-2)';
const DIM = 'var(--text-3)';
const TEXT_PRIMARY = 'var(--text-1)';
const PANEL_BG = 'var(--surface)';
const HEADER_BG = 'var(--surface-2)';
const HEADER_BORDER = 'var(--border)';
const ROW_HOVER_BG = 'var(--surface-3)';
const ORANGE = 'var(--accent)';

// ─── Source badge styles ──────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, React.CSSProperties> = {
  BLOOMBERG: {
    backgroundColor: 'rgba(94,139,255,0.14)',
    color: '#8fb0ff',
  },
  REUTERS: {
    backgroundColor: 'rgba(52,201,142,0.12)',
    color: '#6fd4ac',
  },
};

function getSourceBadgeStyle(source: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 4px',
    height: '14px',
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    borderRadius: '4px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  };
  const custom = BADGE_STYLES[source.toUpperCase()] ?? {
    backgroundColor: 'var(--surface-3)',
    color: SECONDARY,
  };
  return { ...base, ...custom };
}

// ─── Skeleton item ────────────────────────────────────────────────────────────
function SkeletonNewsItem() {
  return (
    <div
      style={{
        height: 'var(--terminal-news-row-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '6px',
        borderBottom: `1px solid var(--border)`,
        borderLeft: '2px solid transparent',
      }}
    >
      <span
        style={{
          width: '64px',
          height: '14px',
          backgroundColor: 'var(--surface-3)',
          borderRadius: '4px',
          flexShrink: 0,
        }}
        className="animate-pulse"
      />
      <span
        style={{
          flex: 1,
          height: '10px',
          backgroundColor: 'var(--surface-2)',
          borderRadius: '4px',
        }}
        className="animate-pulse"
      />
      <span
        style={{
          width: '36px',
          height: '10px',
          backgroundColor: 'var(--surface-2)',
          borderRadius: '4px',
          flexShrink: 0,
        }}
        className="animate-pulse"
      />
    </div>
  );
}

// ─── Single news item row ─────────────────────────────────────────────────────
function NewsRow({ item }: { item: NewsItem }) {
  const [hovered, setHovered] = useState(false);

  const rowStyle: React.CSSProperties = {
    height: 'var(--terminal-news-row-height)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    gap: '6px',
    borderBottom: `1px solid var(--border)`,
    backgroundColor: hovered ? ROW_HOVER_BG : 'transparent',
    borderLeft: hovered ? `2px solid ${ORANGE}` : '2px solid transparent',
    transition: 'background-color 75ms, border-left-color 75ms',
    cursor: 'pointer',
  };

  const normalizedSource = item.source.toUpperCase().includes('BLOOMBERG')
    ? 'BLOOMBERG'
    : item.source.toUpperCase().includes('REUTERS')
    ? 'REUTERS'
    : item.source.toUpperCase();

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={rowStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.title}
      className="focus:outline-none focus:ring-1 focus:ring-accent-orange"
    >
      {/* Source badge */}
      <span style={getSourceBadgeStyle(normalizedSource)}>
        {normalizedSource.length > 9 ? normalizedSource.slice(0, 9) : normalizedSource}
      </span>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--terminal-text-size)',
          color: hovered ? TEXT_PRIMARY : SECONDARY,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'var(--terminal-news-title-white-space)',
          lineHeight: 'var(--terminal-news-line-height)',
          fontFamily: 'inherit',
          transition: 'color 75ms',
          userSelect: 'text',
        }}
        title={item.title}
        data-selectable="true"
      >
        {item.title}
      </span>

      {/* Relative time */}
      <span
        style={{
          flexShrink: 0,
          fontSize: 'var(--terminal-meta-size)',
          color: DIM,
          fontFamily: 'inherit',
          minWidth: '40px',
          textAlign: 'right',
        }}
      >
        {formatRelativeTime(item.publishedAt)}
      </span>
    </a>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function NewsPanel({
  active,
  newsState,
}: {
  active: boolean;
  newsState: NewsState;
}) {
  const { items, isLoading, isRefreshing, fetchedAt, error, refreshInterval } = newsState;

  const showSkeleton = isLoading && items.length === 0;

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
      data-panel="news"
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
          News
          <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: '8px' }}>Markets</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: SECONDARY, fontSize: 'var(--terminal-meta-size)' }}>
          {items.length > 0 && (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: error ? 'var(--down)' : isRefreshing ? ORANGE : 'var(--up)',
                }}
              />
              {isRefreshing
                ? 'UPDATING'
                : fetchedAt
                ? `LIVE ${Math.round(refreshInterval / 1000)}s - UPD ${formatRelativeTime(fetchedAt)}`
                : `${items.length} ITEMS`}
            </>
          )}
          {isLoading && items.length === 0 && (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: DIM,
                }}
                className="animate-pulse"
              />
              LOADING
            </>
          )}
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 'var(--terminal-column-height)',
          padding: '0 8px',
          borderBottom: `1px solid var(--border)`,
          gap: '6px',
          flexShrink: 0,
        }}
      >
        <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', width: '64px', flexShrink: 0 }}>SOURCE</span>
        <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', flex: 1 }}>HEADLINE</span>
        <span style={{ color: DIM, fontSize: 'var(--terminal-meta-size)', minWidth: '40px', textAlign: 'right' }}>AGE</span>
      </div>

      {/* Scrollable news list */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {showSkeleton && (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonNewsItem key={i} />
            ))}
          </>
        )}
        {!showSkeleton && items.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: DIM,
              fontSize: 'var(--terminal-text-size)',
              fontFamily: 'inherit',
            }}
          >
            NO HEADLINES
          </div>
        )}
        {items.map((item) => (
          <NewsRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
