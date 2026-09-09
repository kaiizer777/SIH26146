"""Pydantic v2 schemas for /api/v1/entity/{address}/explain."""

from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class ScoreBreakdown(BaseModel):
    anomaly_component: float
    risk_component: float
    rule_bonus: float
    mixing_indicator: float


class ShapAttribution(BaseModel):
    feature: str
    label: str  # Human-readable label
    value: float  # Attribution delta


class GnnSubgraphNode(BaseModel):
    id: str
    label: str
    node_type: str  # wallet | transaction | ip
    risk_score: Optional[float] = None
    importance: Optional[float] = None


class GnnSubgraphEdge(BaseModel):
    source: str
    target: str
    edge_type: Optional[str] = None
    importance: Optional[float] = None


class GnnSubgraph(BaseModel):
    nodes: list[GnnSubgraphNode] = []
    edges: list[GnnSubgraphEdge] = []


class EvidenceTrail(BaseModel):
    cluster_id: Optional[int] = None
    cluster_size: Optional[int] = None
    anomaly_score: Optional[float] = None
    anomaly_rank_percentile: Optional[float] = None
    is_mixing: bool = False
    is_peeling_chain: bool = False
    chain_hops: Optional[int] = None
    pass_through_ratio: Optional[float] = None
    triggered_rules: list[str] = []
    mixing_patterns: list[str] = []
    seed_family: Optional[str] = None
    provisional: bool = False
    extra: dict[str, Any] = {}


class EntityExplainResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    address: str
    composite_score: float
    verdict: str
    score_breakdown: ScoreBreakdown
    evidence_trail: EvidenceTrail
    shap_attributions: list[ShapAttribution]
    gnn_subgraph: Optional[GnnSubgraph] = None
    summary_narrative: str
    provisional: bool = False
