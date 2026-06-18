"""Runnable, zero-credential proof of the §8 labeling mechanics.

GDELT/FNSPID need credentials/large downloads, but the LABELING itself can be
demonstrated now: fetch real Yahoo intraday bars, synthesize a few "headlines" at
real bar timestamps, and label the forward 15/30/60-minute reaction. This proves
the no-lookahead entry/exit pairing end to end without any external news source.

    python research/news-bootstrap/demo_label.py
"""

from __future__ import annotations

from datetime import datetime, timezone

import labels
import yahoo

DEMO_ASSETS = {"OIL": "CL=F", "SPX": "^GSPC", "GOLD": "GC=F"}


def main() -> None:
    intraday = {}
    for asset, sym in DEMO_ASSETS.items():
        bars = yahoo.intraday_bars(sym, "30d", "15m")
        intraday[asset] = bars
        print(f"{asset:5s} {sym:7s} {len(bars)} intraday bars")

    # Use real bar timestamps from the first asset as pseudo-publish times.
    anchor = intraday["OIL"]
    if len(anchor) < 20:
        print("Not enough intraday bars (market may be closed / Yahoo throttled).")
        return
    sample_ts = [anchor[i][0] for i in (5, len(anchor) // 2, len(anchor) - 10)]
    news = [{"id": f"demo{i}", "ts": ts, "title": f"synthetic headline @ bar {i}"}
            for i, ts in enumerate(sample_ts)]

    print("\n§8 forward-return labels (entry = first bar at/after t_pub):")
    print(f"{'headline':9s} {'asset':5s} {'window':>6s} {'ret':>9s} {'label':>5s}")
    rows = labels.build_label_rows(news, intraday, {}, [15, 30, 60])
    for r in sorted(rows, key=lambda x: (x["headline_id"], x["asset"], x["window_min"])):
        t = datetime.fromtimestamp(r["ts"], tz=timezone.utc).strftime("%m-%d %H:%M")
        print(f"{r['headline_id']:9s} {r['asset']:5s} {r['window_min']:>5d}m "
              f"{r['ret']*100:>+7.3f}% {r['label']:>+5d}   (t_pub {t}Z)")

    print(f"\n{len(rows)} labeled rows from {len(news)} headlines x {len(DEMO_ASSETS)} assets.")


if __name__ == "__main__":
    main()
