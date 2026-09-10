"""Integration tests for alerts endpoint heuristic filtering (peeling chain vs coinjoin)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
import app.services.xai_store as xai_store


@pytest.fixture(scope="module", autouse=True)
def ensure_xai_loaded():
    """Ensure XAI store is populated before running alerts tests."""
    xai_store.load()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_alerts_peeling_chain_isolation(client):
    """GET /api/v1/alerts?is_peeling_chain=true: all items have is_peeling_chain=True and chain_hops > 0."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/alerts?is_peeling_chain=true&limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0

    for item in data["items"]:
        assert item["is_peeling_chain"] is True, f"Expected is_peeling_chain True, got {item}"
        assert item["chain_hops"] is not None and item["chain_hops"] > 0, (
            f"Expected chain_hops > 0, got {item['chain_hops']}"
        )


def test_alerts_coinjoin_isolation(client):
    """GET /api/v1/alerts?is_coinjoin=true: all items have is_peeling_chain=False and is_mixing=True."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/alerts?is_coinjoin=true&limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0

    for item in data["items"]:
        assert item["is_peeling_chain"] is False, f"Expected is_peeling_chain False, got {item}"
        assert item["is_mixing"] is True, f"Expected is_mixing True, got {item}"


def test_alerts_mixing_union(client):
    """GET /api/v1/alerts?is_mixing=true: all items have is_mixing=True and equals sum of peeling and coinjoin."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    
    r_peel = client.get("/api/v1/alerts?is_peeling_chain=true&limit=1", headers=headers)
    r_coin = client.get("/api/v1/alerts?is_coinjoin=true&limit=1", headers=headers)
    r_mix = client.get("/api/v1/alerts?is_mixing=true&limit=1", headers=headers)
    
    assert r_peel.status_code == 200
    assert r_coin.status_code == 200
    assert r_mix.status_code == 200
    
    peel_total = r_peel.json()["total"]
    coin_total = r_coin.json()["total"]
    mix_total = r_mix.json()["total"]
    
    assert peel_total > 0
    assert coin_total > 0
    assert peel_total + coin_total == mix_total


def test_alerts_multi_verdict_filtering(client):
    """GET /api/v1/alerts?verdict=CRITICAL,HIGH: returns only CRITICAL and HIGH alerts, total equals sum."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}

    r_crit = client.get("/api/v1/alerts?verdict=CRITICAL&limit=1", headers=headers)
    r_high = client.get("/api/v1/alerts?verdict=HIGH&limit=1", headers=headers)
    r_both = client.get("/api/v1/alerts?verdict=CRITICAL,HIGH&limit=50", headers=headers)

    assert r_crit.status_code == 200
    assert r_high.status_code == 200
    assert r_both.status_code == 200

    crit_total = r_crit.json()["total"]
    high_total = r_high.json()["total"]
    both_data = r_both.json()

    assert crit_total > 0
    assert high_total > 0
    assert both_data["total"] == crit_total + high_total

    for item in both_data["items"]:
        assert item["verdict"] in {"CRITICAL", "HIGH"}

    # Invalid verdict should return 422
    r_bad = client.get("/api/v1/alerts?verdict=CRITICAL,INVALID_VERDICT", headers=headers)
    assert r_bad.status_code == 422

