"""Deterministic Unit Tests for FTTransformerAnomaly.

Verifies:
1. FeatureTokenizer shape [B, 18, 32] and parameter dimensions.
2. Forward output shape [B, 18] across batch sizes 1, 4, 32, 128.
3. Attention extraction: raw_attention [B, 19, 19] sums to 1.0,
   cross_feature_attention [B, 18, 18] in [0, 1], cls_attention [B, 18] in [0, 1].
4. Anomaly score non-negativity and shape [B].
5. NumPy batch scoring via score_numpy.
6. Gradient flow and Adam step with zero NaN/inf gradients.
7. Parameter count < 30,000 and serialized file footprint < 300 KB.
"""

from __future__ import annotations

import io
import pytest
import numpy as np
import torch
import torch.nn as nn

from app.ml.ft_transformer import (
    FeatureTokenizer,
    FTTransformerAnomaly,
    TransformerEncoderLayerWithAttn,
)


@pytest.fixture(autouse=True)
def set_seed():
    """Ensure deterministic random seeds for all tests."""
    torch.manual_seed(42)
    np.random.seed(42)


def test_feature_tokenizer_shape_and_params():
    """1. Tokenizer shape [B, 18, 32] and parameter dimensions."""
    tokenizer = FeatureTokenizer(num_features=18, d_model=32)

    # Verify parameter shapes
    assert tokenizer.weight.shape == (18, 32)
    assert tokenizer.bias.shape == (18, 32)
    assert sum(p.numel() for p in tokenizer.parameters()) == 18 * 32 * 2

    # Forward shape check
    batch_size = 7
    x = torch.randn(batch_size, 18)
    tokens = tokenizer(x)
    assert tokens.shape == (batch_size, 18, 32)

    # Input validation check
    with pytest.raises(ValueError):
        tokenizer(torch.randn(batch_size, 10))
    with pytest.raises(ValueError):
        tokenizer(torch.randn(batch_size, 18, 1))


def test_forward_output_shapes():
    """2. Forward output shape [B, 18] across batch sizes 1, 4, 32, 128."""
    model = FTTransformerAnomaly(
        num_features=18,
        d_model=32,
        n_layers=2,
        n_heads=4,
        d_ff=64,
        dropout=0.1,
    )
    model.eval()

    test_batches = [1, 4, 32, 128]
    for b in test_batches:
        x = torch.randn(b, 18)
        recon = model(x, return_attention=False)
        assert isinstance(recon, torch.Tensor)
        assert recon.shape == (b, 18)


def test_attention_extraction_properties():
    """3. Attention extraction: raw_attention [B, 19, 19] sums to 1.0,
    cross_feature_attention [B, 18, 18] in [0, 1], and cls_attention [B, 18] in [0, 1].
    """
    model = FTTransformerAnomaly(
        num_features=18,
        d_model=32,
        n_layers=2,
        n_heads=4,
        d_ff=64,
        dropout=0.1,
    )
    model.eval()

    b = 8
    x = torch.randn(b, 18)
    recon, attn = model(x, return_attention=True)

    assert recon.shape == (b, 18)
    assert "raw_attention" in attn
    assert "cross_feature_attention" in attn
    assert "cls_attention" in attn

    raw = attn["raw_attention"]
    cross = attn["cross_feature_attention"]
    cls_attn = attn["cls_attention"]

    # 1. Shapes
    assert raw.shape == (b, 19, 19)
    assert cross.shape == (b, 18, 18)
    assert cls_attn.shape == (b, 18)

    # 2. Raw attention distribution: sums along keys (last dimension) to 1.0
    row_sums = raw.sum(dim=-1)
    assert torch.allclose(row_sums, torch.ones_like(row_sums), atol=1e-5)

    # 3. Cross-feature attention slice bounds [0, 1]
    assert torch.all(cross >= 0.0)
    assert torch.all(cross <= 1.0 + 1e-6)

    # 4. CLS global attribution bounds [0, 1]
    assert torch.all(cls_attn >= 0.0)
    assert torch.all(cls_attn <= 1.0 + 1e-6)


def test_anomaly_score_properties():
    """4. Anomaly score non-negativity and shape [B]."""
    model = FTTransformerAnomaly()
    model.eval()

    b = 16
    x = torch.randn(b, 18)
    scores = model.compute_anomaly_score(x)

    assert scores.shape == (b,)
    assert torch.all(scores >= 0.0)
    assert torch.all(torch.isfinite(scores))

    # Test perfect reconstruction yields 0 MSE
    mock_input = torch.zeros(4, 18)
    with torch.no_grad():
        # Temporarily mock forward to return identical tensor
        orig_forward = model.forward
        model.forward = lambda t, return_attention=False: t  # type: ignore
        zero_score = model.compute_anomaly_score(mock_input)
        assert torch.allclose(zero_score, torch.zeros(4))
        model.forward = orig_forward


def test_numpy_batch_scoring():
    """5. Numpy batch scoring via score_numpy."""
    model = FTTransformerAnomaly()
    x_np = np.random.randn(105, 18).astype(np.float32)

    scores = model.score_numpy(x_np, batch_size=32)

    assert isinstance(scores, np.ndarray)
    assert scores.dtype == np.float32
    assert scores.shape == (105,)
    assert np.all(scores >= 0.0)
    assert np.all(np.isfinite(scores))

    # Empty array handling
    empty_res = model.score_numpy(np.empty((0, 18), dtype=np.float32))
    assert isinstance(empty_res, np.ndarray)
    assert empty_res.shape == (0,)


def test_gradient_flow_and_adam_step():
    """6. Gradient flow and Adam step with zero NaN/inf gradients."""
    model = FTTransformerAnomaly()
    model.train()

    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    x = torch.randn(16, 18)

    optimizer.zero_grad()
    recon = model(x, return_attention=False)
    assert isinstance(recon, torch.Tensor)
    loss = nn.MSELoss()(recon, x)
    loss.backward()

    # Verify gradients for all parameters
    for name, param in model.named_parameters():
        assert param.grad is not None, f"Parameter '{name}' received no gradient."
        assert not torch.isnan(param.grad).any(), f"Parameter '{name}' gradient has NaN."
        assert not torch.isinf(param.grad).any(), f"Parameter '{name}' gradient has Inf."
        assert param.grad.abs().sum() > 0.0, f"Parameter '{name}' gradient is entirely zero."

    # Verify Adam step updates weights without NaN
    optimizer.step()
    for name, param in model.named_parameters():
        assert not torch.isnan(param).any(), f"Parameter '{name}' has NaN after Adam step."
        assert not torch.isinf(param).any(), f"Parameter '{name}' has Inf after Adam step."


def test_parameter_count_and_file_footprint():
    """7. Parameter count <30,000 and serialized file footprint <300 KB."""
    model = FTTransformerAnomaly(
        num_features=18,
        d_model=32,
        n_layers=2,
        n_heads=4,
        d_ff=64,
        dropout=0.1,
    )

    total_params = sum(p.numel() for p in model.parameters())
    assert total_params < 30_000, f"Total parameters {total_params} exceeds 30,000 limit."
    assert total_params > 5_000, f"Total parameters {total_params} abnormally small."

    # Serialize to memory buffer
    buffer = io.BytesIO()
    torch.save(model.state_dict(), buffer)
    size_bytes = len(buffer.getvalue())
    size_kb = size_bytes / 1024.0

    assert size_kb < 300.0, f"Serialized footprint {size_kb:.2f} KB exceeds 300 KB limit."
