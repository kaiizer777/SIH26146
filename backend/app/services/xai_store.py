"""XAI Artifact Store — Phase 9.

Loads all four Phase 8 XAI JSON artifacts into memory once at application
startup (via FastAPI lifespan). Read-only after that point; safe for
concurrent async access with no locking.

Lookup API (all return None when address not found):
    get_composite(address)  → dict | None
    get_evidence(address)   → dict | None
    get_shap(address)       → list | None
    get_subgraph(address)   → dict | None
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import threading
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level store (populated by load())
# ---------------------------------------------------------------------------

_composite: dict[str, dict[str, Any]] = {}  # address → composite risk record
_evidence: dict[str, dict[str, Any]] = {}  # address → evidence trail
_shap: dict[str, list[dict[str, Any]]] = {}  # address → list of 18 feature attrs
_subgraph: dict[str, dict[str, Any]] = {}  # address → GNN subgraph

_loaded: bool = False
_store_lock = threading.RLock()


def load() -> None:
    """Load all four XAI artifacts from disk into module-level dicts.

    Called once from FastAPI lifespan. Subsequent calls are no-ops.
    """
    global _loaded
    with _store_lock:
        if _loaded:
            return

        _load_composite()
        _load_evidence()
        _load_shap()
        _load_subgraph()

        _loaded = True
        logger.info(
            "XAI store loaded: composite=%d evidence=%d shap=%d subgraph=%d",
            len(_composite),
            len(_evidence),
            len(_shap),
            len(_subgraph),
        )


# ---------------------------------------------------------------------------
# Public getters & mutation APIs
# ---------------------------------------------------------------------------


def upsert_batch(scored_items: list[dict[str, Any]]) -> tuple[int, int]:
    """Atomically upsert scored items into composite and evidence stores.

    Skips overwriting existing pre-indexed non-provisional dossiers.
    Returns: (upserted_count, skipped_existing_count)
    """
    upserted = 0
    skipped = 0
    with _store_lock:
        for item in scored_items:
            addr = item["address"]
            existing = _composite.get(addr)
            if existing is not None and not existing.get("provisional", False):
                skipped += 1
            else:
                _composite[addr] = item["composite_record"]
                _evidence[addr] = item["evidence_record"]
                upserted += 1
    return upserted, skipped


def upsert_composite(address: str, record: dict[str, Any]) -> None:
    """Thread-safe upsert into the in-memory composite store."""
    with _store_lock:
        _composite[address] = record


def upsert_evidence(address: str, record: dict[str, Any]) -> None:
    """Thread-safe upsert into the in-memory evidence store."""
    with _store_lock:
        _evidence[address] = record


def get_composite(address: str) -> dict[str, Any] | None:
    with _store_lock:
        return _composite.get(address)


def get_evidence(address: str) -> dict[str, Any] | None:
    with _store_lock:
        return _evidence.get(address)


def get_shap(address: str) -> list[dict[str, Any]] | None:
    with _store_lock:
        return _shap.get(address)


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
    logger.info("Loading %s from %s (%.2f MB)…", label, p, p.stat().st_size / 1024 / 1024)
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def _load_composite() -> None:
    """composite_risk_scores.json → keyed by address."""
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
    """evidence_trails.json → keyed by address."""
    raw = _load_json(settings.evidence_trails_path, "evidence_trails")
    if isinstance(raw, dict):
        _evidence.update(raw)
    elif isinstance(raw, list):
        for item in raw:
            addr = item.get("address") or item.get("wallet_address")
            if addr:
                _evidence[addr] = item


def _load_shap() -> None:
    """shap_attributions.json → keyed by address, value is list of 18 dicts."""
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


def _load_subgraph() -> None:
    """gnn_subgraphs.json → keyed by address."""
    raw = _load_json(settings.gnn_subgraphs_path, "gnn_subgraphs")
    if isinstance(raw, dict):
        _subgraph.update(raw)
    elif isinstance(raw, list):
        for item in raw:
            addr = item.get("address") or item.get("wallet_address")
            if addr:
                _subgraph[addr] = item
