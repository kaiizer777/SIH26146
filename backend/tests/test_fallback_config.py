"""Unit tests for Fallback Configuration (Step 5 Verification).

Verifies all 4 model architecture combinations and backward-compatible alias:
1. Combination A: FT-Transformer + Graph Transformer (both new -> default)
2. Combination B: Autoencoder + Graph Transformer (mixed: legacy anomaly + SOTA risk)
3. Combination C: FT-Transformer + GraphSAGE (mixed: SOTA anomaly + legacy risk)
4. Combination D: Autoencoder + GraphSAGE (both legacy -> full fallback)
5. Deprecated master toggle: settings.use_legacy_models propagates to both flags.

For each combination:
- Loads correct architecture and checkpoints in inline_scorer and xai_store
- Verifies startup log / model config provenance
- Scores a batch of 15 transaction rows via score_batch()
- Validates model_version stamps, anomaly_score >= 0, provisional composite scores in [0, 1], and valid verdicts.
"""

from __future__ import annotations

import sys
from pathlib import Path
import pytest

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.config import settings
from app.services.inline_scorer import (
    init_scorer,
    reset_scorer_for_tests,
    score_batch,
    get_model_info,
)
from app.services.xai_store import get_provenance, reset_store_for_tests, load as init_xai_store


@pytest.fixture(autouse=True)
def restore_default_mode():
    """Ensure settings legacy flags are restored to False after each test."""
    yield
    settings.use_legacy_models = False
    settings.use_legacy_anomaly_model = False
    settings.use_legacy_risk_model = False
    reset_scorer_for_tests()
    reset_store_for_tests()
    init_scorer()
    init_xai_store()


def _generate_test_batch(count: int = 15) -> list[dict]:
    """Generate a diverse batch of 15 transaction rows for inline scoring verification."""
    batch = []
    for i in range(count):
        batch.append({
            "txid": f"{i:02x}" * 32,
            "ts": f"2026-09-09T{i:02d}:00:00Z",
            "src_ip": f"192.168.1.{i + 1}",
            "dst_ip": f"10.0.0.{i + 1}",
            "src_port": 8333,
            "dst_port": 8333,
            "input_addresses": [f"bc1qin_{i}_{j}" for j in range(1 if i % 3 == 0 else 2)],
            "output_addresses": [f"bc1qout_{i}_{k}" for k in range(2 if i % 3 == 0 else 1)],
            "input_amounts": [1.5 * (j + 1) for j in range(1 if i % 3 == 0 else 2)],
            "output_amounts": [1.4 * (k + 1) for k in range(2 if i % 3 == 0 else 1)],
            "fee": 0.001 * (i + 1),
            "script_type": "P2WPKH",
            "geo_country": "US" if i % 2 == 0 else "DE",
            "asn": 15169 if i % 2 == 0 else 24940,
        })
    return batch


def _verify_batch_scores(results: list[dict], expected_anom_stem: str, expected_risk_stem: str) -> None:
    """Verify scored batch records have valid bounds, valid verdicts, and correct model version stamps."""
    assert len(results) > 0
    expected_full_version = f"{expected_anom_stem}+{expected_risk_stem}"

    for r in results:
        assert "address" in r
        assert r["anomaly_score"] >= 0.0
        assert 0.0 <= r["composite_score"] <= 1.0
        assert r["verdict"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        assert r["provisional"] is True
        assert r["model_version"] == expected_full_version
        assert r["anomaly_model_version"] == expected_anom_stem
        assert r["risk_model_version"] == expected_risk_stem

        # Sub-records
        comp = r.get("composite_record")
        assert comp is not None
        assert comp["model_version"] == expected_full_version
        assert comp["anomaly_model_version"] == expected_anom_stem
        assert comp["risk_model_version"] == expected_risk_stem

        evid = r.get("evidence_record")
        assert evid is not None
        assert evid["model_version"] == expected_full_version
        assert evid["anomaly_model_version"] == expected_anom_stem
        assert evid["risk_model_version"] == expected_risk_stem


# ---------------------------------------------------------------------------
# Combination A: FT-Transformer + Graph Transformer (both new -> default)
# ---------------------------------------------------------------------------


def test_default_sota_models_loaded():
    """Combination A (default): FT-Transformer (anomaly) + Graph Transformer (risk)."""
    settings.use_legacy_anomaly_model = False
    settings.use_legacy_risk_model = False
    reset_scorer_for_tests()
    reset_store_for_tests()
    init_scorer()
    init_xai_store()

    info = get_model_info()
    prov = get_provenance()

    assert "FTTransformerAnomaly" in str(info["model_type"])
    assert "ft_transformer" in info["anomaly_version"]
    assert "graph_transformer" in info["risk_version"]
    assert prov["anomaly_architecture"] == "FTTransformerAnomaly"
    assert prov["risk_architecture"] == "RelationalGraphTransformer"
    assert "ft_transformer_checkpoint" in prov
    assert "graph_transformer_checkpoint" in prov

    # Score batch of 15 rows
    batch = _generate_test_batch(15)
    results = score_batch(batch)
    _verify_batch_scores(results, info["anomaly_version"], info["risk_version"])


# ---------------------------------------------------------------------------
# Combination B: Autoencoder + Graph Transformer (mixed: legacy anomaly + SOTA risk)
# ---------------------------------------------------------------------------


def test_combination_b_autoencoder_and_graph_transformer():
    """Combination B: Legacy Autoencoder (anomaly) + SOTA Graph Transformer (risk)."""
    settings.use_legacy_anomaly_model = True
    settings.use_legacy_risk_model = False
    reset_scorer_for_tests()
    reset_store_for_tests()
    init_scorer()
    init_xai_store()

    info = get_model_info()
    prov = get_provenance()

    assert "Autoencoder" in str(info["model_type"])
    assert "autoencoder" in info["anomaly_version"]
    assert "graph_transformer" in info["risk_version"]
    assert prov["anomaly_architecture"] == "Autoencoder"
    assert prov["risk_architecture"] == "RelationalGraphTransformer"
    assert "autoencoder_checkpoint" in prov
    assert "graph_transformer_checkpoint" in prov

    # Score batch of 15 rows
    batch = _generate_test_batch(15)
    results = score_batch(batch)
    _verify_batch_scores(results, info["anomaly_version"], info["risk_version"])


# ---------------------------------------------------------------------------
# Combination C: FT-Transformer + GraphSAGE (mixed: SOTA anomaly + legacy risk)
# ---------------------------------------------------------------------------


def test_combination_c_ft_transformer_and_graphsage():
    """Combination C: SOTA FT-Transformer (anomaly) + Legacy GraphSAGE (risk)."""
    settings.use_legacy_anomaly_model = False
    settings.use_legacy_risk_model = True
    reset_scorer_for_tests()
    reset_store_for_tests()
    init_scorer()
    init_xai_store()

    info = get_model_info()
    prov = get_provenance()

    assert "FTTransformerAnomaly" in str(info["model_type"])
    assert "ft_transformer" in info["anomaly_version"]
    assert "graphsage" in info["risk_version"]
    assert prov["anomaly_architecture"] == "FTTransformerAnomaly"
    assert prov["risk_architecture"] == "GraphSAGEClassifier"
    assert "ft_transformer_checkpoint" in prov
    assert "graphsage_checkpoint" in prov

    # Score batch of 15 rows
    batch = _generate_test_batch(15)
    results = score_batch(batch)
    _verify_batch_scores(results, info["anomaly_version"], info["risk_version"])


# ---------------------------------------------------------------------------
# Combination D: Autoencoder + GraphSAGE (both legacy -> full fallback)
# ---------------------------------------------------------------------------


def test_legacy_fallback_models_loaded():
    """Combination D: Legacy Autoencoder (anomaly) + Legacy GraphSAGE (risk)."""
    settings.use_legacy_anomaly_model = True
    settings.use_legacy_risk_model = True
    reset_scorer_for_tests()
    reset_store_for_tests()
    init_scorer()
    init_xai_store()

    info = get_model_info()
    prov = get_provenance()

    assert "Autoencoder" in str(info["model_type"])
    assert "autoencoder" in info["anomaly_version"]
    assert "graphsage" in info["risk_version"]
    assert prov["anomaly_architecture"] == "Autoencoder"
    assert prov["risk_architecture"] == "GraphSAGEClassifier"
    assert "autoencoder_checkpoint" in prov
    assert "graphsage_checkpoint" in prov

    # Score batch of 15 rows
    batch = _generate_test_batch(15)
    results = score_batch(batch)
    _verify_batch_scores(results, info["anomaly_version"], info["risk_version"])


# ---------------------------------------------------------------------------
# Backward Compatibility: Deprecated master toggle
# ---------------------------------------------------------------------------


def test_deprecated_master_toggle_backward_compatibility():
    """Verify settings.use_legacy_models = True sets both independent model flags."""
    settings.use_legacy_models = True
    assert settings.use_legacy_anomaly_model is True
    assert settings.use_legacy_risk_model is True

    reset_scorer_for_tests()
    reset_store_for_tests()
    init_scorer()
    init_xai_store()

    info = get_model_info()
    prov = get_provenance()

    assert "Autoencoder" in str(info["model_type"])
    assert prov["anomaly_architecture"] == "Autoencoder"
    assert prov["risk_architecture"] == "GraphSAGEClassifier"

    # Reset to False
    settings.use_legacy_models = False
    assert settings.use_legacy_anomaly_model is False
    assert settings.use_legacy_risk_model is False

