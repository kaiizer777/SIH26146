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


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


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


    try:
        driver = _get_driver()
        async with driver.session(database=settings.neo4j_database) as session:
            # --- Quota Budgets & Proportional Allocation ---
            # 1. Wallet Budget: up to 65% of effective_max, capped at 100
            wallet_target = max(1, min(int(effective_max * 0.65), 100))
            # 2. Transaction Budget: base 25% of effective_max, base cap 35
            base_tx_budget = max(0, min(int(effective_max * 0.25), 35))
            # 3. IP Host Budget: base 10% of effective_max, base cap 15
            base_ip_budget = max(0, min(int(effective_max * 0.10), 15))

            # --- Step 1: Get wallet nodes for this cluster (prioritizing high risk & anomaly) ---
            wallet_result = await session.run(
                """
                MATCH (w:Wallet)
                WHERE w.cluster_id = $cluster_id
                RETURN w.address AS id,
                       w.address AS label,
                       coalesce(w.risk_score, 0.0) AS risk_score,
                       coalesce(w.anomaly_score, 0.0) AS anomaly_score,
                       coalesce(w.is_seed_illicit, false) AS is_seed_illicit
                ORDER BY coalesce(w.risk_score, 0.0) DESC, coalesce(w.anomaly_score, 0.0) DESC
                LIMIT $limit
                """,
                cluster_id=cluster_id,
                limit=wallet_target,
            )
            wallet_records = await wallet_result.data()

            if not wallet_records:
                # Cluster has no wallet nodes in Neo4j — return empty but valid
                return GraphResponse(cluster_id=cluster_id, nodes=[], links=[])

            nodes: list[GraphNode] = []
            for r in wallet_records:
                addr = r["id"]
                if not addr:
                    continue
                neo_seed = bool(r.get("is_seed_illicit", False))
                comp = xai_store.get_composite(addr) or {}
                ev = xai_store.get_evidence(addr) or {}
                comp_rules = comp.get("triggered_rules") or []
                ev_rules = ev.get("triggered_rules") or []
                rules = set(comp_rules) | set(ev_rules)
                has_seed_rule = any(
                    ("SEED" in str(rule).upper() or "RANSOMWARE" in str(rule).upper())
                    and "RECIPIENT" not in str(rule).upper()
                    for rule in rules
                )
                is_seed = (
                    neo_seed
                    or bool(comp.get("is_seed", False))
                    or bool(ev.get("is_seed", False))
                    or has_seed_rule
                )

                risk_val = float(r.get("risk_score", 0.0) or comp.get("risk_score", 0.0) or 0.0)
                anomaly_val = float(r.get("anomaly_score", 0.0) or comp.get("anomaly_score", 0.0) or 0.0)

                nodes.append(GraphNode(
                    id=addr,
                    label=f"{addr[:6]}…{addr[-4:]}" if len(addr) > 10 else addr,
                    type="wallet",
                    risk_score=risk_val,
                    anomaly_score=anomaly_val,
                    is_seed=is_seed,
                    country=None,
                ))

            wallet_ids = [n.id for n in nodes]
            node_ids: set[str] = {n.id for n in nodes}

            # Collect GNN explanatory edge pairs for retrieved wallets
            explanatory_pairs: set[tuple[str, str]] = set()
            for addr in wallet_ids:
                gnn = xai_store.get_subgraph(addr)
                if gnn:
                    for edge in gnn.get("edges", []):
                        src = edge.get("source", "")
                        tgt = edge.get("target", "")
                        if src and tgt:
                            explanatory_pairs.add((src, tgt))

            # --- Calculate Dynamic Rollover for Transactions and IPs ---
            wallets_count = len(nodes)
            remaining_total = effective_max - wallets_count

            if remaining_total > 0:
                unused_wallet_slots = max(0, wallet_target - wallets_count)
                headroom = max(0, effective_max - (wallet_target + base_tx_budget + base_ip_budget))
                rollover_pool = unused_wallet_slots + headroom

                extra_tx = int(rollover_pool * 0.70)
                extra_ip = rollover_pool - extra_tx

                tx_budget = base_tx_budget + extra_tx
                ip_budget = base_ip_budget + extra_ip

                reserve_for_ip = min(ip_budget, remaining_total)
                tx_limit = max(0, min(tx_budget, remaining_total - reserve_for_ip))
            else:
                tx_limit = 0
                ip_budget = 0

            # --- Step 2: Transaction nodes connected to cluster wallets ---
            tx_ids: list[str] = []
            if tx_limit > 0 and wallet_ids:
                tx_result = await session.run(
                    """
                    MATCH (w:Wallet)-[:SENDS|RECEIVES]-(t:Transaction)
                    WHERE w.address IN $wallet_ids
                    WITH DISTINCT t
                    RETURN t.txid AS id,
                           t.txid AS label,
                           coalesce(t.anomaly_score, 0.0) AS anomaly_score
                    ORDER BY coalesce(t.total_out, 0.0) DESC
                    LIMIT $limit
                    """,
                    wallet_ids=wallet_ids,
                    limit=tx_limit,
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
                            country=None,
                        ))
                        node_ids.add(r["id"])
                        tx_ids.append(r["id"])

            # --- Step 3: IP nodes connected to retrieved transactions ---
            remaining_slots = effective_max - len(nodes)
            if remaining_slots > 0 and tx_ids:
                unused_tx = max(0, tx_limit - len(tx_ids))
                ip_limit = min(remaining_slots, ip_budget + unused_tx)
                if ip_limit > 0:
                    ip_result = await session.run(
                        """
                        MATCH (ip:IP)-[:OBSERVED]-(t:Transaction)
                        WHERE t.txid IN $tx_ids
                        RETURN DISTINCT ip.address AS id,
                                        ip.address AS label,
                                        ip.country AS country
                        LIMIT $limit
                        """,
                        tx_ids=tx_ids,
                        limit=ip_limit,
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
            seen_links: set[tuple[str, str, str]] = set()

            # SENDS / RECEIVES between wallets and transactions
            ip_ids = [n.id for n in nodes if n.type == "ip"]
            if wallet_ids and tx_ids:
                edge_result = await session.run(
                    """
                    MATCH (w:Wallet)-[r:SENDS|RECEIVES]-(t:Transaction)
                    WHERE w.address IN $wallet_ids
                      AND t.txid IN $tx_ids
                    RETURN CASE WHEN type(r) = 'RECEIVES' THEN t.txid ELSE w.address END AS source,
                           CASE WHEN type(r) = 'RECEIVES' THEN w.address ELSE t.txid END AS target,
                           type(r) AS rel_type,
                           coalesce(r.amount, 0.0) AS amount
                    """,
                    wallet_ids=wallet_ids,
                    tx_ids=tx_ids,
                )
                for r in await edge_result.data():
                    src, tgt = r["source"], r["target"]
                    rel_type = r["rel_type"]
                    if src in node_ids and tgt in node_ids:
                        link_key = (src, tgt, rel_type)
                        if link_key not in seen_links:
                            seen_links.add(link_key)
                            links.append(GraphLink(
                                source=src,
                                target=tgt,
                                type=rel_type,
                                amount=float(r.get("amount", 0.0) or 0.0),
                                is_explanatory=(src, tgt) in explanatory_pairs or (tgt, src) in explanatory_pairs,
                            ))

            # CO_SPEND edges between wallets
            if len(wallet_ids) >= 2:
                co_result = await session.run(
                    """
                    MATCH (w1:Wallet)-[r:CO_SPEND]-(w2:Wallet)
                    WHERE w1.address IN $wallet_ids 
                      AND w2.address IN $wallet_ids
                      AND w1.address < w2.address
                    RETURN w1.address AS source, w2.address AS target
                    LIMIT 500
                    """,
                    wallet_ids=wallet_ids,
                )
                for r in await co_result.data():
                    src, tgt = r["source"], r["target"]
                    if src in node_ids and tgt in node_ids:
                        link_key = (src, tgt, "CO_SPEND")
                        rev_key = (tgt, src, "CO_SPEND")
                        if link_key not in seen_links and rev_key not in seen_links:
                            seen_links.add(link_key)
                            links.append(GraphLink(
                                source=src,
                                target=tgt,
                                type="CO_SPEND",
                                amount=None,
                                is_explanatory=(src, tgt) in explanatory_pairs or (tgt, src) in explanatory_pairs,
                            ))

            # OBSERVED edges (IP ↔ Transaction)
            if ip_ids and tx_ids:
                obs_result = await session.run(
                    """
                    MATCH (ip:IP)-[r:OBSERVED]-(t:Transaction)
                    WHERE ip.address IN $ip_ids AND t.txid IN $tx_ids
                    RETURN DISTINCT ip.address AS source, t.txid AS target
                    """,
                    ip_ids=ip_ids,
                    tx_ids=tx_ids,
                )
                for r in await obs_result.data():
                    src, tgt = r["source"], r["target"]
                    if src in node_ids and tgt in node_ids:
                        link_key = (src, tgt, "OBSERVED")
                        if link_key not in seen_links:
                            seen_links.add(link_key)
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
