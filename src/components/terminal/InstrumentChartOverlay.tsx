"use client";

// ─── Instrument Chart Overlay ───────────────────────────────────────────────────
// Full-screen modal opened by clicking any chartable instrument row anywhere in
// the terminal (or via the command palette). Interactive lightweight-charts
// price chart with crosshair/zoom, range switching, summary stats, and price
// alert management for the instrument.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";
import { findInstrument } from "@/lib/instrumentCatalog";
import { useHistory } from "@/hooks/useHistory";
import { dailyReturns, realizedVol, zScore } from "@/lib/analytics";
import type { PriceAlert } from "@/hooks/useAlerts";

// Concrete palette hexes (not CSS vars) — the lightweight-charts canvas
// resolves colors itself and cannot read CSS custom properties.
const ACCENT = "#5e8bff";
const DIM = "#566076";
const SECONDARY = "#98a2b8";
const VALUE_COLOR = "#dde3ef";
const UP = "#34c98e";
const DOWN = "#f0647a";
const SURFACE = "#10141d";
const SURFACE_2 = "#151a26";
const BORDER = "#1f2735";
const MONO = "'JetBrains Mono', 'Fira Code', Consolas, ui-monospace, monospace";
const UI_FONT = "var(--font-ui)";

const RANGES = [
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
  { id: "5y", label: "5Y" },
] as const;

function Stat({ label, value, color = VALUE_COLOR }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: "90px" }}>
      <div style={{ color: DIM, fontSize: "10px", letterSpacing: "0.08em" }}>{label}</div>
      <div className="tabular-nums" style={{ color, fontSize: "13px" }}>{value}</div>
    </div>
  );
}

export default function InstrumentChartOverlay({
  instrumentId,
  marketData,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onClose,
}: {
  instrumentId: string;
  marketData: any | null;
  alerts: PriceAlert[];
  onAddAlert: (instrumentId: string, direction: "above" | "below", level: number) => void;
  onRemoveAlert: (id: string) => void;
  onClose: () => void;
}) {
  const instrument = findInstrument(instrumentId);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("1y");
  const [alertLevel, setAlertLevel] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const symbols = useMemo(
    () => (instrument?.symbol ? [instrument.symbol] : []),
    [instrument?.symbol]
  );
  const history = useHistory(symbols, range);
  const bars = instrument?.symbol ? history.data?.[instrument.symbol]?.bars ?? [] : [];

  const liveValue = instrument && marketData ? instrument.getValue(marketData) : null;
  const instrumentAlerts = alerts.filter((alert) => alert.instrumentId === instrumentId);

  // Build / rebuild the chart whenever the data changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || bars.length < 2) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: SURFACE },
        textColor: SECONDARY,
        fontFamily: MONO,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: BORDER },
        horzLines: { color: BORDER },
      },
      crosshair: {
        vertLine: { color: ACCENT, width: 1, style: 3, labelBackgroundColor: ACCENT },
        horzLine: { color: ACCENT, width: 1, style: 3, labelBackgroundColor: ACCENT },
      },
      rightPriceScale: { borderColor: BORDER },
      timeScale: { borderColor: BORDER },
    });
    chartRef.current = chart;

    const first = bars[0].close;
    const last = bars[bars.length - 1].close;
    const lineColor = last >= first ? UP : DOWN;

    const series = chart.addAreaSeries({
      lineColor,
      lineWidth: 2,
      topColor: `${lineColor}33`,
      bottomColor: "transparent",
      priceFormat: { type: "price", precision: instrument?.decimals ?? 2, minMove: 1 / 10 ** (instrument?.decimals ?? 2) },
    });
    series.setData(bars.map((bar) => ({ time: bar.date, value: bar.close })));

    // Draw pending alert levels as horizontal price lines.
    for (const alert of instrumentAlerts.filter((a) => !a.triggeredAt)) {
      series.createPriceLine({
        price: alert.level,
        color: ACCENT,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: alert.direction === "above" ? "ALERT ≥" : "ALERT ≤",
      });
    }

    chart.timeScale().fitContent();
    return () => {
      chartRef.current = null;
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, instrumentAlerts.length, instrument?.decimals]);

  // ESC closes the overlay before the global handler sees it.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [onClose]);

  if (!instrument) return null;

  const closes = bars.map((bar) => bar.close);
  const returns = dailyReturns(closes);
  const rangeChange = closes.length > 1 ? closes[closes.length - 1] / closes[0] - 1 : null;
  const high = closes.length > 0 ? Math.max(...closes) : null;
  const low = closes.length > 0 ? Math.min(...closes) : null;
  const vol = returns.length > 30 ? realizedVol(returns, 60) : null;
  const z = closes.length >= 20 ? zScore(closes, 20) : null;
  const fmt = (value: number | null) => (value == null ? "---" : value.toFixed(instrument.decimals));

  const submitAlert = () => {
    const level = parseFloat(alertLevel.replace(",", "."));
    if (!isFinite(level)) return;
    onAddAlert(instrumentId, alertDirection, level);
    setAlertLevel("");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70"
      onMouseDown={onClose}
      role="presentation"
      style={{ fontFamily: UI_FONT, backdropFilter: "blur(2px)" }}
    >
      <div
        className="mx-auto mt-10 flex w-[min(960px,calc(100vw-24px))] flex-col border"
        style={{ borderColor: "#2c3750", backgroundColor: SURFACE, borderRadius: "12px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", maxHeight: "calc(100vh - 80px)" }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${instrument.label} chart`}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: SURFACE_2,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <span style={{ color: VALUE_COLOR, fontWeight: 600, fontSize: "14px" }}>
            {instrument.label}
            <span style={{ color: DIM, fontWeight: 400, marginLeft: "10px", fontSize: "12px" }}>{instrument.symbol ?? "no chart source"}</span>
          </span>
          <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                style={{
                  color: range === r.id ? ACCENT : SECONDARY,
                  border: `1px solid ${range === r.id ? ACCENT : "#2c3750"}`,
                  background: range === r.id ? "rgba(94,139,255,0.12)" : SURFACE_2,
                  borderRadius: "6px",
                  padding: "2px 9px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              style={{ color: SECONDARY, border: "1px solid #2c3750", background: SURFACE_2, borderRadius: "6px", padding: "2px 9px", fontSize: "11px", cursor: "pointer", marginLeft: "8px" }}
            >
              ESC
            </button>
          </span>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>
          <Stat label="LAST" value={fmt(liveValue ?? (closes.length ? closes[closes.length - 1] : null))} />
          <Stat
            label={`CHG ${RANGES.find((r) => r.id === range)?.label}`}
            value={rangeChange == null ? "---" : `${rangeChange > 0 ? "+" : ""}${(rangeChange * 100).toFixed(2)}%`}
            color={rangeChange == null || rangeChange === 0 ? SECONDARY : rangeChange > 0 ? UP : DOWN}
          />
          <Stat label="HIGH" value={fmt(high)} />
          <Stat label="LOW" value={fmt(low)} />
          <Stat label="VOL 60D" value={vol == null ? "---" : `${(vol * 100).toFixed(1)}%`} />
          <Stat
            label="Z 20D"
            value={z == null ? "---" : `${z > 0 ? "+" : ""}${z.toFixed(2)}σ`}
            color={z != null && Math.abs(z) >= 2 ? ACCENT : SECONDARY}
          />
        </div>

        {/* Chart */}
        <div style={{ position: "relative", height: "380px", flexShrink: 0 }}>
          {!instrument.symbol ? (
            <div style={{ padding: "24px 10px", color: SECONDARY, fontSize: "12px" }}>
              No chart source for this instrument (BCB/B3 series have no free history feed).
            </div>
          ) : history.isLoading && bars.length === 0 ? (
            <div className="animate-pulse" style={{ padding: "24px 10px", color: DIM, fontSize: "12px" }}>
              LOADING HISTORY...
            </div>
          ) : bars.length < 2 ? (
            <div style={{ padding: "24px 10px", color: DOWN, fontSize: "12px" }}>
              HISTORY UNAVAILABLE{history.error ? ` — ${history.error}` : ""}
            </div>
          ) : (
            <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
          )}
        </div>

        {/* Alerts */}
        <div style={{ padding: "8px 10px", borderTop: `1px solid ${BORDER}`, overflowY: "auto" }}>
          <div style={{ color: DIM, fontSize: "10px", letterSpacing: "0.08em", marginBottom: "4px" }}>
            PRICE ALERTS
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
            <select
              value={alertDirection}
              onChange={(event) => setAlertDirection(event.target.value as "above" | "below")}
              style={{ backgroundColor: SURFACE_2, color: SECONDARY, border: "1px solid #2c3750", borderRadius: "6px", fontSize: "11px", padding: "2px 4px", fontFamily: "inherit" }}
            >
              <option value="above">≥ above</option>
              <option value="below">≤ below</option>
            </select>
            <input
              value={alertLevel}
              onChange={(event) => setAlertLevel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submitAlert()}
              placeholder={liveValue != null ? fmt(liveValue) : "level"}
              style={{ width: "110px", backgroundColor: SURFACE_2, color: VALUE_COLOR, border: "1px solid #2c3750", borderRadius: "6px", fontSize: "11px", padding: "2px 6px", fontFamily: MONO, outline: "none" }}
            />
            <button
              type="button"
              onClick={submitAlert}
              style={{ color: ACCENT, border: `1px solid ${ACCENT}`, background: "rgba(94,139,255,0.12)", borderRadius: "6px", padding: "2px 11px", fontSize: "11px", cursor: "pointer" }}
            >
              SET
            </button>
          </div>
          {instrumentAlerts.length === 0 ? (
            <div style={{ color: DIM, fontSize: "11px" }}>No alerts for this instrument.</div>
          ) : (
            instrumentAlerts.map((alert) => (
              <div key={alert.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", fontSize: "11px" }}>
                <span style={{ color: alert.triggeredAt ? ACCENT : SECONDARY }}>
                  {alert.direction === "above" ? "≥" : "≤"} {alert.level.toFixed(instrument.decimals)}
                  {alert.triggeredAt
                    ? ` — TRIGGERED @ ${alert.triggeredValue?.toFixed(instrument.decimals) ?? "?"}`
                    : " — armed"}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveAlert(alert.id)}
                  style={{ color: DOWN, background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
