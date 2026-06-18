"""Assemble the bootstrap training table (plan §4 / §8).

Pipeline (offline):
  news jsonl (gdelt + fnspid)  ─┐
                                ├─►  label per (headline, asset, window)  ─►  splits
  Yahoo intraday (~60d) + daily ┘

Inputs are JSONL files produced by gdelt.py / fnspid.py. Prices are fetched live
from Yahoo (stdlib). Output is a JSONL of labeled rows plus a manifest.

    python build_dataset.py --news gdelt.jsonl fnspid.jsonl --out dataset.jsonl

No-lookahead is enforced in labels.py (entry price is at/after publish) and
splits.py (temporal split).
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Dict, List

import labels
import splits
import yahoo
from calibrate_graph import ASSET_SYMBOL  # reuse the asset->symbol map

WINDOWS = [15, 30, 60]  # §8 fine windows (minutes); primary = 15


def load_news(paths: List[str]) -> List[Dict]:
    out: List[Dict] = []
    for path in paths:
        if not os.path.exists(path):
            print(f"[build] missing {path}, skipping")
            continue
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    out.append(json.loads(line))
    print(f"[build] loaded {len(out)} news records")
    return out


def fetch_prices():
    symbols = [s for s in ASSET_SYMBOL.values() if s]
    intraday: Dict[str, List] = {}
    daily: Dict[str, List] = {}
    by_symbol = {sym: asset for asset, sym in ASSET_SYMBOL.items() if sym}
    for sym in symbols:
        asset = by_symbol[sym]
        intraday[asset] = yahoo.intraday_bars(sym, "60d", "15m")
        daily[asset] = yahoo.daily_closes(sym, "5y")
        print(f"[build] {asset:7s} intraday={len(intraday[asset])} daily={len(daily[asset])}")
    return intraday, daily


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--news", nargs="+", required=True, help="JSONL files from gdelt.py/fnspid.py")
    ap.add_argument("--out", default="dataset.jsonl")
    args = ap.parse_args()

    news = load_news(args.news)
    if not news:
        print("[build] no news; run gdelt.py / fnspid.py first")
        return

    intraday, daily = fetch_prices()
    rows = labels.build_label_rows(news, intraday, daily, WINDOWS)
    print(f"[build] {len(rows)} labeled (headline,asset,window) rows")

    train, val, test = splits.temporal_split(rows)
    with open(args.out, "w", encoding="utf-8") as f:
        for split_name, split_rows in (("train", train), ("val", val), ("test", test)):
            for r in split_rows:
                f.write(json.dumps({**r, "split": split_name}) + "\n")

    manifest = {
        "rows": len(rows),
        "train": len(train), "val": len(val), "test": len(test),
        "windows": WINDOWS,
        "assets": [a for a, s in ASSET_SYMBOL.items() if s],
    }
    with open(args.out + ".manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[build] wrote {args.out} (train={len(train)} val={len(val)} test={len(test)})")


if __name__ == "__main__":
    main()
