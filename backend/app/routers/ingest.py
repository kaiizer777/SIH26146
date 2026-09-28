"""Ingest router: POST /ingest and GET /ingest/status/{task_id}.

POST /ingest:
  - Accepts a multipart file upload (CSV, JSON, or XML).
  - Detects format from the first 512 bytes of content (not from extension).
  - Streams the upload to data/uploads/<uuid> on disk.
  - Enqueues the process_ingest_file Celery task.
  - Returns HTTP 202 immediately with task_id.

GET /ingest/status/{task_id}:
  - Returns Celery AsyncResult state plus progress/result/error payload.
  - On SUCCESS the result carries a `graph` block (Neo4j write outcome) and an
    `enrichment` block (the dispatched enrichment task id, or why it was
    skipped). A graph failure is reported there, never hidden.

GET /ingest/enrichment/{task_id}:
  - Reports the state of the post-ingest enrichment chain for an ingest task,
    including per-stage results.
"""

import collections
import hashlib
import logging
import pathlib
import threading
import time
from typing import Any
import uuid

import redis
from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException, Path, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.celery_app import celery_app
from app.config import settings
from app.schemas.ingest import IngestResponse, IngestSyncResponse, TaskStatusResponse
from app.services.db import SessionLocal
from app.services import inline_scorer
from app.services import shap_service
from app.services.parser import detect_format
from app.tasks.ingest import IngestDataLossError
import app.services.xai_store as xai_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingest"])

# ---------------------------------------------------------------------------
# Real-SHAP budget
# ---------------------------------------------------------------------------
# A real shap.PermutationExplainer costs roughly 10 s/transaction on this CPU
# box at max_evals=2000. Running it across all 2,000 rows of the demo dataset
# would take ~5.5 hours, which is unacceptable behind an interactive upload.
#
# Strategy: attribute only the TOP-N most anomalous transactions of the batch —
# those are the ones an analyst actually opens a dossier for, and the ones that
# drive the alert list. N and max_evals are both bounded, so the sync endpoint
# has a hard, predictable ceiling instead of scaling with the upload size.
# Everything outside the top-N is left without SHAP, and the entity endpoint
# reports an explicit unavailable state for it rather than inventing values.

# How many transactions get real SHAP per sync call.
SHAP_TOP_N = 12
# Monte-Carlo budget per explained transaction. Lower than the service default
# of 2000 so the bounded top-N still completes quickly.
SHAP_MAX_EVALS = 256
# Ceiling on wall-clock time spent attributing inside one sync request.
SHAP_TIME_BUDGET_S = 90.0

# Ensure upload directory exists at import time.
_UPLOAD_DIR = pathlib.Path(settings.upload_dir)
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Maximum upload size guard (500 MB).
_MAX_UPLOAD_BYTES = 500 * 1024 * 1024

# File extensions used for the temp file (cosmetic only; format is detected
# from content, not from this extension).
_FORMAT_EXT: dict[str, str] = {"csv": ".csv", "json": ".json", "xml": ".xml"}

# ---------------------------------------------------------------------------
# Re-ingest policy
# ---------------------------------------------------------------------------
# A byte-identical re-upload is short-circuited by the Redis content-hash cache
# below. A byte-DIFFERENT copy of the same transactions is not, and used to
# destroy the batch: COPY is all-or-nothing, so one already-stored txid discarded
# every other row while the task still reported SUCCESS.
#
# The policy is SKIP-AND-REPORT, not reject and not replace:
#   * Rejecting with 409 would make a monitoring ingest non-idempotent and force
#     an operator to work around the API to re-upload the same chain data.
#   * Replacing would overwrite already-stored forensic evidence, which a
#     chain-analysis product must never do silently.
#   * Skipping already-stored txids and REPORTING the split (inserted vs
#     duplicate vs invalid) keeps re-ingest safe and the accounting honest.
# The insert path (app/tasks/ingest.py) enforces this with
# ``ON CONFLICT (txid) DO NOTHING`` and raises IngestDataLossError when a run
# stores nothing, so a total no-op upload surfaces as FAILURE rather than a
# silent success.
INGEST_REINGEST_POLICY = "skip_and_report"

_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis | None:
    """Return a shared Redis client, initializing lazily if needed.

    Handles connection errors defensively so temporary Redis issues
    do not crash the entire endpoint.
    """
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.redis_url,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
        except Exception as exc:
            logger.warning("Could not initialize Redis client from '%s': %s", settings.redis_url, exc)
            return None
    return _redis_client


@router.post(
    "",
    status_code=202,
    response_model=IngestResponse,
    summary="Upload a transaction file for async ingest",
)
async def post_ingest(file: UploadFile) -> JSONResponse:
    """Accept a multipart file, detect format, enqueue Celery task.

    Returns HTTP 202 with task_id immediately. Poll
    GET /ingest/status/{task_id} for progress; its ``result`` reports
    ``total_inserted`` / ``total_duplicates`` / ``total_rejected`` so a re-upload
    of previously ingested transactions is visible rather than silent (see
    :data:`INGEST_REINGEST_POLICY`).
    """
    # --- Read first chunk for format sniffing ---
    header_chunk = await file.read(512)
    if not header_chunk:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        detected_fmt = detect_format(header_chunk)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    logger.info(
        "Received upload '%s', detected format: %s", file.filename, detected_fmt
    )

    # --- Stream to temp file and compute SHA-256 hash inline (DUP-1) ---
    ext = _FORMAT_EXT.get(detected_fmt, ".bin")
    temp_name = f"{uuid.uuid4().hex}{ext}"
    temp_path = _UPLOAD_DIR / temp_name

    hasher = hashlib.sha256()
    try:
        total_bytes = len(header_chunk)
        hasher.update(header_chunk)
        with open(temp_path, "wb") as fh:
            fh.write(header_chunk)
            while True:
                chunk = await file.read(65_536)  # 64 KB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > _MAX_UPLOAD_BYTES:
                    fh.close()
                    temp_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload exceeds maximum allowed size of {_MAX_UPLOAD_BYTES // 1024 // 1024} MB.",
                    )
                hasher.update(chunk)
                fh.write(chunk)
        file_hash = hasher.hexdigest()
    except HTTPException:
        raise
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        logger.exception("Failed to write upload to disk: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    logger.info(
        "Saved upload to %s (%.2f MB, hash=%s), checking for duplicates",
        temp_path, total_bytes / 1024 / 1024, file_hash,
    )

    redis_cli = get_redis_client()
    if redis_cli is not None:
        try:
            existing_task_id = redis_cli.get(f"file_hash:{file_hash}")
            if existing_task_id is not None:
                temp_path.unlink(missing_ok=True)
                orig_id = (
                    existing_task_id.decode("utf-8")
                    if isinstance(existing_task_id, bytes)
                    else str(existing_task_id)
                )
                logger.warning(
                    "Duplicate upload rejected: hash=%s original_task_id=%s",
                    file_hash,
                    orig_id,
                )
                raise HTTPException(
                    status_code=409,
                    detail={
                        "detail": "Duplicate upload detected — this file was already ingested.",
                        "original_task_id": orig_id,
                    },
                )
        except HTTPException:
            raise
        except redis.RedisError as r_exc:
            logger.warning(
                "Redis error checking file_hash:%s: %s — proceeding without duplicate check",
                file_hash,
                r_exc,
            )
        except Exception as exc:
            logger.warning("Unexpected error checking Redis duplicate key: %s — proceeding", exc)

    # --- Enqueue Celery task ---
    from app.tasks.ingest import process_ingest_file  # local import avoids circular at module load

    try:
        task = process_ingest_file.delay(str(temp_path), detected_fmt)
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        logger.exception("Failed to enqueue Celery ingest task for %s: %s", temp_path, exc)
        raise HTTPException(
            status_code=503,
            detail="Task queue unavailable. Please ensure Celery worker is active.",
        )

    # Store file hash in Redis with a 24-hour TTL (86400 seconds)
    if redis_cli is not None:
        try:
            redis_cli.set(f"file_hash:{file_hash}", task.id, ex=86400)
            logger.info("Stored file_hash:%s in Redis (task_id=%s, ttl=86400s)", file_hash, task.id)
        except redis.RedisError as r_exc:
            logger.warning("Redis error storing file_hash:%s: %s", file_hash, r_exc)
        except Exception as exc:
            logger.warning("Unexpected error storing file hash in Redis: %s", exc)

    return JSONResponse(
        status_code=202,
        content={"task_id": task.id, "status": "PENDING"},
    )


@router.get(
    "/status/{task_id}",
    response_model=TaskStatusResponse,
    summary="Poll async ingest task status",
)
async def get_ingest_status(task_id: str) -> TaskStatusResponse:
    """Return the current state of a Celery ingest task.

    States:
      PENDING  — task queued, not yet started.
      STARTED  — worker has picked it up.
      PROGRESS — worker is processing (includes running counts in `progress`).
      SUCCESS  — complete; `result` contains the summary.
      FAILURE  — task raised an exception; `error` contains the message.
    """
    result: AsyncResult = AsyncResult(task_id, app=celery_app)
    state = result.state

    if state == "PENDING":
        return TaskStatusResponse(task_id=task_id, status="PENDING")

    if state == "STARTED":
        return TaskStatusResponse(task_id=task_id, status="STARTED")

    if state == "PROGRESS":
        return TaskStatusResponse(
            task_id=task_id,
            status="PROGRESS",
            progress=result.info,  # dict from update_state(meta=...)
        )

    if state == "SUCCESS":
        return TaskStatusResponse(
            task_id=task_id,
            status="SUCCESS",
            result=result.result,
        )

    if state == "FAILURE":
        error_msg = str(result.result) if result.result else "Unknown error"
        # A run that durably stored nothing raises IngestDataLossError, which
        # carries the full summary. Surface the counts alongside the message so
        # a re-upload reports "N duplicates, 0 inserted" instead of an opaque
        # failure string.
        failure_summary: dict[str, Any] | None = None
        if isinstance(result.result, IngestDataLossError) and result.result.summary:
            failure_summary = result.result.summary
        return TaskStatusResponse(
            task_id=task_id,
            status="FAILURE",
            error=error_msg,
            result=failure_summary,
        )

    # Covers REVOKED and any other states.
    return TaskStatusResponse(task_id=task_id, status=state)


_fallback_lock = threading.Lock()
_fallback_synced_tasks: collections.OrderedDict[str, bool] = collections.OrderedDict()
_MAX_FALLBACK_ENTRIES = 1000


def _check_and_set_fallback(task_id: str) -> None:
    """Thread-safe fallback idempotency check using a bounded OrderedDict."""
    with _fallback_lock:
        if task_id in _fallback_synced_tasks:
            raise HTTPException(
                status_code=409,
                detail="Task already synced within cooldown window",
            )
        _fallback_synced_tasks[task_id] = True
        if len(_fallback_synced_tasks) > _MAX_FALLBACK_ENTRIES:
            _fallback_synced_tasks.popitem(last=False)  # pop oldest FIFO


def _clear_fallback(task_id: str) -> None:
    """Remove task_id from fallback cache on failure to allow retries."""
    with _fallback_lock:
        _fallback_synced_tasks.pop(task_id, None)


@router.post(
    "/sync/{task_id}",
    response_model=IngestSyncResponse,
    summary="Sync newly ingested transactions into in-memory XAI store",
)
async def post_ingest_sync(
    task_id: str = Path(..., pattern=r"^[0-9a-fA-F-]{36}$"),
) -> IngestSyncResponse:
    """Score newly ingested transactions inline and upsert into the XAI store.

    1. Checks Celery task status (must be SUCCESS).
    2. Enforces idempotency via atomic Redis SETNX or thread-safe bounded fallback.
    3. If total_inserted == 0, returns early without querying DB.
    4. Queries PostgreSQL by task-scoped txids (with 5-minute fallback).
    5. Scores batch inline and atomically upserts via xai_store.upsert_batch().
    """
    # 1. Status Check: inspect Celery task state
    result = AsyncResult(task_id, app=celery_app)
    state = result.state
    if state != "SUCCESS":
        raise HTTPException(
            status_code=404,
            detail=f"Task {task_id} not found or not in SUCCESS state (current state: {state})",
        )

    # 2. Idempotency Guard: atomic Redis SETNX with TTL=3600
    redis_cli = get_redis_client()
    if redis_cli is not None:
        try:
            # Atomic SETNX with TTL=3600
            acquired = redis_cli.set(f"sync_done:{task_id}", "1", nx=True, ex=3600)
            if not acquired:
                raise HTTPException(
                    status_code=409,
                    detail="Task already synced within cooldown window",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Redis error checking sync_done:%s: %s — checking fallback", task_id, exc)
            _check_and_set_fallback(task_id)
    else:
        _check_and_set_fallback(task_id)

    # 3. Inspect task result
    task_data = result.result if isinstance(result.result, dict) else {}
    if task_data.get("total_inserted", 0) == 0:
        return IngestSyncResponse(scored=0, upserted=0, skipped_existing=0)

    # 4. PostgreSQL Query: retrieve task-scoped rows
    txids = task_data.get("txids", [])
    rows: list[dict[str, Any]] = []
    try:
        async with SessionLocal() as db:
            if txids:
                query_res = await db.execute(
                    text("SELECT * FROM transactions WHERE txid = ANY(:txids)"),
                    {"txids": txids},
                )
            else:
                query_res = await db.execute(
                    text("SELECT * FROM transactions WHERE ingested_at > NOW() - INTERVAL '5 minutes'")
                )
            rows = [dict(r._mapping) for r in query_res.fetchall()]
    except Exception as exc:
        logger.exception("Database query failed during transaction sync for task %s: %s", task_id, exc)
        if redis_cli is not None:
            try:
                redis_cli.delete(f"sync_done:{task_id}")
            except Exception as r_err:
                logger.warning("Failed to delete sync_done:%s from Redis: %s", task_id, r_err)
        _clear_fallback(task_id)
        raise HTTPException(
            status_code=500,
            detail=f"Database query failed during transaction sync: {exc}",
        )

    # 5. Scoring & Atomic Batch Upsert
    try:
        scored_records = inline_scorer.score_batch(rows)
        upserted, skipped_existing = xai_store.upsert_batch(scored_records)
    except Exception as exc:
        logger.exception("Scoring or XAI store upsert failed for task %s: %s", task_id, exc)
        if redis_cli is not None:
            try:
                redis_cli.delete(f"sync_done:{task_id}")
            except Exception as r_err:
                logger.warning("Failed to delete sync_done:%s from Redis: %s", task_id, r_err)
        _clear_fallback(task_id)
        raise HTTPException(
            status_code=500,
            detail=f"Scoring/store update failed during sync: {exc}",
        )

    # 6. Real SHAP for the highest-signal transactions, bounded by N and time.
    shap_stats = _persist_real_shap(rows)

    return IngestSyncResponse(
        scored=len(rows),
        upserted=upserted,
        skipped_existing=skipped_existing,
    )


def _persist_real_shap(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Run real SHAP on the top-N most anomalous rows and persist it durably.

    Returns a stats dict. Never raises: SHAP is an enrichment, and a failure
    here must not fail the sync that already persisted the composite records.
    The stats are logged so the outcome is observable rather than silent.
    """
    stats: dict[str, Any] = {
        "attempted": 0, "explained": 0, "persisted": 0,
        "status": "skipped", "elapsed_s": 0.0,
    }
    if not rows:
        stats["status"] = "no_rows"
        return stats

    error = shap_service.availability_error()
    if error is not None:
        logger.warning("Real SHAP unavailable, skipping attribution: %s", error)
        stats["status"] = "unavailable"
        stats["error"] = str(error)
        return stats

    # Rank by recorded anomaly, falling back to the scored value when the row
    # has not been through the anomaly pass yet.
    def _anomaly(row: dict[str, Any]) -> float:
        for key in ("anomaly_score",):
            raw = row.get(key)
            try:
                value = float(raw)
            except (TypeError, ValueError):
                continue
            if value == value:  # not NaN
                return value
        return 0.0

    ranked = sorted(rows, key=_anomaly, reverse=True)[:SHAP_TOP_N]
    stats["attempted"] = len(ranked)

    t0 = time.perf_counter()
    try:
        background = shap_service.build_background(rows, size=shap_service.DEFAULT_BACKGROUND_SIZE)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not build SHAP background: %s", exc)
        stats["status"] = "unavailable"
        stats["error"] = f"background: {type(exc).__name__}: {exc}"
        return stats

    for row in ranked:
        if time.perf_counter() - t0 > SHAP_TIME_BUDGET_S:
            logger.warning(
                "SHAP time budget of %.0fs exhausted after %d/%d transactions — "
                "remaining rows are left without attribution and will report an "
                "explicit unavailable state.",
                SHAP_TIME_BUDGET_S, stats["explained"], stats["attempted"],
            )
            stats["status"] = "budget_exhausted"
            break
        txid = str(row.get("txid") or "")
        if not txid:
            continue
        try:
            explanation, attention = shap_service.explain_row_with_attention(
                row,
                background=background,
                max_evals=SHAP_MAX_EVALS,
            )
        except Exception as exc:  # noqa: BLE001 - one row must not abort the rest
            logger.warning("SHAP failed for txid %s: %s: %s", txid[:12], type(exc).__name__, exc)
            continue

        xai_store.upsert_shap(txid, explanation.to_store_records())
        xai_store.upsert_attention(txid, attention)
        stats["explained"] += 1
        stats["persisted"] += 1

    if stats["status"] == "skipped":
        stats["status"] = "ok" if stats["explained"] else "unavailable"
    stats["elapsed_s"] = round(time.perf_counter() - t0, 2)
    stats["max_evals"] = SHAP_MAX_EVALS
    logger.info("Real SHAP sync: %s", stats)
    return stats


@router.get(
    "/enrichment/{task_id}",
    summary="Poll the post-ingest enrichment chain for an ingest task",
)
async def get_enrichment_status(
    task_id: str = Path(..., pattern=r"^[0-9a-fA-F-]{36}$"),
) -> dict[str, Any]:
    """Report the state of the enrichment chain dispatched by an ingest task.

    Enrichment runs as a separate Celery task so the upload path never blocks.
    This endpoint resolves the ingest task's own result to find the enrichment
    task id, then reports that task's state plus the per-stage result.

    Returns 404 when the ingest task is unknown, and reports
    ``status="not_dispatched"`` when the ingest produced no rows to enrich or
    skipped enrichment because the graph write failed.
    """
    result: AsyncResult = AsyncResult(task_id, app=celery_app)
    task_data = result.result if isinstance(result.result, dict) else {}

    enrichment = task_data.get("enrichment") or {}
    if not enrichment:
        return {
            "ingest_task_id": task_id,
            "status": "not_dispatched",
            "detail": "This ingest has no enrichment chain recorded "
                      "(no rows inserted, or the task has not finished).",
        }

    if enrichment.get("status") != "dispatched":
        return {
            "ingest_task_id": task_id,
            "status": enrichment.get("status", "unknown"),
            "reason": enrichment.get("reason"),
            "error": enrichment.get("error"),
        }

    enrich_task_id = enrichment["task_id"]
    enrich_result: AsyncResult = AsyncResult(enrich_task_id, app=celery_app)
    state = enrich_result.state

    payload: dict[str, Any] = {
        "ingest_task_id": task_id,
        "task_id": enrich_task_id,
        "status": state,
    }
    if state == "PROGRESS":
        payload["progress"] = enrich_result.info
    elif state == "SUCCESS":
        payload["result"] = enrich_result.result
    elif state == "FAILURE":
        payload["error"] = str(enrich_result.result)

    return payload
