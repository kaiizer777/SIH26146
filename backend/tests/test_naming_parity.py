"""Unit tests for Stage 3 / ML-4: End-to-End Naming Synchronization & Provenance Guard.

Verifies:
1. _FEATURE_LABELS in entity router maps to Dual Transformer nomenclature.
2. Narrative generator emits FT-Transformer tabular reconstruction text (zero Autoencoder).
3. Pydantic v2 OpenAPI schemas cite FT-Transformer and Relational Graph Transformer.
4. Inline scorer discovers and instantiates FTTransformerAnomaly.
5. Inline scorer executes batch inference via score_numpy / forward pass.
6. Graceful backward-compatible fallback to Autoencoder when FT-Transformer checkpoint is absent.
7. XAI store provenance detection accurately reports active architectures and checkpoints.
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
import torch

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.ml.ft_transformer import FTTransformerAnomaly
from app.routers.entity import _FEATURE_LABELS, _build_narrative
from app.schemas.entity import EvidenceTrail, GnnSubgraphNode, ScoreBreakdown
from app.services import inline_scorer, xai_store
from app.services.inline_scorer import Autoencoder, init_scorer, score_batch


def test_feature_labels_transformer_parity():
    """Verify entity router feature labels reflect Dual Transformer nomenclature."""
    assert _FEATURE_LABELS["anomaly_score"] == "FT-Transformer Anomaly Score"
    assert _FEATURE_LABELS["risk_score"] == "Relational Graph Transformer Risk Score"
    assert "Autoencoder" not in _FEATURE_LABELS["anomaly_score"]
    assert "GraphSAGE" not in _FEATURE_LABELS["risk_score"]


def test_build_narrative_transformer_parity():
    """Verify automated narrative generator emits FT-Transformer tabular structural anomaly text."""
    address = "bc1qtestaddress1234567890abcdef"
    composite = {
        "verdict": "HIGH",
        "composite_score": 0.65,
        "anomaly_score": 0.085,
        "risk_score": 0.72,
    }
    evidence = {
        "anomaly_rank_percentile": 96.5,
    }

    narrative = _build_narrative(address, composite, evidence)
    assert "FT-Transformer reconstruction error at the 96.5th percentile — extreme tabular structural anomaly." in narrative
    assert "Autoencoder" not in narrative


def test_openapi_schema_descriptions_parity():
    """Verify Pydantic v2 entity schemas cite Dual Transformer architecture in field descriptions."""
    # ScoreBreakdown
    anomaly_field = ScoreBreakdown.model_fields["anomaly_component"]
    risk_field = ScoreBreakdown.model_fields["risk_component"]
    assert anomaly_field.description is not None
    assert "FT-Transformer" in anomaly_field.description
    assert risk_field.description is not None
    assert "Relational Graph Transformer" in risk_field.description

    # EvidenceTrail
    evid_anomaly = EvidenceTrail.model_fields["anomaly_score"]
    evid_rank = EvidenceTrail.model_fields["anomaly_rank_percentile"]
    assert evid_anomaly.description is not None
    assert "FT-Transformer" in evid_anomaly.description
    assert evid_rank.description is not None
    assert "FT-Transformer" in evid_rank.description

    # GnnSubgraphNode
    subgraph_risk = GnnSubgraphNode.model_fields["risk_score"]
    assert subgraph_risk.description is not None
    assert "Relational Graph Transformer" in subgraph_risk.description


def test_inline_scorer_ft_transformer_loading():
    """Verify inline scorer discovers, loads, and initializes FTTransformerAnomaly."""
    # Force re-initialization
    with inline_scorer._init_lock:
        inline_scorer._initialized = False
        inline_scorer._model = None

    init_scorer()

    assert inline_scorer._initialized is True
    assert inline_scorer._model is not None
    assert isinstance(inline_scorer._model, FTTransformerAnomaly)
    # Threshold should match ft_threshold_20260909.json (calibrated ~0.03635)
    assert 0.001 <= inline_scorer._threshold <= 0.1



def test_inline_scorer_ft_transformer_inference():
    """Verify inline scorer performs live transaction scoring with FT-Transformer."""
    dummy_tx = {
        "txid": "aa" * 32,
        "ts": "2026-09-09T12:00:00Z",
        "src_ip": "192.168.1.100",
        "dst_ip": "10.0.0.1",
        "src_port": 8333,
        "dst_port": 8333,
        "input_addresses": ["1TestSender111111111111111111111"],
        "output_addresses": ["1TestRecipient111111111111111111"],
        "input_amounts": [1.5],
        "output_amounts": [1.499],
        "fee": 0.001,
        "script_type": "P2WPKH",
        "geo_country": "US",
        "asn": 15169,
    }

    scored = score_batch([dummy_tx])
    assert len(scored) == 2  # sender and recipient

    for rec in scored:
        assert rec["provisional"] is True
        assert rec["anomaly_score"] >= 0.0
        assert rec["verdict"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        assert rec["composite_record"]["provisional"] is True
        assert rec["evidence_record"]["provisional"] is True


def test_inline_scorer_legacy_autoencoder_fallback():
    """Verify graceful backward-compatible fallback to Autoencoder when FT-Transformer is missing."""
    original_find_file = inline_scorer._find_file

    def mock_find_file(pattern: str, base_dir: Path) -> Path | None:
        if pattern.startswith("ft_transformer"):
            return None
        return original_find_file(pattern, base_dir)

    with patch.object(inline_scorer, "_find_file", side_effect=mock_find_file):
        with inline_scorer._init_lock:
            inline_scorer._initialized = False
            inline_scorer._model = None

        init_scorer()

        assert inline_scorer._initialized is True
        assert inline_scorer._model is not None
        assert isinstance(inline_scorer._model, Autoencoder)

    # Re-initialize to restore FT-Transformer
    with inline_scorer._init_lock:
        inline_scorer._initialized = False
        inline_scorer._model = None
    init_scorer()
    assert isinstance(inline_scorer._model, FTTransformerAnomaly)


def test_xai_store_provenance_detection():
    """Verify XAI store provenance inspector detects active transformer checkpoints."""
    prov = xai_store.get_provenance()
    assert prov["anomaly_architecture"] == "FTTransformerAnomaly"
    assert prov["risk_architecture"] == "RelationalGraphTransformer"
    assert "ft_transformer_checkpoint" in prov
    assert "graph_transformer_checkpoint" in prov
    assert "ft_transformer" in prov["ft_transformer_checkpoint"]
    assert "graph_transformer" in prov["graph_transformer_checkpoint"]


def test_attention_matrix_schema_and_store():
    """Verify EntityExplainResponse supports 18x18 attention matrix and xai_store retrieves it."""
    from app.schemas.entity import EntityExplainResponse, ShapAttribution

    # Schema verification
    dummy_matrix = [[0.05] * 18 for _ in range(18)]
    resp = EntityExplainResponse(
        address="bc1qtest123",
        composite_score=0.75,
        verdict="HIGH",
        score_breakdown=ScoreBreakdown(
            anomaly_component=0.25,
            risk_component=0.40,
            rule_bonus=0.10,
            mixing_indicator=0.0,
        ),
        evidence_trail=EvidenceTrail(
            anomaly_score=0.08,
            anomaly_rank_percentile=95.0,
            triggered_rules=["EQUAL_OUTPUTS"],
        ),
        shap_attributions=[
            ShapAttribution(feature="fee_rate", label="Fee Rate", value=0.02)
        ],
        attention_matrix=dummy_matrix,
        summary_narrative="Test summary narrative.",
        provisional=False,
    )
    assert resp.attention_matrix is not None
    assert len(resp.attention_matrix) == 18
    assert len(resp.attention_matrix[0]) == 18

    # Store verification
    xai_store.load()
    first_txid = next(iter(xai_store._shap.keys()))
    attn = xai_store.get_attention(first_txid)
    if attn is not None:
        assert "cross_feature_attention" in attn
        assert len(attn["cross_feature_attention"]) == 18
        assert len(attn["cross_feature_attention"][0]) == 18

