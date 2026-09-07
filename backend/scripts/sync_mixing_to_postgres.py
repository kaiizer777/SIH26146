"""Phase 6 — Synchronise is_mixing + chain_hops from Neo4j to PostgreSQL.

Reads all :Transaction nodes from Neo4j and performs a full sync of the
is_mixing and chain_hops properties to the PostgreSQL transactions table
(joined on txid).

Two-pass sync:
  Pass 1 — Set is_mixing=true, chain_hops=<n> for all flagged nodes.
  Pass 2 — Set is_mixing=false, chain_hops=NULL for all non-flagged nodes
            (clears stale flags if re-run after threshold changes).

Both passes use batched parameterised UPDATE statements for efficiency.
The idx_transactions_is_mixing index on the transactions table supports
fast filtered queries in downstream phases.

Usage:
    python backend/scripts/sync_mixing_to_postgres.py [--pg-batch-size N]
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import psycopg2
import psycopg2.extras
from neo4j import GraphDatabase
from app.config import settings


# ---------------------------------------------------------------------------
# Neo4j fetch — all :Transaction nodes with is_mixing property
# ---------------------------------------------------------------------------

_FETCH_ALL_QUERY = """\
MATCH (tx:Transaction)
WHERE tx.is_mixing IS NOT NULL
RETURN tx.txid AS txid,
       tx.is_mixing AS is_mixing,
       tx.chain_hops AS chain_hops
"""


def _fetch_neo4j_mixing_state(driver) -> list[dict[str, Any]]:
    """Fetch all :Transaction nodes that have is_mixing set in Neo4j."""
    with driver.session() as session:
        result = session.run(_FETCH_ALL_QUERY)
        rows = []
        for r in result:
            rows.append({
                "txid": r["txid"],
                "is_mixing": bool(r["is_mixing"]) if r["is_mixing"] is not None else False,
                "chain_hops": int(r["chain_hops"]) if r["chain_hops"] is not None else None,
            })
    return rows


# ---------------------------------------------------------------------------
# PostgreSQL update — batched parameterised UPDATE
# ---------------------------------------------------------------------------

_UPDATE_FLAGGED_SQL = """
UPDATE transactions
SET    is_mixing  = %(is_mixing)s,
       chain_hops = %(chain_hops)s
WHERE  txid = %(txid)s
"""

_CLEAR_UNFLAGGED_SQL = """
UPDATE transactions
SET    is_mixing  = false,
       chain_hops = NULL
WHERE  is_mixing = true
  AND  txid NOT IN %s
"""


def _sync_to_postgres(
    conn,
    neo4j_rows: list[dict[str, Any]],
    pg_batch_size: int,
) -> dict[str, int]:
    """
    Two-pass sync:
      Pass 1: UPDATE all rows from neo4j_rows (sets is_mixing + chain_hops correctly).
      Pass 2: Clear is_mixing=true rows in PG whose txid is NOT in the Neo4j set.

    Returns counts of rows updated in each pass.
    """
    flagged_rows = [r for r in neo4j_rows if r["is_mixing"]]
    flagged_txids = {r["txid"] for r in flagged_rows}

    # --- Pass 1: write is_mixing + chain_hops for all Neo4j rows ---
    pass1_updated = 0
    if neo4j_rows:
        with conn.cursor() as cur:
            for i in range(0, len(neo4j_rows), pg_batch_size):
                batch = neo4j_rows[i : i + pg_batch_size]
                psycopg2.extras.execute_batch(cur, _UPDATE_FLAGGED_SQL, batch, page_size=pg_batch_size)
                pass1_updated += len(batch)
        conn.commit()
        print(f"[sync]   Pass 1: {pass1_updated:,} rows updated (is_mixing + chain_hops).")
    else:
        print("[sync]   Pass 1: No rows to update (Neo4j has no is_mixing set).")

    # --- Pass 2: clear stale flags from any PG rows not in Neo4j's flagged set ---
    pass2_cleared = 0
    # Check how many PG rows currently have is_mixing=true
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM transactions WHERE is_mixing = true")
        currently_flagged_pg = cur.fetchone()[0]

    if currently_flagged_pg > 0 and flagged_txids:
        # Clear PG rows that no longer appear in Neo4j's flagged set.
        # Use a temp table approach to avoid >32767 parameter limit in IN clause.
        with conn.cursor() as cur:
            cur.execute("CREATE TEMP TABLE _phase6_flagged_txids (txid TEXT) ON COMMIT DELETE ROWS")
            psycopg2.extras.execute_values(
                cur,
                "INSERT INTO _phase6_flagged_txids (txid) VALUES %s",
                [(t,) for t in flagged_txids],
                page_size=1000,
            )
            cur.execute("""
                UPDATE transactions
                SET    is_mixing  = false,
                       chain_hops = NULL
                WHERE  is_mixing  = true
                  AND  txid NOT IN (SELECT txid FROM _phase6_flagged_txids)
            """)
            pass2_cleared = cur.rowcount
        conn.commit()
    elif currently_flagged_pg > 0 and not flagged_txids:
        # No flagged txids in Neo4j — clear everything in PG
        with conn.cursor() as cur:
            cur.execute("UPDATE transactions SET is_mixing = false, chain_hops = NULL WHERE is_mixing = true")
            pass2_cleared = cur.rowcount
        conn.commit()

    print(f"[sync]   Pass 2: {pass2_cleared:,} stale is_mixing=true rows cleared.")

    return {"pass1_updated": pass1_updated, "pass2_cleared": pass2_cleared}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def sync_mixing_to_postgres(pg_batch_size: int = 1000) -> dict[str, Any]:
    """
    Full Neo4j → PostgreSQL sync for is_mixing and chain_hops.

    Returns a metrics dict with keys:
        neo4j_rows_read   — total :Transaction rows read from Neo4j
        neo4j_mixing_true — rows with is_mixing=true in Neo4j
        pg_pass1_updated  — PG rows updated in Pass 1
        pg_pass2_cleared  — PG rows cleared in Pass 2
        elapsed_s         — wall-clock seconds
    """
    t0 = time.perf_counter()

    print("[sync] Connecting to Neo4j ...")
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    try:
        print("[sync] Fetching is_mixing state from all :Transaction nodes ...")
        neo4j_rows = _fetch_neo4j_mixing_state(driver)
    finally:
        driver.close()

    mixing_true_count = sum(1 for r in neo4j_rows if r["is_mixing"])
    print(
        f"[sync] Neo4j: {len(neo4j_rows):,} rows read, "
        f"{mixing_true_count:,} with is_mixing=true."
    )

    print("[sync] Connecting to PostgreSQL ...")
    conn = psycopg2.connect(settings.database_url)

    try:
        counts = _sync_to_postgres(conn, neo4j_rows, pg_batch_size)
    finally:
        conn.close()

    elapsed = time.perf_counter() - t0

    # Verify counts
    verify_conn = psycopg2.connect(settings.database_url)
    try:
        with verify_conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM transactions WHERE is_mixing = true")
            pg_mixing_true = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM transactions WHERE chain_hops IS NOT NULL")
            pg_chain_hops_nonnull = cur.fetchone()[0]
    finally:
        verify_conn.close()

    print(
        f"[sync] Verification: PG is_mixing=true: {pg_mixing_true:,}, "
        f"chain_hops IS NOT NULL: {pg_chain_hops_nonnull:,}."
    )
    print(f"[sync] Complete in {elapsed:.2f}s.")

    return {
        "neo4j_rows_read": len(neo4j_rows),
        "neo4j_mixing_true": mixing_true_count,
        "pg_pass1_updated": counts["pass1_updated"],
        "pg_pass2_cleared": counts["pass2_cleared"],
        "pg_mixing_true_final": pg_mixing_true,
        "pg_chain_hops_nonnull_final": pg_chain_hops_nonnull,
        "elapsed_s": elapsed,
    }


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Phase 6 — Sync is_mixing + chain_hops from Neo4j to PostgreSQL."
    )
    p.add_argument(
        "--pg-batch-size",
        type=int,
        default=1000,
        help="Rows per PostgreSQL UPDATE batch (default: 1000)",
    )
    return p


def main() -> None:
    args = _build_parser().parse_args()
    metrics = sync_mixing_to_postgres(pg_batch_size=args.pg_batch_size)
    print("\n=== Sync Metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    sys.exit(0)


if __name__ == "__main__":
    main()
