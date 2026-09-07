"""Phase 5 — Feature Extractor.

Converts a single transaction row (dict from PostgreSQL or the ingest pipeline)
into a 18-element float32 numpy array.

This function is the SINGLE source of truth for feature computation — it is used
identically during training and inference so there is no train/serve skew.

Feature index map (0-based):
    0  fee_rate               fee / max(total_in, 1e-8)
    1  total_in_btc           sum(input_amounts)
    2  total_out_btc          sum(output_amounts)
    3  num_inputs             len(input_addresses)
    4  num_outputs            len(output_addresses)
    5  max_output_fraction    max(output_amounts) / max(total_out, 1e-8)
    6  output_entropy         Shannon entropy of output amount proportions
    7  equal_outputs_flag     1 if >=2 outputs within ±1% of each other, else 0
    8  coinjoin_candidate_flag 1 if >=3 inputs AND >=3 outputs AND equal_outputs, else 0
    9  ip_count               always 1 for this dataset (1 src_ip per tx)
    10 unique_country_count   1 (src geo_country)
    11 unique_asn_count       1 (src asn)
    12 hour_of_day            UTC hour of ts (0–23)
    13 day_of_week            UTC weekday of ts (0=Mon … 6=Sun)
    14 is_taproot             1 if script_type == 'P2TR', else 0
    15 is_segwit              1 if script_type in ('P2WPKH', 'P2WSH'), else 0
    16 amt_log                log1p(total_in_btc)
    17 fee_log                log1p(fee)
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Sequence, Union

import numpy as np

FEATURE_DIM: int = 18

# Feature names in order — used for SHAP labelling in Phase 8.
FEATURE_NAMES: List[str] = [
    "fee_rate",
    "total_in_btc",
    "total_out_btc",
    "num_inputs",
    "num_outputs",
    "max_output_fraction",
    "output_entropy",
    "equal_outputs_flag",
    "coinjoin_candidate_flag",
    "ip_count",
    "unique_country_count",
    "unique_asn_count",
    "hour_of_day",
    "day_of_week",
    "is_taproot",
    "is_segwit",
    "amt_log",
    "fee_log",
]

assert len(FEATURE_NAMES) == FEATURE_DIM, "FEATURE_NAMES length must equal FEATURE_DIM"


def _parse_pg_array(value: Any) -> List[float]:
    """Parse PostgreSQL array notation '{a,b,c}' or a Python list into a list of floats.

    PostgreSQL psycopg2 returns TEXT[] columns as Python lists when the column type
    is TEXT[], but NUMERIC[] may arrive as strings in some contexts. This handles both.
    """
    if isinstance(value, (list, tuple)):
        return [float(v) for v in value]
    if isinstance(value, str):
        # e.g. '{0.5,1.0}' or '0.5,1.0'
        cleaned = value.strip().strip("{}")
        if not cleaned:
            return []
        return [float(x.strip()) for x in cleaned.split(",") if x.strip()]
    return []


def _parse_ts(ts: Any) -> datetime:
    """Parse a transaction timestamp into a UTC datetime.

    Accepts:
        - datetime (tz-aware or naive, naive assumed UTC)
        - ISO 8601 string (with or without trailing Z / offset)
    """
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            return ts.replace(tzinfo=timezone.utc)
        return ts.astimezone(timezone.utc)
    if isinstance(ts, str):
        s = ts.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(s).astimezone(timezone.utc)
        except ValueError:
            # Fallback: strip offset and assume UTC
            for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                try:
                    return datetime.strptime(ts[:19], fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
    # Last-resort: epoch 0 (will score as anomalous, which is acceptable)
    return datetime(1970, 1, 1, tzinfo=timezone.utc)


def _shannon_entropy(amounts: List[float]) -> float:
    """Shannon entropy of a probability distribution derived from output amounts.

    Returns 0.0 for a single output or degenerate cases.
    """
    total = sum(amounts)
    if total <= 0 or len(amounts) < 2:
        return 0.0
    probs = [a / total for a in amounts if a > 0]
    return -sum(p * math.log2(p) for p in probs if p > 0)


def _has_equal_outputs(amounts: List[float], tol: float = 0.01) -> bool:
    """True if >=2 output amounts are within ±tol (relative) of each other."""
    n = len(amounts)
    if n < 2:
        return False
    for i in range(n):
        for j in range(i + 1, n):
            a, b = amounts[i], amounts[j]
            denom = max(a, b, 1e-12)
            if abs(a - b) / denom <= tol:
                return True
    return False


def extract_features(row: Dict[str, Any]) -> np.ndarray:
    """Extract the 18 fixed features from a single transaction row.

    Args:
        row: dict with at minimum the keys defined in the transactions schema:
             txid, ts, src_ip, input_addresses, output_addresses,
             input_amounts, output_amounts, fee, script_type, geo_country, asn.
             Amounts may be PostgreSQL array strings or Python lists.

    Returns:
        float32 ndarray of shape (18,).
    """
    # --- Parse amounts ---
    in_amts: List[float] = _parse_pg_array(row.get("input_amounts", []))
    out_amts: List[float] = _parse_pg_array(row.get("output_amounts", []))

    # Guard: ensure non-empty lists
    if not in_amts:
        in_amts = [0.0]
    if not out_amts:
        out_amts = [0.0]

    total_in = sum(in_amts)
    total_out = sum(out_amts)
    fee = float(row.get("fee", 0.0) or 0.0)

    # --- Parse addresses (for counts) ---
    in_addrs = row.get("input_addresses", [])
    out_addrs = row.get("output_addresses", [])
    if isinstance(in_addrs, str):
        in_addrs = [a.strip() for a in in_addrs.strip("{}").split(",") if a.strip()]
    if isinstance(out_addrs, str):
        out_addrs = [a.strip() for a in out_addrs.strip("{}").split(",") if a.strip()]
    n_inputs = max(len(in_addrs), 1)
    n_outputs = max(len(out_addrs), 1)

    # --- Parse timestamp ---
    dt = _parse_ts(row.get("ts"))

    # --- Script type ---
    script_type: str = str(row.get("script_type", "") or "")

    # --- Compute features ---
    fee_rate = fee / max(total_in, 1e-8)
    max_out_frac = max(out_amts) / max(total_out, 1e-8)
    entropy = _shannon_entropy(out_amts)
    equal_flag = 1.0 if _has_equal_outputs(out_amts) else 0.0
    coinjoin_flag = 1.0 if (n_inputs >= 3 and n_outputs >= 3 and equal_flag == 1.0) else 0.0

    hour_of_day = float(dt.hour)
    day_of_week = float(dt.weekday())
    is_taproot = 1.0 if script_type == "P2TR" else 0.0
    is_segwit = 1.0 if script_type in ("P2WPKH", "P2WSH") else 0.0
    amt_log = math.log1p(total_in)
    fee_log = math.log1p(fee)

    features = np.array(
        [
            fee_rate,          # 0
            total_in,          # 1
            total_out,         # 2
            float(n_inputs),   # 3
            float(n_outputs),  # 4
            max_out_frac,      # 5
            entropy,           # 6
            equal_flag,        # 7
            coinjoin_flag,     # 8
            1.0,               # 9  ip_count (always 1 in this dataset)
            1.0,               # 10 unique_country_count
            1.0,               # 11 unique_asn_count
            hour_of_day,       # 12
            day_of_week,       # 13
            is_taproot,        # 14
            is_segwit,         # 15
            amt_log,           # 16
            fee_log,           # 17
        ],
        dtype=np.float32,
    )

    assert features.shape == (FEATURE_DIM,), (
        f"extract_features produced shape {features.shape}, expected ({FEATURE_DIM},)"
    )
    return features


def extract_features_batch(rows: Sequence[Dict[str, Any]]) -> np.ndarray:
    """Vectorised wrapper — returns float32 array of shape (N, 18)."""
    return np.stack([extract_features(r) for r in rows], axis=0)
