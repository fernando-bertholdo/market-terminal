"use client";

// ─── Markets ────────────────────────────────────────────────────────────────────
// Every instrument in the catalog as clickable tiles grouped by asset class,
// plus the Brazil/US yield curves and the cross-asset correlation heatmap.

import React from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import { INSTRUMENT_CATALOG, type InstrumentGroup } from "@/lib/instrumentCatalog";
import ChartPanel from "@/components/widgets/ChartPanel";
import CorrelationPanel from "@/components/widgets/CorrelationPanel";
import { Card, ChangeChip, fmt } from "../ui";
import FixedIncomeCurvesSection from "../markets/FixedIncomeCurvesSection";

const GROUPS: Array<{ id: InstrumentGroup; label: string; hint: string }> = [
  { id: "FX", label: "Foreign exchange", hint: "Majors & BRL crosses" },
  { id: "RATES BR", label: "Brazil rates", hint: "Policy, CDI and DI futures" },
  { id: "RATES US", label: "US rates", hint: "Fed funds and Treasuries" },
  { id: "CMDTY", label: "Commodities", hint: "Energy, metals, agriculture" },
  { id: "INDEX", label: "Equity & vol", hint: "Indices and VIX" },
];

function riskValue(value: number | null | undefined, decimals = 2): string {
  return value == null || !Number.isFinite(value) ? "—" : fmt(value, decimals);
}

function FixedIncomeRiskTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: any[];
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2">
        <div className="text-[12.5px] font-semibold" style={{ color: "var(--text-1)" }}>{title}</div>
        <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{subtitle}</div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="grid grid-cols-[116px_64px_54px_66px_66px_72px_100px_82px] gap-2 px-2 py-1 text-[9.5px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}
          >
            <span>Instrument</span>
            <span className="text-right">Yield</span>
            <span className="text-right">DU</span>
            <span className="text-right">Mac dur</span>
            <span className="text-right">Mod dur</span>
            <span className="text-right">Convexity</span>
            <span className="text-right">DV01</span>
            <span className="text-right">PU / Price</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[116px_64px_54px_66px_66px_72px_100px_82px] items-center gap-2 px-2 py-1.5 text-[11px]"
              style={{ borderBottom: "1px solid var(--border)" }}
              title={row.methodology}
            >
              <span className="min-w-0" style={{ color: "var(--text-2)" }}>
                <span className="block truncate">{row.label}</span>
                <span className="tabular-nums block text-[9px]" style={{ color: "var(--text-3)" }}>
                  {row.maturityDate ?? "par proxy"}
                </span>
              </span>
              <span className="tabular-nums text-right" style={{ color: "var(--value)" }}>
                {row.rate == null ? "—" : `${riskValue(row.rate)}%`}
              </span>
              <span className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>
                {row.businessDays ?? "—"}
              </span>
              <span className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>
                {riskValue(row.macaulayDuration)}
              </span>
              <span className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>
                {riskValue(row.modifiedDuration)}
              </span>
              <span className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>
                {riskValue(row.convexity, 1)}
              </span>
              <span className="text-right">
                <span className="tabular-nums block font-medium" style={{ color: "var(--accent)" }}>
                  {row.dv01 == null
                    ? "—"
                    : `${row.dv01Currency === "BRL" ? "R$" : "$"}${riskValue(row.dv01)}`}
                </span>
                {row.contractsPerRiskUnit != null && (
                  <span className="tabular-nums block text-[8.5px]" style={{ color: "var(--text-3)" }}>
                    {riskValue(row.contractsPerRiskUnit, 0)} ctr / R$1k
                  </span>
                )}
              </span>
              <span className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>
                {riskValue(row.price, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage({
  market,
  openChart,
}: {
  market: MarketDataState;
  openChart: (id: string) => void;
}) {
  const { data } = market;
  const fixedIncomeRisk = data?.fixedIncomeRisk;

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((group) => {
        const instruments = INSTRUMENT_CATALOG.filter((inst) => inst.group === group.id);
        return (
          <section key={group.id}>
            <div className="mb-2 flex items-baseline gap-3 px-1">
              <h2 className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                {group.label}
              </h2>
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {group.hint}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
              {instruments.map((inst) => {
                const value = data ? inst.getValue(data) : null;
                const change = data ? inst.getChange(data) : null;
                const chartable = Boolean(inst.symbol);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => chartable && openChart(inst.id)}
                    title={chartable ? `Open ${inst.label} chart` : `${inst.label} (no chart source)`}
                    className="rounded-xl px-3 pb-2.5 pt-2 text-left transition-transform hover:-translate-y-0.5"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 1px 10px rgba(0,0,0,0.25)",
                      cursor: chartable ? "pointer" : "default",
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-medium" style={{ color: "var(--text-2)" }}>
                        {inst.label}
                      </span>
                      <span className="text-[9px] uppercase" style={{ color: "var(--text-3)" }}>
                        {inst.source}
                      </span>
                    </div>
                    <div className="tabular-nums mt-1 text-[19px] font-semibold leading-none" style={{ color: "var(--value)" }}>
                      {value == null ? "—" : fmt(value, inst.decimals)}
                    </div>
                    <div className="mt-1.5">
                      <ChangeChip value={change} kind={inst.changeKind} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <Card
        title="Fixed-income risk"
        subtitle="Duration, convexity and DV01 with instrument-specific conventions"
        bodyClassName="px-4 pb-4 pt-1"
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <FixedIncomeRiskTable
            title="Brazil DI futures"
            subtitle="DV01 per contract · PU converges to R$100,000 at maturity"
            rows={fixedIncomeRisk?.brazil ?? []}
          />
          <FixedIncomeRiskTable
            title="US Treasury curve"
            subtitle="Par-bond proxy · DV01 per US$1 million face value"
            rows={fixedIncomeRisk?.us ?? []}
          />
        </div>
        <div
          className="mt-4 grid grid-cols-1 gap-2 rounded-lg px-3 py-2 text-[10px] sm:grid-cols-2"
          style={{ color: "var(--text-3)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          {(fixedIncomeRisk?.assumptions ?? []).map((assumption: string) => (
            <span key={assumption}>· {assumption}</span>
          ))}
        </div>
      </Card>

      <FixedIncomeCurvesSection data={data} />

      {/* Curves + correlations */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-[400px]">
          <ChartPanel active={false} marketState={market} />
        </div>
        <div className="h-[400px]">
          <CorrelationPanel active={false} />
        </div>
      </div>

      <Card title="Reading the board" bodyClassName="px-4 pb-3 pt-1">
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          Tiles with a Yahoo source open an interactive price chart on click. BCB and B3 series (SELIC, CDI, DI
          futures) have no free history feed, so they show live values only. DI futures return no data outside B3
          trading windows — that is an absence of quotes, not an error.
        </p>
      </Card>
    </div>
  );
}
