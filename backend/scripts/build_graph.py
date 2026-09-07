#!/usr/bin/env python3
"""Phase 3 — PostgreSQL → Neo4j batch graph build pipeline.

Usage:
    python backend/scripts/build_graph.py

Reads all rows from the `transactions` PostgreSQL table using keyset pagination,
then writes them to Neo4j as a property graph conforming to the SIH26146 schema.

Node / edge schema (from AGENTS.md and neo4j_init.cypher):
  (:Wallet {address})
  (:Transaction {txid, ts, total_in, total_out, fee})
  (:IP {address, country, asn, src_port})
  (:Wallet)-[:SENDS {amount, script_type}]->(:Transaction)
  (:Transaction)-[:RECEIVES {amount}]->(:Wallet)
  (:IP)-[:OBSERVED {ts, dst_port}]->(:Transaction)
  (:Wallet)-[:CO_SPEND]->(:Wallet)   # canonical addr1 < addr2 only

Memory contract:
  - PostgreSQL: keyset pagination, chunk_size=5,000 rows (never unbounded SELECT *).
  - Neo4j: all Cypher writes via `UNWIND $batch AS row`, capped at 1,000 items per tx.
"""

from __future__ import annotations

import itertools
import logging
import os
import sys
import time
import tracemalloc
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap — allow `python backend/scripts/build_graph.py` from repo root
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import psycopg2
import psycopg2.extras

from app.config import settings
from app.services.graph_service import GraphService

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("build_graph")

# ---------------------------------------------------------------------------
# Cypher queries
# ---------------------------------------------------------------------------

# 1. Upsert Wallet + Transaction + IP nodes for one chunk
_CYPHER_NODES = """
UNWIND $batch AS row
MERGE (t:Transaction {txid: row.txid})
  ON CREATE SET t.ts = row.ts,
               t.total_in = row.total_in,
               t.total_out = row.total_out,
               t.fee = row.fee
WITH t, row
UNWIND row.input_addresses AS inp_addr
MERGE (w:Wallet {address: inp_addr})
WITH t, row
UNWIND row.output_addresses AS out_addr
MERGE (w2:Wallet {address: out_addr})
WITH t, row
UNWIND CASE WHEN row.ip IS NOT NULL THEN [row.ip] ELSE [] END AS ip_row
MERGE (ip:IP {address: ip_row.address})
  ON CREATE SET ip.country = ip_row.country,
               ip.asn = ip_row.asn,
               ip.src_port = ip_row.src_port
"""

# 2. Upsert SENDS + RECEIVES edges for one edge-row list
_CYPHER_SENDS = """
UNWIND $batch AS row
MATCH (w:Wallet {address: row.wallet_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (w)-[r:SENDS {amount: row.amount, script_type: row.script_type}]->(t)
"""

_CYPHER_RECEIVES = """
UNWIND $batch AS row
MATCH (t:Transaction {txid: row.txid})
MATCH (w:Wallet {address: row.wallet_addr})
MERGE (t)-[r:RECEIVES {amount: row.amount}]->(w)
"""

# 3. Upsert OBSERVED edges
_CYPHER_OBSERVED = """
UNWIND $batch AS row
MATCH (ip:IP {address: row.ip_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (ip)-[r:OBSERVED {ts: row.ts, dst_port: row.dst_port}]->(t)
"""

# 4. Upsert CO_SPEND edges (canonical addr1 < addr2)
_CYPHER_COSPEND = """
UNWIND $batch AS row
MATCH (w1:Wallet {address: row.addr1})
MATCH (w2:Wallet {address: row.addr2})
MERGE (w1)-[:CO_SPEND]->(w2)
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decimal_to_float(v: Decimal | float | None) -> float | None:
    """Convert Decimal columns from psycopg2 to Python float."""
    if v is None:
        return None
    return float(v)


def _chunks(lst: list, size: int):
    """Yield successive sub-lists of at most *size* items."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def _build_node_batch(rows: list[dict]) -> list[dict]:
    """Convert raw PostgreSQL rows into the node-upsert batch format."""
    batch = []
    for r in rows:
        # Flatten amounts (Decimal → float)
        inp_amounts = [_decimal_to_float(a) for a in (r["input_amounts"] or [])]
        out_amounts = [_decimal_to_float(a) for a in (r["output_amounts"] or [])]
        total_in = sum(inp_amounts) if inp_amounts else 0.0
        total_out = sum(out_amounts) if out_amounts else 0.0

        ip_payload = None
        if r["src_ip"]:
            ip_payload = {
                "address": str(r["src_ip"]),
                "country": r["geo_country"] or "",
                "asn": r["asn"] or 0,
                "src_port": r["src_port"] or 0,
            }

        batch.append({
            "txid": r["txid"],
            "ts": r["ts"].isoformat() if r["ts"] else None,
            "total_in": total_in,
            "total_out": total_out,
            "fee": _decimal_to_float(r["fee"]) or 0.0,
            "input_addresses": r["input_addresses"] or [],
            "output_addresses": r["output_addresses"] or [],
            "ip": ip_payload,
        })
    return batch


def _build_sends_batch(rows: list[dict]) -> list[dict]:
    """Expand (txid, input_addresses[], input_amounts[]) → flat SENDS edge rows."""
    edges = []
    for r in rows:
        addrs = r["input_addresses"] or []
        amounts = r["input_amounts"] or []
        script = r["script_type"] or ""
        for addr, amt in zip(addrs, amounts):
            edges.append({
                "txid": r["txid"],
                "wallet_addr": addr,
                "amount": _decimal_to_float(amt) or 0.0,
                "script_type": script,
            })
    return edges


def _build_receives_batch(rows: list[dict]) -> list[dict]:
    """Expand (txid, output_addresses[], output_amounts[]) → flat RECEIVES edge rows."""
    edges = []
    for r in rows:
        addrs = r["output_addresses"] or []
        amounts = r["output_amounts"] or []
        for addr, amt in zip(addrs, amounts):
            edges.append({
                "txid": r["txid"],
                "wallet_addr": addr,
                "amount": _decimal_to_float(amt) or 0.0,
            })
    return edges


def _build_observed_batch(rows: list[dict]) -> list[dict]:
    """Build OBSERVED edge rows for rows with a src_ip."""
    edges = []
    for r in rows:
        if not r["src_ip"]:
            continue
        edges.append({
            "txid": r["txid"],
            "ip_addr": str(r["src_ip"]),
            "ts": r["ts"].isoformat() if r["ts"] else None,
            "dst_port": r["dst_port"] or 0,
        })
    return edges


def _build_cospend_batch(rows: list[dict]) -> list[dict]:
    """Build canonical CO_SPEND edge rows (addr1 < addr2, no self-loops)."""
    edges = []
    for r in rows:
        addrs = r["input_addresses"] or []
        if len(addrs) < 2:
            continue
        for a, b in itertools.combinations(addrs, 2):
            if a == b:
                continue
            addr1, addr2 = (a, b) if a < b else (b, a)
            edges.append({"addr1": addr1, "addr2": addr2})
    return edges


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_build(
    pg_url: str,
    pg_chunk_size: int = 5_000,
    neo4j_batch_size: int = 1_000,
) -> dict:
    """Stream PostgreSQL → Neo4j. Returns metrics dict.

    Args:
        pg_url: PostgreSQL connection string.
        pg_chunk_size: Rows per keyset page from PostgreSQL.
        neo4j_batch_size: Max rows per Cypher UNWIND transaction.
    """
    cypher_path = Path(__file__).resolve().parents[1] / "scripts" / "neo4j_init.cypher"

    tracemalloc.start()
    wall_start = time.perf_counter()

    stats = {
        "rows_read": 0,
        "nodes_transaction": 0,
        "nodes_wallet": 0,
        "nodes_ip": 0,
        "edges_sends": 0,
        "edges_receives": 0,
        "edges_observed": 0,
        "edges_cospend": 0,
        "wall_seconds": 0.0,
        "peak_memory_mb": 0.0,
    }

    with GraphService() as svc:
        # -- Step 1: Schema init & constraint verification -----------------
        logger.info("Running schema initialisation from %s ...", cypher_path.name)
        svc.run_schema_init(cypher_path)

        constraints = svc.verify_constraints()
        missing = [k for k, v in constraints.items() if not v]
        if missing:
            raise RuntimeError(
                f"Schema init failed — missing uniqueness constraints: {missing}. "
                "Check neo4j_init.cypher and Neo4j logs."
            )
        logger.info("Constraints verified: %s", constraints)

        # -- Step 2: PostgreSQL keyset pagination --------------------------
        logger.info("Connecting to PostgreSQL at %s ...", pg_url[:40] + "...")
        pg_conn = psycopg2.connect(pg_url)
        pg_conn.set_session(readonly=True, autocommit=True)

        cursor = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        last_id = 0
        chunk_no = 0

        while True:
            cursor.execute(
                """
                SELECT id, txid, ts, src_ip, dst_ip, src_port, dst_port,
                       input_addresses, output_addresses,
                       input_amounts, output_amounts,
                       fee, script_type, geo_country, asn
                FROM transactions
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s
                """,
                (last_id, pg_chunk_size),
            )
            rows = cursor.fetchall()
            if not rows:
                break

            chunk_no += 1
            last_id = rows[-1]["id"]
            stats["rows_read"] += len(rows)

            chunk_start = time.perf_counter()
            rows_list = [dict(r) for r in rows]

            # -- 2a. Node upserts ----------------------------------------
            node_batch = _build_node_batch(rows_list)
            for sub in _chunks(node_batch, neo4j_batch_size):
                svc.batch_write(_CYPHER_NODES, sub)
            stats["nodes_transaction"] += len(rows_list)

            # -- 2b. SENDS edges -----------------------------------------
            sends = _build_sends_batch(rows_list)
            for sub in _chunks(sends, neo4j_batch_size):
                svc.batch_write(_CYPHER_SENDS, sub)
            stats["edges_sends"] += len(sends)

            # -- 2c. RECEIVES edges ---------------------------------------
            receives = _build_receives_batch(rows_list)
            for sub in _chunks(receives, neo4j_batch_size):
                svc.batch_write(_CYPHER_RECEIVES, sub)
            stats["edges_receives"] += len(receives)

            # -- 2d. OBSERVED edges ---------------------------------------
            observed = _build_observed_batch(rows_list)
            for sub in _chunks(observed, neo4j_batch_size):
                svc.batch_write(_CYPHER_OBSERVED, sub)
            stats["edges_observed"] += len(observed)

            # -- 2e. CO_SPEND edges ---------------------------------------
            cospend = _build_cospend_batch(rows_list)
            for sub in _chunks(cospend, neo4j_batch_size):
                svc.batch_write(_CYPHER_COSPEND, sub)
            stats["edges_cospend"] += len(cospend)

            chunk_elapsed = time.perf_counter() - chunk_start
            throughput = len(rows_list) / max(chunk_elapsed, 1e-6)

            logger.info(
                "Chunk %4d | rows %7d | sends %6d | receives %6d | co_spend %6d "
                "| %.1f rows/s",
                chunk_no,
                stats["rows_read"],
                len(sends),
                len(receives),
                len(cospend),
                throughput,
            )

        cursor.close()
        pg_conn.close()

    wall_elapsed = time.perf_counter() - wall_start
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    stats["wall_seconds"] = round(wall_elapsed, 2)
    stats["peak_memory_mb"] = round(peak_bytes / 1024 / 1024, 2)

    return stats


def _append_performance_log(stats: dict, pg_url: str) -> None:
    """Append a structured Phase 3 entry to PERFORMANCE_LOG.md."""
    log_path = Path(__file__).resolve().parents[2] / "PERFORMANCE_LOG.md"
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    entry = f"""
## Phase 3 Graph Build Benchmark — {ts}

| Metric | Value |
|--------|-------|
| PostgreSQL rows read | {stats["rows_read"]:,} |
| Transaction nodes written | {stats["nodes_transaction"]:,} |
| SENDS edges written | {stats["edges_sends"]:,} |
| RECEIVES edges written | {stats["edges_receives"]:,} |
| OBSERVED edges written | {stats["edges_observed"]:,} |
| CO_SPEND edges written | {stats["edges_cospend"]:,} |
| Wall-clock time | {stats["wall_seconds"]}s |
| Throughput | {stats["rows_read"] / max(stats["wall_seconds"], 0.001):,.0f} rows/s |
| Peak memory | {stats["peak_memory_mb"]} MB |

> Keyset pagination (chunk=5,000 pg rows), Cypher UNWIND batches capped at 1,000 items each.
"""
    with log_path.open("a", encoding="utf-8") as f:
        f.write(entry)
    logger.info("Performance metrics appended to %s", log_path.name)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    pg_url = settings.database_url

    logger.info("=" * 70)
    logger.info("Phase 3 — PostgreSQL → Neo4j Graph Build")
    logger.info("  PostgreSQL: %s", pg_url[:60])
    logger.info("  Neo4j:      %s", settings.neo4j_uri)
    logger.info("  PG chunk:   %d rows  |  Neo4j batch: %d items", settings.graph_pg_chunk_size, settings.graph_neo4j_batch_size)
    logger.info("=" * 70)

    stats = run_build(
        pg_url=pg_url,
        pg_chunk_size=settings.graph_pg_chunk_size,
        neo4j_batch_size=settings.graph_neo4j_batch_size,
    )

    logger.info("=" * 70)
    logger.info("Build complete.")
    logger.info("  Rows read        : %d", stats["rows_read"])
    logger.info("  SENDS edges      : %d", stats["edges_sends"])
    logger.info("  RECEIVES edges   : %d", stats["edges_receives"])
    logger.info("  OBSERVED edges   : %d", stats["edges_observed"])
    logger.info("  CO_SPEND edges   : %d", stats["edges_cospend"])
    logger.info("  Wall time        : %.2fs", stats["wall_seconds"])
    logger.info("  Peak memory      : %.2f MB", stats["peak_memory_mb"])
    logger.info("=" * 70)

    _append_performance_log(stats, pg_url)
