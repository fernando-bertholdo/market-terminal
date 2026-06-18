"use client";

import React from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import type { NewsState } from "@/hooks/useNews";
import type { WidgetType, WorkspaceLayout } from "@/hooks/useTerminalWorkspace";
import type { TerminalLayout, ViewMode } from "@/hooks/useTerminalPreferences";
import WidgetRenderer from "./WidgetRenderer";

export default function WorkspaceGrid({
  workspace,
  activeWidget,
  marketState,
  newsState,
  onActivate,
  viewMode = "overview",
  layout = "threeColumn",
}: {
  workspace: WorkspaceLayout;
  activeWidget: WidgetType;
  marketState: MarketDataState;
  newsState: NewsState;
  onActivate: (widget: WidgetType) => void;
  viewMode?: ViewMode;
  layout?: TerminalLayout;
}) {
  const cells =
    viewMode === "focus"
      ? workspace.cells.filter((cell) => cell.widget === activeWidget).slice(0, 1)
      : workspace.cells;
  const visibleCells = cells.length ? cells : workspace.cells.slice(0, 1);

  const getColSpan = (cell: (typeof workspace.cells)[number]) => {
    if (viewMode === "focus") return 12;
    const base = cell.colSpan ?? 4;
    if (layout === "newsRight" && cell.widget === "news") return Math.min(12, base + 2);
    if (layout === "chartsFocus" && cell.widget === "chart") return Math.min(12, base + 2);
    return base;
  };

  return (
    <div
      className="min-h-full lg:h-full grid grid-cols-1 lg:grid-cols-12 gap-2 p-2"
      data-workspace={workspace.id}
      data-view-mode={viewMode}
      data-layout={layout}
    >
      {visibleCells.map((cell) => (
        <div
          key={cell.id}
          className="min-h-[260px] lg:min-h-0 overflow-hidden"
          style={{
            gridColumn: `span ${getColSpan(cell)} / span ${getColSpan(cell)}`,
            gridRow: `span ${cell.rowSpan ?? 1} / span ${cell.rowSpan ?? 1}`,
          }}
        >
          <WidgetRenderer
            cell={cell}
            activeWidget={activeWidget}
            marketState={marketState}
            newsState={newsState}
            onActivate={onActivate}
          />
        </div>
      ))}
    </div>
  );
}
