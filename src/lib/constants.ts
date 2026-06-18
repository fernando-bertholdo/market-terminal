// ─── Instrument Definitions ─────────────────────────────────────────────────
// All tickers, series codes, and labels used across the terminal.

export const INSTRUMENTS = {
  // ── Brazil: Rates ──────────────────────────────────────────────────────────
  BRAZIL_RATES: {
    SELIC: {
      id: "SELIC",
      label: "SELIC",
      description: "Brazil overnight policy rate (annualized, base 252)",
      source: "bcb" as const,
      seriesCode: "1178",
      unit: "%" as const,
    },
    // DI futures sourced from B3 cotacao API, not Yahoo Finance
    DI_JUL26: {
      id: "DI_JUL26",
      label: "DI Jul/26",
      description: "DI Futures July 2026 (short end)",
      source: "b3" as const,
      b3Symbol: "DI1N26",
      unit: "%" as const,
    },
    DI_JAN27: {
      id: "DI_JAN27",
      label: "DI Jan/27",
      description: "DI Futures January 2027",
      source: "b3" as const,
      b3Symbol: "DI1F27",
      unit: "%" as const,
    },
    DI_JAN28: {
      id: "DI_JAN28",
      label: "DI Jan/28",
      description: "DI Futures January 2028",
      source: "b3" as const,
      b3Symbol: "DI1F28",
      unit: "%" as const,
    },
    DI_JAN30: {
      id: "DI_JAN30",
      label: "DI Jan/30",
      description: "DI Futures January 2030",
      source: "b3" as const,
      b3Symbol: "DI1F30",
      unit: "%" as const,
    },
    CDI: {
      id: "CDI",
      label: "CDI",
      description: "CDI overnight rate (annualized)",
      source: "bcb" as const,
      seriesCode: "4392",
      unit: "%" as const,
    },
    IPCA: {
      id: "IPCA",
      label: "IPCA",
      description: "Brazil CPI monthly",
      source: "bcb" as const,
      seriesCode: "433",
      unit: "%" as const,
    },
  },

  // ── Brazil: FX & Equity ────────────────────────────────────────────────────
  BRAZIL_FX: {
    USDBRL: {
      id: "USDBRL",
      label: "USD/BRL",
      description: "US Dollar / Brazilian Real",
      source: "yahoo" as const,
      ticker: "BRL=X",
      unit: "BRL" as const,
    },
    EURBRL: {
      id: "EURBRL",
      label: "EUR/BRL",
      description: "Euro / Brazilian Real",
      source: "yahoo" as const,
      ticker: "EURBRL=X",
      unit: "BRL" as const,
    },
    IBOV: {
      id: "IBOV",
      label: "IBOV",
      description: "Ibovespa (B3 context)",
      source: "yahoo" as const,
      ticker: "^BVSP",
      unit: "pts" as const,
    },
  },

  // ── US: Rates (FRED series IDs) ────────────────────────────────────────────
  US_RATES: {
    FED_FUNDS: {
      id: "FED_FUNDS",
      label: "Fed Funds",
      description: "Federal Funds Effective Rate",
      source: "fred" as const,
      seriesId: "FEDFUNDS",
      unit: "%" as const,
    },
    UST_2Y: {
      id: "UST_2Y",
      label: "US 2Y",
      description: "2-Year Treasury Constant Maturity",
      source: "fred" as const,
      seriesId: "DGS2",
      unit: "%" as const,
    },
    UST_5Y: {
      id: "UST_5Y",
      label: "US 5Y",
      description: "5-Year Treasury Constant Maturity",
      source: "fred" as const,
      seriesId: "DGS5",
      unit: "%" as const,
    },
    UST_10Y: {
      id: "UST_10Y",
      label: "US 10Y",
      description: "10-Year Treasury Constant Maturity",
      source: "fred" as const,
      seriesId: "DGS10",
      unit: "%" as const,
    },
    UST_30Y: {
      id: "UST_30Y",
      label: "US 30Y",
      description: "30-Year Treasury Constant Maturity",
      source: "fred" as const,
      seriesId: "DGS30",
      unit: "%" as const,
    },
    BREAKEVEN_5Y: {
      id: "BREAKEVEN_5Y",
      label: "5Y Breakeven",
      description: "5-Year Breakeven Inflation Rate",
      source: "fred" as const,
      seriesId: "T5YIE",
      unit: "%" as const,
    },
    BREAKEVEN_10Y: {
      id: "BREAKEVEN_10Y",
      label: "10Y Breakeven",
      description: "10-Year Breakeven Inflation Rate",
      source: "fred" as const,
      seriesId: "T10YIE",
      unit: "%" as const,
    },
  },

  // ── US: FX ────────────────────────────────────────────────────────────────
  US_FX: {
    DXY: {
      id: "DXY",
      label: "DXY",
      description: "US Dollar Index",
      source: "yahoo" as const,
      ticker: "DX-Y.NYB",
      unit: "idx" as const,
    },
    EURUSD: {
      id: "EURUSD",
      label: "EUR/USD",
      description: "Euro / US Dollar",
      source: "yahoo" as const,
      ticker: "EURUSD=X",
      unit: "USD" as const,
    },
    USDJPY: {
      id: "USDJPY",
      label: "USD/JPY",
      description: "US Dollar / Japanese Yen",
      source: "yahoo" as const,
      ticker: "USDJPY=X",
      unit: "JPY" as const,
    },
    GBPUSD: {
      id: "GBPUSD",
      label: "GBP/USD",
      description: "British Pound / US Dollar",
      source: "yahoo" as const,
      ticker: "GBPUSD=X",
      unit: "USD" as const,
    },
  },

  // ── Commodities ────────────────────────────────────────────────────────────
  COMMODITIES: {
    WTI: {
      id: "WTI",
      label: "WTI",
      description: "WTI Crude Oil (front month)",
      source: "yahoo" as const,
      ticker: "CL=F",
      unit: "USD/bbl" as const,
    },
    BRENT: {
      id: "BRENT",
      label: "Brent",
      description: "Brent Crude Oil (front month)",
      source: "yahoo" as const,
      ticker: "BZ=F",
      unit: "USD/bbl" as const,
    },
    GOLD: {
      id: "GOLD",
      label: "Gold",
      description: "Gold (spot / front month)",
      source: "yahoo" as const,
      ticker: "GC=F",
      unit: "USD/oz" as const,
    },
    SILVER: {
      id: "SILVER",
      label: "Silver",
      description: "Silver (spot / front month)",
      source: "yahoo" as const,
      ticker: "SI=F",
      unit: "USD/oz" as const,
    },
    IRON_ORE: {
      id: "IRON_ORE",
      label: "Iron Ore",
      description: "Iron Ore 62% Fe CFR China",
      source: "yahoo" as const,
      ticker: "TIO=F",
      unit: "USD/t" as const,
    },
    SOY: {
      id: "SOY",
      label: "Soybeans",
      description: "Soybeans (CBOT front month)",
      source: "yahoo" as const,
      ticker: "ZS=F",
      unit: "USc/bu" as const,
    },
    CORN: {
      id: "CORN",
      label: "Corn",
      description: "Corn (CBOT front month)",
      source: "yahoo" as const,
      ticker: "ZC=F",
      unit: "USc/bu" as const,
    },
    COPPER: {
      id: "COPPER",
      label: "Copper",
      description: "Copper (COMEX front month)",
      source: "yahoo" as const,
      ticker: "HG=F",
      unit: "USD/lb" as const,
    },
  },

  // ── Global / EM ────────────────────────────────────────────────────────────
  GLOBAL: {
    EMBI_BRAZIL: {
      id: "EMBI_BRAZIL",
      label: "EMBI+ BR",
      description: "Brazil EMBI+ Spread (vs UST)",
      source: "fred" as const,
      seriesId: "BAMLEMFSFCRPIEY", // EM fallback; actual EMBI via JP Morgan
      unit: "bps" as const,
    },
    SPX: {
      id: "SPX",
      label: "S&P 500",
      description: "S&P 500 Index",
      source: "yahoo" as const,
      ticker: "^GSPC",
      unit: "pts" as const,
    },
    VIX: {
      id: "VIX",
      label: "VIX",
      description: "CBOE Volatility Index",
      source: "yahoo" as const,
      ticker: "^VIX",
      unit: "idx" as const,
    },
  },
} as const;

// ─── Flat ticker list for batch fetching ─────────────────────────────────────
export const YAHOO_TICKERS = [
  // FX
  "BRL=X",
  "EURBRL=X",
  "EURUSD=X",
  "USDJPY=X",
  "GBPUSD=X",
  "DX-Y.NYB",
  // Commodities
  "CL=F",
  "BZ=F",
  "GC=F",
  "SI=F",
  "TIO=F",
  "ZS=F",
  "ZC=F",
  "HG=F",
  // Indices
  "^BVSP",
  "^GSPC",
  "^VIX",
  "EWZ",
  "EEM",
  "XLE",
  "XLF",
  "XLI",
  "XLK",
  // Brazilian DI futures (may not all be available)
  "DIF26.SA",
  "DIG27.SA",
] as const;

export const FRED_SERIES = [
  "FEDFUNDS",
  "DGS2",
  "DGS5",
  "DGS10",
  "DGS30",
  "T5YIE",
  "T10YIE",
] as const;

export const BCB_SERIES = [
  "1178", // SELIC annualized (base 252)
  "4392", // CDI overnight annualized
  "433",  // IPCA monthly
  "1",    // USD/BRL daily avg
] as const;

// B3 DI futures symbols — update quarterly as front contracts expire
export const B3_DI_SYMBOLS = [
  "DI1N26", // Jul 2026 (short end)
  "DI1F27", // Jan 2027
  "DI1F28", // Jan 2028
  "DI1F30", // Jan 2030
] as const;

// ─── Refresh intervals (milliseconds) ────────────────────────────────────────
export const REFRESH_INTERVALS = {
  /** FX and commodities — near real-time */
  MARKET_FAST: 30_000,      // 30 seconds
  /** DI futures and indices */
  MARKET_STANDARD: 60_000,  // 1 minute
  /** FRED data (daily series) */
  RATES_SLOW: 300_000,      // 5 minutes
  /** BCB data */
  BCB: 300_000,             // 5 minutes
  /** News headlines */
  NEWS: 120_000,            // 2 minutes
  /** Status bar clock */
  CLOCK: 1_000,             // 1 second
} as const;

// ─── Color tokens (mirrors tailwind.config.ts) ────────────────────────────────
export const COLOR_TOKENS = {
  bg: {
    terminal: "#0a0d13",
    panel: "#10141d",
    panelHover: "#151a26",
    header: "#151a26",
    rowEven: "#10141d",
    rowOdd: "#10141d",
    rowHover: "#1b2230",
  },
  border: {
    panel: "#1f2735",
    panelActive: "#5e8bff",
  },
  text: {
    up: "#34c98e",
    upDim: "#2aa374",
    down: "#f0647a",
    downDim: "#c45263",
    neutral: "#e8ecf4",
    dim: "#98a2b8",
    muted: "#566076",
  },
  accent: {
    orange: "#5e8bff",
    orangeDim: "#4a6fd0",
    orangeGlow: "rgba(94,139,255,0.12)",
  },
} as const;

// ─── News sources ─────────────────────────────────────────────────────────────
// Only verified working RSS sources (Reuters direct RSS dead since 2020, FT/Valor blocked)
export const NEWS_SOURCES = [
  {
    id: "bloomberg",
    label: "BLOOMBERG",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    priority: 1,
    maxItems: 15,
  },
  {
    id: "reuters",
    label: "REUTERS",
    // Google News RSS proxy — returns actual reuters.com URLs
    url: "https://news.google.com/rss/search?q=Reuters+(central+bank+OR+bonds+OR+currencies+OR+commodities+OR+inflation)+when:24h&hl=en-US&gl=US&ceid=US:en",
    priority: 2,
    maxItems: 15,
  },
  {
    id: "cnbc",
    label: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    priority: 2,
    maxItems: 12,
  },
  {
    id: "fed",
    label: "FED",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    priority: 1,
    maxItems: 8,
  },
  {
    id: "bcb",
    label: "BCB",
    url: "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias",
    priority: 1,
    maxItems: 8,
  },
  {
    id: "bcb-copom",
    label: "BCB COPOM",
    url: "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/comunicadoscopom",
    priority: 1,
    maxItems: 5,
  },
  {
    id: "ecb",
    label: "ECB",
    url: "https://www.ecb.europa.eu/rss/press.html",
    priority: 1,
    maxItems: 8,
  },
  {
    id: "boe",
    label: "BOE",
    url: "https://www.bankofengland.co.uk/rss/news",
    priority: 2,
    maxItems: 8,
  },
  {
    id: "boj",
    label: "BOJ",
    url: "https://www.boj.or.jp/en/rss/whatsnew.xml",
    priority: 2,
    maxItems: 8,
  },
  {
    id: "bis",
    label: "BIS",
    url: "https://www.bis.org/doclist/all_pressrels.rss",
    priority: 2,
    maxItems: 6,
  },
  {
    id: "bea",
    label: "US BEA",
    url: "https://apps.bea.gov/rss/rss.xml",
    priority: 1,
    maxItems: 8,
  },
  {
    id: "census",
    label: "US CENSUS",
    url: "https://www.census.gov/economic-indicators/indicator.xml",
    priority: 2,
    maxItems: 8,
  },
  {
    id: "eia",
    label: "US EIA",
    url: "https://www.eia.gov/rss/press_rss.xml",
    priority: 1,
    maxItems: 8,
  },
  {
    id: "sec",
    label: "US SEC",
    url: "https://www.sec.gov/news/pressreleases.rss",
    priority: 2,
    maxItems: 8,
  },
  // ── Portuguese feeds (Phase 4, §4.4) — Brazil-asset coverage for the ML path.
  // Google News PT is pre-filtered by macro theme; InfoMoney/Brazil Journal are
  // finance outlets. (Valor/FT are blocked — see CLAUDE.md.)
  {
    id: "gnews-br",
    label: "BRASIL MACRO",
    url: "https://news.google.com/rss/search?q=(Selic+OR+Copom+OR+IPCA+OR+infla%C3%A7%C3%A3o+OR+d%C3%B3lar+OR+juros+OR+Ibovespa+OR+Banco+Central)+when:24h&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    priority: 1,
    maxItems: 12,
  },
  {
    id: "infomoney",
    label: "INFOMONEY",
    url: "https://www.infomoney.com.br/feed/",
    priority: 2,
    maxItems: 10,
  },
  {
    id: "braziljournal",
    label: "BRAZIL JOURNAL",
    url: "https://braziljournal.com/feed/",
    priority: 2,
    maxItems: 8,
  },
] as const;

export const NEWS_FILTER_KEYWORDS = [
  "bond",
  "bonds",
  "yield",
  "yields",
  "rate",
  "rates",
  "BRL",
  "Brazil",
  "Brasil",
  "Fed",
  "FOMC",
  "IPCA",
  "SELIC",
  "CDI",
  "commodities",
  "commodity",
  "EM",
  "emerging market",
  "treasury",
  "treasuries",
  "inflation",
  "central bank",
  "Banco Central",
  "interest",
  "fixed income",
  "stock",
  "stocks",
  "shares",
  "equities",
  "futures",
  "dollar",
  "forex",
  "currency",
  "currencies",
  "yuan",
  "yen",
  "euro",
  "oil",
  "crude",
  "OPEC",
  "gold",
  "copper",
  "soy",
  "corn",
  "PMI",
  "auction",
  "debt",
  "tariff",
  "tariffs",
  "trade",
  "markets wrap",
  "war",
  "attack",
  "missile",
  "sanction",
  "conflict",
  "ceasefire",
  "geopolit",
  "China",
  "semiconductor",
  "chip",
  "artificial intelligence",
  "AI ",
  "export control",
  "data center",
  "defense",
  "nuclear",
  "electricity",
  "power demand",
] as const;

export const NEWS_MAX_HEADLINES = 50;

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
export const KEYBOARD_SHORTCUTS = {
  "1": "rates",
  "2": "fx",
  "3": "commodities",
  "4": "news",
  "5": "chart",
  "6": "watchlist",
  "n": "news",
  "N": "news",
  "w": "watchlist",
  "W": "watchlist",
  "Escape": "reset",
  "r": "refresh",
  "R": "refresh",
  "f": "focus",
  "F": "focus",
} as const;

// ─── Panel IDs ────────────────────────────────────────────────────────────────
export type PanelId =
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

export const PANELS: Record<PanelId, { label: string; shortcut: string }> = {
  rates: { label: "RATES", shortcut: "1" },
  fx: { label: "FX", shortcut: "2" },
  commodities: { label: "CMDTY", shortcut: "3" },
  news: { label: "NEWS", shortcut: "4" },
  chart: { label: "CHART", shortcut: "5" },
  watchlist: { label: "TAPE", shortcut: "6" },
  analytics: { label: "ANALYTICS", shortcut: "7" },
  sim: { label: "QUANT SIM", shortcut: "8" },
  macro: { label: "MACRO", shortcut: "9" },
  correlations: { label: "CORR", shortcut: "0" },
};
