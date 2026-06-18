# ATLAS Cloud Deploy

This setup keeps the terminal available from phone, home, and work while the
paper book continues ticking without an open browser.

## Architecture

- Vercel Hobby: Next.js application and API routes
- Neon Free: persistent simulator state
- Cloudflare Workers Free: authenticated tick every minute
- HTTP Basic authentication: private access to the terminal

## 1. Create Neon

1. Create a free Neon project.
2. Copy the pooled Postgres connection string.
3. In PowerShell, migrate the existing local paper book:

```powershell
$env:DATABASE_URL="postgresql://..."
npm run db:migrate-state
```

Do not use `--force` after the cloud simulator has started trading.

## 2. Deploy to Vercel

Import this repository into Vercel and configure:

```text
DATABASE_URL=postgresql://...
FRED_API_KEY=...
APP_USERNAME=your-private-username
APP_PASSWORD=a-long-random-password
CRON_SECRET=a-different-long-random-secret
MODEL_ENGINE_URL=https://your-model-engine.example.com
MODEL_ENGINE_TOKEN=optional-shared-bearer-token
MODEL_ENGINE_REQUIRED=false
```

All variables are server-side. None should use the `NEXT_PUBLIC_` prefix.

### Python Model Engine

The quant signal engine lives in `services/model-engine` and exposes
`POST /signals`. Next.js remains the app/API shell and paper-book executor.

Local run:

```powershell
cd services/model-engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8010
```

Then set `MODEL_ENGINE_URL=http://127.0.0.1:8010` for the Next.js app. In
production, deploy this service separately and set `MODEL_ENGINE_URL` in Vercel.
Keep `MODEL_ENGINE_REQUIRED=false` until the Python service is stable; switch it
to `true` once simulator ticks should fail closed instead of falling back to the
legacy TypeScript strategy.

After deployment, open the Vercel URL and confirm:

- the browser asks for username and password;
- `/api/sim` reports `"persistence": "postgres"`;
- existing positions and trades match the local book.

## 3. Deploy the Cloudflare tick worker

```powershell
cd deploy/cloudflare-worker
npm install
npx wrangler login
```

Replace `TERMINAL_URL` in `wrangler.toml` with the Vercel production URL, then:

```powershell
npx wrangler secret put CRON_SECRET
npm run deploy
```

Enter the same `CRON_SECRET` configured in Vercel. The worker calls
`POST /api/sim` with `{ "action": "tick" }` every minute. Its token is rejected
for reset and forced rebalance operations.

### Optional: continuous news-head retraining

If the news ML pipeline is deployed (see `docs/news-sentiment-ml-plan.md`), set on
the worker so it fires a daily `POST /retrain` on the news-nlp service:

```powershell
npx wrangler secret put NEWS_NLP_TOKEN   # if the service is token-protected
# in wrangler.toml [vars]: NEWS_NLP_URL = "https://<news-nlp-host>"
#                          RETRAIN_HOUR_UTC = "6"   # optional, default 06:00 UTC
```

The service retrains the per-asset head on the Neon forward store and writes
`head_weights`; the app loads it at runtime. Leave `NEWS_NLP_URL` unset to disable.

## 4. Verification

Wait two minutes and check the Quant page:

- live `asOf` advances without leaving a browser open;
- intraday equity gains new marks;
- the persisted trade history remains after a new Vercel deployment;
- fresh Yahoo quotes are required before any fill.

## Operational Notes

- The browser only reads live state. It does not drive execution.
- Local development still uses `data/sim-state.json` when `DATABASE_URL` is absent.
- Neon writes use optimistic version checks to prevent silent concurrent updates.
- Basic authentication protects pages and APIs. HTTPS is supplied by Vercel.
- Yahoo and RSS are unofficial/free sources and can still be delayed or rate-limited.
