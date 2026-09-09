"""Unit and Integration tests for Sub-task 11.3: POST /ingest/sync/{task_id}.

Tests verify:
1. Status check: task not found or not SUCCESS returns HTTP 404.
2. First sync call returns HTTP 200 with { "scored": N, "upserted": N, "skipped_existing": N }.
3. Immediate duplicate call returns HTTP 409 ("Task already synced within cooldown window").
4. GET /api/v1/entity/{new_wallet_address}/explain immediately serves the provisional
   record from memory (HTTP 200 instead of 404).
5. Pre-existing non-provisional addresses in xai_store are skipped (counted in skipped_existing)
   and not overwritten by lightweight provisional records.
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.config import settings
from app.main import app
import app.services.xai_store as xai_store

KNOWN_SEED_ADDR = "17TMc2UkVRSga2yYvuxSD9Q1XyB2EPRjTF"

client = TestClient(app)
AUTH_HEADERS = {"Authorization": f"Bearer {settings.api_dev_token}"}


@pytest.fixture(autouse=True)
def reset_fallback_synced():
    """Reset in-memory fallback sync tracker and test state between runs."""
    from app.routers.ingest import _fallback_synced_tasks
    _fallback_synced_tasks.clear()
    yield
    _fallback_synced_tasks.clear()


class TestIngestSyncEndpoint:
    """Test suite for POST /ingest/sync/{task_id}."""

    def test_sync_task_not_found_or_not_success_returns_404(self):
        """When Celery task is PENDING or not in SUCCESS, return HTTP 404."""
        mock_result = MagicMock()
        mock_result.state = "PENDING"

        with patch("app.routers.ingest.AsyncResult", return_value=mock_result):
            resp = client.post("/ingest/sync/non-existent-task-123", headers=AUTH_HEADERS)
            assert resp.status_code == 404
            assert "not in SUCCESS state" in resp.json()["detail"]

    def test_sync_first_call_succeeds_and_duplicate_returns_409(self):
        """First sync call returns 200 with counts; duplicate call returns 409."""
        mock_result = MagicMock()
        mock_result.state = "SUCCESS"

        # Mock Redis client
        mock_redis = MagicMock()
        redis_store: dict[str, str] = {}

        def fake_get(key: str):
            return redis_store.get(key)

        def fake_set(key: str, val: str, ex=None):
            redis_store[key] = val

        mock_redis.get.side_effect = fake_get
        mock_redis.set.side_effect = fake_set

        # Sample rows returned from DB
        sample_rows = [
            {
                "txid": "aa" * 32,
                "ts": "2026-09-09T01:00:00Z",
                "src_ip": "1.2.3.4",
                "dst_ip": "5.6.7.8",
                "src_port": 8333,
                "dst_port": 8333,
                "input_addresses": ["bc1q_sync_in_1"],
                "output_addresses": ["bc1q_sync_out_1a", "bc1q_sync_out_1b"],
                "input_amounts": [1.0],
                "output_amounts": [0.6, 0.39],
                "fee": 0.01,
                "script_type": "P2WPKH",
                "geo_country": "US",
                "asn": 15169,
            }
        ]

        fake_session = AsyncMock()
        fake_db_result = MagicMock()
        fake_row = MagicMock()
        fake_row._mapping = sample_rows[0]
        fake_db_result.fetchall.return_value = [fake_row]
        fake_session.execute.return_value = fake_db_result

        fake_session_cm = AsyncMock()
        fake_session_cm.__aenter__.return_value = fake_session
        fake_session_cm.__aexit__.return_value = None

        task_id = "test-sync-task-uuid-001"

        with (
            patch("app.routers.ingest.AsyncResult", return_value=mock_result),
            patch("app.routers.ingest.get_redis_client", return_value=mock_redis),
            patch("app.routers.ingest.SessionLocal", return_value=fake_session_cm),
        ):
            # 1. First call -> 200 OK
            resp1 = client.post(f"/ingest/sync/{task_id}", headers=AUTH_HEADERS)
            assert resp1.status_code == 200
            data1 = resp1.json()
            assert data1["scored"] == 1
            assert data1["upserted"] == 3  # 1 in + 2 out = 3 unique addresses
            assert data1["skipped_existing"] == 0

            # Verify sync_done was set in Redis
            assert redis_store.get(f"sync_done:{task_id}") == "1"

            # 2. Immediate duplicate call -> 409 Conflict
            resp2 = client.post(f"/ingest/sync/{task_id}", headers=AUTH_HEADERS)
            assert resp2.status_code == 409
            assert "already synced" in resp2.json()["detail"]

    def test_sync_serves_provisional_entity_explain_immediately(self):
        """Newly synced wallet serves GET /api/v1/entity/{address}/explain immediately."""
        new_wallet = "bc1q_live_synced_wallet_xyz"
        mock_result = MagicMock()
        mock_result.state = "SUCCESS"

        # Verify wallet does not exist prior to sync
        assert xai_store.get_composite(new_wallet) is None

        sample_rows = [
            {
                "txid": "bb" * 32,
                "ts": "2026-09-09T02:00:00Z",
                "src_ip": "1.2.3.4",
                "dst_ip": "5.6.7.8",
                "src_port": 8333,
                "dst_port": 8333,
                "input_addresses": [new_wallet],
                "output_addresses": ["bc1q_some_recipient"],
                "input_amounts": [0.5],
                "output_amounts": [0.49],
                "fee": 0.01,
                "script_type": "P2WPKH",
                "geo_country": "US",
                "asn": 15169,
            }
        ]

        fake_session = AsyncMock()
        fake_db_result = MagicMock()
        fake_row = MagicMock()
        fake_row._mapping = sample_rows[0]
        fake_db_result.fetchall.return_value = [fake_row]
        fake_session.execute.return_value = fake_db_result

        fake_session_cm = AsyncMock()
        fake_session_cm.__aenter__.return_value = fake_session
        fake_session_cm.__aexit__.return_value = None

        task_id = "test-sync-task-uuid-002"

        with (
            patch("app.routers.ingest.AsyncResult", return_value=mock_result),
            patch("app.routers.ingest.get_redis_client", return_value=None),
            patch("app.routers.ingest.SessionLocal", return_value=fake_session_cm),
        ):
            # Sync
            sync_resp = client.post(f"/ingest/sync/{task_id}", headers=AUTH_HEADERS)
            assert sync_resp.status_code == 200

            # Verify xai_store now has the wallet
            comp = xai_store.get_composite(new_wallet)
            assert comp is not None
            assert comp["provisional"] is True

            # Query GET /api/v1/entity/{address}/explain
            explain_resp = client.get(f"/api/v1/entity/{new_wallet}/explain", headers=AUTH_HEADERS)
            assert explain_resp.status_code == 200
            explain_data = explain_resp.json()
            assert explain_data["address"] == new_wallet
            assert explain_data["composite_score"] >= 0.0
            assert explain_data["verdict"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
            assert explain_data["evidence_trail"]["anomaly_score"] is not None

    def test_sync_preserves_existing_rich_dossiers(self):
        """Permanent dossiers in xai_store are skipped and not overwritten by provisional records."""
        existing_addr = "bc1q_rich_historical_dossier_wallet"
        # Seed an existing non-provisional record
        xai_store.upsert_composite(
            existing_addr,
            {
                "address": existing_addr,
                "composite_score": 0.88,
                "verdict": "CRITICAL",
                "provisional": False,  # Full-pipeline indexed
                "risk_score": 0.75,
            },
        )

        mock_result = MagicMock()
        mock_result.state = "SUCCESS"

        sample_rows = [
            {
                "txid": "cc" * 32,
                "ts": "2026-09-09T03:00:00Z",
                "src_ip": "1.2.3.4",
                "dst_ip": "5.6.7.8",
                "src_port": 8333,
                "dst_port": 8333,
                "input_addresses": [existing_addr],
                "output_addresses": ["bc1q_brand_new_addr"],
                "input_amounts": [0.5],
                "output_amounts": [0.49],
                "fee": 0.01,
                "script_type": "P2WPKH",
                "geo_country": "US",
                "asn": 15169,
            }
        ]

        fake_session = AsyncMock()
        fake_db_result = MagicMock()
        fake_row = MagicMock()
        fake_row._mapping = sample_rows[0]
        fake_db_result.fetchall.return_value = [fake_row]
        fake_session.execute.return_value = fake_db_result

        fake_session_cm = AsyncMock()
        fake_session_cm.__aenter__.return_value = fake_session
        fake_session_cm.__aexit__.return_value = None

        task_id = "test-sync-task-uuid-003"

        with (
            patch("app.routers.ingest.AsyncResult", return_value=mock_result),
            patch("app.routers.ingest.get_redis_client", return_value=None),
            patch("app.routers.ingest.SessionLocal", return_value=fake_session_cm),
        ):
            sync_resp = client.post(f"/ingest/sync/{task_id}", headers=AUTH_HEADERS)
            assert sync_resp.status_code == 200
            data = sync_resp.json()
            assert data["scored"] == 1
            assert data["upserted"] == 1  # bc1q_brand_new_addr
            assert data["skipped_existing"] == 1  # existing_addr preserved

            # Ensure existing_addr was not overwritten
            comp = xai_store.get_composite(existing_addr)
            assert comp["composite_score"] == 0.88
            assert comp["provisional"] is False
