"""High-throughput PostgreSQL bulk insert via COPY FROM STDIN.

Uses psycopg2's copy_expert() with a CSV-format COPY statement and an
io.StringIO buffer. This is strictly faster than row-by-row INSERTs and
avoids ORM overhead entirely.

Column ordering in COPY matches the PostgreSQL table definition:
  ts, src_ip, dst_ip, src_port, dst_port, txid,
  input_addresses, output_addresses, input_amounts, output_amounts,
  fee, script_type, geo_country, asn

Server-generated columns (id, ingested_at, cluster_id, anomaly_score,
risk_score, is_flagged, raw_json) are omitted — defaults handle them.
"""

import io
import logging
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# COPY target columns (order MUST match _format_row output)
# ---------------------------------------------------------------------------

_COPY_COLUMNS = (
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

_COPY_SQL = (
    "COPY transactions ({cols}) FROM STDIN "
    "WITH (FORMAT csv, NULL '\\N', QUOTE '\"', ESCAPE '\"')"
).format(cols=", ".join(_COPY_COLUMNS))

# Sentinel for NULL values in COPY CSV format.
_NULL = "\\N"


# ---------------------------------------------------------------------------
# Row serialisation
# ---------------------------------------------------------------------------


def _escape_csv_field(value: str) -> str:
    """Escape a string field for CSV COPY: wrap in quotes if it contains
    a comma, newline, or double-quote; escape internal double-quotes."""
    if any(c in value for c in (',', '\n', '\r', '"')):
        return '"' + value.replace('"', '""') + '"'
    return value


def _format_pg_array(items: list) -> str:
    """Serialise a Python list to a PostgreSQL array literal.

    e.g. ['bc1q...', 'bc1p...']  →  '{bc1q...,bc1p...}'
    Numeric values are written without quoting; string values without
    special chars don't need quoting in PostgreSQL array literals.
    """
    if not items:
        return "{}"
    inner = ",".join(str(item) for item in items)
    return "{" + inner + "}"


def _format_row(row: dict[str, Any]) -> str:
    """Convert a validated+enriched row dict to a COPY CSV line (no newline).

    None values → PostgreSQL NULL sentinel (\\N).
    Arrays → PostgreSQL array literal wrapped in double-quotes for CSV safety.
    """
    fields: list[str] = []

    def _add(value: Any) -> None:
        if value is None:
            fields.append(_NULL)
        elif isinstance(value, list):
            # Wrap the array literal in CSV double-quotes.
            fields.append('"' + _format_pg_array(value).replace('"', '""') + '"')
        else:
            s = str(value)
            fields.append(_escape_csv_field(s))

    _add(row.get("ts"))
    _add(row.get("src_ip"))
    _add(row.get("dst_ip"))
    _add(row.get("src_port"))
    _add(row.get("dst_port"))
    _add(row.get("txid"))
    _add(row.get("input_addresses", []))
    _add(row.get("output_addresses", []))
    _add(row.get("input_amounts", []))
    _add(row.get("output_amounts", []))
    _add(row.get("fee"))
    _add(row.get("script_type"))
    _add(row.get("geo_country"))
    _add(row.get("asn"))

    return ",".join(fields)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------


def bulk_copy_insert(conn, rows: list[dict[str, Any]]) -> int:
    """Insert rows into transactions using PostgreSQL COPY FROM STDIN.

    Args:
        conn:  An open psycopg2 connection. The caller owns commit/rollback.
        rows:  List of validated+enriched row dicts.

    Returns:
        Number of rows successfully inserted.

    Raises:
        psycopg2.Error: on any database-level error. Caller should handle
                        rollback before re-raising or retrying.
    """
    if not rows:
        return 0

    buf = io.StringIO()
    for row in rows:
        buf.write(_format_row(row) + "\n")
    buf.seek(0)

    with conn.cursor() as cur:
        cur.copy_expert(_COPY_SQL, buf)

    inserted = len(rows)
    logger.debug("COPY inserted %d rows", inserted)
    return inserted
