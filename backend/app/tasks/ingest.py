"""Celery task: process_ingest_file.

Full pipeline for a single uploaded file:
  1. Parse (stream via format-appropriate parser).
  2. Validate each row with Pydantic TransactionRecord.
  3. GeoIP-enrich src_ip / dst_ip (GeoIP wins over CSV value; falls back
     to CSV value when IP not found in .mmdb).
  4. Bulk-insert valid rows via PostgreSQL COPY FROM STDIN in batches.
  5. Collect rejected rows (with row number + error) without aborting the batch.
  6. Report progress to Redis after each batch.
  7. Clean up temp file on completion or failure.
  8. Return a summary dict as the task result.

No row is dropped silently. No individual row failure aborts the batch.

Architecture note:
  The heavy lifting lives in ``run_ingest_pipeline()`` — a plain Python
  function that can be called directly in unit tests without touching any
  Celery broker or result backend. The ``process_ingest_file`` Celery task
  is a thin wrapper that calls it and updates Celery state.
"""

import logging
import os
from pathlib import Path
from typing import Any, Callable

import psycopg2
from pydantic import ValidationError

from app.celery_app import celery_app
from app.config import settings
from app.schemas.ingest import TransactionRecord
from app.services.bulk_insert import bulk_copy_insert
from app.services.enrichment import get_enricher
from app.services.parser import detect_format, get_parser

logger = logging.getLogger(__name__)

# Maximum number of rejected-row samples kept in the task result
# (avoids bloating Redis with huge error payloads).
_MAX_REJECTED_SAMPLE = 50


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_db_connection():
    """Open a psycopg2 connection from DATABASE_URL.

    Returns a raw psycopg2 connection (not SQLAlchemy) for COPY support.
    autocommit=False so we can commit per-batch.
    """
    return psycopg2.connect(settings.database_url)


def _enrich_row(record: TransactionRecord) -> dict[str, Any]:
    """Apply GeoIP enrichment and serialise the validated record to a dict.

    GeoIP wins over the CSV-supplied value when a non-None result is found.
    Falls back to the CSV-supplied value if GeoIP returns None.
    """
    enricher = get_enricher()
    geoip_country, geoip_asn = enricher.enrich(record.src_ip, record.dst_ip)

    return {
        "ts": record.ts,
        "src_ip": record.src_ip,
        "dst_ip": record.dst_ip,
        "src_port": record.src_port,
        "dst_port": record.dst_port,
        "txid": record.txid,
        "input_addresses": [str(a) for a in record.input_addresses],
        "output_addresses": [str(a) for a in record.output_addresses],
        "input_amounts": [str(a) for a in record.input_amounts],
        "output_amounts": [str(a) for a in record.output_amounts],
        "fee": str(record.fee),
        "script_type": record.script_type,
        # GeoIP wins; fall back to CSV-supplied value when GeoIP returns None.
        "geo_country": geoip_country if geoip_country is not None else record.geo_country,
        "asn": geoip_asn if geoip_asn is not None else record.asn,
    }


def _flush_batch(conn, batch: list[dict[str, Any]], last_row_index: int) -> int:
    """Insert a batch and commit. Returns number of rows inserted.

    On psycopg2 error: rolls back the batch and returns 0.
    Errors are logged at ERROR level — not silently swallowed.
    """
    try:
        inserted = bulk_copy_insert(conn, batch)
        conn.commit()
        return inserted
    except psycopg2.Error as exc:
        logger.error(
            "COPY failed for batch ending at row ~%d: %s", last_row_index + 1, exc
        )
        try:
            conn.rollback()
        except Exception:
            pass
        return 0


# ---------------------------------------------------------------------------
# Core pipeline (plain Python — directly testable, no Celery dependency)
# ---------------------------------------------------------------------------


def run_ingest_pipeline(
    file_path: str,
    fmt: str,
    progress_callback: Callable[[dict], None] | None = None,
    db_conn_factory: Callable = _get_db_connection,
    insert_fn: Callable = bulk_copy_insert,
) -> dict[str, Any]:
    """Execute the full ingest pipeline for one file.

    This function has NO dependency on Celery. It is called by the Celery
    task wrapper below, and can also be called directly in tests.

    Args:
        file_path:        Absolute path to the file on disk.
        fmt:              Pre-detected format: 'csv', 'json', or 'xml'.
        progress_callback: Optional callable(dict) invoked after each batch
                           flush with {processed, inserted, rejected} counts.
                           Used by the Celery task to update Redis state.
        db_conn_factory:  Callable returning a psycopg2 connection.
                          Injectable for testing.
        insert_fn:        Callable(conn, rows) -> int performing bulk insert.
                          Injectable for testing.

    Returns:
        Summary dict: {total_received, total_inserted, total_rejected,
                       rejected_sample (up to 50 entries)}.

    Raises:
        FileNotFoundError: if file_path does not exist.
        Any exception from the database layer propagates up after cleanup.
    """
    logger.info("Starting ingest pipeline: file=%s fmt=%s", file_path, fmt)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Upload file not found: {file_path}")

    # Re-confirm format from content bytes (defence against stale fmt arg).
    with open(file_path, "rb") as fh:
        header = fh.read(512)
    try:
        confirmed_fmt = detect_format(header)
    except ValueError:
        confirmed_fmt = fmt

    if confirmed_fmt != fmt:
        logger.warning(
            "Format mismatch: arg=%s sniffed=%s — using sniffed format", fmt, confirmed_fmt
        )
        fmt = confirmed_fmt

    parser = get_parser(fmt)
    batch_size: int = settings.ingest_batch_size

    total_received = 0
    total_inserted = 0
    total_rejected = 0
    rejected_rows: list[dict[str, Any]] = []

    conn = None
    try:
        conn = db_conn_factory()
        conn.autocommit = False

        batch: list[dict[str, Any]] = []

        for row_index, raw_row in enumerate(parser(file_path)):
            total_received += 1

            # --- Validate ---
            try:
                record = TransactionRecord.model_validate(raw_row)
            except ValidationError as exc:
                total_rejected += 1
                error_detail = {
                    "row": row_index + 1,
                    "txid": raw_row.get("txid", "<unknown>"),
                    "errors": exc.errors(include_url=False),
                }
                logger.debug("Row %d rejected: %s", row_index + 1, error_detail["errors"])
                if len(rejected_rows) < _MAX_REJECTED_SAMPLE:
                    rejected_rows.append(error_detail)
                continue  # Never abort the batch for a single invalid row.

            # --- Enrich ---
            try:
                enriched = _enrich_row(record)
            except Exception as exc:
                # GeoIP enrichment failure is non-fatal.
                logger.warning(
                    "Row %d enrichment failed (%s), inserting without GeoIP",
                    row_index + 1, exc,
                )
                enriched = {
                    "ts": record.ts,
                    "src_ip": record.src_ip,
                    "dst_ip": record.dst_ip,
                    "src_port": record.src_port,
                    "dst_port": record.dst_port,
                    "txid": record.txid,
                    "input_addresses": [str(a) for a in record.input_addresses],
                    "output_addresses": [str(a) for a in record.output_addresses],
                    "input_amounts": [str(a) for a in record.input_amounts],
                    "output_amounts": [str(a) for a in record.output_amounts],
                    "fee": str(record.fee),
                    "script_type": record.script_type,
                    "geo_country": record.geo_country,
                    "asn": record.asn,
                }

            batch.append(enriched)

            # --- Flush batch ---
            if len(batch) >= batch_size:
                try:
                    inserted = insert_fn(conn, batch)
                    conn.commit()
                    total_inserted += inserted
                except psycopg2.Error as db_exc:
                    logger.error(
                        "COPY failed for batch ending at row ~%d: %s",
                        row_index + 1, db_exc,
                    )
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                batch.clear()

                if progress_callback is not None:
                    progress_callback({
                        "processed": total_received,
                        "inserted": total_inserted,
                        "rejected": total_rejected,
                    })

        # --- Flush remainder ---
        if batch:
            try:
                inserted = insert_fn(conn, batch)
                conn.commit()
                total_inserted += inserted
            except psycopg2.Error as db_exc:
                logger.error("COPY failed for final batch: %s", db_exc)
                try:
                    conn.rollback()
                except Exception:
                    pass

    except Exception:
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    summary = {
        "total_received": total_received,
        "total_inserted": total_inserted,
        "total_rejected": total_rejected,
        "rejected_sample": rejected_rows,
    }
    logger.info(
        "Ingest pipeline complete: received=%d inserted=%d rejected=%d",
        total_received, total_inserted, total_rejected,
    )
    return summary


# ---------------------------------------------------------------------------
# Celery task wrapper (thin — delegates entirely to run_ingest_pipeline)
# ---------------------------------------------------------------------------


@celery_app.task(
    bind=True,
    name="app.tasks.ingest.process_ingest_file",
    max_retries=0,  # No auto-retry — ingest is idempotent by txid UNIQUE constraint.
    acks_late=True,  # Ack only after the task completes, not when it's received.
)
def process_ingest_file(self, file_path: str, fmt: str) -> dict[str, Any]:
    """Celery task wrapper around run_ingest_pipeline.

    Handles: update_state calls, temp file cleanup on any outcome.
    """
    self.update_state(state="STARTED", meta={"file": file_path, "format": fmt})

    def _progress(meta: dict) -> None:
        self.update_state(state="PROGRESS", meta=meta)

    try:
        return run_ingest_pipeline(file_path, fmt, progress_callback=_progress)
    except Exception as exc:
        logger.exception("Ingest task failed: file=%s error=%s", file_path, exc)
        raise
    finally:
        # Clean up temp file regardless of outcome.
        try:
            Path(file_path).unlink(missing_ok=True)
            logger.info("Deleted temp file: %s", file_path)
        except Exception as exc:
            logger.warning("Could not delete temp file %s: %s", file_path, exc)
