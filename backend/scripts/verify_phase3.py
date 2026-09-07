#!/usr/bin/env python3
"""Phase 3 — Verification Script.

Runs the 4 mandatory correctness checks against live PostgreSQL + Neo4j:

  V1: MATCH (w:Wallet) RETURN count(w)  ==  SQL distinct-address count
  V2: MATCH (t:Transaction) RETURN count(t)  ==  SELECT COUNT(*) FROM transactions
  V3: Spot-check 5 random txids — SENDS/RECEIVES amounts in Neo4j match PostgreSQL
      input_amounts / output_amounts to 8 decimal places
  V4: MATCH ()-[r:CO_SPEND]->() RETURN count(r)  ==  Python-computed canonical pair count

Exit code 0 = all pass.  Exit code 1 = one or more failures.
"""

from __future__ import annotations

import itertools
import logging
import random
import sys
from decimal import Decimal
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import psycopg2
import psycopg2.extras

from app.config import settings
from app.services.graph_service import GraphService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("verify_phase3")

PASS = "\u2705 PASS"
FAIL = "\u274c FAIL"


def _decimal_to_float(v) -> float:
    if v is None:
        return 0.0
    return float(v)


# ---------------------------------------------------------------------------
# V1 — Wallet count
# ---------------------------------------------------------------------------

def check_v1_wallet_count(svc: GraphService, pg_conn) -> bool:
    """Neo4j Wallet count == distinct PostgreSQL address count."""
    logger.info("V1: Checking Wallet node count ...")
    neo4j_count = svc.count_query("MATCH (w:Wallet) RETURN count(w)")

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

    ok = neo4j_count == pg_count
    status = PASS if ok else FAIL
    logger.info(
        "%s  V1 Wallet count — Neo4j: %d | PostgreSQL distinct: %d",
        status, neo4j_count, pg_count,
    )
    if not ok:
        logger.error("  DISCREPANCY: %d vs %d", neo4j_count, pg_count)
    return ok


# ---------------------------------------------------------------------------
# V2 — Transaction count
# ---------------------------------------------------------------------------

def check_v2_transaction_count(svc: GraphService, pg_conn) -> bool:
    """Neo4j Transaction count == PostgreSQL row count."""
    logger.info("V2: Checking Transaction node count ...")
    neo4j_count = svc.count_query("MATCH (t:Transaction) RETURN count(t)")

    cur = pg_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM transactions")
    pg_count = cur.fetchone()[0]
    cur.close()

    ok = neo4j_count == pg_count
    status = PASS if ok else FAIL
    logger.info(
        "%s  V2 Transaction count — Neo4j: %d | PostgreSQL: %d",
        status, neo4j_count, pg_count,
    )
    if not ok:
        logger.error("  DISCREPANCY: %d vs %d", neo4j_count, pg_count)
    return ok


# ---------------------------------------------------------------------------
# V3 — Spot-check 5 txids
# ---------------------------------------------------------------------------

def check_v3_spot_check(svc: GraphService, pg_conn, n_samples: int = 5) -> bool:
    """Verify SENDS/RECEIVES amounts for n random txids to 8 decimal places."""
    logger.info("V3: Spot-checking %d random txids ...", n_samples)

    cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT txid, input_addresses, input_amounts, output_addresses, output_amounts "
        "FROM transactions ORDER BY random() LIMIT %s",
        (n_samples,),
    )
    pg_rows = [dict(r) for r in cur.fetchall()]
    cur.close()

    if not pg_rows:
        logger.warning("No rows returned from PostgreSQL for spot-check.")
        return True

    all_pass = True
    with svc.driver.session() as session:
        for row in pg_rows:
            txid = row["txid"]

            # --- SENDS check ---
            inp_addrs = row["input_addresses"] or []
            inp_amts = row["input_amounts"] or []
            pg_sends = {
                addr: round(_decimal_to_float(amt), 8)
                for addr, amt in zip(inp_addrs, inp_amts)
            }

            sends_result = session.run(
                "MATCH (w:Wallet)-[r:SENDS]->(t:Transaction {txid: $txid}) "
                "RETURN w.address AS addr, r.amount AS amount",
                txid=txid,
            ).data()
            neo4j_sends = {
                rec["addr"]: round(float(rec["amount"]), 8) for rec in sends_result
            }

            if pg_sends != neo4j_sends:
                logger.error(
                    "%s  V3 SENDS mismatch for txid=%s\n    PG:     %s\n    Neo4j:  %s",
                    FAIL, txid, pg_sends, neo4j_sends,
                )
                all_pass = False
                continue

            # --- RECEIVES check ---
            out_addrs = row["output_addresses"] or []
            out_amts = row["output_amounts"] or []
            pg_receives = {}
            for addr, amt in zip(out_addrs, out_amts):
                v = round(_decimal_to_float(amt), 8)
                # Handle multiple outputs to same address: sum them
                pg_receives[addr] = round(pg_receives.get(addr, 0.0) + v, 8)

            recv_result = session.run(
                "MATCH (t:Transaction {txid: $txid})-[r:RECEIVES]->(w:Wallet) "
                "RETURN w.address AS addr, r.amount AS amount",
                txid=txid,
            ).data()
            neo4j_receives = {}
            for rec in recv_result:
                v = round(float(rec["amount"]), 8)
                addr = rec["addr"]
                neo4j_receives[addr] = round(neo4j_receives.get(addr, 0.0) + v, 8)

            if pg_receives != neo4j_receives:
                logger.error(
                    "%s  V3 RECEIVES mismatch for txid=%s\n    PG:     %s\n    Neo4j:  %s",
                    FAIL, txid, pg_receives, neo4j_receives,
                )
                all_pass = False
                continue

            logger.info("%s  V3 txid=%s... amounts match", PASS, txid[:16])

    return all_pass


# ---------------------------------------------------------------------------
# V4 — CO_SPEND count
# ---------------------------------------------------------------------------

def check_v4_cospend_count(svc: GraphService, pg_conn) -> bool:
    """Neo4j CO_SPEND edge count == Python-computed canonical pair count from SQL."""
    logger.info("V4: Checking CO_SPEND edge count ...")
    neo4j_count = svc.count_query("MATCH ()-[r:CO_SPEND]->() RETURN count(r)")

    # Recompute canonical pair count from PostgreSQL
    cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    # Fetch only multi-input transactions (no point iterating singletons)
    cur.execute(
        "SELECT input_addresses FROM transactions WHERE array_length(input_addresses, 1) > 1"
    )
    expected_count = 0
    seen_pairs: set[tuple[str, str]] = set()
    for row in cur:
        addrs = row["input_addresses"] or []
        for a, b in itertools.combinations(addrs, 2):
            if a == b:
                continue
            pair = (a, b) if a < b else (b, a)
            seen_pairs.add(pair)
    cur.close()

    # Note: we use a SET because the same wallet pair can co-appear in multiple
    # transactions. Neo4j MERGE deduplicates these into a single edge, so the
    # count we compare against is the number of *unique* canonical pairs.
    expected_count = len(seen_pairs)

    ok = neo4j_count == expected_count
    status = PASS if ok else FAIL
    logger.info(
        "%s  V4 CO_SPEND count — Neo4j: %d | Expected (unique canonical pairs): %d",
        status, neo4j_count, expected_count,
    )
    if not ok:
        logger.error("  DISCREPANCY: %d vs %d", neo4j_count, expected_count)
    return ok


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_all_verifications() -> bool:
    """Run all 4 checks. Returns True if all pass."""
    results = {}
    pg_url = settings.database_url

    with GraphService() as svc:
        pg_conn = psycopg2.connect(pg_url)
        pg_conn.set_session(readonly=True, autocommit=True)
        try:
            results["V1"] = check_v1_wallet_count(svc, pg_conn)
            results["V2"] = check_v2_transaction_count(svc, pg_conn)
            results["V3"] = check_v3_spot_check(svc, pg_conn)
            results["V4"] = check_v4_cospend_count(svc, pg_conn)
        finally:
            pg_conn.close()

    logger.info("")
    logger.info("=" * 60)
    logger.info("VERIFICATION SUMMARY")
    logger.info("=" * 60)
    all_pass = True
    for check, passed in results.items():
        logger.info("  %s  %s", PASS if passed else FAIL, check)
        if not passed:
            all_pass = False
    logger.info("=" * 60)
    logger.info("Overall: %s", "ALL PASS" if all_pass else "FAILURES DETECTED")
    logger.info("=" * 60)
    return all_pass


if __name__ == "__main__":
    ok = run_all_verifications()
    sys.exit(0 if ok else 1)
