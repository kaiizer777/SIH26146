"""Tests for SHAP Honesty Flag (P3a).

Verifies:
1. Schema contract & backward compatibility:
   - EntityExplainResponse has shap_available: bool.
   - Parsing objects/JSON without shap_available defaults to False without error.
   - Setting shap_available explicitly (True or False) is preserved.
2. Degenerate detection:
   - All-zero or near-zero (<= 1e-9) attribution vectors are flagged as degenerate.
   - Non-zero attributions are recognized as valid.
3. get_entity_explain endpoint invariants:
   - Valid non-zero attributions return shap_available=True and non-empty shap_attributions.
   - Degenerate (all-zero or epsilon) attributions return shap_available=False and shap_attributions=[].
   - Missing/empty attributions return shap_available=False and shap_attributions=[].
"""

import asyncio
from unittest.mock import patch

import pytest

from app.routers.entity import (
    _SHAP_DEGENERATE_EPS,
    _is_degenerate_attribution,
    get_entity_explain,
)
from app.schemas.entity import (
    EntityExplainResponse,
    EvidenceTrail,
    ScoreBreakdown,
    ShapAttribution,
)
from app.services import xai_store


# ---------------------------------------------------------------------------
# Helpers & Fixtures
# ---------------------------------------------------------------------------

def _dummy_breakdown() -> ScoreBreakdown:
    return ScoreBreakdown(
        anomaly_component=0.1,
        risk_component=0.2,
        rule_bonus=0.0,
        mixing_indicator=0.0,
    )


def _dummy_evidence() -> EvidenceTrail:
    return EvidenceTrail(
        anomaly_score=0.1,
        anomaly_rank_percentile=50.0,
    )


class _MockResult:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def fetchall(self):
        class _RowMapping:
            def __init__(self, d: dict):
                self._mapping = d

        return [_RowMapping(r) for r in self._rows]


class _MockDbSession:
    def __init__(self, tx_rows: list[dict]):
        self._tx_rows = tx_rows

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def execute(self, *args, **kwargs):
        return _MockResult(self._tx_rows)


# ---------------------------------------------------------------------------
# 1. Schema Contract & Backward Compatibility
# ---------------------------------------------------------------------------

class TestShapHonestySchema:
    def test_schema_defaults_shap_available_to_false(self):
        """EntityExplainResponse instantiations without shap_available default to False."""
        resp = EntityExplainResponse(
            address="bc1qtestaddr001",
            composite_score=0.3,
            verdict="LOW",
            score_breakdown=_dummy_breakdown(),
            evidence_trail=_dummy_evidence(),
            shap_attributions=[],
            summary_narrative="Test summary narrative.",
        )
        assert resp.shap_available is False
        assert resp.shap_attributions == []

    def test_schema_explicit_shap_available_true(self):
        """EntityExplainResponse preserves shap_available=True and attributions."""
        attrs = [
            ShapAttribution(feature="fee_rate", label="Fee Rate", value=0.045)
        ]
        resp = EntityExplainResponse(
            address="bc1qtestaddr002",
            composite_score=0.75,
            verdict="HIGH",
            score_breakdown=_dummy_breakdown(),
            evidence_trail=_dummy_evidence(),
            shap_attributions=attrs,
            shap_available=True,
            summary_narrative="Test summary narrative.",
        )
        assert resp.shap_available is True
        assert len(resp.shap_attributions) == 1
        assert resp.shap_attributions[0].feature == "fee_rate"
        assert resp.shap_attributions[0].value == 0.045

    def test_schema_explicit_shap_available_false(self):
        """EntityExplainResponse preserves shap_available=False."""
        resp = EntityExplainResponse(
            address="bc1qtestaddr003",
            composite_score=0.5,
            verdict="MEDIUM",
            score_breakdown=_dummy_breakdown(),
            evidence_trail=_dummy_evidence(),
            shap_attributions=[],
            shap_available=False,
            summary_narrative="Test summary narrative.",
        )
        assert resp.shap_available is False
        assert resp.shap_attributions == []

    def test_schema_backward_compatibility_json_parsing(self):
        """Parsing older serialized payloads missing shap_available succeeds seamlessly."""
        legacy_data = {
            "address": "bc1qlegacy001",
            "composite_score": 0.65,
            "verdict": "CRITICAL",
            "score_breakdown": {
                "anomaly_component": 0.2,
                "risk_component": 0.4,
                "rule_bonus": 0.05,
                "mixing_indicator": 0.0,
            },
            "evidence_trail": {
                "is_mixing": False,
                "is_peeling_chain": False,
                "triggered_rules": [],
                "mixing_patterns": [],
                "extra": {},
            },
            "shap_attributions": [],
            "summary_narrative": "Legacy record without shap_available field.",
            "provisional": False,
        }
        parsed = EntityExplainResponse.model_validate(legacy_data)
        assert parsed.shap_available is False
        assert parsed.address == "bc1qlegacy001"
        assert parsed.composite_score == 0.65

    def test_schema_json_serialization_roundtrip(self):
        """Roundtrip serialization includes shap_available and maintains integrity."""
        attrs = [
            ShapAttribution(feature="input_count", label="Input Count", value=0.08)
        ]
        resp = EntityExplainResponse(
            address="bc1qroundtrip001",
            composite_score=0.82,
            verdict="CRITICAL",
            score_breakdown=_dummy_breakdown(),
            evidence_trail=_dummy_evidence(),
            shap_attributions=attrs,
            shap_available=True,
            summary_narrative="Roundtrip test.",
        )
        dumped = resp.model_dump()
        assert "shap_available" in dumped
        assert dumped["shap_available"] is True

        reloaded = EntityExplainResponse.model_validate(dumped)
        assert reloaded.shap_available is True
        assert len(reloaded.shap_attributions) == 1
        assert reloaded.shap_attributions[0].feature == "input_count"


# ---------------------------------------------------------------------------
# 2. Degeneracy Detection Logic
# ---------------------------------------------------------------------------

class TestDegeneracyDetectionLogic:
    def test_all_zero_is_degenerate(self):
        """An attribution vector with all 0.0 values is detected as degenerate."""
        items = [{"attribution": 0.0}] * 18
        assert _is_degenerate_attribution(items) is True

    def test_near_zero_epsilon_is_degenerate(self):
        """An attribution vector with all values <= 1e-9 is detected as degenerate."""
        items = [{"attribution": 1e-11}, {"attribution": -5e-10}]
        assert _is_degenerate_attribution(items) is True

    def test_non_zero_is_not_degenerate(self):
        """At least one feature with abs(attribution) > 1e-9 is not degenerate."""
        items = [{"attribution": 0.0}] * 17 + [{"attribution": 0.005}]
        assert _is_degenerate_attribution(items) is False

    def test_honesty_check_filters_degenerate_vectors(self):
        """The availability rule filters out degenerate attributions and empties the list."""
        # Case A: Degenerate items
        degenerate_attrs = [
            ShapAttribution(feature="f1", label="F1", value=0.0),
            ShapAttribution(feature="f2", label="F2", value=1e-12),
        ]
        is_avail = len(degenerate_attrs) > 0 and any(
            abs(item.value) > _SHAP_DEGENERATE_EPS for item in degenerate_attrs
        )
        assert is_avail is False

        # Case B: Valid items
        valid_attrs = [
            ShapAttribution(feature="f1", label="F1", value=0.0),
            ShapAttribution(feature="f2", label="F2", value=0.03),
        ]
        is_avail = len(valid_attrs) > 0 and any(
            abs(item.value) > _SHAP_DEGENERATE_EPS for item in valid_attrs
        )
        assert is_avail is True


# ---------------------------------------------------------------------------
# 3. get_entity_explain Endpoint Honesty Invariants
# ---------------------------------------------------------------------------

class TestGetEntityExplainShapHonesty:
    @pytest.fixture(autouse=True)
    def setup_xai_store(self):
        xai_store.load()

    def test_valid_shap_returns_available_true_and_non_empty_list(self):
        """When valid non-zero SHAP attributions exist, shap_available=True and attributions are returned."""
        test_addr = "bc1qtesthonestvalid001"
        test_txid = "txid_honest_valid_001"

        xai_store.upsert_composite(
            test_addr,
            {
                "address": test_addr,
                "composite_score": 0.72,
                "verdict": "HIGH",
                "anomaly_score": 0.05,
                "risk_score": 0.4,
                "scored": True,
            },
            persist=False,
        )

        valid_shap_items = [
            {"feature": "fee_rate", "attribution": 0.035},
            {"feature": "input_amounts", "attribution": -0.012},
        ]
        xai_store.upsert_shap(test_txid, valid_shap_items, persist=False)

        mock_rows = [{"txid": test_txid, "input_addresses": [test_addr], "output_addresses": []}]

        try:
            with patch("app.routers.entity.SessionLocal", return_value=_MockDbSession(mock_rows)):
                response = asyncio.run(get_entity_explain(test_addr))

            assert response.shap_available is True
            assert len(response.shap_attributions) == 2
            assert response.shap_attributions[0].feature in {"fee_rate", "input_amounts"}
            assert any(abs(item.value) > 1e-9 for item in response.shap_attributions)
            assert response.evidence_trail.extra.get("shap_state") == "available"
        finally:
            xai_store._composite.pop(test_addr, None)
            xai_store._shap.pop(test_txid, None)

    def test_degenerate_all_zero_shap_returns_available_false_and_cleared_list(self):
        """When stored SHAP attributions are all zeros, shap_available=False and shap_attributions=[]."""
        test_addr = "bc1qtesthonestdegen001"
        test_txid = "txid_honest_degen_001"

        xai_store.upsert_composite(
            test_addr,
            {
                "address": test_addr,
                "composite_score": 0.45,
                "verdict": "MEDIUM",
                "anomaly_score": 0.02,
                "risk_score": 0.3,
                "scored": True,
            },
            persist=False,
        )

        degenerate_shap_items = [{"feature": f"feat_{i}", "attribution": 0.0} for i in range(18)]
        xai_store.upsert_shap(test_txid, degenerate_shap_items, persist=False)

        mock_rows = [{"txid": test_txid, "input_addresses": [test_addr], "output_addresses": []}]

        try:
            with patch("app.routers.entity.SessionLocal", return_value=_MockDbSession(mock_rows)):
                response = asyncio.run(get_entity_explain(test_addr))

            assert response.shap_available is False
            assert response.shap_attributions == []
            assert response.evidence_trail.extra.get("shap_state") == "unavailable_degenerate_all_zero_attribution"
        finally:
            xai_store._composite.pop(test_addr, None)
            xai_store._shap.pop(test_txid, None)

    def test_degenerate_near_zero_epsilon_shap_returns_available_false_and_cleared_list(self):
        """When stored SHAP attributions are near-zero (<= 1e-9), shap_available=False and shap_attributions=[]."""
        test_addr = "bc1qtesthonestepsilon001"
        test_txid = "txid_honest_epsilon_001"

        xai_store.upsert_composite(
            test_addr,
            {
                "address": test_addr,
                "composite_score": 0.35,
                "verdict": "LOW",
                "anomaly_score": 0.01,
                "risk_score": 0.2,
                "scored": True,
            },
            persist=False,
        )

        epsilon_shap_items = [{"feature": f"feat_{i}", "attribution": 1e-12} for i in range(18)]
        xai_store.upsert_shap(test_txid, epsilon_shap_items, persist=False)

        mock_rows = [{"txid": test_txid, "input_addresses": [test_addr], "output_addresses": []}]

        try:
            with patch("app.routers.entity.SessionLocal", return_value=_MockDbSession(mock_rows)):
                response = asyncio.run(get_entity_explain(test_addr))

            assert response.shap_available is False
            assert response.shap_attributions == []
            assert response.evidence_trail.extra.get("shap_state") == "unavailable_degenerate_all_zero_attribution"
        finally:
            xai_store._composite.pop(test_addr, None)
            xai_store._shap.pop(test_txid, None)

    def test_missing_shap_returns_available_false_and_empty_list(self):
        """When no SHAP attributions are stored or produced, shap_available=False and shap_attributions=[]."""
        test_addr = "bc1qtesthonestmissing001"
        test_txid = "txid_honest_missing_001"

        xai_store.upsert_composite(
            test_addr,
            {
                "address": test_addr,
                "composite_score": 0.20,
                "verdict": "LOW",
                "anomaly_score": 0.01,
                "risk_score": 0.1,
                "scored": True,
            },
            persist=False,
        )

        # No shap record added for test_txid
        mock_rows = [{"txid": test_txid, "input_addresses": [test_addr], "output_addresses": []}]

        try:
            with patch("app.routers.entity.SessionLocal", return_value=_MockDbSession(mock_rows)):
                # Patch provisional explainer so it also returns empty
                with patch("app.routers.entity._compute_provisional_shap_and_attention", return_value=([], None)):
                    response = asyncio.run(get_entity_explain(test_addr))

            assert response.shap_available is False
            assert response.shap_attributions == []
        finally:
            xai_store._composite.pop(test_addr, None)
