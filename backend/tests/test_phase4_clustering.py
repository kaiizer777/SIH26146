"""Phase 4 integration tests — Entity Clustering (GDS Louvain).

All tests require live Neo4j + PostgreSQL. They skip gracefully if unreachable.

Run with:
    backend/venv/Scripts/python -m pytest backend/tests/test_phase4_clustering.py -v -m integration
Or alongside the full suite:
    backend/venv/Scripts/python -m pytest backend/tests/ -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def neo4j_svc():
    """GraphService connected to live Neo4j — skip module if unreachable."""
    try:
        from app.services.graph_service import GraphService
        svc = GraphService()
        svc.connect()
        yield svc
        svc.close()
    except Exception as exc:
        pytest.skip(f"Neo4j not reachable: {exc}")


@pytest.fixture(scope="module")
def pg_conn():
    """psycopg2 connection to live PostgreSQL — skip module if unreachable."""
    try:
        import psycopg2
        from app.config import settings
        conn = psycopg2.connect(settings.database_url)
        conn.set_session(readonly=True, autocommit=True)
        yield conn
        conn.close()
    except Exception as exc:
        pytest.skip(f"PostgreSQL not reachable: {exc}")


# ---------------------------------------------------------------------------
# Test 1: cluster_id written to at least some wallets
# ---------------------------------------------------------------------------

def test_wallet_cluster_ids_written(neo4j_svc):
    """At least one :Wallet must have cluster_id set (Louvain write ran)."""
    count = neo4j_svc.count_query(
        "MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL RETURN count(w)"
    )
    assert count > 0, (
        f"cluster_id is null on all wallets — "
        "cluster_wallets.py has not been run or Louvain write failed."
    )


# ---------------------------------------------------------------------------
# Test 2: all wallets with CO_SPEND edges have cluster_id
# ---------------------------------------------------------------------------

def test_cospend_wallets_all_have_cluster_id(neo4j_svc):
    """Every :Wallet involved in ≥1 :CO_SPEND edge must have cluster_id written."""
    with neo4j_svc.driver.session() as session:
        missing = session.run(
            """
            MATCH (w:Wallet)-[:CO_SPEND]-()
            WHERE w.cluster_id IS NULL
            RETURN count(w) AS missing
            """
        ).single()["missing"]

    assert missing == 0, (
        f"{missing} wallets with CO_SPEND edges still have null cluster_id. "
        "Louvain write property did not cover all connected wallet nodes."
    )


# ---------------------------------------------------------------------------
# Test 3: cluster distribution is sane
# ---------------------------------------------------------------------------

def test_cluster_distribution_sane(neo4j_svc):
    """No single cluster dominates (>50% of wallets) and multiple communities exist."""
    total_wallets = neo4j_svc.count_query("MATCH (w:Wallet) RETURN count(w)")
    total_communities = neo4j_svc.count_query(
        "MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL "
        "RETURN count(DISTINCT w.cluster_id)"
    )

    assert total_communities > 1, (
        f"Only {total_communities} distinct community found — "
        "either Louvain failed to differentiate or no CO_SPEND edges exist."
    )

    with neo4j_svc.driver.session() as session:
        top = session.run(
            """
            MATCH (w:Wallet)
            WHERE w.cluster_id IS NOT NULL
            RETURN w.cluster_id AS cid, count(w) AS cnt
            ORDER BY cnt DESC LIMIT 1
            """
        ).single()

    if top is None:
        pytest.fail("No wallet with cluster_id found.")

    max_size = top["cnt"]
    fraction = max_size / total_wallets if total_wallets else 1.0
    assert fraction < 0.5, (
        f"Largest cluster contains {max_size:,} / {total_wallets:,} wallets ({fraction:.1%}) — "
        "something has collapsed all wallets into one community."
    )


# ---------------------------------------------------------------------------
# Test 4: PostgreSQL cluster_id matches Neo4j for 10 random wallets
# ---------------------------------------------------------------------------

def test_postgres_cluster_id_spot_check(neo4j_svc, pg_conn):
    """10 random wallets: PostgreSQL cluster_id == Neo4j :Wallet.cluster_id."""
    import psycopg2.extras

    import psycopg2
    from app.config import settings
    try:
        pg = psycopg2.connect(settings.database_url)
        pg.set_session(readonly=True, autocommit=True)
    except Exception as exc:
        pytest.skip(f"PostgreSQL not reachable for primary-sender lookup: {exc}")

    with pg.cursor() as _cur:
        _cur.execute(
            "SELECT DISTINCT input_addresses[1] FROM transactions "
            "WHERE input_addresses[1] IS NOT NULL LIMIT 5000"
        )
        primary_sender_addrs = [row[0] for row in _cur.fetchall()]
    pg.close()

    with neo4j_svc.driver.session() as session:
        sample = session.run(
            """
            MATCH (w:Wallet)
            WHERE w.cluster_id IS NOT NULL
              AND w.address IN $addrs
            WITH w ORDER BY rand() LIMIT 10
            RETURN w.address AS address, w.cluster_id AS cluster_id
            """,
            addrs=primary_sender_addrs,
        ).data()

    assert sample, "No wallets with cluster_id returned from Neo4j."

    mismatches = []
    with psycopg2.extras.RealDictCursor(pg_conn) as cur:
        for rec in sample:
            addr = rec["address"]
            neo4j_cid = rec["cluster_id"]
            cur.execute(
                """
                SELECT cluster_id FROM transactions
                WHERE input_addresses[1] = %s
                LIMIT 1
                """,
                (addr,),
            )
            row = cur.fetchone()
            pg_cid = row["cluster_id"] if row else None
            if pg_cid != neo4j_cid:
                mismatches.append(
                    f"addr={addr[:20]}...: neo4j={neo4j_cid}, pg={pg_cid}"
                )

    assert not mismatches, (
        f"cluster_id mismatch between Neo4j and PostgreSQL for "
        f"{len(mismatches)} wallets:\n" + "\n".join(mismatches)
    )


# ---------------------------------------------------------------------------
# Test 5: Top-20 cluster query returns complete, valid rows
# ---------------------------------------------------------------------------

def test_top20_query_returns_complete_rows(neo4j_svc):
    """Top-20 cluster query returns rows with non-null cluster_id and member_count > 0."""
    with neo4j_svc.driver.session() as session:
        rows = session.run(
            """
            MATCH (w:Wallet)
            WHERE w.cluster_id IS NOT NULL
            WITH w.cluster_id AS cluster_id, count(w) AS member_count
            ORDER BY member_count DESC
            LIMIT 20
            RETURN cluster_id, member_count
            """
        ).data()

    assert len(rows) > 0, "Top-20 cluster query returned no rows."

    for row in rows:
        assert row["cluster_id"] is not None, (
            f"cluster_id is null in top-20 result row: {row}"
        )
        assert row["member_count"] > 0, (
            f"member_count is 0 in top-20 result row: {row}"
        )
