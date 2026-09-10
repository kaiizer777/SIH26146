"""Pydantic v2 schemas for /api/v1/graph/{cluster_id}."""

from typing import Optional
from pydantic import BaseModel, Field


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
    attention_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Mean multi-head relational attention weight [0.0, 1.0]")
    head_attentions: Optional[dict[str, float]] = Field(None, description="Per-head attention weights (Head 1 Co-Spend, Head 2 Multi-Hop, Head 3 Seed Proximity, Head 4 Peeling Cascade)")


class GraphResponse(BaseModel):
    cluster_id: int
    nodes: list[GraphNode]
    links: list[GraphLink]
