"""Pydantic v2 schemas for /api/v1/graph/{cluster_id}."""

from typing import Optional
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # wallet | transaction | ip
    risk_score: Optional[float] = None
    anomaly_score: Optional[float] = None
    is_seed: bool = False
    country: Optional[str] = None


class GraphLink(BaseModel):
    source: str
    target: str
    type: str  # SENDS | RECEIVES | CO_SPEND | OBSERVED
    amount: Optional[float] = None
    is_explanatory: bool = False


class GraphResponse(BaseModel):
    cluster_id: int
    nodes: list[GraphNode]
    links: list[GraphLink]
