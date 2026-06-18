"use client";

// ─── Quant ──────────────────────────────────────────────────────────────────────
// The live paper-trading simulator: positions, risk, trade expressions,
// signal matrix, scenarios and decision rationale.
// Simulation only — no real orders, ever.

import React, { useMemo, useState } from "react";
import { useSim } from "@/hooks/useSim";
import { Card, HEX, RegimeMeter, Sparkline, StatTile, fmt, relTime } from "../ui";

function convictionColor(direction: string, conviction: number): string {
  if (direction === "FLAT") return "var(--surface-2)";
  const a = Math.min(0.12 + conviction * 0.43, 0.55);
  return direction === "LONG" ? `rgba(52,201,142,${a})` : `rgba(240,100,122,${a})`;
}

function saoPauloDateKey(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export default function QuantPage() {
  const sim = useSim(15_000); // display refresh only; the cloud executor mutates the book
  const [busy, setBusy] = useState<"reset" | "rebalance" | null>(null);
  const portfolio = sim.data?.portfolio;
  const decisions: any[] = sim.data?.decisions ?? [];
  const expressions: any[] = sim.data?.expressions ?? [];
  const regime = sim.data?.regime;
  const scenarios: any[] = sim.data?.scenarios ?? [];
  const exAnteVol: number | null = sim.data?.exAnteVol ?? null;
  const liveAsOf: string | null = sim.data?.live?.asOf ?? null;
  const freshQuoteCount: number = sim.data?.live?.freshExecutionQuoteCount ?? 0;
  const newsRead: any | null = sim.data?.news ?? null;
  const activeTriggers: any[] = sim.data?.newsTriggers?.active ?? [];
  const recentTriggers: any[] = sim.data?.newsTriggers?.recent ?? [];
  const automation: any | null = portfolio?.automation ?? null;
  const executorColor =
    automation?.status === "HEALTHY" ? "var(--up)" :
    automation?.status === "LATE" ? "var(--warn)" :
    "var(--down)";

  const intraday: Array<{ time: string; equity: number }> = portfolio?.intradayEquity ?? [];
  const todayKey = saoPauloDateKey(new Date());
  const todayMarks = intraday.filter((m) => saoPauloDateKey(m.time) === todayKey);
  const todayPnl = todayMarks.length >= 2 ? todayMarks[todayMarks.length - 1].equity - todayMarks[0].equity : null;

  const maxWeight = useMemo(
    () => Math.max(0.0001, ...(portfolio?.positions ?? []).map((p: any) => Math.abs(p.weight))),
    [portfolio]
  );

  const act = async (action: "reset" | "rebalance") => {
    setBusy(action);
    try {
      await (action === "reset" ? sim.reset() : sim.rebalance());
    } finally {
      setBusy(null);
    }
  };

  if (sim.isLoading && !sim.data) {
    return (
      <div className="animate-pulse py-10 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
        Loading live book and risk signals…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Disclaimer + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="rounded-lg px-3 py-1.5 text-[11px] font-medium"
          style={{ color: "var(--warn)", backgroundColor: "rgba(232,161,60,0.10)", border: "1px solid rgba(232,161,60,0.35)" }}
        >
          PAPER TRADING — fresh live quotes only for fills, no real orders
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy != null}
            onClick={() => act("rebalance")}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
            style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)", border: "1px solid var(--accent)" }}
          >
            {busy === "rebalance" ? "Rebalancing…" : "Rebalance now"}
          </button>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => act("reset")}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
            style={{ color: "var(--text-2)", backgroundColor: "var(--surface-3)", border: "1px solid var(--border-strong)" }}
          >
            {busy === "reset" ? "Resetting…" : "Reset book"}
          </button>
        </div>
      </div>

      {/* Live session strip */}
      <div
        className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl px-5 py-3.5"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 12px rgba(0,0,0,0.28)" }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: "var(--up)" }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--up)" }} />
          </span>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>LIVE</div>
            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
              screen refresh every 15s{liveAsOf ? ` · last ${relTime(liveAsOf)}` : ""}
              {` · ${freshQuoteCount} fresh for fills`}
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Cloud executor
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: executorColor }} />
            <span className="tabular-nums text-[13px] font-medium" style={{ color: executorColor }}>
              {automation?.status ?? "UNKNOWN"}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
            {automation?.lastCronTickAt
              ? `last tick ${relTime(automation.lastCronTickAt)} · ${automation.cronTickCount} persisted`
              : "no persisted cron tick yet"}
            {automation?.lastCronGapSeconds != null
              ? ` · gap ${automation.lastCronGapSeconds}s`
              : ""}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>Today&apos;s P&amp;L</div>
          <div
            className="tabular-nums text-[20px] font-semibold leading-tight"
            style={{ color: todayPnl == null ? "var(--text-3)" : todayPnl >= 0 ? "var(--up)" : "var(--down)" }}
          >
            {todayPnl == null
              ? "—"
              : `${todayPnl >= 0 ? "+" : "−"}$${fmt(Math.abs(todayPnl) / 1000, 2)}k`}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            News input
          </div>
          <div className="tabular-nums text-[13px] font-medium" style={{ color: newsRead ? "var(--accent)" : "var(--text-3)" }}>
            {newsRead ? `${newsRead.classifiedCount}/${newsRead.itemCount} classified` : "unavailable"}
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-3)" }}>feeds the live macro decision layer</div>
        </div>
        <div className="min-w-[220px] flex-1">
          {todayMarks.length >= 2 ? (
            <>
              <Sparkline values={todayMarks.map((m) => m.equity)} width={420} height={44} />
              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
                persisted cloud equity · {todayMarks.length} marks since{" "}
                {new Date(todayMarks[0].time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </>
          ) : (
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
              Building the intraday tape. The cloud executor persists one mark per minute with the site closed.
            </div>
          )}
        </div>
      </div>

      {/* Regime banner — conditions the whole book */}
      {regime && (
        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl px-5 py-3.5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 12px rgba(0,0,0,0.28)" }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
              Market regime
            </div>
            <div
              className="text-[18px] font-semibold"
              style={{ color: regime.label === "RISK-ON" ? "var(--up)" : regime.label === "RISK-OFF" ? "var(--down)" : "var(--text-1)" }}
            >
              {regime.label}
            </div>
          </div>
          <div className="w-[180px]">
            <RegimeMeter score={regime.riskScore} />
            <div className="mt-1.5 text-[10px]" style={{ color: "var(--text-3)" }}>{regime.detail}</div>
          </div>
          <div className="text-[12px]" style={{ color: "var(--text-2)" }}>
            Gross exposure ×{fmt(regime.grossScale, 2)}
            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>regime-conditioned sizing</div>
          </div>
          {exAnteVol != null && (
            <div className="text-[12px]" style={{ color: "var(--text-2)" }}>
              Ex-ante vol {fmt(exAnteVol * 100, 1)}%
              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>covariance-targeted to 10%</div>
            </div>
          )}
          <div className="ml-auto max-w-[300px] text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            The book de-grosses when the regime turns risk-off and sizes positions through the live correlation
            matrix, not asset-by-asset.
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Paper equity"
          value={portfolio ? `$${fmt(portfolio.equity / 1000, 1)}k` : "—"}
          sub={portfolio ? `started $${fmt(portfolio.initialCapital / 1000, 0)}k` : undefined}
        />
        <StatTile
          label="Book return"
          value={portfolio ? `${portfolio.totalReturnPct > 0 ? "+" : ""}${fmt(portfolio.totalReturnPct)}%` : "—"}
          color={portfolio?.totalReturnPct >= 0 ? "var(--up)" : "var(--down)"}
          sub={portfolio?.lastRebalanceDate ? `rebalanced ${portfolio.lastRebalanceDate}` : undefined}
        />
        <StatTile
          label="Ex-ante vol"
          value={exAnteVol != null ? `${fmt(exAnteVol * 100, 1)}%` : "—"}
          sub="live covariance estimate"
        />
        <StatTile
          label="Live positions"
          value={`${(portfolio?.positions ?? []).length}`}
          sub={regime ? `${fmt(regime.grossScale, 2)}x regime scale` : undefined}
        />
      </div>

      {/* Pre-market news triggers — news leads the book */}
      <Card
        title="Pre-market news triggers"
        subtitle="Fresh, high-impact headlines that lead positions — FX/futures act now, cash equities queue for the open"
        bodyClassName="px-4 pb-4 pt-1"
        right={
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{
              color: activeTriggers.length ? "var(--warn)" : "var(--text-3)",
              backgroundColor: activeTriggers.length ? "rgba(232,161,60,0.12)" : "var(--surface-3)",
            }}
          >
            {activeTriggers.length ? `${activeTriggers.length} active` : "armed"}
          </span>
        }
      >
        {activeTriggers.length === 0 && recentTriggers.length === 0 ? (
          <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
            No headline currently crosses the impact threshold. A fresh, high-confidence story on a
            position will fire a trigger and force an event-driven rebalance.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Active: hot right now */}
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Leading the book now
              </div>
              {activeTriggers.length === 0 ? (
                <div className="py-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                  Nothing hot at the moment.
                </div>
              ) : (
                <div className="flex flex-col">
                  {activeTriggers.map((trigger) => (
                    <a
                      key={trigger.itemId}
                      href={trigger.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group py-2"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[12px] leading-snug group-hover:underline" style={{ color: "var(--text-1)" }}>
                          {trigger.title}
                        </span>
                        <span
                          className="tabular-nums shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            color: trigger.direction > 0 ? "var(--up)" : trigger.direction < 0 ? "var(--down)" : "var(--text-3)",
                            backgroundColor: "var(--surface-3)",
                          }}
                        >
                          {trigger.direction > 0 ? "▲" : trigger.direction < 0 ? "▼" : "•"} {Math.round(trigger.impact * 100)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                          {trigger.source} · {trigger.ageMinutes}m ago ·
                        </span>
                        {trigger.symbols.map((symbol: string) => (
                          <span
                            key={symbol}
                            className="tabular-nums rounded px-1 py-0.5 text-[9px] font-semibold"
                            style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
                          >
                            {symbol}
                          </span>
                        ))}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Recent: fired and acted on */}
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Acted on (executed / pending open)
              </div>
              {recentTriggers.length === 0 ? (
                <div className="py-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                  No trigger has fired into the book yet.
                </div>
              ) : (
                <div className="flex flex-col">
                  {recentTriggers.map((trigger) => (
                    <div key={`${trigger.itemId}-${trigger.firedAt}`} className="py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="text-[12px] leading-snug" style={{ color: "var(--text-2)" }}>
                        {trigger.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                        <span>{relTime(trigger.firedAt)}</span>
                        {trigger.executedSymbols.length > 0 && (
                          <span style={{ color: "var(--up)" }}>
                            filled: {trigger.executedSymbols.join(", ")}
                          </span>
                        )}
                        {trigger.pendingSymbols.length > 0 && (
                          <span style={{ color: "var(--warn)" }}>
                            pending open: {trigger.pendingSymbols.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title="Hedged trade expressions"
          subtitle="Alpha and hedge legs estimated only from information available at decision time"
          bodyClassName="px-4 pb-4 pt-1"
        >
          <div className="flex flex-col">
            {expressions
              .filter((expression: any) => expression.hedge?.status !== "inactive")
              .map((expression: any) => (
                <div key={expression.id} className="py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-medium" style={{ color: "var(--text-1)" }}>
                      {expression.label}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase"
                      style={{
                        color: expression.hedge?.status === "applied" ? "var(--up)" : "var(--warn)",
                        backgroundColor:
                          expression.hedge?.status === "applied"
                            ? "rgba(52,201,142,0.10)"
                            : "rgba(232,161,60,0.10)",
                      }}
                    >
                      {expression.hedge?.status ?? "unknown"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {(expression.legs ?? []).map((leg: any) => (
                      <span key={`${expression.id}-${leg.symbol}`} className="text-[11px]" style={{ color: "var(--text-2)" }}>
                        <span style={{ color: leg.role === "alpha" ? "var(--accent)" : "var(--text-3)" }}>
                          {leg.role === "alpha" ? "ALPHA" : "HEDGE"}
                        </span>{" "}
                        {leg.symbol}{" "}
                        <span className="tabular-nums">
                          {(leg.targetWeight ?? leg.weight) >= 0 ? "+" : ""}
                          {fmt((leg.targetWeight ?? leg.weight) * 100, 1)}%
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                    beta {expression.hedge?.beta == null ? "n/a" : fmt(expression.hedge.beta, 2)}
                    {" · "}{expression.hedge?.observations ?? 0} observations
                    {" · "}DV01 {expression.hedge?.dv01Status ?? "unsupported"}
                  </div>
                </div>
              ))}
            {expressions.filter((expression: any) => expression.hedge?.status !== "inactive").length === 0 && (
              <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
                No active hedge expression. Ratios require at least 60 observations and a live alpha signal.
              </div>
            )}
          </div>
        </Card>

        {/* Unified live strategy */}
        <Card title="Live Strategy" subtitle="One final decision per asset" bodyClassName="px-4 pb-4 pt-1">
          <div className="grid grid-cols-[1fr_76px_1fr_72px] gap-2 text-[11px]">
            <span style={{ color: "var(--text-3)" }}>ASSET</span>
            <span className="text-center" style={{ color: "var(--text-3)" }}>DECISION</span>
            <span style={{ color: "var(--text-3)" }}>CONVICTION</span>
            <span className="text-right" style={{ color: "var(--text-3)" }}>TARGET</span>
            {decisions.map((decision) => (
              <React.Fragment key={decision.symbol}>
                <span className="flex min-w-0 items-center gap-1.5 py-1.5" style={{ color: "var(--text-2)" }}>
                  <span className="truncate">{decision.label}</span>
                  {decision.newsTriggered && (
                    <span
                      className="shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold uppercase"
                      style={{ color: "var(--warn)", backgroundColor: "rgba(232,161,60,0.14)" }}
                      title="Under an active pre-market news trigger — news is leading this position"
                    >
                      NEWS
                    </span>
                  )}
                  {decision.thematicEquity && (
                    <span
                      className="shrink-0 rounded px-1 py-0.5 text-[8px] font-semibold uppercase"
                      style={{
                        color: decision.earnings?.status === "CLEAR" ? "var(--accent)" : "var(--warn)",
                        backgroundColor: "var(--surface-3)",
                      }}
                      title={decision.earnings?.note ?? decision.theme}
                    >
                      {decision.earnings?.status === "BLOCKED"
                        ? "EARN"
                        : decision.earnings?.status === "UNKNOWN"
                        ? "CAL?"
                        : decision.theme}
                    </span>
                  )}
                </span>
                <span
                  className="rounded py-1.5 text-center text-[10px] font-semibold"
                  style={{
                    backgroundColor: convictionColor(decision.direction, decision.conviction),
                    color: decision.direction === "LONG"
                      ? "var(--up)"
                      : decision.direction === "SHORT"
                      ? "var(--down)"
                      : "var(--text-3)",
                  }}
                >
                  {decision.direction}
                </span>
                <span className="flex items-center gap-2">
                  <span className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${decision.conviction * 100}%`,
                        backgroundColor: decision.direction === "LONG"
                          ? "var(--up)"
                          : decision.direction === "SHORT"
                          ? "var(--down)"
                          : "var(--text-3)",
                      }}
                    />
                  </span>
                  <span className="tabular-nums w-[30px] text-right" style={{ color: "var(--text-3)" }}>
                    {(decision.conviction * 100).toFixed(0)}
                  </span>
                </span>
                <span
                  className="tabular-nums py-1.5 text-right font-medium"
                  style={{ color: decision.targetWeight > 0 ? "var(--up)" : decision.targetWeight < 0 ? "var(--down)" : "var(--text-3)" }}
                >
                  {(decision.targetWeight * 100).toFixed(1)}%
                </span>
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Paper book */}
        <Card title="Paper book" subtitle="Marked to market each refresh" bodyClassName="px-4 pb-4 pt-1">
          {(portfolio?.positions ?? []).filter((p: any) => Math.abs(p.notional) > 1).length === 0 ? (
            <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
              No open positions — the book rebalances into signals once per day.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(portfolio?.positions ?? [])
                .filter((p: any) => Math.abs(p.notional) > 1)
                .map((p: any) => (
                  <div key={p.symbol} className="py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="grid grid-cols-[88px_1fr_88px_80px] items-center gap-3 text-[12px]">
                      <span className="truncate" style={{ color: "var(--text-2)" }}>{p.label}</span>
                      <div className="relative h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
                        <div
                          className="absolute top-0 h-full rounded-full"
                          style={{
                            width: `${(Math.abs(p.weight) / maxWeight) * 100}%`,
                            backgroundColor: p.units >= 0 ? HEX.up : HEX.down,
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-right" style={{ color: "var(--value)" }}>
                        {(p.weight * 100).toFixed(1)}% {p.units >= 0 ? "L" : "S"}
                      </span>
                      <span className="tabular-nums text-right" style={{ color: p.unrealizedPnl >= 0 ? "var(--up)" : "var(--down)" }}>
                        {p.unrealizedPnl >= 0 ? "+" : ""}${fmt(p.unrealizedPnl / 1000, 1)}k
                      </span>
                    </div>
                    {p.barrier && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                        <span className="tabular-nums">Entry {fmt(p.avgPrice, 2)}</span>
                        <span className="tabular-nums" style={{ color: "var(--down)" }}>Stop {fmt(p.barrier.stopPrice, 2)}</span>
                        <span className="tabular-nums">
                          Trail {fmt(p.barrier.trailingStopPrice, 2)} {p.barrier.trailingArmed ? "armed" : "waiting"}
                        </span>
                        <span className="tabular-nums">
                          {fmt(p.barrier.holdingDays, 1)}d open
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div className="mt-4 text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Recent simulated fills
          </div>
          <div className="mt-1 flex flex-col">
            {(portfolio?.recentTrades ?? []).slice(0, 6).map((t: any, i: number) => (
              <div
                key={`${t.date}-${t.symbol}-${i}`}
                className="flex items-center justify-between py-1 text-[11.5px]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span style={{ color: t.side === "BUY" ? "var(--up)" : "var(--down)" }}>
                  {t.side} {t.symbol}
                  {t.reason && t.reason !== "REBALANCE" ? ` · ${t.reason.replaceAll("_", " ")}` : ""}
                </span>
                <span className="tabular-nums" style={{ color: "var(--text-2)" }}>
                  ${fmt(t.notional / 1000, 1)}k @ {fmt(t.price, 2)}
                </span>
                <span style={{ color: "var(--text-3)" }}>{relTime(t.date)}</span>
              </div>
            ))}
            {(portfolio?.recentTrades ?? []).length === 0 && (
              <div className="py-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                No fills yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Scenario stress tests */}
        <Card
          title="Scenario stress tests"
          subtitle="Driver shocks propagated to the book via trailing-120d correlation betas"
          bodyClassName="px-4 pb-4 pt-1"
        >
          {scenarios.length === 0 ? (
            <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
              No open risk to stress — scenarios appear once the book has positions.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {scenarios.map((sc: any) => {
                const maxAbs = Math.max(1, ...scenarios.map((s: any) => Math.abs(s.bookPnlUsd)));
                return (
                  <div key={sc.id}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span style={{ color: "var(--text-1)" }}>
                        {sc.name}{" "}
                        <span style={{ color: "var(--text-3)" }}>
                          ({sc.driverLabel} {sc.driverShockPct > 0 ? "+" : ""}{sc.driverShockPct}%)
                        </span>
                      </span>
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: sc.bookPnlUsd >= 0 ? "var(--up)" : "var(--down)" }}
                      >
                        {sc.bookPnlUsd >= 0 ? "+" : ""}${fmt(sc.bookPnlUsd / 1000, 1)}k ({sc.bookPnlPct >= 0 ? "+" : ""}
                        {fmt(sc.bookPnlPct, 2)}%)
                      </span>
                    </div>
                    <div className="relative mt-1 h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
                      <div
                        className="absolute top-0 h-full rounded-full"
                        style={{
                          width: `${(Math.abs(sc.bookPnlUsd) / maxAbs) * 50}%`,
                          left: sc.bookPnlUsd >= 0 ? "50%" : `${50 - (Math.abs(sc.bookPnlUsd) / maxAbs) * 50}%`,
                          backgroundColor: sc.bookPnlUsd >= 0 ? HEX.up : HEX.down,
                        }}
                      />
                      <div className="absolute left-1/2 top-0 h-full w-px" style={{ backgroundColor: "var(--border-strong)" }} />
                    </div>
                    {sc.impacts?.[0] && (
                      <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                        biggest exposure: {sc.impacts[0].label} (β {fmt(sc.impacts[0].beta, 2)},{" "}
                        {sc.impacts[0].pnlUsd >= 0 ? "+" : ""}${fmt(sc.impacts[0].pnlUsd / 1000, 1)}k)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Decision rationale */}
        <Card
          title="Why the Live Strategy is positioned this way"
          subtitle="One decision, explained by its market drivers"
          bodyClassName="px-4 pb-4 pt-1"
        >
          <div className="flex flex-col">
            {decisions
              .filter((decision: any) => Math.abs(decision.targetWeight) >= 0.01)
              .sort((a: any, b: any) => Math.abs(b.targetWeight) - Math.abs(a.targetWeight))
              .map((decision: any) => (
                <div key={decision.symbol} className="py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium" style={{ color: "var(--text-1)" }}>
                      {decision.direction === "LONG" ? "Long" : "Short"} {decision.label}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ color: decision.targetWeight > 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {(decision.targetWeight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {(decision.rationale ?? []).map((line: string, i: number) => (
                      <li key={i} className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                        · {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            {decisions.filter((decision: any) => Math.abs(decision.targetWeight) >= 0.01).length === 0 && (
              <div className="py-4 text-[12px]" style={{ color: "var(--text-3)" }}>
                All signals currently flat.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
