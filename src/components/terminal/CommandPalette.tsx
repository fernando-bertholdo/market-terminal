"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetType, WorkspaceLayout } from "@/hooks/useTerminalWorkspace";
import { CHARTABLE_INSTRUMENTS } from "@/lib/instrumentCatalog";

export interface TerminalCommand {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  workspaces,
  setWorkspace,
  setActiveWidget,
  refreshAll,
  openChart,
  openPreferences,
  toggleFocus,
  cycleTheme,
  cycleLayout,
  cycleDensity,
  cycleTextScale,
}: {
  open: boolean;
  onClose: () => void;
  workspaces: WorkspaceLayout[];
  setWorkspace: (workspaceId: string) => void;
  setActiveWidget: (widget: WidgetType) => void;
  refreshAll: () => void;
  openChart?: (instrumentId: string) => void;
  openPreferences?: () => void;
  toggleFocus?: () => void;
  cycleTheme?: () => void;
  cycleLayout?: () => void;
  cycleDensity?: () => void;
  cycleTextScale?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const commands = useMemo<TerminalCommand[]>(
    () => [
      ...workspaces.map((workspace) => ({
        id: `layout-${workspace.id}`,
        label: `LAYOUT ${workspace.name}`,
        hint: `Open ${workspace.name} workspace`,
        run: () => setWorkspace(workspace.id),
      })),
      { id: "widget-rates", label: "RATES", hint: "Focus rates", run: () => setActiveWidget("rates") },
      { id: "widget-fx", label: "FX", hint: "Focus FX", run: () => setActiveWidget("fx") },
      {
        id: "widget-cmdty",
        label: "CMDTY",
        hint: "Focus commodities",
        run: () => setActiveWidget("commodities"),
      },
      { id: "widget-news", label: "NEWS", hint: "Focus headlines", run: () => setActiveWidget("news") },
      { id: "widget-chart", label: "CHART", hint: "Focus charts", run: () => setActiveWidget("chart") },
      {
        id: "widget-watch",
        label: "MY TAPE",
        hint: "Focus personal tape",
        run: () => setActiveWidget("watchlist"),
      },
      { id: "refresh", label: "REFRESH", hint: "Refresh all market and news data", run: refreshAll },
      ...(openChart
        ? CHARTABLE_INSTRUMENTS.map((inst) => ({
            id: `chart-${inst.id}`,
            label: `CHART ${inst.label}`,
            hint: `Open ${inst.label} price chart (${inst.group})`,
            run: () => openChart(inst.id),
          }))
        : []),
      ...(toggleFocus
        ? [{ id: "focus", label: "FOCUS", hint: "Toggle focused reading mode", run: toggleFocus }]
        : []),
      ...(openPreferences
        ? [
            {
              id: "preferences",
              label: "PREFERENCES",
              hint: "Open density, text, theme, and layout controls",
              run: openPreferences,
            },
          ]
        : []),
      ...(cycleTheme
        ? [{ id: "theme", label: "THEME", hint: "Cycle terminal theme", run: cycleTheme }]
        : []),
      ...(cycleLayout
        ? [{ id: "layout", label: "LAYOUT", hint: "Cycle visual layout emphasis", run: cycleLayout }]
        : []),
      ...(cycleDensity
        ? [{ id: "density", label: "DENSITY", hint: "Cycle row density", run: cycleDensity }]
        : []),
      ...(cycleTextScale
        ? [{ id: "text", label: "TEXT", hint: "Cycle text scale", run: cycleTextScale }]
        : []),
    ],
    [
      cycleDensity,
      cycleLayout,
      cycleTextScale,
      cycleTheme,
      openChart,
      openPreferences,
      refreshAll,
      setActiveWidget,
      setWorkspace,
      toggleFocus,
      workspaces,
    ]
  );

  const visibleCommands = commands.filter((command) => {
    const text = `${command.label} ${command.hint}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const runCommand = (command: TerminalCommand) => {
    command.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="mx-auto mt-20 w-[min(720px,calc(100vw-24px))] overflow-hidden rounded-xl border border-[#2c3750] bg-[#10141d] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-panel-border bg-[#151a26] px-3 py-2.5">
          <span className="text-accent-orange text-xs font-semibold">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((index) => Math.min(index + 1, visibleCommands.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter" && visibleCommands[0]) {
                event.preventDefault();
                runCommand(visibleCommands[selectedIndex] ?? visibleCommands[0]);
              }
            }}
            className="w-full bg-transparent text-sm text-neutral outline-none"
            placeholder="Type layout, rates, fx, news, chart, refresh..."
          />
          <kbd className="kbd">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {visibleCommands.map((command, index) => (
            <button
              key={command.id}
              type="button"
              onClick={() => runCommand(command)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`grid w-full grid-cols-[180px_1fr] gap-3 border-b px-3 py-2 text-left ${
                index === selectedIndex
                  ? "border-[#2c3750] bg-[rgba(94,139,255,0.10)]"
                  : "border-[#1f2735] hover:bg-[#151a26]"
              }`}
            >
              <span className="text-accent-orange text-xs font-semibold">{command.label}</span>
              <span className="text-dim text-xs">{command.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
