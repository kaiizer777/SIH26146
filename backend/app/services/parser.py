"""Content-sniffing multi-format parser for CSV, JSON, and XML.

All parsers yield uniform dicts keyed by the 14 mandatory transaction
field names. Parsers are generator-based so the caller controls memory.

Supported formats:
  - CSV  : DictReader-based, handles PostgreSQL {array} notation in cells.
  - JSON : Top-level JSON array, loaded in one pass (file is on disk).
  - XML  : iterparse-based to avoid loading 90 MB into memory at once.
"""

import csv
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Generator, Literal


# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------

_FORMAT = Literal["csv", "json", "xml"]

# Number of bytes to inspect for format sniffing.
_SNIFF_BYTES = 512


def detect_format(data: bytes) -> _FORMAT:
    """Determine file format from raw bytes (first ~512 bytes).

    Detection order:
      1. XML   — starts with '<?xml' or '<' after optional BOM/whitespace.
      2. JSON  — first non-whitespace char is '[' or '{'.
      3. CSV   — fallback.

    Raises ValueError if the format cannot be determined.
    """
    sample = data[:_SNIFF_BYTES].lstrip()

    if sample.startswith(b"<?xml") or sample.startswith(b"<"):
        return "xml"

    if sample and sample[0:1] in (b"[", b"{"):
        return "json"

    # Presence of commas or typical CSV header keywords is a good heuristic,
    # but at this point we've already ruled out XML and JSON — treat as CSV.
    if sample:
        return "csv"

    raise ValueError("Could not detect format: file appears to be empty")


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------


def _pg_array_to_list(value: str) -> list[str]:
    """Convert PostgreSQL '{a,b,c}' string to a Python list.

    Returns an empty list for empty/null-like values.
    """
    value = value.strip()
    if value.startswith("{") and value.endswith("}"):
        value = value[1:-1]
    if not value:
        return []
    return [item.strip().strip('"') for item in value.split(",") if item.strip()]


def _normalise_csv_row(row: dict) -> dict:
    """Convert a raw DictReader row into the uniform internal representation.

    The CSV uses PostgreSQL array notation ('{a,b}') for list fields.
    Scalar numeric fields are kept as strings — Pydantic will coerce them.
    """
    return {
        "txid": row.get("txid", ""),
        "ts": row.get("ts", ""),
        "src_ip": row.get("src_ip", ""),
        "dst_ip": row.get("dst_ip", ""),
        "src_port": row.get("src_port", ""),
        "dst_port": row.get("dst_port", ""),
        "input_addresses": _pg_array_to_list(row.get("input_addresses", "")),
        "output_addresses": _pg_array_to_list(row.get("output_addresses", "")),
        "input_amounts": _pg_array_to_list(row.get("input_amounts", "")),
        "output_amounts": _pg_array_to_list(row.get("output_amounts", "")),
        "fee": row.get("fee", ""),
        "script_type": row.get("script_type", ""),
        "geo_country": row.get("geo_country", "") or None,
        "asn": row.get("asn", "") or None,
    }


def _normalise_json_row(row: dict) -> dict:
    """Normalise a JSON object (already parsed) into uniform representation.

    JSON lists are already Python lists; amounts may be floats — keep as-is,
    Pydantic coerces via Decimal(str(v)).
    """
    return {
        "txid": row.get("txid", ""),
        "ts": row.get("ts", ""),
        "src_ip": row.get("src_ip", ""),
        "dst_ip": row.get("dst_ip", ""),
        "src_port": row.get("src_port", ""),
        "dst_port": row.get("dst_port", ""),
        "input_addresses": row.get("input_addresses", []),
        "output_addresses": row.get("output_addresses", []),
        "input_amounts": row.get("input_amounts", []),
        "output_amounts": row.get("output_amounts", []),
        "fee": row.get("fee", ""),
        "script_type": row.get("script_type", ""),
        "geo_country": row.get("geo_country") or None,
        "asn": row.get("asn") or None,
    }


def _normalise_xml_element(elem: ET.Element) -> dict:
    """Extract fields from a <transaction> XML element.

    Array sub-elements use <address> or <amount> child tags:
      <input_addresses><address>bc1q...</address></input_addresses>
    """

    def _text(tag: str) -> str:
        child = elem.find(tag)
        return (child.text or "").strip() if child is not None else ""

    def _list_children(parent_tag: str, child_tag: str) -> list[str]:
        parent = elem.find(parent_tag)
        if parent is None:
            return []
        return [
            (c.text or "").strip()
            for c in parent.findall(child_tag)
            if c.text and c.text.strip()
        ]

    return {
        "txid": _text("txid"),
        "ts": _text("ts"),
        "src_ip": _text("src_ip"),
        "dst_ip": _text("dst_ip"),
        "src_port": _text("src_port"),
        "dst_port": _text("dst_port"),
        "input_addresses": _list_children("input_addresses", "address"),
        "output_addresses": _list_children("output_addresses", "address"),
        "input_amounts": _list_children("input_amounts", "amount"),
        "output_amounts": _list_children("output_amounts", "amount"),
        "fee": _text("fee"),
        "script_type": _text("script_type"),
        "geo_country": _text("geo_country") or None,
        "asn": _text("asn") or None,
    }


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------


def parse_csv(path: str | Path) -> Generator[dict, None, None]:
    """Yield normalised dicts from a CSV file, one per row.

    Handles PostgreSQL-style '{a,b}' array notation in cells.
    Uses UTF-8 with BOM fallback (utf-8-sig).
    """
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            yield _normalise_csv_row(row)


def parse_json(path: str | Path) -> Generator[dict, None, None]:
    """Yield normalised dicts from a JSON file (top-level array).

    Loads the entire file into memory via json.load — acceptable because
    the file is already on disk and we're inside the Celery worker process.
    For files > ~200MB, replace with ijson streaming.
    """
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, list):
        raise ValueError(
            f"JSON file must contain a top-level array, got {type(data).__name__}"
        )

    for row in data:
        if not isinstance(row, dict):
            raise ValueError(f"Each JSON element must be an object, got {type(row).__name__}")
        yield _normalise_json_row(row)


def parse_xml(path: str | Path) -> Generator[dict, None, None]:
    """Yield normalised dicts from an XML file using iterparse.

    iterparse processes the file as a stream, releasing each <transaction>
    element after yielding it to keep memory usage O(1) per batch.
    """
    context = ET.iterparse(str(path), events=("end",))
    for event, elem in context:
        if elem.tag == "transaction":
            yield _normalise_xml_element(elem)
            # Release element and its children to free memory.
            elem.clear()


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_PARSERS: dict[str, callable] = {
    "csv": parse_csv,
    "json": parse_json,
    "xml": parse_xml,
}


def get_parser(fmt: _FORMAT):
    """Return the appropriate parser function for a detected format."""
    parser = _PARSERS.get(fmt)
    if parser is None:
        raise ValueError(f"No parser registered for format '{fmt}'")
    return parser
