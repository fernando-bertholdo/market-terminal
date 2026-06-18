"use client";

import React, { useMemo, useState } from "react";
import { Card, fmt } from "../ui";
import { interpolateCurveAtDate } from "@/lib/fixedIncomeCurves";

const FAMILIES = [
  { id: "DI1", label: "DI nominal", color: "#5e8bff" },
  { id: "DDI", label: "Cupom cambial", color: "#34c98e" },
  { id: "DAP", label: "Juro real / IPCA", color: "#e8a13c" },
] as const;

function CurveTable({ curve }: { curve: any }) {
  const points = curve?.points ?? [];
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        <div className="grid grid-cols-[82px_90px_70px_90px_1fr] gap-2 px-2 py-1 text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
          <span>Point</span><span>Maturity</span><span className="text-right">Days</span>
          <span className="text-right">Rate</span><span className="text-right">Source</span>
        </div>
        {points.map((point: any) => (
          <div key={`${point.symbol}-${point.source}`} className="grid grid-cols-[82px_90px_70px_90px_1fr] gap-2 px-2 py-1.5 text-[10.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="tabular-nums" style={{ color: "var(--text-2)" }}>{point.symbol}</span>
            <span className="tabular-nums" style={{ color: "var(--text-3)" }}>{point.maturityDate}</span>
            <span className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>{point.days}</span>
            <span className="tabular-nums text-right font-medium" style={{ color: "var(--value)" }}>{fmt(point.rate, 3)}%</span>
            <span className="text-right uppercase" style={{ color: point.source === "snapshot" ? "var(--up)" : "var(--warn)" }}>{point.source}</span>
          </div>
        ))}
        {points.length === 0 && <div className="px-2 py-4 text-[11px]" style={{ color: "var(--text-3)" }}>No valid B3 points for this curve.</div>}
      </div>
    </div>
  );
}

function B3Tape({ snapshots }: { snapshots: Record<string, any> }) {
  const rows = Object.values(snapshots ?? {}).filter((snapshot: any) => snapshot?.status?.ok);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-2 px-2 py-1 text-[9px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
          <span>Contract</span><span className="text-right">Open</span><span className="text-right">Low</span>
          <span className="text-right">High</span><span className="text-right">Average</span>
          <span className="text-right">Last</span><span className="text-right">Change</span>
        </div>
        {rows.map((row: any) => (
          <div key={row.symbol} className="grid grid-cols-[80px_repeat(6,1fr)] gap-2 px-2 py-1.5 text-[10.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="tabular-nums font-medium" style={{ color: "var(--accent)" }}>{row.symbol}</span>
            {[row.open, row.min, row.max, row.avg, row.current].map((value, index) => (
              <span key={index} className="tabular-nums text-right" style={{ color: "var(--text-2)" }}>{value == null ? "—" : fmt(value, 3)}</span>
            ))}
            <span className="tabular-nums text-right" style={{ color: row.change >= 0 ? "var(--up)" : "var(--down)" }}>
              {row.change == null ? "—" : `${row.change >= 0 ? "+" : ""}${fmt(row.change, 2)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FixedIncomeCurvesSection({ data }: { data: any }) {
  const curves = data?.fixedIncomeCurves;
  const intelligence = data?.marketIntelligence;
  const [targetDate, setTargetDate] = useState("");
  const interpolation = useMemo(() => {
    if (!curves?.DI1 || !targetDate) return null;
    return interpolateCurveAtDate(curves.DI1, new Date(`${targetDate}T12:00:00Z`));
  }, [curves, targetDate]);
  return (
    <>
      <Card title="DI date interpolator" subtitle="B3 Flat Forward 252 · business-day basis" bodyClassName="px-4 pb-4 pt-1">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
              Target date
            </span>
            <input
              type="date"
              value={targetDate}
              min={curves?.DI1?.asOf}
              onChange={(event) => setTargetDate(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
            />
          </label>
          {interpolation ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ["Interpolated DI", `${fmt(interpolation.rate, 3)}%`],
                ["Business days", String(interpolation.businessDays)],
                ["Flat forward", `${fmt(interpolation.forwardRate, 3)}%`],
                ["Lower contract", `${interpolation.previous.symbol} · ${fmt(interpolation.previous.rate, 3)}%`],
                ["Upper contract", `${interpolation.next.symbol} · ${fmt(interpolation.next.rate, 3)}%`],
                ["Upper weight", `${fmt(interpolation.weight * 100, 2)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="text-[9px] uppercase" style={{ color: "var(--text-3)" }}>{label}</div>
                  <div className="tabular-nums mt-1 text-[13px] font-semibold" style={{ color: "var(--value)" }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--warn)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
              {targetDate
                ? "The selected date is outside the interval between observed DI contracts."
                : "Choose a date to calculate the DI rate. The card does not extrapolate."}
            </div>
          )}
        </div>
        <div className="mt-3 text-[10px] leading-relaxed" style={{ color: "var(--text-3)" }}>
          The accumulated factor between adjacent contracts is compounded pro rata in business days, keeping the 252-day forward rate constant.
        </div>
      </Card>

      <Card title="Brazil fixed-income curves" subtitle="Observed B3 contracts · Flat Forward 252 for DI/DAP" bodyClassName="px-4 pb-4 pt-1">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {FAMILIES.map((family) => {
            const curve = curves?.[family.id];
            return (
              <div key={family.id} className="min-w-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-semibold" style={{ color: family.color }}>{family.label}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{curve?.dayCount ?? "—"}</span>
                </div>
                <CurveTable curve={curve} />
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[10px]" style={{ color: "var(--text-3)" }}>
          This table contains observed B3 contracts only. Interpolation appears exclusively in the date selector above.
        </div>
      </Card>

      <Card title="B3 macro futures tape" subtitle="Rich public snapshot · no market-data SLA" bodyClassName="px-4 pb-4 pt-1">
        <B3Tape snapshots={data?.b3Futures ?? {}} />
      </Card>

      <Card title="Feed quality" subtitle="Freshness, redundancy and persistence" bodyClassName="px-4 pb-4 pt-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {(intelligence?.providers ?? []).map((provider: any) => (
            <div key={provider.providerId} className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: provider.ok ? "var(--up)" : "var(--down)" }} />
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-2)" }}>{provider.providerId}</span>
              </div>
              <div className="tabular-nums mt-1 text-[16px] font-semibold" style={{ color: "var(--value)" }}>{provider.freshObservations}</div>
              <div className="text-[9px]" style={{ color: "var(--text-3)" }}>fresh of {provider.observations}</div>
            </div>
          ))}
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-2)" }}>Neon</div>
            <div className="mt-1 text-[12px] font-medium uppercase" style={{ color: intelligence?.persistence === "error" ? "var(--down)" : "var(--accent)" }}>{intelligence?.persistence ?? "—"}</div>
            <div className="text-[9px]" style={{ color: "var(--text-3)" }}>1-minute buckets</div>
          </div>
        </div>
      </Card>
    </>
  );
}
