"use client";

// ─── ATLAS shared UI kit ────────────────────────────────────────────────────────
// Small building blocks used across every page: cards, change chips, sparklines,
// stat tiles and meters. Colors come from the design tokens in globals.css;
// SVG attributes use concrete palette hexes (SVG can't resolve CSS vars).

import React from "react";

export const HEX = {
  up: "#34c98e",
  down: "#f0647a",
  accent: "#5e8bff",
  dim: "#566076",
  grid: "#1f2735",
  value: "#dde3ef",
  warn: "#e8a13c",
} as const;

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl ${className}`}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 12px rgba(0,0,0,0.28)",
      }}
    >
      {(title || right) && (
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              {title}
            </div>
            {subtitle && (
              <div className="truncate text-[11px]" style={{ color: "var(--text-3)" }}>
                {subtitle}
              </div>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function ChangeChip({
  value,
  kind = "pct",
  digits,
}: {
  value: number | null;
  kind?: "pct" | "bps";
  digits?: number;
}) {
  const dir = value == null || value === 0 ? "unch" : value > 0 ? "up" : "down";
  const color = dir === "unch" ? "var(--text-3)" : dir === "up" ? "var(--up)" : "var(--down)";
  const bg =
    dir === "unch"
      ? "var(--surface-3)"
      : dir === "up"
        ? "rgba(52,201,142,0.12)"
        : "rgba(240,100,122,0.12)";
  const text =
    value == null
      ? "—"
      : kind === "bps"
        ? `${value > 0 ? "+" : ""}${value.toFixed(digits ?? 1)} bp`
        : `${value > 0 ? "+" : ""}${value.toFixed(digits ?? 2)}%`;
  return (
    <span
      className="tabular-nums inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {dir === "up" ? "▲ " : dir === "down" ? "▼ " : ""}
      {text}
    </span>
  );
}

/** Minimal area sparkline. Color follows direction unless overridden. */
export function Sparkline({
  values,
  width = 160,
  height = 44,
  color,
  fill = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  // `width`/`height` define the viewBox coordinate space only; the SVG itself
  // renders at 100% of its container so it can never overflow a card on narrow
  // (mobile) screens. preserveAspectRatio="none" lets it stretch horizontally.
  if (values.length < 2) {
    return <div style={{ width: "100%", height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-9);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const stroke = color ?? (values[values.length - 1] >= values[0] ? HEX.up : HEX.down);
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block"
      style={{ display: "block", width: "100%", maxWidth: "100%" }}
    >
      {fill && <path d={area} fill={stroke} opacity={0.10} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Signed horizontal bar from a center axis, for movers / weights. */
export function SignedBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(Math.abs(value) / max, 1) : 0;
  const color = value >= 0 ? HEX.up : HEX.down;
  return (
    <div className="relative h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
      <div
        className="absolute top-0 h-full rounded-full"
        style={{
          backgroundColor: color,
          width: `${ratio * 50}%`,
          left: value >= 0 ? "50%" : `${50 - ratio * 50}%`,
        }}
      />
      <div className="absolute left-1/2 top-0 h-full w-px" style={{ backgroundColor: "var(--border-strong)" }} />
    </div>
  );
}

/** Score meter from -1 to +1 with a needle, for macro regimes. */
export function RegimeMeter({ score }: { score: number }) {
  const clamped = Math.max(-1, Math.min(1, score));
  const pct = ((clamped + 1) / 2) * 100;
  return (
    <div className="relative h-[8px] w-full rounded-full" style={{ background: "linear-gradient(90deg, #f0647a, #566076 50%, #34c98e)" }}>
      <div
        className="absolute top-1/2 h-[16px] w-[3px] -translate-y-1/2 rounded-full"
        style={{ left: `calc(${pct}% - 1.5px)`, backgroundColor: "#e8ecf4", boxShadow: "0 0 6px rgba(0,0,0,0.8)" }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  color = "var(--value)",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </div>
      <div className="tabular-nums mt-0.5 text-[18px] font-semibold leading-tight" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function relTime(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
