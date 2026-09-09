"""Pydantic v2 schemas for /api/v1/entity/{address}/explain."""

from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScoreBreakdown(BaseModel):
    anomaly_component: float = Field(
        ...,
        description="FT-Transformer tabular anomaly score component (calibrated reconstruction MSE)",
    )
    risk_component: float = Field(
        ...,
        description="Relational Graph Transformer risk score component (topological graph propagation)",
    )
    rule_bonus: float = Field(
        ...,
        description="Heuristic laundering and seed proximity rule bonus",
    )
    mixing_indicator: float = Field(
        ...,
        description="Binary mixing pattern indicator component",
    )


class ShapAttribution(BaseModel):
    feature: str = Field(..., description="Canonical feature identifier")
    label: str = Field(..., description="Human-readable feature label")
    value: float = Field(..., description="Attribution delta (SHAP / attention contribution)")


class GnnSubgraphNode(BaseModel):
    id: str = Field(..., description="Node unique identifier")
    label: str = Field(..., description="Display label")
    node_type: str = Field(..., description="Node classification: wallet | transaction | ip")
    risk_score: Optional[float] = Field(
        None,
        description="Relational Graph Transformer risk score for this node",
    )
    importance: Optional[float] = Field(
        None,
        description="Attribution importance score",
    )


class GnnSubgraphEdge(BaseModel):
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    edge_type: Optional[str] = Field(
        None,
        description="Relational edge type: CO_SPEND | TX_FLOW | PEELING_FLOW | OBSERVED",
    )
    importance: Optional[float] = Field(
        None,
        description="Multi-head relational attention edge importance weight",
    )


class GnnSubgraph(BaseModel):
    nodes: list[GnnSubgraphNode] = Field(default_factory=list, description="Topological subgraph nodes")
    edges: list[GnnSubgraphEdge] = Field(default_factory=list, description="Topological subgraph edges")


class EvidenceTrail(BaseModel):
    cluster_id: Optional[int] = Field(None, description="Co-spend cluster ID")
    cluster_size: Optional[int] = Field(None, description="Number of wallets in co-spend cluster")
    anomaly_score: Optional[float] = Field(
        None,
        description="FT-Transformer tabular anomaly score (reconstruction MSE)",
    )
    anomaly_rank_percentile: Optional[float] = Field(
        None,
        description="FT-Transformer anomaly rank percentile across monitored population",
    )
    is_mixing: bool = Field(False, description="Flag indicating detected CoinJoin/mixing patterns")
    is_peeling_chain: bool = Field(False, description="Flag indicating detected peeling chain structure")
    chain_hops: Optional[int] = Field(None, description="Number of sequential peeling hops observed")
    pass_through_ratio: Optional[float] = Field(None, description="Peeling chain pass-through value ratio")
    triggered_rules: list[str] = Field(default_factory=list, description="List of triggered forensic detection rules")
    mixing_patterns: list[str] = Field(default_factory=list, description="Identified mixing patterns")
    seed_family: Optional[str] = Field(None, description="Associated Ransomwhere seed family")
    provisional: bool = Field(False, description="Whether this evidence trail is provisional / online scored")
    extra: dict[str, Any] = Field(default_factory=dict, description="Supplementary forensic metadata")


class EntityExplainResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    address: str = Field(..., description="Bitcoin wallet address")
    composite_score: float = Field(..., description="Final ensemble composite risk score in [0, 1]")
    verdict: str = Field(..., description="Categorical risk verdict: CRITICAL | HIGH | MEDIUM | LOW")
    score_breakdown: ScoreBreakdown = Field(..., description="Component breakdown of composite risk score")
    evidence_trail: EvidenceTrail = Field(..., description="Detailed forensic evidence trail")
    shap_attributions: list[ShapAttribution] = Field(..., description="Feature attribution contributions")
    gnn_subgraph: Optional[GnnSubgraph] = Field(None, description="Topological subgraph and relational attention network")
    summary_narrative: str = Field(..., description="Automated natural language forensic summary")
    provisional: bool = Field(False, description="Indicates if record was generated via inline provisional scorer")
