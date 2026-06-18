import type { WidgetType } from "@/hooks/useTerminalWorkspace";

export interface WidgetDefinition {
  id: WidgetType;
  title: string;
  category: "market" | "news" | "chart" | "custom";
  defaultColSpan: number;
  minColSpan: number;
  description: string;
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetDefinition> = {
  rates: {
    id: "rates",
    title: "RATES",
    category: "market",
    defaultColSpan: 4,
    minColSpan: 3,
    description: "Brazil and US rates board",
  },
  fx: {
    id: "fx",
    title: "FX",
    category: "market",
    defaultColSpan: 4,
    minColSpan: 3,
    description: "Currency monitor",
  },
  commodities: {
    id: "commodities",
    title: "CMDTY",
    category: "market",
    defaultColSpan: 4,
    minColSpan: 3,
    description: "Commodity futures and spot proxies",
  },
  news: {
    id: "news",
    title: "NEWS",
    category: "news",
    defaultColSpan: 4,
    minColSpan: 3,
    description: "Live market headlines",
  },
  chart: {
    id: "chart",
    title: "CHART",
    category: "chart",
    defaultColSpan: 6,
    minColSpan: 4,
    description: "Curves and market charts",
  },
  watchlist: {
    id: "watchlist",
    title: "MY TAPE",
    category: "custom",
    defaultColSpan: 4,
    minColSpan: 3,
    description: "Personal market tape",
  },
  analytics: {
    id: "analytics",
    title: "ANALYTICS",
    category: "market",
    defaultColSpan: 5,
    minColSpan: 4,
    description: "Curve spreads, vol, z-scores",
  },
  sim: {
    id: "sim",
    title: "QUANT SIM",
    category: "custom",
    defaultColSpan: 6,
    minColSpan: 4,
    description: "Paper-trading quant strategy simulator",
  },
  macro: {
    id: "macro",
    title: "MACRO",
    category: "market",
    defaultColSpan: 5,
    minColSpan: 4,
    description: "Regimes, US/BR macro, Focus survey",
  },
  correlations: {
    id: "correlations",
    title: "CORR",
    category: "market",
    defaultColSpan: 4,
    minColSpan: 3,
    description: "Cross-asset correlation matrix",
  },
};

export const WATCHLIST_DEFAULTS = [
  "USD/BRL",
  "DI Jan/28",
  "US 10Y",
  "DXY",
  "Brent",
  "Gold",
  "Iron Ore",
  "S&P 500",
] as const;
