"""GDELT ingest via BigQuery free tier (plan §4.1).

GDELT GKG/Events carry article URL + 15-minute timestamp + tone + themes +
entities since 2015 — the timestamped-news half the bootstrap was missing.

Requires Google Cloud credentials with a billing project (the query stays inside
the BigQuery free 1 TB/month tier if you filter aggressively). This is an OFFLINE
build step (`python gdelt.py --start 2024-01-01 --out gdelt.jsonl`), not runtime.

Setup:
    pip install google-cloud-bigquery
    gcloud auth application-default login   # or set GOOGLE_APPLICATION_CREDENTIALS
    export GCP_PROJECT=your-billing-project
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Iterable

# Keep the scan small: only finance/markets themes, English + Portuguese, and
# only the columns we need. Tune the theme filter to your universe.
QUERY_TEMPLATE = """
SELECT
  DocumentIdentifier AS url,
  PARSE_TIMESTAMP('%Y%m%d%H%M%S', CAST(DATE AS STRING)) AS published_at,
  V2Tone,
  V2Themes,
  V2Locations
FROM `gdelt-bq.gdeltv2.gkg_partitioned`
WHERE _PARTITIONTIME BETWEEN TIMESTAMP('{start}') AND TIMESTAMP('{end}')
  AND (
    REGEXP_CONTAINS(V2Themes, r'(ECON_|MONETARY|INFLATION|CENTRALBANK|FUEL|COMMODITY)')
  )
  AND (V2DocumentLanguage IN ('eng','por') OR V2DocumentLanguage IS NULL)
LIMIT {limit}
"""


def fetch(start: str, end: str, limit: int) -> Iterable[dict]:
    from google.cloud import bigquery  # local import: optional heavy dep

    client = bigquery.Client(project=os.getenv("GCP_PROJECT"))
    query = QUERY_TEMPLATE.format(start=start, end=end, limit=limit)
    print(f"[gdelt] running BigQuery ({start}..{end}, limit={limit})")
    for row in client.query(query).result():
        tone = None
        if row["V2Tone"]:
            try:
                tone = float(str(row["V2Tone"]).split(",")[0])
            except (ValueError, IndexError):
                tone = None
        yield {
            "id": f"gdelt:{abs(hash(row['url'])) & 0xffffffff:x}",
            "url": row["url"],
            "ts": int(row["published_at"].timestamp()),
            "title": row["url"],  # GKG has no clean title; URL slug is the proxy
            "tone": tone,
            "themes": row["V2Themes"],
            "source": "gdelt",
        }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", required=True, help="YYYY-MM-DD")
    ap.add_argument("--end", required=True, help="YYYY-MM-DD")
    ap.add_argument("--limit", type=int, default=50000)
    ap.add_argument("--out", default="gdelt.jsonl")
    args = ap.parse_args()

    n = 0
    with open(args.out, "w", encoding="utf-8") as f:
        for rec in fetch(args.start, args.end, args.limit):
            f.write(json.dumps(rec) + "\n")
            n += 1
    print(f"[gdelt] wrote {n} records -> {args.out}")


if __name__ == "__main__":
    main()
