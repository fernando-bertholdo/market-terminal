# ATLAS Model Engine

Python service for quant signals and model logic.

The Next.js app remains the UI/API shell and paper-book executor. This service owns
the strategy/model computation so research and production logic can move into the
Python stack incrementally.

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
MODEL_ENGINE_URL=http://127.0.0.1:8010
MODEL_ENGINE_TOKEN=
```

`POST /signals` receives close histories, strategy params and news intelligence,
and returns the same signal shape the TypeScript simulator expects.
