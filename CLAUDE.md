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

`.env.local` (gitignored). All are server-side — never use the `NEXT_PUBLIC_` prefix.

- `FRED_API_KEY=` — required for US rates/breakevens, free key from fredaccount.stlouisfed.org/apikeys. BCB, Yahoo, B3, and RSS need no auth.
- `DATABASE_URL=` — Neon Postgres connection string. Backs the paper book (`sim_state`) **and** authentication (`auth_credentials`, `auth_sessions`). Without it, auth is unavailable and the paper book falls back to a local `data/sim-state.json` file (dev only).
- `APP_USERNAME=` / `APP_PASSWORD=` — bootstrap the single login credential on first sign-in (then stored hashed in Postgres).
- `CRON_SECRET=` — shared secret for the periodic tick (sent as a `Bearer` token); the auth middleware lets matching requests through to `/api/sim` and `/api/market`.
- `ATLAS_BACKEND_URL=` (alias `MODEL_ENGINE_URL`) — base URL of the Python `model-engine`; when set, Next delegates heavy data/signals to it. Optional `ATLAS_BACKEND_TOKEN`/`MODEL_ENGINE_TOKEN` (Bearer) and `ATLAS_BACKEND_REQUIRED=true` (fail closed instead of falling back to the TypeScript fetchers).
- `NEWS_NLP_URL=` (optional `NEWS_NLP_TOKEN`) — base URL of the Python `news-nlp` service for ML headline classification; any error/timeout falls back to the deterministic regex classifier.

## Architecture

Source lives in `src/` (not `/app`). Front-end data flow: **fetchers → API routes → SWR hooks → widgets**, all rendered inside the ATLAS navigation shell. The Next app is now a **UI shell + session auth + paper-book executor + BFF**: when `ATLAS_BACKEND_URL`/`MODEL_ENGINE_URL` is set, the API routes delegate heavy data and signals to the Python `model-engine` (`src/lib/backend/pythonBackendClient.ts`); otherwise they fall back to the local TypeScript fetchers.

```
src/
  middleware.ts       — Edge auth gate: redirect to /login (401 for /api/*) unless a valid
                        `atlas_session` cookie exists; lets the `Bearer CRON_SECRET` tick through
  app/login/page.tsx  — login screen (auth API routes below)
  app/api/
    market/route.ts   — aggregates BCB + FRED + Yahoo + B3 via Promise.allSettled;
                        partial failures return null fields + per-source SourceStatus
    news/route.ts     — RSS aggregation (Bloomberg + Google News proxy for Reuters)
    history/route.ts  — daily closes per symbol (?symbols=BRL=X,CL=F&range=1y)
    sim/route.ts      — live quant model: signals + persistent paper book;
                        POST {action: tick|rebalance|reset} (cron token may only tick)
    macro/route.ts    — macro dashboard: FRED (CPI/core YoY computed from index
                        levels, UNRATE, HY OAS, NFCI, T10YIE, DFII10) + BCB IPCA
                        12m (SGS 13522) + BCB Focus survey medians (Olinda
                        Expectativas API, ExpectativasMercadoAnuais, no auth)
    auth/login|logout|credentials/route.ts — session login/logout + change credentials
  lib/
    fetchers/         — one adapter per source (bcb, fred, yahoo, yahooHistory, b3, news);
                        all return null on failure and log, never throw to callers
    backend/pythonBackendClient.ts — BFF client: delegates market/history/macro/news/
                        earnings/signals to the Python model-engine when configured
    auth.ts           — session auth (PBKDF2-SHA256, 210k iters) backed by Neon Postgres
    analytics.ts      — pure stats: returns, EWMA vol, z-score, Sharpe, max drawdown
    sim/strategies.ts — signal engine: TSMOM, CARRY, MACRO sleeves + vol targeting
    sim/stateStore.ts — paper-book persistence: Neon Postgres (sim_state) or JSON fallback
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

Outside `src/`: `services/model-engine` + `services/news-nlp` (Python FastAPI backends, see below), `deploy/cloudflare-worker` (periodic tick), `DEPLOY.md` (deploy notes).

### Backend services, auth & persistence

- **Python backends** (`services/`, FastAPI): `model-engine` (`atlas-backend`, port 8010) serves market data, history, macro, news and the quant signal engine (`compute_signals`) via `GET /health|/market|/market/terminal|/history|/macro|/news|/earnings` + `POST /signals`; `news-nlp` (`atlas-news-nlp`, port 8000) classifies headlines (`POST /classify`, `POST /retrain`, `GET /retrain/status`). Next reaches them through `src/lib/backend/pythonBackendClient.ts` (`ATLAS_BACKEND_URL`/`MODEL_ENGINE_URL`, `NEWS_NLP_URL`); a TypeScript fetcher fallback keeps the app working if a service is down, and `ATLAS_BACKEND_REQUIRED=true` makes data/signal routes fail closed instead.
- **Authentication** (`src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/auth/*`, `src/app/login`, `AccountSettings`): cookie session `atlas_session`, password hashed with PBKDF2-SHA256 (210k iterations), 30-day sessions. The Edge middleware validates the session against Postgres on every request (redirect to `/login`, or 401 for `/api/*`) and lets the `Bearer CRON_SECRET` tick through. **Single-tenant today**: one global credential (`CREDENTIAL_ID = 'primary'`) and one global book (`STATE_ID = 'paper-book'`).
- **Persistence — Neon Postgres** (`@neondatabase/serverless`, Edge-compatible): tables `sim_state`, `auth_credentials`, `auth_sessions`. The paper book is the JSONB `sim_state` row with optimistic version checks; if `DATABASE_URL` is absent it falls back to `data/sim-state.json` (dev only) and `/api/sim` reports `"persistence": "file"` instead of `"postgres"`.

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
- **MACRO** — economic trend / macro momentum (Brooks, AQR "A Half Century of Macro Momentum" 2017 + "Economic Trend" 2023): factor reads computed from prices only (walk-forward safe) — risk sentiment (VIX vs 1y median + SPX 3m trend), growth (copper/gold ratio trend), USD trend (DXY 3m) — mapped per asset with economic signs (gold anti-dollar/haven, JPY haven, EM hurt by strong USD…). Non-traded `CONTEXT_SYMBOLS` (`^VIX`, `DX-Y.NYB`, `^TNX`, `ITA`, `SOXX`, `XLU`) must be fetched alongside the universe.

Risk layer: **regime conditioning** (book de-grosses ×0.6 in RISK-OFF, ×1.1 in RISK-ON) and **covariance-based portfolio vol targeting** (weights scaled so √(wᵀΣw) over trailing-90d covariance hits 10% — correlations size the book, not per-asset vol alone). Caps: 40% per asset, 3x gross; single-name thematic equities are further capped at 5% per name and 8% per theme (`THEMATIC_EQUITY_THEME_CAP`). Universe: **27 tradable assets** in `SIM_UNIVERSE` (4 FX, 5 commodities, 8 equity index/ETF, 10 single-name thematic equities), plus non-traded `CONTEXT_SYMBOLS` (`^VIX`, `DX-Y.NYB`, `^TNX`, `ITA`, `SOXX`, `XLU`) read by the macro sleeve and regime filter.

`computeSignals` internally combines price trend, rate differentials, economic context/news, regime and risk scaling into one live portfolio. `/api/sim` exposes this as `decisions[]` with one final `LONG`/`SHORT`/`FLAT` decision, conviction, target weight and rationale per asset; internal components are not presented as separate strategies. `lib/sim/scenarios.ts` stress-tests the live book through correlation betas.

- **Explicit hedges**: `lib/sim/hedging.ts` builds auditable trade expressions for WTI/Brent, Ibovespa/SPX + BRL FX, and BRL carry vs a USD basket. Hedge ratios use `beta=-cov/var` over the trailing 120 observations (minimum 60, capped ±2), using only data available at decision time. Legs are netted back into the existing asset targets; the API also returns `expressions` for attribution. DV01 is explicitly unsupported until the universe has proper rates instruments and contract metadata.
- **Fixed-income risk dashboard**: `lib/fixedIncomeRisk.ts` calculates DI1 theoretical PU, business days, Macaulay/modified duration, convexity, and DV01 per contract using the B3 zero-coupon convention. US Treasury rows are explicitly labeled par-bond proxies, assuming semiannual coupons equal to current FRED constant-maturity yields, with DV01 per USD 1m face. Results are returned in `/api/market.data.fixedIncomeRisk` and shown on the Markets page.
- **News intelligence**: `lib/news/` classifies live headlines deterministically into themes, macro factors, and asset impacts with confidence and time decay. `/api/news` has per-source memory cache, single-flight refresh, stale-if-error, source health, and freshness metadata. The live model applies a capped news overlay to the macro decision layer.
- **Live-only product**: `/api/sim` and the Quant page expose only the live model, current paper book, P&L, hedged expressions, scenarios and rationale. Historical closes remain inputs for live momentum, volatility, covariance and hedge ratios; no backtest is computed or returned.
- **Live mode**: every GET fetches real-time Yahoo quotes (10s module micro-cache, `getLivePrices`) and splices them into the daily closes (`closesWithLive` — replaces today's partial bar or appends, never double-counts), so signals, marks, fills and scenarios all run off the live tape. The Quant page polls every 15s.
- **Paper book**: persisted to **Neon Postgres** (`sim_state` JSONB row, optimistic version checks, via `lib/sim/stateStore.ts`); falls back to `data/sim-state.json` (gitignored) only when `DATABASE_URL` is unset, and `/api/sim` reports the active backend as `"persistence": "postgres"` or `"file"`. Marked to market at live prices each request. Trading: full rebalance once/day (daily anchor) + **intraday tolerance-band rebalancing** (asset trades only when |target−actual| > 2% of equity — `driftBandPct`). `state.intradayEquity` keeps a rolling ~400-mark tape (≥1min spacing) for the live P&L chart; older state shapes are migrated on load. `POST /api/sim` accepts `{action: "tick"}` (advance/mark, used by the cron), `{action: "rebalance"}` and `{action: "reset"}`; the cron token may only `tick`.
- When changing strategy logic, always keep the no-lookahead invariant: signals at t must never see prices after t.

## Verified Data Sources (do not "fix" these — they were researched)

- **BCB SGS**: `api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/1?formato=json` — SELIC `1178`, CDI `4392`, IPCA monthly `433`. Latest value only (no previous → change is null).
- **BCB PTAX Olinda**: `CotacaoDolarDia` / `CotacaoMoedaDia` (EUR); published ~13:00 BRT — fetchers walk back up to 7 days for the latest fix.
- **B3 DI futures**: `cotacao.b3.com.br/mds/api/v1/instrumentQuotation/{symbol}`, field `curPrc` = annual rate %. Symbols `DI1N26`, `DI1F27`, `DI1F28`, `DI1F30` — **contract codes expire; update in `constants.ts` and `api/market/route.ts`**. Returns `NOK` outside trading windows (data absence, not an error).
- **FRED**: `DGS2/5/10/30`, `FEDFUNDS`, breakevens `T5YIE`/`T10YIE`. Needs `FRED_API_KEY`.
- **Yahoo Finance**: direct v8 chart API with browser User-Agent (the `yahoo-finance2` package is installed but fetchers call the API directly). Server-side only (CORS). `BRL=X`, `EURBRL=X`, `DX-Y.NYB`, `CL=F`, `BZ=F`, `GC=F`, `TIO=F`, `ZS=F`, `HG=F`, `^GSPC`, `^BVSP`, `^VIX`, etc.
- **News RSS**: Bloomberg `feeds.bloomberg.com/markets/news.rss` works; Reuters only via Google News RSS proxy (direct Reuters RSS dead since 2020; FT/Valor blocked).
- **NTN-B**: no free public API (ANBIMA requires scraping) — manual entry only.

## Deploy & Cron (current state)

Currently deployed on **Vercel** (Next app + API routes) with **Neon Postgres** for the paper book and auth; `DEPLOY.md` has the full setup. Because serverless functions can't run a loop, a **Cloudflare Worker** (`deploy/cloudflare-worker/`) provides the periodic tick: every minute (`crons = ["* * * * *"]`) it calls `GET /api/market` and `POST /api/sim {action:'tick'}` with `Authorization: Bearer ${CRON_SECRET}`, and optionally fires a daily `POST /retrain` on `news-nlp` (gated by `RETRAIN_HOUR_UTC`, default 06:00 UTC). The two Python services (`services/model-engine`, `services/news-nlp`) deploy separately and are wired in through `ATLAS_BACKEND_URL`/`NEWS_NLP_URL`. (A planned migration to a self-hosted Docker Compose stack with an internal scheduler is tracked in `documents/core/Projeto.md` — not yet in place.)

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
