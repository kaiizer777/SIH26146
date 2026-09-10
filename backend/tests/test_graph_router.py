"""Integration tests for GET /api/v1/graph/{cluster_id} topology endpoint.

Validates:
1. Proportional quota allocation (wallets, transactions, IP hosts).
2. Traversal of IP nodes attached to transactions via :OBSERVED.
3. Seed flag enrichment from Neo4j (is_seed_illicit) and XAI store.
4. Fallback rollover for small clusters.
5. Nonexistent cluster handling.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
import app.services.xai_store as xai_store


@pytest.fixture(scope="module", autouse=True)
def ensure_xai_loaded():
    """Ensure XAI artifact store is populated before running graph router tests."""
    xai_store.load()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_large_cluster_quota_and_node_types(client):
    """Cluster #516 (large cluster) must contain balanced wallets, txs, IPs, and seeds."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/graph/516?max_nodes=150", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["cluster_id"] == 516
    nodes = data["nodes"]
    links = data["links"]
    assert len(nodes) > 0
    assert len(nodes) <= 150

    wallets = [n for n in nodes if n["type"] == "wallet"]
    txs = [n for n in nodes if n["type"] == "transaction"]
    ips = [n for n in nodes if n["type"] == "ip"]
    seeds = [n for n in nodes if n.get("is_seed")]

    # 1. Wallets should respect ceiling budget (<= 100)
    assert len(wallets) <= 100
    assert len(wallets) >= 80

    # 2. Transaction quota should be non-zero and populated (~35 slots)
    assert len(txs) >= 20

    # 3. IP host quota should be non-zero and populated (~15 slots)
    assert len(ips) >= 10

    # 4. Seed entities should be enriched and non-zero
    assert len(seeds) > 0

    # 5. Links should contain SENDS/RECEIVES and OBSERVED
    link_types = {l["type"] for l in links}
    assert "SENDS" in link_types or "RECEIVES" in link_types
    assert "OBSERVED" in link_types

    # 6. Verify OBSERVED links connect IP and Transaction nodes
    node_by_id = {n["id"]: n for n in nodes}
    observed_links = [l for l in links if l["type"] == "OBSERVED"]
    assert len(observed_links) > 0
    for l in observed_links:
        src_node = node_by_id.get(l["source"])
        tgt_node = node_by_id.get(l["target"])
        assert src_node is not None, f"Source node {l['source']} not found in nodes"
        assert tgt_node is not None, f"Target node {l['target']} not found in nodes"
        types = {src_node["type"], tgt_node["type"]}
        assert types == {"ip", "transaction"}, f"OBSERVED link connects unexpected types: {types}"


def test_small_cluster_rollover(client):
    """Small clusters with few wallets must roll over unused wallet quota to txs and IPs."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/graph/9451?max_nodes=50", headers=headers)
    assert response.status_code == 200
    data = response.json()

    nodes = data["nodes"]
    wallets = [n for n in nodes if n["type"] == "wallet"]
    txs = [n for n in nodes if n["type"] == "transaction"]
    ips = [n for n in nodes if n["type"] == "ip"]

    assert len(wallets) == 3
    # Rollover should have populated transactions and IPs beyond base budget
    assert len(txs) > 12, f"Expected rollover to allocate >12 tx slots, got {len(txs)}"
    assert len(ips) > 0
    assert len(nodes) > len(wallets)


def test_seed_enrichment_no_false_positives(client):
    """Cluster 182 should only mark genuine seed nodes as is_seed=True, not ordinary downstream wallets."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/graph/182?max_nodes=150", headers=headers)
    assert response.status_code == 200
    data = response.json()

    nodes = data["nodes"]
    seeds = [n for n in nodes if n.get("is_seed")]
    # Only true seed nodes are marked is_seed: true (<= 25)
    assert len(seeds) <= 25, f"Expected <= 25 true seeds, got {len(seeds)}"

    # Ordinary downstream wallet with positive seed proximity must have is_seed == False
    target_wallet = "bc1q5114cf6498a3bd58174a2ae94f55300bea6d29"
    node_map = {n["id"]: n for n in nodes}
    assert target_wallet in node_map, f"Wallet {target_wallet} expected in Cluster 182 graph"
    assert node_map[target_wallet]["is_seed"] is False, (
        f"Downstream wallet {target_wallet} falsely flagged as is_seed=True"
    )


def test_boundary_quotas_and_link_uniqueness(client):
    """Verify max_nodes boundaries (0, 1, 250, 300) and that link sets are unique."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}

    # 0. max_nodes=0 returns 422 (FastAPI query validation floor ge=1)
    res0 = client.get("/api/v1/graph/516?max_nodes=0", headers=headers)
    assert res0.status_code == 422

    # 1. max_nodes=1 returns status 200 with <= 1 node and 0 links
    res1 = client.get("/api/v1/graph/516?max_nodes=1", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["nodes"]) <= 1
    assert len(data1["links"]) == 0
    assert len(data1["links"]) == len(set((l["source"], l["target"], l["type"]) for l in data1["links"]))

    # 2. max_nodes=250 returns status 200 with nodes <= 250
    res250 = client.get("/api/v1/graph/516?max_nodes=250", headers=headers)
    assert res250.status_code == 200
    data250 = res250.json()
    assert len(data250["nodes"]) <= 250
    assert len(data250["links"]) == len(set((l["source"], l["target"], l["type"]) for l in data250["links"]))

    # 3. max_nodes=300 returns 422 (FastAPI query validation ceiling le=250)
    res300 = client.get("/api/v1/graph/516?max_nodes=300", headers=headers)
    assert res300.status_code == 422


def test_nonexistent_cluster(client):
    """Querying a cluster with no wallets returns an empty GraphResponse."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/graph/99999999?max_nodes=150", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["cluster_id"] == 99999999
    assert data["nodes"] == []
    assert data["links"] == []


def test_seed_recipient_not_flagged_as_seed(client, monkeypatch):
    """Downstream recipient of a seed transaction (e.g. RANSOMWHERE_SEED_RECIPIENT) must not be flagged is_seed: True."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    target_wallet = "bc1q5114cf6498a3bd58174a2ae94f55300bea6d29"

    orig_get_comp = xai_store.get_composite
    orig_get_ev = xai_store.get_evidence

    def mock_get_composite(address: str):
        comp = orig_get_comp(address)
        if address == target_wallet:
            comp_copy = dict(comp or {})
            comp_copy["triggered_rules"] = ["RANSOMWHERE_SEED_RECIPIENT"]
            comp_copy["is_seed"] = False
            return comp_copy
        return comp

    def mock_get_evidence(address: str):
        ev = orig_get_ev(address)
        if address == target_wallet:
            ev_copy = dict(ev or {})
            ev_copy["triggered_rules"] = ["RANSOMWHERE_SEED_RECIPIENT"]
            ev_copy["is_seed"] = False
            return ev_copy
        return ev

    monkeypatch.setattr(xai_store, "get_composite", mock_get_composite)
    monkeypatch.setattr(xai_store, "get_evidence", mock_get_evidence)

    response = client.get("/api/v1/graph/182?max_nodes=150", headers=headers)
    assert response.status_code == 200
    data = response.json()
    nodes = {n["id"]: n for n in data["nodes"]}
    assert target_wallet in nodes, f"Wallet {target_wallet} expected in Cluster 182 graph"
    assert nodes[target_wallet]["is_seed"] is False, (
        f"Downstream recipient wallet {target_wallet} falsely flagged as is_seed=True"
    )


def test_graph_links_attention_weights(client):
    """Cluster #516 graph links must contain attention_score and head_attentions breakdown."""
    headers = {"Authorization": f"Bearer {settings.api_dev_token}"}
    response = client.get("/api/v1/graph/516?max_nodes=100", headers=headers)
    assert response.status_code == 200
    data = response.json()
    links = data["links"]
    assert len(links) > 0

    tx_links = [l for l in links if l["type"] in ("SENDS", "RECEIVES", "CO_SPEND")]
    assert len(tx_links) > 0

    expected_heads = {"head_1_co_spend", "head_2_multihop", "head_3_seed_prox", "head_4_peeling"}

    for link in tx_links:
        score = link.get("attention_score")
        assert score is not None, f"Link {link} missing attention_score"
        assert 0.0 <= score <= 1.0, f"Attention score {score} out of bounds"

        heads = link.get("head_attentions")
        assert heads is not None, f"Link {link} missing head_attentions"
        assert isinstance(heads, dict)
        assert set(heads.keys()) == expected_heads

        for head_name, head_val in heads.items():
            assert 0.0 <= head_val <= 1.0, f"Head {head_name}={head_val} out of bounds"

        if link.get("is_explanatory") or link["type"] == "CO_SPEND":
            assert score >= 0.75, f"High-saliency link attention score {score} should be >= 0.75"


