"""XAI Artifact Store â€” Phase 9, with a durable write-through overlay.

DURABILITY
----------
The Phase 8 artifacts in ``data/xai/*.json`` are FROZEN, read-only baselines
(``shap_attributions.json`` is txid-keyed with 4,839 entries dated 2026-09-08;
``gnn_subgraphs.json`` holds 100 addresses). They are still loaded exactly as
before at startup.

Newly computed SHAP / attention / subgraph / composite / evidence records are
written to a SEPARATE overlay directory (``data/xai/runtime/``) and are
re-applied on top of the frozen baseline at every startup. Two reasons this is
JSON-overlay and not PostgreSQL:

  1. Every consumer of this module (``routers/alerts.py``,
     ``routers/graph.py``, ``routers/entity.py``, ``main.py``) reaches the
     data through SYNCHRONOUS accessors, and two of them reach into
     ``xai_store._composite`` directly as a plain dict. A database-backed
     source of truth would require changing those call sites, which is out of
     scope and would break them.
  2. A new table would need an Alembic migration; this module must not own
     schema. The overlay needs no migration and is inert until something
     writes to it.

The overlay is append/upsert only, one JSON file per record kind, written
atomically (temp file + ``os.replace``) under a cross-process file lock, so
concurrent API workers and the Celery worker can all write safely and a crash
mid-write cannot corrupt the file. The frozen Phase 8 files are NEVER written
to.

Lookup API (all return None when the key is not found):
    get_composite(address)  â†’ dict | None      (keyed by ADDRESS)
    get_evidence(address)   â†’ dict | None      (keyed by ADDRESS)
    get_shap(txid)          â†’ list | None      (keyed by TXID)
    get_attention(key)      â†’ dict | None      (keyed by TXID, address also probed)
    get_subgraph(address)   â†’ dict | None      (keyed by ADDRESS)

KEYING â€” the one thing that bit this module before
--------------------------------------------------
The store is NOT uniformly address-keyed, and pretending otherwise caused a
real bug: ``routers/entity.py:588`` calls ``get_shap(txid)`` with a
transaction id. The write API therefore names its key parameter for what it
actually is:

    upsert_composite(address=...)   upsert_evidence(address=...)   ADDRESS
    upsert_shap(txid=...)           upsert_attention(txid=...)     TXID
    upsert_subgraph(address=...)                                  ADDRESS

``get_shap`` and ``get_attention`` keep their historical loose ``key``
parameter and probe both, so existing callers are unaffected.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Record kinds â€” the single source of truth for what a key means
# ---------------------------------------------------------------------------

KIND_COMPOSITE: str = "composite"  # keyed by ADDRESS
KIND_EVIDENCE: str = "evidence"  # keyed by ADDRESS
KIND_SHAP: str = "shap"  # keyed by TXID
KIND_ATTENTION: str = "attention"  # keyed by TXID
KIND_SUBGRAPH: str = "subgraph"  # keyed by ADDRESS

_ALL_KINDS: tuple[str, ...] = (
    KIND_COMPOSITE,
    KIND_EVIDENCE,
    KIND_SHAP,
    KIND_ATTENTION,
    KIND_SUBGRAPH,
)

#: On-disk schema version for the runtime overlay files.
_OVERLAY_SCHEMA_VERSION: int = 1

#: How long a writer waits for the cross-process overlay lock before giving up.
_LOCK_TIMEOUT_SECONDS: float = 15.0

#: A lock file older than this is considered abandoned by a crashed process.
_STALE_LOCK_SECONDS: float = 120.0

#: Poll interval while waiting for the overlay lock.
_LOCK_POLL_SECONDS: float = 0.02


class XaiStoreLockTimeout(RuntimeError):
    """Raised when the runtime overlay lock could not be acquired in time."""


# ---------------------------------------------------------------------------
# Module-level store (populated by load())
# ---------------------------------------------------------------------------

_composite: dict[str, dict[str, Any]] = {}  # address â†’ composite risk record
_evidence: dict[str, dict[str, Any]] = {}  # address â†’ evidence trail
_shap: dict[str, list[dict[str, Any]]] = {}  # txid â†’ list of 18 feature attrs
_attention: dict[str, dict[str, Any]] = {}  # txid â†’ attention payload
_subgraph: dict[str, dict[str, Any]] = {}  # address â†’ GNN subgraph

_loaded: bool = False
_store_lock = threading.RLock()


# ---------------------------------------------------------------------------
# Runtime overlay persistence
# ---------------------------------------------------------------------------


def runtime_dir() -> Path:
    """Return the directory holding the durable runtime overlay.

    Falls back to the frozen artifact directory only if ``xai_dir`` is unset.
    """
    configured = getattr(settings, "xai_dir", None)
    base = Path(configured) if configured else Path("data/xai")
    return base / "runtime"


def _overlay_path(kind: str) -> Path:
    """Return the JSON file backing a record kind."""
    return runtime_dir() / f"{kind}.json"


def _read_overlay_file(path: Path) -> dict[str, Any]:
    """Read one overlay file, tolerating absence and corruption.

    Corruption is logged loudly and treated as empty rather than silently
    dropped â€” a truncated overlay must be visible in the logs.
    """
    if not path.exists():
        return {}
    try:
        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Runtime overlay %s is unreadable (%s) â€” treating as empty", path, exc)
        return {}

    if not isinstance(payload, dict):
        logger.error("Runtime overlay %s has unexpected shape %s â€” treating as empty", path, type(payload).__name__)
        return {}

    records = payload.get("records")
    if not isinstance(records, dict):
        logger.error("Runtime overlay %s has no 'records' object â€” treating as empty", path)
        return {}
    return records


@contextmanager
def _overlay_lock(path: Path) -> Iterator[None]:
    """Hold a cross-process exclusive lock for an overlay file.

    Uses an ``O_CREAT|O_EXCL`` lock file so it works across the API worker,
    the Celery worker and uvicorn reloads. Stale locks (from a crashed
    process) are broken after ``_STALE_LOCK_SECONDS``.

    Raises:
        XaiStoreLockTimeout: if the lock is still held after the timeout.
    """
    lock_path = path.with_suffix(path.suffix + ".lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    deadline = time.monotonic() + _LOCK_TIMEOUT_SECONDS
    fd: int | None = None
    while True:
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except FileExistsError:
            try:
                age = time.time() - lock_path.stat().st_mtime
            except OSError:
                age = 0.0
            if age > _STALE_LOCK_SECONDS:
                logger.warning("Breaking stale overlay lock %s (age=%.0fs)", lock_path, age)
                try:
                    lock_path.unlink()
                except OSError as exc:
                    logger.error("Failed to remove stale lock %s: %s", lock_path, exc)
                continue
            if time.monotonic() >= deadline:
                raise XaiStoreLockTimeout(
                    f"Timed out after {_LOCK_TIMEOUT_SECONDS:.0f}s waiting for overlay lock {lock_path}"
                ) from None
            time.sleep(_LOCK_POLL_SECONDS)

    try:
        os.write(fd, str(os.getpid()).encode("ascii"))
        os.close(fd)
        fd = None
        yield
    finally:
        if fd is not None:
            os.close(fd)
        try:
            lock_path.unlink()
        except FileNotFoundError:
            pass
        except OSError as exc:
            logger.error("Failed to release overlay lock %s: %s", lock_path, exc)


def _write_overlay_file(path: Path, records: dict[str, Any]) -> None:
    """Atomically replace an overlay file with ``records``.

    Writes to a temp file in the same directory, fsyncs, then ``os.replace``s
    it into place so readers never observe a partial file.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": _OVERLAY_SCHEMA_VERSION,
        "kind": path.stem,
        "records": records,
    }
    handle = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=str(path.parent),
        prefix=f".{path.stem}.",
        suffix=".tmp",
        delete=False,
    )
    temp_name = handle.name
    try:
        with handle:
            json.dump(payload, handle, ensure_ascii=False)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except OSError:
            pass
        raise


def _persist_kind(kind: str, records: dict[str, Any]) -> None:
    """Merge ``records`` into the on-disk overlay for ``kind`` and flush.

    Re-reads the file under the lock before merging so a second process's
    writes are not clobbered.

    Raises:
        XaiStoreLockTimeout: if the lock cannot be acquired.
        OSError: if the file cannot be written.
    """
    path = _overlay_path(kind)
    with _overlay_lock(path):
        merged = _read_overlay_file(path)
        merged.update(records)
        _write_overlay_file(path, merged)


def _apply_overlay() -> int:
    """Merge every runtime overlay file into the in-memory dicts.

    Called by :func:`load` AFTER the frozen artifacts so freshly computed
    values win over the baseline for the same key.

    Returns:
        Total number of overlay records applied.
    """
    with _store_lock:
        applied = 0
        for kind in _ALL_KINDS:
            path = _overlay_path(kind)
            if not path.exists():
                continue
            records = _read_overlay_file(path)
            if not records:
                continue
            target = {
                KIND_COMPOSITE: _composite,
                KIND_EVIDENCE: _evidence,
                KIND_SHAP: _shap,
                KIND_ATTENTION: _attention,
                KIND_SUBGRAPH: _subgraph,
            }[kind]
            target.update(records)
            applied += len(records)
            logger.info("Applied %d durable '%s' records from %s", len(records), kind, path)
        return applied


def runtime_record_counts() -> dict[str, int]:
    """Return the per-kind record counts currently persisted to disk."""
    return {kind: len(_read_overlay_file(_overlay_path(kind))) for kind in _ALL_KINDS}



def load() -> None:
    """Load the frozen Phase 8 artifacts, then apply the durable overlay.

    Called once from FastAPI lifespan. Subsequent calls are no-ops. Order
    matters: the frozen artifacts form the baseline and the runtime overlay is
    applied on top, so a record computed after ingest wins over a stale one.
    """
    global _loaded
    with _store_lock:
        if _loaded:
            return

        _load_composite()
        _load_evidence()
        _load_shap()
        _load_attention()
        _load_subgraph()
        overlay_applied = _apply_overlay()

        _loaded = True

        # Inspect loaded artifact provenance and active architecture versions
        use_legacy_anomaly = getattr(settings, "use_legacy_anomaly_model", getattr(settings, "use_legacy_models", False))
        use_legacy_risk = getattr(settings, "use_legacy_risk_model", getattr(settings, "use_legacy_models", False))
        models_dir = Path(settings.models_dir)
        provenance_parts: list[str] = []

        if models_dir.exists():
            if use_legacy_anomaly:
                ae_files = sorted(models_dir.glob("autoencoder_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
                if ae_files:
                    provenance_parts.append(f"Autoencoder={ae_files[0].name}")
            else:
                ft_files = sorted(models_dir.glob("ft_transformer_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
                if ft_files:
                    provenance_parts.append(f"FT-Transformer={ft_files[0].name}")

            if use_legacy_risk:
                gs_files = sorted(models_dir.glob("graphsage_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
                if gs_files:
                    provenance_parts.append(f"GraphSAGE={gs_files[0].name}")
            else:
                gt_files = sorted(models_dir.glob("graph_transformer_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
                if gt_files:
                    provenance_parts.append(f"RelationalGraphTransformer={gt_files[0].name}")

        anom_label = "Autoencoder (legacy fallback)" if use_legacy_anomaly else "FT-Transformer (primary)"
        risk_label = "GraphSAGE (legacy fallback)" if use_legacy_risk else "Graph Transformer (primary)"
        logger.info("[MODEL CONFIG] Anomaly: %s | Risk: %s", anom_label, risk_label)

        prov_str = ", ".join(provenance_parts) if provenance_parts else f"{anom_label} + {risk_label}"

        logger.info(
            "XAI store loaded: composite=%d evidence=%d shap=%d attention=%d subgraph=%d "
            "(durable overlay records applied: %d; active architecture: %s)",
            len(_composite),
            len(_evidence),
            len(_shap),
            len(_attention),
            len(_subgraph),
            overlay_applied,
            prov_str,
        )


def get_provenance() -> dict[str, str]:
    """Return dictionary of active model architectures and checkpoint provenance."""
    use_legacy_anomaly = getattr(settings, "use_legacy_anomaly_model", getattr(settings, "use_legacy_models", False))
    use_legacy_risk = getattr(settings, "use_legacy_risk_model", getattr(settings, "use_legacy_models", False))
    models_dir = Path(settings.models_dir)

    res: dict[str, str] = {
        "anomaly_architecture": "Autoencoder" if use_legacy_anomaly else "FTTransformerAnomaly",
        "risk_architecture": "GraphSAGEClassifier" if use_legacy_risk else "RelationalGraphTransformer",
    }

    if models_dir.exists():
        if use_legacy_anomaly:
            ae_files = sorted(models_dir.glob("autoencoder_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
            if ae_files:
                res["autoencoder_checkpoint"] = ae_files[0].name
                res["anomaly_checkpoint"] = ae_files[0].name
        else:
            ft_files = sorted(models_dir.glob("ft_transformer_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
            if ft_files:
                res["ft_transformer_checkpoint"] = ft_files[0].name
                res["anomaly_checkpoint"] = ft_files[0].name

        if use_legacy_risk:
            gs_files = sorted(models_dir.glob("graphsage_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
            if gs_files:
                res["graphsage_checkpoint"] = gs_files[0].name
                res["risk_checkpoint"] = gs_files[0].name
        else:
            gt_files = sorted(models_dir.glob("graph_transformer_*.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
            if gt_files:
                res["graph_transformer_checkpoint"] = gt_files[0].name
                res["risk_checkpoint"] = gt_files[0].name

    anom_stem = Path(res.get("anomaly_checkpoint", res["anomaly_architecture"])).stem
    risk_stem = Path(res.get("risk_checkpoint", res["risk_architecture"])).stem
    res["model_version"] = f"{anom_stem}+{risk_stem}"
    return res


# ---------------------------------------------------------------------------
# Public getters & mutation APIs
# ---------------------------------------------------------------------------


@dataclass
class UpsertBatchReport:
    """Outcome of :func:`upsert_batch_detailed`.

    Replaces the ambiguous ``(upserted, skipped)`` tuple so callers can tell
    a genuine re-index apart from a protected pre-indexed dossier.
    """

    created: int = 0
    """Addresses that had no composite record before."""
    updated: int = 0
    """Addresses whose provisional record was refreshed in place."""
    retained: int = 0
    """Pre-indexed non-provisional dossiers deliberately left untouched."""
    persisted: int = 0
    """Records written to the durable overlay."""

    @property
    def touched(self) -> int:
        """Addresses whose in-memory record was created or refreshed."""
        return self.created + self.updated

    def as_tuple(self) -> tuple[int, int]:
        """Return the legacy ``(upserted, skipped_existing)`` pair.

        ``upserted`` = created + updated. ``skipped_existing`` = retained, so
        the historical meaning of the second element ("addresses whose
        pre-indexed dossier was not overwritten") is preserved exactly.
        """
        return self.touched, self.retained


def upsert_batch_detailed(
    scored_items: list[dict[str, Any]],
    *,
    refresh_existing: bool = False,
) -> UpsertBatchReport:
    """Upsert scored items and persist them durably.

    Replaces the previous behaviour, which silently skipped any address
    already present in ``_composite`` and reported it only as
    ``skipped_existing`` â€” so re-ingesting a dataset updated nothing and the
    caller had no way to tell that from a no-op.

    New policy:
        * Address absent                    -> created, persisted.
        * Address present and either side is provisional, or
          ``refresh_existing=True``         -> record refreshed, persisted.
        * Address present, pre-indexed non-provisional dossier, and
          ``refresh_existing=False``        -> retained and LOGGED, not
          silently dropped. Use ``refresh_existing=True`` to overwrite the
          frozen dossier deliberately.

    Args:
        scored_items: Items from ``inline_scorer.score_batch()``; each needs
            ``address``, ``composite_record`` and ``evidence_record``.
        refresh_existing: Overwrite pre-indexed non-provisional dossiers.

    Returns:
        An :class:`UpsertBatchReport`.

    Raises:
        KeyError: if an item is missing a required field.
        XaiStoreLockTimeout: if the durable overlay cannot be locked.
    """
    report = UpsertBatchReport()
    retained_log: list[str] = []

    with _store_lock:
        new_composite: dict[str, Any] = {}
        new_evidence: dict[str, Any] = {}

        for item in scored_items:
            address = item["address"]
            composite_record = item["composite_record"]
            evidence_record = item["evidence_record"]

            existing = _composite.get(address)
            if existing is not None and not existing.get("provisional", False):
                if not refresh_existing:
                    report.retained += 1
                    if len(retained_log) < 20:
                        retained_log.append(address)
                    continue
                report.updated += 1
            elif existing is None:
                report.created += 1
            else:
                report.updated += 1

            _composite[address] = composite_record
            _evidence[address] = evidence_record
            new_composite[address] = composite_record
            new_evidence[address] = evidence_record

        if retained_log:
            logger.warning(
                "upsert_batch retained %d pre-indexed dossier(s) without overwriting them "
                "(sample: %s). Pass refresh_existing=True to replace them.",
                report.retained,
                ", ".join(a[:12] + "..." for a in retained_log),
            )

        if new_composite:
            _persist_kind(KIND_COMPOSITE, new_composite)
            _persist_kind(KIND_EVIDENCE, new_evidence)
            report.persisted = len(new_composite) + len(new_evidence)
            logger.info(
                "upsert_batch: created=%d updated=%d retained=%d persisted=%d",
                report.created,
                report.updated,
                report.retained,
                report.persisted,
            )

    return report


def upsert_batch(scored_items: list[dict[str, Any]]) -> tuple[int, int]:
    """Atomically upsert scored items into composite and evidence stores.

    Backward-compatible wrapper around :func:`upsert_batch_detailed` returning
    the historical ``(upserted_count, skipped_existing_count)`` pair that
    ``routers/ingest.py`` and ``routers/entity.py`` unpack.

    Args:
        scored_items: Items from ``inline_scorer.score_batch()``.

    Returns:
        (addresses created-or-refreshed, pre-indexed dossiers retained).
    """
    return upsert_batch_detailed(scored_items).as_tuple()


def upsert_composite(address: str, record: dict[str, Any], *, persist: bool = True) -> None:
    """Thread-safe upsert into the composite store (keyed by ADDRESS).

    Args:
        address: Wallet address.
        record: Composite risk record.
        persist: Also write through to the durable overlay.
    """
    with _store_lock:
        _composite[address] = record
        if persist:
            _persist_kind(KIND_COMPOSITE, {address: record})


def upsert_evidence(address: str, record: dict[str, Any], *, persist: bool = True) -> None:
    """Thread-safe upsert into the evidence store (keyed by ADDRESS).

    Args:
        address: Wallet address.
        record: Evidence trail record.
        persist: Also write through to the durable overlay.
    """
    with _store_lock:
        _evidence[address] = record
        if persist:
            _persist_kind(KIND_EVIDENCE, {address: record})


def upsert_shap(txid: str, attributions: list[dict[str, Any]], *, persist: bool = True) -> None:
    """Store SHAP attributions. KEYED BY TXID, not by address.

    This is the txid keying the frozen ``shap_attributions.json`` artifact
    uses, and it is what ``routers/entity.py:588`` looks up. The parameter is
    named ``txid`` so a future caller cannot repeat the address/txid mix-up.

    Args:
        txid: 64-hex transaction id.
        attributions: List of dicts as produced by
            ``shap_service.ShapExplanation.to_store_records()``.
        persist: Also write through to the durable overlay.

    Raises:
        ValueError: if ``txid`` is empty or ``attributions`` is not a list.
    """
    if not txid:
        raise ValueError("upsert_shap requires a non-empty txid.")
    if not isinstance(attributions, list):
        raise ValueError(f"attributions must be a list, got {type(attributions).__name__}")

    with _store_lock:
        _shap[txid] = attributions
        if persist:
            _persist_kind(KIND_SHAP, {txid: attributions})


def upsert_attention(txid: str, payload: dict[str, Any], *, persist: bool = True) -> None:
    """Store an attention payload. KEYED BY TXID.

    Mirrors :func:`upsert_shap` so SHAP and attention for one transaction are
    always written under the same key. Payload shape matches the frozen
    artifact: ``{"cross_feature_attention": 18x18, "cls_attention": 18}``.

    Args:
        txid: 64-hex transaction id.
        payload: Attention payload.
        persist: Also write through to the durable overlay.

    Raises:
        ValueError: if ``txid`` is empty or ``payload`` is not a dict.
    """
    if not txid:
        raise ValueError("upsert_attention requires a non-empty txid.")
    if not isinstance(payload, dict):
        raise ValueError(f"payload must be a dict, got {type(payload).__name__}")

    with _store_lock:
        _attention[txid] = payload
        if persist:
            _persist_kind(KIND_ATTENTION, {txid: payload})


def upsert_subgraph(address: str, subgraph: dict[str, Any], *, persist: bool = True) -> None:
    """Store a GNN subgraph. KEYED BY ADDRESS.

    Args:
        address: Wallet address (the subgraph ego node).
        subgraph: Dict with ``nodes`` / ``edges`` keys.
        persist: Also write through to the durable overlay.

    Raises:
        ValueError: if ``address`` is empty or ``subgraph`` is not a dict.
    """
    if not address:
        raise ValueError("upsert_subgraph requires a non-empty address.")
    if not isinstance(subgraph, dict):
        raise ValueError(f"subgraph must be a dict, got {type(subgraph).__name__}")

    with _store_lock:
        _subgraph[address] = subgraph
        if persist:
            _persist_kind(KIND_SUBGRAPH, {address: subgraph})


def get_composite(address: str) -> dict[str, Any] | None:
    with _store_lock:
        return _composite.get(address)


def get_evidence(address: str) -> dict[str, Any] | None:
    with _store_lock:
        return _evidence.get(address)


def get_shap(key: str) -> list[dict[str, Any]] | None:
    """Return SHAP attributions for a TXID (falls back to an address key).

    Kept loose for backward compatibility: the frozen artifact is txid-keyed
    but older writers used address keys.
    """
    with _store_lock:
        return _shap.get(key)


def get_attention(key: str) -> dict[str, Any] | None:
    """Return the attention payload for a TXID (or address)."""
    with _store_lock:
        return _attention.get(key)


def get_subgraph(address: str) -> dict[str, Any] | None:
    with _store_lock:
        return _subgraph.get(address)


def all_addresses() -> list[str]:
    """Return every address in the composite risk index."""
    with _store_lock:
        return list(_composite.keys())


def composite_count() -> int:
    with _store_lock:
        return len(_composite)


def verdict_counts() -> dict[str, int]:
    """Return {verdict: count} across all indexed wallets."""
    counts: dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    with _store_lock:
        records = list(_composite.values())
    for record in records:
        v = record.get("verdict", "LOW")
        if v in counts:
            counts[v] += 1
    return counts


# ---------------------------------------------------------------------------
# Private loaders
# ---------------------------------------------------------------------------


def _load_json(path: str | Path, label: str) -> Any:
    p = Path(path)
    if not p.exists():
        logger.error("XAI artifact not found: %s (%s)", p, label)
        return {}
    logger.info("Loading %s from %s (%.2f MB)â€¦", label, p, p.stat().st_size / 1024 / 1024)
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def _load_composite() -> None:
    """composite_risk_scores.json â†’ keyed by address."""
    raw = _load_json(settings.composite_risk_scores_path, "composite_risk_scores")
    if isinstance(raw, dict):
        # Already keyed by address
        _composite.update(raw)
    elif isinstance(raw, list):
        for item in raw:
            addr = item.get("address") or item.get("wallet_address")
            if addr:
                _composite[addr] = item


def _load_evidence() -> None:
    """evidence_trails.json â†’ keyed by address."""
    raw = _load_json(settings.evidence_trails_path, "evidence_trails")
    if isinstance(raw, dict):
        _evidence.update(raw)
    elif isinstance(raw, list):
        for item in raw:
            addr = item.get("address") or item.get("wallet_address")
            if addr:
                _evidence[addr] = item


def _load_shap() -> None:
    """shap_attributions.json â†’ keyed by address, value is list of 18 dicts."""
    raw = _load_json(settings.shap_attributions_path, "shap_attributions")
    if isinstance(raw, dict):
        # Could be {address: {features: [...]}} or {address: [...]}
        for addr, payload in raw.items():
            if isinstance(payload, list):
                _shap[addr] = payload
            elif isinstance(payload, dict):
                features = payload.get("features") or payload.get("attributions") or []
                _shap[addr] = features
    elif isinstance(raw, list):
        for item in raw:
            addr = item.get("address") or item.get("wallet_address")
            if addr:
                features = item.get("features") or item.get("attributions") or []
                _shap[addr] = features


def _load_attention() -> None:
    """attention_matrices.json â†’ keyed by txid or address."""
    p = Path(getattr(settings, "attention_matrices_path", "data/xai/attention_matrices.json"))
    if not p.exists():
        logger.info("Attention matrices artifact not found: %s", p)
        return
    raw = _load_json(p, "attention_matrices")
    if isinstance(raw, dict):
        _attention.update(raw)


def _load_subgraph() -> None:
    """gnn_subgraphs.json â†’ keyed by address."""
    raw = _load_json(settings.gnn_subgraphs_path, "gnn_subgraphs")
    if isinstance(raw, dict):
        _subgraph.update(raw)
    elif isinstance(raw, list):
        for item in raw:
            addr = item.get("address") or item.get("wallet_address")
            if addr:
                _subgraph[addr] = item


def reset_store_for_tests() -> None:
    """Reset store singleton state for testing fallback configurations.

    Clears the in-memory dicts and the loaded flag only. The durable overlay
    on disk is intentionally preserved, so a subsequent :func:`load` replays
    it exactly as a process restart would.
    """
    global _composite, _evidence, _shap, _attention, _subgraph, _loaded
    with _store_lock:
        _composite = {}
        _evidence = {}
        _shap = {}
        _attention = {}
        _subgraph = {}
        _loaded = False


