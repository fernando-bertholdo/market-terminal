# ATLAS Market Data

## Runtime

The market layer preserves raw provider observations, builds a confidence-
weighted quote per economic instrument and stores one-minute snapshots in
Neon. The Cloudflare cron refreshes both `/api/market` and `/api/sim`.

Configured free-tier providers are enabled only when their environment keys
exist. AwesomeAPI can run in public mode without a key.

## Quality states

- `LIVE` and `DELAYED`: direct observations that may be execution-eligible.
- `INDICATIVE`: useful for analysis, never sufficient for simulated fills.
- `INTERPOLATED`: curve analytics only.
- `STALE`, `DIVERGENT`, `UNAVAILABLE`: rejected for execution.

Execution additionally requires the confidence threshold and at least one
direct observation.

## Brazil fixed income

- `DI1`: DU/252, first business day maturity.
- `DDI`: ACT/360, first business day maturity.
- `DAP`: DU/252, business-day-adjusted day 15 maturity.
- Constant-maturity vertices use log-linear discount-factor interpolation.

The B3 public quotation endpoint has no timestamp or SLA. Its snapshots are
therefore marked indicative even when recently received. Official B3/ANBIMA
closing files should be treated as separate end-of-day reference providers.

## Persistence tables

- `market_observation_latest`: latest observation by provider and instrument.
- `market_snapshot`: consolidated one-minute buckets.
- `market_provider_health`: latest provider health.

These tables are intentionally separate from `sim_state`, whose optimistic
versioning protects the paper book.
