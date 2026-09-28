"""Alerts router — Phase 9.

GET /api/v1/alerts
  Paginated, filterable alert feed joining XAI composite risk scores with
  PostgreSQL transaction metadata for < 50ms response times.

Query parameters:
  limit     int  = 50    (max 200)
  offset    int  = 0
  sort      str  = "risk_desc"   | "risk_asc" | "anomaly_desc" | "ts_desc"
  verdict   str  = None  (CRITICAL | HIGH | MEDIUM | LOW)
  min_risk  float = None
  min_anomaly float = None
  is_mixing bool = None
  is_peeling_chain bool = None
  is_coinjoin bool = None
  cluster_id int = None
  search    str  = None  (prefix match on address)
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.schemas.alerts import AlertItem, AlertsResponse
import app.services.xai_store as xai_store
from app.services import risk_thresholds
from app.services.db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

_VALID_SORTS = {"risk_desc", "risk_asc", "anomaly_desc", "ts_desc"}
_VALID_VERDICTS = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}

# Human-readable sort label → (field, direction) for in-memory sort
_SORT_KEY = {
    "risk_desc":    (lambda r: r.get("composite_score", 0.0), True),
    "risk_asc":     (lambda r: r.get("composite_score", 0.0), False),
    "anomaly_desc": (lambda r: r.get("anomaly_score", 0.0), True),
    "ts_desc":      (lambda r: r.get("ts") or "", True),
}


def _record_score(rec: dict) -> float:
    """Numeric composite score of a stored record, 0.0 when absent/unusable.

    A record may legitimately carry a null score (never scored); the verdict
    must still be derivable, and a null must not raise out of the filter loop.
    """
    raw = rec.get("composite_score")
    if raw is None:
        return 0.0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def _record_verdict(rec: dict) -> str:
    """Canonical verdict for a record, derived from its score.

    The persisted ``verdict`` string is deliberately NOT read: it was written
    under the superseded 0.80 cut, so trusting it lets the alerts table report
    a different severity than the entity dossier for the same wallet. The
    label is a pure function of the score via the single shared ladder.
    """
    return risk_thresholds.map_verdict(_record_score(rec))


def _derived_verdict_counts(records: dict[str, dict]) -> dict[str, int]:
    """Histogram of canonical verdicts across the index.

    Computed with the same ``map_verdict`` call the rows and the verdict filter
    use, so the counts in this payload can never disagree with the labels in
    its own ``items``.
    """
    counts: dict[str, int] = {label: 0 for _, label in risk_thresholds.VERDICT_TIERS}
    for rec in records.values():
        counts[_record_verdict(rec)] += 1
    return counts


@router.get("", response_model=AlertsResponse, summary="Paginated, filterable alert feed")
async def get_alerts(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort: str = Query("risk_desc"),
    verdict: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None, ge=0.0, le=1.0),
    min_anomaly: Optional[float] = Query(None, ge=0.0),
    is_mixing: Optional[bool] = Query(None),
    is_peeling_chain: Optional[bool] = Query(None),
    is_coinjoin: Optional[bool] = Query(None),
    cluster_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
) -> AlertsResponse:
    """Return paginated alerts from the XAI composite risk index.

    Filters applied in-memory against the pre-loaded XAI store (O(1) per
    record). PG is hit once to fetch ts/src_ip metadata for the page items
    only — keeps total latency < 50ms for normal pages.
    """
    if sort not in _VALID_SORTS:
        raise HTTPException(status_code=422, detail=f"sort must be one of {sorted(_VALID_SORTS)}")
    target_verdicts: Optional[set[str]] = None
    if verdict:
        parsed = {v.strip().upper() for v in verdict.split(",") if v.strip()}
        invalid = parsed - _VALID_VERDICTS
        if invalid:
            raise HTTPException(
                status_code=422,
                detail=f"verdict must be one of {sorted(_VALID_VERDICTS)} (comma-separated allowed, got {sorted(invalid)})",
            )
        target_verdicts = parsed

    # --- 1. Pull all composite records from memory and apply filters ---
    all_records = xai_store._composite  # read-only dict, safe
    filtered: list[dict] = []

    search_lower = search.lower() if search else None

    for addr, rec in all_records.items():
        # verdict filter - same derived label the rows will carry
        if target_verdicts and _record_verdict(rec) not in target_verdicts:
            continue
        # min_risk filter
        if min_risk is not None and _record_score(rec) < min_risk:
            continue
        # min_anomaly filter
        if min_anomaly is not None and rec.get("anomaly_score", 0.0) < min_anomaly:
            continue
        # Heuristic calculation
        chain_hops = rec.get("chain_hops", 0) or 0
        rec_peeling = chain_hops > 0
        rec_mixing = bool(
            rec.get("mixing_indicator", 0.0) > 0.0
            or "CoinJoin" in str(rec.get("mixing_patterns", []))
            or "peeling" in str(rec.get("mixing_patterns", [])).lower()
        )
        rec_coinjoin = rec_mixing and not rec_peeling

        # Strict heuristic filtering
        if is_peeling_chain is not None and rec_peeling != is_peeling_chain:
            continue
        if is_coinjoin is not None and rec_coinjoin != is_coinjoin:
            continue
        if is_mixing is not None and rec_mixing != is_mixing:
            continue
        # cluster_id filter
        if cluster_id is not None and rec.get("cluster_id") != cluster_id:
            continue
        # search filter (address prefix)
        if search_lower and not addr.lower().startswith(search_lower):
            continue

        filtered.append(rec)

    # --- 2. Sort ---
    sort_key_fn, reverse = _SORT_KEY.get(sort, (_SORT_KEY["risk_desc"]))
    filtered.sort(key=sort_key_fn, reverse=reverse)

    total = len(filtered)

    # --- 3. Paginate ---
    page = filtered[offset: offset + limit]

    if not page:
        return AlertsResponse(total=total, offset=offset, limit=limit, items=[])

    # --- 4. Fetch PG metadata (ts, src_ip, txid) for page items only ---
    page_addresses = [r["address"] for r in page]
    pg_meta: dict[str, dict] = {}

    try:
        # Get the most recent transaction per address (input or output).
        # COALESCE(ts, ingested_at): every PG row has ingested_at (server default),
        # so wallets that have a PG row but no telemetry ts still show the ingest time.
        result = await db.execute(
            text("""
                SELECT DISTINCT ON (addr)
                    addr,
                    txid,
                    COALESCE(ts, ingested_at) AS ts,
                    src_ip::text,
                    geo_country
                FROM transactions,
                     LATERAL unnest(input_addresses || output_addresses) AS addr
                WHERE addr = ANY(:addrs)
                ORDER BY addr, COALESCE(ts, ingested_at) DESC
            """),
            {"addrs": page_addresses},
        )
        for row in result.fetchall():
            pg_meta[row[0]] = {
                "txid": row[1],
                "ts": row[2].isoformat() if row[2] else None,
                "src_ip": row[3],
                "geo_country": row[4],
            }
    except Exception as exc:
        # Degraded mode: PG unavailable — return XAI data without metadata
        logger.warning("PG metadata fetch failed for alerts page: %s", exc)

    # --- 5. Assemble AlertItem list ---
    items: list[AlertItem] = []
    for rec in page:
        addr = rec["address"]
        meta = pg_meta.get(addr, {})
        mixing_patterns = rec.get("mixing_patterns", [])
        triggered_rules = rec.get("triggered_rules", [])
        chain_hops = rec.get("chain_hops", 0) or 0
        rec_peeling = chain_hops > 0
        rec_mixing = bool(
            rec.get("mixing_indicator", 0.0) > 0.0
            or "CoinJoin" in str(rec.get("mixing_patterns", []))
            or "peeling" in str(rec.get("mixing_patterns", [])).lower()
        )

        seed_prox = rec.get("seed_wallet_proximity", 0.0) or 0.0
        is_seed_flag = seed_prox > 0.0 or bool(rec.get("is_seed", False))
        seed_family: Optional[str] = None
        for rule in triggered_rules:
            if "SEED" in rule.upper() or "RANSOMWARE" in rule.upper():
                seed_family = rule
                break

        items.append(AlertItem(
            address=addr,
            txid=meta.get("txid"),
            cluster_id=rec.get("cluster_id"),
            anomaly_score=rec.get("anomaly_score"),
            anomaly_rank_percentile=None,  # available in evidence_trails
            risk_score=rec.get("risk_score"),
            composite_score=_record_score(rec),
            verdict=_record_verdict(rec),
            is_mixing=rec_mixing,
            is_peeling_chain=rec_peeling,
            chain_hops=chain_hops if rec_peeling else None,
            is_seed=is_seed_flag,
            seed_family=seed_family,
            triggered_rules=triggered_rules,
            ts=meta.get("ts"),
            src_ip=meta.get("src_ip"),
            geo_country=meta.get("geo_country"),
        ))

    return AlertsResponse(
        total=total,
        offset=offset,
        limit=limit,
        items=items,
        total_indexed=xai_store.composite_count(),
        verdict_counts=_derived_verdict_counts(all_records),
    )
