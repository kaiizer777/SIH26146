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
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable

import psycopg2
from psycopg2.extras import execute_values
from pydantic import ValidationError

from app.celery_app import celery_app
from app.config import settings
from app.schemas.ingest import TransactionRecord
from app.services import graph_writer
from app.services.bulk_insert import bulk_copy_insert
from app.services.enrichment import get_enricher
from app.services.graph_service import GraphService
from app.services.parser import detect_format, get_parser

logger = logging.getLogger(__name__)

# Maximum number of rejected-row samples kept in the task result
# (avoids bloating Redis with huge error payloads).
_MAX_REJECTED_SAMPLE = 50

# PostgreSQL SQLSTATE for unique_violation. A COPY that trips this on
# ``uq_transactions_txid`` means the batch contained at least one already-stored
# txid, which is the re-ingest case, not a data error.
_PG_UNIQUE_VIOLATION = "23505"

# Columns written by the fallback INSERT, in table order. Must match
# ``_COPY_COLUMNS`` in app/services/bulk_insert.py.
_INSERT_COLUMNS: tuple[str, ...] = (
    "ts",
    "src_ip",
    "dst_ip",
    "src_port",
    "dst_port",
    "txid",
    "input_addresses",
    "output_addresses",
    "input_amounts",
    "output_amounts",
    "fee",
    "script_type",
    "geo_country",
    "asn",
)

# ``ON CONFLICT (txid) DO NOTHING`` is what makes the fallback partial-success
# safe: the statement commits every non-colliding row of the batch in one
# transaction and silently skips only the txids already present.
_CONFLICT_INSERT_SQL = (
    "INSERT INTO transactions ({cols}) VALUES %s ON CONFLICT (txid) DO NOTHING"
).format(cols=", ".join(_INSERT_COLUMNS))

# execute_values value template. The ``::numeric[]`` / ``::numeric`` casts are
# required because the row dicts carry amounts as strings (they are serialised
# verbatim by COPY), and psycopg2 would otherwise adapt them to text arrays.
_CONFLICT_INSERT_TEMPLATE = (
    "(%s, %s, %s, %s, %s, %s, %s, %s, %s::numeric[], %s::numeric[], %s::numeric, %s, %s, %s)"
)

# Txids per Neo4j ``IN $ids`` lookup during the post-run parity check. Keeps the
# parameter list far below the driver's in-list ceiling for a 500 MB upload.
_PARITY_CHUNK = 5_000


class IngestDataLossError(RuntimeError):
    """Raised when an ingest received rows but durably stored none of them.

    Carries the full summary so the API caller can see exactly what happened
    instead of receiving a SUCCESS that silently discarded the whole file.

    The summary is passed as the second positional argument because Celery's
    JSON result backend reconstructs a failed task's exception by re-instantiating
    its class with ``args``. A one-argument exception would come back as a bare
    ``Exception`` and the router could not recover the counts.
    """

    def __init__(self, message: str, summary: dict[str, Any] | None = None) -> None:
        super().__init__(message, summary)
        self.message = message
        self.summary: dict[str, Any] | None = summary

    def __str__(self) -> str:
        return self.message


@dataclass
class InsertOutcome:
    """Result of one batch insert attempt, after conflict recovery.

    ``inserted`` and ``duplicates`` partition the batch when the write
    succeeded (``inserted + duplicates == len(batch)``). ``error`` is non-None
    only when the batch could not be written at all, in which case
    ``inserted == 0`` and ``rejected`` carries the batch size.
    """

    inserted: int = 0
    duplicates: int = 0
    duplicate_txids: list[str] = field(default_factory=list)
    rejected: int = 0
    error: str | None = None
    used_fallback: bool = False
    rolled_back: bool = False
    """True when this function already rolled the transaction back, so the
    caller must not issue a second (no-op, and potentially error-logging)
    rollback."""


# ---------------------------------------------------------------------------
# Neo4j graph write helpers
# ---------------------------------------------------------------------------

# Counter keys merged into the ``graph`` block of the task summary. Mirrors
# GraphWriteSummary's numeric fields; skip_reasons is a separate nested dict.
_GRAPH_COUNTER_KEYS: tuple[str, ...] = (
    "rows_received",
    "rows_written",
    "rows_rejected",
    "transactions_submitted",
    "wallets_submitted",
    "ips_submitted",
    "transactions_created",
    "wallets_created",
    "ips_created",
    "sends_created",
    "receives_created",
    "observed_created",
    "cospend_created",
    "cypher_batches",
)


def _new_graph_totals() -> dict[str, Any]:
    """Return a zeroed accumulator for the Neo4j write stage."""
    totals: dict[str, Any] = {key: 0 for key in _GRAPH_COUNTER_KEYS}
    totals["wall_seconds"] = 0.0
    totals["skip_reasons"] = {}
    totals["status"] = "pending"
    return totals


def _merge_graph_summary(totals: dict[str, Any], summary: Any) -> None:
    """Accumulate one GraphWriteSummary into ``totals`` in place."""
    data = summary.as_dict()
    for key in _GRAPH_COUNTER_KEYS:
        totals[key] = totals.get(key, 0) + int(data.get(key, 0) or 0)
    totals["wall_seconds"] = round(
        float(totals.get("wall_seconds", 0.0)) + float(data.get("wall_seconds", 0.0) or 0.0), 3
    )
    reasons = data.get("skip_reasons") or {}
    for reason, count in reasons.items():
        totals["skip_reasons"][reason] = totals["skip_reasons"].get(reason, 0) + int(count)


def _flush_batch_to_graph(
    conn: Any,
    batch: list[dict[str, Any]],
    totals: dict[str, Any],
    state: dict[str, Any],
) -> None:
    """Write the committed subset of one batch to Neo4j, updating ``totals``.

    Only rows whose txid is actually present in PostgreSQL after the commit are
    sent to the graph. A COPY can commit a strict subset of a batch (a single
    duplicate-key violation rejects just that row), and mirroring the batch
    wholesale would create ``:Transaction`` nodes with no PostgreSQL row —
    which is exactly the store divergence the parity work is meant to remove.

    Never raises. A graph failure is logged at ERROR, marks the stage failed on
    the summary, and must never discard already-committed PostgreSQL rows.

    Args:
        conn: The open, committed psycopg2 connection (used to confirm txids).
        batch: Enriched row dicts, exactly as handed to ``insert_fn``.
        totals: Accumulator mutated in place (see :func:`_new_graph_totals`).
        state: Mutable per-run state carrying the lazily opened GraphService.
    """
    if not batch:
        return

    if state.get("failed"):
        # A prior batch already failed. One attempt per run is enough to prove
        # the graph is unreachable; stop hammering it and keep ingesting to PG.
        return

    txids = [str(r["txid"]) for r in batch if r.get("txid")]
    if not txids:
        return

    # Read back which of these txids are durable in PostgreSQL right now.
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT txid FROM transactions WHERE txid = ANY(%s)", (txids,)
            )
            committed = {row[0] for row in cur.fetchall()}
    except Exception as exc:  # noqa: BLE001 - must not abort ingest
        logger.error(
            "Could not confirm committed txids for the graph write: %s: %s — "
            "skipping this batch's graph write to avoid creating orphan nodes.",
            type(exc).__name__, exc,
        )
        return

    if not committed:
        return

    committed_set = set(committed)
    rows_to_write = [r for r in batch if str(r.get("txid")) in committed_set]
    skipped = len(batch) - len(rows_to_write)

    service = state.get("service")
    try:
        if service is None:
            service = GraphService()
            service.connect()
            state["service"] = service
            graph_writer.ensure_graph_schema(service)
            logger.info("Neo4j schema constraints verified before ingest write")

        summary = graph_writer.write_transactions_to_graph(
            rows_to_write,
            service=service,
            database=settings.neo4j_database,
        )
        _merge_graph_summary(totals, summary)
        totals["status"] = "ok"
        totals["batches_written"] = int(totals.get("batches_written", 0)) + 1
        if skipped:
            # Not an error: these rows were rejected by PostgreSQL, so they
            # belong only in the rejection count, not in the graph.
            totals["rows_not_committed"] = int(totals.get("rows_not_committed", 0)) + skipped
    except Exception as exc:  # noqa: BLE001 - graph failure must not abort ingest
        totals["status"] = "failed"
        state["failed"] = True
        totals["error"] = f"{type(exc).__name__}: {exc}"
        logger.error(
            "Neo4j graph write FAILED for a batch of %d rows: %s: %s — "
            "PostgreSQL rows are unaffected and will still be committed. "
            "Enrichment stage will be skipped for this ingest.",
            len(rows_to_write), type(exc).__name__, exc,
            exc_info=True,
        )


@dataclass
class _PipelineCounters:
    """Mutable tally for one ingest run, shared by every batch flush.

    ``received == inserted + rejected`` holds by construction: a duplicate txid
    was received and was not inserted, so it is counted in ``rejected`` and
    additionally broken out in ``duplicates`` so the caller can tell a re-upload
    apart from a file of malformed rows.
    """

    received: int = 0
    inserted: int = 0
    rejected: int = 0
    duplicates: int = 0
    inserted_txids: list[str] = field(default_factory=list)
    rejected_rows: list[dict[str, Any]] = field(default_factory=list)
    insert_errors: list[str] = field(default_factory=list)

    def add_validation_rejection(self, detail: dict[str, Any]) -> None:
        self.rejected += 1
        if len(self.rejected_rows) < _MAX_REJECTED_SAMPLE:
            self.rejected_rows.append(detail)

    def add_duplicate_rejections(
        self, txids: list[str], row_index: int, cap: int = 5
    ) -> None:
        """Record already-stored txids so a total no-op upload is visible."""
        self.rejected += len(txids)
        self.duplicates += len(txids)
        for txid in txids[:cap]:
            if len(self.rejected_rows) < _MAX_REJECTED_SAMPLE:
                self.rejected_rows.append({
                    "row": row_index,
                    "txid": txid,
                    "errors": [{
                        "type": "duplicate_txid",
                        "msg": (
                            "txid already present in PostgreSQL; row skipped "
                            "(ON CONFLICT DO NOTHING)"
                        ),
                        "loc": ["txid"],
                    }],
                })


def _commit_batch(
    conn: Any,
    batch: list[dict[str, Any]],
    insert_fn: Callable[[Any, list[dict[str, Any]]], int],
    counters: _PipelineCounters,
    *,
    last_row_index: int,
    graph_totals: dict[str, Any],
    graph_state: dict[str, Any],
) -> None:
    """Insert one batch, commit, mirror to Neo4j, and update ``counters``.

    Never raises: every failure mode is folded into ``counters`` and the
    ``graph`` summary so a partial or total loss can never be reported as a
    clean success.
    """
    outcome = _insert_batch_with_conflict_recovery(conn, batch, insert_fn)

    if outcome.error is not None:
        if not outcome.rolled_back:
            try:
                conn.rollback()
            except Exception as rollback_exc:  # noqa: BLE001
                logger.error(
                    "Rollback after a failed insert also failed: %s", rollback_exc
                )
        counters.rejected += outcome.rejected
        message = f"batch ending at row {last_row_index}: {outcome.error}"
        if len(counters.insert_errors) < _MAX_REJECTED_SAMPLE:
            counters.insert_errors.append(message)
        if len(counters.rejected_rows) < _MAX_REJECTED_SAMPLE:
            counters.rejected_rows.append({
                "row": last_row_index,
                "txid": str(batch[0].get("txid", "<unknown>")) if batch else "<unknown>",
                "errors": [{
                    "type": "batch_insert_failed",
                    "msg": outcome.error,
                }],
            })
        return

    conn.commit()
    counters.inserted += outcome.inserted
    if outcome.duplicate_txids:
        counters.add_duplicate_rejections(outcome.duplicate_txids, last_row_index)

    duplicate_set = set(outcome.duplicate_txids)
    counters.inserted_txids.extend(
        r["txid"] for r in batch if "txid" in r and r["txid"] not in duplicate_set
    )

    # Only mirror to the graph what PostgreSQL actually committed. The committed
    # txids are read back rather than assumed from the batch, because a
    # conflict-tolerant INSERT commits a SUBSET of the batch. Mirroring the
    # whole batch would leave :Transaction nodes in Neo4j with no PostgreSQL row.
    _flush_batch_to_graph(conn, batch, graph_totals, graph_state)


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


def _is_unique_violation(exc: psycopg2.Error) -> bool:
    """True when *exc* is a PostgreSQL unique-constraint violation.

    Checked two ways on purpose. A driver-raised error always carries
    ``pgcode == '23505'``, but an error reconstructed by a test double (or a
    wrapped/re-raised one) may not, even though it is the driver's own
    :class:`psycopg2.errors.UniqueViolation` class. Relying on ``pgcode`` alone
    would silently downgrade the conflict path back to "discard the batch".
    """
    if getattr(exc, "pgcode", None) == _PG_UNIQUE_VIOLATION:
        return True
    return isinstance(exc, psycopg2.errors.UniqueViolation)


def _decimal_or_none(value: Any) -> Decimal | None:
    """Coerce an amount to Decimal, or None when it cannot be parsed.

    Raises:
        ValueError: when the value is present but not a valid decimal. A
            malformed amount is a data error and must not be silently stored as
            NULL, so the caller lets the INSERT fail loudly instead.
    """
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"not a valid decimal amount: {value!r}") from exc


def _fallback_row_values(row: dict[str, Any]) -> tuple:
    """Build the typed parameter tuple for the conflict-tolerant INSERT.

    COPY writes every column as raw CSV text. The fallback INSERT goes through
    psycopg2's adapter instead, so the numeric columns have to be handed over
    as real ``Decimal`` values or they would be adapted as text and rejected by
    the ``numeric[]`` / ``numeric`` column types.
    """
    return (
        row.get("ts"),
        row.get("src_ip"),
        row.get("dst_ip"),
        row.get("src_port"),
        row.get("dst_port"),
        row.get("txid"),
        [str(a) for a in (row.get("input_addresses") or [])],
        [str(a) for a in (row.get("output_addresses") or [])],
        [Decimal(str(a)) for a in (row.get("input_amounts") or [])],
        [Decimal(str(a)) for a in (row.get("output_amounts") or [])],
        _decimal_or_none(row.get("fee")),
        row.get("script_type"),
        row.get("geo_country"),
        row.get("asn"),
    )


def _insert_batch_with_conflict_recovery(
    conn: Any,
    batch: list[dict[str, Any]],
    insert_fn: Callable[[Any, list[dict[str, Any]]], int],
) -> InsertOutcome:
    """Insert one batch, recovering from duplicate txids instead of losing it.

    ``COPY ... FROM STDIN`` is all-or-nothing: a single txid that already
    exists aborts the whole statement and discards every other row in the
    batch. Re-uploading a dataset therefore used to drop thousands of rows and
    still report SUCCESS.

    On a unique-constraint failure this retries the batch as a single
    ``INSERT ... ON CONFLICT (txid) DO NOTHING`` statement, which commits every
    non-colliding row and skips only the txids already stored. The exact
    duplicate set is read back from PostgreSQL so the caller can report it.

    Any other database error is still a whole-batch failure, but it is reported
    explicitly through ``InsertOutcome.error`` instead of being dropped.

    Args:
        conn: Open psycopg2 connection. The caller owns commit/rollback.
        batch: Enriched row dicts.
        insert_fn: The bulk insert callable (injectable for tests).

    Returns:
        An :class:`InsertOutcome`. On success the caller must ``conn.commit()``.
    """
    if not batch:
        return InsertOutcome()

    try:
        inserted = insert_fn(conn, batch)
        return InsertOutcome(inserted=int(inserted), used_fallback=False)
    except psycopg2.Error as exc:
        try:
            conn.rollback()
        except Exception as rollback_exc:  # noqa: BLE001
            logger.error(
                "Rollback after COPY failure itself failed (%s); the connection "
                "may be unusable for the fallback insert.",
                type(rollback_exc).__name__,
            )
            return InsertOutcome(
                rejected=len(batch),
                error=f"COPY failed ({_describe_pg_error(exc)}) and rollback failed: "
                      f"{type(rollback_exc).__name__}: {rollback_exc}",
                rolled_back=True,
            )

        if not _is_unique_violation(exc):
            return InsertOutcome(
                rejected=len(batch),
                error=_describe_pg_error(exc),
                rolled_back=True,
            )

        logger.warning(
            "COPY rejected a batch of %d rows on a unique-constraint conflict "
            "(%s). Retrying with ON CONFLICT DO NOTHING so the non-colliding "
            "rows are preserved.",
            len(batch), _describe_pg_error(exc),
        )

    # --- Conflict-tolerant retry -------------------------------------------------
    txids = [str(r.get("txid")) for r in batch if r.get("txid")]

    # Snapshot which txids already exist BEFORE re-inserting. This has to happen
    # first: querying afterwards would return the rows this statement is about to
    # insert, and every new row would be misreported as a duplicate.
    preexisting: set[str] = set()
    if txids:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT txid FROM transactions WHERE txid = ANY(%s)", (txids,)
                )
                preexisting = {row[0] for row in cur.fetchall()}
        except Exception as exc:  # noqa: BLE001 - counts still come from rowcount
            logger.warning(
                "Could not snapshot pre-existing txids (%s: %s); duplicate "
                "counting falls back to the rowcount delta.",
                type(exc).__name__, exc,
            )

    try:
        with conn.cursor() as cur:
            execute_values(
                cur,
                _CONFLICT_INSERT_SQL,
                [_fallback_row_values(row) for row in batch],
                template=_CONFLICT_INSERT_TEMPLATE,
                page_size=len(batch),
            )
            inserted = cur.rowcount
    except Exception as exc:  # noqa: BLE001 - surfaced, never swallowed
        try:
            conn.rollback()
        except Exception:
            pass
        logger.error(
            "Conflict-tolerant INSERT failed for a batch of %d rows: %s: %s",
            len(batch), type(exc).__name__, exc,
        )
        return InsertOutcome(
            rejected=len(batch),
            error=f"conflict-tolerant INSERT failed: {type(exc).__name__}: {exc}",
            used_fallback=True,
            rolled_back=True,
        )

    inserted = max(0, min(int(inserted or 0), len(batch)))
    duplicate_txids = [t for t in txids if t in preexisting] if preexisting else []
    if not duplicate_txids:
        # The pre-insert snapshot was unavailable or empty. The rowcount delta is
        # still exact, so fall back to that for the count and leave the named
        # sample empty rather than inventing txids.
        duplicates = len(batch) - inserted
    else:
        duplicates = len(duplicate_txids)

    logger.info(
        "Conflict-tolerant INSERT committed %d/%d rows; %d already existed.",
        inserted, len(batch), duplicates,
    )
    return InsertOutcome(
        inserted=inserted,
        duplicates=duplicates,
        duplicate_txids=duplicate_txids,
        used_fallback=True,
    )


def _verify_graph_parity(
    svc: Any, txids: list[str], graph_totals: dict[str, Any]
) -> dict[str, Any]:
    """Confirm every txid this run committed is also a ``:Transaction`` node.

    The per-batch graph write can legitimately fall behind PostgreSQL (a failed
    batch is marked ``status: failed`` and latched). Nothing else in the pipeline
    notices a row that PostgreSQL has but the graph does not, so a divergence
    like that is invisible after the run. This check turns it into a reported
    number.

    Never raises: a failed check is recorded, not propagated.

    Args:
        svc: An open Neo4j GraphService.
        txids: The txids this run actually inserted.
        graph_totals: The run's ``graph`` summary, mutated in place.

    Returns:
        ``{"checked": int, "missing": int, "missing_txid_sample": [...]}``,
        also stored under ``graph_totals["parity"]``.
    """
    result: dict[str, Any] = {"checked": 0, "missing": 0, "missing_txid_sample": []}
    if not txids or graph_totals.get("status") == "failed":
        graph_totals["parity"] = result
        return result

    unique = list(dict.fromkeys(txids))
    try:
        # Chunked so the parameter list stays well inside Neo4j's in-list limit.
        present: set[str] = set()
        for i in range(0, len(unique), _PARITY_CHUNK):
            chunk = unique[i : i + _PARITY_CHUNK]
            with svc.driver.session(database=settings.neo4j_database) as s:
                rec = s.run(
                    "MATCH (t:Transaction) WHERE t.txid IN $ids "
                    "RETURN collect(t.txid) AS ids",
                    ids=chunk,
                ).single()
            if rec and rec["ids"]:
                present.update(rec["ids"])
        missing = [t for t in unique if t not in present]
        result = {
            "checked": len(unique),
            "missing": len(missing),
            "missing_txid_sample": missing[:5],
        }
        if missing:
            logger.error(
                "Graph parity gap: %d of %d transactions committed by this run "
                "have no :Transaction node. Sample: %s",
                len(missing), len(unique), ", ".join(m[:16] for m in missing[:5]),
            )
    except Exception as exc:  # noqa: BLE001 - never fail ingest over a check
        logger.error(
            "Graph parity check could not run (%s: %s) — parity is UNVERIFIED "
            "for this ingest and the graph may be behind PostgreSQL.",
            type(exc).__name__, exc,
        )
        result = {
            "checked": len(unique),
            "missing": -1,
            "missing_txid_sample": [],
            "error": f"{type(exc).__name__}: {exc}",
        }

    graph_totals["parity"] = result
    return result


def _describe_pg_error(exc: psycopg2.Error) -> str:
    """Render a psycopg2 error as a single-line, log-safe string."""
    message = str(exc).strip().splitlines()
    head = message[0] if message else exc.__class__.__name__
    detail = getattr(exc, "diag", None)
    constraint = getattr(detail, "constraint_name", None) if detail else None
    if constraint:
        return f"{type(exc).__name__} {head} (constraint={constraint})"
    return f"{type(exc).__name__} {head}"


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
        Summary dict: {status, total_received, total_inserted, total_rejected,
                       total_duplicates, rejected_sample (up to 50 entries),
                       insert_errors, txids, graph}. ``status`` is one of
                       ``empty`` | ``ok`` | ``partial`` | ``no_rows_inserted``.

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

    counters = _PipelineCounters()
    # Accumulated Neo4j write counters, merged across per-batch graph writes.
    graph_totals = _new_graph_totals()
    # Per-run graph state: lazily-opened service + one-shot failure latch.
    graph_state: dict[str, Any] = {"service": None, "failed": False}

    conn = None
    try:
        conn = db_conn_factory()
        conn.autocommit = False

        batch: list[dict[str, Any]] = []

        for row_index, raw_row in enumerate(parser(file_path)):
            counters.received += 1

            # --- Validate ---
            try:
                record = TransactionRecord.model_validate(raw_row)
            except ValidationError as exc:
                counters.add_validation_rejection({
                    "row": row_index + 1,
                    "txid": raw_row.get("txid", "<unknown>"),
                    "errors": exc.errors(include_url=False),
                })
                logger.debug(
                    "Row %d rejected: %s", row_index + 1, counters.rejected_rows[-1]["errors"]
                )
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
                _commit_batch(
                    conn, batch, insert_fn, counters,
                    last_row_index=row_index + 1,
                    graph_totals=graph_totals, graph_state=graph_state,
                )
                batch.clear()

                if progress_callback is not None:
                    progress_callback({
                        "processed": counters.received,
                        "inserted": counters.inserted,
                        "rejected": counters.rejected,
                        "duplicates": counters.duplicates,
                    })

        # --- Flush remainder ---
        if batch:
            _commit_batch(
                conn, batch, insert_fn, counters,
                last_row_index=counters.received,
                graph_totals=graph_totals, graph_state=graph_state,
            )

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
        graph_service_obj = graph_state.get("service")
        if graph_service_obj is not None:
            try:
                graph_service_obj.close()
            except Exception as close_exc:
                logger.warning("Failed to close Neo4j GraphService: %s", close_exc)

    if graph_totals["status"] == "pending":
        graph_totals["status"] = "skipped" if counters.received == 0 else "ok"

    # Confirm the graph actually holds everything this run committed, so a
    # PG/Neo4j divergence is a reported number rather than a silent one. The key
    # is always present so API consumers can rely on its shape.
    graph_totals.setdefault(
        "parity",
        {"checked": 0, "missing": 0, "missing_txid_sample": [], "skipped": True},
    )
    if counters.inserted > 0 and graph_totals["status"] != "failed":
        with GraphService() as parity_svc:
            _verify_graph_parity(parity_svc, counters.inserted_txids, graph_totals)

    # An explicit verdict on the run, so neither the Celery result backend nor
    # an API caller has to infer success from a count.
    if counters.received == 0:
        run_status = "empty"
    elif counters.inserted > 0:
        run_status = "partial" if counters.rejected else "ok"
    else:
        run_status = "no_rows_inserted"

    summary = {
        "status": run_status,
        "total_received": counters.received,
        "total_inserted": counters.inserted,
        "total_rejected": counters.rejected,
        "total_duplicates": counters.duplicates,
        "rejected_sample": counters.rejected_rows,
        "insert_errors": counters.insert_errors,
        "txids": counters.inserted_txids,
        "graph": graph_totals,
    }
    logger.info(
        "Ingest pipeline complete: status=%s received=%d inserted=%d rejected=%d "
        "(duplicates=%d) | graph status=%s wallets_created=%d cospend_created=%d",
        run_status, counters.received, counters.inserted, counters.rejected,
        counters.duplicates,
        graph_totals["status"],
        graph_totals.get("wallets_created", 0),
        graph_totals.get("cospend_created", 0),
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
        summary = run_ingest_pipeline(file_path, fmt, progress_callback=_progress)
    except Exception as exc:
        logger.exception("Ingest task failed: file=%s error=%s", file_path, exc)
        raise
    finally:
        # Clean up temp file regardless of outcome. Runs before enrichment is
        # dispatched, since enrichment reads from the databases, not the file.
        try:
            Path(file_path).unlink(missing_ok=True)
            logger.info("Deleted temp file: %s", file_path)
        except Exception as exc:
            logger.warning("Could not delete temp file %s: %s", file_path, exc)

    # A run that stored nothing is a data loss, not a success. Celery records
    # FAILURE and the API surfaces the summary through the exception, so the
    # caller sees why instead of an empty SUCCESS.
    if summary["status"] == "no_rows_inserted":
        raise IngestDataLossError(
            f"Ingest stored 0 of {summary['total_received']} received rows "
            f"({summary['total_duplicates']} duplicate txid(s), "
            f"{summary['total_rejected'] - summary['total_duplicates']} invalid). "
            f"First errors: {summary['insert_errors'][:3] or 'see rejected_sample'}",
            summary,
        )

    # --- Chain post-ingest enrichment ---
    # Dispatched separately (NOT inline) so the upload path returns as soon as
    # the rows are durable. Enrichment is a Celery task with its own progress
    # state that the client can poll via the returned task id.
    enrich_task_id: str | None = None
    if summary.get("total_inserted", 0) > 0:
        if summary.get("graph", {}).get("status") == "failed":
            logger.error(
                "Skipping enrichment chain for this ingest: the Neo4j graph write "
                "failed (%s). Clustering and detection would produce meaningless "
                "results on a partial graph.",
                summary["graph"].get("error"),
            )
            summary["enrichment"] = {
                "status": "skipped",
                "reason": "graph_write_failed",
                "error": summary["graph"].get("error"),
            }
        else:
            from app.tasks.enrich import enrich_ingested_transactions

            try:
                async_result = enrich_ingested_transactions.delay(summary.get("txids", []))
                enrich_task_id = async_result.id
                summary["enrichment"] = {
                    "status": "dispatched",
                    "task_id": enrich_task_id,
                }
                logger.info(
                    "Dispatched post-ingest enrichment task %s for %d txids",
                    enrich_task_id, len(summary.get("txids", [])),
                )
            except Exception as exc:  # noqa: BLE001 - ingest itself already succeeded
                logger.exception("Failed to dispatch enrichment task: %s", exc)
                summary["enrichment"] = {
                    "status": "dispatch_failed",
                    "error": f"{type(exc).__name__}: {exc}",
                }
    else:
        summary["enrichment"] = {"status": "skipped", "reason": "no_rows_inserted"}

    return summary
