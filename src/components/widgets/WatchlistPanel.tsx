"use client";

// ─── Editable Watchlist (MY TAPE) ───────────────────────────────────────────────
// Instruments come from the catalog and persist in localStorage. Rows are
// clickable (chart overlay), removable on hover, and new instruments can be
// added via the search box in the footer.

import React, { useMemo, useState } from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import { formatRelativeTime } from "@/lib/formatters";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useTerminalActions } from "@/components/terminal/TerminalContext";
import { findInstrument, INSTRUMENT_CATALOG, type CatalogInstrument } from "@/lib/instrumentCatalog";

const PANEL_BG = "var(--surface)";
const HEADER_BG = "var(--surface-2)";
const HEADER_BORDER = "var(--border)";
const ORANGE = "var(--accent)";
const SECONDARY = "var(--text-2)";
const DIM = "var(--text-3)";
const UP = "var(--up)";
const DOWN = "var(--down)";
const UNCH = "var(--text-3)";
const VALUE_COLOR = "var(--value)";

function changeColor(value: number | null) {
  if (value === null || value === 0) return UNCH;
  return value > 0 ? UP : DOWN;
}

function formatChange(instrument: CatalogInstrument, change: number | null): string {
  if (change === null || change === 0) return "unch";
  const s = change > 0 ? "+" : "";
  return instrument.changeKind === "bps"
    ? `${s}${change.toFixed(1)}bp`
    : `${s}${change.toFixed(2)}%`;
}

function WatchRow({
  instrument,
  data,
  onRemove,
  onOpenChart,
}: {
  instrument: CatalogInstrument;
  data: any;
  onRemove: () => void;
  onOpenChart: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const value = instrument.getValue(data);
  const change = instrument.getChange(data);
  const chartable = Boolean(instrument.symbol);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => chartable && onOpenChart()}
      title={chartable ? `Open ${instrument.label} chart` : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 86px 74px 42px",
        alignItems: "center",
        height: "var(--terminal-row-height)",
        padding: "0 8px",
        borderBottom: `1px solid var(--border)`,
        color: SECONDARY,
        fontSize: "var(--terminal-text-size)",
        backgroundColor: hovered ? "var(--surface-3)" : "transparent",
        borderLeft: hovered ? `2px solid ${ORANGE}` : "2px solid transparent",
        cursor: chartable ? "pointer" : "default",
        transition: "background-color 75ms, border-left-color 75ms",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {instrument.label}
      </span>
      <span className="tabular-nums" style={{ textAlign: "right", color: VALUE_COLOR }}>
        {value == null ? "---" : value.toFixed(instrument.decimals)}
      </span>
      <span className="tabular-nums" style={{ textAlign: "right", color: changeColor(change) }}>
        {formatChange(instrument, change)}
      </span>
      <span style={{ textAlign: "right", color: DIM }}>
        {hovered ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            title="Remove from tape"
            style={{ color: DOWN, background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}
          >
            ✕
          </button>
        ) : (
          instrument.source
        )}
      </span>
    </div>
  );
}

export default function WatchlistPanel({
  active,
  marketState,
}: {
  active: boolean;
  marketState: MarketDataState;
}) {
  const { data, isLoading, isStale, lastUpdated } = marketState;
  const { ids, add, remove } = useWatchlist();
  const { openChart } = useTerminalActions();
  const [search, setSearch] = useState("");

  const instruments = useMemo(
    () => ids.map((id) => findInstrument(id)).filter((inst): inst is CatalogInstrument => Boolean(inst)),
    [ids]
  );

  const candidates = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return INSTRUMENT_CATALOG.filter(
      (inst) => !ids.includes(inst.id) && `${inst.label} ${inst.group}`.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search, ids]);

  const statusDotColor = isStale ? ORANGE : isLoading ? DIM : UP;

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
      data-panel="watchlist"
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
        <span style={{ color: "var(--text-1)", fontSize: "var(--terminal-text-size)", fontWeight: 600, letterSpacing: "0.01em" }}>
          My Tape
          <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: "8px" }}>Watchlist</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: SECONDARY, fontSize: "var(--terminal-meta-size)" }}>
          <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: statusDotColor }} />
          {lastUpdated ? formatRelativeTime(lastUpdated) : "LOADING"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 86px 74px 42px",
          height: "var(--terminal-column-height)",
          padding: "0 8px",
          borderBottom: `1px solid var(--border)`,
          alignItems: "center",
          flexShrink: 0,
          color: DIM,
          fontSize: "var(--terminal-meta-size)",
        }}
      >
        <span>ITEM</span>
        <span style={{ textAlign: "right" }}>LAST</span>
        <span style={{ textAlign: "right" }}>CHG</span>
        <span style={{ textAlign: "right" }}>SRC</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {instruments.map((instrument) => (
          <WatchRow
            key={instrument.id}
            instrument={instrument}
            data={data}
            onRemove={() => remove(instrument.id)}
            onOpenChart={() => openChart(instrument.id)}
          />
        ))}
      </div>

      {/* Add-instrument footer */}
      <div style={{ borderTop: `1px solid ${HEADER_BORDER}`, flexShrink: 0, position: "relative" }}>
        {candidates.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              backgroundColor: "var(--surface-2)",
              border: `1px solid ${ORANGE}`,
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            {candidates.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => {
                  add(inst.id);
                  setSearch("");
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "4px 8px",
                  background: "none",
                  border: "none",
                  borderBottom: `1px solid ${HEADER_BORDER}`,
                  color: SECONDARY,
                  fontSize: "var(--terminal-text-size)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{inst.label}</span>
                <span style={{ color: DIM }}>{inst.group}</span>
              </button>
            ))}
          </div>
        )}
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="+ add instrument (type to search)..."
          style={{
            width: "100%",
            backgroundColor: HEADER_BG,
            color: SECONDARY,
            border: "none",
            outline: "none",
            padding: "4px 8px",
            fontSize: "var(--terminal-meta-size)",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
