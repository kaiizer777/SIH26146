"""Pydantic v2 schemas for the /api/v1/alerts endpoint."""

from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class AlertItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    address: str
    txid: Optional[str] = None
    cluster_id: Optional[int] = None
    anomaly_score: Optional[float] = None
    anomaly_rank_percentile: Optional[float] = None
    risk_score: Optional[float] = None
    composite_score: float
    verdict: str  # CRITICAL | HIGH | MEDIUM | LOW
    is_mixing: bool = False
    is_peeling_chain: bool = False
    chain_hops: Optional[int] = None
    is_seed: bool = False
    seed_family: Optional[str] = None
    triggered_rules: list[str] = []
    ts: Optional[str] = None
    src_ip: Optional[str] = None
    geo_country: Optional[str] = None


class AlertsResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[AlertItem]
