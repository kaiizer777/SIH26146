"""Graph router — Phase 9.

GET /api/v1/graph/{cluster_id}
  Returns a bounded Neo4j subgraph for D3 force-directed rendering.
  Queries :Wallet, :Transaction, :IP nodes and :SENDS, :RECEIVES,
  :CO_SPEND, :OBSERVED edges associated with the given cluster_id.

Query parameters:
  max_nodes int = 150  (hard ceiling: 250)
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from neo4j import AsyncGraphDatabase, AsyncDriver

from app.config import settings
from app.schemas.graph import GraphLink, GraphNode, GraphResponse
import app.services.xai_store as xai_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/graph", tags=["graph"])

# ---------------------------------------------------------------------------
# Neo4j async driver (module-level, one per process)
# ---------------------------------------------------------------------------

_driver: Optional[AsyncDriver] = None


def _get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

_MAX_NODES_CEILING = 250


@router.get(
    "/{cluster_id}",
    response_model=GraphResponse,
    summary="Bounded Neo4j subgraph for D3 force-directed canvas",
)
async def get_graph(
    cluster_id: int,
    max_nodes: int = Query(150, ge=1, le=_MAX_NODES_CEILING),
) -> GraphResponse:
    """Return nodes and links for the given cluster, capped at max_nodes.

    Node types: wallet | transaction | ip
    Link types: SENDS | RECEIVES | CO_SPEND | OBSERVED
    is_explanatory = True when the edge appears in a GNNExplainer subgraph.
    """
    effective_max = min(max_nodes, _MAX_NODES_CEILING)

    # Pre-collect GNN explanatory edge pairs for this cluster's wallets
    # so we can flag them in the response.
    explanatory_pairs: set[tuple[str, str]] = set()
    composite_snapshot = xai_store._composite
    cluster_wallets = [
        addr for addr, rec in composite_snapshot.items()
        if rec.get("cluster_id") == cluster_id
    ]
    for addr in cluster_wallets:
        gnn = xai_store.get_subgraph(addr)
        if gnn:
            for edge in gnn.get("edges", []):
                src = edge.get("source", "")
                tgt = edge.get("target", "")
                if src and tgt:
                    explanatory_pairs.add((src, tgt))

    try:
        driver = _get_driver()
        async with driver.session(database=settings.neo4j_database) as session:
            # --- Step 1: Get wallet nodes for this cluster ---
            wallet_result = await session.run(
                """
                MATCH (w:Wallet)
                WHERE w.cluster_id = $cluster_id
                RETURN w.address AS id,
                       w.address AS label,
                       coalesce(w.risk_score, 0.0) AS risk_score,
                       coalesce(w.anomaly_score, 0.0) AS anomaly_score,
                       coalesce(w.is_seed, false) AS is_seed
                LIMIT $limit
                """,
                cluster_id=cluster_id,
                limit=effective_max,
            )
            wallet_records = await wallet_result.data()

            if not wallet_records:
                # Cluster has no wallet nodes in Neo4j — return empty but valid
                return GraphResponse(cluster_id=cluster_id, nodes=[], links=[])

            wallet_ids = [r["id"] for r in wallet_records if r["id"]]
            seed_set = {r["id"] for r in wallet_records if r.get("is_seed")}

            nodes: list[GraphNode] = [
                GraphNode(
                    id=r["id"],
                    label=f"{r['id'][:6]}…{r['id'][-4:]}" if len(r["id"]) > 10 else r["id"],
                    type="wallet",
                    risk_score=float(r.get("risk_score", 0.0) or 0.0),
                    anomaly_score=float(r.get("anomaly_score", 0.0) or 0.0),
                    is_seed=bool(r.get("is_seed", False)),
                    country=None,
                )
                for r in wallet_records
                if r["id"]
            ]
            node_ids: set[str] = {n.id for n in nodes}

            # --- Step 2: Transaction nodes connected to cluster wallets ---
            remaining_slots = effective_max - len(nodes)
            if remaining_slots > 0 and wallet_ids:
                tx_result = await session.run(
                    """
                    MATCH (w:Wallet)-[:SENDS|RECEIVES]-(t:Transaction)
                    WHERE w.address IN $wallet_ids
                    RETURN DISTINCT t.txid AS id,
                           t.txid AS label,
                           coalesce(t.anomaly_score, 0.0) AS anomaly_score
                    LIMIT $limit
                    """,
                    wallet_ids=wallet_ids,
                    limit=remaining_slots,
                )
                for r in await tx_result.data():
                    if r["id"] and r["id"] not in node_ids:
                        nodes.append(GraphNode(
                            id=r["id"],
                            label=f"{r['id'][:6]}…{r['id'][-4:]}" if len(r["id"]) > 10 else r["id"],
                            type="transaction",
                            risk_score=None,
                            anomaly_score=float(r.get("anomaly_score", 0.0) or 0.0),
                            is_seed=False,
                        ))
                        node_ids.add(r["id"])

            # --- Step 3: IP nodes ---
            remaining_slots = effective_max - len(nodes)
            if remaining_slots > 0 and wallet_ids:
                ip_result = await session.run(
                    """
                    MATCH (w:Wallet)-[:OBSERVED]-(ip:IP)
                    WHERE w.address IN $wallet_ids
                    RETURN DISTINCT ip.address AS id,
                           ip.address AS label,
                           ip.country AS country
                    LIMIT $limit
                    """,
                    wallet_ids=wallet_ids,
                    limit=remaining_slots,
                )
                for r in await ip_result.data():
                    if r["id"] and r["id"] not in node_ids:
                        nodes.append(GraphNode(
                            id=r["id"],
                            label=r["id"],
                            type="ip",
                            risk_score=None,
                            anomaly_score=None,
                            is_seed=False,
                            country=r.get("country"),
                        ))
                        node_ids.add(r["id"])

            # --- Step 4: Edges ---
            links: list[GraphLink] = []

            # SENDS / RECEIVES between wallets and transactions
            if wallet_ids:
                edge_result = await session.run(
                    """
                    MATCH (w:Wallet)-[r:SENDS|RECEIVES]-(t:Transaction)
                    WHERE w.address IN $wallet_ids
                      AND t.txid IN $tx_ids
                    RETURN w.address AS source,
                           t.txid AS target,
                           type(r) AS rel_type,
                           coalesce(r.amount, 0.0) AS amount
                    """,
                    wallet_ids=wallet_ids,
                    tx_ids=[n.id for n in nodes if n.type == "transaction"],
                )
                for r in await edge_result.data():
                    src, tgt = r["source"], r["target"]
                    if src in node_ids and tgt in node_ids:
                        links.append(GraphLink(
                            source=src,
                            target=tgt,
                            type=r["rel_type"],
                            amount=float(r.get("amount", 0.0) or 0.0),
                            is_explanatory=(src, tgt) in explanatory_pairs or (tgt, src) in explanatory_pairs,
                        ))

            # CO_SPEND edges between wallets
            if len(wallet_ids) >= 2:
                co_result = await session.run(
                    """
                    MATCH (w1:Wallet)-[r:CO_SPEND]-(w2:Wallet)
                    WHERE w1.address IN $wallet_ids AND w2.address IN $wallet_ids
                    RETURN w1.address AS source, w2.address AS target
                    LIMIT 500
                    """,
                    wallet_ids=wallet_ids,
                )
                for r in await co_result.data():
                    src, tgt = r["source"], r["target"]
                    if src in node_ids and tgt in node_ids:
                        links.append(GraphLink(
                            source=src,
                            target=tgt,
                            type="CO_SPEND",
                            amount=None,
                            is_explanatory=(src, tgt) in explanatory_pairs or (tgt, src) in explanatory_pairs,
                        ))

            # OBSERVED edges (wallet → IP)
            if wallet_ids:
                obs_result = await session.run(
                    """
                    MATCH (w:Wallet)-[r:OBSERVED]-(ip:IP)
                    WHERE w.address IN $wallet_ids AND ip.address IN $ip_ids
                    RETURN w.address AS source, ip.address AS target
                    """,
                    wallet_ids=wallet_ids,
                    ip_ids=[n.id for n in nodes if n.type == "ip"],
                )
                for r in await obs_result.data():
                    src, tgt = r["source"], r["target"]
                    if src in node_ids and tgt in node_ids:
                        links.append(GraphLink(
                            source=src,
                            target=tgt,
                            type="OBSERVED",
                            amount=None,
                            is_explanatory=False,
                        ))

    except Exception as exc:
        logger.error("Neo4j graph query failed for cluster_id=%d: %s", cluster_id, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Graph database unavailable: {exc}",
        )

    return GraphResponse(cluster_id=cluster_id, nodes=nodes, links=links)
