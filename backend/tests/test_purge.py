"""Unit and integration tests for POST /ingest/purge endpoint."""

from __future__ import annotations

import sys
from pathlib import Path

import psycopg2
import pytest
from fastapi.testclient import TestClient

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.config import settings
from app.main import app
from app.routers.ingest import get_redis_client

client = TestClient(app)
AUTH_HEADERS = {"Authorization": f"Bearer {settings.api_dev_token}"}


def test_purge_requires_auth():
    """Unauthenticated call to /ingest/purge must return 401."""
    resp = client.post("/ingest/purge")
    assert resp.status_code == 401


def test_purge_success_contract():
    """POST /ingest/purge must return 200 with expected keys and clean baseline."""
    resp = client.post("/ingest/purge", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "purged"
    assert "pg_deleted" in data
    assert "wallets_deleted" in data
    assert data["composite_count"] == 15873


def test_purge_removes_ingested_transactions_and_redis_keys():
    """Ingested rows (cluster_id >= 1M or NULL) and Redis keys must be deleted by purge."""
    test_txid = "test_purge_dummy_txid_99999"

    # 1. Insert temporary test row into postgres
    conn = psycopg2.connect(settings.database_url)
    with conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO transactions (txid, ts, cluster_id)
            VALUES (%s, NOW(), 1000001)
            ON CONFLICT (txid) DO UPDATE SET cluster_id = 1000001
            """,
            (test_txid,),
        )
    conn.close()

    # 2. Set temporary test keys in Redis
    redis_cli = get_redis_client()
    if redis_cli is not None:
        redis_cli.set("file_hash:test_hash_val", "dummy_task")
        redis_cli.set("sync_done:dummy_task", "1")
        redis_cli.set("celery-task-meta-dummy_task", "dummy_meta")

    # 3. Call purge
    resp = client.post("/ingest/purge", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["pg_deleted"] >= 1

    # 4. Verify row is deleted from postgres
    conn = psycopg2.connect(settings.database_url)
    with conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM transactions WHERE txid = %s", (test_txid,))
        count = cur.fetchone()[0]
    conn.close()
    assert count == 0

    # 5. Verify Redis keys are purged
    if redis_cli is not None:
        assert redis_cli.get("file_hash:test_hash_val") is None
        assert redis_cli.get("sync_done:dummy_task") is None
        assert redis_cli.get("celery-task-meta-dummy_task") is None
