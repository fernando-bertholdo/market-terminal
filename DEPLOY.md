# Self-Hosted Deploy (Windows + Docker + Tailscale)

This replaces the previous Vercel + Cloudflare Worker setup. The whole stack runs
on a single always-on Windows desktop and is reachable from any browser via a
stable Tailscale Funnel URL — no open ports, no fixed IP.

## Architecture

- **Docker Compose** on Windows runs four services: `web` (Next.js standalone, port 3000),
  `model-engine` (FastAPI, 8010), `news-nlp` (FastAPI, 8000) and `scheduler`
  (internal tick — replaces the Cloudflare Worker).
- **Neon Postgres** (managed, free tier) — persistence for the paper book and auth.
- **Tailscale Funnel** — public HTTPS URL (`https://<host>.<tailnet>.ts.net`).
- The browser only reads live state; the `scheduler` drives execution headless.

## Prerequisites (Windows)

- **Docker Desktop** — install and enable *Settings → General → Start Docker Desktop when you log in*.
- **Tailscale** — https://tailscale.com/download/windows
- **git**

## 1. Clone

```powershell
git clone https://github.com/fernando-bertholdo/market-terminal.git
cd market-terminal
git checkout ciclo-1-fundacao   # until merged to main
```

## 2. Neon Postgres

1. Create a free Neon project (your own account).
2. Copy the **pooled** connection string (`postgresql://...`).

The schema is created automatically on first run (`auth_credentials`,
`auth_sessions`, `sim_state`). The book starts empty.

## 3. Environment (`.env`)

Create `.env` in the repo root (gitignored). Internal service URLs are injected by
Compose, so the `.env` only needs the core secrets:

```env
DATABASE_URL=postgresql://...        # your Neon pooled string
FRED_API_KEY=...                     # free key: fredaccount.stlouisfed.org/apikeys
APP_USERNAME=your-username           # first sign-in bootstraps this admin credential
APP_PASSWORD=a-long-random-password
CRON_SECRET=a-different-long-random-secret   # authenticates the internal scheduler
# Optional: RETRAIN_HOUR_UTC=6  and any provider keys (TIINGO_API_KEY, etc.)
```

## 4. Build & run

```powershell
docker compose up -d --build
docker compose ps
```

Expected: `web`, `model-engine`, `news-nlp`, `scheduler` all `running`.

## 5. Smoke checks

The auth middleware lets `/api/market` and `/api/sim` through with the cron token
(every other route needs the session cookie). From the host:

```powershell
# Contract (BFF -> Python model-engine):
curl.exe -s -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/market

# Persistence is Postgres (not the file fallback):
curl.exe -s -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/sim

# news-nlp reachable inside the compose network:
docker compose exec web node -e "fetch('http://news-nlp:8000/').then(r=>console.log('news-nlp',r.status))"
```

Look for real market fields, `"persistence":"postgres"`, and a news-nlp HTTP status.
Wait ~2 minutes and re-read `/api/sim`: `asOf` should advance with no browser open
(the scheduler is ticking).

## 6. Public URL — Tailscale Funnel

```powershell
tailscale funnel 3000
```

This serves `https://<host>.<tailnet>.ts.net` → `localhost:3000`, reachable from any
browser with no client install. The app's own login still gates access.

## 7. Uptime

- Docker Desktop set to start on login (prerequisites) + `restart: unless-stopped`
  on every service (already in `docker-compose.yml`).
- Tailscale runs as a service and reconnects on boot.

## 8. Reboot test (baseline stability)

Since the old Vercel environment is offline, there is no parallel run to compare
against; instead validate that the new environment is self-healing. Reboot Windows
and, with no manual action, confirm:

```powershell
docker compose ps                                   # services back up
curl.exe -s -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/sim
```

Services `running`, `"persistence":"postgres"`, the `*.ts.net` URL responds, and the
tick resumes (`asOf` advances).

## 9. Cutover

Once the smokes and the reboot test pass, the Cloudflare Worker is no longer needed —
the internal `scheduler` owns the tick. `deploy/cloudflare-worker/` stays in the repo
for reference but is not deployed.

## Operational notes

- Local dev without `DATABASE_URL` still falls back to `data/sim-state.json` and
  `/api/sim` reports `"persistence":"file"`.
- Neon free tier backs up automatically; a future move to a local Postgres (D8 in
  the design spec) will need a scheduled `pg_dump`.
- Yahoo and RSS are unofficial/free sources and can be delayed or rate-limited.
- Future upgrade: a custom domain via Cloudflare Tunnel can replace the `*.ts.net`
  URL without touching the application.
