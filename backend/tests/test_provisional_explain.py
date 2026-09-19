"""Unit tests for on-the-fly provisional explainability engine."""

import asyncio
import pytest

from app.routers.entity import (
    _compute_provisional_shap_and_attention,
    _fetch_transaction_ego_subgraph_from_postgres,
    get_entity_explain,
)
from app.schemas.entity import ShapAttribution, GnnSubgraph
import app.services.xai_store as xai_store


def test_provisional_shap_and_attention_calculation():
    """Verify on-the-fly SHAP attributions and 18x18 attention matrix generation."""
    mock_addr = "1TestProvisionalAddress000000001"
    mock_rows = [
        {
            "txid": "tx_test_001",
            "input_addresses": [mock_addr],
            "output_addresses": ["1ReceiverA", "1ReceiverB"],
            "input_amounts": [2.5],
            "output_amounts": [2.0, 0.49],
            "fee": 0.01,
            "script_type": "P2WPKH",
            "geo_country": "US",
            "asn": 15169,
            "ts": "2026-09-18T10:00:00Z",
            "risk_score": 0.35,
            "anomaly_score": 0.04,
        }
    ]

    shap_items, attention_matrix = _compute_provisional_shap_and_attention(mock_addr, mock_rows)

    assert len(shap_items) == 18, f"Expected 18 SHAP attributions, got {len(shap_items)}"
    for item in shap_items:
        assert isinstance(item, ShapAttribution)
        assert -1.0 <= item.value <= 1.0, f"SHAP value {item.value} outside [-1.0, 1.0]"
        assert item.label is not None and len(item.label) > 0

    assert attention_matrix is not None
    assert len(attention_matrix) == 18, f"Expected 18 rows in attention matrix, got {len(attention_matrix)}"
    for row in attention_matrix:
        assert len(row) == 18, f"Expected 18 columns, got {len(row)}"
        assert all(0.0 <= v <= 1.0 for v in row)


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
    """Verify full /explain endpoint returns valid response structure for provisional entity."""
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
    assert response.verdict == "HIGH"
    assert isinstance(response.shap_attributions, list)
