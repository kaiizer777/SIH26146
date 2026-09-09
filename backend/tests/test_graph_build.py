"""Phase 3 integration tests — PostgreSQL → Neo4j graph build.

All tests are marked `integration` and require live Neo4j + PostgreSQL.
They are skipped gracefully if either service is unreachable.

Run with:
    backend/venv/Scripts/python -m pytest backend/tests/test_graph_build.py -v -m integration
Or alongside the full suite:
    backend/venv/Scripts/python -m pytest backend/tests/ -v
"""

from __future__ import annotations

import itertools
import sys
from pathlib import Path
from decimal import Decimal

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
# Helper
# ---------------------------------------------------------------------------

def _dec_to_float(v) -> float:
    if v is None:
        return 0.0
    return float(v)


# ---------------------------------------------------------------------------
# Test: schema constraints exist
# ---------------------------------------------------------------------------

def test_constraints_exist(neo4j_svc):
    """All 3 uniqueness constraints must exist before any data tests are meaningful."""
    constraints = neo4j_svc.verify_constraints()
    assert constraints["wallet_address"], (
        "Missing uniqueness constraint on :Wallet(address) — "
        "MERGE deduplication will break without it."
    )
    assert constraints["transaction_txid"], (
        "Missing uniqueness constraint on :Transaction(txid)."
    )
    assert constraints["ip_address"], (
        "Missing uniqueness constraint on :IP(address)."
    )


# ---------------------------------------------------------------------------
# V1 — Wallet count matches SQL distinct-address count
# ---------------------------------------------------------------------------

def test_wallet_count_matches_sql(neo4j_svc, pg_conn):
    """V1: :Wallet node count == COUNT(DISTINCT address) from all input + output arrays."""
    neo4j_count = neo4j_svc.count_query("MATCH (w:Wallet) RETURN count(w)")

    cur = pg_conn.cursor()
    cur.execute("""
        SELECT COUNT(DISTINCT addr)
        FROM (
            SELECT unnest(input_addresses) AS addr FROM transactions
            UNION
            SELECT unnest(output_addresses) AS addr FROM transactions
        ) s
    """)
    pg_count = cur.fetchone()[0]
    cur.close()

    assert neo4j_count == pg_count, (
        f"Wallet count mismatch — Neo4j: {neo4j_count}, PostgreSQL distinct: {pg_count}"
    )


# ---------------------------------------------------------------------------
# V2 — Transaction count matches PostgreSQL row count
# ---------------------------------------------------------------------------

def test_transaction_count_matches_sql(neo4j_svc, pg_conn):
    """V2: :Transaction node count == SELECT COUNT(*) FROM transactions."""
    neo4j_count = neo4j_svc.count_query("MATCH (t:Transaction) RETURN count(t)")

    cur = pg_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM transactions")
    pg_count = cur.fetchone()[0]
    cur.close()

    assert neo4j_count == pg_count, (
        f"Transaction count mismatch — Neo4j: {neo4j_count}, PostgreSQL: {pg_count}"
    )


# ---------------------------------------------------------------------------
# V3 — Spot-check 5 random txids for amount accuracy
# ---------------------------------------------------------------------------

def test_spot_check_txid_amounts(neo4j_svc, pg_conn):
    """V3: SENDS/RECEIVES amounts match PostgreSQL arrays to 8 decimal places."""
    import psycopg2.extras

    cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT txid, input_addresses, input_amounts, output_addresses, output_amounts "
        "FROM transactions ORDER BY random() LIMIT 5"
    )
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()

    assert rows, "No rows returned from PostgreSQL — is the table populated?"

    with neo4j_svc.driver.session() as session:
        for row in rows:
            txid = row["txid"]

            # SENDS: each input wallet → transaction (sum if same addr appears multiple times)
            inp_addrs = row["input_addresses"] or []
            inp_amts = row["input_amounts"] or []
            pg_sends: dict[str, float] = {}
            for addr, amt in zip(inp_addrs, inp_amts):
                v = round(_dec_to_float(amt), 8)
                pg_sends[addr] = round(pg_sends.get(addr, 0.0) + v, 8)

            sends_result = session.run(
                "MATCH (w:Wallet)-[r:SENDS]->(t:Transaction {txid: $txid}) "
                "RETURN w.address AS addr, r.amount AS amount",
                txid=txid,
            ).data()
            neo4j_sends: dict[str, float] = {}
            for rec in sends_result:
                v = round(float(rec["amount"]), 8)
                addr = rec["addr"]
                neo4j_sends[addr] = round(neo4j_sends.get(addr, 0.0) + v, 8)

            assert pg_sends == neo4j_sends, (
                f"SENDS mismatch for txid={txid}\n  PG:    {pg_sends}\n  Neo4j: {neo4j_sends}"
            )

            # RECEIVES: transaction → each output wallet (sum if same addr appears multiple times)
            out_addrs = row["output_addresses"] or []
            out_amts = row["output_amounts"] or []
            pg_receives: dict[str, float] = {}
            for addr, amt in zip(out_addrs, out_amts):
                v = round(_dec_to_float(amt), 8)
                pg_receives[addr] = round(pg_receives.get(addr, 0.0) + v, 8)

            recv_result = session.run(
                "MATCH (t:Transaction {txid: $txid})-[r:RECEIVES]->(w:Wallet) "
                "RETURN w.address AS addr, r.amount AS amount",
                txid=txid,
            ).data()
            neo4j_receives: dict[str, float] = {}
            for rec in recv_result:
                v = round(float(rec["amount"]), 8)
                addr = rec["addr"]
                neo4j_receives[addr] = round(neo4j_receives.get(addr, 0.0) + v, 8)

            assert pg_receives == neo4j_receives, (
                f"RECEIVES mismatch for txid={txid}\n  PG:    {pg_receives}\n  Neo4j: {neo4j_receives}"
            )


# ---------------------------------------------------------------------------
# V4 — CO_SPEND count matches computed canonical pair count
# ---------------------------------------------------------------------------

def test_cospend_count_matches_computed(neo4j_svc, pg_conn):
    """V4: CO_SPEND edge count == unique canonical (addr1 < addr2) pairs in PostgreSQL."""
    import psycopg2.extras

    neo4j_count = neo4j_svc.count_query("MATCH ()-[r:CO_SPEND]->() RETURN count(r)")

    cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT input_addresses FROM transactions "
        "WHERE array_length(input_addresses, 1) > 1"
    )
    seen_pairs: set[tuple[str, str]] = set()
    for row in cur:
        addrs = row["input_addresses"] or []
        for a, b in itertools.combinations(addrs, 2):
            if a == b:
                continue
            seen_pairs.add((a, b) if a < b else (b, a))
    cur.close()

    expected_count = len(seen_pairs)

    assert neo4j_count == expected_count, (
        f"CO_SPEND count mismatch — Neo4j: {neo4j_count}, "
        f"expected unique canonical pairs: {expected_count}"
    )
