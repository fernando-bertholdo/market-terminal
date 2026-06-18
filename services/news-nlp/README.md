# news-nlp — open-weights sentiment service (Phase 1)

Stateless micro-service that turns a headline into the terminal's
`NewsClassification` vocabulary using **open classifier weights only** — no LLM,
no paid API, no manual labelling. It is the runtime chosen after the viability
gate reproved embedding ONNX in the Cloudflare Worker (see
`docs/news-sentiment-ml-plan.md` §3).

## Pipeline

```
title ─► [lang detect] ─► [MT PT→EN, opus-mt]        (FinBERT/ABSA path)
      ├─► FinBERT            tone (pos/neg/neutral)
      ├─► zero-shot NLI      signed theme/event (on the ORIGINAL text; the model
      │                      is multilingual, so PT keeps its nuance)
      └─► ABSA               per-asset sentiment for 1–3 detected aspects
                 │
                 ▼   mapping.py → signed factors + ABSA assets
   { themes, factors[], assets[], relevance, confidence }
```

The factor→asset **economic graph stays on the TS side** (`src/lib/news/graph.ts`)
so Phase 2's correlation calibration has a single seam. This service returns
signed *factors* and ABSA *assets*; TS does graph propagation + merge.

**No-lookahead:** the service only ever receives the headline title. `publishedAt`
is echoed for convenience and never used; no price is sent or read.

## Run locally

```bash
cd services/news-nlp
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 8000
# first request lazily downloads weights (~1–1.5 GB total, cached in HF_HOME)

curl -s localhost:8000/classify -H 'content-type: application/json' -d '{
  "items": [
    {"id":"a","title":"Fed signals it will hold rates higher for longer"},
    {"id":"b","title":"Cessar-fogo no Oriente Médio derruba petróleo"}
  ]
}' | jq
```

## Wire into the terminal

Set on the **Next.js / Vercel** side (server-only env):

```
NEWS_ML_ENABLED=true
NEWS_NLP_URL=https://<your-service-host>
NEWS_NLP_TOKEN=<same as service NEWS_NLP_TOKEN, optional>
NEWS_NLP_TIMEOUT_MS=8000
```

With `NEWS_ML_ENABLED` unset/false the terminal uses the regex classifier
unchanged. On any timeout/error the TS client falls back to regex **per item**,
so enabling this can never take `/api/news` down.

## Deploy (zero-cost targets)

Honour the §0 cost-zero invariant with an **on-demand / scale-to-zero** host:

- **Hugging Face Spaces (Docker, CPU basic, free):** push this folder; Spaces
  builds the `Dockerfile`. Sleeps when idle. Set secrets in the Space settings.
- **Fly.io (`fly launch`, shared-cpu-1, scale to 0):** `min_machines_running = 0`
  so it costs nothing idle; cold start wakes it on the first `/classify`.
- **Render free web service:** same idea (spins down when idle).

Cold start is masked by the TS per-headline cache and the every-minute tick
keeping it warm during market hours. To eliminate cold-start downloads, uncomment
the `WARMUP` bake line in the `Dockerfile` (larger image, models pre-pulled).

## Config

See `.env.example`. All model ids are swappable — e.g. drop in
`facebook/bart-large-mnli` for NLI, or a multilingual ABSA model — without code
changes. `NLI_THRESHOLD` controls how decisive a signal must be to count.
