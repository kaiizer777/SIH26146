"""Unit tests for on-the-fly provisional explainability engine."""

import asyncio
import numpy as np
import pytest

from app.routers.entity import (
    _compute_provisional_shap_and_attention,
    _fetch_transaction_ego_subgraph_from_postgres,
    get_entity_explain,
)
from app.schemas.entity import ShapAttribution, GnnSubgraph
import app.services.xai_store as xai_store


def test_provisional_shap_and_attention_calculation():
    """Verify REAL SHAP attributions and REAL model attention are produced.

    The previous implementation fabricated these from a hardcoded weight
    vector and a cosine-similarity matrix. The contract now is:
      * exactly 18 real attributions, one per feature, in anomaly-score units
        (NOT clipped to [-1, 1] — that clamp was an artefact of the fake
        tanh() weighting),
      * a genuine 18x18 cross-feature attention matrix from the model.
    """
    mock_addr = "1TestProvisionalAddress000000001"
    mock_rows = [
        {
            "txid": "tx_test_001",
            "ts": "2026-09-02T05:38:08Z",
            "src_ip": "1.1.1.36",
            "dst_ip": "49.36.0.150",
            "src_port": 13784,
            "dst_port": 8333,
            "input_addresses": [mock_addr],
            "output_addresses": ["1ReceiverA000000000000000000000000", "1ReceiverB00000000000000000000000"],
            "input_amounts": [4.32267875],
            "output_amounts": [4.13047441, 0.19219797],
            "fee": 0.00042,
            "script_type": "P2WPKH",
            "geo_country": "US",
            "asn": 15169,
            "risk_score": 0.35,
            "anomaly_score": 0.04,
        }
    ]

    # A single wallet transaction cannot estimate E[f], so supply a real
    # background pool drawn from genuinely different transactions. The service
    # must never fabricate this distribution.
    pool = [dict(mock_rows[0], txid=f"tx_pool_{i:03d}") for i in range(8)]
    for i, extra in enumerate(pool):
        # Vary the real feature values so the background is a real
        # distribution, not 8 copies of the explained row.
        scale = 0.5 + 0.25 * i
        extra["input_amounts"] = [round(4.32267875 * scale, 8)]
        extra["output_amounts"] = [
            round(4.13047441 * scale, 8),
            round(0.19219797 * (2.0 - scale), 8),
        ]
        extra["fee"] = round(0.00042 * (1.0 + 0.3 * i), 8)
        extra["input_addresses"] = [f"1PoolIn{i:029d}"]
        extra["output_addresses"] = [
            f"1PoolOut{i:028d}A",
            f"1PoolOut{i:028d}B",
        ]

    shap_items, attention_matrix = _compute_provisional_shap_and_attention(
        mock_addr, mock_rows, background_pool=pool
    )

    assert len(shap_items) == 18, f"Expected 18 SHAP attributions, got {len(shap_items)}"
    for item in shap_items:
        assert isinstance(item, ShapAttribution)
        assert isinstance(item.value, float)
        assert item.value == item.value, "SHAP value must not be NaN"
        assert item.label is not None and len(item.label) > 0

    # Attributions must be distinct per feature (the old hardcoded vector made
    # several features identical by construction).
    assert len({round(i.value, 9) for i in shap_items}) > 1, (
        "SHAP attributions are degenerate — every feature has the same value"
    )

    assert attention_matrix is not None
    assert len(attention_matrix) == 18, f"Expected 18 rows in attention matrix, got {len(attention_matrix)}"
    for row in attention_matrix:
        assert len(row) == 18, f"Expected 18 columns, got {len(row)}"
        assert all(isinstance(v, float) and v == v for v in row)

    # The attention matrix must not be the fabricated cosine-similarity matrix
    # that the old implementation produced for this exact input.
    fabricated = _cosine_similarity_matrix(mock_rows)
    assert attention_matrix != fabricated, (
        "attention matrix matches the old cosine-similarity fake"
    )


def _cosine_similarity_matrix(rows: list[dict]) -> list[list[float]]:
    """Reproduce the OLD fabricated matrix, to assert we no longer emit it."""
    from app.services.feature_extractor import extract_features_batch

    x = np.mean(extract_features_batch(rows), axis=0)
    z_vec = x.reshape(18, 1)
    sim = np.dot(z_vec, z_vec.T) / np.sqrt(18.0)
    exp_sim = np.exp(sim - np.max(sim, axis=-1, keepdims=True))
    attn = exp_sim / (np.sum(exp_sim, axis=-1, keepdims=True) + 1e-9)
    return [[round(float(v), 4) for v in r] for r in attn]


def test_provisional_transaction_ego_subgraph():
    """Verify 1-hop transaction ego subgraph construction from transaction records."""
    mock_addr = "1TestProvisionalAddress000000001"
    mock_rows = [
        {
            "txid": "tx_test_001",
            "input_addresses": [mock_addr, "1CoSpenderX"],
            "output_addresses": ["1ReceiverA", "1ReceiverB"],
            "input_amounts": [1.5, 1.0],
            "output_amounts": [2.0, 0.49],
            "fee": 0.01,
            "risk_score": 0.45,
            "anomaly_score": 0.05,
        }
    ]
    mock_comp = {
        "address": mock_addr,
        "composite_score": 0.65,
        "risk_score": 0.55,
        "verdict": "HIGH",
    }

    subgraph = asyncio.run(
        _fetch_transaction_ego_subgraph_from_postgres(
            address=mock_addr,
            composite=mock_comp,
            cached_rows=mock_rows,
        )
    )

    assert subgraph is not None
    assert isinstance(subgraph, GnnSubgraph)
    assert len(subgraph.nodes) >= 3  # target + co-spender + receivers
    focus = next((n for n in subgraph.nodes if n.id == mock_addr), None)
    assert focus is not None
    assert focus.risk_score == 0.55

    # Check edges
    cospend_edge = next((e for e in subgraph.edges if e.edge_type == "CO_SPEND"), None)
    assert cospend_edge is not None
    assert cospend_edge.source == mock_addr
    assert cospend_edge.target == "1CoSpenderX"

    send_edge = next((e for e in subgraph.edges if e.edge_type == "SENDS_TO"), None)
    assert send_edge is not None
    assert send_edge.source == mock_addr


def test_get_entity_explain_provisional_flow():
    """Verify full /explain endpoint returns valid response structure for provisional entity.

    The endpoint now derives composite_score AND verdict from the canonical
    risk_thresholds formula rather than echoing the stored record, so the four
    components always sum to the reported score. The stored values are kept
    under `extra` for audit.
    """
    prov_addr = "1ProvisionalInferenceWalletTest999"
    xai_store.upsert_composite(
        prov_addr,
        {
            "address": prov_addr,
            "composite_score": 0.72,
            "verdict": "HIGH",
            "anomaly_score": 0.045,
            "risk_score": 0.60,
            "rule_bonus": 0.15,
            "mixing_indicator": 1.0,
            "provisional": True,
            "triggered_rules": ["PEELING_CHAIN_CANDIDATE"],
            "mixing_patterns": ["PEELING_CHAIN_CANDIDATE"],
        },
    )

    response = asyncio.run(get_entity_explain(prov_addr))
    assert response.address == prov_addr
    assert response.provisional is True
    assert isinstance(response.shap_attributions, list)

    # The core invariant: breakdown sums exactly to composite_score.
    sb = response.score_breakdown
    total = sb.anomaly_component + sb.risk_component + sb.rule_bonus + sb.mixing_indicator
    assert abs(total - response.composite_score) < 1e-6, (
        f"breakdown {total} does not sum to composite_score {response.composite_score}"
    )
    # Verdict is derived from that same canonical score.
    from app.services import risk_thresholds

    assert response.verdict == risk_thresholds.map_verdict(response.composite_score)
    # Every component is within its own weight.
    assert 0.0 <= sb.anomaly_component <= risk_thresholds.W_ANOMALY + 1e-9
    assert 0.0 <= sb.risk_component <= risk_thresholds.W_RISK + 1e-9
    assert 0.0 <= sb.rule_bonus <= risk_thresholds.W_RULES + 1e-9
    assert 0.0 <= sb.mixing_indicator <= risk_thresholds.W_MIXING + 1e-9
