# Self-Hosted Deploy (Windows desktop + WSL2 + Docker + Tailscale)

This replaces the previous Vercel + Cloudflare Worker setup. The whole stack runs
on a single always-on Windows desktop and is reachable from any browser via a
stable Tailscale Funnel URL — no open ports, no fixed IP, no client install.

## Architecture

- **Docker Compose** (inside WSL2) runs four services: `web` (Next.js standalone,
  port 3000), `model-engine` (FastAPI, 8010), `news-nlp` (FastAPI, 8000) and
  `scheduler` (internal tick — replaces the Cloudflare Worker).
- **Neon Postgres** (managed, free tier) — paper book + auth.
- **Tailscale Funnel on the Windows host** — public HTTPS URL
  `https://<node>.<tailnet>.ts.net` → Windows `localhost:3000` (which WSL2 forwards
  to the `web` container).
- The browser only reads live state; the `scheduler` drives execution headless.

**Why WSL2 for Docker but Tailscale on the Windows host:**
- Linux containers need a Linux kernel → WSL2 (Docker Desktop uses the same backend
  under the hood; we install Docker Engine directly in WSL2 to avoid Docker
  Desktop's credential helper, which fails over a headless SSH session).
- The Tailscale **Funnel runs on the Windows host**, not in WSL2. A WSL2 Tailscale
  node serves the public ingress path fine, but the **direct MagicDNS path** (used
  by your own Tailscale devices) times out through WSL2's NAT — ping/UDP passes, the
  TLS handshake's larger packets get black-holed on the NAT return path. Native
  Windows Tailscale has no such issue, so **both** public and direct access work.

Nothing else is installed natively — no Node.js, no Python. Each container carries
its own runtime (the `model-engine`/`news-nlp` images are `FROM python:3.11-slim`).

## Prerequisites (Windows)

- **WSL2** with a systemd-enabled Ubuntu (`/etc/wsl.conf` → `[boot] systemd=true`).
  Keep the distro on the large drive (e.g. `D:`).
- **Docker Engine inside WSL2** (native `apt` install; `docker.service` enabled so
  systemd starts it on distro boot). **Not** Docker Desktop.
- **Tailscale for Windows** (native app), signed in, with HTTPS certs enabled for
  the tailnet (admin console → DNS → *Enable HTTPS Certificates*) and Funnel allowed
  for the node.
- **git** (or GitHub Desktop) to clone the repo.

Heavy artifacts (the WSL distro, Docker's data-root, built images) live on `D:`.

## 1. Clone

The repo lives at e.g. `G:\tech_projects\market-terminal` (reachable from WSL as
`/mnt/g/tech_projects/market-terminal`).

```bash
git clone https://github.com/fernando-bertholdo/market-terminal.git
cd market-terminal
# main already carries the self-hosted foundation (Ciclo 1)
```

## 2. Neon Postgres

Create a free Neon project (your own account) and copy the **pooled** connection
string. The schema (`auth_credentials`, `auth_sessions`, `sim_state`) is created
automatically on first run; the paper book starts empty.

## 3. Environment (`.env`)

Create `.env` in the repo root (gitignored). Compose injects the internal service
URLs, so `.env` only needs the core secrets:

```env
DATABASE_URL=postgresql://...        # your Neon pooled string
FRED_API_KEY=...                     # free key: fredaccount.stlouisfed.org/apikeys
APP_USERNAME=your-username           # first sign-in bootstraps this admin credential
APP_PASSWORD=a-long-random-password
CRON_SECRET=a-different-long-random-secret   # authenticates the internal scheduler
# Optional: RETRAIN_HOUR_UTC=6  and any provider keys (TIINGO_API_KEY, etc.)
```

## 4. Build & run (inside WSL2)

```bash
cd /mnt/g/tech_projects/market-terminal
docker compose up -d --build
docker compose ps
```

Expected: `web`, `model-engine`, `news-nlp`, `scheduler` all **Up** (not
"Restarting"). A `model-engine` stuck in a restart loop usually means a source file
is missing from its image — check `docker compose logs model-engine` (the image's
`COPY` must list every module `app.py` imports, e.g. `earnings.py`).

Note: the `web` service sets `HOSTNAME=0.0.0.0` in compose. The Next standalone
server binds to `$HOSTNAME`; inside a container that env otherwise resolves to the
container id, so the server would listen on an internal hostname and refuse external
connections (the scheduler and Funnel would hit *connection refused*).

## 5. Smoke checks

The auth middleware lets `/api/market` and `/api/sim` through with the cron token
(every other route needs the session cookie). From inside WSL2:

```bash
# Contract actually goes through the Python model-engine (not the TS fallback):
docker compose exec -T web node -e \
  "fetch('http://model-engine:8010/health').then(r=>r.text()).then(console.log)"
# -> {"status":"ok","backend":"python","capabilities":[...]}

# Persistence is Postgres (not the file fallback):
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim \
  | grep -o '"persistence":"[a-z]*"'
# -> "persistence":"postgres"
```

Wait ~2 minutes and re-read `/api/sim`: `asOf` should advance with no browser open
(the scheduler is ticking).

**Important:** the Next app **silently falls back to TypeScript fetchers** when
`model-engine` is down (unless `ATLAS_BACKEND_REQUIRED=true`). The UI looks identical
either way, so a green dashboard does **not** prove the Python engine is serving —
always confirm `model-engine` health explicitly (`docker compose ps` + the `/health`
check above).

## 6. Public URL — Tailscale Funnel (on the Windows host)

From a Windows terminal (PowerShell/cmd), using the **native** Tailscale:

```powershell
tailscale funnel --bg 3000
tailscale funnel status        # -> https://<node>.<tailnet>.ts.net (Funnel on)
```

This serves `https://<node>.<tailnet>.ts.net` → Windows `localhost:3000` →
(WSL2 localhost forwarding) → the `web` container. Reachable from any browser with
no client install; the app's own login still gates access.

### Naming: the URL *is* the node name

Tailscale collapses machine name, MagicDNS name and Funnel URL into a single field —
editing one edits all three. Funnel supports neither custom domains nor Tailscale
Services (`tailscale funnel` has no `--service` flag; Services are tailnet-internal
only), so there is no way to decouple them from inside Tailscale.

Consequence: **name the host after what it is, not after the workload it runs.** This
host is `homelab` (serving `https://homelab.<tailnet>.ts.net`) because it is a
personal machine that happens to run this app among other things. Naming it after one
project makes the machine's identity false the moment it hosts a second one, and puts
that project's name on every device list where the machine appears.

To rename, **clear the Funnel first** — the serve config is keyed by the full DNS
name, so renaming with Funnel on strands a config bound to a name that no longer
exists (tailscale/tailscale#7086):

```powershell
tailscale funnel reset                       # clear config bound to the OLD name
tailscale set --hostname=<new-name>          # persists in client prefs; survives reboot
tailscale cert <new-name>.<tailnet>.ts.net   # force cert provisioning
tailscale funnel --bg --yes 3000             # re-arm on the new name
```

Verify with `tailscale serve status --json`: the only key should be the new name. Note
`tailscale cert` writes the cert and private key into the current directory as a side
effect — run it from a temp dir and delete both files afterwards; the daemon keeps its
own copy in its cert store.

The first HTTPS request to a new name provisions the cert (a cold first hit may be
slow or fail; retry). If a device reached the app under a **previous** node name,
flush its DNS after the rename — otherwise it keeps the stale IP cached
(macOS: `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`).

Renaming changes the origin, so the `atlas_session` cookie does not carry over —
every user signs in once more. Nothing else moves: the tailnet IP is stable across a
rename (SSH keeps working), and the containers only ever talk over the internal Docker
network (`TERMINAL_URL: http://web:3000`).

## 7. Uptime

- **WSL2 auto-recovery**: `[boot] systemd=true` + `docker.service` enabled +
  `restart: unless-stopped` on every service → once the distro is running, Docker
  and the containers come back on their own.
- **Keep the WSL distro warm**: WSL2 freezes an idle distro, which would drop the
  app. A Task Scheduler task (`WSL-KeepAlive-MT`) runs an **active** loop inside the
  distro (`curl localhost:3000` every 5s). A passive process (`tail -f /dev/null`)
  is not enough — the freeze is only prevented by real activity.
- **Tailscale** runs as a Windows service and reconnects on boot; the Funnel config
  persists.

**Headless-boot caveat:** the WSL **distro** is launched by the keep-alive task,
which is currently `/sc onlogon` (fires when you log in). If the machine reboots and
sits at the lock screen with nobody logging in, the distro — and the app — won't
start until someone logs in. For true no-login 24/7, either enable Windows
auto-login or run the task at boot under your account
(`schtasks /create /sc onstart /ru <user> /rp <password> ...`). Both store or imply
the login — a security tradeoff to decide per machine.

## 8. Reboot test (baseline stability)

Since the old Vercel environment is offline, there is no parallel run to compare
against; instead validate that the new environment self-heals. Reboot Windows, log
in (see the headless caveat above), and with no further action confirm:

```bash
docker compose ps        # all services Up
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sim \
  | grep -o '"persistence":"[a-z]*"'
```

Services `Up`, `"persistence":"postgres"`, the `*.ts.net` URL responds, and the tick
resumes (`asOf` advances).

## Operational notes

- Local dev without `DATABASE_URL` still falls back to `data/sim-state.json` and
  `/api/sim` reports `"persistence":"file"`.
- Neon free tier backs up automatically; a future move to a local Postgres (D8 in
  the design spec) will need a scheduled `pg_dump`.
- Yahoo and RSS are unofficial/free sources and can be delayed or rate-limited.
- Future upgrade: a custom domain via Cloudflare Tunnel can replace the `*.ts.net`
  URL without touching the application.
