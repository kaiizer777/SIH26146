"""Phase 7 & Stage 3 ML-2 — Multi-Head Relational Graph Transformer (PyTorch Geometric).

Upgrades topological risk propagation from static neighbor aggregation (GraphSAGE)
to multi-head relational self-attention over graph topology using TransformerConv
(Shi et al., UniMP / NeurIPS 2020).

Architecture:
    Input features (D=8):
        [cluster_id_norm, max_anomaly_score, mixing_ratio, avg_fee_log,
         num_inputs_total_log, num_outputs_total_log, avg_output_entropy,
         seed_proximity_score]
    Relational Edge Encoding:
        3 wallet-to-wallet relation types:
            0: CO_SPEND      (common-input co-spending heuristic)
            1: TX_FLOW       (2-hop structural SENDS_TO -> RECEIVES transactional flow)
            2: PEELING_FLOW  (2-hop transactional flow with is_mixing=true / peeling chain)
        Edge embedding via nn.Embedding(3, edge_dim=16) or raw continuous edge_attr.
    TransformerConv Layers:
        Layer 1: TransformerConv(8, 32, heads=4, edge_dim=16, dropout=0.1, concat=True)
                 -> LayerNorm(128) -> ReLU() -> Dropout(0.1)
        Layer 2: TransformerConv(128, 16, heads=4, edge_dim=16, dropout=0.1, concat=False)
                 -> LayerNorm(16) -> ReLU()
    Binary Risk Head:
        Linear(16, 1) -> Sigmoid() -> risk_score in [0, 1]

Attention Extraction:
    Layer 2 exposes native multi-head edge attention weights alpha in [0, 1].
    When return_attention=True: returns (out, AttentionWeights(edge_index, alpha_mean, alpha))
    for downstream HUD edge glowing (FLEX-2).

Focal Loss (Lin et al., ICCV 2017):
    FL(p, y) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    gamma = 2.0, dynamic alpha = neg/pos ratio clamped to alpha_max=20.0.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor
from torch_geometric.data import Data
from torch_geometric.nn import TransformerConv

# Numerical floor for log in focal loss to avoid -inf
_EPS: float = 1e-7


class AttentionWeights(tuple):
    """Tuple containing (edge_index, alpha_mean) with rich metadata and dict-like access.

    Supports:
        - Unpacking as 2-tuple: edge_index, alpha_mean = attn
        - Named attribute access: attn.edge_index, attn.alpha_mean, attn.alpha, attn.heads
        - Key-based access: attn["edge_index"], attn["alpha_mean"], attn["alpha"]
    """

    edge_index: Tensor
    alpha_mean: Tensor
    alpha: Tensor
    heads: int

    def __new__(
        cls,
        edge_index: Union[Tensor, Tuple[Tensor, Tensor]],
        alpha_mean: Optional[Tensor] = None,
        alpha: Optional[Tensor] = None,
    ) -> AttentionWeights:
        # Support unpickling / single-tuple constructor
        if isinstance(edge_index, (tuple, list)) and alpha_mean is None:
            seq = edge_index
            edge_index, alpha_mean = seq[0], seq[1]
        if alpha_mean is None:
            raise TypeError("AttentionWeights requires alpha_mean tensor")
        obj = super().__new__(cls, (edge_index, alpha_mean))
        obj.alpha = alpha if alpha is not None else alpha_mean.unsqueeze(-1)
        obj.heads = int(obj.alpha.size(-1)) if obj.alpha.dim() >= 2 else 1
        return obj

    def __reduce__(self) -> tuple:
        """Custom pickle reducer ensuring robust serialization across processes and PyTorch."""
        return (AttentionWeights, (self[0], self[1], self.alpha))

    @property
    def edge_index(self) -> Tensor:
        """Graph edge indices [2, E]."""
        return self[0]

    @property
    def alpha_mean(self) -> Tensor:
        """Head-averaged attention weights [E], values in [0, 1]."""
        return self[1]

    def __getitem__(self, item: Any) -> Any:
        if isinstance(item, str):
            if item == "edge_index":
                return self[0]
            if item in ("alpha_mean", "alpha_avg"):
                return self[1]
            if item == "alpha":
                return self.alpha
            if item == "heads":
                return self.heads
            raise KeyError(f"Invalid key {item!r} on AttentionWeights. Available: edge_index, alpha_mean, alpha, heads")
        return super().__getitem__(item)

    def to_dict(self) -> Dict[str, Tensor]:
        """Convert to standard PyTorch dictionary."""
        return {
            "edge_index": self[0],
            "alpha_mean": self[1],
            "alpha": self.alpha,
        }


class RelationalGraphTransformer(nn.Module):
    """Multi-Head Relational Graph Transformer for topological risk scoring.

    Attributes:
        in_channels: Number of input node features (default: 8).
        hidden_dim: Per-head intermediate representation size for layer 1 (default: 32).
        out_dim: Output embedding dimension before head (default: 16).
        heads: Number of attention heads (default: 4).
        edge_dim: Dimensionality of relational edge embeddings (default: 16).
        num_edge_types: Number of discrete relational edge categories (default: 3).
        dropout: Dropout probability (default: 0.1).
    """

    def __init__(
        self,
        in_channels: int = 8,
        hidden_dim: int = 32,
        out_dim: int = 16,
        heads: int = 4,
        edge_dim: int = 16,
        num_edge_types: int = 3,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.in_channels = in_channels
        self.hidden_dim = hidden_dim
        self.out_dim = out_dim
        self.heads = heads
        self.edge_dim = edge_dim
        self.num_edge_types = num_edge_types
        self.dropout_p = dropout

        # 1. Multi-Relation Edge Embedding
        self.edge_emb = nn.Embedding(num_edge_types, edge_dim)
        self.edge_projections = nn.ModuleDict()

        # 2. Layer 1: Multi-Head TransformerConv with concatenation (32 * 4 = 128)
        self.conv1 = TransformerConv(
            in_channels=in_channels,
            out_channels=hidden_dim,
            heads=heads,
            edge_dim=edge_dim,
            dropout=dropout,
            concat=True,
        )
        self.norm1 = nn.LayerNorm(hidden_dim * heads)

        # 3. Layer 2: Multi-Head TransformerConv with averaging (out_channels = 16)
        self.conv2 = TransformerConv(
            in_channels=hidden_dim * heads,
            out_channels=out_dim,
            heads=heads,
            edge_dim=edge_dim,
            dropout=dropout,
            concat=False,
        )
        self.norm2 = nn.LayerNorm(out_dim)

        # 4. Binary Risk Head
        self.head = nn.Linear(out_dim, 1)

    def _resolve_edge_attr(
        self,
        x: Tensor,
        edge_index: Tensor,
        edge_attr: Optional[Tensor] = None,
        edge_type: Optional[Tensor] = None,
    ) -> Tensor:
        """Resolve edge attributes from either raw continuous edge_attr or discrete edge_type.

        If edge_type is provided: project via self.edge_emb.
        If continuous edge_attr is provided: validate or project to self.edge_dim.
        If neither is provided: return zeros of shape [E, self.edge_dim].
        """
        num_edges = edge_index.size(1)

        if edge_attr is not None:
            if edge_attr.dim() == 1:
                edge_attr = edge_attr.unsqueeze(-1)
            edge_attr = edge_attr.to(device=x.device, dtype=x.dtype)
            if edge_attr.size(-1) == self.edge_dim:
                return edge_attr
            # Fallback projection for continuous edge_attr with dimension != edge_dim
            proj_key = str(edge_attr.size(-1))
            if proj_key not in self.edge_projections:
                proj = nn.Linear(edge_attr.size(-1), self.edge_dim).to(device=x.device, dtype=x.dtype)
                self.edge_projections[proj_key] = proj
            return self.edge_projections[proj_key](edge_attr)

        if edge_type is not None:
            clamped_type = edge_type.view(-1).long().to(self.edge_emb.weight.device).clamp(0, self.num_edge_types - 1)
            return self.edge_emb(clamped_type)

        # Graceful fallback: zero tensor matching edge_index shape and device
        return x.new_zeros((num_edges, self.edge_dim))

    def forward(
        self,
        x: Union[Tensor, Data],
        edge_index: Optional[Tensor] = None,
        edge_attr: Optional[Tensor] = None,
        edge_type: Optional[Tensor] = None,
        return_attention: bool = False,
    ) -> Union[Tensor, Tuple[Tensor, AttentionWeights]]:
        """Forward pass through Relational Graph Transformer.

        Args:
            x: Node features [N, in_channels] or PyG Data object.
            edge_index: Graph connectivity tensor [2, E].
            edge_attr: Optional continuous edge attributes [E, edge_dim].
            edge_type: Optional integer relational types [E] in {0, 1, 2}.
            return_attention: If True, return (risk_scores, AttentionWeights).

        Returns:
            If return_attention=False:
                Tensor [N, 1] of risk scores in (0, 1).
            If return_attention=True:
                Tuple of (risk_scores [N, 1], AttentionWeights(edge_index, alpha_mean)).
        """
        # Support calling model(data) directly
        if isinstance(x, Data):
            data = x
            x = data.x
            edge_index = data.edge_index
            edge_attr = getattr(data, "edge_attr", None)
            edge_type = getattr(data, "edge_type", None)

        if edge_index is None:
            raise ValueError("edge_index must be provided when calling forward with a feature Tensor.")

        # Resolve edge embedding attributes
        resolved_edge_attr = self._resolve_edge_attr(x, edge_index, edge_attr, edge_type)

        # Layer 1: TransformerConv -> LayerNorm -> ReLU -> Dropout
        h1 = self.conv1(x, edge_index, edge_attr=resolved_edge_attr)
        h1 = self.norm1(h1)
        h1 = F.relu(h1)
        h1 = F.dropout(h1, p=self.dropout_p, training=self.training)

        # Layer 2: TransformerConv -> LayerNorm -> ReLU
        if return_attention:
            h2, (attn_edge_index, alpha) = self.conv2(
                h1,
                edge_index,
                edge_attr=resolved_edge_attr,
                return_attention_weights=True,
            )
            alpha_mean = alpha.mean(dim=-1)
            attn_weights = AttentionWeights(attn_edge_index, alpha_mean, alpha)
            h2 = self.norm2(h2)
            h2 = F.relu(h2)
            out = torch.sigmoid(self.head(h2))
            return out, attn_weights

        h2 = self.conv2(h1, edge_index, edge_attr=resolved_edge_attr)
        h2 = self.norm2(h2)
        h2 = F.relu(h2)
        out = torch.sigmoid(self.head(h2))
        return out

    def embed(
        self,
        x: Union[Tensor, Data],
        edge_index: Optional[Tensor] = None,
        edge_attr: Optional[Tensor] = None,
        edge_type: Optional[Tensor] = None,
    ) -> Tensor:
        """Extract 16-dimensional node embeddings before the final classification head.

        Useful for downstream explainability (e.g. GNNExplainer) and topological clustering.
        """
        if isinstance(x, Data):
            data = x
            x = data.x
            edge_index = data.edge_index
            edge_attr = getattr(data, "edge_attr", None)
            edge_type = getattr(data, "edge_type", None)

        if edge_index is None:
            raise ValueError("edge_index must be provided.")

        with torch.no_grad():
            resolved_edge_attr = self._resolve_edge_attr(x, edge_index, edge_attr, edge_type)
            h1 = F.relu(self.norm1(self.conv1(x, edge_index, edge_attr=resolved_edge_attr)))
            h2 = F.relu(self.norm2(self.conv2(h1, edge_index, edge_attr=resolved_edge_attr)))
        return h2


# ---------------------------------------------------------------------------
# Focal Loss
# ---------------------------------------------------------------------------

def focal_loss(
    pred: Tensor,
    target: Tensor,
    gamma: float = 2.0,
    alpha_pos: float = 1.0,
) -> Tensor:
    """Binary Focal Loss (Lin et al., ICCV 2017).

    FL(p, y) = -alpha_t * (1 - p_t)^gamma * log(p_t)

    Args:
        pred: Predicted probabilities, shape [N] or [N, 1], values in (0, 1).
        target: Binary ground-truth labels, shape [N] or [N, 1], values in {0, 1}.
        gamma: Focusing parameter (default: 2.0).
        alpha_pos: Positive class balancing weight (default: 1.0).

    Returns:
        Scalar mean focal loss.
    """
    pred = pred.view(-1)
    target = target.view(-1).float().to(pred.device)

    # Numerical stability clamp
    pred_clamped = pred.clamp(_EPS, 1.0 - _EPS)

    # p_t: probability of true class
    p_t = torch.where(target == 1.0, pred_clamped, 1.0 - pred_clamped)

    # alpha_t: weighting factor
    alpha_t = torch.where(target == 1.0, torch.full_like(pred, alpha_pos), torch.ones_like(pred))

    # Focusing weight
    focal_weight = (1.0 - p_t) ** gamma

    loss = -alpha_t * focal_weight * torch.log(p_t)
    return loss.mean()


def compute_alpha(n_neg: int, n_pos: int, alpha_max: float = 20.0) -> float:
    """Compute dynamic focal loss positive weight from class counts.

    alpha = min(n_neg / max(n_pos, 1), alpha_max)
    """
    if n_pos <= 0:
        return float(alpha_max)
    return float(min(n_neg / n_pos, alpha_max))
