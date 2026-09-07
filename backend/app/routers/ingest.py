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

import logging
import uuid
from pathlib import Path

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

    # --- Stream to temp file ---
    ext = _FORMAT_EXT.get(detected_fmt, ".bin")
    temp_name = f"{uuid.uuid4().hex}{ext}"
    temp_path = _UPLOAD_DIR / temp_name

    try:
        total_bytes = len(header_chunk)
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
                fh.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        logger.exception("Failed to write upload to disk: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    logger.info(
        "Saved upload to %s (%.2f MB), enqueuing task", temp_path, total_bytes / 1024 / 1024
    )

    # --- Enqueue Celery task ---
    from app.tasks.ingest import process_ingest_file  # local import avoids circular at module load

    task = process_ingest_file.delay(str(temp_path), detected_fmt)

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
