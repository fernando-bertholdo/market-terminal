"use client";

import React from "react";
import type { MarketDataState } from "@/hooks/useMarketData";
import type { NewsState } from "@/hooks/useNews";
import type { WorkspaceCell, WidgetType } from "@/hooks/useTerminalWorkspace";
import RatesPanel from "@/components/widgets/RatesPanel";
import FXPanel from "@/components/widgets/FXPanel";
import CommodityPanel from "@/components/widgets/CommodityPanel";
import NewsPanel from "@/components/widgets/NewsPanel";
import ChartPanel from "@/components/widgets/ChartPanel";
import WatchlistPanel from "@/components/widgets/WatchlistPanel";
import AnalyticsPanel from "@/components/widgets/AnalyticsPanel";
import SimPanel from "@/components/widgets/SimPanel";
import MacroPanel from "@/components/widgets/MacroPanel";
import CorrelationPanel from "@/components/widgets/CorrelationPanel";

export default function WidgetRenderer({
  cell,
  activeWidget,
  marketState,
  newsState,
  onActivate,
}: {
  cell: WorkspaceCell;
  activeWidget: WidgetType;
  marketState: MarketDataState;
  newsState: NewsState;
  onActivate: (widget: WidgetType) => void;
}) {
  const active = activeWidget === cell.widget;
  const handlePointerDown = () => onActivate(cell.widget);

  return (
    <div className="min-h-[220px] overflow-hidden" onPointerDown={handlePointerDown}>
      {cell.widget === "rates" && <RatesPanel active={active} marketState={marketState} />}
      {cell.widget === "fx" && <FXPanel active={active} marketState={marketState} />}
      {cell.widget === "commodities" && (
        <CommodityPanel active={active} marketState={marketState} />
      )}
      {cell.widget === "news" && <NewsPanel active={active} newsState={newsState} />}
      {cell.widget === "chart" && <ChartPanel active={active} marketState={marketState} />}
      {cell.widget === "watchlist" && (
        <WatchlistPanel active={active} marketState={marketState} />
      )}
      {cell.widget === "analytics" && (
        <AnalyticsPanel active={active} marketState={marketState} />
      )}
      {cell.widget === "sim" && <SimPanel active={active} />}
      {cell.widget === "macro" && <MacroPanel active={active} marketState={marketState} />}
      {cell.widget === "correlations" && <CorrelationPanel active={active} />}
    </div>
  );
}
