"use client";

// ─── ATLAS Shell ────────────────────────────────────────────────────────────────
// The application frame: left sidebar navigation (pages, not panel grids),
// top bar with search + clocks, alert banner, command palette (Ctrl+K) and the
// shared instrument chart overlay. Data hooks live here and flow into pages.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { useNews } from "@/hooks/useNews";
import { useAlerts } from "@/hooks/useAlerts";
import { CHARTABLE_INSTRUMENTS } from "@/lib/instrumentCatalog";
import { TerminalActionsContext } from "@/components/terminal/TerminalContext";
import InstrumentChartOverlay from "@/components/terminal/InstrumentChartOverlay";
import OverviewPage from "./pages/OverviewPage";
import MarketsPage from "./pages/MarketsPage";
import MacroPage from "./pages/MacroPage";
import QuantPage from "./pages/QuantPage";
import NewsPage from "./pages/NewsPage";
import AccountSettings from "./AccountSettings";

type PageId = "overview" | "markets" | "macro" | "quant" | "news";

const NAV: Array<{ id: PageId; label: string; sub: string; key: string; icon: React.ReactNode }> = [
  {
    id: "overview",
    label: "Overview",
    sub: "Briefing & movers",
    key: "1",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: "markets",
    label: "Markets",
    sub: "All instruments",
    key: "2",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12l3.5-4 3 2.5L14 4" /><path d="M10 4h4v4" />
      </svg>
    ),
  },
  {
    id: "macro",
    label: "Macro",
    sub: "Regimes & data",
    key: "3",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2.5 2.5 2.5 9.5 0 12M8 2c-2.5 2.5-2.5 9.5 0 12" />
      </svg>
    ),
  },
  {
    id: "quant",
    label: "Quant",
    sub: "Paper simulator",
    key: "4",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13V8M8 13V3M13 13v-7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "news",
    label: "News",
    sub: "Headlines",
    key: "5",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 6.5h6M5 9.5h4" strokeLinecap="round" />
      </svg>
    ),
  },
];

function Clock({ tz, label }: { tz: string; label: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums text-[11px]" style={{ color: "var(--text-3)" }}>
      {label}{" "}
      <span style={{ color: "var(--text-2)" }}>
        {now
          ? now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : "--:--:--"}
      </span>
    </span>
  );
}

function Palette({
  onClose,
  goTo,
  openChart,
  refresh,
}: {
  onClose: () => void;
  goTo: (page: PageId) => void;
  openChart: (id: string) => void;
  refresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const commands = useMemo(
    () => [
      ...NAV.map((n) => ({ id: `go-${n.id}`, label: `Go to ${n.label}`, hint: n.sub, run: () => goTo(n.id) })),
      { id: "refresh", label: "Refresh data", hint: "Re-fetch market & news feeds", run: refresh },
      ...CHARTABLE_INSTRUMENTS.map((inst) => ({
        id: `chart-${inst.id}`,
        label: `Chart ${inst.label}`,
        hint: `${inst.group} · ${inst.symbol}`,
        run: () => openChart(inst.id),
      })),
    ],
    [goTo, openChart, refresh]
  );

  const visible = commands.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => setIndex(0), [query]);

  const run = (cmd: (typeof commands)[number]) => {
    cmd.run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70" style={{ backdropFilter: "blur(2px)" }} onMouseDown={onClose}>
      <div
        className="mx-auto mt-24 w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-[12px]" style={{ color: "var(--accent)" }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, visible.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && visible.length) { e.preventDefault(); run(visible[index] ?? visible[0]); }
            }}
            placeholder="Pages, instruments, actions…"
            className="w-full bg-transparent text-[13px] outline-none"
            style={{ color: "var(--text-1)" }}
          />
          <kbd className="kbd">ESC</kbd>
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {visible.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => run(cmd)}
              onMouseEnter={() => setIndex(i)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
              style={{
                backgroundColor: i === index ? "var(--accent-soft)" : "transparent",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span className="text-[12.5px] font-medium" style={{ color: i === index ? "var(--accent)" : "var(--text-1)" }}>
                {cmd.label}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{cmd.hint}</span>
            </button>
          ))}
          {visible.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AtlasShell() {
  const [page, setPage] = useState<PageId>("overview");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [chartId, setChartId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const market = useMarketData(3000);
  const news = useNews(30_000);
  const { alerts, triggered, addAlert, removeAlert, dismissTriggered } = useAlerts(market.data);

  const openChart = useCallback((id: string) => setChartId(id), []);
  const actions = useMemo(() => ({ openChart }), [openChart]);

  const refreshAll = useCallback(() => {
    market.refresh();
    news.refresh();
  }, [market, news]);

  // Global keyboard: 1-5 pages, Ctrl+K palette, R refresh.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing || paletteOpen || chartId) return;
      const nav = NAV.find((n) => n.key === e.key);
      if (nav) { setPage(nav.id); return; }
      if (e.key.toLowerCase() === "r") refreshAll();
      if (e.key === "/") { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, chartId, refreshAll]);

  const current = NAV.find((n) => n.id === page)!;
  const sources = market.sources;

  return (
    <TerminalActionsContext.Provider value={actions}>
      <div className="flex h-[100dvh] overflow-hidden" style={{ backgroundColor: "var(--bg)", fontFamily: "var(--font-ui)" }}>
        {/* Sidebar — hidden on phones, replaced by a bottom tab bar */}
        <aside
          className="hidden w-[212px] shrink-0 flex-col md:flex"
          style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), #8b5eff)" }}
            >
              A
            </div>
            <div>
              <div className="text-[14px] font-semibold leading-none" style={{ color: "var(--text-1)" }}>ATLAS</div>
              <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>FICC workspace</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1 px-2.5">
            {NAV.map((item) => {
              const active = item.id === page;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-2)",
                  }}
                >
                  {item.icon}
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium leading-tight" style={{ color: active ? "var(--accent)" : "var(--text-1)" }}>
                      {item.label}
                    </span>
                    <span className="block text-[10px]" style={{ color: "var(--text-3)" }}>{item.sub}</span>
                  </span>
                  <kbd className="kbd">{item.key}</kbd>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pb-4">
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="mb-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left"
              style={{ color: "var(--text-2)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="8" cy="5" r="2.5" /><path d="M3.5 14c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5" />
              </svg>
              <span className="text-[11px] font-medium">Account</span>
            </button>
            {alerts.length > 0 && (
              <div className="mb-3 text-[10.5px]" style={{ color: "var(--text-3)" }}>
                {alerts.filter((a) => !a.triggeredAt).length} alert(s) armed
              </div>
            )}
            <div className="mb-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
              Data sources
            </div>
            <div className="flex flex-col gap-1">
              {["bcb", "fred", "yahoo", "b3"].map((key) => {
                const s = sources?.[key];
                return (
                  <div key={key} className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-2)" }}>
                    <span
                      className="inline-block h-[6px] w-[6px] rounded-full"
                      style={{ backgroundColor: s?.ok ? "var(--up)" : s ? "var(--down)" : "var(--text-3)" }}
                    />
                    {(s?.label ?? key).toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header
            className="flex h-[52px] shrink-0 items-center gap-3 px-3 md:gap-4 md:px-5"
            style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}
          >
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-none" style={{ color: "var(--text-1)" }}>
                {current.label}
              </div>
              <div className="mt-0.5 text-[10.5px]" style={{ color: "var(--text-3)" }}>{current.sub}</div>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              className="ml-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] md:w-[260px] md:px-3"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <span className="hidden md:inline">Search instruments, pages…</span>
              <kbd className="kbd ml-auto hidden md:inline-flex">Ctrl K</kbd>
            </button>

            <button
              type="button"
              onClick={refreshAll}
              title="Refresh all data (R)"
              className="rounded-lg px-2.5 py-1.5"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Account — sidebar is hidden on phones, so surface it here */}
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="Account"
              className="rounded-lg px-2.5 py-1.5 md:hidden"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="8" cy="5" r="2.5" /><path d="M3.5 14c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5" />
              </svg>
            </button>

            <div className="hidden items-center gap-4 lg:flex">
              <Clock tz="America/Sao_Paulo" label="BRT" />
              <Clock tz="America/New_York" label="NY" />
            </div>
          </header>

          {/* Triggered alert banner */}
          {triggered.length > 0 && (
            <div
              className="flex items-center justify-between px-5 py-2 text-[12px]"
              style={{ backgroundColor: "rgba(232,161,60,0.10)", borderBottom: "1px solid rgba(232,161,60,0.4)", color: "var(--warn)" }}
            >
              <span>
                {triggered
                  .map((a) => `${a.label} ${a.direction === "above" ? "≥" : "≤"} ${a.level} (hit ${a.triggeredValue ?? "?"})`)
                  .join(" · ")}
              </span>
              <button type="button" onClick={dismissTriggered} className="font-medium underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Page content */}
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-24 md:px-5 md:py-4 md:pb-4">
            {page === "overview" && <OverviewPage market={market} news={news} openChart={openChart} />}
            {page === "markets" && <MarketsPage market={market} openChart={openChart} />}
            {page === "macro" && <MacroPage market={market} />}
            {page === "quant" && <QuantPage />}
            {page === "news" && <NewsPage news={news} />}
          </main>
        </div>

        {/* Mobile bottom tab bar — primary navigation on phones */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex md:hidden"
          style={{
            backgroundColor: "var(--surface)",
            borderTop: "1px solid var(--border)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {NAV.map((item) => {
            const active = item.id === page;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className="flex flex-1 flex-col items-center gap-1 py-2"
                style={{ color: active ? "var(--accent)" : "var(--text-3)" }}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {paletteOpen && (
        <Palette
          onClose={() => setPaletteOpen(false)}
          goTo={(p) => setPage(p)}
          openChart={openChart}
          refresh={refreshAll}
        />
      )}

      {chartId && (
        <InstrumentChartOverlay
          instrumentId={chartId}
          marketData={market.data}
          alerts={alerts}
          onAddAlert={addAlert}
          onRemoveAlert={removeAlert}
          onClose={() => setChartId(null)}
        />
      )}
      <AccountSettings open={accountOpen} onClose={() => setAccountOpen(false)} />
    </TerminalActionsContext.Provider>
  );
}
