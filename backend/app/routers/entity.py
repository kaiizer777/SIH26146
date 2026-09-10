"""Entity forensic dossier router — Phase 9.

GET /api/v1/entity/{address}/explain
  Returns the full 4-layer XAI payload for a specific Bitcoin address.
  Returns 404 if the address is not in the XAI composite risk index.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from neo4j import AsyncDriver, AsyncGraphDatabase

from app.config import settings
from app.schemas.entity import (
    EntityExplainResponse,
    EvidenceTrail,
    GnnSubgraph,
    GnnSubgraphEdge,
    GnnSubgraphNode,
    ScoreBreakdown,
    ShapAttribution,
)
import app.services.xai_store as xai_store
from app.services.db import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entity", tags=["entity"])

# ---------------------------------------------------------------------------
# Neo4j async driver (module-level, one per process)
# ---------------------------------------------------------------------------

_neo4j_driver: Optional[AsyncDriver] = None


def _get_neo4j_driver() -> AsyncDriver:
    global _neo4j_driver
    if _neo4j_driver is None:
        _neo4j_driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _neo4j_driver


async def _fetch_topological_subgraph_from_neo4j(address: str) -> Optional[GnnSubgraph]:
    """Fetch 1-hop / 2-hop topological neighbors from Neo4j when offline GNNExplainer mask is absent."""
    try:
        driver = _get_neo4j_driver()
        async with driver.session(database=settings.neo4j_database) as session:
            cypher = """
            MATCH (w:Wallet {address: $addr})
            OPTIONAL MATCH (w)-[r_co:CO_SPEND]-(peer:Wallet)
            WITH w, collect(DISTINCT peer)[..10] AS cospenders
            OPTIONAL MATCH (payer:Wallet)-[:SENDS]->(:Transaction)-[:RECEIVES]->(w)
            WITH w, cospenders, collect(DISTINCT payer)[..10] AS payers
            OPTIONAL MATCH (w)-[:SENDS]->(:Transaction)-[:RECEIVES]->(payee:Wallet)
            WITH w, cospenders, payers, collect(DISTINCT payee)[..10] AS payees
            RETURN w, cospenders, payers, payees
            """
            result = await session.run(cypher, addr=address)
            record = await result.single()
            if not record or not record["w"]:
                return None

            target_node = record["w"]
            cospenders = [c for c in (record["cospenders"] or []) if c]
            payers = [p for p in (record["payers"] or []) if p]
            payees = [py for py in (record["payees"] or []) if py]

            if not cospenders and not payers and not payees:
                return None

            nodes_dict: dict[str, GnnSubgraphNode] = {}
            edges_list: list[GnnSubgraphEdge] = []
            seen_edges: set[tuple[str, str, str]] = set()

            def _get_risk(a: str, props: dict) -> Optional[float]:
                comp = xai_store.get_composite(a)
                if comp and comp.get("risk_score") is not None:
                    try:
                        return float(comp["risk_score"])
                    except (ValueError, TypeError):
                        pass
                if props.get("risk_score") is not None:
                    try:
                        return float(props["risk_score"])
                    except (ValueError, TypeError):
                        pass
                return None

            def _add_edge(src: str, tgt: str, rel: str, imp: float) -> None:
                key = (src, tgt, rel)
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges_list.append(GnnSubgraphEdge(
                        source=src,
                        target=tgt,
                        edge_type=rel,
                        importance=imp,
                    ))

            target_addr = address
            target_props = dict(target_node.items())
            nodes_dict[target_addr] = GnnSubgraphNode(
                id=target_addr,
                label=f"{target_addr[:6]}…{target_addr[-4:]}" if len(target_addr) > 10 else target_addr,
                node_type="wallet",
                risk_score=_get_risk(target_addr, target_props),
                importance=1.0,
            )

            for peer in cospenders:
                p_props = dict(peer.items())
                p_addr = p_props.get("address")
                if not p_addr:
                    continue
                if p_addr not in nodes_dict:
                    nodes_dict[p_addr] = GnnSubgraphNode(
                        id=p_addr,
                        label=f"{p_addr[:6]}…{p_addr[-4:]}" if len(p_addr) > 10 else p_addr,
                        node_type="wallet",
                        risk_score=_get_risk(p_addr, p_props),
                        importance=0.5,
                    )
                _add_edge(target_addr, p_addr, "CO_SPEND", 0.5)

            for payer in payers:
                p_props = dict(payer.items())
                p_addr = p_props.get("address")
                if not p_addr:
                    continue
                if p_addr not in nodes_dict:
                    nodes_dict[p_addr] = GnnSubgraphNode(
                        id=p_addr,
                        label=f"{p_addr[:6]}…{p_addr[-4:]}" if len(p_addr) > 10 else p_addr,
                        node_type="wallet",
                        risk_score=_get_risk(p_addr, p_props),
                        importance=0.4,
                    )
                _add_edge(p_addr, target_addr, "SENDS_TO", 0.4)

            for payee in payees:
                p_props = dict(payee.items())
                p_addr = p_props.get("address")
                if not p_addr:
                    continue
                if p_addr not in nodes_dict:
                    nodes_dict[p_addr] = GnnSubgraphNode(
                        id=p_addr,
                        label=f"{p_addr[:6]}…{p_addr[-4:]}" if len(p_addr) > 10 else p_addr,
                        node_type="wallet",
                        risk_score=_get_risk(p_addr, p_props),
                        importance=0.4,
                    )
                _add_edge(target_addr, p_addr, "RECEIVES_FROM", 0.4)

            return GnnSubgraph(nodes=list(nodes_dict.values()), edges=edges_list)
    except Exception as exc:
        logger.warning("Neo4j topological subgraph fallback failed for %s: %s", address[:8] + "...", exc)
        return None


# ---------------------------------------------------------------------------
# Human-readable SHAP feature label map
# ---------------------------------------------------------------------------

_FEATURE_LABELS: dict[str, str] = {
    "num_inputs": "Input Count",
    "num_outputs": "Output Count",
    "output_entropy": "Output Address Entropy",
    "fee_log": "Log Fee (sat/vByte)",
    "fee_rate": "Fee Rate (sat/vByte)",
    "equal_outputs_flag": "Equal Outputs Match (CoinJoin)",
    "is_segwit": "SegWit Transaction",
    "is_taproot": "Taproot Transaction",
    "max_output_fraction": "Max Output Fraction",
    "input_value_log": "Log Total Input Value (BTC)",
    "output_value_log": "Log Total Output Value (BTC)",
    "unique_asn_count": "Multi-ASN Routing Count",
    "unique_country_count": "Multi-Country Routing Count",
    "cluster_id": "Cluster Membership",
    "anomaly_score": "FT-Transformer Anomaly Score",
    "risk_score": "Relational Graph Transformer Risk Score",
    "is_mixing_flag": "Mixing Heuristic Flag",
    "chain_hops": "Peeling Chain Hop Depth",
    "pass_through_ratio": "Pass-Through Ratio",
    "seed_wallet_proximity": "Ransomwhere Seed Proximity",
    "cluster_size": "Cluster Size (co-spenders)",
}


def _label(feature: str) -> str:
    return _FEATURE_LABELS.get(feature, feature.replace("_", " ").title())


# ---------------------------------------------------------------------------
# Deterministic narrative generator
# ---------------------------------------------------------------------------

def _build_narrative(
    address: str,
    composite: dict,
    evidence: dict,
) -> str:
    verdict = composite.get("verdict", "LOW")
    score = composite.get("composite_score", 0.0)
    anomaly = composite.get("anomaly_score", 0.0)
    risk = composite.get("risk_score", 0.0)
    cluster_id = composite.get("cluster_id")
    cluster_size = composite.get("cluster_size", 0)
    chain_hops = composite.get("chain_hops", 0) or 0
    mixing_patterns = composite.get("mixing_patterns", [])
    triggered_rules = composite.get("triggered_rules", [])
    rank_pct = evidence.get("anomaly_rank_percentile", 0.0) or 0.0
    seed_prox = composite.get("seed_wallet_proximity", 0.0) or 0.0

    short_addr = f"{address[:6]}…{address[-4:]}" if len(address) > 10 else address
    parts: list[str] = [f"Wallet {short_addr} scored {verdict} ({score:.3f})."]

    if chain_hops >= 3:
        pct = evidence.get("pass_through_ratio", 0.0) or 0.0
        parts.append(
            f"Peeling chain detected: {chain_hops} hops with {pct*100:.1f}% pass-through ratio."
        )
    if "CoinJoin" in str(mixing_patterns) or any("coinjoin" in p.lower() for p in mixing_patterns):
        parts.append("CoinJoin mixing fingerprint detected in transaction structure.")
    if rank_pct >= 90:
        parts.append(
            f"FT-Transformer reconstruction error at the {rank_pct:.1f}th percentile — extreme tabular structural anomaly."
        )
    if cluster_id is not None and cluster_size > 100:
        parts.append(f"Member of co-spend cluster #{cluster_id} ({cluster_size:,} wallets).")
    if seed_prox > 0.5:
        parts.append(f"High-proximity affiliation with Ransomwhere seed wallet network (proximity={seed_prox:.3f}).")
    if triggered_rules:
        rules_str = ", ".join(triggered_rules[:3])
        parts.append(f"Triggered rules: {rules_str}.")

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/{address}/explain",
    response_model=EntityExplainResponse,
    summary="Full forensic dossier for a Bitcoin wallet address",
)
async def get_entity_explain(address: str) -> EntityExplainResponse:
    """Return the 4-layer XAI forensic dossier for the given wallet address.

    Returns 404 if the address is not in the XAI composite risk surveillance index.
    """
    # --- Lookup composite record ---
    composite = xai_store.get_composite(address)
    if composite is None:
        raise HTTPException(
            status_code=404,
            detail="Entity address not found in surveillance index",
        )

    evidence_raw = xai_store.get_evidence(address) or {}

    # --- Score breakdown ---
    breakdown = ScoreBreakdown(
        anomaly_component=float(composite.get("anomaly_score", 0.0) or 0.0) * 0.35,
        risk_component=float(composite.get("risk_score", 0.0) or 0.0) * 0.45,
        rule_bonus=float(composite.get("rule_bonus", 0.0) or 0.0),
        mixing_indicator=float(composite.get("mixing_indicator", 0.0) or 0.0),
    )

    # --- Evidence trail ---
    is_provisional = bool(composite.get("provisional", False))
    chain_hops = int(composite.get("chain_hops", 0) or 0)
    pass_through = evidence_raw.get("pass_through_ratio") or composite.get("pass_through_ratio")
    evidence = EvidenceTrail(
        cluster_id=composite.get("cluster_id"),
        cluster_size=composite.get("cluster_size"),
        anomaly_score=composite.get("anomaly_score"),
        anomaly_rank_percentile=evidence_raw.get("anomaly_rank_percentile"),
        is_mixing=bool(composite.get("mixing_indicator", 0.0) > 0.0 or composite.get("mixing_patterns")),
        is_peeling_chain=chain_hops > 0,
        chain_hops=chain_hops if chain_hops > 0 else None,
        pass_through_ratio=float(pass_through) if pass_through is not None else None,
        triggered_rules=composite.get("triggered_rules", []),
        mixing_patterns=composite.get("mixing_patterns", []),
        seed_family=next(
            (r for r in composite.get("triggered_rules", []) if "SEED" in r.upper() or "RANSOMWARE" in r.upper()),
            None,
        ),
        provisional=is_provisional,
        extra={
            "seed_wallet_proximity": composite.get("seed_wallet_proximity", 0.0),
            "risk_score": composite.get("risk_score"),
        },
    )

    # --- SHAP attributions (keyed by txid — fetch txids for this address from PG) ---
    shap_attributions: list[ShapAttribution] = []
    matched_txid: Optional[str] = None
    try:
        async with SessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT DISTINCT txid FROM transactions
                    WHERE :addr = ANY(input_addresses)
                       OR :addr = ANY(output_addresses)
                    LIMIT 20
                """),
                {"addr": address},
            )
            txids = [row[0] for row in result.fetchall()]

        # Fetch SHAP for the first matching txid that has data
        raw_shap: Optional[list] = None
        for txid in txids:
            raw_shap = xai_store.get_shap(txid)
            if raw_shap:
                matched_txid = txid
                break

        if raw_shap:
            # Sort by |attribution| descending (most impactful first)
            sorted_shap = sorted(raw_shap, key=lambda x: abs(x.get("attribution", 0.0)), reverse=True)
            shap_attributions = [
                ShapAttribution(
                    feature=item["feature"],
                    label=_label(item["feature"]),
                    value=float(item.get("attribution", 0.0)),
                )
                for item in sorted_shap
            ]
    except Exception as exc:
        logger.warning("SHAP lookup failed for %s: %s", address[:8] + "...", exc)

    # --- Attention matrix (from FT-Transformer cross-feature attention) ---
    attention_matrix: Optional[list[list[float]]] = None
    if matched_txid:
        attn_payload = xai_store.get_attention(matched_txid)
        if attn_payload and "cross_feature_attention" in attn_payload:
            attention_matrix = attn_payload["cross_feature_attention"]
    if not attention_matrix:
        attn_payload = xai_store.get_attention(address)
        if attn_payload and "cross_feature_attention" in attn_payload:
            attention_matrix = attn_payload["cross_feature_attention"]
        elif isinstance(attn_payload, list):
            attention_matrix = attn_payload

    # --- GNN subgraph ---
    gnn_subgraph: Optional[GnnSubgraph] = None
    raw_gnn = xai_store.get_subgraph(address)
    if raw_gnn and raw_gnn.get("nodes"):
        gnn_nodes = [
            GnnSubgraphNode(
                id=n.get("address", ""),
                label=f"{n.get('address', '')[:6]}…{n.get('address', '')[-4:]}",
                node_type="wallet",
                risk_score=n.get("risk_score"),
                importance=None,
            )
            for n in raw_gnn.get("nodes", [])
        ]
        gnn_edges = [
            GnnSubgraphEdge(
                source=e.get("source", ""),
                target=e.get("target", ""),
                edge_type=e.get("type") or e.get("edge_type"),
                importance=e.get("edge_importance") if e.get("edge_importance") is not None else e.get("importance"),
            )
            for e in raw_gnn.get("edges", [])
        ]
        gnn_subgraph = GnnSubgraph(nodes=gnn_nodes, edges=gnn_edges)
    else:
        gnn_subgraph = await _fetch_topological_subgraph_from_neo4j(address)

    # --- Narrative ---
    narrative = _build_narrative(address, composite, evidence_raw)

    return EntityExplainResponse(
        address=address,
        composite_score=float(composite.get("composite_score", 0.0)),
        verdict=composite.get("verdict", "LOW"),
        score_breakdown=breakdown,
        evidence_trail=evidence,
        shap_attributions=shap_attributions,
        attention_matrix=attention_matrix,
        gnn_subgraph=gnn_subgraph,
        summary_narrative=narrative,
        provisional=is_provisional,
    )
