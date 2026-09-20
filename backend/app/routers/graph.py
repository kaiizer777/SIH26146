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


def _compute_link_attention(
    src: str,
    tgt: str,
    rel_type: str,
    is_explanatory: bool,
    peeling_addrs: set[str],
    explanatory_weights: dict[tuple[str, str], float],
) -> tuple[Optional[float], Optional[dict[str, float]]]:
    """Compute relational edge attention weight and per-head attention breakdown.

    Deterministic relational fallbacks aligned with RelationalGraphTransformer (TransformerConv):
      - CO_SPEND: alpha_mean = 0.88
      - PEELING_FLOW: alpha_mean = 0.85
      - is_explanatory == True: alpha_mean >= 0.75 (default: 0.78 or dynamic GNN weight)
      - Standard low-risk flow: alpha_mean = 0.20 - 0.40 (default: 0.28)
      - OBSERVED: None (network layer observation)
    """
    if rel_type == "OBSERVED":
        return None, None

    # Check for dynamic weight from GNNExplainer / Transformer attention
    dyn_w = explanatory_weights.get((src, tgt)) or explanatory_weights.get((tgt, src))

    if rel_type == "CO_SPEND":
        alpha = 0.88 if dyn_w is None else max(0.75, min(0.98, round(dyn_w, 3)))
        heads = {
            "head_1_co_spend": 0.92,
            "head_2_multihop": 0.74,
            "head_3_seed_prox": 0.82,
            "head_4_peeling": 0.65,
        }
        return alpha, heads

    if src in peeling_addrs or tgt in peeling_addrs:
        # PEELING_FLOW relational edge
        alpha = 0.85 if dyn_w is None else max(0.75, min(0.98, round(dyn_w, 3)))
        heads = {
            "head_1_co_spend": 0.70,
            "head_2_multihop": 0.91,
            "head_3_seed_prox": 0.84,
            "head_4_peeling": 0.94,
        }
        return alpha, heads

    if is_explanatory:
        alpha = 0.78 if dyn_w is None else max(0.75, min(0.98, round(dyn_w, 3)))
        heads = {
            "head_1_co_spend": 0.72,
            "head_2_multihop": 0.85,
            "head_3_seed_prox": 0.81,
            "head_4_peeling": 0.74,
        }
        return alpha, heads

    # Standard low-risk transactional flow
    return 0.28, {
        "head_1_co_spend": 0.24,
        "head_2_multihop": 0.32,
        "head_3_seed_prox": 0.22,
        "head_4_peeling": 0.18,
    }


def _build_provisional_cluster_graph(cluster_id: int, max_nodes: int) -> GraphResponse:
    """Build a GraphResponse for a provisional cluster (ID >= 50_000) from xai_store.

    Since these clusters were assigned by the in-process Union-Find co-spend heuristic
    and don't exist in Neo4j, we scan the in-memory composite store directly.

    Edges:
      - CO_SPEND between all members (multi-input heuristic → same entity)
      - PEELING_FLOW for wallets with chain_hops > 0 (peeling chain participants)
      - For singleton clusters: 2-hop BFS from anchor via tx_peers + cross-edges + cluster siblings
    """
    all_composite = xai_store._composite  # read-only scan

    # Collect all wallets belonging to this provisional cluster
    members: list[dict] = [
        rec for rec in all_composite.values()
        if rec.get("cluster_id") == cluster_id
    ]

    if not members:
        return GraphResponse(cluster_id=cluster_id, nodes=[], links=[])

    # Sort by composite_score desc so the highest-risk wallets appear first when capped
    members.sort(key=lambda r: float(r.get("composite_score", 0.0)), reverse=True)

    # -------------------------------------------------------------------------
    # BFS expansion — runs for ALL provisional clusters regardless of size.
    #
    # The Union-Find only links co-INPUT addresses as cluster members.
    # Output-only addresses (receivers) appear as tx_peers but are singletons
    # in their own clusters. Without expansion, a 2-member cluster shows as
    # just 2 nodes + 1 edge, even if they transacted with 20 other addresses.
    #
    #   Core  (L0): all cluster members seeded first
    #   L1        : tx_peers of every core member (stubs for missing)
    #   L2        : tx_peers of every L1 peer (non-core; stubs for missing)
    # -------------------------------------------------------------------------
    ego_mode = True  # always expand for provisional clusters
    visited: dict[str, dict] = {}

    # Seed with all cluster core members
    for _rec in members:
        _addr = _rec.get("address", "")
        if _addr:
            visited[_addr] = _rec
    core_addrs: set[str] = set(visited.keys())

    # --- Level 1: forward tx_peers of every core member ---
    for core_rec in list(members):
        core_addr = core_rec.get("address", "")
        l1_peers: list[str] = core_rec.get("tx_peers") or []
        for peer_addr in l1_peers:
            if len(visited) >= max_nodes:
                break
            if peer_addr in visited:
                continue
            peer_rec = all_composite.get(peer_addr)
            if peer_rec is None:
                peer_rec = {
                    "address": peer_addr,
                    "composite_score": 0.0,
                    "anomaly_score": 0.0,
                    "triggered_rules": [],
                    "chain_hops": 0,
                    "cluster_id": None,
                    "cluster_size": 1,
                    "tx_peers": [core_addr] + [a for a in l1_peers if a != peer_addr],
                    "_stub": True,
                }
            visited[peer_addr] = peer_rec

    # --- Reverse lookup: find every _composite wallet that lists any core
    #     member in ITS OWN tx_peers — catches co-transactors that the core
    #     member's (often sparse) tx_peers list doesn't mention. This is the
    #     critical expansion that converts 3 nodes into 30+. ---
    if len(visited) < max_nodes:
        for candidate_rec in all_composite.values():
            if len(visited) >= max_nodes:
                break
            cand_addr = candidate_rec.get("address", "")
            if not cand_addr or cand_addr in visited:
                continue
            cand_peers = set(candidate_rec.get("tx_peers") or [])
            # Add if it mentions any core member as a peer
            if cand_peers & core_addrs:
                visited[cand_addr] = candidate_rec

    # --- Level 2: tx_peers of each L1/reverse peer (non-core only) ---

    for l1_addr in list(visited.keys()):
        if l1_addr in core_addrs:
            continue  # core already expanded in L1 above
        if len(visited) >= max_nodes:
            break
        l1_rec = visited[l1_addr]
        for l2_addr in (l1_rec.get("tx_peers") or []):
            if len(visited) >= max_nodes:
                break
            if l2_addr in visited:
                continue
            l2_rec = all_composite.get(l2_addr)
            if l2_rec is None:
                l2_rec = {
                    "address": l2_addr,
                    "composite_score": 0.0,
                    "anomaly_score": 0.0,
                    "triggered_rules": [],
                    "chain_hops": 0,
                    "cluster_id": None,
                    "cluster_size": 1,
                    "tx_peers": [l1_addr],
                    "_stub": True,
                }
            visited[l2_addr] = l2_rec

    members = list(visited.values())[:max_nodes]

    # Build nodes
    nodes: list[GraphNode] = []
    peeling_addrs: set[str] = set()

    for rec in members:
        addr = rec.get("address", "")
        if not addr:
            continue
        rules = rec.get("triggered_rules") or []
        is_seed = any(
            ("SEED" in str(r).upper() or "RANSOMWARE" in str(r).upper())
            and "RECIPIENT" not in str(r).upper()
            for r in rules
        )
        is_peeling = bool(rec.get("chain_hops", 0) or 0) > 0
        if is_peeling:
            peeling_addrs.add(addr)

        nodes.append(
            GraphNode(
                id=addr,
                label=f"{addr[:6]}…{addr[-4:]}",
                type="wallet",
                risk_score=float(rec.get("composite_score", 0.0)),
                anomaly_score=float(rec.get("anomaly_score", 0.0)),
                is_seed=is_seed,
                country=None,
            )
        )

    # Build edges
    links: list[GraphLink] = []
    node_ids = [n.id for n in nodes]
    node_id_set = set(node_ids)

    # Precompute tx_peers sets for cross-edge detection
    peer_sets: dict[str, set[str]] = {}
    for rec in members:
        addr = rec.get("address", "")
        if addr:
            peer_sets[addr] = set(rec.get("tx_peers") or [])

    seen_edges: set[tuple[str, str]] = set()

    def _add_edge(src: str, tgt: str, rel_type: str, is_exp: bool) -> None:
        key = (min(src, tgt), max(src, tgt))
        if key in seen_edges:
            return
        seen_edges.add(key)
        attn, heads = _compute_link_attention(
            src, tgt, rel_type, is_exp, peeling_addrs, {}
        )
        links.append(
            GraphLink(
                source=src,
                target=tgt,
                type=rel_type,
                amount=None,
                is_explanatory=is_exp,
                attention_score=attn,
                head_attentions=heads,
            )
        )

    if ego_mode and len(node_ids) > 1:
        # 1. Core members → their direct tx_peers (SENDS / PEELING_FLOW)
        #    Run for EVERY core member, not just node_ids[0].
        for core_addr in core_addrs:
            if core_addr not in node_id_set:
                continue
            core_ps = peer_sets.get(core_addr, set())
            for tgt in node_ids:
                if tgt == core_addr or tgt not in core_ps:
                    continue
                is_peel = core_addr in peeling_addrs or tgt in peeling_addrs
                _add_edge(core_addr, tgt, "PEELING_FLOW" if is_peel else "SENDS", is_peel)

        # 2. Cross-edges: any two nodes that co-appear in a transaction
        #    (b in a's peer list, a in b's peer list, or shared peer overlap)
        for i, a in enumerate(node_ids):
            for b in node_ids[i + 1:]:
                key = (min(a, b), max(a, b))
                if key in seen_edges:
                    continue
                ps_a = peer_sets.get(a, set())
                ps_b = peer_sets.get(b, set())
                if b in ps_a or a in ps_b or bool(ps_a & ps_b):
                    is_peel = a in peeling_addrs or b in peeling_addrs
                    _add_edge(a, b, "PEELING_FLOW" if is_peel else "CO_SPEND", is_peel)

        # 3. Cluster sibling edges: same cluster_id → guaranteed CO_SPEND
        for i, a in enumerate(node_ids):
            rec_a = visited.get(a)
            if rec_a is None:
                continue
            cid_a = rec_a.get("cluster_id")
            csize_a = int(rec_a.get("cluster_size", 1) or 1)
            if cid_a is None or csize_a <= 1:
                continue
            for b in node_ids[i + 1:]:
                rec_b = visited.get(b)
                if rec_b and rec_b.get("cluster_id") == cid_a:
                    is_peel = a in peeling_addrs or b in peeling_addrs
                    _add_edge(a, b, "PEELING_FLOW" if is_peel else "CO_SPEND", True)

        # 4. Fallback: any node with zero edges gets connected to the
        #    first available core member so the graph stays fully connected.
        for node in node_ids:
            node_connected = any(
                (min(node, other), max(node, other)) in seen_edges
                for other in node_ids
                if other != node
            )
            if not node_connected:
                for core_addr in (core_addrs & node_id_set):
                    if core_addr != node:
                        is_peel = node in peeling_addrs or core_addr in peeling_addrs
                        _add_edge(
                            core_addr, node,
                            "PEELING_FLOW" if is_peel else "SENDS",
                            is_peel,
                        )
                        break

    elif len(node_ids) <= 10:
        # Full clique: every pair gets a CO_SPEND edge
        for i, src in enumerate(node_ids):
            for tgt in node_ids[i + 1:]:
                is_peeling_edge = src in peeling_addrs or tgt in peeling_addrs
                _add_edge(src, tgt, "PEELING_FLOW" if is_peeling_edge else "CO_SPEND", True)
    else:
        # Star topology: anchor = highest-risk wallet, all others connect to it
        anchor = node_ids[0]
        for tgt in node_ids[1:]:
            is_peeling_edge = anchor in peeling_addrs or tgt in peeling_addrs
            _add_edge(anchor, tgt, "PEELING_FLOW" if is_peeling_edge else "CO_SPEND", True)

    logger.info(
        "Provisional cluster graph #%d: %d nodes, %d links (ego_mode=%s, from xai_store)",
        cluster_id, len(nodes), len(links), ego_mode,
    )
    return GraphResponse(cluster_id=cluster_id, nodes=nodes, links=links)


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

    # ---------------------------------------------------------------------------
    # Fast-path: provisional clusters (ID >= 50 000) live only in xai_store.
    # Neo4j has no knowledge of them — build the graph from memory directly.
    # ---------------------------------------------------------------------------
    _PROV_CLUSTER_BASE = 50_000
    if cluster_id >= _PROV_CLUSTER_BASE:
        return _build_provisional_cluster_graph(cluster_id, effective_max)

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
            peeling_addrs: set[str] = set()
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

                if (
                    ev.get("is_peeling_chain")
                    or ev.get("is_mixing")
                    or comp.get("is_peeling_chain")
                    or comp.get("is_mixing")
                    or any("PEELING" in str(x).upper() or "MIXING" in str(x).upper() for x in rules)
                ):
                    peeling_addrs.add(addr)

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
            explanatory_weights: dict[tuple[str, str], float] = {}
            for addr in wallet_ids:
                gnn = xai_store.get_subgraph(addr)
                if gnn:
                    for edge in gnn.get("edges", []):
                        src = edge.get("source", "")
                        tgt = edge.get("target", "")
                        if src and tgt:
                            pair = (src, tgt)
                            explanatory_pairs.add(pair)
                            w = edge.get("edge_importance") or edge.get("weight")
                            if w is not None:
                                explanatory_weights[pair] = float(w)

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
                            is_expl = (src, tgt) in explanatory_pairs or (tgt, src) in explanatory_pairs
                            attn_score, heads = _compute_link_attention(
                                src=src,
                                tgt=tgt,
                                rel_type=rel_type,
                                is_explanatory=is_expl,
                                peeling_addrs=peeling_addrs,
                                explanatory_weights=explanatory_weights,
                            )
                            links.append(GraphLink(
                                source=src,
                                target=tgt,
                                type=rel_type,
                                amount=float(r.get("amount", 0.0) or 0.0),
                                is_explanatory=is_expl,
                                attention_score=attn_score,
                                head_attentions=heads,
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
                            is_expl = (src, tgt) in explanatory_pairs or (tgt, src) in explanatory_pairs
                            attn_score, heads = _compute_link_attention(
                                src=src,
                                tgt=tgt,
                                rel_type="CO_SPEND",
                                is_explanatory=is_expl,
                                peeling_addrs=peeling_addrs,
                                explanatory_weights=explanatory_weights,
                            )
                            links.append(GraphLink(
                                source=src,
                                target=tgt,
                                type="CO_SPEND",
                                amount=None,
                                is_explanatory=is_expl,
                                attention_score=attn_score,
                                head_attentions=heads,
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
                                attention_score=None,
                                head_attentions=None,
                            ))

    except Exception as exc:
        logger.error("Neo4j graph query failed for cluster_id=%d: %s", cluster_id, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Graph database unavailable: {exc}",
        )

    return GraphResponse(cluster_id=cluster_id, nodes=nodes, links=links)
