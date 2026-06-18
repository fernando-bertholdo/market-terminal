# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Bloomberg-style FICC market terminal for personal use (FICC trading intern, Brazil focus), plus a **quant paper-trading simulator**. Dense, dark-themed, keyboard-navigable UI showing real-time Brazil/US/Global rates, FX, commodities, and news — and a research-backed strategy engine that simulates (never executes) trades.

## Dev Commands

```bash
npm run dev        # dev server at localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run type-check # tsc --noEmit
```

No test suite exists. Verify changes with `type-check` + `lint`, then smoke-test API routes against a running dev server (e.g. `Invoke-WebRequest http://localhost:3000/api/market`).

## Environment Variables

`.env.local` (gitignored): `FRED_API_KEY=` — required, free key from fredaccount.stlouisfed.org/apikeys. BCB, Yahoo, B3, and RSS need no auth.

## Architecture

Source lives in `src/` (not `/app`). Data flow: **fetchers → API routes → SWR hooks → widgets**, all rendered inside a workspace grid.

```
src/
  app/api/
    market/route.ts   — aggregates BCB + FRED + Yahoo + B3 via Promise.allSettled;
                        partial failures return null fields + per-source SourceStatus
    news/route.ts     — RSS aggregation (Bloomberg + Google News proxy for Reuters)
    history/route.ts  — daily closes per symbol (?symbols=BRL=X,CL=F&range=1y)
    sim/route.ts      — live quant model: signals + persistent paper book
    macro/route.ts    — macro dashboard: FRED (CPI/core YoY computed from index
                        levels, UNRATE, HY OAS, NFCI, T10YIE, DFII10) + BCB IPCA
                        12m (SGS 13522) + BCB Focus survey medians (Olinda
                        Expectativas API, ExpectativasMercadoAnuais, no auth)
  lib/
    fetchers/         — one adapter per source (bcb, fred, yahoo, yahooHistory, b3, news);
                        all return null on failure and log, never throw to callers
    analytics.ts      — pure stats: returns, EWMA vol, z-score, Sharpe, max drawdown
    sim/strategies.ts — signal engine: TSMOM, CARRY, MEANREV sleeves + vol targeting
    sim/engine.ts     — paper portfolio (fills, costs, persistence); legacy research backtest is not routed
    constants.ts      — INSTRUMENTS, tickers/series codes, PanelId, colors, refresh rates
    widgetRegistry.ts — widget metadata (title, category, default spans)
  hooks/              — useMarketData/useNews/useSim/useHistory (SWR polling),
                        useTerminalWorkspace (presets + localStorage), useTerminalPreferences
  components/
    terminal/         — TerminalLayout (global keyboard handler, CSS-var theming),
                        WorkspaceGrid, WidgetRenderer, CommandPalette, PreferencesDrawer, StatusBar
    widgets/          — one panel per widget: Rates, FX, Commodity, News, Chart,
                        Watchlist, Analytics, Sim
```

### Key patterns

- **Adding a widget** requires touching 4 places: `WidgetType` union in `useTerminalWorkspace.ts`, `WIDGET_REGISTRY` in `widgetRegistry.ts`, the render branch in `WidgetRenderer.tsx`, and `PanelId`/`PANELS` in `constants.ts`. Workspaces are presets in `WORKSPACE_PRESETS` (12-column grid cells).
- **Macro/regime layer**: `MacroPanel` computes four regime reads (RISK from SPX momentum + VIX + HY OAS trend; USD from DXY momentum + real yields; US INFL from CPI direction + breakevens; BCB from Focus SELIC vs current + DI slope). `CorrelationPanel` renders a rolling 30/60/120d correlation heatmap using `alignedReturns` + `correlation` from `lib/analytics.ts` (returns aligned on shared trading dates — never correlate raw arrays of different calendars). MACRO workspace shortcut: `E`.
- **Instrument catalog** (`lib/instrumentCatalog.ts`) is the single registry of instruments with accessors into the `/api/market` payload. It powers click-to-chart (rows call `useTerminalActions().openChart(id)` from `TerminalContext`), the editable watchlist (`useWatchlist`, localStorage), price alerts (`useAlerts`, evaluated client-side on each market refresh, banner in TerminalLayout), and `CHART <name>` commands in the palette. The chart overlay (`InstrumentChartOverlay`, lightweight-charts) only works for catalog entries with a Yahoo `symbol`; US yields chart via CBOE indices `^FVX`/`^TNX`/`^TYX`. When adding an instrument, add a catalog entry too.
- **API responses** always use `ApiResponse<T>` (`src/types/market.ts`): `{ data, fetchedAt, error, sources }`, HTTP 200 even on data failure — the UI renders nulls as `---` and shows source health in the StatusBar.
- **Panels** use inline styles with shared color constants (`#111111` bg, `#e8640c` orange, `#c8a45a` values, `#4caf72`/`#e05252` up/down) and CSS vars (`--terminal-row-height`, `--terminal-text-size`) set by TerminalLayout from preferences. Copy an existing panel (e.g. `RatesPanel.tsx`) when building a new one. Yields use inverted colors: rate up = red.
- **Keyboard**: workspace shortcuts (M/B/X/C/N/T/Q/W or 1–9), `/` or Ctrl+K command palette, `P` preferences, `F` focus mode, `R` refresh — handled centrally in `TerminalLayout.tsx`.

## Quant Simulator (`/api/sim`, Quant page)

Paper trading only — never sends real orders. Three sleeves, grounded in published research:

- **TSMOM** — time-series momentum (Moskowitz/Ooi/Pedersen, JFE 2012): sign of trailing 12m return blended with 3m, each position scaled by `volTarget / exAnteEWMAVol`.
- **CARRY** — Koijen/Moskowitz/Pedersen/Vrugt (JFE 2017): FX carry from rate differentials; implemented for USD/BRL using SELIC (BCB 1178) vs FEDFUNDS (FRED). Positive differential → short `BRL=X`.
- **MACRO** — economic trend / macro momentum (Brooks, AQR "A Half Century of Macro Momentum" 2017 + "Economic Trend" 2023): factor reads computed from prices only (walk-forward safe) — risk sentiment (VIX vs 1y median + SPX 3m trend), growth (copper/gold ratio trend), USD trend (DXY 3m) — mapped per asset with economic signs (gold anti-dollar/haven, JPY haven, EM hurt by strong USD…). Non-traded `CONTEXT_SYMBOLS` (`^VIX`, `DX-Y.NYB`) must be fetched alongside the universe.

Risk layer: **regime conditioning** (book de-grosses ×0.6 in RISK-OFF, ×1.1 in RISK-ON) and **covariance-based portfolio vol targeting** (weights scaled so √(wᵀΣw) over trailing-90d covariance hits 10% — correlations size the book, not per-asset vol alone). Caps: 40% per asset, 3x gross. Universe: 11 Yahoo symbols in `SIM_UNIVERSE`.

`computeSignals` internally combines price trend, rate differentials, economic context/news, regime and risk scaling into one live portfolio. `/api/sim` exposes this as `decisions[]` with one final `LONG`/`SHORT`/`FLAT` decision, conviction, target weight and rationale per asset; internal components are not presented as separate strategies. `lib/sim/scenarios.ts` stress-tests the live book through correlation betas.

- **Explicit hedges**: `lib/sim/hedging.ts` builds auditable trade expressions for WTI/Brent, Ibovespa/SPX + BRL FX, and BRL carry vs a USD basket. Hedge ratios use `beta=-cov/var` over the trailing 120 observations (minimum 60, capped ±2), using only data available at decision time. Legs are netted back into the existing asset targets; the API also returns `expressions` for attribution. DV01 is explicitly unsupported until the universe has proper rates instruments and contract metadata.
- **Fixed-income risk dashboard**: `lib/fixedIncomeRisk.ts` calculates DI1 theoretical PU, business days, Macaulay/modified duration, convexity, and DV01 per contract using the B3 zero-coupon convention. US Treasury rows are explicitly labeled par-bond proxies, assuming semiannual coupons equal to current FRED constant-maturity yields, with DV01 per USD 1m face. Results are returned in `/api/market.data.fixedIncomeRisk` and shown on the Markets page.
- **News intelligence**: `lib/news/` classifies live headlines deterministically into themes, macro factors, and asset impacts with confidence and time decay. `/api/news` has per-source memory cache, single-flight refresh, stale-if-error, source health, and freshness metadata. The live model applies a capped news overlay to the macro decision layer.
- **Live-only product**: `/api/sim` and the Quant page expose only the live model, current paper book, P&L, hedged expressions, scenarios and rationale. Historical closes remain inputs for live momentum, volatility, covariance and hedge ratios; no backtest is computed or returned.
- **Live mode**: every GET fetches real-time Yahoo quotes (10s module micro-cache, `getLivePrices`) and splices them into the daily closes (`closesWithLive` — replaces today's partial bar or appends, never double-counts), so signals, marks, fills and scenarios all run off the live tape. The Quant page polls every 15s.
- **Paper book**: persisted to `data/sim-state.json` (gitignored). Marked to market at live prices each request. Trading: full rebalance once/day (daily anchor) + **intraday tolerance-band rebalancing** (asset trades only when |target−actual| > 2% of equity — `driftBandPct`). `state.intradayEquity` keeps a rolling ~400-mark tape (≥1min spacing) for the live P&L chart; older state files are migrated on load. `POST /api/sim` accepts `{action: "reset"}` and `{action: "rebalance"}`.
- **Live exit layer**: `lib/sim/barriers.ts` applies volatility-adjusted stop-loss, take-profit, trailing-stop and 30-day time barriers before target rebalancing. Exits are persisted with an auditable reason. Same-direction re-entry requires a six-hour cooldown and a material change in the live target; an opposite decision clears the block. This is risk management for the one live strategy, not another model.
- When changing strategy logic, always keep the no-lookahead invariant: signals at t must never see prices after t.

## Verified Data Sources (do not "fix" these — they were researched)

- **BCB SGS**: `api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/1?formato=json` — SELIC `1178`, CDI `4392`, IPCA monthly `433`. Latest value only (no previous → change is null).
- **BCB PTAX Olinda**: `CotacaoDolarDia` / `CotacaoMoedaDia` (EUR); published ~13:00 BRT — fetchers walk back up to 7 days for the latest fix.
- **B3 DI futures**: `cotacao.b3.com.br/mds/api/v1/instrumentQuotation/{symbol}`, field `curPrc` = annual rate %. Symbols `DI1N26`, `DI1F27`, `DI1F28`, `DI1F30` — **contract codes expire; update in `constants.ts` and `api/market/route.ts`**. Returns `NOK` outside trading windows (data absence, not an error).
- **FRED**: `DGS2/5/10/30`, `FEDFUNDS`, breakevens `T5YIE`/`T10YIE`. Needs `FRED_API_KEY`.
- **Yahoo Finance**: direct v8 chart API with browser User-Agent (the `yahoo-finance2` package is installed but fetchers call the API directly). Server-side only (CORS). `BRL=X`, `EURBRL=X`, `DX-Y.NYB`, `CL=F`, `BZ=F`, `GC=F`, `TIO=F`, `ZS=F`, `HG=F`, `^GSPC`, `^BVSP`, `^VIX`, etc.
- **News RSS**: Bloomberg `feeds.bloomberg.com/markets/news.rss` works; Reuters only via Google News RSS proxy (direct Reuters RSS dead since 2020; FT/Valor blocked).
- **NTN-B**: no free public API (ANBIMA requires scraping) — manual entry only.

## App Shell (ATLAS v2 — current UI)

`src/app/page.tsx` renders `src/components/atlas/AtlasShell.tsx`: a sidebar-navigation app with five **pages** (not panel grids) — Overview (auto-written briefing + hero sparkline cards + movers + policy stack + headlines), Markets (clickable instrument tiles by asset class + curves + correlations), Macro (regime meters + indicator tiles + Focus survey), Quant (KPIs, equity curve, signal matrix, paper book), News (filterable reading list). Shared primitives live in `src/components/atlas/ui.tsx` (Card, ChangeChip, Sparkline, SignedBar, RegimeMeter, StatTile). Keyboard: `1–5` pages, `Ctrl+K`/`/` palette, `R` refresh. The shell owns the data hooks and provides `TerminalActionsContext` so any tile can `openChart(id)` into `InstrumentChartOverlay`. Legacy widget components under `components/widgets/` are partially reused (ChartPanel, CorrelationPanel inside the Markets page); the old `TerminalLayout` workspace UI is no longer routed but still compiles — its sizing CSS vars now have `:root` defaults in `globals.css`.

## Design System ("ATLAS")

- All colors are CSS custom properties defined in `globals.css` `:root`: `--bg #0a0d13`, `--surface #10141d`, `--surface-2 #151a26`, `--surface-3 #1b2230`, `--border #1f2735`, `--border-strong #2c3750`, `--text-1/-2/-3`, `--value #dde3ef`, `--accent #5e8bff` (blue), `--up #34c98e`, `--down #f0647a`, `--warn #e8a13c`, `--radius 10px`. Themes (classic/contrast/soft) override these at the shell level in `TerminalLayout.tsx`.
- Typography: Inter for UI (`--font-ui`), JetBrains Mono **only for numerals** — the `.tabular-nums` class sets both `font-variant-numeric` and the mono font family, so wrap every numeric span in it.
- Panels: rounded cards (`borderRadius: var(--radius)`, soft shadow) on `var(--surface)`, headers on `var(--surface-2)`, title pattern `Title` + grey subtitle span (no bracket titles). Copy `RatesPanel.tsx` when building a new panel.
- **Canvas/SVG cannot resolve CSS vars** — lightweight-charts options and SVG presentation attributes need concrete palette hexes (see `InstrumentChartOverlay.tsx`, `ChartPanel.tsx`, `SimPanel.tsx` sparkline).
- Tailwind config legacy names (`accent-orange`, `up`, `down`, `dim`, `panel-border`...) are remapped in place to the new palette — old class names render new colors.

## UX Conventions

- Dense, minimal whitespace; Inter UI text with mono numerals via `.tabular-nums`.
- News: titles only, max 50, newest first, keyword-filtered (`NEWS_FILTER_KEYWORDS`), opens in new tab with `noopener,noreferrer`.
- Every panel shows a status dot + relative last-update time; data refresh cadence per `REFRESH_INTERVALS`.
