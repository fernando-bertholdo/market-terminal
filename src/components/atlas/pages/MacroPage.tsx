"use client";

// ─── Macro ──────────────────────────────────────────────────────────────────────
// Four regime meters with plain-language readings, US & Brazil indicator tiles,
// and the BCB Focus survey against current policy.

import React, { useMemo } from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import { useMacro } from "@/hooks/useMacro";
import { Card, RegimeMeter, StatTile, fmt } from "../ui";

interface Regime {
  name: string;
  score: number; // -1 … +1
  label: string;
  detail: string;
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x));

function buildRegimes(market: any, macro: any): Regime[] {
  const out: Regime[] = [];

  // RISK — VIX level + S&P daily tape + HY spread trend.
  {
    const vix = market?.global?.vix ?? null;
    const spxChg = market?.global?.spxChangePct ?? null;
    const hy = macro?.us?.hyOas ?? null;
    let score = 0;
    const parts: string[] = [];
    if (vix != null) {
      score += vix < 15 ? 0.6 : vix < 20 ? 0.2 : vix < 26 ? -0.3 : -0.8;
      parts.push(`VIX ${vix.toFixed(1)}`);
    }
    if (spxChg != null) {
      score += clamp(spxChg / 2) * 0.4;
      parts.push(`SPX ${spxChg > 0 ? "+" : ""}${spxChg.toFixed(2)}%`);
    }
    if (hy?.value != null && hy?.prev != null) {
      score += hy.value < hy.prev ? 0.2 : -0.2;
      parts.push(`HY OAS ${hy.value.toFixed(2)}% ${hy.value < hy.prev ? "tightening" : "widening"}`);
    }
    score = clamp(score);
    out.push({
      name: "Risk appetite",
      score,
      label: score > 0.25 ? "RISK-ON" : score < -0.25 ? "RISK-OFF" : "NEUTRAL",
      detail: parts.join(" · ") || "Awaiting data",
    });
  }

  // USD — DXY tape + real yields direction.
  {
    const dxyChg = market?.fx?.dxyChangePct ?? null;
    const real = macro?.us?.real10y ?? null;
    let score = 0;
    const parts: string[] = [];
    if (dxyChg != null) {
      score += clamp(dxyChg / 0.8) * 0.6;
      parts.push(`DXY ${dxyChg > 0 ? "+" : ""}${dxyChg.toFixed(2)}%`);
    }
    if (real?.value != null && real?.prev != null) {
      score += real.value > real.prev ? 0.35 : -0.35;
      parts.push(`10y real ${real.value.toFixed(2)}% ${real.value > real.prev ? "rising" : "falling"}`);
    }
    score = clamp(score);
    out.push({
      name: "US dollar",
      score,
      label: score > 0.25 ? "STRONG USD" : score < -0.25 ? "WEAK USD" : "MIXED",
      detail: parts.join(" · ") || "Awaiting data",
    });
  }

  // US inflation — CPI direction + breakevens trend.
  {
    const cpi = macro?.us?.cpiYoY ?? null;
    const be = macro?.us?.breakeven10y ?? null;
    let score = 0;
    const parts: string[] = [];
    if (cpi?.value != null && cpi?.prev != null) {
      score += cpi.value > cpi.prev ? 0.5 : -0.5;
      parts.push(`CPI ${cpi.value.toFixed(2)}% y/y ${cpi.value > cpi.prev ? "accelerating" : "cooling"}`);
    }
    if (be?.value != null && be?.prev != null) {
      score += be.value > be.prev ? 0.3 : -0.3;
      parts.push(`10y breakeven ${be.value.toFixed(2)}%`);
    }
    score = clamp(score);
    out.push({
      name: "US inflation pulse",
      score,
      label: score > 0.25 ? "HEATING" : score < -0.25 ? "COOLING" : "STABLE",
      detail: parts.join(" · ") || "Awaiting data",
    });
  }

  // BCB — what Focus prices vs the current SELIC.
  {
    const selic = market?.brazil?.selic ?? null;
    const focus = macro?.brazil?.focusSelic?.[0] ?? null;
    let score = 0;
    let detail = "Awaiting data";
    if (selic != null && focus?.median != null) {
      const gap = focus.median - selic;
      score = clamp(gap / 2);
      detail = `Focus ${focus.referenceYear}: ${focus.median.toFixed(2)}% vs SELIC ${selic.toFixed(2)}% (${gap > 0 ? "+" : ""}${(gap * 100).toFixed(0)} bp)`;
    }
    out.push({
      name: "BCB path (Focus)",
      score,
      label: score < -0.1 ? "EASING PRICED" : score > 0.1 ? "HIKES PRICED" : "ON HOLD",
      detail,
    });
  }

  return out;
}

function delta(point: any): string {
  if (point?.value == null || point?.prev == null) return "";
  const d = point.value - point.prev;
  return `${d > 0 ? "+" : ""}${d.toFixed(2)} vs prior`;
}

export default function MacroPage({ market }: { market: MarketDataState }) {
  const macro = useMacro();
  const regimes = useMemo(() => buildRegimes(market.data, macro.data), [market.data, macro.data]);
  const us = macro.data?.us;
  const br = macro.data?.brazil;

  return (
    <div className="flex flex-col gap-4">
      {/* Regime meters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {regimes.map((regime) => (
          <div
            key={regime.name}
            className="rounded-xl px-4 pb-4 pt-3"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 12px rgba(0,0,0,0.28)" }}
          >
            <div className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
              {regime.name}
            </div>
            <div
              className="mt-1 text-[18px] font-semibold"
              style={{ color: regime.score > 0.25 ? "var(--up)" : regime.score < -0.25 ? "var(--down)" : "var(--text-1)" }}
            >
              {regime.label}
            </div>
            <div className="mt-3">
              <RegimeMeter score={regime.score} />
            </div>
            <div className="mt-2 text-[10.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              {regime.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* US indicators */}
        <Card title="United States" subtitle="FRED · monthly & daily series" bodyClassName="px-4 pb-4 pt-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="CPI y/y" value={us?.cpiYoY?.value != null ? `${fmt(us.cpiYoY.value)}%` : "—"} sub={delta(us?.cpiYoY)} />
            <StatTile label="Core CPI y/y" value={us?.coreCpiYoY?.value != null ? `${fmt(us.coreCpiYoY.value)}%` : "—"} sub={delta(us?.coreCpiYoY)} />
            <StatTile label="Unemployment" value={us?.unemployment?.value != null ? `${fmt(us.unemployment.value, 1)}%` : "—"} sub={delta(us?.unemployment)} />
            <StatTile label="HY OAS" value={us?.hyOas?.value != null ? `${fmt(us.hyOas.value)}%` : "—"} sub="credit stress gauge" />
            <StatTile label="NFCI" value={us?.nfci?.value != null ? fmt(us.nfci.value) : "—"} sub="<0 = loose conditions" />
            <StatTile label="10y breakeven" value={us?.breakeven10y?.value != null ? `${fmt(us.breakeven10y.value)}%` : "—"} sub="inflation expectations" />
            <StatTile label="10y real (TIPS)" value={us?.real10y?.value != null ? `${fmt(us.real10y.value)}%` : "—"} sub={delta(us?.real10y)} />
          </div>
        </Card>

        {/* Brazil indicators + Focus */}
        <Card title="Brazil" subtitle="BCB SGS · Focus survey medians" bodyClassName="px-4 pb-4 pt-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="IPCA 12m" value={br?.ipca12m?.value != null ? `${fmt(br.ipca12m.value)}%` : "—"} sub="accumulated inflation" />
            <StatTile label="SELIC now" value={market.data?.brazil?.selic != null ? `${fmt(market.data.brazil.selic)}%` : "—"} sub="policy rate" />
            <StatTile label="CDI" value={market.data?.brazil?.cdi != null ? `${fmt(market.data.brazil.cdi)}%` : "—"} sub="interbank" />
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Focus survey — market medians
          </div>
          <table className="mt-2 w-full text-[12px]">
            <thead>
              <tr style={{ color: "var(--text-3)" }}>
                <th className="pb-1 text-left font-medium">Indicator</th>
                {(br?.focusSelic ?? []).map((f: any) => (
                  <th key={f.referenceYear} className="pb-1 text-right font-medium">
                    {f.referenceYear}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid var(--border)" }}>
                <td className="py-1.5" style={{ color: "var(--text-2)" }}>SELIC (eop)</td>
                {(br?.focusSelic ?? []).map((f: any) => (
                  <td key={f.referenceYear} className="tabular-nums py-1.5 text-right" style={{ color: "var(--value)" }}>
                    {fmt(f.median)}%
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: "1px solid var(--border)" }}>
                <td className="py-1.5" style={{ color: "var(--text-2)" }}>IPCA (year)</td>
                {(br?.focusIpca ?? []).map((f: any) => (
                  <td key={f.referenceYear} className="tabular-nums py-1.5 text-right" style={{ color: "var(--value)" }}>
                    {fmt(f.median)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          {macro.error && (
            <div className="mt-3 text-[11px]" style={{ color: "var(--down)" }}>
              Macro feed error: {macro.error}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
