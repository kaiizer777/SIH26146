"""Unit tests for DUP-1: Duplicate file upload detection & 409 guard.

Tests verify:
  1. Fresh file computes SHA-256, enqueues Celery task, caches hash in Redis (TTL=86400s).
  2. Duplicate upload returns HTTP 409 with original_task_id and unlinks temp file.
  3. Redis blips/downtime fail open defensively without crashing the ingest endpoint.
"""

import hashlib
import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import redis
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": f"Bearer {settings.api_dev_token}"}

SAMPLE_CSV = (
    b"txid,ts,src_ip,dst_ip,src_port,dst_port,input_addresses,output_addresses,input_amounts,output_amounts,fee,script_type,geo_country,asn\n"
    + b"a" * 64
    + b',2026-01-01T00:00:00Z,8.8.8.8,1.1.1.1,12345,8333,"{bc1qtest1}","{bc1qtest2}","{0.1}","{0.09}",0.001,P2WPKH,US,15169\n'
)
SAMPLE_HASH = hashlib.sha256(SAMPLE_CSV).hexdigest()


@pytest.fixture(autouse=True)
def cleanup_uploads():
    """Ensure temporary upload files created during tests are unlinked."""
    upload_dir = Path(settings.upload_dir)
    before = set(upload_dir.iterdir()) if upload_dir.exists() else set()
    yield
    if upload_dir.exists():
        after = set(upload_dir.iterdir())
        for f in after - before:
            f.unlink(missing_ok=True)


class TestDuplicateIngestGuard:
    """Test suite for DUP-1 SHA-256 Redis duplicate detection."""

    def test_fresh_upload_enqueues_and_caches_hash(self):
        """A new file is enqueued and its hash is cached in Redis with a 24h TTL."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # Cache miss

        mock_task = MagicMock()
        mock_task.id = "task-uuid-1234"

        with (
            patch("app.routers.ingest.get_redis_client", return_value=mock_redis),
            patch("app.tasks.ingest.process_ingest_file.delay", return_value=mock_task) as mock_delay,
        ):
            response = client.post(
                "/ingest",
                files={"file": ("test.csv", io.BytesIO(SAMPLE_CSV), "text/csv")},
                headers=AUTH_HEADERS,
            )

            assert response.status_code == 202
            assert response.json() == {"task_id": "task-uuid-1234", "status": "PENDING"}

            # Verify Redis lookup
            mock_redis.get.assert_called_once_with(f"file_hash:{SAMPLE_HASH}")

            # Verify task enqueued
            mock_delay.assert_called_once()

            # Verify hash stored with 86400 TTL
            mock_redis.set.assert_called_once_with(
                f"file_hash:{SAMPLE_HASH}", "task-uuid-1234", ex=86400
            )

    def test_duplicate_upload_returns_409_and_deletes_temp(self):
        """Uploading identical content returns HTTP 409, does not enqueue Celery, and deletes temp file."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = b"original-task-uuid-5678"

        upload_dir = Path(settings.upload_dir)
        files_before = set(upload_dir.iterdir()) if upload_dir.exists() else set()

        with (
            patch("app.routers.ingest.get_redis_client", return_value=mock_redis),
            patch("app.tasks.ingest.process_ingest_file.delay") as mock_delay,
        ):
            response = client.post(
                "/ingest",
                files={"file": ("duplicate.csv", io.BytesIO(SAMPLE_CSV), "text/csv")},
                headers=AUTH_HEADERS,
            )

            assert response.status_code == 409
            data = response.json()
            assert "detail" in data
            detail = data["detail"]
            assert detail["detail"] == "Duplicate upload detected — this file was already ingested."
            assert detail["original_task_id"] == "original-task-uuid-5678"

            # Celery must NOT be called
            mock_delay.assert_not_called()

            # Verify temp file was unlinked and not leaked on disk
            files_after = set(upload_dir.iterdir()) if upload_dir.exists() else set()
            assert files_after == files_before

    def test_redis_error_on_get_fails_open_gracefully(self):
        """When Redis is down on read, upload succeeds without crashing."""
        mock_redis = MagicMock()
        mock_redis.get.side_effect = redis.ConnectionError("Redis connection refused")

        mock_task = MagicMock()
        mock_task.id = "task-fallback-999"

        with (
            patch("app.routers.ingest.get_redis_client", return_value=mock_redis),
            patch("app.tasks.ingest.process_ingest_file.delay", return_value=mock_task) as mock_delay,
        ):
            response = client.post(
                "/ingest",
                files={"file": ("test.csv", io.BytesIO(SAMPLE_CSV), "text/csv")},
                headers=AUTH_HEADERS,
            )

            assert response.status_code == 202
            assert response.json() == {"task_id": "task-fallback-999", "status": "PENDING"}
            mock_delay.assert_called_once()

    def test_redis_error_on_set_fails_open_gracefully(self):
        """When Redis is down on write, upload still returns 202."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None
        mock_redis.set.side_effect = redis.TimeoutError("Redis timed out")

        mock_task = MagicMock()
        mock_task.id = "task-fallback-888"

        with (
            patch("app.routers.ingest.get_redis_client", return_value=mock_redis),
            patch("app.tasks.ingest.process_ingest_file.delay", return_value=mock_task),
        ):
            response = client.post(
                "/ingest",
                files={"file": ("test.csv", io.BytesIO(SAMPLE_CSV), "text/csv")},
                headers=AUTH_HEADERS,
            )

            assert response.status_code == 202
            assert response.json() == {"task_id": "task-fallback-888", "status": "PENDING"}

    def test_celery_enqueue_failure_cleans_up_temp_file(self):
        """When Celery broker fails on delay(), temp file is cleaned up and 503 is returned."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None

        upload_dir = Path(settings.upload_dir)
        files_before = set(upload_dir.iterdir()) if upload_dir.exists() else set()

        with (
            patch("app.routers.ingest.get_redis_client", return_value=mock_redis),
            patch("app.tasks.ingest.process_ingest_file.delay", side_effect=RuntimeError("Broker unavailable")),
        ):
            response = client.post(
                "/ingest",
                files={"file": ("test.csv", io.BytesIO(SAMPLE_CSV), "text/csv")},
                headers=AUTH_HEADERS,
            )

            assert response.status_code == 503
            assert response.json()["detail"] == "Task queue unavailable. Please ensure Celery worker is active."

            # Verify temp file was unlinked and not leaked on disk
            files_after = set(upload_dir.iterdir()) if upload_dir.exists() else set()
            assert files_after == files_before


class TestDuplicateRowRejection:
    """Test suite for DUP-2b Celery pipeline duplicate row handling."""

    def test_database_copy_error_increments_total_rejected(self, tmp_path):
        """When DB COPY fails (e.g. duplicate key violation), rows are counted in total_rejected."""
        import psycopg2
        from app.tasks.ingest import run_ingest_pipeline

        test_file = tmp_path / "sample.csv"
        test_file.write_bytes(SAMPLE_CSV)

        fake_conn = MagicMock()
        fake_conn.autocommit = False

        def fake_failing_insert(conn, rows):
            # Simulate PostgreSQL duplicate key violation
            raise psycopg2.IntegrityError(
                "duplicate key value violates unique constraint 'transactions_txid_key'"
            )

        summary = run_ingest_pipeline(
            str(test_file),
            "csv",
            db_conn_factory=lambda: fake_conn,
            insert_fn=fake_failing_insert,
        )

        assert summary["total_received"] == 1
        assert summary["total_inserted"] == 0
        assert summary["total_rejected"] == 1
        fake_conn.rollback.assert_called()

