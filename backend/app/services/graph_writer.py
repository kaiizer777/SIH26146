"""Neo4j graph writer for the live ingest path.

Writes validated ingest rows straight into the SIH26146 property graph so that
freshly ingested wallets are immediately visible to every graph/cluster view.
Schema and semantics mirror the reference builder ``backend/scripts/build_graph.py``
exactly:

  (:Wallet {address})
  (:Transaction {txid, ts, total_in, total_out, fee})
  (:IP {address, country, asn, src_port})
  (:Wallet)-[:SENDS {amount, script_type}]->(:Transaction)
  (:Transaction)-[:RECEIVES {amount}]->(:Wallet)
  (:IP)-[:OBSERVED {ts, dst_port}]->(:Transaction)
  (:Wallet)-[:CO_SPEND]->(:Wallet)   # canonical addr1 < addr2, no self-loops

Deliberate differences from the reference script — none of them schema-breaking:

  * Every statement is ``UNWIND $batch`` driven (never per-row).
  * Address/amount parity is **validated**, not silently truncated. The
    reference builder uses ``zip(addrs, amounts)`` (build_graph.py:173), which
    drops trailing elements on a length mismatch. Here a mismatched side is
    skipped and counted, so a malformed row can never write a half-populated
    edge set.
  * Addresses are stripped, blanks dropped, and in-row duplicates collapsed.
  * Every write is a ``MERGE`` — re-ingesting the same file is a no-op, and the
    returned counters prove it (created counts drop to 0 on a second run).
  * Write counters come from the Neo4j result summary, so
    :class:`GraphWriteSummary` reports *actually created* nodes/relationships
    rather than *attempted* ones.

Memory contract:
  - Rows are consumed in ``settings.ingest_batch_size`` slices, so peak payload
    memory is O(row_batch_size), not O(file).
  - Each Cypher write is capped at ``settings.graph_neo4j_batch_size`` items
    (1 000 by default), matching the documented Neo4j UNWIND contract.

Prerequisites: the uniqueness constraints in
``backend/scripts/neo4j_init.cypher`` must already exist. This module verifies
them by default and refuses to write without them.
"""

from __future__ import annotations

import itertools
import logging
import math
import time
from collections.abc import Callable, Hashable, Iterable, Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Any, TypeVar

from neo4j import Driver, ManagedTransaction

try:  # neo4j >= 6.0 exports the counter type at package level
    from neo4j import SummaryCounters
except ImportError:  # pragma: no cover - neo4j 5.x path
    from neo4j._work.summary import SummaryCounters  # type: ignore[no-redef]

from app.config import settings
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)

_T = TypeVar("_T")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Hard cap on items per Cypher UNWIND transaction (build_graph.py memory contract).
_MAX_CYPHER_BATCH = 1_000

# Decimal places kept when rounding BTC amounts. 8 dp = 1 satoshi, the native
# resolution of the Bitcoin chain, and the tolerance used by the Phase 3 tests.
_AMOUNT_PLACES = 8

# Maximum number of per-row skip warnings emitted per call, so a badly
# malformed file cannot flood the Celery worker log.
_MAX_SKIP_WARNINGS = 20

# Stable skip-reason keys — surfaced to the caller inside GraphWriteSummary.
SKIP_MISSING_TXID = "missing_txid"
SKIP_EMPTY_ADDRESS = "empty_address"
SKIP_AMOUNT_MISMATCH = "address_amount_length_mismatch"
SKIP_INVALID_AMOUNT = "invalid_amount"
SKIP_EMPTY_SRC_IP = "empty_src_ip"


# ---------------------------------------------------------------------------
# Cypher — identical semantics to build_graph.py, split per entity type so each
# statement is batched independently against the UNWIND cap.
# ---------------------------------------------------------------------------

_CYPHER_TRANSACTIONS = """
UNWIND $batch AS row
MERGE (t:Transaction {txid: row.txid})
  ON CREATE SET t.ts = row.ts,
               t.total_in = row.total_in,
               t.total_out = row.total_out,
               t.fee = row.fee
"""

_CYPHER_WALLETS = """
UNWIND $batch AS row
MERGE (w:Wallet {address: row.address})
"""

_CYPHER_IPS = """
UNWIND $batch AS row
MERGE (i:IP {address: row.address})
  ON CREATE SET i.country = row.country,
               i.asn = row.asn,
               i.src_port = row.src_port
"""

_CYPHER_SENDS = """
UNWIND $batch AS row
MATCH (w:Wallet {address: row.wallet_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (w)-[r:SENDS {amount: row.amount, script_type: row.script_type}]->(t)
"""

_CYPHER_RECEIVES = """
UNWIND $batch AS row
MATCH (t:Transaction {txid: row.txid})
MATCH (w:Wallet {address: row.wallet_addr})
MERGE (t)-[r:RECEIVES {amount: row.amount}]->(w)
"""

_CYPHER_OBSERVED = """
UNWIND $batch AS row
MATCH (i:IP {address: row.ip_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (i)-[r:OBSERVED {ts: row.ts, dst_port: row.dst_port}]->(t)
"""

_CYPHER_COSPEND = """
UNWIND $batch AS row
MATCH (w1:Wallet {address: row.addr1})
MATCH (w2:Wallet {address: row.addr2})
MERGE (w1)-[:CO_SPEND]->(w2)
"""


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class GraphWriteError(RuntimeError):
    """Raised when a graph write fails. Always names the failing statement."""


class GraphSchemaError(GraphWriteError):
    """Raised when the Neo4j uniqueness constraints required by MERGE are absent.

    MERGE without a uniqueness constraint degrades to a full label scan and can
    create duplicate nodes — far worse than refusing to write.
    """


# ---------------------------------------------------------------------------
# Summary value object
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class GraphWriteSummary:
    """Result of one :func:`write_transactions_to_graph` call.

    ``*_submitted`` counts what this call sent to Neo4j. ``*_created`` counts
    what Neo4j actually created (from the server result counters) — the
    difference is what already existed, and is the whole file on a re-run.
    """

    rows_received: int
    """Rows handed to the writer."""

    rows_written: int
    """Rows that produced a :Transaction node (i.e. carried a usable txid)."""

    rows_rejected: int
    """Rows discarded entirely because they had no usable txid."""

    transactions_submitted: int
    wallets_submitted: int
    ips_submitted: int

    transactions_created: int
    wallets_created: int
    ips_created: int
    sends_created: int
    receives_created: int
    observed_created: int
    cospend_created: int

    cypher_batches: int
    """Number of UNWIND transactions executed."""

    wall_seconds: float

    skip_reasons: Mapping[str, int]
    """Field-level skip counts keyed by the ``SKIP_*`` constants."""

    def as_dict(self) -> dict[str, Any]:
        """Flat dict suitable for a Celery task result or an API response."""
        return {
            "rows_received": self.rows_received,
            "rows_written": self.rows_written,
            "rows_rejected": self.rows_rejected,
            "transactions_submitted": self.transactions_submitted,
            "wallets_submitted": self.wallets_submitted,
            "ips_submitted": self.ips_submitted,
            "transactions_created": self.transactions_created,
            "wallets_created": self.wallets_created,
            "ips_created": self.ips_created,
            "sends_created": self.sends_created,
            "receives_created": self.receives_created,
            "observed_created": self.observed_created,
            "cospend_created": self.cospend_created,
            "cypher_batches": self.cypher_batches,
            "wall_seconds": self.wall_seconds,
            "rows_skipped": sum(self.skip_reasons.values()),
            "skip_reasons": dict(self.skip_reasons),
        }


@dataclass
class _Totals:
    """Mutable accumulator threaded through the per-chunk write loop."""

    rows_received: int = 0
    rows_written: int = 0
    rows_rejected: int = 0
    transactions_submitted: int = 0
    wallets_submitted: int = 0
    ips_submitted: int = 0
    transactions_created: int = 0
    wallets_created: int = 0
    ips_created: int = 0
    sends_created: int = 0
    receives_created: int = 0
    observed_created: int = 0
    cospend_created: int = 0
    cypher_batches: int = 0
    skip_reasons: dict[str, int] = field(default_factory=dict)

    def skip(self, reason: str, count: int = 1) -> None:
        self.skip_reasons[reason] = self.skip_reasons.get(reason, 0) + count

    def bump(self, attribute: str, delta: int) -> None:
        setattr(self, attribute, getattr(self, attribute) + delta)

    def as_summary(self, wall_seconds: float) -> GraphWriteSummary:
        return GraphWriteSummary(
            rows_received=self.rows_received,
            rows_written=self.rows_written,
            rows_rejected=self.rows_rejected,
            transactions_submitted=self.transactions_submitted,
            wallets_submitted=self.wallets_submitted,
            ips_submitted=self.ips_submitted,
            transactions_created=self.transactions_created,
            wallets_created=self.wallets_created,
            ips_created=self.ips_created,
            sends_created=self.sends_created,
            receives_created=self.receives_created,
            observed_created=self.observed_created,
            cospend_created=self.cospend_created,
            cypher_batches=self.cypher_batches,
            wall_seconds=wall_seconds,
            skip_reasons=dict(sorted(self.skip_reasons.items())),
        )


@dataclass(frozen=True)
class _PreparedRow:
    """One validated + normalised ingest row, ready to be turned into payloads."""

    txid: str
    ts: str | None
    total_in: float
    total_out: float
    fee: float
    script_type: str
    ip_address: str | None
    ip_country: str
    ip_asn: int
    ip_src_port: int
    dst_port: int
    sends: tuple[tuple[str, float], ...]
    receives: tuple[tuple[str, float], ...]
    wallet_addresses: tuple[str, ...]
    cospend_pairs: tuple[tuple[str, str], ...]


# ---------------------------------------------------------------------------
# Coercion helpers
# ---------------------------------------------------------------------------


def _to_float(value: Any) -> float | None:
    """Coerce a Decimal/str/int amount to a finite float, or None if invalid.

    NaN and infinity are rejected: they would silently poison ``total_in`` /
    ``total_out`` on the :Transaction node.
    """
    if value is None or isinstance(value, bool):
        return None
    try:
        result = value if isinstance(value, float) else float(Decimal(str(value).strip()))
    except (InvalidOperation, ValueError, TypeError, ArithmeticError):
        return None
    if not math.isfinite(result):
        return None
    return result


def _to_int(value: Any, default: int = 0) -> int:
    """Coerce a port/asn to int, falling back to *default* on garbage."""
    if value is None or isinstance(value, bool):
        return default
    try:
        return int(value)
    except (ValueError, TypeError, ArithmeticError):
        logger.warning("Non-integer value %r — falling back to %d", value, default)
        return default


def _as_sequence(value: Any) -> list[Any]:
    """Return *value* as a list; non-list values become an empty list."""
    return list(value) if isinstance(value, (list, tuple)) else []


def _clean_addresses(values: Any) -> tuple[list[str], int]:
    """Strip, drop blanks, and de-duplicate an address list.

    Returns ``(addresses, blanks)`` where *blanks* counts None/empty entries.
    Order is preserved (first occurrence wins) so CO_SPEND canonical ordering
    stays deterministic.
    """
    if values is None:
        return [], 0
    if isinstance(values, (str, bytes)):
        # A bare string is not a valid address list — treat as empty rather
        # than silently inventing a one-element list.
        logger.warning("Address field received scalar %r — expected a list", values)
        return [], 0
    if not isinstance(values, (list, tuple)):
        logger.warning("Address field has unsupported type %s — skipped", type(values).__name__)
        return [], 0

    out: list[str] = []
    seen: set[str] = set()
    blanks = 0
    for raw in values:
        addr = str(raw).strip() if raw is not None else ""
        if not addr:
            blanks += 1
            continue
        if addr in seen:
            continue
        seen.add(addr)
        out.append(addr)
    return out, blanks


def _dedupe_pairs(pairs: Iterable[tuple[str, float]]) -> list[tuple[str, float]]:
    """Collapse identical (address, amount) pairs, preserving first-seen order."""
    seen: set[tuple[str, float]] = set()
    out: list[tuple[str, float]] = []
    for pair in pairs:
        if pair in seen:
            continue
        seen.add(pair)
        out.append(pair)
    return out


def _build_cospend_pairs(addresses: Sequence[str]) -> list[tuple[str, str]]:
    """Canonical ``addr1 < addr2`` co-spend pairs for one transaction's inputs.

    Self-loops are always dropped, even if a malformed row repeats an address.
    Mirrors ``build_graph._build_cospend_batch``.
    """
    if len(addresses) < 2:
        return []
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for a, b in itertools.combinations(addresses, 2):
        if a == b:
            continue
        pair = (a, b) if a < b else (b, a)
        if pair in seen:
            continue
        seen.add(pair)
        pairs.append(pair)
    return pairs


def _row_to_mapping(row: Any) -> Mapping[str, Any]:
    """Accept a TransactionRecord, any Pydantic model, or a plain mapping."""
    if isinstance(row, Mapping):
        return row
    dump = getattr(row, "model_dump", None)
    if callable(dump):
        result = dump()
        if isinstance(result, Mapping):
            return result
        raise GraphWriteError(
            f"model_dump() on {type(row).__name__} returned {type(result).__name__}, "
            "expected a mapping"
        )
    if hasattr(row, "__dict__"):
        return vars(row)
    raise GraphWriteError(
        f"Unsupported row type {type(row).__name__} — expected TransactionRecord or Mapping"
    )


def _pair_side(
    raw_addresses: Any,
    raw_amounts: Any,
    reasons: dict[str, int],
    txid: str,
    side: str,
) -> list[tuple[str, float]]:
    """Pair addresses with amounts for one side, validating parity.

    Unlike the reference builder, a length mismatch skips the *whole* side
    instead of truncating to the shorter list. The caller sees the count in
    :attr:`GraphWriteSummary.skip_reasons`.
    """
    addresses = _as_sequence(raw_addresses)
    amounts = _as_sequence(raw_amounts)

    if len(addresses) != len(amounts):
        reasons[SKIP_AMOUNT_MISMATCH] = reasons.get(SKIP_AMOUNT_MISMATCH, 0) + 1
        logger.warning(
            "txid=%s side=%s: %d address(es) vs %d amount(s) — %s edges skipped "
            "(reference builder would have silently truncated)",
            txid, side, len(addresses), len(amounts), side.upper(),
        )
        return []

    pairs: list[tuple[str, float]] = []
    for raw_addr, raw_amount in zip(addresses, amounts):  # lengths proven equal
        addr = str(raw_addr).strip() if raw_addr is not None else ""
        if not addr:
            # Already counted by _clean_addresses — do not double-count here.
            continue
        amount = _to_float(raw_amount)
        if amount is None:
            reasons[SKIP_INVALID_AMOUNT] = reasons.get(SKIP_INVALID_AMOUNT, 0) + 1
            logger.warning("txid=%s: unparseable %s amount %r — edge skipped", txid, side, raw_amount)
            continue
        pairs.append((addr, amount))
    return _dedupe_pairs(pairs)


def prepare_row(row: Any) -> tuple[_PreparedRow | None, dict[str, int]]:
    """Validate and normalise one ingest row.

    Returns ``(prepared, reasons)``. ``prepared`` is None when the row must be
    discarded entirely (no usable txid). ``reasons`` always describes what was
    dropped, even on success.

    Exposed for unit testing; the public entry point is
    :func:`write_transactions_to_graph`.
    """
    reasons: dict[str, int] = {}
    mapping = _row_to_mapping(row)

    raw_txid = mapping.get("txid")
    txid = str(raw_txid).strip() if raw_txid is not None else ""
    if not txid:
        return None, {SKIP_MISSING_TXID: 1}

    raw_in_addrs = mapping.get("input_addresses")
    raw_out_addrs = mapping.get("output_addresses")
    in_addrs, in_blanks = _clean_addresses(raw_in_addrs)
    out_addrs, out_blanks = _clean_addresses(raw_out_addrs)
    if in_blanks:
        reasons[SKIP_EMPTY_ADDRESS] = reasons.get(SKIP_EMPTY_ADDRESS, 0) + in_blanks
    if out_blanks:
        reasons[SKIP_EMPTY_ADDRESS] = reasons.get(SKIP_EMPTY_ADDRESS, 0) + out_blanks

    sends = _pair_side(raw_in_addrs, mapping.get("input_amounts"), reasons, txid, "sends")
    receives = _pair_side(raw_out_addrs, mapping.get("output_amounts"), reasons, txid, "receives")

    # CO_SPEND is amount-independent (multi-input heuristic), exactly like the
    # reference builder — a row with a parity problem still contributes pairs.
    cospend_pairs = _build_cospend_pairs(in_addrs)

    # Every address that gets an edge needs a node, even when its edge pair was
    # dropped by a parity/amount error.
    wallet_addresses = tuple(
        dict.fromkeys(
            [addr for addr, _ in sends]
            + [addr for addr, _ in receives]
            + in_addrs
            + out_addrs
        )
    )

    raw_ts = mapping.get("ts")
    ts = str(raw_ts).strip() if raw_ts is not None else ""
    fee = _to_float(mapping.get("fee"))
    raw_script = mapping.get("script_type")
    script_type = str(raw_script).strip() if raw_script else ""

    raw_src_ip = mapping.get("src_ip")
    src_ip = str(raw_src_ip).strip() if raw_src_ip is not None else ""
    if not src_ip:
        reasons[SKIP_EMPTY_SRC_IP] = reasons.get(SKIP_EMPTY_SRC_IP, 0) + 1

    raw_country = mapping.get("geo_country")
    prepared = _PreparedRow(
        txid=txid,
        ts=ts or None,
        total_in=round(sum(amount for _, amount in sends), _AMOUNT_PLACES),
        total_out=round(sum(amount for _, amount in receives), _AMOUNT_PLACES),
        fee=round(fee, _AMOUNT_PLACES) if fee is not None else 0.0,
        script_type=script_type,
        ip_address=src_ip or None,
        ip_country=str(raw_country).strip() if raw_country else "",
        ip_asn=_to_int(mapping.get("asn"), default=0),
        ip_src_port=_to_int(mapping.get("src_port"), default=0),
        dst_port=_to_int(mapping.get("dst_port"), default=0),
        sends=tuple(sends),
        receives=tuple(receives),
        wallet_addresses=wallet_addresses,
        cospend_pairs=tuple(cospend_pairs),
    )
    return prepared, reasons


# ---------------------------------------------------------------------------
# Batching / writing
# ---------------------------------------------------------------------------


def _chunks(items: Sequence[_T], size: int) -> Iterator[Sequence[_T]]:
    """Yield successive slices of at most *size* items."""
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _dedupe(items: Iterable[_T], key: Callable[[_T], Hashable]) -> list[_T]:
    """De-duplicate by *key*, preserving first-seen order."""
    seen: set[Hashable] = set()
    out: list[_T] = []
    for item in items:
        k = key(item)
        if k in seen:
            continue
        seen.add(k)
        out.append(item)
    return out


def _execute_batch(
    driver: Driver,
    database: str,
    cypher: str,
    batch: Sequence[Mapping[str, Any]],
    label: str,
) -> SummaryCounters:
    """Run one ``UNWIND $batch`` write in a managed transaction and return counters.

    Raises:
        GraphWriteError: on any Neo4j failure, naming the statement and batch.
    """

    def _tx(tx: ManagedTransaction) -> SummaryCounters:
        return tx.run(cypher, parameters={"batch": list(batch)}).consume().counters

    try:
        with driver.session(database=database) as session:
            return session.execute_write(_tx)
    except Exception as exc:
        raise GraphWriteError(
            f"Neo4j write failed for {label} batch of {len(batch)} items into "
            f"database '{database}': {exc}"
        ) from exc


def _write_nodes(
    driver: Driver,
    database: str,
    cypher: str,
    payload: Sequence[Mapping[str, Any]],
    key: Callable[[Mapping[str, Any]], Hashable],
    label: str,
    batch_size: int,
    totals: _Totals,
    created_attribute: str,
) -> None:
    """De-duplicate, chunk and write a node payload; accumulate created counts."""
    if not payload:
        return
    for sub in _chunks(_dedupe(payload, key), batch_size):
        counters = _execute_batch(driver, database, cypher, sub, label)
        totals.cypher_batches += 1
        totals.bump(created_attribute, counters.nodes_created)


def _write_edges(
    driver: Driver,
    database: str,
    cypher: str,
    payload: Sequence[Mapping[str, Any]],
    key: Callable[[Mapping[str, Any]], Hashable],
    label: str,
    batch_size: int,
    totals: _Totals,
    created_attribute: str,
) -> None:
    """De-duplicate, chunk and write an edge payload; accumulate created counts."""
    if not payload:
        return
    for sub in _chunks(_dedupe(payload, key), batch_size):
        counters = _execute_batch(driver, database, cypher, sub, label)
        totals.cypher_batches += 1
        totals.bump(created_attribute, counters.relationships_created)


def ensure_graph_schema(service: GraphService) -> None:
    """Verify the uniqueness constraints that make MERGE safe.

    Raises:
        GraphSchemaError: if any required constraint is missing.
    """
    constraints = service.verify_constraints()
    missing = sorted(name for name, present in constraints.items() if not present)
    if missing:
        raise GraphSchemaError(
            f"Missing Neo4j uniqueness constraints: {missing}. MERGE cannot de-duplicate "
            "reliably without them. Apply backend/scripts/neo4j_init.cypher first."
        )
    logger.info("Neo4j schema constraints verified: %s", sorted(constraints))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def write_transactions_to_graph(
    rows: Sequence[Any],
    *,
    service: GraphService | None = None,
    database: str | None = None,
    row_batch_size: int | None = None,
    edge_batch_size: int | None = None,
    verify_schema: bool = True,
) -> GraphWriteSummary:
    """Write validated ingest rows into Neo4j as the SIH26146 property graph.

    Args:
        rows: Sequence of :class:`~app.schemas.ingest.TransactionRecord` objects
            or plain mappings with the same field names.
        service: An existing :class:`~app.services.graph_service.GraphService`.
            When omitted, one is created and closed around this call.
        database: Neo4j logical database name. Defaults to
            ``settings.neo4j_database``.
        row_batch_size: Rows consumed per in-memory slice. Defaults to
            ``settings.ingest_batch_size``.
        edge_batch_size: Items per Cypher UNWIND transaction. Defaults to
            ``settings.graph_neo4j_batch_size``; may not exceed 1 000.
        verify_schema: Check the uniqueness constraints before writing.

    Returns:
        A :class:`GraphWriteSummary` with submitted/created counts and skips.

    Raises:
        GraphSchemaError: required uniqueness constraints are missing.
        GraphWriteError: a row has an unsupported type, or Neo4j rejected a batch.
        ValueError: a batch size is non-positive or above the UNWIND cap.
    """
    if service is None:
        with GraphService() as owned_service:
            return write_transactions_to_graph(
                rows,
                service=owned_service,
                database=database,
                row_batch_size=row_batch_size,
                edge_batch_size=edge_batch_size,
                verify_schema=verify_schema,
            )

    rows = list(rows)
    if not rows:
        logger.info("Graph write: no rows supplied — nothing to do")
        return _Totals().as_summary(0.0)

    resolved_row_batch = row_batch_size if row_batch_size is not None else settings.ingest_batch_size
    resolved_edge_batch = (
        edge_batch_size if edge_batch_size is not None else settings.graph_neo4j_batch_size
    )
    if resolved_row_batch <= 0:
        raise ValueError(f"row_batch_size must be > 0, got {resolved_row_batch}")
    if resolved_edge_batch <= 0:
        raise ValueError(f"edge_batch_size must be > 0, got {resolved_edge_batch}")
    if resolved_edge_batch > _MAX_CYPHER_BATCH:
        raise ValueError(
            f"edge_batch_size must be <= {_MAX_CYPHER_BATCH} (Neo4j UNWIND contract), "
            f"got {resolved_edge_batch}"
        )

    service.connect()
    db_name = database or settings.neo4j_database
    if verify_schema:
        ensure_graph_schema(service)

    driver = service.driver
    totals = _Totals()
    warnings_emitted = 0
    started = time.perf_counter()

    for chunk in _chunks(rows, resolved_row_batch):
        prepared_rows: list[_PreparedRow] = []
        for raw_row in chunk:
            totals.rows_received += 1
            prepared, reasons = prepare_row(raw_row)
            for reason, count in reasons.items():
                totals.skip(reason, count)
                if count and warnings_emitted < _MAX_SKIP_WARNINGS:
                    warnings_emitted += 1
                    logger.warning("Graph write skip [%s] x%d", reason, count)
            if prepared is None:
                totals.rows_rejected += 1
                continue
            prepared_rows.append(prepared)
            totals.rows_written += 1

        if not prepared_rows:
            continue

        # --- Nodes ---------------------------------------------------------
        tx_payload = [
            {
                "txid": p.txid,
                "ts": p.ts,
                "total_in": p.total_in,
                "total_out": p.total_out,
                "fee": p.fee,
            }
            for p in prepared_rows
        ]
        wallet_payload = [{"address": addr} for p in prepared_rows for addr in p.wallet_addresses]
        ip_payload = [
            {
                "address": p.ip_address,
                "country": p.ip_country,
                "asn": p.ip_asn,
                "src_port": p.ip_src_port,
            }
            for p in prepared_rows
            if p.ip_address
        ]

        totals.transactions_submitted += len(tx_payload)
        totals.wallets_submitted += len(wallet_payload)
        totals.ips_submitted += len(ip_payload)

        _write_nodes(
            driver, db_name, _CYPHER_TRANSACTIONS, tx_payload,
            lambda r: r["txid"], "Transaction", resolved_edge_batch, totals,
            "transactions_created",
        )
        _write_nodes(
            driver, db_name, _CYPHER_WALLETS, wallet_payload,
            lambda r: r["address"], "Wallet", resolved_edge_batch, totals,
            "wallets_created",
        )
        _write_nodes(
            driver, db_name, _CYPHER_IPS, ip_payload,
            lambda r: r["address"], "IP", resolved_edge_batch, totals,
            "ips_created",
        )

        # --- Relationships --------------------------------------------------
        sends_payload = [
            {
                "txid": p.txid,
                "wallet_addr": addr,
                "amount": amount,
                "script_type": p.script_type,
            }
            for p in prepared_rows
            for addr, amount in p.sends
        ]
        receives_payload = [
            {"txid": p.txid, "wallet_addr": addr, "amount": amount}
            for p in prepared_rows
            for addr, amount in p.receives
        ]
        observed_payload = [
            {"txid": p.txid, "ip_addr": p.ip_address, "ts": p.ts, "dst_port": p.dst_port}
            for p in prepared_rows
            if p.ip_address
        ]
        cospend_payload = [
            {"addr1": a, "addr2": b}
            for p in prepared_rows
            for a, b in p.cospend_pairs
        ]

        _write_edges(
            driver, db_name, _CYPHER_SENDS, sends_payload,
            lambda r: (r["txid"], r["wallet_addr"], r["amount"], r["script_type"]),
            "SENDS", resolved_edge_batch, totals, "sends_created",
        )
        _write_edges(
            driver, db_name, _CYPHER_RECEIVES, receives_payload,
            lambda r: (r["txid"], r["wallet_addr"], r["amount"]),
            "RECEIVES", resolved_edge_batch, totals, "receives_created",
        )
        _write_edges(
            driver, db_name, _CYPHER_OBSERVED, observed_payload,
            lambda r: (r["txid"], r["ip_addr"], r["ts"], r["dst_port"]),
            "OBSERVED", resolved_edge_batch, totals, "observed_created",
        )
        _write_edges(
            driver, db_name, _CYPHER_COSPEND, cospend_payload,
            lambda r: (r["addr1"], r["addr2"]),
            "CO_SPEND", resolved_edge_batch, totals, "cospend_created",
        )

    wall = time.perf_counter() - started
    summary = totals.as_summary(round(wall, 3))
    logger.info(
        "Graph write complete: rows=%d written=%d rejected=%d | created "
        "tx=%d wallet=%d ip=%d sends=%d receives=%d observed=%d cospend=%d | "
        "%d batches in %.2fs",
        summary.rows_received, summary.rows_written, summary.rows_rejected,
        summary.transactions_created, summary.wallets_created, summary.ips_created,
        summary.sends_created, summary.receives_created, summary.observed_created,
        summary.cospend_created, summary.cypher_batches, summary.wall_seconds,
    )
    if summary.skip_reasons:
        logger.warning("Graph write skips: %s", dict(summary.skip_reasons))
    return summary
