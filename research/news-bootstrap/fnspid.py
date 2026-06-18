"""FNSPID ingest (plan §4.1).

FNSPID: ~15.7M financial news records (1999-2023) already time-stamped and
aligned to S&P 500 tickers — a strong, ready-made bootstrap for US assets.
HuggingFace: `Zihan1004/FNSPID` (also mirrored on GitHub).

OFFLINE build step. Requires `pip install datasets`. Streamed so it does not
need the full ~20 GB on disk at once.

    python fnspid.py --start 2018-01-01 --limit 200000 --out fnspid.jsonl
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from typing import Iterable, Optional


def _to_unix(value: str) -> Optional[int]:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d %H:%M:%S"):
        try:
            return int(datetime.strptime(value, fmt).replace(tzinfo=timezone.utc).timestamp())
        except (ValueError, TypeError):
            continue
    return None


def fetch(start: str, limit: int) -> Iterable[dict]:
    from datasets import load_dataset  # local import: optional heavy dep

    start_ts = _to_unix(start) or 0
    ds = load_dataset("Zihan1004/FNSPID", split="train", streaming=True)
    n = 0
    for row in ds:
        # Column names vary across mirrors; probe the common ones.
        title = row.get("Article_title") or row.get("title") or row.get("Headline")
        date = row.get("Date") or row.get("date") or row.get("published")
        symbol = row.get("Stock_symbol") or row.get("symbol") or row.get("ticker")
        if not title or not date:
            continue
        ts = _to_unix(str(date))
        if ts is None or ts < start_ts:
            continue
        yield {
            "id": f"fnspid:{abs(hash((title, date))) & 0xffffffff:x}",
            "ts": ts,
            "title": str(title),
            "symbol": symbol,
            "source": "fnspid",
        }
        n += 1
        if n >= limit:
            break


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--limit", type=int, default=200000)
    ap.add_argument("--out", default="fnspid.jsonl")
    args = ap.parse_args()

    n = 0
    with open(args.out, "w", encoding="utf-8") as f:
        for rec in fetch(args.start, args.limit):
            f.write(json.dumps(rec) + "\n")
            n += 1
    print(f"[fnspid] wrote {n} records -> {args.out}")


if __name__ == "__main__":
    main()
