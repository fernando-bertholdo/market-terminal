"""§8 price-reaction labels: label(asset, headline) = sign(forward return).

    label = sign( price(asset, t_pub + window) / price(asset, t_pub) - 1 )

Two granularities (plan §4.2 / §8):
  - fine   : intraday bars (15/30/60 min), only ~60 days of Yahoo overlap.
  - coarse : daily closes (pub-day -> next close), years of history, noisier;
             used as prior signal and for thin/PT assets.

NO-LOOKAHEAD (critical invariant): the ENTRY price is the first bar AT or AFTER
the publish timestamp — never a bar before the news. Labels use future returns,
but only here, offline, to train. The production model never sees forward prices;
it scores from the headline alone.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

# A small dead-zone so tiny noise moves are labeled flat (0) rather than +/-1.
DEFAULT_DEADZONE = 0.0008  # 8 bps


def _first_at_or_after(bars: List[Tuple[int, float]], ts: int) -> Optional[float]:
    """First (sorted) bar close with bar_ts >= ts. Linear scan; bars are small."""
    for bar_ts, close in bars:
        if bar_ts >= ts:
            return close
    return None


def label_intraday(
    bars: List[Tuple[int, float]],
    t_pub_unix: int,
    window_min: int,
    deadzone: float = DEFAULT_DEADZONE,
) -> Optional[Dict[str, float]]:
    """Forward-return label over `window_min` minutes from an intraday tape."""
    entry = _first_at_or_after(bars, t_pub_unix)
    exit_px = _first_at_or_after(bars, t_pub_unix + window_min * 60)
    if entry is None or exit_px is None or entry == 0:
        return None
    ret = exit_px / entry - 1
    label = 0 if abs(ret) < deadzone else (1 if ret > 0 else -1)
    return {"ret": ret, "label": label, "window_min": window_min, "granularity": "fine"}


def label_daily(
    daily_rows: List[Dict[str, float]],
    pub_date: str,
    deadzone: float = DEFAULT_DEADZONE,
) -> Optional[Dict[str, float]]:
    """Coarse label: close on/after pub date -> next available close."""
    idx = None
    for i, row in enumerate(daily_rows):
        if row["date"] >= pub_date:
            idx = i
            break
    if idx is None or idx + 1 >= len(daily_rows):
        return None
    entry = daily_rows[idx]["close"]
    exit_px = daily_rows[idx + 1]["close"]
    if entry == 0:
        return None
    ret = exit_px / entry - 1
    label = 0 if abs(ret) < deadzone else (1 if ret > 0 else -1)
    return {"ret": ret, "label": label, "window_min": 1440, "granularity": "coarse"}


def build_label_rows(
    news: List[Dict],
    intraday: Dict[str, List[Tuple[int, float]]],
    daily: Dict[str, List[Dict[str, float]]],
    windows: List[int],
) -> List[Dict]:
    """Cross news x asset universe into a labeled training table.

    `news`   : [{id, ts (unix seconds), title, ...}]
    `intraday`: asset -> sorted [(ts, close)]
    `daily`   : asset -> [{date, close}]
    Returns rows: {headline_id, asset, window_min, ret, label, granularity, ts}.
    """
    rows: List[Dict] = []
    for item in news:
        t_pub = int(item["ts"])
        pub_date = datetime.fromtimestamp(t_pub, tz=timezone.utc).strftime("%Y-%m-%d")
        for asset in set(list(intraday.keys()) + list(daily.keys())):
            bars = intraday.get(asset, [])
            for w in windows:
                lab = label_intraday(bars, t_pub, w) if bars else None
                if lab is None:
                    continue
                rows.append({
                    "headline_id": item["id"], "asset": asset, "ts": t_pub,
                    **lab,
                })
            drows = daily.get(asset, [])
            lab_d = label_daily(drows, pub_date) if drows else None
            if lab_d is not None:
                rows.append({
                    "headline_id": item["id"], "asset": asset, "ts": t_pub,
                    **lab_d,
                })
    return rows
