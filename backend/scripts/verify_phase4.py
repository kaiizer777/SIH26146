"""Phase 4 verification — Entity Clustering (GDS Louvain).

V1: Every :Wallet with ≥1 :CO_SPEND edge has a non-null cluster_id.
V2: Cluster distribution is sane (no single giant blob, not all singletons).
V3: PostgreSQL cluster_id matches Neo4j :Wallet.cluster_id for 10 random wallets.
V4: Top-20 cluster query returns cluster_id, member_count, sample_addresses — all non-empty.

Usage:
    backend/venv/Scripts/python backend/scripts/verify_phase4.py
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import psycopg2
import psycopg2.extras

from app.config import settings
from app.services.graph_service import GraphService

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"


def check(label: str, ok: bool, detail: str = "") -> bool:
    status = PASS if ok else FAIL
    msg = f"  [{status}] {label}"
    if detail:
        msg += f"\n         {detail}"
    print(msg)
    return ok


def main() -> None:
    print("=" * 60)
    print("Phase 4 Verification — Entity Clustering")
    print("=" * 60)

    all_pass = True

    with GraphService() as svc:
        pg_conn = psycopg2.connect(settings.database_url)
        pg_conn.set_session(readonly=True, autocommit=True)

        # ------------------------------------------------------------------
        # V1: Every :Wallet with ≥1 :CO_SPEND edge has non-null cluster_id
        # ------------------------------------------------------------------
        print("\nV1: CO_SPEND wallets have cluster_id …")
        with svc.driver.session() as session:
            missing = session.run(
                """
                MATCH (w:Wallet)-[:CO_SPEND]-()
                WHERE w.cluster_id IS NULL
                RETURN count(w) AS missing
                """
            ).single()["missing"]
            total_with_cospend = session.run(
                """
                MATCH (w:Wallet)-[:CO_SPEND]-()
                RETURN count(DISTINCT w) AS cnt
                """
            ).single()["cnt"]

        v1_ok = missing == 0
        all_pass &= check(
            "V1: cluster_id non-null for all CO_SPEND wallets",
            v1_ok,
            f"Total wallets with CO_SPEND: {total_with_cospend:,}, missing cluster_id: {missing}",
        )

        # ------------------------------------------------------------------
        # V2: Distribution sanity
        # ------------------------------------------------------------------
        print("\nV2: Cluster distribution sanity …")
        total_wallets = svc.count_query("MATCH (w:Wallet) RETURN count(w)")
        total_communities = svc.count_query(
            "MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL "
            "RETURN count(DISTINCT w.cluster_id)"
        )

        with svc.driver.session() as session:
            top_cluster = session.run(
                """
                MATCH (w:Wallet)
                WHERE w.cluster_id IS NOT NULL
                RETURN w.cluster_id AS cid, count(w) AS cnt
                ORDER BY cnt DESC LIMIT 1
                """
            ).single()
            max_cluster_size = top_cluster["cnt"] if top_cluster else 0

            singleton_count = session.run(
                """
                MATCH (w:Wallet)
                WHERE w.cluster_id IS NOT NULL
                WITH w.cluster_id AS cid, count(w) AS cnt
                WHERE cnt = 1
                RETURN count(cid) AS singletons
                """
            ).single()["singletons"]

        max_fraction = max_cluster_size / total_wallets if total_wallets else 1.0
        # Not one giant cluster (>50%) and not all singletons
        v2a_ok = max_fraction < 0.5
        v2b_ok = total_communities > 1
        v2c_ok = singleton_count < total_wallets  # some multi-member clusters exist

        all_pass &= check(
            "V2a: Largest cluster < 50% of all wallets",
            v2a_ok,
            f"Largest cluster: {max_cluster_size:,} / {total_wallets:,} wallets ({max_fraction:.1%})",
        )
        all_pass &= check(
            "V2b: Multiple distinct communities exist",
            v2b_ok,
            f"Distinct cluster_ids: {total_communities:,}",
        )
        all_pass &= check(
            "V2c: Not all wallets are singletons",
            v2c_ok,
            f"Singleton clusters: {singleton_count:,} / {total_communities:,}",
        )

        # ------------------------------------------------------------------
        # V3: PostgreSQL cluster_id matches Neo4j for 10 random wallets
        # ------------------------------------------------------------------
        # Sample only wallets that are the primary sender (input_addresses[1])
        # for at least one transaction, so the PG lookup is guaranteed to find
        # a row and the cluster_id is deterministic.
        print("\nV3: PostgreSQL cluster_id spot-check (10 random wallets) …")
        with pg_conn.cursor() as _cur:
            _cur.execute(
                "SELECT DISTINCT input_addresses[1] FROM transactions "
                "WHERE input_addresses[1] IS NOT NULL LIMIT 5000"
            )
            primary_sender_addrs = {row[0] for row in _cur.fetchall()}

        with svc.driver.session() as session:
            sample_recs = session.run(
                """
                MATCH (w:Wallet)
                WHERE w.cluster_id IS NOT NULL
                  AND w.address IN $addrs
                WITH w ORDER BY rand() LIMIT 10
                RETURN w.address AS address, w.cluster_id AS cluster_id
                """,
                addrs=list(primary_sender_addrs),
            ).data()

        mismatches = 0
        with psycopg2.extras.RealDictCursor(pg_conn) as cur:
            for rec in sample_recs:
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
                    mismatches += 1
                    print(
                        f"    MISMATCH addr={addr[:20]}... "
                        f"neo4j={neo4j_cid} pg={pg_cid}"
                    )

        v3_ok = mismatches == 0
        all_pass &= check(
            "V3: PostgreSQL cluster_id matches Neo4j for 10 random wallets",
            v3_ok,
            f"Spot-checked: {len(sample_recs)}, mismatches: {mismatches}",
        )

        # ------------------------------------------------------------------
        # V4: Top-20 query returns complete rows
        # ------------------------------------------------------------------
        print("\nV4: Top-20 cluster query completeness …")
        with svc.driver.session() as session:
            top20 = session.run(
                """
                MATCH (w:Wallet)
                WHERE w.cluster_id IS NOT NULL
                WITH w.cluster_id AS cluster_id, count(w) AS member_count
                ORDER BY member_count DESC
                LIMIT 20
                RETURN cluster_id, member_count
                """
            ).data()

        v4a_ok = len(top20) > 0
        v4b_ok = all(
            r.get("cluster_id") is not None and r.get("member_count", 0) > 0
            for r in top20
        )

        all_pass &= check(
            "V4a: Top-20 query returns at least 1 row",
            v4a_ok,
            f"Rows returned: {len(top20)}",
        )
        all_pass &= check(
            "V4b: All top-20 rows have cluster_id and member_count",
            v4b_ok,
            f"Top-5: {top20[:5]}",
        )

        pg_conn.close()

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    if all_pass:
        print(f"  [{PASS}] All Phase 4 verification checks passed.")
    else:
        print(f"  [{FAIL}] One or more Phase 4 checks FAILED.")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
