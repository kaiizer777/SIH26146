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
from app.services import risk_thresholds
from app.services.db import SessionLocal
import app.services.inline_scorer as inline_scorer
from app.services import shap_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entity", tags=["entity"])

# Verdict used when an address has telemetry but was never actually scored.
# Deliberately NOT one of the four confidence tiers — it must be visibly
# distinct from a real "LOW".
UNKNOWN_VERDICT = "UNKNOWN"

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


async def _fetch_transaction_ego_subgraph_from_postgres(
    address: str,
    composite: dict,
    cached_rows: Optional[list[dict]] = None,
) -> Optional[GnnSubgraph]:
    """Construct 1-hop transaction ego subgraph directly from PostgreSQL transactions."""
    try:
        rows = cached_rows
        if rows is None:
            async with SessionLocal() as db:
                result = await db.execute(
                    text("""
                        SELECT txid, input_addresses, output_addresses, input_amounts, output_amounts,
                               fee, risk_score, anomaly_score
                        FROM transactions
                        WHERE :addr = ANY(input_addresses)
                           OR :addr = ANY(output_addresses)
                        ORDER BY ts DESC
                        LIMIT 15
                    """),
                    {"addr": address},
                )
                rows = [dict(r._mapping) for r in result.fetchall()]

        if not rows:
            return None

        nodes_dict: dict[str, GnnSubgraphNode] = {}
        edges_list: list[GnnSubgraphEdge] = []
        seen_edges: set[tuple[str, str, str]] = set()

        def _get_peer_risk(a: str) -> Optional[float]:
            comp = xai_store.get_composite(a)
            if comp and comp.get("risk_score") is not None:
                try:
                    return float(comp["risk_score"])
                except (ValueError, TypeError):
                    pass
            if comp and comp.get("composite_score") is not None:
                try:
                    return float(comp["composite_score"])
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

        focus_risk = None
        if composite.get("risk_score") is not None:
            try:
                focus_risk = float(composite["risk_score"])
            except (ValueError, TypeError):
                pass
        if focus_risk is None and composite.get("composite_score") is not None:
            try:
                focus_risk = float(composite["composite_score"])
            except (ValueError, TypeError):
                pass

        nodes_dict[address] = GnnSubgraphNode(
            id=address,
            label=f"{address[:6]}…{address[-4:]}" if len(address) > 10 else address,
            node_type="wallet",
            risk_score=focus_risk,
            importance=1.0,
        )

        for row in rows:
            in_addrs = [str(a).strip() for a in (row.get("input_addresses") or []) if a]
            out_addrs = [str(a).strip() for a in (row.get("output_addresses") or []) if a]
            out_amts = [float(a) for a in (row.get("output_amounts") or []) if a is not None]
            total_out = sum(out_amts) if out_amts else 1.0

            if address in in_addrs:
                # Outgoing flow / co-spending
                for peer in in_addrs:
                    if peer != address and len(nodes_dict) < 20:
                        if peer not in nodes_dict:
                            nodes_dict[peer] = GnnSubgraphNode(
                                id=peer,
                                label=f"{peer[:6]}…{peer[-4:]}" if len(peer) > 10 else peer,
                                node_type="wallet",
                                risk_score=_get_peer_risk(peer),
                                importance=0.5,
                            )
                        _add_edge(address, peer, "CO_SPEND", 0.5)

                for idx, peer in enumerate(out_addrs):
                    if peer != address and len(nodes_dict) < 20:
                        amt = out_amts[idx] if idx < len(out_amts) else 0.0
                        norm_imp = min(max(amt / (total_out or 1.0), 0.2), 0.95)
                        if peer not in nodes_dict:
                            nodes_dict[peer] = GnnSubgraphNode(
                                id=peer,
                                label=f"{peer[:6]}…{peer[-4:]}" if len(peer) > 10 else peer,
                                node_type="wallet",
                                risk_score=_get_peer_risk(peer),
                                importance=round(float(norm_imp), 3),
                            )
                        _add_edge(address, peer, "SENDS_TO", round(float(norm_imp), 3))

            elif address in out_addrs:
                # Incoming flow
                for peer in in_addrs:
                    if peer != address and len(nodes_dict) < 20:
                        if peer not in nodes_dict:
                            nodes_dict[peer] = GnnSubgraphNode(
                                id=peer,
                                label=f"{peer[:6]}…{peer[-4:]}" if len(peer) > 10 else peer,
                                node_type="wallet",
                                risk_score=_get_peer_risk(peer),
                                importance=0.6,
                            )
                        _add_edge(peer, address, "SENDS_TO", 0.6)

        return GnnSubgraph(nodes=list(nodes_dict.values()), edges=edges_list)
    except Exception as exc:
        logger.warning("Postgres transaction ego subgraph fallback failed for %s: %s", address[:8] + "...", exc)
        return None


# Minimum background rows a wallet must contribute on its own before the
# explainer will run. Below this we borrow real rows from PostgreSQL, because
# E[f] cannot be estimated from a single sample and a fabricated baseline
# would silently shift every attribution.
_SHAP_MIN_BACKGROUND_ROWS = 2
# Rows borrowed from PostgreSQL to build a background when the wallet's own
# transaction set is too small.
_SHAP_BACKGROUND_POOL = 128


# Attribution magnitude below which a contribution carries no information.
# A vector where every feature is under this threshold is a degenerate
# explainer output, not a measurement that "no feature mattered".
_SHAP_DEGENERATE_EPS = 1e-9

# Maximum permutation evaluations for interactive on-read queries (~1.2s CPU latency).
_SHAP_ON_READ_MAX_EVALS = 300


def _is_degenerate_attribution(attributions: list[dict[str, Any]]) -> bool:
    """True when every attribution is (near) exactly zero.

    A permutation explainer returns all-zero contributions when the model output
    is identical for the explained row and for every masked permutation of it.
    That is a real property of the model, but presenting it as an 18-feature
    waterfall reads as "these features do not matter", which is a forensic claim
    the run did not make. Callers substitute an explicit unavailable state.
    """
    if not attributions:
        return False
    return all(
        abs(float(item.get("attribution", 0.0) or 0.0)) <= _SHAP_DEGENERATE_EPS
        for item in attributions
    )


async def _load_shap_background_pool() -> list[dict]:
    """Fetch a small sample of real transactions to widen a SHAP background.

    Returns an empty list when PostgreSQL is unavailable; the caller then falls
    back to the wallet's own rows.
    """
    try:
        async with SessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT txid, input_addresses, output_addresses, input_amounts,
                           output_amounts, fee, script_type, geo_country, asn, ts
                    FROM transactions
                    ORDER BY id DESC
                    LIMIT :limit
                """),
                {"limit": _SHAP_BACKGROUND_POOL},
            )
            return [dict(r._mapping) for r in result.fetchall()]
    except Exception as exc:  # noqa: BLE001 - background is best-effort
        logger.warning("Could not load SHAP background pool from PG: %s", exc)
        return []


def _select_target_transaction_row(tx_rows: list[dict]) -> Optional[dict]:
    """Pick the transaction row with the largest recorded anomaly score.

    This is the highest-signal transaction for this wallet, and the one the
    dossier is opened for. Attribution is exact for that row.
    """
    if not tx_rows:
        return None

    def _anomaly_of(row: dict) -> float:
        raw = row.get("anomaly_score")
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return -1.0
        return value if value == value else -1.0

    return max(tx_rows, key=_anomaly_of)


def _compute_provisional_shap_and_attention(
    address: str,
    tx_rows: list[dict],
    background_pool: list[dict] | None = None,
    max_evals: int = _SHAP_ON_READ_MAX_EVALS,
) -> tuple[list[ShapAttribution], Optional[list[list[float]]]]:
    """Compute REAL SHAP attributions and REAL model attention for provisional entities.

    Delegates to :mod:`app.services.shap_service`, which runs an actual
    ``shap.PermutationExplainer`` against the trained FT-Transformer and reads
    the model's own cross-feature attention. The previous implementation
    fabricated the waterfall from a hardcoded weight vector and synthesised the
    "attention matrix" as a cosine-similarity of the feature vector with itself;
    both are removed — no hardcoded numbers remain in this path.

    Uses the single most anomalous transaction of the wallet, because that is the
    one an analyst opens the dossier for. Attribution is exact for that row.

    Args:
        address: Wallet address (for logging and narrative context).
        tx_rows: This wallet's transactions.
        background_pool: Extra real rows used to widen the background when
            ``tx_rows`` is too small to estimate E[f]. Never synthetic.
        max_evals: Cap on permutation evaluations for on-read queries.

    Returns:
        ``(shap_items, attention_matrix)``. Either may be empty/None ONLY when
        the real service is genuinely unavailable; the reason is logged at
        WARNING and the caller surfaces an explicit unavailable state rather than
        substituting fake values.
    """
    if not tx_rows:
        return [], None

    target_row = _select_target_transaction_row(tx_rows)
    if not target_row:
        return [], None

    # E[f] needs a distribution. Widen with real rows when the wallet's own
    # transaction set is too small; never invent samples.
    background_rows: list[dict] = list(tx_rows)
    if len(background_rows) < _SHAP_MIN_BACKGROUND_ROWS and background_pool:
        seen_txids = {str(r.get("txid")) for r in background_rows}
        for extra in background_pool:
            if str(extra.get("txid")) not in seen_txids:
                background_rows.append(extra)
                seen_txids.add(str(extra.get("txid")))

    try:
        background = shap_service.build_background(
            background_rows, size=shap_service.DEFAULT_BACKGROUND_SIZE
        )
        effective_max_evals = min(max_evals, _SHAP_ON_READ_MAX_EVALS) if max_evals else _SHAP_ON_READ_MAX_EVALS
        explanation, attention = shap_service.explain_row_with_attention(
            target_row,
            background=background,
            max_evals=effective_max_evals,
        )
    except shap_service.ShapServiceError as exc:
        logger.warning(
            "Real SHAP unavailable for %s (txid=%s): %s — returning an explicit "
            "unavailable state instead of fabricated attributions.",
            address[:8] + "...",
            str(target_row.get("txid", "?"))[:12],
            exc,
        )
        return [], None
    except Exception as exc:  # noqa: BLE001 - never fabricate on unexpected failure
        logger.exception(
            "Unexpected SHAP failure for %s: %s — returning an explicit "
            "unavailable state instead of fabricated attributions.",
            address[:8] + "...",
            exc,
        )
        return [], None

    shap_items = [
        ShapAttribution(
            feature=attr.feature,
            label=_label(attr.feature),
            value=round(float(attr.contribution), 6),
        )
        for attr in explanation.attributions
    ]
    attention_matrix = attention.get("cross_feature_attention")

    # The explainer can legitimately return an all-zero vector when the model
    # output is invariant under feature permutation for this row. Report that as
    # an explicit unavailable state, not as 18 features contributing nothing.
    if _is_degenerate_attribution(
        [{"attribution": item.value} for item in shap_items]
    ):
        logger.warning(
            "Permutation explainer returned an all-zero vector for %s "
            "(txid=%s, f(x)=%.6f, E[f]=%.6f, additivity_err=%.2e) — reporting an "
            "explicit unavailable state instead of a fabricated waterfall.",
            address[:8] + "...",
            str(target_row.get("txid", "?"))[:12],
            explanation.prediction,
            explanation.base_value,
            explanation.additivity_error,
        )
        return [], attention_matrix

    logger.info(
        "Real SHAP for %s (txid=%s): %d attributions, additivity_err=%.2e, prediction=%.6f",
        address[:8] + "...",
        str(target_row.get("txid", "?"))[:12],
        len(shap_items),
        explanation.additivity_error,
        explanation.prediction,
    )
    return shap_items, attention_matrix


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
        # pass_through_ratio is only meaningful for a detected peeling chain, and
        # is derived per hop by the enrichment chain. When it was never derived
        # (no chain, or the chain predates the metric) the previous code did
        # `or 0.0` and printed a confident "0.0% pass-through ratio" — a
        # fabricated measurement. State the gap instead.
        if evidence.get("pass_through_ratio") is None:
            parts.append(
                f"Peeling chain detected: {chain_hops} hops; pass-through ratio "
                "not available for this chain (no per-hop value breakdown was "
                "derived for it)."
            )
        else:
            pct = float(evidence["pass_through_ratio"])
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
    tx_rows: list[dict] = []
    composite = xai_store.get_composite(address)
    if composite is None:
        try:
            async with SessionLocal() as db:
                result = await db.execute(
                    text("""
                        SELECT txid, input_addresses, output_addresses, input_amounts, output_amounts,
                               fee, script_type, geo_country, asn, ts, risk_score, anomaly_score
                        FROM transactions
                        WHERE :addr = ANY(input_addresses)
                           OR :addr = ANY(output_addresses)
                        ORDER BY ts DESC
                        LIMIT 20
                    """),
                    {"addr": address},
                )
                tx_rows = [dict(r._mapping) for r in result.fetchall()]
        except Exception as db_exc:
            logger.warning("Failed querying transactions for fallback address %s: %s", address[:8] + "...", db_exc)

        if not tx_rows:
            raise HTTPException(
                status_code=404,
                detail="Entity address not found in surveillance index",
            )

        # In-process scoring for newly uploaded transactions
        try:
            scored_items = inline_scorer.score_batch(tx_rows)
            xai_store.upsert_batch(scored_items)
            composite = xai_store.get_composite(address)
            # The record now exists, so this address WAS scored. Assigned on both
            # exits of this try: the previous code only set `scored` on the
            # failure path, so a successful inline score fell through to
            # `if not scored:` with the name unbound and the endpoint returned
            # HTTP 500 for exactly the wallets that had just been ingested.
            scored = True
        except Exception as sc_exc:
            logger.warning("Inline scoring on-the-fly failed for %s: %s", address[:8] + "...", sc_exc)
            composite = None
            scored = False

        if composite is None:
            # Scoring was attempted but produced no record for this address.
            # Do NOT fabricate a score: a confident "MEDIUM" for a wallet that
            # was never scored is a fabricated forensic conclusion. Return an
            # explicit unscored state instead (composite_score 0.0, verdict
            # "UNKNOWN") and flag it via `extra` so the UI can distinguish it
            # from a genuinely LOW-scored wallet.
            logger.warning(
                "Address %s has telemetry in PostgreSQL but no composite record "
                "after inline scoring — reporting UNSCORED rather than a "
                "fabricated verdict.",
                address[:8] + "...",
            )
            scored = False
            composite = {
                "address": address,
                "composite_score": 0.0,
                "verdict": UNKNOWN_VERDICT,
                "provisional": True,
                "scored": False,
                "anomaly_score": None,
                "risk_score": None,
                "rule_bonus": 0.0,
                "mixing_indicator": 0.0,
                "triggered_rules": [],
                "mixing_patterns": [],
                "chain_hops": 0,
            }
    else:
        scored = True

    evidence_raw = xai_store.get_evidence(address) or {}

    # --- Score breakdown ---
    # The breakdown MUST sum to composite_score. Recompute it with the canonical
    # risk_thresholds formula, which normalizes the (unbounded, up to ~100) raw
    # anomaly MSE before weighting. The previous code multiplied the raw MSE by
    # 0.35, producing components up to 35.0 that bore no relation to the score.
    anomaly_raw = composite.get("anomaly_score")
    risk_raw = composite.get("risk_score")
    rules_for_score = composite.get("triggered_rules") or []
    mixing_for_score = composite.get("mixing_patterns") or []

    canonical = risk_thresholds.compute_composite(
        anomaly_score=float(anomaly_raw) if anomaly_raw is not None else 0.0,
        risk_score=float(risk_raw) if risk_raw is not None else 0.0,
        triggered_rules=list(rules_for_score),
        mixing_patterns=list(mixing_for_score),
    )
    breakdown = ScoreBreakdown(
        anomaly_component=canonical.anomaly_component,
        risk_component=canonical.risk_component,
        rule_bonus=canonical.rule_component,
        mixing_indicator=canonical.mixing_component,
    )
    breakdown_total = (
        breakdown.anomaly_component
        + breakdown.risk_component
        + breakdown.rule_bonus
        + breakdown.mixing_indicator
    )

    # --- SHAP attributions (keyed by txid — fetch txids for this address from PG) ---
    shap_attributions: list[ShapAttribution] = []
    matched_txid: Optional[str] = None
    shap_state = "unavailable_no_transaction_telemetry"
    shap_reason = (
        "No transaction rows are indexed for this address, so there is nothing to attribute."
    )
    try:
        if not tx_rows:
            async with SessionLocal() as db:
                result = await db.execute(
                    text("""
                        SELECT txid, input_addresses, output_addresses, input_amounts, output_amounts,
                               fee, script_type, geo_country, asn, ts, risk_score, anomaly_score
                        FROM transactions
                        WHERE :addr = ANY(input_addresses)
                           OR :addr = ANY(output_addresses)
                        ORDER BY ts DESC
                        LIMIT 20
                    """),
                    {"addr": address},
                )
                tx_rows = [dict(r._mapping) for r in result.fetchall()]

        txids = [r["txid"] for r in tx_rows if "txid" in r]
        if txids:
            shap_state = "unavailable_no_stored_attribution"
            shap_reason = (
                "No SHAP attribution is stored for this wallet's transactions and "
                "no on-the-fly attribution could be produced."
            )
        else:
            shap_state = "unavailable_no_transaction_telemetry"
            shap_reason = "No transaction rows are indexed for this address."

        # Fetch SHAP for the first matching txid that has data
        raw_shap: Optional[list] = None
        for txid in txids:
            raw_shap = xai_store.get_shap(txid)
            if raw_shap:
                matched_txid = txid
                break

        if raw_shap:
            sorted_shap = sorted(raw_shap, key=lambda x: abs(x.get("attribution", 0.0)), reverse=True)
            # A degenerate all-zero vector is not a measurement: every feature
            # contributing exactly nothing is indistinguishable from a failed
            # attribution. Reporting it as a real waterfall tells the analyst
            # "no feature mattered" when the truth is "nothing was computed".
            if _is_degenerate_attribution(sorted_shap):
                logger.warning(
                    "Stored SHAP for %s (txid=%s) is an all-zero vector — "
                    "reporting an explicit unavailable state instead of a "
                    "fabricated waterfall.",
                    address[:8] + "...", matched_txid[:12] if matched_txid else "?",
                )
                shap_state = "unavailable_degenerate_all_zero_attribution"
                shap_reason = (
                    "The stored attribution vector for this transaction is all "
                    "zeros, which reflects a degenerate explainer output rather "
                    "than a measured result. No waterfall is shown."
                )
            else:
                shap_attributions = [
                    ShapAttribution(
                        feature=item["feature"],
                        label=_label(item["feature"]),
                        value=float(item.get("attribution", 0.0)),
                    )
                    for item in sorted_shap
                ]
                shap_state = "available"
                shap_reason = None
    except Exception as exc:
        logger.warning("SHAP lookup failed for %s: %s", address[:8] + "...", exc)
        shap_state = "unavailable_lookup_error"
        shap_reason = f"{type(exc).__name__}: {exc}"

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

    # --- On-the-fly provisional explainability engine (real SHAP) ---
    if (not shap_attributions or not attention_matrix) and tx_rows:
        pool: list[dict] = []
        if len(tx_rows) < _SHAP_MIN_BACKGROUND_ROWS:
            pool = await _load_shap_background_pool()
        prov_shap, prov_attn = _compute_provisional_shap_and_attention(
            address, tx_rows, background_pool=pool
        )
        if not shap_attributions and prov_shap:
            shap_attributions = prov_shap
            shap_state = "available"
            shap_reason = None
        elif (
            not shap_attributions
            and shap_state == "unavailable_degenerate_all_zero_attribution"
        ):
            # The live explainer also produced nothing usable. The degenerate
            # state and its reason already stand, which is the honest report.
            logger.warning(
                "Live SHAP produced no usable vector for %s either; keeping the "
                "explicit unavailable state.",
                address[:8] + "...",
            )
        if not attention_matrix and prov_attn:
            attention_matrix = prov_attn

        # Write-through cache: persist real provisional explanations so subsequent
        # reads don't re-execute the explainer on-the-fly.
        is_prov_shap_valid = bool(prov_shap) and not _is_degenerate_attribution(
            [{"attribution": item.value} for item in prov_shap]
        )
        if is_prov_shap_valid:
            target_row = _select_target_transaction_row(tx_rows)
            target_txid = str(
                target_row.get("txid", "") if target_row else (matched_txid or "")
            ).strip()
            if target_txid:
                if not matched_txid:
                    matched_txid = target_txid
                store_records = [
                    {
                        "feature": item.feature,
                        "label": item.label,
                        "value": item.value,
                        "attribution": item.value,
                    }
                    for item in prov_shap
                ]
                try:
                    xai_store.upsert_shap(target_txid, store_records, persist=True)
                    if prov_attn:
                        attn_payload = (
                            prov_attn
                            if isinstance(prov_attn, dict)
                            else {"cross_feature_attention": prov_attn}
                        )
                        xai_store.upsert_attention(target_txid, attn_payload, persist=True)
                    logger.info(
                        "[explain] Write-through cached SHAP and attention for txid=%s (wallet=%s)",
                        target_txid,
                        address,
                    )
                except Exception as exc:
                    logger.warning(
                        "[explain] Failed write-through cache for txid=%s: %s",
                        target_txid,
                        exc,
                    )

    # --- SHAP availability and honesty guard ---
    # Ensure degenerate or empty vectors are never presented as real.
    is_avail = len(shap_attributions) > 0 and any(
        abs(item.value) > _SHAP_DEGENERATE_EPS for item in shap_attributions
    )
    if not is_avail:
        shap_attributions = []
        shap_available = False
        if shap_state == "available":
            shap_state = "unavailable_degenerate_all_zero_attribution"
            shap_reason = (
                "The stored attribution vector for this transaction is all "
                "zeros, which reflects a degenerate explainer output rather "
                "than a measured result. No waterfall is shown."
            )
    else:
        shap_available = True

    # --- Evidence trail ---
    is_provisional = bool(composite.get("provisional", False))
    chain_hops = int(composite.get("chain_hops", 0) or 0)
    pass_through = evidence_raw.get("pass_through_ratio")
    if pass_through is None:
        pass_through = composite.get("pass_through_ratio")
    # Explicit derivation state, so a NULL is a stated gap rather than a field
    # that silently reads as "no laundering observed".
    pass_through_state = (
        "derived_from_peeling_chain" if pass_through is not None
        else "unavailable_no_peeling_chain_value_breakdown"
    )
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
            "risk_score_source": composite.get("risk_score_source"),
            "scored": scored,
            "pass_through_ratio_state": pass_through_state,
            "shap_state": shap_state,
            "shap_reason": shap_reason,
            "score_breakdown_total": round(breakdown_total, 6),
            "anomaly_score_raw": anomaly_raw,
            "anomaly_score_normalized": canonical.anomaly_component / risk_thresholds.W_ANOMALY
            if risk_thresholds.W_ANOMALY
            else None,
            "composite_score_stored": composite.get("composite_score"),
            "verdict_stored": composite.get("verdict"),
        },
    )

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

    # 1-Hop Transaction Ego Subgraph fallback from PostgreSQL
    if gnn_subgraph is None or len(gnn_subgraph.nodes) == 0:
        gnn_subgraph = await _fetch_transaction_ego_subgraph_from_postgres(
            address=address,
            composite=composite,
            cached_rows=tx_rows,
        )

    # --- Narrative ---
    # --- Headline score / verdict ---
    # Reproduce the STORED total only for legacy snapshots - records written
    # before the weight unification, identifiable by lacking the `scored`,
    # `source` and `provisional` markers that every current scoring path stamps
    # (ingest, enrichment publish, provisional). Those stored totals were a
    # clamp of an un-normalized anomaly and cannot be decomposed by the canonical
    # terms, so honouring them is what keeps the dossier, the alerts table and
    # the cluster topology ranking an entity on the same number.
    #
    # Records produced by the current pipeline are already canonical, so they
    # report the recomputed total and their four breakdown terms keep summing to
    # it exactly.
    is_legacy_snapshot = not (
        composite.get("scored") or composite.get("source") or composite.get("provisional")
    )
    if is_legacy_snapshot and composite.get("composite_score") is not None:
        try:
            headline_score = float(composite["composite_score"])
        except (ValueError, TypeError):
            headline_score = canonical.score
    else:
        headline_score = canonical.score

    # The LABEL is always derived from the score, never read back from the
    # record. The persisted `verdict` string was written under the superseded
    # 0.80 cut, so echoing it means the reported severity silently ignores the
    # current ladder - that is what let the alerts table, the dossier and the
    # cluster topology each show a different label for one wallet. A record's
    # label is a pure function of its score.
    if not scored:
        # Never fabricated. An address with telemetry but no completed
        # assessment has no verdict at all, and UNKNOWN is deliberately outside
        # the four tiers so it can never be read as a real LOW.
        headline_verdict = UNKNOWN_VERDICT
    else:
        headline_verdict = risk_thresholds.map_verdict(headline_score)

    # --- Narrative ---
    # Built from the same headline the response reports, so the prose, the gauge
    # and the alerts table can never disagree with each other.
    narrative_composite = dict(composite)
    narrative_composite["composite_score"] = headline_score
    narrative_composite["verdict"] = headline_verdict
    narrative = _build_narrative(address, narrative_composite, evidence_raw)
    if not scored:
        narrative = (
            f"Wallet {address[:6]}…{address[-4:]} has transaction telemetry but no "
            "completed risk assessment. No composite score or verdict is available — "
            "this address was not scored. Trigger a post-ingest scoring run before "
            "relying on any risk conclusion for it."
        )

    # Ensure that before instantiating EntityExplainResponse, attributions are honest
    is_avail = len(shap_attributions) > 0 and any(
        abs(item.value) > _SHAP_DEGENERATE_EPS for item in shap_attributions
    )
    if not is_avail:
        shap_attributions = []
        shap_available = False
    else:
        shap_available = True

    return EntityExplainResponse(
        address=address,
        # Headline score is the STORED composite value for legacy snapshot
        # records, so the dossier agrees with the alerts table and the cluster
        # topology for the same entity (product decision: one surface, one
        # number). The headline verdict is ALWAYS the canonical
        # `map_verdict(headline_score)` - a pure function of that score - so
        # this surface and the alerts table can never report two severities
        # for one wallet. An address that was never scored reports UNKNOWN.
        #
        # The four terms in `score_breakdown` are the canonical normalized
        # decomposition. For records scored before the weights were unified -
        # notably the frozen `composite_risk_scores.json` artefact, whose stored
        # total was a clamp of an un-normalized anomaly - the breakdown sums to
        # the canonical recomputation and therefore will NOT sum to this
        # headline. That gap is a property of the stored value, so it is
        # surfaced in `extra` rather than hidden or fudged.
        composite_score=headline_score,
        verdict=headline_verdict,
        score_breakdown=breakdown,
        evidence_trail=evidence,
        shap_attributions=shap_attributions,
        shap_available=shap_available,
        attention_matrix=attention_matrix,
        gnn_subgraph=gnn_subgraph,
        summary_narrative=narrative,
        provisional=is_provisional,
    )
