"""FT-Transformer for Tabular Anomaly Detection.

Implements Gorishniy et al. (NeurIPS 2021) adapted for reconstruction-based
tabular anomaly detection on Bitcoin transaction features.

Components:
    - FeatureTokenizer: Vectorized projection from 18 tabular features to (18, 32).
    - Learnable [CLS] token prepended to sequence (sequence length 19).
    - Multi-Head Self-Attention (MHSA) Pre-LayerNorm Encoder (2 layers, 4 heads).
    - Linear reconstruction head projecting [CLS] output back to 18 features.
    - Anomaly score function: per-sample MSE reconstruction error.
    - Native attention extraction for feature-to-feature matrix and [CLS] attribution.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Tuple, Union

import numpy as np
import torch
import torch.nn as nn


class FeatureTokenizer(nn.Module):
    """Vectorized Feature Tokenizer for numerical tabular features.

    Transforms an input vector x in R^(B x num_features) into feature tokens
    X_tokens in R^(B x num_features x d_model) via independent linear projections:
        X_tokens = x.unsqueeze(-1) * W + b
    """

    def __init__(self, num_features: int = 18, d_model: int = 32) -> None:
        super().__init__()
        self.num_features = num_features
        self.d_model = d_model

        self.weight = nn.Parameter(torch.empty(num_features, d_model))
        self.bias = nn.Parameter(torch.empty(num_features, d_model))
        self.reset_parameters()

    def reset_parameters(self) -> None:
        """Kaiming uniform init for weights, zero init for biases."""
        nn.init.kaiming_uniform_(self.weight, a=math.sqrt(5))
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Tokenize numerical features into embedding space.

        Args:
            x: Tensor of shape [B, num_features]

        Returns:
            Tensor of shape [B, num_features, d_model]
        """
        if x.dim() != 2 or x.shape[1] != self.num_features:
            raise ValueError(
                f"Expected input shape [B, {self.num_features}], got {list(x.shape)}"
            )
        # [B, num_features, 1] * [num_features, d_model] + [num_features, d_model]
        return x.unsqueeze(-1) * self.weight + self.bias


class TransformerEncoderLayerWithAttn(nn.Module):
    """Pre-LayerNorm Transformer Encoder Layer with explicit attention extraction.

    Architecture:
        h^(l+1) = h^(l) + Dropout(MHA(LayerNorm(h^(l))))
        h^(l+1) = h^(l+1) + Dropout(FFN(LayerNorm(h^(l+1))))
    """

    def __init__(
        self,
        d_model: int = 32,
        n_heads: int = 4,
        d_ff: int = 64,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads

        self.norm1 = nn.LayerNorm(d_model)
        self.mha = nn.MultiheadAttention(
            embed_dim=d_model,
            num_heads=n_heads,
            dropout=dropout,
            batch_first=True,
        )
        self.dropout1 = nn.Dropout(dropout)

        self.norm2 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
        )
        self.dropout2 = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Forward pass through Pre-LN encoder layer.

        Args:
            x: Tensor of shape [B, seq_len, d_model]

        Returns:
            Tuple of:
                - transformed representations: shape [B, seq_len, d_model]
                - averaged attention weights: shape [B, seq_len, seq_len]
        """
        # Pre-LN Self-Attention
        norm_x = self.norm1(x)
        attn_out, attn_weights = self.mha(
            norm_x,
            norm_x,
            norm_x,
            need_weights=True,
            average_attn_weights=True,
        )
        x = x + self.dropout1(attn_out)

        # Pre-LN Feed-Forward Network
        norm_x2 = self.norm2(x)
        ffn_out = self.ffn(norm_x2)
        x = x + self.dropout2(ffn_out)

        return x, attn_weights


class FTTransformerAnomaly(nn.Module):
    """FT-Transformer adapted for Tabular Reconstruction Anomaly Detection.

    Projects tabular features into tokens, prepends a learnable [CLS] token,
    passes the sequence through Pre-LN Transformer layers, and projects the [CLS]
    representation to reconstruct all input features.

    Attributes:
        num_features: Number of input features (default: 18).
        d_model: Hidden embedding dimension (default: 32).
        n_layers: Number of Transformer encoder layers (default: 2).
        n_heads: Number of attention heads (default: 4).
        d_ff: FFN intermediate dimension (default: 64).
        dropout: Dropout probability (default: 0.1).
    """

    def __init__(
        self,
        num_features: int = 18,
        d_model: int = 32,
        n_layers: int = 2,
        n_heads: int = 4,
        d_ff: int = 64,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.num_features = num_features
        self.d_model = d_model
        self.n_layers = n_layers
        self.n_heads = n_heads

        # 1. Feature Tokenizer (18 -> 18 x 32)
        self.tokenizer = FeatureTokenizer(num_features=num_features, d_model=d_model)

        # 2. Learnable [CLS] token (1 x 1 x 32)
        self.cls_token = nn.Parameter(torch.empty(1, 1, d_model))
        nn.init.trunc_normal_(self.cls_token, std=0.02)

        # 3. Transformer Encoder Layers
        self.layers = nn.ModuleList([
            TransformerEncoderLayerWithAttn(
                d_model=d_model,
                n_heads=n_heads,
                d_ff=d_ff,
                dropout=dropout,
            )
            for _ in range(n_layers)
        ])

        # Final normalization before projection head
        self.norm = nn.LayerNorm(d_model)

        # 4. Reconstruction Anomaly Head (projects [CLS] representation back to 18 features)
        self.head = nn.Linear(d_model, num_features)

    def forward(
        self,
        x: torch.Tensor,
        return_attention: bool = False,
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, Dict[str, torch.Tensor]]]:
        """Forward pass: feature tokenization, MHSA encoding, and reconstruction.

        Args:
            x: Input feature tensor of shape [B, num_features].
            return_attention: Whether to return extracted attention matrices.

        Returns:
            If return_attention is False:
                Reconstructed tensor of shape [B, num_features].
            If return_attention is True:
                Tuple of (recon, attn_dict) where attn_dict contains:
                    - 'raw_attention': Full [B, 19, 19] attention matrix from final layer.
                    - 'cross_feature_attention': Feature-to-feature [B, 18, 18] slice.
                    - 'cls_attention': [CLS]-to-feature [B, 18] attribution slice.
        """
        b = x.shape[0]

        # Expand [CLS] token across batch
        cls_tokens = self.cls_token.expand(b, -1, -1)  # [B, 1, d_model]

        # Tokenize features
        x_tokens = self.tokenizer(x)  # [B, num_features, d_model]

        # Concatenate [CLS] + feature tokens -> [B, 1 + num_features, d_model]
        h = torch.cat([cls_tokens, x_tokens], dim=1)  # [B, 19, d_model]

        last_attn = None
        for layer in self.layers:
            h, last_attn = layer(h)

        h = self.norm(h)

        # Extract [CLS] representation (index 0)
        cls_output = h[:, 0, :]  # [B, d_model]

        # Reconstruct tabular features
        recon = self.head(cls_output)  # [B, num_features]

        if not return_attention:
            return recon

        assert last_attn is not None
        attn_dict: dict[str, torch.Tensor] = {
            "raw_attention": last_attn,  # [B, 19, 19]
            "cross_feature_attention": last_attn[:, 1:, 1:],  # [B, 18, 18]
            "cls_attention": last_attn[:, 0, 1:],  # [B, 18]
        }
        return recon, attn_dict

    def compute_anomaly_score(self, x: torch.Tensor) -> torch.Tensor:
        """Compute per-sample reconstruction MSE anomaly score.

        Args:
            x: Input feature tensor of shape [B, num_features].

        Returns:
            1D Tensor of shape [B] containing per-sample MSE.
        """
        recon = self.forward(x, return_attention=False)
        assert isinstance(recon, torch.Tensor)
        return torch.mean((x - recon) ** 2, dim=-1)

    def score_numpy(self, x_np: np.ndarray, batch_size: int = 2048) -> np.ndarray:
        """Compute anomaly scores for a NumPy array in batches on CPU/eval mode.

        Args:
            x_np: NumPy float array of shape [N, num_features].
            batch_size: Evaluation batch size (default: 2048).

        Returns:
            1D float32 NumPy array of shape [N] with anomaly scores.
        """
        self.eval()
        device = next(self.parameters()).device

        if len(x_np) == 0:
            return np.empty((0,), dtype=np.float32)

        scores: list[np.ndarray] = []
        with torch.no_grad():
            for i in range(0, len(x_np), batch_size):
                chunk = torch.from_numpy(x_np[i : i + batch_size]).float().to(device)
                batch_scores = self.compute_anomaly_score(chunk)
                scores.append(batch_scores.cpu().numpy())

        return np.concatenate(scores, axis=0).astype(np.float32)
