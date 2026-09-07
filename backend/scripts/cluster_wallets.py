"""Phase 4 — Entity Clustering (F1): Neo4j GDS Louvain.

Verified against GDS 2.13.12 running in sih26146-neo4j.

Steps:
    1. Drop stale in-memory projection (idempotent).
    2. Project :Wallet nodes + :CO_SPEND relationships (UNDIRECTED).
    3. Run gds.louvain.write → writes cluster_id to each :Wallet.
    4. Verify: every wallet with ≥1 CO_SPEND edge has a non-null cluster_id.
    5. Sync cluster_id back to PostgreSQL transactions table.
    6. Run top-20 cluster query; save to data/top20_clusters.json.
    7. Append metrics to PERFORMANCE_LOG.md.

Usage:
    backend/venv/Scripts/python backend/scripts/cluster_wallets.py
"""

from __future__ import annotations

import io
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Force UTF-8 stdout/stderr on Windows (CP1252 can't encode arrows/ellipsis).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Path bootstrap — allow running from project root or backend/
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import psycopg2
import psycopg2.extras

from app.config import settings
from app.services.graph_service import GraphService

# ---------------------------------------------------------------------------
# Constants — GDS parameters for Louvain (GDS 2.13.x recommended defaults)
# Documented here so they appear in PERFORMANCE_LOG and are not magic numbers.
# ---------------------------------------------------------------------------
GRAPH_NAME = "wallet_cospend"
LOUVAIN_MAX_LEVELS = 10       # GDS 2.13 default; controls max hierarchy depth
LOUVAIN_TOLERANCE = 0.0001    # GDS 2.13 default; modularity delta convergence
LOUVAIN_WRITE_PROPERTY = "cluster_id"

TOP_N_CLUSTERS = 20           # clusters to export for Phase 9 dashboard
SAMPLE_ADDRS_PER_CLUSTER = 5  # sample member addresses to include in JSON

_PERF_LOG = _PROJECT_ROOT / "PERFORMANCE_LOG.md"
_TOP20_JSON = _PROJECT_ROOT / "data" / "top20_clusters.json"


# ---------------------------------------------------------------------------
# Step 1 + 2: Project in-memory graph
# ---------------------------------------------------------------------------

def project_graph(svc: GraphService) -> dict:
    """Drop any stale projection, then project :Wallet + :CO_SPEND UNDIRECTED."""
    # Drop stale projection if it exists (idempotent).
    with svc.driver.session() as session:
        session.run(
            "CALL gds.graph.drop($name, false) YIELD graphName",
            name=GRAPH_NAME,
        )
        print(f"  Dropped stale projection '{GRAPH_NAME}' (if any).")

    print(f"  Projecting '{GRAPH_NAME}': :Wallet nodes + :CO_SPEND UNDIRECTED …")
    t0 = time.time()
    with svc.driver.session() as session:
        result = session.run(
            """
            CALL gds.graph.project(
                $graphName,
                'Wallet',
                {
                    CO_SPEND: { orientation: 'UNDIRECTED' }
                }
            )
            YIELD graphName, nodeCount, relationshipCount, projectMillis
            """,
            graphName=GRAPH_NAME,
        ).single()
    elapsed = time.time() - t0

    stats = {
        "graphName": result["graphName"],
        "nodeCount": result["nodeCount"],
        "relationshipCount": result["relationshipCount"],
        "projectMillis": result["projectMillis"],
        "elapsed_s": round(elapsed, 2),
    }
    print(
        f"  Projected: {stats['nodeCount']:,} nodes, "
        f"{stats['relationshipCount']:,} relationships in {stats['elapsed_s']}s"
    )
    return stats


# ---------------------------------------------------------------------------
# Step 3: Run Louvain write
# ---------------------------------------------------------------------------

def run_louvain(svc: GraphService) -> dict:
    """Run gds.louvain.write, returning key metrics."""
    print(
        f"  Running gds.louvain.write (maxLevels={LOUVAIN_MAX_LEVELS}, "
        f"tolerance={LOUVAIN_TOLERANCE}, writeProperty='{LOUVAIN_WRITE_PROPERTY}') …"
    )
    t0 = time.time()
    with svc.driver.session() as session:
        result = session.run(
            """
            CALL gds.louvain.write(
                $graphName,
                {
                    writeProperty: $writeProperty,
                    maxLevels:     $maxLevels,
                    tolerance:     $tolerance
                }
            )
            YIELD
                communityCount,
                modularity,
                ranLevels,
                nodePropertiesWritten,
                writeMillis,
                computeMillis
            """,
            graphName=GRAPH_NAME,
            writeProperty=LOUVAIN_WRITE_PROPERTY,
            maxLevels=LOUVAIN_MAX_LEVELS,
            tolerance=LOUVAIN_TOLERANCE,
        ).single()
    elapsed = time.time() - t0

    stats = {
        "communityCount": result["communityCount"],
        "modularity": round(result["modularity"], 6),
        "ranLevels": result["ranLevels"],
        "nodePropertiesWritten": result["nodePropertiesWritten"],
        "writeMillis": result["writeMillis"],
        "computeMillis": result["computeMillis"],
        "elapsed_s": round(elapsed, 2),
    }
    print(
        f"  Louvain done: {stats['communityCount']:,} communities, "
        f"modularity={stats['modularity']}, ranLevels={stats['ranLevels']}, "
        f"{stats['nodePropertiesWritten']:,} properties written, "
        f"elapsed={stats['elapsed_s']}s"
    )
    return stats


# ---------------------------------------------------------------------------
# Step 4: Verify — wallets with CO_SPEND edges must have non-null cluster_id
# ---------------------------------------------------------------------------

def verify_cluster_ids(svc: GraphService) -> None:
    """Assert every :Wallet with ≥1 :CO_SPEND edge has cluster_id written."""
    print("  Verifying: checking for wallets with CO_SPEND edges missing cluster_id …")
    with svc.driver.session() as session:
        missing = session.run(
            """
            MATCH (w:Wallet)-[:CO_SPEND]-()
            WHERE w.cluster_id IS NULL
            RETURN count(w) AS missing
            """
        ).single()["missing"]

    if missing > 0:
        raise RuntimeError(
            f"VERIFICATION FAILED: {missing} wallets with CO_SPEND edges have null cluster_id. "
            "Louvain write may not have completed."
        )

    total_with_cluster = svc.count_query(
        "MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL RETURN count(w)"
    )
    total_wallets = svc.count_query("MATCH (w:Wallet) RETURN count(w)")
    print(
        f"  OK: {total_with_cluster:,} / {total_wallets:,} wallets have cluster_id written."
    )


# ---------------------------------------------------------------------------
# Step 5: Sync cluster_id → PostgreSQL
# ---------------------------------------------------------------------------

def sync_cluster_ids_to_postgres(svc: GraphService) -> dict:
    """Pull (address, cluster_id) from Neo4j and UPDATE PostgreSQL transactions.

    Strategy:
        - Fetch all (address, cluster_id) pairs from Neo4j in one pass.
        - For each wallet address that appears as ANY element in
          input_addresses[] or output_addresses[], set cluster_id.
        - Uses a temp table + unnest JOIN for bulk update — O(n) not per-row.
    """
    print("  Fetching (address, cluster_id) from Neo4j …")
    t0 = time.time()
    with svc.driver.session() as session:
        records = session.run(
            "MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL "
            "RETURN w.address AS address, w.cluster_id AS cluster_id"
        ).data()
    fetch_elapsed = time.time() - t0
    print(f"  Fetched {len(records):,} (address, cluster_id) pairs in {fetch_elapsed:.2f}s")

    if not records:
        print("  WARNING: no cluster_id records to sync.")
        return {"rows_fetched": 0, "rows_updated": 0, "elapsed_s": 0.0}

    print("  Syncing to PostgreSQL via temp table + unnest JOIN …")
    t1 = time.time()
    conn = psycopg2.connect(settings.database_url)
    try:
        with conn:
            with conn.cursor() as cur:
                # Create temp table with (address TEXT, cluster_id INT)
                cur.execute("""
                    CREATE TEMP TABLE _wallet_clusters (
                        address TEXT NOT NULL,
                        cluster_id INTEGER NOT NULL
                    ) ON COMMIT DROP
                """)

                # Bulk-load via copy_expert
                buf = io.StringIO()
                for rec in records:
                    buf.write(f"{rec['address']}\t{rec['cluster_id']}\n")
                buf.seek(0)
                cur.copy_expert(
                    "COPY _wallet_clusters (address, cluster_id) FROM STDIN WITH (FORMAT TEXT)",
                    buf,
                )

                # Use input_addresses[1] (PostgreSQL is 1-indexed) — the first
                # sender wallet — for a deterministic, unambiguous assignment.
                # For multi-input transactions, wallets can land in different
                # Louvain communities despite sharing a :CO_SPEND edge (Louvain
                # optimises modularity, not connectivity). ANY() would
                # non-deterministically pick whichever match the planner finds
                # first, causing spurious V3 mismatches.
                cur.execute("""
                    UPDATE transactions t
                    SET cluster_id = wc.cluster_id
                    FROM _wallet_clusters wc
                    WHERE wc.address = t.input_addresses[1]
                """)
                updated_via_input = cur.rowcount

                # Intentionally NOT updating via output_addresses:
                # transactions get the SENDER's (input wallet) cluster_id.
                # Every transaction has >= 1 input address, and every wallet
                # has a cluster_id from Louvain, so coverage is always 100%.

        pg_elapsed = time.time() - t1
        print(
            f"  PostgreSQL: {updated_via_input:,} rows updated via input_addresses, "
            f"elapsed={pg_elapsed:.2f}s"
        )
        return {
            "rows_fetched": len(records),
            "rows_updated": updated_via_input,
            "total_rows_updated": updated_via_input,
            "elapsed_s": round(time.time() - t0, 2),
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Step 6: Top-20 largest clusters query
# ---------------------------------------------------------------------------

def compute_top20_clusters(svc: GraphService) -> list[dict]:
    """Return top-20 clusters by member count with sample addresses.

    Output structure (per cluster):
        {
            "cluster_id": int,
            "member_count": int,
            "sample_addresses": [str, ...]   # up to SAMPLE_ADDRS_PER_CLUSTER
        }
    """
    print(f"  Computing top-{TOP_N_CLUSTERS} clusters by member count …")
    with svc.driver.session() as session:
        # Aggregate member counts per cluster_id
        counts = session.run(
            """
            MATCH (w:Wallet)
            WHERE w.cluster_id IS NOT NULL
            RETURN w.cluster_id AS cluster_id, count(w) AS member_count
            ORDER BY member_count DESC
            LIMIT $limit
            """,
            limit=TOP_N_CLUSTERS,
        ).data()

    results = []
    with svc.driver.session() as session:
        for row in counts:
            cid = row["cluster_id"]
            member_count = row["member_count"]
            # Fetch sample addresses for this cluster
            samples = session.run(
                """
                MATCH (w:Wallet {cluster_id: $cid})
                RETURN w.address AS address
                LIMIT $k
                """,
                cid=cid,
                k=SAMPLE_ADDRS_PER_CLUSTER,
            ).data()
            results.append({
                "cluster_id": cid,
                "member_count": member_count,
                "sample_addresses": [s["address"] for s in samples],
            })

    print(
        f"  Top-{TOP_N_CLUSTERS}: largest cluster has "
        f"{results[0]['member_count']:,} members, "
        f"smallest in top-{TOP_N_CLUSTERS} has {results[-1]['member_count']:,}."
    )
    return results


# ---------------------------------------------------------------------------
# Append to PERFORMANCE_LOG.md
# ---------------------------------------------------------------------------

def append_perf_log(proj_stats: dict, louvain_stats: dict, sync_stats: dict) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    entry = f"""
## Phase 4 — Entity Clustering (GDS Louvain) — {ts}

| Metric | Value |
|---|---|
| GDS version | 2.13.12 |
| Louvain maxLevels | {LOUVAIN_MAX_LEVELS} |
| Louvain tolerance | {LOUVAIN_TOLERANCE} |
| Graph projection: nodeCount | {proj_stats['nodeCount']:,} |
| Graph projection: relationshipCount | {proj_stats['relationshipCount']:,} |
| Graph projection time | {proj_stats['elapsed_s']}s |
| Louvain communityCount | {louvain_stats['communityCount']:,} |
| Louvain modularity | {louvain_stats['modularity']} |
| Louvain ranLevels | {louvain_stats['ranLevels']} |
| Louvain nodePropertiesWritten | {louvain_stats['nodePropertiesWritten']:,} |
| Louvain elapsed | {louvain_stats['elapsed_s']}s |
| PostgreSQL rows updated | {sync_stats.get('total_rows_updated', 'N/A'):,} |
| PostgreSQL sync elapsed | {sync_stats.get('elapsed_s', 'N/A')}s |

"""
    with open(_PERF_LOG, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"  Appended metrics to {_PERF_LOG.name}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("Phase 4 — Entity Clustering (GDS Louvain)")
    print("=" * 60)

    with GraphService() as svc:
        # 1+2: Project graph
        print("\n[1/5] Projecting in-memory wallet graph …")
        proj_stats = project_graph(svc)

        # 3: Run Louvain
        print("\n[2/5] Running Louvain community detection …")
        louvain_stats = run_louvain(svc)

        # 4: Verify
        print("\n[3/5] Verifying cluster_id written to all CO_SPEND wallets …")
        verify_cluster_ids(svc)

        # 5: Sync to PostgreSQL
        print("\n[4/5] Syncing cluster_id to PostgreSQL …")
        sync_stats = sync_cluster_ids_to_postgres(svc)

        # 6: Top-20 clusters
        print("\n[5/5] Computing top-20 clusters …")
        top20 = compute_top20_clusters(svc)

    # Save top-20 JSON
    _TOP20_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(_TOP20_JSON, "w", encoding="utf-8") as f:
        json.dump(top20, f, indent=2)
    print(f"  Saved top-20 cluster data -> {_TOP20_JSON}")

    # Append to performance log
    append_perf_log(proj_stats, louvain_stats, sync_stats)

    print("\n" + "=" * 60)
    print("Phase 4 COMPLETE.")
    print(f"  Communities: {louvain_stats['communityCount']:,}")
    print(f"  Modularity:  {louvain_stats['modularity']}")
    print(f"  PostgreSQL rows updated: {sync_stats.get('total_rows_updated', 'N/A')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
