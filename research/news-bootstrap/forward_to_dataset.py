"""Forward-collection retrain bridge (Phase 4, A1b).

Reads the forward store written by src/lib/news/forwardCollector.ts (newly-seen
headlines with publish timestamps), labels each against Yahoo intraday over the §8
window, and emits head training rows — the same format make_training_data.py
produces. Feed the output straight into train_head.py for a periodic refresh.

The intraday window is ~60 days, so run this on a schedule (e.g. weekly cron) to
catch reactions while they are still labelable, then retrain:

    python forward_to_dataset.py --store ../../data/news-forward.jsonl --out head_forward.jsonl
    python train_head.py --data head_forward.jsonl

For the cloud (Neon) store, export the table to JSONL first:
    psql "$DATABASE_URL" -c "\\copy (SELECT id, title, source,
      extract(epoch FROM published_at)::bigint AS ts FROM news_forward)
      TO STDOUT csv" > ...   # or any jsonl export; fields needed: id, ts, title
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

import make_training_data

WINDOWS = [15, 30, 60]


def _to_unix(value) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(str(value), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp())
        except ValueError:
            continue
    return None


def load_store(path: str) -> List[Dict]:
    news: List[Dict] = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            ts = _to_unix(rec.get("ts") or rec.get("published_at"))
            title = rec.get("title")
            rid = rec.get("id")
            if ts is None or not title or not rid:
                continue
            news.append({"id": rid, "ts": ts, "title": title})
    return news


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--store", default=os.path.join(
        os.path.dirname(__file__), "..", "..", "data", "news-forward.jsonl"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "head_forward.jsonl"))
    args = ap.parse_args()

    if not os.path.exists(args.store):
        raise SystemExit(f"forward store not found: {args.store} "
                         "(set NEWS_FORWARD_ENABLED=true and let /api/news run first)")

    news = load_store(args.store)
    print(f"[forward] {len(news)} headlines from store")
    rows = make_training_data.gen_lite_from_news(news, WINDOWS)
    with open(args.out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"[forward] {len(rows)} labeled rows -> {args.out}  (now: python train_head.py --data {args.out})")


if __name__ == "__main__":
    main()
