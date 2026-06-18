# ATLAS Python Backend

Python service for market data, news intelligence/sentiment and quant signals.

The Next.js app remains the UI shell and a thin BFF while backend responsibilities
move here incrementally.

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

- `GET /market`: Yahoo/BCB/FRED market-data feeders.
- `GET /news`: RSS aggregation, deterministic classification and sentiment graph.
- `POST /signals`: macro strategy signal engine.
