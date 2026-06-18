# ATLAS Python Backend

Python service for market data, macro data, news intelligence/sentiment,
earnings controls and quant signals.

The Next.js app remains the UI shell and a thin BFF. Data/model responsibilities
live here first, with TypeScript fallbacks kept for free-feed resilience.

## Run Locally

```bash
cd services/model-engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8010
```

Then set the Next.js app:

```bash
ATLAS_BACKEND_URL=http://127.0.0.1:8010
ATLAS_BACKEND_TOKEN=
```

Endpoints:

- `GET /market`: Yahoo/BCB/FRED market-data feeders, with optional PTAX/B3.
- `GET /market/terminal`: terminal-shaped market payload, B3 futures, curves and fixed-income risk.
- `GET /history`: Yahoo daily closes.
- `GET /macro`: FRED/BCB/Focus macro dashboard data.
- `GET /news`: RSS aggregation, deterministic classification and sentiment graph.
- `GET /earnings`: NASDAQ earnings-window risk controls for thematic equities.
- `POST /signals`: macro strategy signal engine.
