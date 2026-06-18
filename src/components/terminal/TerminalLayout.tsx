"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { formatRelativeTime } from "@/lib/formatters";
import { useClock } from "@/hooks/useClock";
import { useMarketData } from "@/hooks/useMarketData";
import { useNews } from "@/hooks/useNews";
import { useAlerts } from "@/hooks/useAlerts";
import { useTerminalPreferences } from "@/hooks/useTerminalPreferences";
import { useTerminalWorkspace, type WidgetType } from "@/hooks/useTerminalWorkspace";
import { findInstrument } from "@/lib/instrumentCatalog";
import CommandPalette from "./CommandPalette";
import HeaderTape from "./HeaderTape";
import InstrumentChartOverlay from "./InstrumentChartOverlay";
import PreferencesDrawer from "./PreferencesDrawer";
import StatusBar from "./StatusBar";
import { TerminalActionsContext } from "./TerminalContext";
import WorkspaceGrid from "./WorkspaceGrid";

export default function TerminalLayout() {
  const [now, setNow] = useState<Date | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [chartInstrumentId, setChartInstrumentId] = useState<string | null>(null);
  const { brt, et } = useClock();
  const { mutate } = useSWRConfig();
  const marketState = useMarketData(3_000);
  const newsState = useNews(3_000);
  const { preferences, actions } = useTerminalPreferences();
  const alertsApi = useAlerts(marketState.data);

  const terminalActions = useMemo(
    () => ({
      openChart: (instrumentId: string) => {
        if (findInstrument(instrumentId)) setChartInstrumentId(instrumentId);
      },
    }),
    []
  );
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    activeWidget,
    activePanel,
    setWorkspace,
    setActiveWidget,
    cycleWorkspace,
  } = useTerminalWorkspace();

  const sizeVars = {
    compact: { "--terminal-text-size": "11.5px", "--terminal-meta-size": "10px" },
    standard: { "--terminal-text-size": "12.5px", "--terminal-meta-size": "11px" },
    large: { "--terminal-text-size": "14px", "--terminal-meta-size": "12px" },
  }[preferences.textScale];

  const densityVars = {
    dense: {
      "--terminal-row-height": "27px",
      "--terminal-news-row-height": "34px",
      "--terminal-panel-header-height": "36px",
      "--terminal-group-height": "24px",
      "--terminal-column-height": "22px",
      "--terminal-news-title-white-space": "nowrap",
      "--terminal-news-line-height": "1.1",
    },
    comfortable: {
      "--terminal-row-height": "34px",
      "--terminal-news-row-height": "46px",
      "--terminal-panel-header-height": "40px",
      "--terminal-group-height": "28px",
      "--terminal-column-height": "24px",
      "--terminal-news-title-white-space": "normal",
      "--terminal-news-line-height": "1.3",
    },
  }[preferences.density];

  const themeVars = {
    classic: {
      "--bg": "#0a0d13", "--surface": "#10141d", "--surface-2": "#151a26",
      "--surface-3": "#1b2230", "--border": "#1f2735", "--border-strong": "#2c3750",
    },
    contrast: {
      "--bg": "#000000", "--surface": "#0a0c10", "--surface-2": "#10131a",
      "--surface-3": "#161a24", "--border": "#252b3a", "--border-strong": "#343d52",
    },
    soft: {
      "--bg": "#11141c", "--surface": "#171b26", "--surface-2": "#1c2130",
      "--surface-3": "#232a3c", "--border": "#2a3247", "--border-strong": "#39435e",
    },
  }[preferences.theme];

  const cssVars: React.CSSProperties & Record<string, string> = {
    ...sizeVars,
    ...densityVars,
    ...themeVars,
  };

  useEffect(() => {
    setNow(new Date());
    setLastRefresh(new Date());
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  const refreshAll = useCallback(() => {
    setLastRefresh(new Date());
    mutate("/api/market");
    mutate("/api/news");
  }, [mutate]);

  const focusWidget = useCallback((widget: WidgetType) => {
    setActiveWidget(widget);
    actions.setViewMode("focus");
  }, [actions, setActiveWidget]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        setPreferencesOpen(true);
        return;
      }

      if (commandPaletteOpen || preferencesOpen || chartInstrumentId) return;

      const key = event.key.toUpperCase();
      const workspace = workspaces.find((item) => item.shortcut.toUpperCase() === key);
      const numericWorkspace = /^[1-9]$/.test(event.key)
        ? workspaces[Number(event.key) - 1]
        : undefined;
      if (workspace || numericWorkspace) {
        event.preventDefault();
        setWorkspace((workspace ?? numericWorkspace)?.id ?? "main");
        return;
      }

      if (key === "R") {
        event.preventDefault();
        refreshAll();
      } else if (key === "N") {
        event.preventDefault();
        setWorkspace("news");
      } else if (key === "T") {
        event.preventDefault();
        setWorkspace("charts");
      } else if (key === "F") {
        event.preventDefault();
        actions.toggleViewMode();
      } else if (key === "ESCAPE") {
        event.preventDefault();
        setWorkspace("main");
        actions.setViewMode("overview");
      } else if (key === "ARROWRIGHT") {
        event.preventDefault();
        cycleWorkspace(1);
      } else if (key === "ARROWLEFT") {
        event.preventDefault();
        cycleWorkspace(-1);
      }
    },
    [actions, chartInstrumentId, commandPaletteOpen, cycleWorkspace, preferencesOpen, refreshAll, setWorkspace, workspaces]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <TerminalActionsContext.Provider value={terminalActions}>
    <div
      className={`terminal-shell terminal-theme-${preferences.theme} flex flex-col h-screen overflow-hidden select-none`}
      style={cssVars}
      data-density={preferences.density}
      data-layout={preferences.layout}
      data-theme={preferences.theme}
    >
      <header className="terminal-header flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-[5px]"
            style={{ background: "linear-gradient(135deg, var(--accent), #8b5eff)" }}
          />
          <span className="font-semibold tracking-[0.18em] text-sm text-neutral">ATLAS</span>
          <span className="text-muted text-2xs hidden sm:inline">FICC · BR / US / GLOBAL</span>
        </div>

        <nav
          className="flex flex-wrap items-center gap-0.5 order-3 w-full lg:order-none lg:w-auto rounded-lg p-0.5"
          style={{ backgroundColor: "var(--surface-3)" }}
        >
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setWorkspace(workspace.id)}
              aria-pressed={activeWorkspaceId === workspace.id}
              className={`rounded-md px-2.5 py-1 text-2xs font-medium transition-colors duration-100 ${
                activeWorkspaceId === workspace.id
                  ? "text-neutral"
                  : "text-muted hover:text-dim"
              }`}
              style={
                activeWorkspaceId === workspace.id
                  ? { backgroundColor: "var(--surface)", boxShadow: "inset 0 0 0 1px var(--border-strong)" }
                  : undefined
              }
            >
              {workspace.name}
              <span className="ml-1.5 text-muted opacity-70">{workspace.shortcut}</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-end gap-3 text-2xs">
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ backgroundColor: "var(--surface-3)" }}
          >
            <button type="button" onClick={actions.decreaseText} className="rounded-md px-1.5 py-0.5 text-muted hover:text-neutral" title="Decrease text size">A−</button>
            <button type="button" onClick={actions.increaseText} className="rounded-md px-1.5 py-0.5 text-muted hover:text-neutral" title="Increase text size">A+</button>
            <button type="button" onClick={actions.toggleDensity} className="rounded-md px-1.5 py-0.5 text-muted hover:text-neutral" title="Toggle row density">
              {preferences.density === "dense" ? "Dense" : "Roomy"}
            </button>
            <button type="button" onClick={actions.toggleViewMode} className="rounded-md px-1.5 py-0.5 text-muted hover:text-neutral" title="Toggle focus mode">
              {preferences.viewMode === "overview" ? "Grid" : "Focus"}
            </button>
            <button type="button" onClick={() => setCommandPaletteOpen(true)} className="rounded-md px-1.5 py-0.5 text-muted hover:text-neutral" title="Open command palette" aria-label="Open command palette">⌘K</button>
            <button type="button" onClick={() => setPreferencesOpen(true)} className="rounded-md px-1.5 py-0.5 text-muted hover:text-neutral" title="Open preferences" aria-label="Open preferences">Prefs</button>
          </div>
          <span className="hidden sm:inline text-muted">
            {now ? now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }) : "--- --"}
          </span>
          <span className="text-muted">BRT <span className="text-neutral tabular-nums font-medium">{brt}</span></span>
          <span className="hidden sm:inline text-muted">ET <span className="text-neutral tabular-nums font-medium">{et}</span></span>
          <span className="text-muted hidden md:inline">upd {formatRelativeTime(lastRefresh)}</span>
        </div>
      </header>

      <HeaderTape marketData={marketState.data} />

      {alertsApi.triggered.length > 0 && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-1 shrink-0"
          style={{ backgroundColor: "rgba(232,161,60,0.10)", borderBottom: "1px solid var(--warn)" }}
        >
          <span className="text-2xs" style={{ color: "var(--warn)" }}>
            <span className="animate-pulse font-bold">⚠ ALERT</span>{" "}
            {alertsApi.triggered
              .map(
                (alert) =>
                  `${alert.label} ${alert.direction === "above" ? "≥" : "≤"} ${alert.level} (hit ${alert.triggeredValue ?? "?"})`
              )
              .join("  ·  ")}
          </span>
          <button
            type="button"
            onClick={alertsApi.dismissTriggered}
            className="text-2xs px-2 py-0.5 rounded-md border"
            style={{ color: "var(--warn)", borderColor: "var(--warn)", background: "none", cursor: "pointer" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        <WorkspaceGrid
          workspace={activeWorkspace}
          activeWidget={activeWidget}
          marketState={marketState}
          newsState={newsState}
          onActivate={focusWidget}
          viewMode={preferences.viewMode}
          layout={preferences.layout}
        />
      </main>

      <StatusBar activePanel={activePanel} marketSources={marketState.sources} newsSource={newsState.source} />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        workspaces={workspaces}
        setWorkspace={setWorkspace}
        setActiveWidget={focusWidget}
        refreshAll={refreshAll}
        openChart={terminalActions.openChart}
        openPreferences={() => setPreferencesOpen(true)}
        toggleFocus={actions.toggleViewMode}
        cycleTheme={actions.cycleTheme}
        cycleLayout={actions.cycleLayout}
        cycleDensity={actions.cycleDensity}
        cycleTextScale={actions.cycleTextScale}
      />
      <PreferencesDrawer open={preferencesOpen} preferences={preferences} actions={actions} onClose={() => setPreferencesOpen(false)} />
      {chartInstrumentId && (
        <InstrumentChartOverlay
          instrumentId={chartInstrumentId}
          marketData={marketState.data}
          alerts={alertsApi.alerts}
          onAddAlert={alertsApi.addAlert}
          onRemoveAlert={alertsApi.removeAlert}
          onClose={() => setChartInstrumentId(null)}
        />
      )}
    </div>
    </TerminalActionsContext.Provider>
  );
}
