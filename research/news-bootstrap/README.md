# news-bootstrap — Phase 2 (dataset bootstrap + calibrated graph)

Offline build tooling for the news-sentiment model. Nothing here runs in
production: it produces (a) a **price-calibrated economic graph** consumed by the
live app and (b) a **labeled news↔price dataset** that Phase 3 trains the head on.
See `docs/news-sentiment-ml-plan.md` §4 / §7 / §8.

## What runs with zero setup (stdlib only)

```bash
# A3 — calibrate the factor->asset graph from Yahoo daily co-movement.
#      Writes src/lib/news/calibratedGraph.json (sign-preserving; magnitude=|corr|).
python research/news-bootstrap/calibrate_graph.py --range 2y

# Prove the §8 labeling mechanics on real Yahoo intraday (no news creds needed).
python research/news-bootstrap/demo_label.py
```

`calibrate_graph.py` keeps the prior's **edge set** (economic structure) and
re-grounds each weight in `sign(prior)·|corr(asset_returns, factor_proxy_returns)|`.
Sign-preserving on purpose — see the two traps documented in the script header
(BRL=X is USD/BRL; sector-ETF proxies carry market beta). Signs are free to flip
in Phase 3's price-trained head; the graph is only the prior.

To activate the calibrated weights in the app set `NEWS_GRAPH_CALIBRATED=true`
(default off → static prior). It overrides existing edges only, never invents new
ones.

## What needs credentials / large downloads (offline, your box)

```bash
pip install -r research/news-bootstrap/requirements.txt

# 1. Timestamped news (plan §4.1)
python research/news-bootstrap/gdelt.py  --start 2024-01-01 --end 2024-12-31 --out gdelt.jsonl
python research/news-bootstrap/fnspid.py --start 2018-01-01 --limit 200000     --out fnspid.jsonl

# 2. Pair news<->price, build §8 labels, temporal splits
python research/news-bootstrap/build_dataset.py --news gdelt.jsonl fnspid.jsonl --out dataset.jsonl
```

- **GDELT** needs Google Cloud creds + a billing project (`GCP_PROJECT`); the
  query stays inside the BigQuery free 1 TB/month tier if you filter themes/dates.
- **FNSPID** streams from HuggingFace (`pip install datasets`), no key.
- Prices come from Yahoo (stdlib): intraday ~60d (fine 15/30/60m labels) + daily
  5y (coarse next-close labels, for thin/PT assets).

## Files

| File | Role | Runs now? |
|---|---|---|
| `yahoo.py` | stdlib Yahoo chart client (daily + intraday) | ✅ |
| `calibrate_graph.py` | A3: price-calibrated factor→asset graph → JSON | ✅ |
| `labels.py` | §8 forward-return labels (no-lookahead entry) | ✅ |
| `splits.py` | temporal train/val/test (no shuffle) | ✅ |
| `demo_label.py` | runnable labeling proof on Yahoo intraday | ✅ |
| `gdelt.py` | GDELT via BigQuery free tier | needs GCP creds |
| `fnspid.py` | FNSPID via HuggingFace streaming | needs `datasets` |
| `build_dataset.py` | orchestrate news+price → labeled dataset | needs news jsonl |

## No-lookahead invariants

- Label entry price is the first bar **at or after** the publish timestamp
  (`labels.py`) — never a pre-news bar.
- Splits are **temporal, never shuffled** (`splits.py`): validation headlines are
  always strictly newer than training ones.
- The graph calibration is purely historical; the live app only loads the emitted
  weights, never future prices.
