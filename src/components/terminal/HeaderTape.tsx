"use client";

// Slim always-visible ticker tape under the main header. Pulls straight from
// the instrument catalog; chips are clickable when the instrument is chartable.

import React from "react";
import { findInstrument } from "@/lib/instrumentCatalog";
import { useTerminalActions } from "./TerminalContext";

const TAPE_IDS = ["usdbrl", "di-jan28", "ust10y", "dxy", "wti", "gold", "spx", "ibov", "vix"];

const UP = "var(--up)";
const DOWN = "var(--down)";
const UNCH = "var(--text-3)";

export default function HeaderTape({ marketData }: { marketData: any | null }) {
  const { openChart } = useTerminalActions();

  return (
    <div
      className="no-scrollbar flex items-center gap-4 overflow-x-auto px-3 py-0.5 shrink-0"
      style={{ backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-ui)" }}
    >
      {TAPE_IDS.map((id) => {
        const instrument = findInstrument(id);
        if (!instrument) return null;
        const value = marketData ? instrument.getValue(marketData) : null;
        const change = marketData ? instrument.getChange(marketData) : null;
        const changeColor = change == null || change === 0 ? UNCH : change > 0 ? UP : DOWN;
        const chartable = Boolean(instrument.symbol);

        return (
          <button
            key={id}
            type="button"
            onClick={() => chartable && openChart(id)}
            title={chartable ? `Open ${instrument.label} chart` : undefined}
            className="flex items-center gap-1.5 whitespace-nowrap text-2xs"
            style={{ background: "none", border: "none", padding: 0, cursor: chartable ? "pointer" : "default" }}
          >
            <span style={{ color: "var(--text-3)" }}>{instrument.label}</span>
            <span className="tabular-nums" style={{ color: "var(--value)" }}>
              {value == null ? "---" : value.toFixed(instrument.decimals)}
            </span>
            <span className="tabular-nums" style={{ color: changeColor }}>
              {change == null
                ? ""
                : instrument.changeKind === "bps"
                  ? `${change > 0 ? "+" : ""}${change.toFixed(0)}bp`
                  : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
