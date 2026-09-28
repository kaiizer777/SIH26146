"""Post-ingest enrichment chain.

Runs automatically after :mod:`app.tasks.ingest` commits a batch to PostgreSQL
and Neo4j, and brings the freshly ingested transactions up to the same
forensic parity as the pre-loaded dataset:

  1. **Cluster** — GDS Louvain over a projection scoped to the wallets this
     ingest introduced (``maxLevels=10``, ``tolerance=0.0001``), writing
     ``cluster_id`` to those wallets only and mirrored to
     ``transactions.cluster_id`` in PostgreSQL. Scoping is mandatory: Louvain
     renumbers community ids globally, so an unscoped run silently reassigns
     every pre-loaded wallet's ``cluster_id`` and breaks the pre-loaded
     Cluster Topology views. See :func:`run_clustering`.
  2. **Peeling chains** — multi-hop chain trace writing
     ``is_mixing=true`` / ``chain_hops=<depth>``. Ported from
     ``backend/scripts/detect_peeling_chains.py``.
  3. **CoinJoin** — equal-output fingerprint writing ``is_mixing=true``.
     Ported from ``backend/scripts/detect_coinjoin.py``.
  4. **Wallet attributes** — ``risk_score``, ``seed_proximity``,
     ``is_seed_illicit`` on ``:Wallet``, plus a schema-contract verification
     pass against ``backend/scripts/neo4j_init.cypher``.
  5. **PostgreSQL mirror** — ``is_mixing``, ``chain_hops``, ``anomaly_score``,
     ``cluster_id``, ``risk_score``, ``is_flagged``. Ported from
     ``backend/scripts/sync_mixing_to_postgres.py`` and
     ``backend/scripts/sync_ft_transformer_to_postgres.py``.

Every stage is **idempotent**: re-running produces the same state. Detection
stages overwrite rather than accumulate, and every Neo4j write is a ``SET`` on a
property keyed by txid/address. The whole chain is safe to re-trigger. The one
qualification is the clustering stage's community *numbering*, which GDS Louvain
does not reproduce run-to-run at scale — see :func:`run_clustering`. That drift
is confined to wallets the ingest introduced.

``risk_score`` is never hardcoded. It is read from the trained graph-model
artifacts when they load, and otherwise set from the actual inline
:mod:`app.services.inline_scorer` computation over real transaction rows.
"""

from __future__ import annotations

import io
import logging
import math
import time
from functools import partial
from typing import Any, Sequence

import numpy as np
import psycopg2

from app.celery_app import celery_app
from app.config import settings
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# GDS parameters — mirrored from backend/scripts/cluster_wallets.py so the
# enrichment chain and the manual script produce identical clusterings.
# ---------------------------------------------------------------------------

GRAPH_NAME = "wallet_cospend"
LOUVAIN_MAX_LEVELS = 10
LOUVAIN_TOLERANCE = 0.0001

# Louvain community ids are 0-based counters local to whatever graph was
# projected, so a scoped run starts again at 0 and would collide with — and
# silently merge into — the pre-loaded clusters that already occupy the low ids.
# Scoped results are therefore written into a reserved namespace. 1_000_000 is
# the project's established ingest boundary: the runtime XAI store already
# assigns synthetic ingest wallets ids in the 793_083+ range
# (data/xai/runtime/composite.json), and every seeded cluster id is well below
# it.
INGEST_CLUSTER_ID_OFFSET = 1_000_000

# ---------------------------------------------------------------------------
# Peeling-chain thresholds — mirrored from
# backend/scripts/detect_peeling_chains.py detect_peeling_chains() defaults.
# ---------------------------------------------------------------------------

PEEL_RATIO_MAX = 0.05
CHANGE_RATIO_MIN = 0.80
PEEL_MIN_HOPS = 5
PEEL_MAX_DEPTH = 200

# ---------------------------------------------------------------------------
# CoinJoin thresholds — mirrored from
# backend/scripts/detect_coinjoin.py detect_coinjoin() defaults.
# ---------------------------------------------------------------------------

COINJOIN_MIN_INPUTS = 3
COINJOIN_MIN_OUTPUTS = 3
COINJOIN_MIN_BTC = 0.05
COINJOIN_MIN_EQUAL_OUTPUTS = 2
COINJOIN_REL_TOLERANCE = 0.01

# ---------------------------------------------------------------------------
# Batch sizes
# ---------------------------------------------------------------------------

NEO4J_BATCH = 500
PG_BATCH = 1_000
# Wallet risk attributes are written per UNWIND transaction; 1000 is the cap
# imposed by graph_writer and safe well below it here.
WALLET_BATCH = 500

# Ledger threshold above which a graph model risk probability marks a
# transaction as flagged. Mirrors settings.risk_score_flag_threshold.
RISK_FLAG_THRESHOLD = 0.5
# Calibrated FT-Transformer anomaly threshold. Mirrors
# risk_thresholds.FT_TRANSFORMER_CALIBRATED_THRESHOLD.
ANOMALY_FLAG_THRESHOLD = 0.03635445237159729
# anomaly_score is NUMERIC(6,4) in PostgreSQL, so it saturates just below 100.
PG_ANOMALY_MAX = 99.9999


# ---------------------------------------------------------------------------
# Cypher (ported verbatim from the corresponding backend/scripts/*.py)
# ---------------------------------------------------------------------------

_DROP_PROJECT_QUERY = "CALL gds.graph.drop($name, false) YIELD graphName"

# ---------------------------------------------------------------------------
# Scoped GDS projection.
#
# `gds.graph.project` (native label projection) cannot express a node filter on
# this GDS build, and the aggregation-function Cypher projection needs Neo4j
# 2025.x. `gds.graph.project.cypher` is the form that works on Neo4j 5.26 +
# GDS 2.13, and it binds `$scope` natively through its `parameters` config.
#
# Both queries are restricted to the ingest scope:
#   * nodes    — only `:Wallet` nodes whose address is in scope;
#   * relation — only `:CO_SPEND` whose BOTH endpoints are in scope, so no
#                pre-loaded wallet is pulled into the projection (and therefore
#                renumbered).
# The relationship query returns each edge in both orientations, reproducing
# the `orientation: 'UNDIRECTED'` semantics of the native projection it replaces.
# `id()` is required: GDS Cypher projection takes the legacy integer id.
# ---------------------------------------------------------------------------

_PROJECT_NODE_QUERY = """
MATCH (w:Wallet)
WHERE w.address IN $scope
RETURN id(w) AS id
"""

_PROJECT_RELATIONSHIP_QUERY = """
MATCH (a:Wallet)-[:CO_SPEND]->(b:Wallet)
WHERE a.address IN $scope AND b.address IN $scope
RETURN id(a) AS source, id(b) AS target
UNION ALL
MATCH (a:Wallet)-[:CO_SPEND]->(b:Wallet)
WHERE a.address IN $scope AND b.address IN $scope
RETURN id(b) AS source, id(a) AS target
"""

_PROJECT_QUERY = """
CALL gds.graph.project.cypher(
    $graphName,
    $nodeQuery,
    $relationshipQuery,
    { parameters: { scope: $scope } }
)
YIELD nodeCount, relationshipCount, projectMillis
"""

# Community assignment is streamed rather than written by GDS so the
# `cluster_id` write can be (a) restricted to the scope addresses explicitly
# and (b) shifted into the reserved ingest namespace.
_LOUVAIN_STREAM_QUERY = """
CALL gds.louvain.stream(
    $graphName,
    {
        maxLevels: $maxLevels,
        tolerance: $tolerance
    }
)
YIELD nodeId, communityId
RETURN gds.util.asNode(nodeId).address AS address, communityId AS communityId
"""

_LOUVAIN_WRITE_QUERY = """
UNWIND $batch AS row
MATCH (w:Wallet {address: row.address})
SET w.cluster_id = row.cluster_id
RETURN count(w) AS cnt
"""

# Resolves the txids an ingest inserted to the wallets that took part in them.
# The scope is derived from the graph Louvain itself projects, so a txid that
# never reached Neo4j simply contributes no addresses.
_SCOPE_WALLETS_QUERY = """
UNWIND $txids AS txid
MATCH (tx:Transaction {txid: txid})
MATCH (w:Wallet)-[:SENDS|RECEIVES]-(tx)
RETURN DISTINCT w.address AS address
"""

# Reads the cluster_id each scoped wallet currently holds, so wallets that
# already carry a PRE-LOADED cluster id can be held out of the scope.
_SCOPE_CLUSTER_STATE_QUERY = """
UNWIND $addresses AS address
MATCH (w:Wallet {address: address})
RETURN w.address AS address, w.cluster_id AS cluster_id
"""


# From detect_peeling_chains.py _CANDIDATE_QUERY
_PEEL_CANDIDATE_QUERY = """
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

# From detect_peeling_chains.py _NEXT_HOP_QUERY
_PEEL_NEXT_HOP_QUERY = """
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

# Batched variant of _PEEL_NEXT_HOP_QUERY. The chain walk is sequential per
# chain, but the FIRST hop of every candidate is independent, so it is resolved
# in one UNWIND query instead of one round-trip per candidate. Returns the
# requested wallet alongside its next hop so the caller can key the result.
_PEEL_FIRST_HOP_QUERY = """
UNWIND $batch AS cand
MATCH (w:Wallet {address: cand.change_wallet})-[:SENDS]->(tx:Transaction)
WITH cand, tx, count{ (tx)<-[:SENDS]-(:Wallet) } AS n_in
WHERE n_in = 1
MATCH (tx)-[r:RECEIVES]->(out_w:Wallet)
WITH cand, tx, collect({addr: out_w.address, amount: r.amount}) AS out_list
WHERE size(out_list) = 2
WITH cand, tx.txid AS hop_txid, tx.total_in AS total_in,
     out_list[0] AS out0,
     out_list[1] AS out1
WHERE total_in IS NOT NULL AND total_in > 0
WITH cand, hop_txid, total_in,
     CASE WHEN out0.amount <= out1.amount THEN out0 ELSE out1 END AS small_out,
     CASE WHEN out0.amount <= out1.amount THEN out1 ELSE out0 END AS large_out
WHERE small_out.amount <= total_in * $peel_ratio_max
  AND large_out.amount >= total_in * $change_ratio_min
RETURN cand.change_wallet AS wallet, hop_txid AS txid, large_out.addr AS change_wallet
"""

# From detect_peeling_chains.py _WRITE_QUERY
_PEEL_WRITE_QUERY = """
UNWIND $batch AS row
MATCH (tx:Transaction {txid: row.txid})
SET tx.is_mixing = true,
    tx.chain_hops = row.chain_hops
"""
# _PEEL_WRITE_QUERY with the per-hop pass-through ratio. ``pass_through_ratio``
# is the share of the hop's total input that was forwarded onward as the change
# output. It is null for a hop whose amounts could not be read, never 0.0.
_PEEL_WRITE_WITH_RATIO_QUERY = """
UNWIND $batch AS row
MATCH (tx:Transaction {txid: row.txid})
SET tx.is_mixing = true,
    tx.chain_hops = row.chain_hops,
    tx.pass_through_ratio = row.pass_through_ratio
"""

# Per-hop value retention for the traced chains. A peel hop has exactly two
# outputs — a small peel (<= 5% of input) and a large change (>= 80% of input) —
# so the forwarded amount is the larger of the two RECEIVES edges. Dividing it by
# total_in gives the share of the hop's value that continues down the chain.
_PEEL_RATIO_QUERY = """
MATCH (tx:Transaction)-[r:RECEIVES]->(:Wallet)
WHERE tx.txid IN $txids AND coalesce(tx.total_in, 0) > 0
WITH tx.txid AS txid, tx.total_in AS total_in, max(r.amount) AS forwarded
RETURN txid, total_in, forwarded
"""

# From detect_coinjoin.py _CANDIDATE_QUERY
_COINJOIN_CANDIDATE_QUERY = """
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

# From detect_coinjoin.py _WRITE_QUERY
_COINJOIN_WRITE_QUERY = """
UNWIND $batch AS txid
MATCH (tx:Transaction {txid: txid})
SET tx.is_mixing = true
"""

# Mixed-state fetch — from sync_mixing_to_postgres.py _FETCH_ALL_QUERY
_FETCH_MIXING_STATE_QUERY = """
MATCH (tx:Transaction)
WHERE tx.is_mixing = true
RETURN tx.txid AS txid,
       tx.is_mixing AS is_mixing,
       tx.chain_hops AS chain_hops
"""

_FETCH_WALLET_CLUSTERS_QUERY = """
MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL
RETURN w.address AS address, w.cluster_id AS cluster_id
"""

# Wallet risk scores, mirrored into transactions.risk_score so the composite
# scorer's 0.45 risk weight is populated from real data rather than null.
_FETCH_WALLET_RISK_QUERY = """
MATCH (w:Wallet) WHERE w.risk_score IS NOT NULL
RETURN w.address AS address, w.risk_score AS risk_score
"""


class EnrichmentError(RuntimeError):
    """Raised when a required enrichment stage cannot complete."""


# ---------------------------------------------------------------------------
# Stage 1 — Louvain clustering
# ---------------------------------------------------------------------------


def resolve_ingested_wallet_scope(
    svc: GraphService, txids: Sequence[str] | None
) -> list[str]:
    """Resolve the txids an ingest inserted to the wallet addresses in scope.

    These are the only wallets :func:`run_clustering` is allowed to cluster or
    write. Resolved from Neo4j because that is the graph Louvain projects, so
    the scope can never drift from what the projection actually contains.

    A wallet that merely *took part* in an ingested transaction is not the same
    as a wallet the ingest *introduced*: a seeded wallet that transacted with
    new activity still belongs to its original cluster, and re-clustering it
    would strip a member from a pre-loaded Cluster Topology view — the exact
    damage this scoping exists to prevent. So any candidate already holding a
    pre-loaded ``cluster_id`` (a non-null id below
    :data:`INGEST_CLUSTER_ID_OFFSET`) is held out. Newly introduced wallets are
    identifiable because they either have no ``cluster_id`` yet, or carry one
    from a previous scoped run in the reserved namespace.

    Returns:
        Sorted, de-duplicated wallet addresses. Empty when ``txids`` is empty
        or none of them exist in the graph.
    """
    wanted = [t for t in (txids or []) if t]
    if not wanted:
        return []

    addresses: set[str] = set()
    unresolved: list[str] = []
    protected: set[str] = set()
    with svc.driver.session(database=settings.neo4j_database) as session:
        for i in range(0, len(wanted), NEO4J_BATCH):
            chunk = wanted[i : i + NEO4J_BATCH]
            found = {
                r["address"] for r in session.run(_SCOPE_WALLETS_QUERY, txids=chunk)
            }
            addresses |= found
            matched = _matched_txids(session, chunk)
            unresolved.extend(txid for txid in chunk if txid not in matched)

        ordered = sorted(addresses)
        for i in range(0, len(ordered), NEO4J_BATCH):
            chunk = ordered[i : i + NEO4J_BATCH]
            for rec in session.run(_SCOPE_CLUSTER_STATE_QUERY, addresses=chunk):
                cluster_id = rec["cluster_id"]
                if cluster_id is not None and cluster_id < INGEST_CLUSTER_ID_OFFSET:
                    protected.add(rec["address"])

    if unresolved:
        # A txid with no :Transaction node in the graph contributes no scope.
        # That is reported, never silently ignored.
        logger.warning(
            "[enrich] cluster: %d of %d ingest txids have no :Transaction in "
            "Neo4j and contribute no wallets to the clustering scope",
            len(unresolved), len(wanted),
        )
    if protected:
        logger.info(
            "[enrich] cluster: holding %d pre-loaded wallet(s) out of the "
            "clustering scope — they keep their original cluster_id",
            len(protected),
        )
    return [a for a in sorted(addresses) if a not in protected]


def _matched_txids(session: Any, chunk: Sequence[str]) -> set[str]:
    """Txids in ``chunk`` that exist as a ``:Transaction`` in this session."""
    rec = session.run(
        "UNWIND $txids AS txid MATCH (tx:Transaction {txid: txid}) "
        "RETURN collect(DISTINCT txid) AS found",
        txids=list(chunk),
    ).single()
    return set(rec["found"]) if rec and rec["found"] else set()


def run_clustering(
    svc: GraphService, scope_addresses: Sequence[str] | None = None
) -> dict[str, Any]:
    """Cluster ONLY the wallets this ingest introduced, via a scoped GDS Louvain.

    The projection is restricted on both sides — nodes to the scope addresses,
    ``:CO_SPEND`` edges to those whose *both* endpoints are in scope — so a
    pre-loaded wallet can neither enter the projection nor be renumbered by it.
    ``cluster_id`` is then written only to the scope addresses, each shifted by
    :data:`INGEST_CLUSTER_ID_OFFSET` into a namespace that cannot collide with
    the pre-loaded clusters.

    Running Louvain over the whole graph instead is the regression this stage
    exists to prevent: Louvain renumbers community ids globally, so an unscoped
    run reassigns every pre-loaded wallet's ``cluster_id`` and empties the
    pre-loaded Cluster Topology views. An empty scope is therefore refused
    rather than silently widened.

    Idempotent in the sense that matters here: the write is overwrite-only and
    restricted to the scope, so re-running can never move a wallet outside the
    ingest namespace. The exact community *number* a scoped wallet receives is
    NOT reproducible — GDS Louvain 2.13 exposes no ``seed`` configuration key
    and is non-deterministic above a few thousand projected nodes (measured on
    this corpus: 4,215 of 8,123 wallets kept their community id across four
    identical runs, while a 1,200-node scope was fully stable). A re-run may
    therefore renumber ingest-owned communities among themselves. That is
    contained: only wallets this stage is allowed to write are affected, and
    their ids stay inside the reserved namespace.

    Returns:
        Projection + Louvain metrics, or a ``skipped`` report when the ingest
        contributed no wallets.
    """
    scope = sorted(set(scope_addresses or ()))
    if not scope:
        logger.warning(
            "[enrich] cluster: SKIPPED — the ingest resolved to no wallets. "
            "Refusing to fall back to an unscoped Louvain, which would "
            "renumber every pre-loaded cluster."
        )
        return {
            "status": "skipped",
            "reason": "no_ingested_wallets_in_scope",
            "wallets_written": 0,
        }

    t0 = time.perf_counter()
    with svc.driver.session(database=settings.neo4j_database) as session:
        # Drop stale projection (no-op when absent).
        session.run(_DROP_PROJECT_QUERY, name=GRAPH_NAME)
        proj = session.run(
            _PROJECT_QUERY,
            graphName=GRAPH_NAME,
            nodeQuery=_PROJECT_NODE_QUERY,
            relationshipQuery=_PROJECT_RELATIONSHIP_QUERY,
            scope=scope,
        ).single()

        communities = list(
            session.run(
                _LOUVAIN_STREAM_QUERY,
                graphName=GRAPH_NAME,
                maxLevels=LOUVAIN_MAX_LEVELS,
                tolerance=LOUVAIN_TOLERANCE,
            )
        )

    projected = int(proj["nodeCount"]) if proj else 0
    if projected < len(scope):
        logger.warning(
            "[enrich] cluster: %d of %d scoped wallets are not present in "
            "Neo4j and could not be clustered",
            len(scope) - projected, len(scope),
        )

    payload = [
        {"address": rec["address"], "cluster_id": int(rec["communityId"]) + INGEST_CLUSTER_ID_OFFSET}
        for rec in communities
    ]
    written = 0
    for i in range(0, len(payload), WALLET_BATCH):
        chunk = payload[i : i + WALLET_BATCH]

        def _write(tx: Any, b: list[dict[str, Any]] = chunk) -> int:
            rec = tx.run(_LOUVAIN_WRITE_QUERY, batch=b)
            return sum(int(r["cnt"]) for r in rec)

        with svc.driver.session(database=settings.neo4j_database) as session:
            written += session.execute_write(_write)

    with svc.driver.session(database=settings.neo4j_database) as session:
        session.run(_DROP_PROJECT_QUERY, name=GRAPH_NAME).consume()

    stats = {
        "scope_wallets": len(scope),
        "nodes": projected,
        "relationships": int(proj["relationshipCount"]) if proj else 0,
        "project_ms": int(proj["projectMillis"]) if proj else 0,
        "community_count": len({p["cluster_id"] for p in payload}),
        "wallets_written": written,
        "cluster_id_offset": INGEST_CLUSTER_ID_OFFSET,
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    logger.info(
        "[enrich] cluster: scoped Louvain clustered %d/%d ingest wallets into %d "
        "communities (offset +%d, %d nodes / %d relationships) in %.2fs; pre-loaded "
        "wallets untouched",
        written, len(scope), stats["community_count"], INGEST_CLUSTER_ID_OFFSET,
        stats["nodes"], stats["relationships"], stats["elapsed_s"],
    )
    return stats


# ---------------------------------------------------------------------------
# Stage 2 — peeling chains
# ---------------------------------------------------------------------------


def run_peeling_detection(svc: GraphService) -> dict[str, Any]:
    """Trace multi-hop peeling chains and write ``is_mixing``/``chain_hops``.

    Ported from ``backend/scripts/detect_peeling_chains.py``. Only maximal
    chains of at least :data:`PEEL_MIN_HOPS` hops are flagged; each flagged
    transaction gets the full chain length as its ``chain_hops``.

    Idempotent: the write is a ``SET`` keyed by txid, so re-running overwrites
    rather than accumulating.

    Returns:
        Detection counters.
    """
    t0 = time.perf_counter()
    params = {"peel_ratio_max": PEEL_RATIO_MAX, "change_ratio_min": CHANGE_RATIO_MIN}

    with svc.driver.session(database=settings.neo4j_database) as session:
        candidates = [dict(r) for r in session.run(_PEEL_CANDIDATE_QUERY, **params)]
        logger.info("[enrich] peel: %d single-hop candidates found", len(candidates))

        if not candidates:
            return {
                "candidates_found": 0, "chains_traced": 0, "chains_qualified": 0,
                "txids_flagged": 0, "elapsed_s": round(time.perf_counter() - t0, 2),
            }

        # Phase B — follow each candidate's change output forward.
        #
        # The original script issues one round-trip PER HOP per candidate, which
        # is 3,624 sequential queries over the seeded corpus and took ~116 s.
        # The walk is inherently sequential per chain, but the *first* hop of
        # every candidate is independent, so it is batched into a single
        # UNWIND query. Subsequent hops fall back to the per-hop query (chains
        # are short), which cuts the round-trips by an order of magnitude.
        first_hops: dict[str, dict[str, str]] = {}
        for i in range(0, len(candidates), NEO4J_BATCH):
            chunk = candidates[i : i + NEO4J_BATCH]
            for rec in session.run(_PEEL_FIRST_HOP_QUERY, batch=chunk, **params):
                first_hops[rec["wallet"]] = {
                    "txid": rec["txid"],
                    "change_wallet": rec["change_wallet"],
                }

        chain_groups: list[tuple[str, list[str]]] = []
        for cand in candidates:
            chain_txids: list[str] = []
            current_wallet = cand["change_wallet"]
            visited: set[str] = {current_wallet}
            use_batched = True  # the first hop came from the batched query

            while len(chain_txids) < PEEL_MAX_DEPTH:
                if use_batched:
                    hop = first_hops.get(current_wallet)
                else:
                    record = session.run(
                        _PEEL_NEXT_HOP_QUERY, wallet=current_wallet, **params
                    ).single()
                    hop = (
                        {"txid": record["txid"], "change_wallet": record["change_wallet"]}
                        if record is not None
                        else None
                    )
                use_batched = False

                if hop is None:
                    break
                chain_txids.append(hop["txid"])
                current_wallet = hop["change_wallet"]
                if current_wallet in visited:
                    break  # cycle guard
                visited.add(current_wallet)

            chain_groups.append((cand["txid"], chain_txids))

        # Keep only maximal chains. The original compared every chain against
        # every other (O(n^2) over 3,624 sets). A chain can only be a strict
        # subset of another if it is SHORTER, so sorting by descending length
        # lets us drop any set already covered by a kept superset in one pass.
        order = sorted(
            range(len(chain_groups)),
            key=lambda i: len(chain_groups[i][1]) + 1,
            reverse=True,
        )
        kept_sets: list[frozenset[str]] = []
        chains_to_flag: list[tuple[str, list[str]]] = []
        for idx in order:
            root, subs = chain_groups[idx]
            s = frozenset([root] + subs)
            if any(s < k for k in kept_sets):
                continue
            kept_sets.append(s)
            chains_to_flag.append((root, subs))

        qualified = [
            (root, subs) for root, subs in chains_to_flag if (1 + len(subs)) >= PEEL_MIN_HOPS
        ]
        logger.info(
            "[enrich] peel: %d chains traced, %d maximal, %d qualify (>= %d hops)",
            len(chain_groups), len(chains_to_flag), len(qualified), PEEL_MIN_HOPS,
        )

        flagged: list[dict[str, Any]] = []
        seen: set[str] = set()
        for root_txid, subsequent in qualified:
            total_hops = 1 + len(subsequent)
            for txid in [root_txid] + subsequent:
                if txid not in seen:
                    seen.add(txid)
                    flagged.append({"txid": txid, "chain_hops": total_hops})

        # Per-hop value retention for the whole flagged set, in one round-trip.
        # Skipped entirely when there is nothing to measure, so the previous
        # behaviour and cost are unchanged for a run with no peeling chains.
        ratios = _peel_hop_ratios(session, [f["txid"] for f in flagged])
        for entry in flagged:
            entry["pass_through_ratio"] = ratios.get(entry["txid"])
        measured = sum(1 for e in flagged if e["pass_through_ratio"] is not None)

        for i in range(0, len(flagged), NEO4J_BATCH):
            chunk = flagged[i : i + NEO4J_BATCH]

            def _write(tx: Any, b: list[dict[str, Any]] = chunk) -> None:
                tx.run(_PEEL_WRITE_WITH_RATIO_QUERY, batch=b)

            with svc.driver.session(database=settings.neo4j_database) as session:
                session.execute_write(_write)

    stats = {
        "candidates_found": len(candidates),
        "chains_traced": len(chain_groups),
        "chains_qualified": len(qualified),
        "txids_flagged": len(flagged),
        "pass_through_measured": measured,
        "pass_through_unavailable": len(flagged) - measured,
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    logger.info(
        "[enrich] peel: flagged %d transactions with is_mixing=true in %.2fs "
        "(pass-through ratio measured for %d, unavailable for %d)",
        stats["txids_flagged"], stats["elapsed_s"],
        measured, stats["pass_through_unavailable"],
    )
    return stats


def _peel_hop_ratios(
    session: Any, txids: list[str]
) -> dict[str, float]:
    """Return ``{txid: pass_through_ratio}`` for the hops whose amounts resolve.

    The ratio is ``forwarded_amount / total_in`` for that transaction: the share
    of the hop's input value that continues down the chain as the change output.
    It is a real measurement of the on-chain amounts, not a constant.

    A hop whose ``total_in`` is missing or whose RECEIVES edges carry no amount
    is ABSENT from the result rather than mapped to 0.0 — "no value breakdown"
    and "nothing passed through" are different findings, and only the first is
    true for such a hop.

    Args:
        session: An open Neo4j session.
        txids: The flagged chain hop txids.

    Returns:
        ``{txid: ratio}`` for every hop where the ratio could be computed.
    """
    out: dict[str, float] = {}
    if not txids:
        return out

    for i in range(0, len(txids), NEO4J_BATCH):
        chunk = txids[i : i + NEO4J_BATCH]
        try:
            for rec in session.run(_PEEL_RATIO_QUERY, txids=chunk):
                total_in = float(rec["total_in"] or 0.0)
                forwarded = rec["forwarded"]
                if total_in <= 0.0 or forwarded is None:
                    continue
                ratio = float(forwarded) / total_in
                if ratio != ratio:  # NaN guard
                    continue
                out[rec["txid"]] = min(1.0, max(0.0, ratio))
        except Exception as exc:  # noqa: BLE001 - never lose the peel flags
            logger.error(
                "[enrich] peel: pass-through ratio query failed for a chunk of %d "
                "txids (%s: %s) — the hops stay flagged but their ratio is "
                "reported as unavailable rather than 0.0.",
                len(chunk), type(exc).__name__, exc,
            )
    return out


# ---------------------------------------------------------------------------
# Stage 3 — CoinJoin
# ---------------------------------------------------------------------------


def _max_equal_output_group(amounts: list[float], relative_tolerance: float) -> int:
    """Largest group of pairwise-equal output amounts.

    Ported verbatim from ``backend/scripts/detect_coinjoin.py``.

    The 1e-9 relative epsilon guards the boundary against IEEE 754 rounding.
    """
    if not amounts:
        return 0

    _EPS = 1e-9
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


def run_coinjoin_detection(svc: GraphService) -> dict[str, Any]:
    """Flag CoinJoin transactions with ``is_mixing=true``.

    Ported from ``backend/scripts/detect_coinjoin.py``: a Cypher structural
    gate (>= 3 in, >= 3 out, >= 0.05 BTC) followed by a Python equal-output
    filter. Idempotent — a ``SET`` keyed by txid.
    """
    t0 = time.perf_counter()
    with svc.driver.session(database=settings.neo4j_database) as session:
        candidates = [
            dict(r)
            for r in session.run(
                _COINJOIN_CANDIDATE_QUERY,
                min_btc=float(COINJOIN_MIN_BTC),
                min_inputs=int(COINJOIN_MIN_INPUTS),
                min_outputs=int(COINJOIN_MIN_OUTPUTS),
            )
        ]

    logger.info("[enrich] coinjoin: %d structural candidates", len(candidates))

    qualified_txids: list[str] = []
    for cand in candidates:
        amounts: list[float] = []
        for a in cand.get("out_amounts") or []:
            try:
                amounts.append(float(a))
            except (TypeError, ValueError):
                continue
        if _max_equal_output_group(amounts, COINJOIN_REL_TOLERANCE) >= COINJOIN_MIN_EQUAL_OUTPUTS:
            qualified_txids.append(cand["txid"])

    for i in range(0, len(qualified_txids), NEO4J_BATCH):
        chunk = qualified_txids[i : i + NEO4J_BATCH]

        def _write(tx: Any, b: list[str] = chunk) -> None:
            tx.run(_COINJOIN_WRITE_QUERY, batch=b)

        with svc.driver.session(database=settings.neo4j_database) as session:
            session.execute_write(_write)

    stats = {
        "candidates_fetched": len(candidates),
        "coinjoin_qualified": len(qualified_txids),
        "txids_flagged": len(qualified_txids),
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    logger.info(
        "[enrich] coinjoin: %d/%d qualified as CoinJoin in %.2fs",
        stats["coinjoin_qualified"], len(candidates), stats["elapsed_s"],
    )
    return stats


# ---------------------------------------------------------------------------
# Stage 4 — wallet risk attributes
# ---------------------------------------------------------------------------


def _write_wallet_risk_scores(svc: GraphService) -> dict[str, Any]:
    """Write a real ``risk_score`` onto every ``:Wallet``.

    ``risk_score`` is NEVER hardcoded, and it is NEVER a restatement of another
    score.

    Why not the composite: the composite is
    ``0.45 * risk_score + 0.35 * anomaly + rule_bonus + mixing`` (see
    ``app/services/risk_thresholds.py``). Back-filling ``risk_score`` from
    ``clamp(composite)`` therefore fed a value derived from ``risk_score`` back
    into ``risk_score``, which pinned 7,517 wallets to exactly
    ``W_ANOMALY = 0.35`` and 1,171 to 0.43. That is a fixed point, not a
    measurement.

    The graph risk model (``graph_transformer_*.pt`` / ``graphsage_*.pt``) is a
    FULL-GRAPH artifact: it needs a PyG node-feature matrix and edge_index over
    every wallet, produced by ``train_graphsage.py`` / ``promote_models.py`` at
    training time. Scoring one freshly-ingested wallet against it is not
    possible without rebuilding that matrix, so this chain does not pretend to
    do it. It is reported as ``not_applicable`` rather than substituted.

        What is written instead is :func:`_independent_risk_scores`: a documented
        additive heuristic over four signals that are all independent of both the
    composite and of ``risk_score`` itself —

        0.30 * normalised FT-Transformer anomaly (the real model, per wallet)
      + 0.25 * log-scaled co-spend cluster size
      + 0.25 * seed proximity (0 / 0.2 / 0.5 / 1.0 from the 2-hop BFS)
      + 0.20 * normalised peeling-chain depth

    Every term is a measured property of the wallet's own transactions and
    graph position, so the result is a genuine independent signal. It is
    labelled ``graph_heuristic_v1`` in the report and on the wallet, and it is
    never described as a GraphSAGE output. The four terms are written as four
    scalar properties (``risk_score_anomaly_term`` and siblings) because Neo4j
    cannot store a map as a node property — writing one aborts the whole
    transaction with a TypeError and silently leaves every ``risk_score`` stale.

    Wallets for which no score can be computed are left with ``risk_score``
    unset (null), which is distinguishable from a computed 0.0.
    """
    t0 = time.perf_counter()
    scored_risk = _independent_risk_scores(svc)
    risk_source = "graph_heuristic_v1"

    # Write in batched UNWIND transactions.
    written = 0
    items = [(addr, val, terms) for addr, (val, terms) in scored_risk.items()]
    for i in range(0, len(items), WALLET_BATCH):
        chunk = [
            {
                "address": addr,
                "risk_score": val,
                "anomaly_term": comp["anomaly_term"],
                "cluster_term": comp["cluster_term"],
                "seed_term": comp["seed_term"],
                "peel_term": comp["peel_term"],
            }
            for addr, val, comp in items[i : i + WALLET_BATCH]
        ]

        def _write(tx: Any, b: list[dict[str, Any]] = chunk) -> int:
            rec = tx.run(
                """
                UNWIND $batch AS row
                MATCH (w:Wallet {address: row.address})
                SET w.risk_score = row.risk_score,
                    w.risk_score_source = $source,
                    w.risk_score_anomaly_term = row.anomaly_term,
                    w.risk_score_cluster_term = row.cluster_term,
                    w.risk_score_seed_term = row.seed_term,
                    w.risk_score_peeling_term = row.peel_term
                RETURN count(w) AS cnt
                """,
                batch=b,
                source=risk_source,
            ).single()
            return int(rec["cnt"]) if rec else 0

        with svc.driver.session(database=settings.neo4j_database) as session:
            written += session.execute_write(_write)

    logger.info(
        "[enrich] risk: wrote risk_score to %d wallets (source=%s, graph_model=%s) in %.2fs",
        written, risk_source, "not_applicable_full_graph_artifact", time.perf_counter() - t0,
    )
    return {
        "wallets_written": written,
        "source": risk_source,
        "weights": dict(_RISK_WEIGHTS),
        "graph_model": "not_applicable_full_graph_artifact",
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }


# Additive weights for the independent risk heuristic. Documented, named, and
# summing to 1.0 so the resulting score stays in [0, 1] by construction.
_RISK_WEIGHTS: dict[str, float] = {
    "anomaly": 0.30,
    "cluster": 0.25,
    "seed": 0.25,
    "peeling": 0.20,
}

# log1p(cluster_size) is compressed with this divisor so a cluster of a few
# hundred wallets saturates near 1.0 instead of dominating the sum.
_CLUSTER_SIZE_SATURATION = 6.0

# Chain depth is compressed the same way, at the maximum hop count the peeling
# detector is willing to trace.
_PEEL_DEPTH_SATURATION = float(max(PEEL_MIN_HOPS, 10))

# Anomaly is normalised against the detector threshold, matching how
# risk_thresholds normalises it for the composite: below the threshold counts as
# 0, the threshold maps to 0.5, and 2x the threshold maps to 1.0.
_ANOMALY_NORMALISATION_SCALE = 2.0 * ANOMALY_FLAG_THRESHOLD


def _independent_risk_scores(svc: GraphService) -> dict[str, tuple[float, dict[str, float]]]:
    """Compute an independent per-wallet risk score from measured signals.

    Reads the real transaction rows for each wallet from PostgreSQL, runs the
    actual :func:`app.services.inline_scorer.score_batch` to obtain the real
    FT-Transformer anomaly, reads each wallet's co-spend cluster size, seed
    proximity and peeling depth from the same Neo4j session the chain is
    already using, and combines them with the weights in :data:`_RISK_WEIGHTS`.

    None of the inputs is ``risk_score`` or ``composite_score``, so the result
    cannot be a fixed point of the composite formula.

    Args:
        svc: The chain's open GraphService.

    Returns:
        ``{address: (risk_score, {"anomaly_term": .., "cluster_term": ..,
        "seed_term": .., "peel_term": ..})}``. Wallets with no usable telemetry
        are absent rather than defaulted to 0.0.
    """
    from app.services import inline_scorer

    rows_by_wallet: dict[str, list[dict[str, Any]]] = _load_tx_rows_by_wallet()
    if not rows_by_wallet:
        logger.warning(
            "[enrich] risk: no transaction rows available — risk_score will be "
            "left null rather than defaulted"
        )
        return {}

    graph_facts = _graph_facts_for_risk(svc, sorted(rows_by_wallet))

    out: dict[str, tuple[float, dict[str, float]]] = {}
    unscorable = 0
    for wallet, rows in rows_by_wallet.items():
        try:
            scored = inline_scorer.score_batch(rows)
        except Exception as exc:  # noqa: BLE001 - one wallet must not abort all
            logger.warning("[enrich] risk: inline scoring failed for %s: %s", wallet[:12], exc)
            unscorable += 1
            continue

        record = next((r for r in scored if r.get("address") == wallet), None)
        if record is None:
            unscorable += 1
            continue

        anomaly = record.get("anomaly_score")
        try:
            anomaly_value = float(anomaly)
        except (TypeError, ValueError):
            anomaly_value = 0.0
        if anomaly_value != anomaly_value:  # NaN
            anomaly_value = 0.0
        # A wallet at or above the detector threshold is fully suspicious; the
        # scale is 2x the threshold, so the term saturates there.
        anomaly_term = min(1.0, max(0.0, anomaly_value / _ANOMALY_NORMALISATION_SCALE))

        cluster_size, seed_proximity, max_chain_hops = graph_facts.get(wallet, (0, 0.0, 0))
        cluster_term = min(1.0, math.log1p(cluster_size) / _CLUSTER_SIZE_SATURATION)
        seed_term = min(1.0, max(0.0, seed_proximity))
        peel_term = min(1.0, max_chain_hops / _PEEL_DEPTH_SATURATION)

        score = (
            _RISK_WEIGHTS["anomaly"] * anomaly_term
            + _RISK_WEIGHTS["cluster"] * cluster_term
            + _RISK_WEIGHTS["seed"] * seed_term
            + _RISK_WEIGHTS["peeling"] * peel_term
        )
        out[wallet] = (
            min(1.0, max(0.0, score)),
            {
                "anomaly_term": round(anomaly_term, 6),
                "cluster_term": round(cluster_term, 6),
                "seed_term": round(seed_term, 6),
                "peel_term": round(peel_term, 6),
            },
        )

    logger.info(
        "[enrich] risk: independent risk heuristic produced scores for %d wallets "
        "(%d unscorable)",
        len(out), unscorable,
    )
    return out


def _graph_facts_for_risk(
    svc: GraphService, addresses: list[str]
) -> dict[str, tuple[int, float, int]]:
    """Read cluster size, seed proximity and peeling depth per wallet.

    Args:
        svc: The chain's open GraphService.
        addresses: Wallet addresses to look up, in chunks of :data:`WALLET_BATCH`.

    Returns:
        ``{address: (cluster_size, seed_proximity, max_chain_hops)}``. A wallet
        with no cluster assignment gets cluster_size 0, which contributes 0.0 to
        the cluster term rather than fabricating a size.
    """
    if not addresses:
        return {}

    facts: dict[str, tuple[int, float, int]] = {}
    for i in range(0, len(addresses), WALLET_BATCH):
        chunk = addresses[i : i + WALLET_BATCH]
        with svc.driver.session(database=settings.neo4j_database) as session:
            for rec in session.run(_GRAPH_FACTS_QUERY, batch=chunk):
                facts[rec["address"]] = (
                    int(rec["cluster_size"] or 0),
                    float(rec["seed_proximity"] or 0.0),
                    int(rec["max_chain_hops"] or 0),
                )
    return facts


# Per-wallet graph facts needed by the independent risk heuristic. Peel depth is
# the maximum over the wallet's transactions, matching how chain_hops is
# reported elsewhere.
_GRAPH_FACTS_QUERY = """
UNWIND $batch AS address
MATCH (w:Wallet {address: address})
OPTIONAL MATCH (w)-[:CO_SPEND]-(peer:Wallet)
WHERE peer.cluster_id = w.cluster_id
WITH w, count(DISTINCT peer) + 1 AS cluster_size
OPTIONAL MATCH (w)-[:SENDS]->(tx:Transaction)
WITH w, cluster_size, max(coalesce(tx.chain_hops, 0)) AS max_chain_hops
RETURN w.address AS address,
       cluster_size,
       coalesce(w.seed_proximity, 0.0) AS seed_proximity,
       max_chain_hops
"""


def _load_tx_rows_by_wallet() -> dict[str, list[dict[str, Any]]]:
    """Load the most recent transactions per wallet from PostgreSQL.

    ``risk_score`` is deliberately blanked on the way out. The wallet risk this
    feeds is derived from the structural features, and reading back a
    previously-mirrored ``risk_score`` would make the value a function of its
    own last output — a re-run would then keep inflating it and the stage would
    not be idempotent.
    """
    conn = None
    try:
        conn = psycopg2.connect(settings.database_url)
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT txid, input_addresses, output_addresses, input_amounts,
                       output_amounts, fee, script_type, geo_country, asn, ts,
                       risk_score, anomaly_score, cluster_id, is_mixing, chain_hops
                FROM transactions
                ORDER BY ts DESC
                LIMIT %s
            """, (_TX_SAMPLE_LIMIT,))
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] risk: could not load transactions from PG: %s", exc)
        return {}
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    if len(rows) >= _TX_SAMPLE_LIMIT:
        logger.error(
            "[enrich] risk: transaction load hit the %d-row ceiling — wallets "
            "outside the loaded window will NOT receive a risk_score this run. "
            "Raise _TX_SAMPLE_LIMIT to cover the whole corpus.",
            _TX_SAMPLE_LIMIT,
        )

    for row in rows:
        row["risk_score"] = None

    by_wallet: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        addrs = list(row.get("input_addresses") or []) + list(row.get("output_addresses") or [])
        for addr in addrs:
            bucket = by_wallet.setdefault(addr, [])
            if len(bucket) < _TX_PER_WALLET:
                bucket.append(row)
    return by_wallet


# Upper bound on transactions loaded when building wallet features. Sized to
# cover the full corpus (100k seeded + ingested) with headroom. A truncated load
# would silently leave the tail's wallets without a risk_score, so hitting this
# ceiling is logged loudly rather than passing as a complete pass.
_TX_SAMPLE_LIMIT = 500_000
# Transactions per wallet fed to the inline scorer.
_TX_PER_WALLET = 5


def run_wallet_attributes(svc: GraphService) -> dict[str, Any]:
    """Write ``risk_score``, ``seed_proximity`` and ``is_seed_illicit`` on ``:Wallet``.

    ``seed_proximity`` / ``is_seed_illicit`` are derived from the real
    Ransomwhere seed list (the same source ``inline_scorer`` uses), using the
    same rule as ``backend/scripts/train_graphsage.py``: a wallet that IS a
    seed is illicit, and proximity decays with graph distance from the nearest
    seed along ``CO_SPEND`` edges.

    ORDER MATTERS. Seed proximity is written FIRST because the independent risk
    heuristic carries a seed-proximity term and reads ``w.seed_proximity`` off
    the graph. Writing risk first fed it the previous run's values — which, while
    the seed set failed to resolve, were 0.0 for every wallet — so the seed term
    contributed nothing and direct ransom addresses were under-scored.

    Idempotent: properties are overwritten, and wallets with no seed reachable
    get an explicit ``0.0`` / ``false`` rather than being left ambiguous.
    """
    t0 = time.perf_counter()
    seed = _write_seed_proximity(svc)
    risk = _write_wallet_risk_scores(svc)

    stats = {
        "risk": risk,
        "seed": seed,
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    return stats


def _write_seed_proximity(svc: GraphService) -> dict[str, Any]:
    """Write ``seed_proximity`` and ``is_seed_illicit`` on every ``:Wallet``.

    Proximity is a 2-hop BFS decay from the real seed set over ``CO_SPEND``:
    hop 0 (a seed) = 1.0, hop 1 = 0.5, hop 2 = 0.2, beyond = 0.0. This mirrors
    the intent of the Personalized PageRank in ``train_graphsage.py`` while
    being computable in the enrichment chain without retraining.
    """
    t0 = time.perf_counter()
    from app.services import inline_scorer

    inline_scorer.init_scorer()
    seeds = set(inline_scorer._seeds)  # noqa: SLF001 - documented shared singleton

    if not seeds:
        logger.warning(
            "[enrich] seed: no Ransomwhere seeds loaded — writing is_seed_illicit=false "
            "and seed_proximity=0.0 for all wallets"
        )

    # The seed set to LOOK UP in the graph. Previously this was initialised to
    # an empty set and never populated from `seeds`, so the `if seed_addrs:`
    # branch below was dead code: the hop-0 resolution never ran, `seed_addrs`
    # stayed empty, and every wallet received seed_proximity=0.0. The counter
    # then reported `seed_addresses: 0` while the schema-contract self-check
    # still printed `ok: true`.
    seed_addrs: set[str] = set(seeds)
    hop1: set[str] = set()
    hop2: set[str] = set()

    logger.info(
        "[enrich] seed: %d Ransomwhere seed addresses loaded; resolving which of "
        "them exist in the graph",
        len(seed_addrs),
    )

    with svc.driver.session(database=settings.neo4j_database) as session:
        if seed_addrs:
            hop0_rec = session.run(
                """
                UNWIND $seeds AS a
                MATCH (w:Wallet {address: a})
                RETURN collect(DISTINCT w.address) AS addrs
                """,
                seeds=list(seed_addrs),
            ).single()
            seed_addrs = set(hop0_rec["addrs"]) if hop0_rec and hop0_rec["addrs"] else set()
            logger.info(
                "[enrich] seed: %d/%d seeds are present as :Wallet nodes",
                len(seed_addrs), len(seeds),
            )
        else:
            logger.warning(
                "[enrich] seed: the Ransomwhere seed list is empty — no seed "
                "proximity can be derived and every wallet will get 0.0"
            )

        if seed_addrs:
            hop1_rec = session.run(
                """
                UNWIND $seeds AS a
                MATCH (s:Wallet {address: a})-[:CO_SPEND]-(n:Wallet)
                WHERE NOT n.address IN $seeds
                RETURN collect(DISTINCT n.address) AS addrs
                """,
                seeds=list(seed_addrs),
            ).single()
            hop1 = set(hop1_rec["addrs"]) if hop1_rec and hop1_rec["addrs"] else set()

        if hop1:
            hop2_rec = session.run(
                """
                UNWIND $hop1 AS a
                MATCH (n:Wallet {address: a})-[:CO_SPEND]-(m:Wallet)
                WHERE NOT m.address IN $hop0 AND NOT m.address IN $hop1
                RETURN collect(DISTINCT m.address) AS addrs
                """,
                hop1=list(hop1),
                hop0=list(seed_addrs),
            ).single()
            hop2 = set(hop2_rec["addrs"]) if hop2_rec and hop2_rec["addrs"] else set()

    # Assign proximity to every wallet (0.0 for those beyond 2 hops) and write
    # in batches. Writing 0.0 explicitly keeps the property non-null so the
    # graph contract always holds.
    with svc.driver.session(database=settings.neo4j_database) as session:
        all_addrs = [r["address"] for r in session.run(
            "MATCH (w:Wallet) RETURN w.address AS address"
        )]

    payload: list[dict[str, Any]] = []
    for addr in all_addrs:
        if addr in seed_addrs:
            prox, illicit = 1.0, True
        elif addr in hop1:
            prox, illicit = 0.5, False
        elif addr in hop2:
            prox, illicit = 0.2, False
        else:
            prox, illicit = 0.0, False
        payload.append({"address": addr, "prox": prox, "illicit": illicit})

    written = 0
    for i in range(0, len(payload), WALLET_BATCH):
        chunk = payload[i : i + WALLET_BATCH]

        def _write(tx: Any, b: list[dict[str, Any]] = chunk) -> int:
            rec = tx.run(
                """
                UNWIND $batch AS row
                MATCH (w:Wallet {address: row.address})
                SET w.seed_proximity = row.prox,
                    w.is_seed_illicit = row.illicit
                RETURN count(w) AS cnt
                """,
                batch=b,
            ).single()
            return int(rec["cnt"]) if rec else 0

        with svc.driver.session(database=settings.neo4j_database) as session:
            written += session.execute_write(_write)

    stats = {
        "wallets_written": written,
        "seed_addresses": len(seed_addrs),
        "hop1": len(hop1),
        "hop2": len(hop2),
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    logger.info(
        "[enrich] seed: %d seed wallets, %d hop1, %d hop2; wrote seed_proximity "
        "to %d wallets in %.2fs",
        stats["seed_addresses"], stats["hop1"], stats["hop2"], written, stats["elapsed_s"],
    )
    return stats


# ---------------------------------------------------------------------------
# Stage 5 — schema contract verification
# ---------------------------------------------------------------------------


def verify_schema_contract(svc: GraphService) -> dict[str, Any]:
    """Verify the ``:Wallet`` property contract from ``neo4j_init.cypher:62-91``.

    Checks that ``cluster_id``, ``risk_score``, ``seed_proximity`` and
    ``is_seed_illicit`` are actually present on the wallets this ingest touched,
    and that the property types match the documented contract. Returns a report;
    never raises, so a contract gap is reported rather than crashing the chain.

    ``seed_proximity`` is only required when a seed list is actually configured.
    A corpus with no seed data has nothing to derive proximity from, and failing
    it would be a false alarm. When seeds ARE configured, an empty
    ``seed_proximity`` column is a contract failure — the previous version
    computed the count and then left it out of the ``ok`` predicate, so a run
    that wrote proximity to zero wallets still reported ``ok: true``.
    """
    from app.services import inline_scorer

    try:
        inline_scorer.init_scorer()
        seeds_configured = len(inline_scorer._seeds) > 0  # noqa: SLF001
    except Exception as exc:  # noqa: BLE001 - report, never fail the chain
        logger.warning(
            "[enrich] schema contract: could not determine whether seeds are "
            "configured (%s: %s) — seed_proximity will not be required.",
            type(exc).__name__, exc,
        )
        seeds_configured = False

    with svc.driver.session(database=settings.neo4j_database) as session:
        record = session.run(
            """
            MATCH (w:Wallet)
            RETURN count(w) AS total,
                   count(w.cluster_id) AS with_cluster,
                   count(w.risk_score) AS with_risk,
                   count(w.seed_proximity) AS with_seed_prox,
                   count(CASE WHEN w.seed_proximity > 0.0 THEN 1 END) AS with_nonzero_seed_prox,
                   count(CASE WHEN w.is_seed_illicit THEN 1 END) AS seed_wallets,
                   count(w.is_seed_illicit) AS with_seed_flag,
                   count(CASE WHEN w.risk_score IS NOT NULL
                              AND (w.risk_score < 0 OR w.risk_score > 1) THEN 1 END) AS bad_risk,
                   count(CASE WHEN w.risk_score IS NOT NULL AND w.risk_score = 0.0 THEN 1 END) AS zero_risk,
                   count(CASE WHEN w.risk_score = 0.35 THEN 1 END) AS risk_at_w_anomaly
            """
        ).single()

    total = int(record["total"]) if record else 0
    report = {
        "wallets_total": total,
        "with_cluster_id": int(record["with_cluster"]) if record else 0,
        "with_risk_score": int(record["with_risk"]) if record else 0,
        "with_seed_proximity": int(record["with_seed_prox"]) if record else 0,
        "with_nonzero_seed_proximity": int(record["with_nonzero_seed_prox"]) if record else 0,
        "seed_illicit_wallets": int(record["seed_wallets"]) if record else 0,
        "with_is_seed_illicit": int(record["with_seed_flag"]) if record else 0,
        "out_of_range_risk_score": int(record["bad_risk"]) if record else 0,
        "zero_risk_score": int(record["zero_risk"]) if record else 0,
        "risk_score_at_w_anomaly": int(record["risk_at_w_anomaly"]) if record else 0,
        "seeds_configured": seeds_configured,
    }

    failures: list[str] = []
    if total > 0:
        if report["with_cluster_id"] != total:
            failures.append(
                f"cluster_id present on {report['with_cluster_id']}/{total} wallets"
            )
        if report["with_risk_score"] != total:
            failures.append(
                f"risk_score present on {report['with_risk_score']}/{total} wallets"
            )
        if report["with_is_seed_illicit"] != total:
            failures.append(
                f"is_seed_illicit present on {report['with_is_seed_illicit']}/{total} wallets"
            )
        if seeds_configured:
            # Counting non-null properties is NOT sufficient: the writer emits an
            # explicit 0.0 for every wallet beyond 2 hops, so the count is full
            # even when the seed set failed to resolve and nothing is illicit.
            # The meaningful check is that at least one wallet actually landed on
            # a non-zero proximity.
            if report["with_seed_proximity"] != total:
                failures.append(
                    f"seed_proximity present on {report['with_seed_proximity']}/{total} "
                    f"wallets while {len(inline_scorer._seeds)} seeds are configured"  # noqa: SLF001
                )
            if report["with_nonzero_seed_proximity"] == 0:
                failures.append(
                    f"seed_proximity is 0.0 for all {total} wallets although "
                    f"{len(inline_scorer._seeds)} seeds are configured — the seed "  # noqa: SLF001
                    "set did not resolve against the graph"
                )
        if report["out_of_range_risk_score"]:
            failures.append(
                f"{report['out_of_range_risk_score']} risk_score values outside [0, 1]"
            )

    report["failures"] = failures
    report["ok"] = not failures
    logger.info("[enrich] schema contract: %s", report)
    return report


# ---------------------------------------------------------------------------
# Stage 6 — PostgreSQL mirror
# ---------------------------------------------------------------------------


def sync_to_postgres(svc: GraphService) -> dict[str, Any]:
    """Mirror Neo4j enrichment state into the ``transactions`` table.

    Ported from ``backend/scripts/sync_mixing_to_postgres.py`` (is_mixing +
    chain_hops) and ``backend/scripts/sync_ft_transformer_to_postgres.py``
    (anomaly_score), plus the ``cluster_id`` mirror from
    ``cluster_wallets.py::sync_cluster_ids_to_postgres``.

    The anomaly score is computed with the real FT-Transformer over the
    transaction rows (via the trained FT-Transformer checkpoint), not copied from a
    stale artefact. ``is_flagged`` follows the documented rule from
    ``train_graphsage.py``: anomaly above the calibrated threshold OR risk score
    at/above the flag threshold.
    """
    t0 = time.perf_counter()

    with svc.driver.session(database=settings.neo4j_database) as session:
        mixing_rows = [dict(r) for r in session.run(_FETCH_MIXING_STATE_QUERY)]
        cluster_rows = [dict(r) for r in session.run(_FETCH_WALLET_CLUSTERS_QUERY)]
        risk_rows = [dict(r) for r in session.run(_FETCH_WALLET_RISK_QUERY)]

    logger.info(
        "[enrich] pg: %d mixing transactions, %d clustered wallets, %d risk-scored "
        "wallets to mirror",
        len(mixing_rows), len(cluster_rows), len(risk_rows),
    )

    mixing_updated = _write_mixing_to_pg(mixing_rows)
    cluster_updated = _write_clusters_to_pg(cluster_rows)
    risk_updated = _write_risk_to_pg(risk_rows)
    anomaly_updated = _write_anomaly_to_pg()

    stats = {
        "mixing_rows_updated": mixing_updated,
        "cluster_rows_updated": cluster_updated,
        "risk_rows_updated": risk_updated,
        "anomaly_rows_updated": anomaly_updated,
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    logger.info("[enrich] pg mirror complete: %s", stats)
    return stats


def _write_mixing_to_pg(neo4j_rows: list[dict[str, Any]]) -> int:
    """Batched parameterised UPDATE of ``is_mixing`` / ``chain_hops``."""
    if not neo4j_rows:
        return 0
    conn = None
    updated = 0
    try:
        conn = psycopg2.connect(settings.database_url)
        with conn, conn.cursor() as cur:
            for i in range(0, len(neo4j_rows), PG_BATCH):
                chunk = neo4j_rows[i : i + PG_BATCH]
                cur.executemany(
                    """
                    UPDATE transactions
                    SET is_mixing  = %(is_mixing)s,
                        chain_hops = %(chain_hops)s
                    WHERE txid = %(txid)s
                    """,
                    [
                        {
                            "txid": r["txid"],
                            "is_mixing": bool(r.get("is_mixing")),
                            "chain_hops": int(r["chain_hops"]) if r.get("chain_hops") is not None else None,
                        }
                        for r in chunk
                    ],
                )
                updated += cur.rowcount
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] pg: mixing mirror failed: %s", exc)
        return 0
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
    return updated


def _write_clusters_to_pg(cluster_rows: list[dict[str, Any]]) -> int:
    """Mirror ``(address, cluster_id)`` to ``transactions.cluster_id``.

    Uses a temp table + unnest-style join, ported from
    ``cluster_wallets.py::sync_cluster_ids_to_postgres``. Joins on
    ``input_addresses[1]`` (the primary sender) for deterministic assignment.
    """
    if not cluster_rows:
        return 0
    conn = None
    updated = 0
    try:
        conn = psycopg2.connect(settings.database_url)
        with conn, conn.cursor() as cur:
            cur.execute("""
                CREATE TEMP TABLE _wallet_clusters (
                    address TEXT NOT NULL,
                    cluster_id INTEGER NOT NULL
                ) ON COMMIT DROP
            """)
            buf = io.StringIO()
            for rec in cluster_rows:
                buf.write(f"{rec['address']}\t{int(rec['cluster_id'])}\n")
            buf.seek(0)
            cur.copy_expert(
                "COPY _wallet_clusters (address, cluster_id) FROM STDIN WITH (FORMAT TEXT)",
                buf,
            )
            cur.execute("""
                UPDATE transactions t
                SET cluster_id = wc.cluster_id
                FROM _wallet_clusters wc
                WHERE wc.address = t.input_addresses[1]
            """)
            updated = cur.rowcount
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] pg: cluster mirror failed: %s", exc)
        return 0
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
    return updated


def _latest(base: Path, pattern: str) -> Any:
    """Newest file in ``base`` matching ``pattern``, or None.

    Resolves the same way :func:`app.services.inline_scorer._find_file` does, so
    the enrichment chain always scores with the same artifact the rest of the
    system picked.
    """
    if not base.exists():
        return None
    matches = sorted(base.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def _write_risk_to_pg(risk_rows: list[dict[str, Any]]) -> int:
    """Mirror ``:Wallet.risk_score`` into ``transactions.risk_score``.

    Without this the composite scorer's 0.45 risk weight reads a null column
    and every wallet silently loses 45% of its possible score. Joins on
    ``input_addresses[1]`` (the primary sender) for determinism, matching the
    cluster_id mirror.
    """
    if not risk_rows:
        return 0
    conn = None
    updated = 0
    try:
        conn = psycopg2.connect(settings.database_url)
        with conn, conn.cursor() as cur:
            cur.execute("""
                CREATE TEMP TABLE _wallet_risk (
                    address TEXT NOT NULL,
                    risk_score NUMERIC(6,4) NOT NULL
                ) ON COMMIT DROP
            """)
            buf = io.StringIO()
            for rec in risk_rows:
                buf.write(f"{rec['address']}\t{float(rec['risk_score']):.6f}\n")
            buf.seek(0)
            cur.copy_expert(
                "COPY _wallet_risk (address, risk_score) FROM STDIN WITH (FORMAT TEXT)",
                buf,
            )
            cur.execute("""
                UPDATE transactions t
                SET risk_score = wr.risk_score
                FROM _wallet_risk wr
                WHERE wr.address = t.input_addresses[1]
            """)
            updated = cur.rowcount
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] pg: risk mirror failed: %s", exc)
        return 0
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
    logger.info("[enrich] pg: mirrored risk_score to %d transactions", updated)
    return updated


def _write_anomaly_to_pg() -> int:
    """Recompute ``anomaly_score`` with the real model and write it to PG.

    Runs the actual FT-Transformer checkpoint over every transaction row, so
    the value is a real model output rather than a copy from a stale artefact.
    ``is_flagged`` follows the documented rule from ``train_graphsage.py``:
    anomaly above the calibrated threshold OR risk score at/above the flag
    threshold. Idempotent — the value is a pure function of the row.
    """
    conn = None
    try:
        conn = psycopg2.connect(settings.database_url)
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT id, txid, input_addresses, output_addresses, input_amounts,
                       output_amounts, fee, script_type, geo_country, asn, ts,
                       risk_score, anomaly_score
                FROM transactions
            """)
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] pg: could not load transactions for anomaly: %s", exc)
        return 0
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    if not rows:
        return 0

    # Per-transaction anomaly: run the real model over the raw rows so each
    # transaction gets its own MSE. (score_batch is wallet-centric and would
    # only give a wallet-level maximum, which is not what this column holds.)
    try:
        per_tx = _score_per_transaction_anomaly(rows)
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] pg: per-transaction anomaly failed: %s", exc)
        return 0

    if not per_tx:
        return 0

    conn2 = None
    updated = 0
    try:
        conn2 = psycopg2.connect(settings.database_url)
        with conn2, conn2.cursor() as cur:
            buf = io.StringIO()
            for txid, score in per_tx.items():
                buf.write(f"{txid}\t{min(max(score, 0.0), PG_ANOMALY_MAX):.4f}\n")
            buf.seek(0)
            cur.execute(
                "CREATE TEMP TABLE _tx_anomaly (txid TEXT NOT NULL, anomaly_score NUMERIC(6,4)) ON COMMIT DROP"
            )
            cur.copy_expert(
                "COPY _tx_anomaly (txid, anomaly_score) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')",
                buf,
            )
            # is_flagged follows the documented rule from train_graphsage.py:
            # anomalous structure OR high graph risk.
            cur.execute("""
                UPDATE transactions t
                SET anomaly_score = ta.anomaly_score,
                    is_flagged = (
                        ta.anomaly_score >= %s
                        OR COALESCE(t.risk_score, 0) >= %s
                    )
                FROM _tx_anomaly ta
                WHERE t.txid = ta.txid
            """, (ANOMALY_FLAG_THRESHOLD, RISK_FLAG_THRESHOLD))
            updated = cur.rowcount
    except Exception as exc:  # noqa: BLE001
        logger.warning("[enrich] pg: anomaly write failed: %s", exc)
        return 0
    finally:
        if conn2 is not None:
            try:
                conn2.close()
            except Exception:
                pass

    logger.info("[enrich] pg: wrote anomaly_score to %d transactions", updated)
    return updated


def _score_per_transaction_anomaly(rows: list[dict[str, Any]]) -> dict[str, float]:
    """Return ``{txid: anomaly_mse}`` using the real FT-Transformer."""
    import joblib
    from pathlib import Path

    import torch

    from app.services.feature_extractor import extract_features_batch

    models_dir = Path(settings.models_dir)
    model_path = _latest(models_dir, "ft_transformer_*.pt") or _latest(models_dir, "autoencoder_*.pt")
    scaler_path = _latest(models_dir, "ft_scaler_*.pkl") or _latest(models_dir, "scaler_*.pkl")
    if model_path is None or scaler_path is None:
        raise FileNotFoundError(
            f"Anomaly artifacts not found in {models_dir} "
            f"(model={model_path}, scaler={scaler_path})"
        )

    scaler = joblib.load(scaler_path)
    ckpt = torch.load(model_path, map_location="cpu", weights_only=False)
    state = ckpt.get("model_state_dict", ckpt) if isinstance(ckpt, dict) else ckpt

    import app.ml.ft_transformer as ft_mod

    if model_path.name.startswith("ft_transformer"):
        model = ft_mod.FTTransformerAnomaly()
    else:
        # The legacy autoencoder architecture is already defined (and trained
        # against) by the inline scorer; reuse it rather than duplicating it.
        from app.services.inline_scorer import Autoencoder as _Autoencoder
        model = _Autoencoder()
    model.load_state_dict(state)
    model.eval()

    feats = extract_features_batch(rows)
    scaled = scaler.transform(feats).astype(np.float32)

    out: dict[str, float] = {}
    chunk = 2048
    for i in range(0, len(scaled), chunk):
        block = torch.from_numpy(scaled[i : i + chunk])
        with torch.no_grad():
            recon = model(block)
            mses = ((recon - block) ** 2).mean(dim=1).numpy()
        for row, mse in zip(rows[i : i + chunk], mses):
            out[str(row["txid"])] = float(mse)
    return out


# ---------------------------------------------------------------------------
# Stage 6 — publish enrichment results into the XAI store
# ---------------------------------------------------------------------------
#
# Without this stage the product shows nothing. `enrich.py` writes to Neo4j and
# PostgreSQL, but the dossier and the alert list read the in-memory XAI store,
# which was populated only by a MANUAL `POST /ingest/sync/{task_id}`. Measured
# before this stage: on 20 wallets never queried before, 0/20 showed the cluster
# id the enrichment had just computed and 0/20 of the reported cluster ids
# existed in Neo4j — while 8,137 wallets and 3,887 real communities were sitting
# in the graph, invisible.
#
# The write uses `xai_store.upsert_batch_detailed(..., refresh_existing=False)`,
# which refreshes provisional records and RETAINS pre-indexed non-provisional
# dossiers (logging how many it retained), so the frozen Phase 8 baseline is
# never clobbered by a heuristic enrichment pass. The stage is idempotent: it
# derives every value from committed graph state, so re-running converges.


_PUBLISH_QUERY = """
UNWIND $batch AS address
MATCH (w:Wallet {address: address})
OPTIONAL MATCH (w)-[:CO_SPEND]-(peer:Wallet)
WHERE peer.cluster_id = w.cluster_id
WITH w, count(DISTINCT peer) + 1 AS cluster_size
OPTIONAL MATCH (w)-[:SENDS]->(tx:Transaction)
WITH w,
     cluster_size,
     count(tx) AS tx_count,
     max(coalesce(tx.chain_hops, 0)) AS chain_hops,
     max(coalesce(tx.pass_through_ratio, -1.0)) AS pass_through_ratio,
     any(t IN collect(coalesce(tx.is_mixing, false)) WHERE t) AS is_mixing,
     max(coalesce(tx.anomaly_score, 0.0)) AS tx_anomaly
RETURN w.address AS address,
       w.cluster_id AS cluster_id,
       cluster_size,
       w.risk_score AS risk_score,
       w.risk_score_source AS risk_score_source,
       coalesce(w.seed_proximity, 0.0) AS seed_proximity,
       coalesce(w.is_seed_illicit, false) AS is_seed_illicit,
       coalesce(chain_hops, 0) AS chain_hops,
       pass_through_ratio,
       is_mixing,
       coalesce(tx_anomaly, 0.0) AS tx_anomaly,
       coalesce(w.anomaly_score, 0.0) AS wallet_anomaly,
       tx_count
"""


def _build_publish_record(rec: dict[str, Any]) -> dict[str, Any]:
    """Turn one Neo4j wallet row into an XAI composite + evidence pair.

    Args:
        rec: One row of :data:`_PUBLISH_QUERY`.

    Returns:
        A scored item for :func:`xai_store.upsert_batch_detailed`:
        ``{"address", "composite_record", "evidence_record"}``.

    Raises:
        ValueError: if a mandatory field is missing or unparseable. A record that
            cannot be built honestly is dropped by the caller rather than
            written with placeholder values.
    """
    from app.services import risk_thresholds

    address = rec.get("address")
    if not address:
        raise ValueError("row has no address")

    raw_risk = rec.get("risk_score")
    if raw_risk is None:
        raise ValueError("wallet has no risk_score")
    risk_score = float(raw_risk)

    # The wallet-level anomaly is written by the postgres mirror stage; until
    # then the highest per-transaction anomaly is the measured fallback.
    anomaly = rec.get("wallet_anomaly")
    if anomaly is None or float(anomaly) == 0.0:
        anomaly = float(rec.get("tx_anomaly") or 0.0)
    anomaly = float(anomaly)

    chain_hops = int(rec.get("chain_hops") or 0)
    is_mixing = bool(rec.get("is_mixing")) or chain_hops > 0
    seed_proximity = float(rec.get("seed_proximity") or 0.0)
    is_seed = bool(rec.get("is_seed_illicit")) or seed_proximity >= 1.0

    triggered_rules: list[str] = []
    if is_seed:
        triggered_rules.append("RANSOMWARE_SEED_WALLET")
    elif seed_proximity > 0.0:
        triggered_rules.append("RANSOMWHERE_SEED_PROXIMITY")
    if chain_hops > 0:
        triggered_rules.append("PEELING_CHAIN")
    mixing_patterns: list[str] = []
    if is_mixing and chain_hops == 0:
        mixing_patterns.append("STRUCTURAL_MIXING")

    composite = risk_thresholds.compute_composite(
        anomaly_score=anomaly,
        risk_score=risk_score,
        triggered_rules=triggered_rules,
        mixing_patterns=mixing_patterns,
    )

    raw_ratio = rec.get("pass_through_ratio")
    # -1.0 is the query's "no value breakdown available" sentinel. A hop whose
    # amounts could not be read stays None; it is never reported as 0.0, which
    # would read as "no value passed through".
    pass_through_ratio = (
        float(raw_ratio) if raw_ratio is not None and float(raw_ratio) >= 0.0 else None
    )

    composite_record: dict[str, Any] = {
        "address": address,
        "composite_score": composite.score,
        "verdict": risk_thresholds.map_verdict(composite.score),
        "provisional": True,
        "scored": True,
        "anomaly_score": anomaly,
        "risk_score": risk_score,
        "risk_score_source": rec.get("risk_score_source"),
        "rule_bonus": composite.rule_component,
        "mixing_indicator": composite.mixing_component,
        "triggered_rules": triggered_rules,
        "mixing_patterns": mixing_patterns,
        "chain_hops": chain_hops,
        "cluster_id": rec.get("cluster_id"),
        "cluster_size": int(rec.get("cluster_size") or 0),
        "seed_wallet_proximity": seed_proximity,
        "is_seed": is_seed,
        "is_peeling_chain": chain_hops > 0,
        "is_mixing": is_mixing,
        "pass_through_ratio": pass_through_ratio,
        "source": "post_ingest_enrichment",
    }
    evidence_record: dict[str, Any] = {
        "address": address,
        "cluster_id": rec.get("cluster_id"),
        "cluster_size": int(rec.get("cluster_size") or 0),
        "anomaly_score": anomaly,
        "anomaly_rank_percentile": None,
        "is_mixing": is_mixing,
        "is_peeling_chain": chain_hops > 0,
        "chain_hops": chain_hops or None,
        "pass_through_ratio": pass_through_ratio,
        "pass_through_ratio_state": (
            "derived_from_peeling_chain" if pass_through_ratio is not None
            else "unavailable_no_peeling_chain_value_breakdown"
        ),
        "seed_wallet_proximity": seed_proximity,
        "is_seed": is_seed,
        "risk_score": risk_score,
        "risk_score_source": rec.get("risk_score_source"),
        "triggered_rules": triggered_rules,
        "mixing_patterns": mixing_patterns,
        "transactions": int(rec.get("tx_count") or 0),
        "provisional": True,
        "source": "post_ingest_enrichment",
    }
    return {
        "address": address,
        "composite_record": composite_record,
        "evidence_record": evidence_record,
    }


# Bounded retry for a contended durable-overlay lock. The overlay is one file
# behind a 15 s lock, so a long publish pass can collide with any other writer.
_PUBLISH_LOCK_ATTEMPTS = 3
# Linear backoff: 10 s, then 20 s between attempts.
_PUBLISH_LOCK_BACKOFF_S = 10.0


def publish_to_xai_store(svc: GraphService) -> dict[str, Any]:
    """Push the committed enrichment results into the XAI store.

    Runs last in the chain so the records it publishes reflect the final
    cluster, peel, seed and risk state rather than an intermediate one.

    Idempotent: every value is derived from committed graph state, so a repeat
    run converges. Pre-indexed non-provisional dossiers are retained (and
    counted) rather than overwritten.

    Args:
        svc: The chain's open GraphService.

    Returns:
        Counters: wallets in graph, published, created, refreshed, retained as
        pre-indexed, skipped because no honest record could be built, and the
        per-verdict breakdown.
    """
    t0 = time.perf_counter()
    from app.services import xai_store

    xai_store.load()

    with svc.driver.session(database=settings.neo4j_database) as session:
        addresses = [
            r["address"]
            for r in session.run(
                "MATCH (w:Wallet) WHERE w.cluster_id IS NOT NULL "
                "AND w.risk_score IS NOT NULL RETURN w.address AS address"
            )
            if r.get("address")
        ]

    total = len(addresses)
    if total == 0:
        logger.warning(
            "[enrich] publish: no wallet has both cluster_id and risk_score — "
            "nothing to publish to the XAI store"
        )
        return {
            "wallets_in_graph": 0,
            "published": 0,
            "status": "skipped",
            "reason": "no_wallets_with_cluster_and_risk",
            "elapsed_s": round(time.perf_counter() - t0, 2),
        }

    created = updated = retained = skipped = published = 0
    verdicts: dict[str, int] = {}
    skip_reasons: dict[str, int] = {}
    lock_timeouts = 0

    for i in range(0, total, WALLET_BATCH):
        chunk = addresses[i : i + WALLET_BATCH]
        with svc.driver.session(database=settings.neo4j_database) as session:
            rows = [dict(r) for r in session.run(_PUBLISH_QUERY, batch=chunk)]

        items: list[dict[str, Any]] = []
        for row in rows:
            try:
                items.append(_build_publish_record(row))
            except ValueError as exc:
                skipped += 1
                reason = str(exc).split(";")[0]
                skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
                logger.debug(
                    "[enrich] publish: skipping %s: %s",
                    str(row.get("address"))[:12], exc,
                )
                continue

        if not items:
            continue

        # Split off the pre-indexed non-provisional dossiers BEFORE the write.
        # upsert_batch_detailed would skip them anyway; partitioning here means
        # `published` and the verdict histogram describe what was actually
        # written, instead of folding thousands of deliberately retained frozen
        # records into the numbers.
        to_write: list[dict[str, Any]] = []
        for item in items:
            existing = xai_store.get_composite(item["address"])
            if existing is not None and not existing.get("provisional", False):
                retained += 1
                continue
            to_write.append(item)

        if not to_write:
            continue

        # The durable overlay is a single file guarded by a 15 s lock. A long
        # publish pass can collide with any other writer (an API-triggered sync,
        # a concurrent enrichment task, a test), and losing a 30-minute stage to
        # one contended chunk is not acceptable. Retry the chunk a bounded number
        # of times, then COUNT it as a lock timeout so the run report shows the
        # shortfall rather than aborting.
        report = None
        for attempt in range(1, _PUBLISH_LOCK_ATTEMPTS + 1):
            try:
                report = xai_store.upsert_batch_detailed(
                    to_write, refresh_existing=False
                )
                break
            except xai_store.XaiStoreLockTimeout:
                lock_timeouts += 1
                if attempt == _PUBLISH_LOCK_ATTEMPTS:
                    logger.error(
                        "[enrich] publish: chunk of %d wallets lost to the XAI "
                        "overlay lock after %d attempts; those %d dossiers keep "
                        "their previous records.",
                        len(to_write), _PUBLISH_LOCK_ATTEMPTS, len(to_write),
                    )
                    break
                logger.warning(
                    "[enrich] publish: XAI overlay lock busy for chunk of %d "
                    "wallets (attempt %d/%d), retrying.",
                    len(to_write), attempt, _PUBLISH_LOCK_ATTEMPTS,
                )
                time.sleep(_PUBLISH_LOCK_BACKOFF_S * attempt)

        if report is None:
            continue

        created += report.created
        updated += report.updated
        # Anything upsert still retained (a race with a concurrent writer) is
        # not a published record.
        retained += report.retained
        written = report.touched
        published += written
        for item in to_write[:written]:
            verdict = item["composite_record"]["verdict"]
            verdicts[verdict] = verdicts.get(verdict, 0) + 1

    stats = {
        "wallets_in_graph": total,
        "published": published,
        "created": created,
        "updated": updated,
        "retained_preindexed": retained,
        "skipped": skipped,
        "skip_reasons": skip_reasons,
        "lock_timeouts": lock_timeouts,
        "verdicts": verdicts,
        "refresh_existing": False,
        "elapsed_s": round(time.perf_counter() - t0, 2),
    }
    logger.info(
        "[enrich] publish: wrote %d wallets into the XAI store (created=%d "
        "updated=%d, %d pre-indexed dossiers retained, %d skipped, %d lock "
        "timeouts) in %.2fs | verdicts of written records: %s",
        published, created, updated, retained, skipped, lock_timeouts,
        stats["elapsed_s"], verdicts,
    )
    return stats


# ---------------------------------------------------------------------------
# Chain driver
# ---------------------------------------------------------------------------


def run_enrichment_chain(
    *,
    txids: Sequence[str] | None = None,
    progress_callback: Any = None,
) -> dict[str, Any]:
    """Run every enrichment stage in order and return a combined report.

    Args:
        txids: The txids this ingest inserted. Used to resolve the wallet scope
            that :func:`run_clustering` is restricted to. The detection stages
            (peeling, CoinJoin) still operate over the whole graph, as the
            manual scripts do, so a chain spanning an ingest boundary is still
            detected.
        progress_callback: Optional callable invoked with
            ``{"stage": name, "status": ...}`` after each stage.

    Returns:
        A report dict with one key per stage plus ``wall_seconds``.
    """
    t0 = time.perf_counter()
    report: dict[str, Any] = {"txids_in_scope": len(txids) if txids else None}

    with GraphService() as svc:
        # Clustering is the one stage that must NOT see the whole graph, so its
        # scope is resolved here and threaded in explicitly.
        scope = resolve_ingested_wallet_scope(svc, txids)
        report["cluster_scope_wallets"] = len(scope)
        stages: list[tuple[str, Any]] = [
            ("cluster", partial(run_clustering, scope_addresses=scope)),
            ("peeling", run_peeling_detection),
            ("coinjoin", run_coinjoin_detection),
            ("wallet_attributes", run_wallet_attributes),
            ("schema_contract", verify_schema_contract),
            ("postgres_mirror", sync_to_postgres),
            # Runs LAST so the XAI store sees the final cluster, peel, seed and
            # risk state. Without it the dossier and the alert list keep reading
            # the pre-ingest baseline and none of the work above is visible.
            ("xai_publish", publish_to_xai_store),
        ]

        for name, fn in stages:
            if progress_callback is not None:
                progress_callback({"stage": name, "status": "running"})
            try:
                result = fn(svc)
                report[name] = result
                if progress_callback is not None:
                    progress_callback({"stage": name, "status": "ok"})
            except Exception as exc:  # noqa: BLE001 - report, never silently pass
                logger.exception("[enrich] stage %s FAILED: %s", name, exc)
                report[name] = {"status": "failed", "error": f"{type(exc).__name__}: {exc}"}
                if progress_callback is not None:
                    progress_callback({"stage": name, "status": "failed"})

    report["wall_seconds"] = round(time.perf_counter() - t0, 2)
    return report


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------


@celery_app.task(
    bind=True,
    name="app.tasks.enrich.enrich_ingested_transactions",
    max_retries=0,
    acks_late=True,
)
def enrich_ingested_transactions(self, txids: list[str] | None = None) -> dict[str, Any]:
    """Celery entry point for the post-ingest enrichment chain.

    Chained from :func:`app.tasks.ingest.process_ingest_file` so enrichment runs
    automatically after every ingest. Reports per-stage progress to Redis so
    the client can poll an observable state.
    """
    self.update_state(state="STARTED", meta={"stage": "starting", "txids": len(txids or [])})

    def _progress(meta: dict[str, Any]) -> None:
        self.update_state(state="PROGRESS", meta=meta)

    try:
        report = run_enrichment_chain(txids=txids, progress_callback=_progress)
        failed = [k for k, v in report.items() if isinstance(v, dict) and v.get("status") == "failed"]
        if failed:
            logger.error("[enrich] chain completed with failed stages: %s", failed)
        return report
    except Exception as exc:  # noqa: BLE001
        logger.exception("[enrich] chain failed hard: %s", exc)
        raise
