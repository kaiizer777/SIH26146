"""Unit tests for Phase 11.2: Inline Scorer Service.

Tests verify:
1. Synthesizes 10 sample transactions (including 1 peeling chain candidate and 1 Ransomwhere seed).
2. Output covers all unique addresses in the batch.
3. anomaly_score >= 0 for all records.
4. verdict in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}.
5. provisional is True on all composite and evidence records.
6. Rule detection: peeling chain candidate and Ransomwhere seed overlap.
7. Graceful execution on empty rows without exceptions.
"""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

import pytest

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.services.inline_scorer import init_scorer, map_verdict, score_batch

KNOWN_SEED_ADDR = "17TMc2UkVRSga2yYvuxSD9Q1XyB2EPRjTF"


def _make_dummy_tx(
    tx_idx: int,
    in_addrs: list[str],
    out_addrs: list[str],
    fee: float = 0.0005,
    ts: str = "2026-09-09T00:00:00Z",
) -> dict:
    return {
        "txid": f"{tx_idx:02x}" * 32,
        "ts": ts,
        "src_ip": f"192.168.1.{tx_idx + 1}",
        "dst_ip": "10.0.0.1",
        "src_port": 8333,
        "dst_port": 8333,
        "input_addresses": in_addrs,
        "output_addresses": out_addrs,
        "input_amounts": [0.5 * (j + 1) for j in range(len(in_addrs))],
        "output_amounts": [0.4 * (k + 1) for k in range(len(out_addrs))],
        "fee": fee,
        "script_type": "P2WPKH",
        "geo_country": "US",
        "asn": 15169,
    }


def test_score_batch_empty():
    """Empty batch returns empty list without error."""
    assert score_batch([]) == []


def test_score_batch_synthetic_10_tx():
    """Batch of 10 transactions with peeling chain and seed wallet satisfies all spec assertions."""
    # Synthesize 10 transactions
    # Tx 0: Peeling chain candidate (1 input, 2 outputs)
    tx0 = _make_dummy_tx(0, ["addr_peel_in"], ["addr_peel_out1", "addr_peel_out2"])

    # Tx 1: Ransomwhere seed input
    tx1 = _make_dummy_tx(1, [KNOWN_SEED_ADDR], ["addr_seed_out"])

    # Tx 2-9: Standard transactions with diverse addresses
    other_txs = [
        _make_dummy_tx(
            i,
            [f"addr_in_{i}"],
            [f"addr_out_{i}_a", f"addr_out_{i}_b", f"addr_out_{i}_c"],
        )
        for i in range(2, 10)
    ]

    all_txs = [tx0, tx1] + other_txs
    assert len(all_txs) == 10

    # Collect all unique addresses across the 10 transactions
    expected_unique_addresses = set()
    for tx in all_txs:
        expected_unique_addresses.update(tx["input_addresses"])
        expected_unique_addresses.update(tx["output_addresses"])

    # Run inline scoring
    scored = score_batch(all_txs)

    # 1. Output covers all unique addresses
    scored_addrs = {rec["address"] for rec in scored}
    assert len(scored) == len(expected_unique_addresses), (
        f"Expected {len(expected_unique_addresses)} unique address records, got {len(scored)}"
    )
    assert scored_addrs == expected_unique_addresses

    # 2. Assertions on every record
    for rec in scored:
        assert "address" in rec
        assert rec["anomaly_score"] >= 0, f"Negative anomaly_score: {rec['anomaly_score']}"
        assert rec["verdict"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}, f"Unexpected verdict: {rec['verdict']}"
        assert rec["provisional"] is True, f"provisional flag must be True"
        assert rec["risk_score"] == 0.0

        # Composite record check
        comp = rec.get("composite_record")
        assert comp is not None
        assert comp["provisional"] is True
        assert comp["verdict"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        assert comp["address"] == rec["address"]

        # Evidence record check
        evid = rec.get("evidence_record")
        assert evid is not None
        assert evid["provisional"] is True
        assert evid["anomaly_score"] >= 0
        assert evid["anomaly_percentile"] >= 0.0
        assert evid["anomaly_rank_percentile"] >= 0.0
        assert evid["cluster_id"] is None
        assert evid["mixing_hops"] is None

    # 3. Verify peeling chain candidate detection
    peel_in_rec = next(r for r in scored if r["address"] == "addr_peel_in")
    assert peel_in_rec["is_mixing"] is True
    assert "PEELING_CHAIN_CANDIDATE" in peel_in_rec["triggered_rules"]

    peel_out_rec = next(r for r in scored if r["address"] == "addr_peel_out1")
    assert peel_out_rec["is_mixing"] is True
    assert "PEELING_CHAIN_CANDIDATE" in peel_out_rec["triggered_rules"]

    # 4. Verify Ransomwhere seed detection
    seed_rec = next(r for r in scored if r["address"] == KNOWN_SEED_ADDR)
    assert "RANSOMWHERE_SEED_INPUT" in seed_rec["triggered_rules"]
    assert seed_rec["composite_record"]["seed_wallet_proximity"] == 1.0
    assert seed_rec["evidence_record"]["seed_wallet_proximity"] == 1.0

    # Verify Ransomwhere seed recipient attribution isolation
    seed_out_rec = next(r for r in scored if r["address"] == "addr_seed_out")
    assert "RANSOMWHERE_SEED_RECIPIENT" in seed_out_rec["triggered_rules"]
    assert "RANSOMWHERE_SEED_INPUT" not in seed_out_rec["triggered_rules"]
    assert seed_out_rec["composite_record"]["seed_wallet_proximity"] == 0.5
    assert seed_out_rec["evidence_record"]["seed_wallet_proximity"] == 0.5


def test_map_verdict():
    """Verify verdict mapping boundaries."""
    assert map_verdict(0.85) == "CRITICAL"
    assert map_verdict(0.70) == "CRITICAL"
    assert map_verdict(0.69) == "HIGH"
    assert map_verdict(0.50) == "HIGH"
    assert map_verdict(0.49) == "MEDIUM"
    assert map_verdict(0.30) == "MEDIUM"
    assert map_verdict(0.29) == "LOW"
    assert map_verdict(0.0) == "LOW"
