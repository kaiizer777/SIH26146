"""Unit tests for feature_extractor.extract_features.

Each test uses a hand-constructed transaction dict with known expected feature values.
Tests are deterministic, isolated, and require no external services.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

import sys
from pathlib import Path

# Allow running via `pytest backend/tests/` from project root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.feature_extractor import (
    FEATURE_DIM,
    FEATURE_NAMES,
    extract_features,
    extract_features_batch,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
TOL = 1e-5  # absolute tolerance for float comparisons


def _tx(**kwargs) -> dict:
    """Minimal valid transaction dict; caller overrides specific fields."""
    base = {
        "txid": "a" * 64,
        "ts": "2026-03-15T14:30:00Z",   # hour=14, weekday=6 (Sunday)
        "src_ip": "8.8.8.1",
        "dst_ip": "1.1.1.1",
        "src_port": 55000,
        "dst_port": 8333,
        "input_addresses": ["bc1qabc"],
        "output_addresses": ["bc1qdef"],
        "input_amounts": [1.0],
        "output_amounts": [0.99],
        "fee": 0.01,
        "script_type": "P2WPKH",
        "geo_country": "US",
        "asn": 15169,
    }
    base.update(kwargs)
    return base


# ---------------------------------------------------------------------------
# Test 1: Simple 1-in-1-out P2WPKH transaction
# ---------------------------------------------------------------------------
class TestSimpleSingleIO:
    """1 input (1.0 BTC), 1 output (0.99 BTC), fee=0.01, P2WPKH, ts=2026-03-15T14:30:00Z"""

    def setup_method(self):
        self.row = _tx()
        self.vec = extract_features(self.row)

    def test_shape(self):
        assert self.vec.shape == (FEATURE_DIM,)

    def test_dtype(self):
        assert self.vec.dtype == np.float32

    def test_fee_rate(self):
        # fee_rate = 0.01 / 1.0 = 0.01
        assert abs(self.vec[0] - 0.01) < TOL

    def test_total_in(self):
        assert abs(self.vec[1] - 1.0) < TOL

    def test_total_out(self):
        assert abs(self.vec[2] - 0.99) < TOL

    def test_num_inputs(self):
        assert self.vec[3] == 1.0

    def test_num_outputs(self):
        assert self.vec[4] == 1.0

    def test_max_output_fraction(self):
        # single output → fraction = 1.0
        assert abs(self.vec[5] - 1.0) < TOL

    def test_output_entropy_single_output(self):
        # entropy = 0 for a single output
        assert abs(self.vec[6] - 0.0) < TOL

    def test_equal_outputs_flag_single(self):
        # only 1 output → no pair → 0
        assert self.vec[7] == 0.0

    def test_coinjoin_flag_single(self):
        assert self.vec[8] == 0.0

    def test_ip_count(self):
        assert self.vec[9] == 1.0

    def test_hour_of_day(self):
        assert self.vec[12] == 14.0

    def test_day_of_week(self):
        # 2026-03-15 is a Sunday → weekday() = 6
        assert self.vec[13] == 6.0

    def test_is_segwit(self):
        assert self.vec[15] == 1.0  # P2WPKH

    def test_is_taproot(self):
        assert self.vec[14] == 0.0

    def test_amt_log(self):
        assert abs(self.vec[16] - math.log1p(1.0)) < TOL

    def test_fee_log(self):
        assert abs(self.vec[17] - math.log1p(0.01)) < TOL


# ---------------------------------------------------------------------------
# Test 2: CoinJoin-like transaction (3 inputs, 3 equal outputs)
# ---------------------------------------------------------------------------
class TestCoinJoinCandidate:
    """3 inputs, 3 equal outputs of 0.1 BTC each → both equal_flag and coinjoin_flag = 1."""

    def setup_method(self):
        self.row = _tx(
            input_addresses=["bc1qa", "bc1qb", "bc1qc"],
            output_addresses=["bc1qx", "bc1qy", "bc1qz"],
            input_amounts=[0.11, 0.11, 0.11],
            output_amounts=[0.1, 0.1, 0.1],
            fee=0.03,
            script_type="P2WPKH",
        )
        self.vec = extract_features(self.row)

    def test_num_inputs(self):
        assert self.vec[3] == 3.0

    def test_num_outputs(self):
        assert self.vec[4] == 3.0

    def test_equal_outputs_flag(self):
        assert self.vec[7] == 1.0

    def test_coinjoin_candidate_flag(self):
        assert self.vec[8] == 1.0

    def test_max_output_fraction(self):
        # all outputs equal → max_frac = 0.1 / 0.3 ≈ 0.3333
        assert abs(self.vec[5] - (0.1 / 0.3)) < TOL

    def test_output_entropy(self):
        # 3 equal outputs → uniform → entropy = log2(3)
        expected = math.log2(3)
        assert abs(self.vec[6] - expected) < TOL


# ---------------------------------------------------------------------------
# Test 3: Taproot transaction, non-equal outputs
# ---------------------------------------------------------------------------
class TestTaprootUnequal:
    """P2TR, 2 outputs of clearly different sizes → no equal_flag."""

    def setup_method(self):
        self.row = _tx(
            input_addresses=["bc1pAAA"],
            output_addresses=["bc1pBBB", "bc1pCCC"],
            input_amounts=[2.0],
            output_amounts=[1.8, 0.1],
            fee=0.1,
            script_type="P2TR",
            ts="2026-06-01T00:00:00Z",  # Monday, hour=0
        )
        self.vec = extract_features(self.row)

    def test_is_taproot(self):
        assert self.vec[14] == 1.0

    def test_is_segwit(self):
        assert self.vec[15] == 0.0

    def test_equal_outputs_flag(self):
        # 1.8 vs 0.1 → ratio = |1.8-0.1|/1.8 ≈ 0.944 >> 1% → 0
        assert self.vec[7] == 0.0

    def test_coinjoin_flag(self):
        assert self.vec[8] == 0.0

    def test_hour_of_day(self):
        assert self.vec[12] == 0.0

    def test_day_of_week(self):
        # 2026-06-01 is a Monday → 0
        assert self.vec[13] == 0.0

    def test_max_output_fraction(self):
        # max is 1.8, total_out = 1.9
        expected = 1.8 / 1.9
        assert abs(self.vec[5] - expected) < TOL

    def test_entropy_two_unequal(self):
        total = 1.9
        p1, p2 = 1.8 / total, 0.1 / total
        expected = -(p1 * math.log2(p1) + p2 * math.log2(p2))
        assert abs(self.vec[6] - expected) < TOL


# ---------------------------------------------------------------------------
# Test 4: PostgreSQL array string notation
# ---------------------------------------------------------------------------
class TestPostgresArrayStrings:
    """Amounts passed as PostgreSQL-style '{a,b}' strings rather than Python lists."""

    def setup_method(self):
        self.row = _tx(
            input_amounts="{0.5,0.5}",
            output_amounts="{0.4,0.59}",
            fee=0.01,
            input_addresses="{bc1qa,bc1qb}",
            output_addresses="{bc1qx,bc1qy}",
        )
        self.vec = extract_features(self.row)

    def test_total_in(self):
        assert abs(self.vec[1] - 1.0) < TOL

    def test_total_out(self):
        assert abs(self.vec[2] - 0.99) < TOL

    def test_num_inputs(self):
        assert self.vec[3] == 2.0

    def test_num_outputs(self):
        assert self.vec[4] == 2.0

    def test_fee_rate(self):
        assert abs(self.vec[0] - 0.01) < TOL


# ---------------------------------------------------------------------------
# Test 5: Zero-fee edge case and batch API
# ---------------------------------------------------------------------------
class TestZeroFeeAndBatch:
    """fee=0 should not blow up (log1p(0)=0, fee_rate=0); batch API shape check."""

    def setup_method(self):
        self.row = _tx(fee=0.0, input_amounts=[0.5], output_amounts=[0.5])
        self.vec = extract_features(self.row)

    def test_fee_log_zero(self):
        assert abs(self.vec[17] - 0.0) < TOL

    def test_fee_rate_zero(self):
        assert abs(self.vec[0] - 0.0) < TOL

    def test_all_finite(self):
        assert np.all(np.isfinite(self.vec)), "All features must be finite"

    def test_batch_shape(self):
        rows = [_tx(), _tx(fee=0.0), _tx(script_type="P2TR")]
        batch = extract_features_batch(rows)
        assert batch.shape == (3, FEATURE_DIM)
        assert batch.dtype == np.float32

    def test_feature_names_length(self):
        assert len(FEATURE_NAMES) == FEATURE_DIM
