"""Phase 6 — Peeling-Chain Detector.

Two-phase approach (no APOC required; safe on Neo4j Community 5.26):

Phase A: Cypher query identifies all single-hop peeling-chain candidates:
         exactly 1 input wallet, exactly 2 output wallets, with the smaller
         output <= peel_ratio_max of total_input and the larger output >=
         change_ratio_min of total_input. Returns the txid, the large
         ("change") output wallet address, and the amount for chaining.

Phase B: Python follows the chain forward hop-by-hop via parameterised
         single-step Cypher. Tracks chain depth. When no next qualifying hop
         is found, the chain is recorded. Only chains >= min_hops are written
         back to Neo4j as is_mixing=true, chain_hops=<depth>.

Results written to Neo4j :Transaction nodes in batched UNWIND transactions.

Usage:
    python backend/scripts/detect_peeling_chains.py [options]

Options:
    --peel-ratio-max    float  Maximum fraction of total_input for the small
                               "peeled" output (default: 0.05)
    --change-ratio-min  float  Minimum fraction of total_input for the large
                               "change" output (default: 0.80)
    --min-hops          int    Minimum chain depth to flag (default: 5)
    --neo4j-batch-size  int    Nodes per UNWIND write transaction (default: 500)
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
# Phase A — single-hop candidate identification
# ---------------------------------------------------------------------------

# Returns all :Transaction nodes that satisfy the single-hop peeling predicate.
# Results include the txid, total_in, both output wallet addresses + amounts so
# the Python layer can determine which is the large ("change") wallet for
# forward chain traversal.
#
# Cypher approach:
#   1. Match a transaction with its input wallets (via SENDS) and output wallets
#      (via RECEIVES).
#   2. Use COUNT/collect to enforce exactly-1-in, exactly-2-out.
#   3. Apply ratio thresholds as parameterised comparisons.
#
# All numeric thresholds are Cypher parameters — never hardcoded literals.

_CANDIDATE_QUERY = """\
MATCH (in_w:Wallet)-[:SENDS]->(tx:Transaction)
WITH tx, count(DISTINCT in_w) AS n_in
WHERE n_in = 1
MATCH (tx)-[r:RECEIVES]->(out_w:Wallet)
WITH tx, n_in, collect({addr: out_w.address, amount: r.amount}) AS out_list
WHERE size(out_list) = 2
WITH tx,
     out_list[0] AS out0,
     out_list[1] AS out1,
     tx.total_in AS total_in
WHERE total_in IS NOT NULL AND total_in > 0
WITH tx, total_in,
     CASE WHEN out0.amount <= out1.amount THEN out0 ELSE out1 END AS small_out,
     CASE WHEN out0.amount <= out1.amount THEN out1 ELSE out0 END AS large_out
WHERE small_out.amount <= total_in * $peel_ratio_max
  AND large_out.amount >= total_in * $change_ratio_min
RETURN tx.txid AS txid,
       total_in,
       small_out.amount AS small_amt,
       large_out.amount AS large_amt,
       large_out.addr  AS change_wallet
"""

# ---------------------------------------------------------------------------
# Phase B — single-step forward traversal
# ---------------------------------------------------------------------------

# Given a wallet address (the "change" output from the previous hop), find the
# next transaction that spends it AND satisfies the peeling predicate, returning
# the next change wallet for chaining.  Returns None when chain ends.
#
# Parameter: $wallet — address of the wallet whose spend we are following.
# Parameters: $peel_ratio_max, $change_ratio_min — same threshold parameters.

_NEXT_HOP_QUERY = """\
MATCH (w:Wallet {address: $wallet})-[:SENDS]->(tx:Transaction)
WITH tx, count{ (tx)<-[:SENDS]-(:Wallet) } AS n_in
WHERE n_in = 1
MATCH (tx)-[r:RECEIVES]->(out_w:Wallet)
WITH tx, n_in, collect({addr: out_w.address, amount: r.amount}) AS out_list
WHERE size(out_list) = 2
WITH tx,
     tx.total_in AS total_in,
     out_list[0] AS out0,
     out_list[1] AS out1
WHERE total_in IS NOT NULL AND total_in > 0
WITH tx, total_in,
     CASE WHEN out0.amount <= out1.amount THEN out0 ELSE out1 END AS small_out,
     CASE WHEN out0.amount <= out1.amount THEN out1 ELSE out0 END AS large_out
WHERE small_out.amount <= total_in * $peel_ratio_max
  AND large_out.amount >= total_in * $change_ratio_min
RETURN tx.txid AS txid, large_out.addr AS change_wallet
LIMIT 1
"""

# ---------------------------------------------------------------------------
# Write-back — mark qualifying :Transaction nodes in Neo4j
# ---------------------------------------------------------------------------

_WRITE_QUERY = """\
UNWIND $batch AS row
MATCH (tx:Transaction {txid: row.txid})
SET tx.is_mixing = true,
    tx.chain_hops = row.chain_hops
"""

# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------


def _fetch_candidates(
    driver: Driver,
    peel_ratio_max: float,
    change_ratio_min: float,
) -> list[dict[str, Any]]:
    """Phase A: fetch all single-hop peeling candidates from Neo4j."""
    params = {
        "peel_ratio_max": peel_ratio_max,
        "change_ratio_min": change_ratio_min,
    }
    with driver.session() as session:
        result = session.run(_CANDIDATE_QUERY, **params)
        return [dict(r) for r in result]


def _follow_chain(
    driver: Driver,
    start_wallet: str,
    peel_ratio_max: float,
    change_ratio_min: float,
    max_depth: int = 200,
) -> list[str]:
    """Phase B: follow chain from start_wallet, returning txids of each hop (NOT the seed)."""
    params = {
        "peel_ratio_max": peel_ratio_max,
        "change_ratio_min": change_ratio_min,
    }
    chain_txids: list[str] = []
    current_wallet = start_wallet

    with driver.session() as session:
        for _ in range(max_depth):
            result = session.run(
                _NEXT_HOP_QUERY,
                wallet=current_wallet,
                **params,
            )
            record = result.single()
            if record is None:
                break
            chain_txids.append(record["txid"])
            current_wallet = record["change_wallet"]

    return chain_txids


def _write_mixing_flags(
    driver: Driver,
    flagged: list[dict[str, Any]],
    batch_size: int,
) -> int:
    """Write is_mixing=true and chain_hops to all qualifying :Transaction nodes."""
    total_written = 0
    with driver.session() as session:
        for i in range(0, len(flagged), batch_size):
            batch = flagged[i : i + batch_size]
            session.execute_write(
                lambda tx, b=batch: tx.run(_WRITE_QUERY, batch=b)
            )
            total_written += len(batch)
    return total_written


def detect_peeling_chains(
    peel_ratio_max: float = 0.05,
    change_ratio_min: float = 0.80,
    min_hops: int = 5,
    neo4j_batch_size: int = 500,
) -> dict[str, Any]:
    """
    Run the full peeling-chain detection pipeline.

    Returns a metrics dict with keys:
        candidates_found   — single-hop nodes satisfying the predicate
        chains_traced      — distinct chains followed (starting from root hops)
        chains_qualified   — chains >= min_hops
        txids_flagged      — total :Transaction nodes written with is_mixing=true
        elapsed_s          — wall-clock seconds
    """
    t0 = time.perf_counter()

    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    try:
        # Phase A: get all single-hop candidates
        print(
            f"[peeling] Phase A — fetching single-hop candidates "
            f"(peel_ratio_max={peel_ratio_max}, change_ratio_min={change_ratio_min}) ..."
        )
        candidates = _fetch_candidates(driver, peel_ratio_max, change_ratio_min)
        print(f"[peeling]   {len(candidates):,} single-hop candidates found.")

        if not candidates:
            elapsed = time.perf_counter() - t0
            return {
                "candidates_found": 0,
                "chains_traced": 0,
                "chains_qualified": 0,
                "txids_flagged": 0,
                "elapsed_s": elapsed,
            }

        # Build a lookup: txid -> change_wallet for all candidates
        # so we can identify which candidates are "root" hops (i.e., their
        # input wallet is NOT the change_wallet of another candidate).
        candidate_txids: set[str] = {c["txid"] for c in candidates}

        # change_wallets that are already outputs of another candidate —
        # chains formed by following from a non-root root will be subsets.
        # We detect chains starting from the root (the first hop of a chain)
        # to avoid double-counting.
        # Strategy: for each candidate, check if its input wallet is the
        # change_wallet of any other candidate.  That requires knowing the
        # input wallet — but our Phase A query only returns the change_wallet
        # output.  Simpler and equally correct: build chains starting from
        # ALL candidates, then deduplicate chains by their root.
        # Chains sharing nodes will overlap; we pick the longest covering set.

        # Phase B: follow chains from each candidate's change_wallet
        print(
            f"[peeling] Phase B — following chains (min_hops={min_hops}) ..."
        )

        # chain_groups: list of (root_txid, [subsequent_txids...])
        # Each entry starts with the seed candidate txid, then the chain it
        # leads into.  We keep all txids to enable the min_hops check.
        chain_groups: list[tuple[str, list[str]]] = []

        for i, cand in enumerate(candidates, 1):
            if i % 500 == 0 or i == 1:
                print(f"[peeling]   Processing candidate {i:,}/{len(candidates):,} ...", flush=True)
            subsequent = _follow_chain(
                driver,
                cand["change_wallet"],
                peel_ratio_max,
                change_ratio_min,
            )
            chain_groups.append((cand["txid"], subsequent))

        # Deduplicate overlapping chains: a chain is a subset of a longer chain
        # if all its txids appear in the longer chain.  We keep only maximal chains.
        # Build set-of-frozensets then keep only those that are not proper subsets.
        def chain_all_txids(root: str, subs: list[str]) -> frozenset[str]:
            return frozenset([root] + subs)

        all_sets = [chain_all_txids(r, s) for r, s in chain_groups]
        maximal_indices: list[int] = []
        for i, s in enumerate(all_sets):
            is_subset = any(
                s < all_sets[j] for j in range(len(all_sets)) if j != i
            )
            if not is_subset:
                maximal_indices.append(i)

        chains_to_flag: list[tuple[str, list[str]]] = [chain_groups[i] for i in maximal_indices]

        print(f"[peeling]   {len(chain_groups):,} chains traced.")
        print(f"[peeling]   {len(chains_to_flag):,} maximal chains after dedup.")

        # Apply min_hops filter: total chain length = 1 (root) + len(subsequent)
        qualified: list[tuple[str, list[str]]] = [
            (root, subs)
            for root, subs in chains_to_flag
            if (1 + len(subs)) >= min_hops
        ]

        print(
            f"[peeling]   {len(qualified):,} chains qualify (>= {min_hops} hops)."
        )

        # Collect all txids to flag with their hop depth
        flagged: list[dict[str, Any]] = []
        for root_txid, subsequent_txids in qualified:
            total_hops = 1 + len(subsequent_txids)
            for hop_pos, txid in enumerate([root_txid] + subsequent_txids):
                flagged.append({"txid": txid, "chain_hops": total_hops})

        # Deduplicate (a txid should only appear in one maximal chain)
        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for item in flagged:
            if item["txid"] not in seen:
                seen.add(item["txid"])
                deduped.append(item)

        print(
            f"[peeling]   Writing is_mixing=true to {len(deduped):,} :Transaction nodes ..."
        )
        written = _write_mixing_flags(driver, deduped, neo4j_batch_size)

        elapsed = time.perf_counter() - t0
        print(
            f"[peeling] Done. {written:,} nodes flagged in {elapsed:.2f}s."
        )

        return {
            "candidates_found": len(candidates),
            "chains_traced": len(chain_groups),
            "chains_qualified": len(qualified),
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
        description="Phase 6 — Peeling-chain detector. Writes is_mixing + chain_hops to Neo4j."
    )
    p.add_argument(
        "--peel-ratio-max",
        type=float,
        default=0.05,
        help="Max fraction of total_in for the small 'peeled' output (default: 0.05)",
    )
    p.add_argument(
        "--change-ratio-min",
        type=float,
        default=0.80,
        help="Min fraction of total_in for the large 'change' output (default: 0.80)",
    )
    p.add_argument(
        "--min-hops",
        type=int,
        default=5,
        help="Minimum chain depth to qualify (default: 5)",
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
    metrics = detect_peeling_chains(
        peel_ratio_max=args.peel_ratio_max,
        change_ratio_min=args.change_ratio_min,
        min_hops=args.min_hops,
        neo4j_batch_size=args.neo4j_batch_size,
    )
    print("\n=== Peeling-Chain Detection Metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    sys.exit(0)


if __name__ == "__main__":
    main()
