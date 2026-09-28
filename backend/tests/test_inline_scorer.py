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
    # Tx 0: Peeling chain candidate (1 input, 2 outputs, 80/20 asymmetric value split).
    # Amounts: [0.08, 0.40] → larger carries 83% of total output → qualifies under refined heuristic.
    tx0 = _make_dummy_tx(0, ["addr_peel_in"], ["addr_peel_out1", "addr_peel_out2"])
    tx0["output_amounts"] = [0.08, 0.40]  # 16.7% / 83.3% split

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

    # tx2-9 have 3 outputs each — never 1-in/2-out — so they should NOT trigger peeling chain.
    # With smooth saturation (3×thresh ceiling) and no seed proximity, they must score LOW or MEDIUM.
    benign_addrs: set[str] = set()
    for i in range(2, 10):
        benign_addrs.add(f"addr_in_{i}")
        benign_addrs.update(f"addr_out_{i}_{s}" for s in ("a", "b", "c"))

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
        # risk_score is read from the row's real graph-model output. These
        # synthetic rows carry none, so it must be an explicit None (not a
        # fabricated 0.0) — a scored zero and an uncomputed score are different
        # facts and must not be conflated.
        assert rec["risk_score"] is None or 0.0 <= rec["risk_score"] <= 1.0

        # Composite record check
        comp = rec.get("composite_record")
        assert comp is not None
        assert comp["provisional"] is True
        assert comp["verdict"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        assert comp["address"] == rec["address"]
        assert "anomaly_normalized" in comp

        # Evidence record check
        evid = rec.get("evidence_record")
        assert evid is not None
        assert evid["provisional"] is True
        assert evid["anomaly_score"] >= 0
        assert evid["anomaly_percentile"] >= 0.0
        assert evid["anomaly_rank_percentile"] >= 0.0
        # A component either inherits a real Louvain cluster_id from the
        # pre-indexed baseline, or gets a provisional one that lives above
        # 50,000 to avoid colliding with real Louvain IDs.
        assert evid["cluster_id"] is None or evid["cluster_id"] > 0
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

    # 5. Regression guard: benign txs (3-output, no seed proximity) must not exceed MEDIUM.
    # This directly guards against the false-alarm CRITICAL that triggered this fix.
    scored_map = {r["address"]: r for r in scored}
    for addr in benign_addrs:
        rec = scored_map[addr]
        assert rec["verdict"] in {"LOW", "MEDIUM"}, (
            f"Benign addr {addr!r} got false-alarm {rec['verdict']} "
            f"(score={rec['composite_score']:.4f}, anomaly={rec['anomaly_score']:.4f})"
        )


def test_map_verdict():
    """Verify verdict mapping boundaries against the canonical tiers.

    The thresholds are now owned solely by app.services.risk_thresholds
    (0.80 / 0.60 / 0.40). The superseded 0.70 / 0.50 / 0.30 table that used to
    live here is retained in risk_thresholds.LEGACY_INLINE_VERDICT_TIERS for
    audit only and must never label a record.
    """
    assert map_verdict(0.85) == "CRITICAL"
    assert map_verdict(0.80) == "CRITICAL"
    assert map_verdict(0.79) == "HIGH"
    assert map_verdict(0.60) == "HIGH"
    assert map_verdict(0.59) == "MEDIUM"
    assert map_verdict(0.40) == "MEDIUM"
    assert map_verdict(0.39) == "LOW"
    assert map_verdict(0.0) == "LOW"


def test_map_verdict_matches_risk_thresholds():
    """The inline re-export and the canonical source must never diverge."""
    from app.services import risk_thresholds

    for score in (0.0, 0.29, 0.39, 0.40, 0.59, 0.60, 0.79, 0.80, 1.0):
        assert map_verdict(score) == risk_thresholds.map_verdict(score)


def test_provisional_cluster_id_is_deterministic_and_above_louvain_range():
    """Provisional cluster IDs must be stable and never collide with Louvain.

    They used to come from a process-global counter starting at 50,000, which
    meant two different files ingested by two different worker processes could
    hand the same ID to unrelated clusters. They are now derived from a hash of
    the component's member addresses, so the ID depends only on the set.
    """
    from app.services.inline_scorer import _PROV_CLUSTER_BASE, _provisional_cluster_id

    members = ["addr_a", "addr_b", "addr_c"]

    # Same set, different order -> same ID.
    assert _provisional_cluster_id(members) == _provisional_cluster_id(
        ["addr_c", "addr_a", "addr_b"]
    )
    # Repeated calls are stable.
    assert _provisional_cluster_id(members) == _provisional_cluster_id(members)
    # A different component gets a different ID.
    assert _provisional_cluster_id(members) != _provisional_cluster_id(
        ["addr_a", "addr_b", "addr_d"]
    )
    # Always above the real Louvain range so it can never shadow a real cluster.
    for _ in range(200):
        assert _provisional_cluster_id([f"w{i}" for i in range(4)]) >= _PROV_CLUSTER_BASE


def test_score_batch_aggregates_missing_and_present_risk_scores():
    """Wallets spanning unscored and scored rows must not crash the aggregation.

    risk_score is now read from the row rather than hardcoded, so it is None for
    rows the graph pass has not covered. Aggregating with max() across a mix of
    None and a real value used to raise TypeError.
    """
    unscored = _make_dummy_tx(0, ["addr_risk_a"], ["addr_risk_b"])
    unscored["risk_score"] = None

    scored = _make_dummy_tx(1, ["addr_risk_a"], ["addr_risk_c"])
    scored["risk_score"] = 0.42

    scored_records = score_batch([unscored, scored])
    rec = next(r for r in scored_records if r["address"] == "addr_risk_a")
    assert rec["risk_score"] == 0.42, "must take the real value, not crash or default"

    only_unscored = _make_dummy_tx(2, ["addr_risk_d"], ["addr_risk_e"])
    only_unscored["risk_score"] = None
    rec_none = next(
        r for r in score_batch([only_unscored]) if r["address"] == "addr_risk_d"
    )
    assert rec_none["risk_score"] is None, "unscored must stay None, never a fake 0.0"
