"""Phase 6 — CoinJoin Detector.

Detection predicate (applied in two stages):

Stage 1 — Cypher candidate fetch (all thresholds as Cypher parameters):
  - tx.total_in >= min_btc
  - COUNT(DISTINCT input wallets) >= min_inputs
  - COUNT(DISTINCT output wallets) >= min_outputs

Stage 2 — Python equal-output filter:
  - Sort the collected RECEIVES amounts for the transaction.
  - Use a sliding window to count the number of output amounts that fall
    within relative_tolerance of each other (|a - b| / max(a, b) <= tol).
  - A transaction qualifies if the maximum equal-output group size >= min_equal_outputs.

Qualifying :Transaction nodes are written with is_mixing=true via batched
UNWIND.

Usage:
    python backend/scripts/detect_coinjoin.py [options]

Options:
    --min-inputs          int   Minimum number of distinct input wallets (default: 3)
    --min-outputs         int   Minimum number of distinct output wallets (default: 3)
    --min-btc             float Minimum total_in in BTC (default: 0.05)
    --min-equal-outputs   int   Minimum count of outputs within tolerance (default: 2)
    --relative-tolerance  float Relative tolerance for "equal" amounts (default: 0.01 = ±1%)
    --neo4j-batch-size    int   Nodes per UNWIND write transaction (default: 500)
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

from neo4j import GraphDatabase, Driver
from app.config import settings


# ---------------------------------------------------------------------------
# Stage 1 — Cypher candidate fetch
# ---------------------------------------------------------------------------

# Fetches candidates passing the structural (count + total_in) gates.
# Returns txid and all RECEIVES amounts so the Python layer can evaluate
# the equal-output predicate without a second round-trip.
#
# Note: total_in is stored on :Transaction as a property (written in Phase 3
# build_graph.py).  The RECEIVES relationship carries the `amount` property.
# All numeric thresholds are Cypher parameters.

_CANDIDATE_QUERY = """\
MATCH (in_w:Wallet)-[:SENDS]->(tx:Transaction)
WHERE tx.total_in >= $min_btc
WITH tx, count(DISTINCT in_w) AS n_in
WHERE n_in >= $min_inputs
MATCH (tx)-[r:RECEIVES]->(out_w:Wallet)
WITH tx, n_in, count(DISTINCT out_w) AS n_out, collect(r.amount) AS out_amounts
WHERE n_out >= $min_outputs
RETURN tx.txid AS txid,
       tx.total_in AS total_in,
       n_in,
       n_out,
       out_amounts
"""

# ---------------------------------------------------------------------------
# Stage 2 — Python equal-output filter
# ---------------------------------------------------------------------------


def _max_equal_output_group(amounts: list[float], relative_tolerance: float) -> int:
    """
    Return the size of the largest group of amounts that are pairwise within
    relative_tolerance of each other.

    Algorithm: sort amounts, then for each starting index i count how many
    subsequent amounts satisfy |a_j - a_i| / max(a_j, a_i) <= tol.
    This is O(n^2) in the worst case but n (output count) is small (typically 3-20).

    A small epsilon (1e-9 relative) is added to the tolerance comparison to
    guard against IEEE 754 rounding (e.g. |0.1 - 0.099| / 0.1 computing as
    0.010000000000000009 instead of exactly 0.01).

    Args:
        amounts:            List of output amounts (floats).
        relative_tolerance: Maximum |a - b| / max(a, b) to consider equal.

    Returns:
        Integer count of the largest equal group, or 0 if amounts is empty.
    """
    if not amounts:
        return 0

    _EPS = 1e-9  # guard against IEEE 754 rounding at the boundary
    sorted_amts = sorted(amounts)
    max_group = 1

    for i in range(len(sorted_amts)):
        group = 1
        a_i = sorted_amts[i]
        for j in range(i + 1, len(sorted_amts)):
            a_j = sorted_amts[j]
            denom = max(a_i, a_j)
            if denom <= 0:
                continue
            if abs(a_j - a_i) / denom <= relative_tolerance + _EPS:
                group += 1
        max_group = max(max_group, group)

    return max_group


# ---------------------------------------------------------------------------
# Write-back — mark qualifying :Transaction nodes in Neo4j
# ---------------------------------------------------------------------------

_WRITE_QUERY = """\
UNWIND $batch AS row
MATCH (tx:Transaction {txid: row.txid})
SET tx.is_mixing = true
"""


def _write_mixing_flags(
    driver: Driver,
    txids: list[str],
    batch_size: int,
) -> int:
    """Write is_mixing=true to qualifying :Transaction nodes."""
    batch_data = [{"txid": txid} for txid in txids]
    total_written = 0
    with driver.session() as session:
        for i in range(0, len(batch_data), batch_size):
            batch = batch_data[i : i + batch_size]
            session.execute_write(
                lambda tx, b=batch: tx.run(_WRITE_QUERY, batch=b)
            )
            total_written += len(batch)
    return total_written


# ---------------------------------------------------------------------------
# Core detection logic
# ---------------------------------------------------------------------------


def detect_coinjoin(
    min_inputs: int = 3,
    min_outputs: int = 3,
    min_btc: float = 0.05,
    min_equal_outputs: int = 2,
    relative_tolerance: float = 0.01,
    neo4j_batch_size: int = 500,
) -> dict[str, Any]:
    """
    Run the full CoinJoin detection pipeline.

    Returns a metrics dict with keys:
        candidates_fetched  — transactions passing the Cypher structural gate
        coinjoin_qualified  — transactions also passing the equal-output filter
        txids_flagged       — :Transaction nodes written with is_mixing=true
        elapsed_s           — wall-clock seconds
    """
    t0 = time.perf_counter()

    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    try:
        print(
            f"[coinjoin] Stage 1 — Cypher candidate fetch "
            f"(min_inputs={min_inputs}, min_outputs={min_outputs}, "
            f"min_btc={min_btc}) ..."
        )
        params = {
            "min_btc": float(min_btc),
            "min_inputs": int(min_inputs),
            "min_outputs": int(min_outputs),
        }
        with driver.session() as session:
            result = session.run(_CANDIDATE_QUERY, **params)
            candidates = [dict(r) for r in result]

        print(f"[coinjoin]   {len(candidates):,} structural candidates fetched.")

        if not candidates:
            elapsed = time.perf_counter() - t0
            return {
                "candidates_fetched": 0,
                "coinjoin_qualified": 0,
                "txids_flagged": 0,
                "elapsed_s": elapsed,
            }

        # Stage 2: Python equal-output filter
        print(
            f"[coinjoin] Stage 2 — equal-output filter "
            f"(min_equal_outputs={min_equal_outputs}, "
            f"relative_tolerance={relative_tolerance}) ..."
        )
        qualified_txids: list[str] = []
        for cand in candidates:
            raw_amounts = cand.get("out_amounts") or []
            # Neo4j returns Decimal-like objects; coerce to float safely.
            amounts = []
            for a in raw_amounts:
                try:
                    amounts.append(float(a))
                except (TypeError, ValueError):
                    pass

            group_size = _max_equal_output_group(amounts, relative_tolerance)
            if group_size >= min_equal_outputs:
                qualified_txids.append(cand["txid"])

        print(
            f"[coinjoin]   {len(qualified_txids):,} transactions pass equal-output filter."
        )

        if not qualified_txids:
            elapsed = time.perf_counter() - t0
            return {
                "candidates_fetched": len(candidates),
                "coinjoin_qualified": 0,
                "txids_flagged": 0,
                "elapsed_s": elapsed,
            }

        print(
            f"[coinjoin] Writing is_mixing=true to {len(qualified_txids):,} nodes ..."
        )
        written = _write_mixing_flags(driver, qualified_txids, neo4j_batch_size)

        elapsed = time.perf_counter() - t0
        print(f"[coinjoin] Done. {written:,} nodes flagged in {elapsed:.2f}s.")

        return {
            "candidates_fetched": len(candidates),
            "coinjoin_qualified": len(qualified_txids),
            "txids_flagged": written,
            "elapsed_s": elapsed,
        }

    finally:
        driver.close()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Phase 6 — CoinJoin detector. Writes is_mixing=true to Neo4j :Transaction nodes."
    )
    p.add_argument(
        "--min-inputs",
        type=int,
        default=3,
        help="Minimum distinct input wallets (default: 3)",
    )
    p.add_argument(
        "--min-outputs",
        type=int,
        default=3,
        help="Minimum distinct output wallets (default: 3)",
    )
    p.add_argument(
        "--min-btc",
        type=float,
        default=0.05,
        help="Minimum total_in in BTC (default: 0.05)",
    )
    p.add_argument(
        "--min-equal-outputs",
        type=int,
        default=2,
        help="Minimum count of equal-value outputs (default: 2)",
    )
    p.add_argument(
        "--relative-tolerance",
        type=float,
        default=0.01,
        help="Relative tolerance for equal outputs, e.g. 0.01 = ±1%% (default: 0.01)",
    )
    p.add_argument(
        "--neo4j-batch-size",
        type=int,
        default=500,
        help="Nodes per UNWIND write transaction (default: 500)",
    )
    return p


def main() -> None:
    args = _build_parser().parse_args()
    metrics = detect_coinjoin(
        min_inputs=args.min_inputs,
        min_outputs=args.min_outputs,
        min_btc=args.min_btc,
        min_equal_outputs=args.min_equal_outputs,
        relative_tolerance=args.relative_tolerance,
        neo4j_batch_size=args.neo4j_batch_size,
    )
    print("\n=== CoinJoin Detection Metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    sys.exit(0)


if __name__ == "__main__":
    main()
