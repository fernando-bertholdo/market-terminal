# Deprecated — replaced by the internal scheduler

This Cloudflare Worker drove the periodic tick while the app ran on Vercel
(serverless can't run a continuous loop). The self-hosted setup replaces it with
the `scheduler` service in `docker-compose.yml` (`scripts/scheduler.mjs`), which
hits the same endpoints (`GET /api/market`, `POST /api/sim {action:'tick'}`) with
the same `Bearer CRON_SECRET`.

Kept for reference; not deployed. See `DEPLOY.md`.
