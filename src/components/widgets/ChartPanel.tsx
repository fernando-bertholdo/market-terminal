"use client";

import React from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import { formatYield, formatRelativeTime } from "@/lib/formatters";

const PANEL_BG = "var(--surface)";
const HEADER_BG = "var(--surface-2)";
const HEADER_BORDER = "var(--border)";
const ORANGE = "var(--accent)";
const SECONDARY = "var(--text-2)";
// SVG attributes can't resolve CSS vars — concrete palette colors below.
const SVG_DIM = "#566076";
const SVG_SECONDARY = "#98a2b8";
const SVG_GRID = "#1f2735";
const SVG_GRID_SOFT = "#1a2130";
const SVG_VALUE = "#dde3ef";
const LINE = "#5e8bff";
const US_LINE = "#34c98e";

interface CurvePoint {
  label: string;
  value: number | null;
}

function CurveChart({
  title,
  points,
  color,
}: {
  title: string;
  points: CurvePoint[];
  color: string;
}) {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && isFinite(value));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = Math.max(max - min, 0.01);
  const width = 520;
  const height = 180;
  const padX = 34;
  const padY = 24;

  const coords = points.map((point, index) => {
    const x =
      padX + (index * (width - padX * 2)) / Math.max(points.length - 1, 1);
    const value = point.value ?? min;
    const y = height - padY - ((value - min) / span) * (height - padY * 2);
    return { ...point, x, y };
  });

  const path = coords
    .filter((point) => point.value !== null)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <section
      className="min-h-0"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface-2)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}
    >
      <div className="flex items-center justify-between h-7 px-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-[11px] font-semibold" style={{ color }}>
          {title}
        </span>
        <span className="text-[10px] text-dim">
          {values.length}/{points.length} LIVE
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-[220px]">
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke={SVG_GRID} />
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke={SVG_GRID}
        />
        {[0, 0.5, 1].map((tick) => {
          const y = height - padY - tick * (height - padY * 2);
          const label = min + tick * span;
          return (
            <g key={tick}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke={SVG_GRID_SOFT} />
              <text x={8} y={y + 3} fill={SVG_DIM} fontSize="10">
                {label.toFixed(2)}
              </text>
            </g>
          );
        })}
        {path && (
          <polyline
            points={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {coords.map((point) => (
          <g key={point.label}>
            {point.value !== null && (
              <circle cx={point.x} cy={point.y} r="3" fill={color} />
            )}
            <text
              x={point.x}
              y={height - 8}
              fill={SVG_SECONDARY}
              fontSize="10"
              textAnchor="middle"
            >
              {point.label}
            </text>
            <text
              x={point.x}
              y={Math.max(point.y - 9, 12)}
              fill={point.value === null ? SVG_DIM : SVG_VALUE}
              fontSize="10"
              textAnchor="middle"
            >
              {formatYield(point.value)}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}

export default function ChartPanel({
  active,
  marketState,
}: {
  active: boolean;
  marketState: MarketDataState;
}) {
  const { data, isLoading, isStale, lastUpdated } = marketState;
  const brazil = data?.brazil;
  const us = data?.us;
  const statusDotColor = isStale ? "var(--warn)" : isLoading ? "var(--text-3)" : "var(--up)";

  const brazilCurve: CurvePoint[] = [
    { label: "SELIC", value: brazil?.selic ?? null },
    { label: "N26", value: brazil?.di?.DI1N26?.rate ?? null },
    { label: "F27", value: brazil?.di?.DI1F27?.rate ?? null },
    { label: "F28", value: brazil?.di?.DI1F28?.rate ?? null },
    { label: "F30", value: brazil?.di?.DI1F30?.rate ?? null },
  ];

  const usCurve: CurvePoint[] = [
    { label: "FF", value: us?.fedFunds ?? null },
    { label: "2Y", value: us?.ust2y ?? null },
    { label: "5Y", value: us?.ust5y ?? null },
    { label: "10Y", value: us?.ust10y ?? null },
    { label: "30Y", value: us?.ust30y ?? null },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: PANEL_BG,
        border: `1px solid ${active ? ORANGE : HEADER_BORDER}`,
        borderRadius: "var(--radius)",
        boxShadow: "0 1px 10px rgba(0,0,0,0.30)",
        overflow: "hidden",
        fontFamily: "var(--font-ui)",
      }}
      data-panel="chart"
    >
      <div
        style={{
          height: "var(--terminal-panel-header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
          backgroundColor: HEADER_BG,
          borderBottom: `1px solid ${HEADER_BORDER}`,
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--text-1)", fontSize: 'var(--terminal-text-size)', fontWeight: 600, letterSpacing: "0.01em" }}>
          Curves
          <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: "8px" }}>Brazil &amp; US yield curves</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: SECONDARY, fontSize: 'var(--terminal-meta-size)' }}>
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: statusDotColor,
            }}
          />
          {lastUpdated ? formatRelativeTime(lastUpdated) : "LOADING"}
        </span>
      </div>

      <div className="grid flex-1 min-h-0 gap-2 p-2 overflow-y-auto xl:grid-cols-2">
        <CurveChart title="BRAZIL NOMINAL CURVE" points={brazilCurve} color={LINE} />
        <CurveChart title="US TREASURY CURVE" points={usCurve} color={US_LINE} />
      </div>
    </div>
  );
}
