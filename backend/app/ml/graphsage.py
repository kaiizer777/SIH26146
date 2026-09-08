"""Phase 7 — GraphSAGE model for wallet risk scoring.

Architecture (3-layer GraphSAGE, mean aggregation):
    Layer 1: SAGEConv(in_channels, 64) → LayerNorm(64) → ReLU → Dropout(0.2)
    Layer 2: SAGEConv(64, 32)          → LayerNorm(32) → ReLU → Dropout(0.2)
    Layer 3: SAGEConv(32, 16)          → ReLU
    Head:    Linear(16, 1)             → Sigmoid  →  risk_score ∈ [0, 1]

Focal loss helper (Lin et al. ICCV 2017):
    FL(p, y) = -α_t · (1 - p_t)^γ · log(p_t)
    γ = 2.0   (paper-recommended default for balanced recall under class imbalance)
    α = computed from neg/pos ratio, clamped to avoid gradient explosion

Usage:
    model = GraphSAGEClassifier(in_channels=8)
    out = model(data.x, data.edge_index)   # shape [N, 1]
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor
from torch_geometric.nn import SAGEConv

# Numerical floor for log to prevent -inf in focal loss
_EPS: float = 1e-7


class GraphSAGEClassifier(nn.Module):
    """3-layer GraphSAGE with a binary risk-score head.

    Args:
        in_channels:  Number of input node features (D).
        hidden_1:     Output channels of layer 1 SAGEConv (default 64).
        hidden_2:     Output channels of layer 2 SAGEConv (default 32).
        embedding:    Output channels of layer 3 SAGEConv (default 16).
        dropout:      Dropout probability applied after layers 1 and 2 (default 0.2).
    """

    def __init__(
        self,
        in_channels: int,
        hidden_1: int = 64,
        hidden_2: int = 32,
        embedding: int = 16,
        dropout: float = 0.2,
    ) -> None:
        super().__init__()

        # Layer 1
        self.conv1 = SAGEConv(in_channels, hidden_1, aggr="mean")
        self.norm1 = nn.LayerNorm(hidden_1)

        # Layer 2
        self.conv2 = SAGEConv(hidden_1, hidden_2, aggr="mean")
        self.norm2 = nn.LayerNorm(hidden_2)

        # Layer 3 (embedding)
        self.conv3 = SAGEConv(hidden_2, embedding, aggr="mean")

        # Binary risk-score head
        self.head = nn.Linear(embedding, 1)

        self.dropout_p = dropout

    def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
        """Forward pass.

        Args:
            x:           Node feature matrix, shape [N, in_channels].
            edge_index:  Graph connectivity tensor, shape [2, E], dtype torch.long.

        Returns:
            risk_scores: Shape [N, 1], values in (0, 1) via sigmoid.
        """
        # Layer 1
        x = self.conv1(x, edge_index)
        x = self.norm1(x)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout_p, training=self.training)

        # Layer 2
        x = self.conv2(x, edge_index)
        x = self.norm2(x)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout_p, training=self.training)

        # Layer 3
        x = self.conv3(x, edge_index)
        x = F.relu(x)

        # Head
        return torch.sigmoid(self.head(x))

    def embed(self, x: Tensor, edge_index: Tensor) -> Tensor:
        """Return 16-dim embeddings (before the head), for Phase 8 GNNExplainer."""
        with torch.no_grad():
            x = F.relu(self.norm1(self.conv1(x, edge_index)))
            x = F.relu(self.norm2(self.conv2(x, edge_index)))
            x = F.relu(self.conv3(x, edge_index))
        return x


# ---------------------------------------------------------------------------
# Focal loss
# ---------------------------------------------------------------------------

def focal_loss(
    pred: Tensor,
    target: Tensor,
    gamma: float = 2.0,
    alpha_pos: float = 1.0,
) -> Tensor:
    """Binary focal loss (Lin et al., ICCV 2017).

    FL(p, y) = -α_t · (1 - p_t)^γ · log(p_t)

    Args:
        pred:       Predicted probabilities, shape [N] or [N, 1], values in (0, 1).
        target:     Binary labels, shape [N] or [N, 1], values in {0, 1}.
        gamma:      Focusing exponent (γ=2.0 per Lin et al.).
        alpha_pos:  Weight for the positive class (α).  The negative class weight
                    is implicitly (1 - α) when expressed on a [0,1] scale, but here
                    we use a direct pos/neg weighting formulation instead:
                        pos samples: weight = alpha_pos
                        neg samples: weight = 1.0
                    This matches PyTorch BCEWithLogitsLoss's `pos_weight` semantics.

    Returns:
        Scalar mean focal loss.
    """
    pred = pred.view(-1)
    target = target.view(-1).float()

    # Clamp to prevent log(0)
    pred_clamped = pred.clamp(_EPS, 1.0 - _EPS)

    # p_t: probability of the "true" class
    p_t = torch.where(target == 1.0, pred_clamped, 1.0 - pred_clamped)

    # α_t: per-sample weight
    alpha_t = torch.where(target == 1.0, torch.full_like(pred, alpha_pos), torch.ones_like(pred))

    # Focal weight
    focal_weight = (1.0 - p_t) ** gamma

    loss = -alpha_t * focal_weight * torch.log(p_t)
    return loss.mean()


def compute_alpha(n_neg: int, n_pos: int, alpha_max: float = 20.0) -> float:
    """Compute positive-class focal loss weight from class counts.

    α = min(n_neg / n_pos, alpha_max)

    Clamped to `alpha_max` to prevent gradient explosion when class imbalance
    is extreme (e.g. 1 positive per 10,000 negatives).

    Args:
        n_neg:      Count of negative-class training samples.
        n_pos:      Count of positive-class training samples.
        alpha_max:  Ceiling on the computed weight.

    Returns:
        float α for use as alpha_pos in focal_loss().
    """
    if n_pos == 0:
        return alpha_max
    return min(n_neg / n_pos, alpha_max)
