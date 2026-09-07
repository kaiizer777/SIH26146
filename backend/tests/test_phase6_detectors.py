"""Phase 6 — Integration Tests: Peeling-Chain & CoinJoin Detectors.

All tests skip gracefully if Neo4j or PostgreSQL is unreachable.
Tests requiring live services are module-scoped to avoid repeated connection
overhead during the full test suite run.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.config import settings

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def neo4j_driver():
    """Module-scoped Neo4j driver. Skips entire module if unreachable."""
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        # Verify connectivity
        with driver.session() as session:
            session.run("RETURN 1").single()
        yield driver
        driver.close()
    except Exception as exc:
        pytest.skip(f"Neo4j not reachable: {exc}")


@pytest.fixture(scope="module")
def pg_conn():
    """Module-scoped PostgreSQL connection. Skips entire module if unreachable."""
    try:
        import psycopg2
        conn = psycopg2.connect(settings.database_url)
        yield conn
        conn.close()
    except Exception as exc:
        pytest.skip(f"PostgreSQL not reachable: {exc}")


@pytest.fixture(scope="module")
def synthetic_ground_truth() -> tuple[set[str], set[str]]:
    """Load peeling and coinjoin ground-truth txids from the synthetic JSON."""
    json_path = _PROJECT_ROOT / "data" / "synthetic_transactions.json"
    if not json_path.exists():
        return set(), set()
    with open(json_path, "r", encoding="utf-8") as f:
        txs = json.load(f)
    peeling = {tx["txid"] for tx in txs if tx.get("is_peeling")}
    coinjoin = {tx["txid"] for tx in txs if tx.get("is_coinjoin")}
    return peeling, coinjoin


# ---------------------------------------------------------------------------
# Test 1: Peeling-chain detector produces results
# ---------------------------------------------------------------------------


def test_peeling_chain_detector_produces_results(neo4j_driver):
    """At least 1 chain must be flagged after running the detector."""
    with neo4j_driver.session() as session:
        result = session.run(
            "MATCH (tx:Transaction) WHERE tx.is_mixing = true AND tx.chain_hops IS NOT NULL "
            "RETURN count(tx) AS cnt"
        )
        cnt = result.single()["cnt"]

    assert cnt >= 1, (
        f"Expected >= 1 peeling-chain :Transaction flagged in Neo4j, got {cnt}. "
        "Run detect_peeling_chains.py first."
    )
    print(f"\n  Peeling-chain flagged nodes: {cnt:,}")


# ---------------------------------------------------------------------------
# Test 2: min_hops constraint is enforced — all peeling nodes have chain_hops >= 5
# ---------------------------------------------------------------------------


def test_peeling_chain_min_hops_enforced(neo4j_driver):
    """Every :Transaction with chain_hops set must have chain_hops >= 5."""
    with neo4j_driver.session() as session:
        result = session.run(
            "MATCH (tx:Transaction) "
            "WHERE tx.chain_hops IS NOT NULL AND tx.chain_hops < 5 "
            "RETURN count(tx) AS violators"
        )
        violators = result.single()["violators"]

    assert violators == 0, (
        f"{violators:,} :Transaction nodes have chain_hops < 5. "
        "The min_hops=5 threshold is not being enforced correctly."
    )


# ---------------------------------------------------------------------------
# Test 3: chain_hops values are positive integers
# ---------------------------------------------------------------------------


def test_chain_hops_are_positive(neo4j_driver):
    """chain_hops must be >= 1 wherever set (0 or negative would be a logic bug)."""
    with neo4j_driver.session() as session:
        result = session.run(
            "MATCH (tx:Transaction) "
            "WHERE tx.chain_hops IS NOT NULL "
            "RETURN min(tx.chain_hops) AS min_hops, max(tx.chain_hops) AS max_hops, "
            "count(tx) AS total"
        )
        row = result.single()

    if row["total"] == 0:
        pytest.skip("No peeling-chain nodes to check.")

    assert row["min_hops"] >= 1, (
        f"min(chain_hops) = {row['min_hops']} — must be >= 1."
    )
    print(f"\n  chain_hops range: {row['min_hops']} – {row['max_hops']} across {row['total']:,} nodes.")


# ---------------------------------------------------------------------------
# Test 4: CoinJoin detector produces results
# ---------------------------------------------------------------------------


def test_coinjoin_detector_produces_results(neo4j_driver, synthetic_ground_truth):
    """At least 1 CoinJoin transaction must be flagged after running the detector."""
    peeling_gt, coinjoin_gt = synthetic_ground_truth

    with neo4j_driver.session() as session:
        result = session.run(
            "MATCH (tx:Transaction {is_mixing: true}) RETURN count(tx) AS cnt"
        )
        total_mixing = result.single()["cnt"]

    assert total_mixing >= 1, (
        f"Expected >= 1 is_mixing=true :Transaction in Neo4j, got {total_mixing}. "
        "Run detect_coinjoin.py (and detect_peeling_chains.py) first."
    )
    print(f"\n  Total is_mixing=true nodes: {total_mixing:,}")

    if coinjoin_gt:
        # Verify at least some CoinJoin ground-truth txids are flagged
        with neo4j_driver.session() as session:
            result = session.run(
                "MATCH (tx:Transaction {is_mixing: true}) RETURN tx.txid AS txid"
            )
            flagged_txids = {r["txid"] for r in result}

        detected = coinjoin_gt & flagged_txids
        recall = len(detected) / len(coinjoin_gt)
        print(f"  CoinJoin recall: {len(detected)}/{len(coinjoin_gt)} = {recall * 100:.1f}%")
        # At least 1 must be found (non-zero recall)
        assert len(detected) >= 1, (
            f"0 of {len(coinjoin_gt)} injected CoinJoin transactions were detected."
        )


# ---------------------------------------------------------------------------
# Test 5: Pure Python equal-output filter — unit test (no services needed)
# ---------------------------------------------------------------------------


def test_coinjoin_equal_output_filter_unit():
    """Unit test the _max_equal_output_group function with known inputs."""
    import importlib.util
    script = _BACKEND / "scripts" / "detect_coinjoin.py"
    spec = importlib.util.spec_from_file_location("detect_coinjoin", script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    fn = mod._max_equal_output_group

    # Case 1: All equal amounts — group = 4
    assert fn([0.1, 0.1, 0.1, 0.1], 0.01) == 4

    # Case 2: 2 equal, 1 outlier — group = 2
    assert fn([0.1, 0.1, 5.0], 0.01) == 2

    # Case 3: Clearly within ±1% tolerance — group = 2
    # 0.0095 and 0.1: |0.1 - 0.0095| / 0.1 — actually use 0.0995 and 0.1
    # 0.0995 and 0.1: |0.1 - 0.0995| / 0.1 = 0.005 < 0.01 ✓
    assert fn([0.0995, 0.1, 0.5], 0.01) == 2

    # Case 4: Clearly outside ±1% — group = 1
    # 0.089 and 0.1: |0.1 - 0.089| / 0.1 = 0.11 >> 0.01 ✗
    assert fn([0.089, 0.1, 0.5], 0.01) == 1

    # Case 5: Empty list — group = 0
    assert fn([], 0.01) == 0

    # Case 6: Single element — group = 1
    assert fn([0.25], 0.01) == 1

    # Case 7: All different — group = 1
    assert fn([0.1, 0.2, 0.3, 0.4], 0.01) == 1


# ---------------------------------------------------------------------------
# Test 6: PostgreSQL consistency — is_mixing count matches Neo4j
# ---------------------------------------------------------------------------


def test_sync_postgres_is_mixing_consistent(neo4j_driver, pg_conn):
    """After sync, PG is_mixing=true count must equal Neo4j count."""
    with neo4j_driver.session() as session:
        result = session.run(
            "MATCH (tx:Transaction {is_mixing: true}) RETURN count(tx) AS cnt"
        )
        neo4j_count = result.single()["cnt"]

    with pg_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM transactions WHERE is_mixing = true")
        pg_count = cur.fetchone()[0]

    assert pg_count == neo4j_count, (
        f"PG is_mixing=true count ({pg_count:,}) != Neo4j count ({neo4j_count:,}). "
        "Run sync_mixing_to_postgres.py to synchronise."
    )
    print(f"\n  is_mixing=true: Neo4j={neo4j_count:,}, PG={pg_count:,} — consistent.")


# ---------------------------------------------------------------------------
# Test 7: chain_hops IS NOT NULL only for is_mixing=true rows in PG
# ---------------------------------------------------------------------------


def test_chain_hops_non_null_implies_is_mixing(pg_conn):
    """All PG rows with chain_hops IS NOT NULL must also have is_mixing=true."""
    with pg_conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM transactions WHERE chain_hops IS NOT NULL AND is_mixing = false"
        )
        inconsistent = cur.fetchone()[0]

    assert inconsistent == 0, (
        f"{inconsistent:,} PG rows have chain_hops set but is_mixing=false. "
        "This is a data consistency bug in the sync."
    )


# ---------------------------------------------------------------------------
# Test 8: No regressions — full suite count
# ---------------------------------------------------------------------------


def test_no_regression_on_prior_counts(pg_conn):
    """Spot-check that previously-verified row counts are still correct."""
    with pg_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM transactions")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM transactions WHERE anomaly_score IS NULL")
        null_scores = cur.fetchone()[0]

    # Phase 2 verified: 100,000 rows ingested.
    assert total == 100_000, (
        f"Expected 100,000 total transactions, got {total:,}. "
        "Something changed the row count."
    )
    # Phase 5 verified: 0 NULL anomaly_score rows.
    assert null_scores == 0, (
        f"{null_scores:,} rows have NULL anomaly_score — regression from Phase 5."
    )
    print(f"\n  Regression check: {total:,} rows, 0 NULL anomaly_score — OK.")
