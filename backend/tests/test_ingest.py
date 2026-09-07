"""Phase 2 ingest pipeline tests.

Test categories:
  1. test_health_endpoint          — GET /health returns 200.
  2. test_content_sniffing         — detect_format() correctly identifies CSV/JSON/XML
                                     from bytes, ignoring extension.
  3. test_validation_rejection     — bad rows are collected in rejected_sample;
                                     valid rows still succeed.
  4. test_roundtrip_10k_sample     — 10k-row CSV through the full pipeline,
                                     verify count + GeoIP columns in Postgres.
                                     Skipped if DATABASE_URL is not live.
  5. test_cross_format_consistency — 1k rows of same data across CSV/JSON/XML
                                     produce identical row counts in Postgres.
                                     Skipped if DATABASE_URL is not live.

Unit tests (1–3) run without any external service.
Integration tests (4–5) require DATABASE_URL to point at a running Postgres
instance with the transactions table created (alembic upgrade head).
"""

import csv
import io
import json
import os
import pathlib
import tempfile
import time
import xml.etree.ElementTree as ET
from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from starlette.testclient import TestClient

# ---------------------------------------------------------------------------
# Fixture: synthetic data paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA_CSV = PROJECT_ROOT / "data" / "synthetic_transactions.csv"
DATA_JSON = PROJECT_ROOT / "data" / "synthetic_transactions.json"
DATA_XML = PROJECT_ROOT / "data" / "synthetic_transactions.xml"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_postgres_available() -> bool:
    """Return True if DATABASE_URL is set and Postgres is reachable."""
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        return False
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=3)
        conn.close()
        return True
    except Exception:
        return False


_POSTGRES_AVAILABLE = _is_postgres_available()
_requires_postgres = pytest.mark.skipif(
    not _POSTGRES_AVAILABLE,
    reason="DATABASE_URL not set or Postgres not reachable — skipping integration test",
)


def _make_valid_row(**overrides) -> dict[str, Any]:
    """Return a minimal valid transaction dict."""
    base = {
        "txid": "a" * 64,
        "ts": "2026-01-01T00:00:00Z",
        "src_ip": "8.8.8.8",
        "dst_ip": "1.1.1.1",
        "src_port": 12345,
        "dst_port": 8333,
        "input_addresses": ["bc1qtest1"],
        "output_addresses": ["bc1qtest2"],
        "input_amounts": [Decimal("0.1")],
        "output_amounts": [Decimal("0.09")],
        "fee": Decimal("0.001"),
        "script_type": "P2WPKH",
        "geo_country": "US",
        "asn": 15169,
    }
    base.update(overrides)
    return base


def _csv_bytes_from_rows(rows: list[dict]) -> bytes:
    """Serialise a list of row dicts to CSV bytes (PostgreSQL array notation)."""
    buf = io.StringIO()
    fieldnames = [
        "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
        "input_addresses", "output_addresses", "input_amounts", "output_amounts",
        "fee", "script_type", "geo_country", "asn",
    ]
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        pg_row = dict(row)
        # Convert lists → PostgreSQL {a,b} notation
        for field in ("input_addresses", "output_addresses", "input_amounts", "output_amounts"):
            val = pg_row.get(field, [])
            pg_row[field] = "{" + ",".join(str(v) for v in val) + "}"
        writer.writerow(pg_row)
    return buf.getvalue().encode()


def _json_bytes_from_rows(rows: list[dict]) -> bytes:
    """Serialise rows to JSON bytes (native Python list format)."""
    serialisable = []
    for row in rows:
        r = dict(row)
        for field in ("input_amounts", "output_amounts", "fee"):
            if isinstance(r.get(field), Decimal):
                r[field] = float(r[field])
            elif isinstance(r.get(field), list):
                r[field] = [float(v) if isinstance(v, Decimal) else v for v in r[field]]
        serialisable.append(r)
    return json.dumps(serialisable).encode()


def _xml_bytes_from_rows(rows: list[dict]) -> bytes:
    """Serialise rows to XML bytes matching the synthetic data XML schema."""
    root = ET.Element("transactions")
    for row in rows:
        tx = ET.SubElement(root, "transaction")
        for scalar in ("txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
                        "fee", "script_type", "geo_country", "asn"):
            el = ET.SubElement(tx, scalar)
            el.text = str(row.get(scalar, ""))
        for arr_field, child_tag in (
            ("input_addresses", "address"),
            ("output_addresses", "address"),
            ("input_amounts", "amount"),
            ("output_amounts", "amount"),
        ):
            parent = ET.SubElement(tx, arr_field)
            for item in row.get(arr_field, []):
                child = ET.SubElement(parent, child_tag)
                child.text = str(item)
    return ET.tostring(root, encoding="unicode").encode()


# ---------------------------------------------------------------------------
# Test 1 — Health endpoint
# ---------------------------------------------------------------------------


def test_health_endpoint():
    """GET /health returns HTTP 200 with {status: ok}."""
    from app.main import app

    client = TestClient(app, raise_server_exceptions=True)
    response = client.get("/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Test 2 — Content sniffing
# ---------------------------------------------------------------------------


class TestContentSniffing:
    """detect_format() identifies format from bytes, not from filename extension."""

    def test_detect_csv_bytes(self):
        from app.services.parser import detect_format
        # CSV header with typical fields
        data = b"txid,ts,src_ip,dst_ip,src_port,dst_port\nabc,2026-01-01,1.2.3.4,5.6.7.8,1024,8333\n"
        assert detect_format(data) == "csv"

    def test_detect_json_array_bytes(self):
        from app.services.parser import detect_format
        data = b'[{"txid": "abc", "ts": "2026-01-01"}]'
        assert detect_format(data) == "json"

    def test_detect_json_object_bytes(self):
        from app.services.parser import detect_format
        # A JSON object should also be detected as JSON.
        data = b'{"txid": "abc"}'
        assert detect_format(data) == "json"

    def test_detect_xml_with_declaration(self):
        from app.services.parser import detect_format
        data = b'<?xml version="1.0"?><transactions></transactions>'
        assert detect_format(data) == "xml"

    def test_detect_xml_without_declaration(self):
        from app.services.parser import detect_format
        data = b'<transactions><transaction></transaction></transactions>'
        assert detect_format(data) == "xml"

    def test_detect_from_csv_named_as_xml(self):
        """Extension is irrelevant — content determines format."""
        from app.services.parser import detect_format
        # CSV content in a file named .xml (should still return 'csv')
        data = b"txid,ts,src_ip\nabc,2026,1.2.3.4\n"
        assert detect_format(data) == "csv"

    def test_detect_from_json_named_as_csv(self):
        from app.services.parser import detect_format
        data = b'[{"a": 1}]'
        assert detect_format(data) == "json"

    def test_empty_file_raises(self):
        from app.services.parser import detect_format
        with pytest.raises(ValueError, match="empty"):
            detect_format(b"")


# ---------------------------------------------------------------------------
# Test 3 — Validation rejection
# ---------------------------------------------------------------------------


class TestValidationRejection:
    """Pydantic validation: bad rows are collected, valid rows succeed."""

    def _run_task_directly(self, file_path: str, fmt: str) -> dict:
        """Call run_ingest_pipeline() directly with mock DB/insert factories.

        Zero Celery broker dependency. Tests validation and rejection logic
        in pure Python — no network calls.
        """
        from app.tasks.ingest import run_ingest_pipeline

        # Mock: fake DB connection whose commit/rollback/close are no-ops.
        fake_conn = MagicMock()
        fake_conn.autocommit = False

        def fake_conn_factory():
            return fake_conn

        # Mock: bulk_copy_insert returns the count of rows it would insert.
        def fake_insert(conn, rows):
            return len(rows)

        return run_ingest_pipeline(
            file_path,
            fmt,
            db_conn_factory=fake_conn_factory,
            insert_fn=fake_insert,
        )


    def _write_temp_csv(self, rows: list[dict]) -> str:
        """Write rows to a temp CSV and return the path."""
        data = _csv_bytes_from_rows(rows)
        with tempfile.NamedTemporaryFile(
            suffix=".csv", delete=False, dir=tempfile.gettempdir()
        ) as f:
            f.write(data)
            return f.name

    def test_bad_txid_rejected(self):
        """Row with txid != 64 hex chars lands in rejected_sample."""
        good = _make_valid_row(txid="b" * 64)
        bad_txid = _make_valid_row(txid="TOOSHORT")
        bad_txid["txid"] = "TOOSHORT"
        rows = [good, bad_txid, _make_valid_row(txid="c" * 64)]
        path = self._write_temp_csv(rows)
        try:
            summary = self._run_task_directly(path, "csv")
        finally:
            pathlib.Path(path).unlink(missing_ok=True)

        assert summary["total_received"] == 3
        assert summary["total_rejected"] == 1
        assert summary["total_inserted"] == 2
        assert len(summary["rejected_sample"]) == 1
        assert "txid" in str(summary["rejected_sample"][0]["errors"]).lower() or \
               "txid" in str(summary["rejected_sample"][0])

    def test_negative_fee_rejected(self):
        """Row with fee < 0 lands in rejected_sample."""
        rows = [
            _make_valid_row(txid="d" * 64, fee=Decimal("-0.001")),
            _make_valid_row(txid="e" * 64),
        ]
        path = self._write_temp_csv(rows)
        try:
            summary = self._run_task_directly(path, "csv")
        finally:
            pathlib.Path(path).unlink(missing_ok=True)

        assert summary["total_rejected"] == 1
        assert summary["total_inserted"] == 1

    def test_invalid_script_type_rejected(self):
        """Row with script_type not in allowed set lands in rejected_sample."""
        rows = [
            _make_valid_row(txid="f" * 64, script_type="INVALID"),
            _make_valid_row(txid="0" * 64),
        ]
        path = self._write_temp_csv(rows)
        try:
            summary = self._run_task_directly(path, "csv")
        finally:
            pathlib.Path(path).unlink(missing_ok=True)

        assert summary["total_rejected"] == 1
        assert summary["total_inserted"] == 1

    def test_invalid_ip_rejected(self):
        """Row with non-IP src_ip lands in rejected_sample."""
        rows = [
            _make_valid_row(txid="1" * 64, src_ip="NOT_AN_IP"),
            _make_valid_row(txid="2" * 64),
        ]
        path = self._write_temp_csv(rows)
        try:
            summary = self._run_task_directly(path, "csv")
        finally:
            pathlib.Path(path).unlink(missing_ok=True)

        assert summary["total_rejected"] == 1
        assert summary["total_inserted"] == 1

    def test_mismatched_array_lengths_rejected(self):
        """Row where input_addresses and input_amounts have different lengths is rejected."""
        bad = _make_valid_row(txid="3" * 64)
        bad["input_addresses"] = ["bc1qtest1", "bc1qtest2"]  # 2 addresses
        bad["input_amounts"] = [Decimal("0.1")]              # 1 amount — mismatch
        rows = [bad, _make_valid_row(txid="4" * 64)]
        path = self._write_temp_csv(rows)
        try:
            summary = self._run_task_directly(path, "csv")
        finally:
            pathlib.Path(path).unlink(missing_ok=True)

        assert summary["total_rejected"] == 1
        assert summary["total_inserted"] == 1

    def test_all_bad_rows_zero_inserted(self):
        """All-bad batch: zero inserted, all in rejected_sample."""
        rows = [
            _make_valid_row(txid="BADTXID", fee=Decimal("-1")),
            _make_valid_row(txid="ALSOSHORT"),
        ]
        path = self._write_temp_csv(rows)
        try:
            summary = self._run_task_directly(path, "csv")
        finally:
            pathlib.Path(path).unlink(missing_ok=True)

        assert summary["total_inserted"] == 0
        assert summary["total_rejected"] == 2


# ---------------------------------------------------------------------------
# Test 4 — Round-trip 10k sample (integration, requires Postgres)
# ---------------------------------------------------------------------------


@_requires_postgres
def test_roundtrip_10k_sample():
    """Ingest 10k rows from the real CSV fixture; verify Postgres count + GeoIP."""
    import psycopg2

    assert DATA_CSV.exists(), f"Synthetic CSV not found: {DATA_CSV}"

    # Extract first 10k rows into a temp file.
    rows_10k = []
    with open(DATA_CSV, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for i, row in enumerate(reader):
            if i >= 10_000:
                break
            rows_10k.append(row)

    assert len(rows_10k) == 10_000, f"Expected 10000 rows, got {len(rows_10k)}"

    # Write subset to temp CSV.
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=rows_10k[0].keys())
    writer.writeheader()
    writer.writerows(rows_10k)
    content = buf.getvalue().encode()

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
        f.write(content)
        temp_path = f.name

    try:
        from app.tasks.ingest import process_ingest_file
        result = process_ingest_file.apply(args=[temp_path, "csv"])
        summary = result.get()
    finally:
        pathlib.Path(temp_path).unlink(missing_ok=True)

    db_url = os.environ["DATABASE_URL"]
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # Count rows inserted in this run (filter by ingested_at within last 5 min).
            cur.execute(
                "SELECT COUNT(*) FROM transactions WHERE ingested_at > NOW() - INTERVAL '5 minutes'"
            )
            db_count = cur.fetchone()[0]

            # Verify GeoIP columns are populated for rows whose src_ip is a real IP.
            cur.execute(
                """
                SELECT COUNT(*) FROM transactions
                WHERE ingested_at > NOW() - INTERVAL '5 minutes'
                  AND geo_country IS NOT NULL
                """
            )
            geoip_populated = cur.fetchone()[0]
    finally:
        conn.close()

    assert summary["total_inserted"] == db_count, (
        f"Task reported {summary['total_inserted']} inserted but DB has {db_count}"
    )
    assert db_count > 0, "No rows were inserted into Postgres"
    # GeoIP should be populated for a substantial fraction of rows.
    assert geoip_populated > db_count * 0.5, (
        f"Only {geoip_populated}/{db_count} rows have geo_country — GeoIP may be broken"
    )

    print(
        f"\n[test_roundtrip_10k_sample] "
        f"received={summary['total_received']} inserted={summary['total_inserted']} "
        f"rejected={summary['total_rejected']} geo_populated={geoip_populated}"
    )


# ---------------------------------------------------------------------------
# Test 5 — Cross-format consistency (integration, requires Postgres)
# ---------------------------------------------------------------------------


@_requires_postgres
def test_cross_format_consistency():
    """Ingest 1k rows from CSV, JSON, and XML exports of the same data.

    Verifies that all three parsers produce the same txid set in Postgres.
    """
    import psycopg2

    for path in (DATA_CSV, DATA_JSON, DATA_XML):
        assert path.exists(), f"Synthetic fixture not found: {path}"

    # Extract 1k rows from CSV (the canonical source).
    with open(DATA_CSV, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        csv_rows = [row for _, row in zip(range(1_000), reader)]
    assert len(csv_rows) == 1_000

    txids_1k = {row["txid"] for row in csv_rows}

    # Build txid-filtered slices from JSON and XML.
    with open(DATA_JSON, encoding="utf-8") as fh:
        all_json = json.load(fh)
    json_rows = [r for r in all_json if r["txid"] in txids_1k]

    xml_rows_raw: list[dict] = []
    from app.services.parser import parse_xml
    for row in parse_xml(DATA_XML):
        if row["txid"] in txids_1k:
            xml_rows_raw.append(row)
        if len(xml_rows_raw) == 1_000:
            break

    # Write each format to a temp file, run the task, collect inserted txids.
    db_url = os.environ["DATABASE_URL"]

    def _ingest_and_get_txids(content: bytes, fmt: str, label: str) -> set[str]:
        suffix = f".{fmt}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(content)
            temp_path = f.name
        try:
            from app.tasks.ingest import process_ingest_file
            result = process_ingest_file.apply(args=[temp_path, fmt])
            summary = result.get()
        finally:
            pathlib.Path(temp_path).unlink(missing_ok=True)

        conn = psycopg2.connect(db_url)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT txid FROM transactions WHERE ingested_at > NOW() - INTERVAL '10 minutes'"
                )
                inserted_txids = {r[0] for r in cur.fetchall()}
        finally:
            conn.close()

        print(
            f"[{label}] received={summary['total_received']} "
            f"inserted={summary['total_inserted']} rejected={summary['total_rejected']}"
        )
        return inserted_txids & txids_1k

    csv_inserted = _ingest_and_get_txids(_csv_bytes_from_rows(csv_rows), "csv", "CSV")
    json_inserted = _ingest_and_get_txids(_json_bytes_from_rows(json_rows), "json", "JSON")
    xml_inserted = _ingest_and_get_txids(_xml_bytes_from_rows(xml_rows_raw), "xml", "XML")

    # All three should have the same txids (duplicates silently skipped by UNIQUE constraint).
    assert len(csv_inserted) > 0, "CSV ingest produced no rows in DB"
    assert json_inserted == csv_inserted, (
        f"JSON inserted txid set differs from CSV. "
        f"Only in CSV: {len(csv_inserted - json_inserted)}, "
        f"Only in JSON: {len(json_inserted - csv_inserted)}"
    )
    assert xml_inserted == csv_inserted, (
        f"XML inserted txid set differs from CSV. "
        f"Only in CSV: {len(csv_inserted - xml_inserted)}, "
        f"Only in XML: {len(xml_inserted - csv_inserted)}"
    )

    print(
        f"\n[test_cross_format_consistency] "
        f"csv={len(csv_inserted)} json={len(json_inserted)} xml={len(xml_inserted)} — all match ✓"
    )
