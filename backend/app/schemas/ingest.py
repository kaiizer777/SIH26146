"""Pydantic v2 schemas for the ingest pipeline.

Validates all 14 mandatory fields that map to the PostgreSQL transactions
table (excluding server-generated columns: id, ingested_at).
"""

import ipaddress
import re
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_TXID_RE = re.compile(r"^[0-9a-fA-F]{64}$")

VALID_SCRIPT_TYPES: frozenset[str] = frozenset(
    ("P2PK", "P2PKH", "P2SH", "P2WPKH", "P2TR")
)


# ---------------------------------------------------------------------------
# Core record model
# ---------------------------------------------------------------------------


class TransactionRecord(BaseModel):
    """Validated representation of one ingest row.

    All 14 mandatory fields are required. geo_country and asn may be
    overwritten by GeoIP enrichment after validation.
    """

    model_config = ConfigDict(strict=False, populate_by_name=True)

    ts: str
    """ISO-8601 timestamp string (e.g. '2026-03-03T23:20:51Z')."""

    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int

    txid: str
    """64 lowercase hex characters."""

    input_addresses: list[str]
    output_addresses: list[str]
    input_amounts: list[Decimal]
    output_amounts: list[Decimal]

    fee: Decimal
    """Transaction fee in BTC. Must be >= 0."""

    script_type: str
    """One of: P2PK, P2PKH, P2SH, P2WPKH, P2TR."""

    # GeoIP-enriched fields — present in raw data but may be overwritten.
    geo_country: str | None = None
    asn: int | None = None

    # ------------------------------------------------------------------
    # Field validators
    # ------------------------------------------------------------------

    @field_validator("txid")
    @classmethod
    def txid_must_be_64_hex(cls, v: str) -> str:
        if not _TXID_RE.match(v):
            raise ValueError(
                f"txid must be exactly 64 hexadecimal characters, got length {len(v)}"
            )
        return v.lower()

    @field_validator("src_ip", "dst_ip")
    @classmethod
    def ip_must_be_valid(cls, v: str) -> str:
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IPv4 or IPv6 address")
        return v

    @field_validator("src_port", "dst_port", mode="before")
    @classmethod
    def coerce_port(cls, v: Any) -> int:
        try:
            port = int(v)
        except (TypeError, ValueError):
            raise ValueError(f"port must be an integer, got {v!r}")
        if not (0 <= port <= 65535):
            raise ValueError(f"port {port} out of valid range 0–65535")
        return port

    @field_validator("script_type")
    @classmethod
    def script_type_must_be_valid(cls, v: str) -> str:
        if v not in VALID_SCRIPT_TYPES:
            raise ValueError(
                f"script_type '{v}' is not one of {sorted(VALID_SCRIPT_TYPES)}"
            )
        return v

    @field_validator("fee", mode="before")
    @classmethod
    def coerce_fee(cls, v: Any) -> Decimal:
        try:
            d = Decimal(str(v))
        except Exception:
            raise ValueError(f"fee must be a non-negative number, got {v!r}")
        if d < 0:
            raise ValueError(f"fee must be >= 0, got {d}")
        return d

    @field_validator("input_amounts", "output_amounts", mode="before")
    @classmethod
    def coerce_amount_list(cls, v: Any) -> list[Decimal]:
        if isinstance(v, str):
            # Handles PostgreSQL-style '{0.001,0.002}' notation from CSV.
            v = _parse_pg_array_str(v)
        if not isinstance(v, (list, tuple)):
            raise ValueError(f"expected a list of amounts, got {type(v).__name__}")
        result: list[Decimal] = []
        for item in v:
            try:
                result.append(Decimal(str(item)))
            except Exception:
                raise ValueError(f"amount '{item}' is not a valid decimal number")
        return result

    @field_validator("input_addresses", "output_addresses", mode="before")
    @classmethod
    def coerce_address_list(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return _parse_pg_array_str(v)
        if not isinstance(v, (list, tuple)):
            raise ValueError(f"expected a list of addresses, got {type(v).__name__}")
        return [str(a) for a in v]

    @field_validator("asn", mode="before")
    @classmethod
    def coerce_asn(cls, v: Any) -> int | None:
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            raise ValueError(f"asn must be an integer, got {v!r}")

    @field_validator("geo_country", mode="before")
    @classmethod
    def coerce_geo_country(cls, v: Any) -> str | None:
        if v is None or v == "":
            return None
        s = str(v).strip()
        if s and not re.match(r"^[A-Z]{2}$", s):
            # Warn but don't reject — GeoIP will overwrite anyway.
            return None
        return s or None

    # ------------------------------------------------------------------
    # Cross-field validators
    # ------------------------------------------------------------------

    @model_validator(mode="after")
    def address_amount_lengths_must_match(self) -> "TransactionRecord":
        if len(self.input_addresses) != len(self.input_amounts):
            raise ValueError(
                f"input_addresses length ({len(self.input_addresses)}) must equal "
                f"input_amounts length ({len(self.input_amounts)})"
            )
        if len(self.output_addresses) != len(self.output_amounts):
            raise ValueError(
                f"output_addresses length ({len(self.output_addresses)}) must equal "
                f"output_amounts length ({len(self.output_amounts)})"
            )
        return self


# ---------------------------------------------------------------------------
# API response schemas
# ---------------------------------------------------------------------------


class IngestResponse(BaseModel):
    """Returned immediately (HTTP 202) after file upload is accepted."""

    task_id: str
    status: Literal["PENDING"]


class TaskStatusResponse(BaseModel):
    """Returned by GET /ingest/status/{task_id}."""

    task_id: str
    status: str
    """PENDING | STARTED | PROGRESS | SUCCESS | FAILURE"""

    progress: dict[str, Any] | None = None
    """Set during PROGRESS state: {processed, inserted, rejected, total}."""

    result: dict[str, Any] | None = None
    """Set on SUCCESS: {total_received, total_inserted, total_rejected, rejected_sample}."""

    error: str | None = None
    """Set on FAILURE: human-readable error message."""


class IngestSyncResponse(BaseModel):
    """Returned by POST /ingest/sync/{task_id}."""

    scored: int
    upserted: int
    skipped_existing: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_pg_array_str(value: str) -> list[str]:
    """Parse PostgreSQL array literal '{a,b,c}' into a Python list.

    Used when CSV fields store arrays in PostgreSQL wire format.
    """
    value = value.strip()
    if value.startswith("{") and value.endswith("}"):
        value = value[1:-1]
    if not value:
        return []
    # Split on commas that are NOT inside double-quoted strings.
    # The generator format doesn't quote values, so a simple split is safe.
    return [item.strip().strip('"') for item in value.split(",") if item.strip()]
