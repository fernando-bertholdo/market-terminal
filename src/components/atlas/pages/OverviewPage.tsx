"use client";

// ─── Overview ───────────────────────────────────────────────────────────────────
// The landing page: an auto-written market briefing in plain sentences, hero
// price cards with 3-month sparklines, a ranked movers board, the Brazil policy
// stack, and the latest headlines.

import React, { useEffect, useMemo, useState } from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import type { NewsState } from "@/hooks/useNews";
import { useHistory } from "@/hooks/useHistory";
import { INSTRUMENT_CATALOG, findInstrument } from "@/lib/instrumentCatalog";
import { Card, ChangeChip, Sparkline, SignedBar, fmt, relTime } from "../ui";

const HERO = [
  { id: "usdbrl", symbol: "BRL=X" },
  { id: "ust10y", symbol: "^TNX" },
  { id: "spx", symbol: "^GSPC" },
  { id: "ibov", symbol: "^BVSP" },
];

function buildBriefing(data: any): string[] {
  if (!data) return [];
  const out: string[] = [];

  const brl = data?.fx?.usdbrl;
  const brlChg = data?.fx?.usdbrlChangePct;
  if (brl != null && brlChg != null) {
    out.push(
      brlChg > 0.15
        ? `The real is under pressure — USD/BRL is up ${brlChg.toFixed(2)}% at ${brl.toFixed(4)}.`
        : brlChg < -0.15
          ? `The real is firmer — USD/BRL is down ${Math.abs(brlChg).toFixed(2)}% at ${brl.toFixed(4)}.`
          : `USD/BRL is little changed around ${brl.toFixed(4)}.`
    );
  }

  const di = data?.brazil?.di?.DI1F28?.rate;
  const selic = data?.brazil?.selic;
  if (di != null && selic != null) {
    const gap = di - selic;
    out.push(
      gap < -0.5
        ? `The DI curve prices meaningful easing: Jan/28 trades ${Math.abs(gap).toFixed(2)} pp below the ${selic.toFixed(2)}% SELIC.`
        : gap > 0.5
          ? `The DI curve prices tightening: Jan/28 trades ${gap.toFixed(2)} pp above the ${selic.toFixed(2)}% SELIC.`
          : `The DI curve is roughly flat to the ${selic.toFixed(2)}% SELIC at Jan/28.`
    );
  }

  const ust10 = data?.us?.ust10y;
  const ust10Chg = data?.us?.ust10yChange;
  if (ust10 != null) {
    out.push(
      ust10Chg != null && Math.abs(ust10Chg) >= 3
        ? `US 10-year yields are ${ust10Chg > 0 ? "selling off" : "rallying"}, ${ust10Chg > 0 ? "+" : ""}${ust10Chg.toFixed(0)} bp to ${ust10.toFixed(2)}%.`
        : `US 10-year yields sit at ${ust10.toFixed(2)}%.`
    );
  }

  const vix = data?.global?.vix;
  if (vix != null) {
    out.push(
      vix >= 25
        ? `Volatility is elevated — VIX at ${vix.toFixed(1)} signals a risk-off tape.`
        : vix >= 18
          ? `VIX at ${vix.toFixed(1)} shows some caution in equities.`
          : `Volatility is calm with VIX at ${vix.toFixed(1)}.`
    );
  }

  // Biggest percent mover across the catalog.
  let best: { label: string; chg: number } | null = null;
  for (const inst of INSTRUMENT_CATALOG) {
    if (inst.changeKind !== "pct") continue;
    const chg = inst.getChange(data);
    if (chg != null && (!best || Math.abs(chg) > Math.abs(best.chg))) best = { label: inst.label, chg };
  }
  if (best && Math.abs(best.chg) >= 0.8) {
    out.push(`Biggest mover on the board: ${best.label}, ${best.chg > 0 ? "+" : ""}${best.chg.toFixed(2)}%.`);
  }

  return out;
}

export default function OverviewPage({
  market,
  news,
  openChart,
}: {
  market: MarketDataState;
  news: NewsState;
  openChart: (id: string) => void;
}) {
  const { data } = market;
  const history = useHistory(HERO.map((h) => h.symbol), "3mo");
  const briefing = useMemo(() => buildBriefing(data), [data]);

  const movers = useMemo(() => {
    if (!data) return [];
    return INSTRUMENT_CATALOG.filter((inst) => inst.changeKind === "pct")
      .map((inst) => ({ inst, chg: inst.getChange(data) }))
      .filter((m): m is { inst: (typeof INSTRUMENT_CATALOG)[number]; chg: number } => m.chg != null)
      .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))
      .slice(0, 9);
  }, [data]);

  const maxMove = movers.length ? Math.max(...movers.map((m) => Math.abs(m.chg))) : 1;

  const [heroDate, setHeroDate] = useState<{ greeting: string; label: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setHeroDate({
      greeting: h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening",
      label: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Briefing hero */}
      <div
        className="rounded-2xl px-6 py-5"
        style={{
          background: "linear-gradient(135deg, rgba(94,139,255,0.10), rgba(139,94,255,0.05) 55%, transparent)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
          {heroDate ? `${heroDate.greeting} · ${heroDate.label}` : "Market briefing"}
        </div>
        <h1 className="mt-1 text-[22px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
          Today&apos;s briefing
        </h1>
        <div className="mt-2 max-w-[860px] space-y-1">
          {briefing.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              Waiting for live data…
            </p>
          ) : (
            briefing.map((line, i) => (
              <p key={i} className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {line}
              </p>
            ))
          )}
        </div>
      </div>

      {/* Hero price cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {HERO.map(({ id, symbol }) => {
          const inst = findInstrument(id);
          if (!inst) return null;
          const value = data ? inst.getValue(data) : null;
          const change = data ? inst.getChange(data) : null;
          const closes = history.data?.[symbol]?.bars.map((b) => b.close) ?? [];
          return (
            <button
              key={id}
              type="button"
              onClick={() => openChart(id)}
              className="group rounded-xl px-4 pb-2 pt-3 text-left transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 12px rgba(0,0,0,0.28)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
                  {inst.label}
                </span>
                <ChangeChip value={change} kind={inst.changeKind} />
              </div>
              <div className="tabular-nums mt-1 text-[26px] font-semibold leading-none" style={{ color: "var(--value)" }}>
                {value == null ? "—" : fmt(value, inst.decimals)}
              </div>
              <div className="mt-2 opacity-80 transition-opacity group-hover:opacity-100">
                <Sparkline values={closes} width={230} height={42} />
              </div>
              <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                3-month · click to open chart
              </div>
            </button>
          );
        })}
      </div>

      {/* Three-column lower band */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Movers */}
        <Card title="Today's movers" subtitle="Ranked by absolute % change" bodyClassName="px-4 pb-3 pt-1">
          <div className="flex flex-col gap-1.5">
            {movers.map(({ inst, chg }) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => inst.symbol && openChart(inst.id)}
                className="grid grid-cols-[92px_1fr_72px] items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-[var(--surface-3)]"
                style={{ cursor: inst.symbol ? "pointer" : "default" }}
              >
                <span className="truncate text-[12px]" style={{ color: "var(--text-2)" }}>
                  {inst.label}
                </span>
                <SignedBar value={chg} max={maxMove} />
                <span
                  className="tabular-nums text-right text-[12px] font-medium"
                  style={{ color: chg >= 0 ? "var(--up)" : "var(--down)" }}
                >
                  {chg > 0 ? "+" : ""}
                  {chg.toFixed(2)}%
                </span>
              </button>
            ))}
            {movers.length === 0 && (
              <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
                Waiting for market data…
              </div>
            )}
          </div>
        </Card>

        {/* Brazil policy stack */}
        <Card title="Brazil policy stack" subtitle="Money market & DI curve" bodyClassName="px-4 pb-3 pt-1">
          <div className="flex flex-col">
            {[
              { label: "SELIC target", value: data?.brazil?.selic, suffix: "%" },
              { label: "CDI", value: data?.brazil?.cdi, suffix: "%" },
              { label: "IPCA m/m", value: data?.brazil?.ipca, suffix: "%" },
              { label: "DI Jul/26", value: data?.brazil?.di?.DI1N26?.rate, suffix: "%" },
              { label: "DI Jan/27", value: data?.brazil?.di?.DI1F27?.rate, suffix: "%" },
              { label: "DI Jan/28", value: data?.brazil?.di?.DI1F28?.rate, suffix: "%" },
              { label: "DI Jan/30", value: data?.brazil?.di?.DI1F30?.rate, suffix: "%" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-[7px]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  {row.label}
                </span>
                <span className="tabular-nums text-[13px] font-medium" style={{ color: "var(--value)" }}>
                  {row.value == null ? "—" : `${fmt(row.value, 2)}${row.suffix}`}
                </span>
              </div>
            ))}
            {data?.brazil?.di?.DI1F28?.rate != null && data?.brazil?.selic != null && (
              <div className="pt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                Jan/28 − SELIC = {((data.brazil.di.DI1F28.rate - data.brazil.selic) * 100).toFixed(0)} bp — what the
                market prices for policy by 2028.
              </div>
            )}
          </div>
        </Card>

        {/* Headlines */}
        <Card title="Latest headlines" subtitle="Bloomberg · Reuters" bodyClassName="px-4 pb-3 pt-1">
          <div className="flex flex-col">
            {news.items.slice(0, 8).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group py-[7px]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="text-[12.5px] leading-snug group-hover:underline" style={{ color: "var(--text-1)" }}>
                  {item.title}
                </div>
                <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                  {item.source} · {relTime(item.publishedAt)}
                </div>
              </a>
            ))}
            {news.items.length === 0 && (
              <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
                Loading headlines…
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
