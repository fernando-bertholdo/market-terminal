"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PanelId } from "@/lib/constants";

export type WorkspaceMode = "overview" | "focus" | "grid" | "multiChart";
export type WidgetType =
  | "rates"
  | "fx"
  | "commodities"
  | "news"
  | "chart"
  | "watchlist"
  | "analytics"
  | "sim"
  | "macro"
  | "correlations";

export interface WorkspaceCell {
  id: string;
  widget: WidgetType;
  title?: string;
  colSpan?: number;
  rowSpan?: number;
  config?: {
    chartView?: "curves" | "brazil" | "us" | "fx" | "commodities";
    instruments?: string[];
  };
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  shortcut: string;
  mode: WorkspaceMode;
  columns: number;
  activeWidget: WidgetType;
  cells: WorkspaceCell[];
}

const STORAGE_KEY = "terminal.workspace.v1";

export const WORKSPACE_PRESETS: WorkspaceLayout[] = [
  {
    id: "main",
    name: "MAIN",
    shortcut: "M",
    mode: "overview",
    columns: 12,
    activeWidget: "rates",
    cells: [
      { id: "main-rates", widget: "rates", colSpan: 4, rowSpan: 2 },
      { id: "main-fx", widget: "fx", colSpan: 4 },
      { id: "main-news", widget: "news", colSpan: 4, rowSpan: 2 },
      { id: "main-macro", widget: "macro", colSpan: 4 },
    ],
  },
  {
    id: "macro",
    name: "MACRO",
    shortcut: "E",
    mode: "grid",
    columns: 12,
    activeWidget: "macro",
    cells: [
      { id: "macro-main", widget: "macro", colSpan: 5, rowSpan: 2 },
      { id: "macro-corr", widget: "correlations", colSpan: 4, rowSpan: 2 },
      { id: "macro-analytics", widget: "analytics", colSpan: 3, rowSpan: 2 },
      { id: "macro-news", widget: "news", colSpan: 8 },
      { id: "macro-cmdty", widget: "commodities", colSpan: 4 },
    ],
  },
  {
    id: "br",
    name: "BR RATES",
    shortcut: "B",
    mode: "grid",
    columns: 12,
    activeWidget: "rates",
    cells: [
      { id: "br-rates", widget: "rates", colSpan: 5, rowSpan: 2 },
      {
        id: "br-chart",
        widget: "chart",
        title: "BR CURVE",
        colSpan: 4,
        rowSpan: 2,
        config: { chartView: "brazil" },
      },
      { id: "br-watch", widget: "watchlist", colSpan: 3 },
      { id: "br-news", widget: "news", colSpan: 3 },
    ],
  },
  {
    id: "fx",
    name: "FX",
    shortcut: "X",
    mode: "grid",
    columns: 12,
    activeWidget: "fx",
    cells: [
      { id: "fx-board", widget: "fx", colSpan: 4, rowSpan: 2 },
      { id: "fx-watch", widget: "watchlist", colSpan: 4 },
      { id: "fx-chart", widget: "chart", colSpan: 4, config: { chartView: "fx" } },
      { id: "fx-news", widget: "news", colSpan: 8 },
    ],
  },
  {
    id: "cmdty",
    name: "CMDTY",
    shortcut: "C",
    mode: "grid",
    columns: 12,
    activeWidget: "commodities",
    cells: [
      { id: "cmdty-board", widget: "commodities", colSpan: 4, rowSpan: 2 },
      { id: "cmdty-chart", widget: "chart", colSpan: 4, config: { chartView: "commodities" } },
      { id: "cmdty-watch", widget: "watchlist", colSpan: 4 },
      { id: "cmdty-news", widget: "news", colSpan: 8 },
    ],
  },
  {
    id: "news",
    name: "NEWS",
    shortcut: "N",
    mode: "grid",
    columns: 12,
    activeWidget: "news",
    cells: [
      { id: "news-feed", widget: "news", colSpan: 8, rowSpan: 2 },
      { id: "news-watch", widget: "watchlist", colSpan: 4 },
      { id: "news-rates", widget: "rates", colSpan: 4 },
    ],
  },
  {
    id: "charts",
    name: "CHARTS",
    shortcut: "T",
    mode: "multiChart",
    columns: 12,
    activeWidget: "chart",
    cells: [
      { id: "chart-curves", widget: "chart", title: "CURVES", colSpan: 6, config: { chartView: "curves" } },
      { id: "chart-br", widget: "chart", title: "BRAZIL", colSpan: 6, config: { chartView: "brazil" } },
      { id: "chart-fx", widget: "fx", colSpan: 6 },
      { id: "chart-cmdty", widget: "commodities", colSpan: 6 },
    ],
  },
  {
    id: "quant",
    name: "QUANT",
    shortcut: "Q",
    mode: "grid",
    columns: 12,
    activeWidget: "sim",
    cells: [
      { id: "quant-sim", widget: "sim", colSpan: 6, rowSpan: 2 },
      { id: "quant-analytics", widget: "analytics", colSpan: 6, rowSpan: 2 },
      { id: "quant-rates", widget: "rates", colSpan: 4 },
      { id: "quant-fx", widget: "fx", colSpan: 4 },
      { id: "quant-news", widget: "news", colSpan: 4 },
    ],
  },
  {
    id: "tape",
    name: "MY TAPE",
    shortcut: "W",
    mode: "focus",
    columns: 12,
    activeWidget: "watchlist",
    cells: [
      { id: "tape-main", widget: "watchlist", colSpan: 8, rowSpan: 2 },
      { id: "tape-rates", widget: "rates", colSpan: 4 },
      { id: "tape-fx", widget: "fx", colSpan: 4 },
    ],
  },
];

function isWorkspaceId(value: string | null): value is string {
  return WORKSPACE_PRESETS.some((workspace) => workspace.id === value);
}

export function widgetToPanelId(widget: WidgetType): PanelId {
  return widget;
}

export function useTerminalWorkspace() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("main");
  const [activeWidget, setActiveWidget] = useState<WidgetType>("rates");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isWorkspaceId(stored)) {
        setActiveWorkspaceId(stored);
        const workspace = WORKSPACE_PRESETS.find((item) => item.id === stored);
        setActiveWidget(workspace?.activeWidget ?? "rates");
      }
    } catch {
      // Ignore unavailable storage.
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, activeWorkspaceId);
    } catch {
      // Ignore unavailable storage.
    }
  }, [activeWorkspaceId, hasHydrated]);

  const activeWorkspace = useMemo(
    () =>
      WORKSPACE_PRESETS.find((workspace) => workspace.id === activeWorkspaceId) ??
      WORKSPACE_PRESETS[0],
    [activeWorkspaceId]
  );

  const setWorkspace = useCallback((workspaceId: string) => {
    const workspace =
      WORKSPACE_PRESETS.find(
        (item) =>
          item.id === workspaceId ||
          item.name.toLowerCase() === workspaceId.toLowerCase()
      ) ?? WORKSPACE_PRESETS[0];
    setActiveWorkspaceId(workspace.id);
    setActiveWidget(workspace.activeWidget);
  }, []);

  const cycleWorkspace = useCallback((direction: 1 | -1) => {
    setActiveWorkspaceId((current) => {
      const index = WORKSPACE_PRESETS.findIndex((item) => item.id === current);
      const next =
        (index + direction + WORKSPACE_PRESETS.length) % WORKSPACE_PRESETS.length;
      const workspace = WORKSPACE_PRESETS[next];
      setActiveWidget(workspace.activeWidget);
      return workspace.id;
    });
  }, []);

  return {
    workspaces: WORKSPACE_PRESETS,
    activeWorkspace,
    activeWorkspaceId,
    activeWidget,
    activePanel: widgetToPanelId(activeWidget),
    setWorkspace,
    setActiveWidget,
    cycleWorkspace,
  };
}
