"""One shared verdict ladder across the entity dossier and the alerts feed.

The invariant under test: for a given composite score, ``routers/entity.py``
and ``routers/alerts.py`` return the SAME label, and that label is
``risk_thresholds.map_verdict(score)``. It was previously broken three ways:
the dossier echoed a persisted ``verdict`` string for legacy records, the
alerts table echoed the same string, and the persisted string had been
written under the now-superseded 0.80 cut - so one wallet could read
CRITICAL in the dossier, HIGH in the alerts table, and MEDIUM in the cluster
topology.

Every fixture record below deliberately carries a WRONG stored ``verdict`` so
a regression that reads the persisted string fails loudly instead of passing
by coincidence.
"""

from __future__ import annotations

import asyncio
from collections import Counter
from typing import Any

import pytest
from fastapi.testclient import TestClient

import app.routers.entity as entity_module
from app.config import settings
from app.main import app
from app.routers.entity import UNKNOWN_VERDICT, get_entity_explain
from app.services import risk_thresholds
import app.services.xai_store as xai_store

# Scores spanning every band of the canonical ladder, including each exact
# cut and the value immediately either side of the 0.65 CRITICAL boundary.
LADDER_SCORES: tuple[float, ...] = (
    0.0, 0.25, 0.3999, 0.40, 0.59, 0.60, 0.6499, 0.65, 0.70, 0.7812, 0.80, 1.0,
)

# Unique prefix so `search` isolates the fixture records from the 8k+ real
# demo wallets, and a per-score suffix keeps them individually addressable.
ADDR_PREFIX = "bc1qladderconsistency"

UNSCORED_ADDR = "bc1qladderconsistencyunscored0001"


def _address_for(score: float) -> str:
    return f"{ADDR_PREFIX}{int(round(score * 1_000_000)):07d}"


def _legacy_record(address: str, score: float) -> dict:
    """A pre-unification snapshot record: no scored/source/provisional marker.

    Its stored verdict is deliberately wrong under the current ladder.
    """
    return {
        "address": address,
        "composite_score": score,
        "verdict": "LOW",
        "anomaly_score": 0.05,
        "risk_score": 0.5,
        "triggered_rules": [],
        "mixing_patterns": [],
        "chain_hops": 0,
    }


@pytest.fixture(scope="module", autouse=True)
def ladder_records():
    """Insert the ladder fixtures in-memory. persist=False keeps data/ clean."""
    xai_store.load()
    inserted = [_address_for(score) for score in LADDER_SCORES]
    for score, addr in zip(LADDER_SCORES, inserted):
        xai_store.upsert_composite(addr, _legacy_record(addr, score), persist=False)
    yield inserted
    for addr in inserted:
        xai_store._composite.pop(addr, None)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_entity_dossier_derives_verdict_instead_of_echoing_the_stored_label():
    """Legacy snapshot: score is echoed, label is re-derived from the ladder."""
    for score in LADDER_SCORES:
        response = asyncio.run(get_entity_explain(_address_for(score)))
        expected = risk_thresholds.map_verdict(score)
        assert response.composite_score == pytest.approx(score), (
            f"legacy record must keep its stored score {score}, "
            f"got {response.composite_score}"
        )
        assert response.verdict == expected, (
            f"score {score} reported as {response.verdict}, expected {expected} "
            "(the stored verdict string must not be echoed)"
        )


def test_alerts_feed_derives_verdict_instead_of_echoing_the_stored_label(client):
    """The alerts rows must carry the same derived label the dossier reports."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get(
        f"/api/v1/alerts?search={ADDR_PREFIX}&limit=200", headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == len(LADDER_SCORES)

    by_address = {item["address"]: item for item in data["items"]}
    assert len(by_address) == len(LADDER_SCORES)
    for score in LADDER_SCORES:
        item = by_address[_address_for(score)]
        assert item["composite_score"] == pytest.approx(score)
        assert item["verdict"] == risk_thresholds.map_verdict(score), (
            f"alerts row for score {score} is {item['verdict']}, "
            f"expected {risk_thresholds.map_verdict(score)}"
        )


def test_entity_and_alerts_agree_for_every_score(client):
    """The cross-surface invariant: one score, one label, everywhere."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get(
        f"/api/v1/alerts?search={ADDR_PREFIX}&limit=200", headers=headers
    )
    assert response.status_code == 200
    alerts_labels = {item["address"]: item["verdict"] for item in response.json()["items"]}

    for score in LADDER_SCORES:
        address = _address_for(score)
        dossier = asyncio.run(get_entity_explain(address))
        assert dossier.verdict == alerts_labels[address], (
            f"score {score}: dossier says {dossier.verdict}, "
            f"alerts says {alerts_labels[address]}"
        )


def test_alerts_verdict_filter_uses_the_same_derived_label(client):
    """Filtering by verdict must partition on the labels the rows actually show.

    Under the old stored-string filter, `verdict=CRITICAL` returned nothing for
    a 0.70 record whose label now reads CRITICAL.
    """
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    expected_critical = {
        _address_for(score)
        for score in LADDER_SCORES
        if risk_thresholds.map_verdict(score) == "CRITICAL"
    }
    assert expected_critical, "fixture must contain at least one CRITICAL score"

    response = client.get(
        f"/api/v1/alerts?search={ADDR_PREFIX}&verdict=CRITICAL&limit=200", headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert {item["address"] for item in data["items"]} == expected_critical
    assert data["total"] == len(expected_critical)


def test_alerts_verdict_counts_are_derived_from_the_ladder(client):
    """The histogram must be a from-scratch count of the canonical labels."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/alerts?limit=1", headers=headers)
    assert response.status_code == 200
    data = response.json()

    expected = Counter(
        risk_thresholds.map_verdict(float(rec.get("composite_score") or 0.0))
        for rec in xai_store._composite.values()
    )
    expected_counts = {label: expected.get(label, 0) for _, label in risk_thresholds.VERDICT_TIERS}

    assert data["verdict_counts"] == expected_counts
    assert sum(expected_counts.values()) == data["total_indexed"]


class _FakeRow:
    def __init__(self, mapping: dict[str, Any]) -> None:
        self._mapping = mapping


class _FakeResult:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = [_FakeRow(r) for r in rows]

    def fetchall(self) -> list[_FakeRow]:
        return self._rows


class _FakeSession:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    async def execute(self, *args: Any, **kwargs: Any) -> _FakeResult:
        return _FakeResult(self._rows)

    async def __aenter__(self) -> "_FakeSession":
        return self

    async def __aexit__(self, *exc: Any) -> bool:
        return False


def test_unscored_address_reports_unknown_not_a_derived_label(monkeypatch):
    """A wallet with telemetry but no score must not be given a tier.

    The endpoint only reaches its UNSCORED state when PostgreSQL has rows for
    the address but no composite record exists and inline scoring fails, so the
    session and the scorer are stubbed to drive exactly that path - no
    database is written to.
    """
    tx_rows: list[dict[str, Any]] = [
        {
            "txid": f"tx_ladder_unscored_{i}",
            "input_addresses": [UNSCORED_ADDR],
            "output_addresses": [f"bc1qout{i:029d}"],
            "input_amounts": [1.0],
            "output_amounts": [0.99],
            "fee": 0.0001,
            "script_type": "P2WPKH",
            "geo_country": "US",
            "asn": 15169,
            "ts": "2026-09-02T05:38:08Z",
            "risk_score": 0.4,
            "anomaly_score": 0.05,
        }
        for i in range(2)
    ]

    def _fake_session_local() -> _FakeSession:
        return _FakeSession(tx_rows)

    def _boom(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("inline scorer unavailable in this test")

    monkeypatch.setattr(entity_module, "SessionLocal", _fake_session_local)
    monkeypatch.setattr(entity_module.inline_scorer, "score_batch", _boom)
    # The verdict state under test is unrelated to attribution; keep the
    # on-the-fly explainer out of it.
    monkeypatch.setattr(
        entity_module, "_compute_provisional_shap_and_attention", lambda *a, **k: ([], None)
    )
    assert UNSCORED_ADDR not in xai_store._composite

    response = asyncio.run(get_entity_explain(UNSCORED_ADDR))

    assert response.verdict == UNKNOWN_VERDICT
    assert response.verdict != risk_thresholds.map_verdict(response.composite_score)
    assert response.evidence_trail.extra.get("scored") is False
