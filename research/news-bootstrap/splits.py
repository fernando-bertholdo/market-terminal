"""Temporal train/val/test splits (no shuffle).

Splitting by time — never randomly — is itself a no-lookahead guard: the model is
always validated on headlines strictly newer than what it trained on, mirroring
production. Returns index boundaries on a ts-sorted row list.
"""

from __future__ import annotations

from typing import Dict, List, Tuple


def temporal_split(
    rows: List[Dict],
    train: float = 0.70,
    val: float = 0.15,
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    ordered = sorted(rows, key=lambda r: r["ts"])
    n = len(ordered)
    i_train = int(n * train)
    i_val = int(n * (train + val))
    return ordered[:i_train], ordered[i_train:i_val], ordered[i_val:]
