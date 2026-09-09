"""Ingest router: POST /ingest and GET /ingest/status/{task_id}.

POST /ingest:
  - Accepts a multipart file upload (CSV, JSON, or XML).
  - Detects format from the first 512 bytes of content (not from extension).
  - Streams the upload to data/uploads/<uuid> on disk.
  - Enqueues the process_ingest_file Celery task.
  - Returns HTTP 202 immediately with task_id.

GET /ingest/status/{task_id}:
  - Returns Celery AsyncResult state plus progress/result/error payload.
"""

import hashlib
import logging
import uuid
from pathlib import Path

import redis
from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.celery_app import celery_app
from app.config import settings
from app.schemas.ingest import IngestResponse, TaskStatusResponse
from app.services.parser import detect_format

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingest"])

# Ensure upload directory exists at import time.
_UPLOAD_DIR = Path(settings.upload_dir)
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Maximum upload size guard (500 MB).
_MAX_UPLOAD_BYTES = 500 * 1024 * 1024

# File extensions used for the temp file (cosmetic only; format is detected
# from content, not from this extension).
_FORMAT_EXT: dict[str, str] = {"csv": ".csv", "json": ".json", "xml": ".xml"}

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
    GET /ingest/status/{task_id} for progress.
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

    task = process_ingest_file.delay(str(temp_path), detected_fmt)

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
        return TaskStatusResponse(
            task_id=task_id,
            status="FAILURE",
            error=error_msg,
        )

    # Covers REVOKED and any other states.
    return TaskStatusResponse(task_id=task_id, status=state)
