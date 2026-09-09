"""Unit tests for Stage 3 ML-2 Relational Graph Transformer (PyTorch Geometric).

Verifies:
    1. Forward pass output shapes on synthetic PyG graphs (single and batched).
    2. Multi-relation edge embedding updates via autograd across types {0, 1, 2}.
    3. Attention weight extraction, head-averaged weights, and bounds in [0, 1].
    4. Focal loss gradient flow, absence of NaNs/Infs, and AdamW optimization step.
    5. Parameter count < 50,000 and serialized model footprint < 1.5 MB.
    6. Edge attribute fallback handling (continuous edge_attr, None types, etc.).
"""

from __future__ import annotations

import io
import pytest
import torch
import torch.nn as nn
from torch_geometric.data import Batch, Data

from app.ml.graph_transformer import (
    AttentionWeights,
    RelationalGraphTransformer,
    compute_alpha,
    focal_loss,
)


@pytest.fixture
def synthetic_graph() -> Data:
    """Fixture returning a deterministic synthetic graph with N=50, E=120, D=8."""
    torch.manual_seed(42)
    n_nodes = 50
    n_edges = 120
    d_feat = 8

    x = torch.randn(n_nodes, d_feat)
    src = torch.randint(0, n_nodes, (n_edges,))
    dst = torch.randint(0, n_nodes, (n_edges,))
    edge_index = torch.stack([src, dst], dim=0)
    edge_type = torch.randint(0, 3, (n_edges,), dtype=torch.long)
    y = torch.randint(0, 2, (n_nodes, 1)).float()

    return Data(x=x, edge_index=edge_index, edge_type=edge_type, y=y)


def test_model_forward_shapes(synthetic_graph: Data) -> None:
    """Test 1: Output shape is [N, 1] for both single graph and PyG multi-graph Batch."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4)
    model.eval()

    # 1. Single graph call
    with torch.no_grad():
        out_single = model(synthetic_graph.x, synthetic_graph.edge_index, edge_type=synthetic_graph.edge_type)
    assert out_single.shape == (50, 1), f"Expected [50, 1], got {list(out_single.shape)}"
    assert ((out_single >= 0.0) & (out_single <= 1.0)).all(), "Risk scores must be in [0, 1]"

    # Test calling model(data) directly
    with torch.no_grad():
        out_data = model(synthetic_graph)
    assert torch.allclose(out_single, out_data)

    # 2. Multi-graph batch call via PyG Batch (2 graphs: 25+25 = 50 nodes, 60+60 = 120 edges)
    g1 = Data(
        x=torch.randn(25, 8),
        edge_index=torch.randint(0, 25, (2, 60)),
        edge_type=torch.randint(0, 3, (60,)),
    )
    g2 = Data(
        x=torch.randn(25, 8),
        edge_index=torch.randint(0, 25, (2, 60)),
        edge_type=torch.randint(0, 3, (60,)),
    )
    batch = Batch.from_data_list([g1, g2])
    assert batch.num_nodes == 50
    assert batch.edge_index.size(1) == 120

    with torch.no_grad():
        out_batch = model(batch.x, batch.edge_index, edge_type=batch.edge_type)
    assert out_batch.shape == (50, 1), f"Expected batch output [50, 1], got {list(out_batch.shape)}"


def test_relational_edge_embedding(synthetic_graph: Data) -> None:
    """Test 2: Verify forward passes with edge_type {0, 1, 2} update embedding weights via autograd."""
    torch.manual_seed(42)
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4)
    model.train()

    # Ensure all 3 relations are present
    edge_type = torch.tensor([0, 1, 2] * 40, dtype=torch.long)
    edge_index = synthetic_graph.edge_index

    # Check initial embedding parameters
    initial_weights = model.edge_emb.weight.clone().detach()

    # Forward + backward pass
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.01)
    optimizer.zero_grad()

    out = model(synthetic_graph.x, edge_index, edge_type=edge_type)
    loss = out.sum()
    loss.backward()

    # Assert embedding weight received gradients
    assert model.edge_emb.weight.grad is not None, "edge_emb.weight.grad should not be None"
    assert not torch.isnan(model.edge_emb.weight.grad).any(), "NaN detected in edge_emb gradients"
    assert (model.edge_emb.weight.grad != 0).any(), "edge_emb gradients should be non-zero"

    # Optimizer step updates the weights
    optimizer.step()
    updated_weights = model.edge_emb.weight.detach()
    assert not torch.equal(initial_weights, updated_weights), "Embedding weights must update after optimizer step"


def test_attention_weight_extraction(synthetic_graph: Data) -> None:
    """Test 3: Verify return_attention=True returns valid edge indices and non-negative attention weights in [0, 1]."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4)
    model.eval()

    with torch.no_grad():
        out, attn = model(
            synthetic_graph.x,
            synthetic_graph.edge_index,
            edge_type=synthetic_graph.edge_type,
            return_attention=True,
        )

    # Output risk score shape
    assert out.shape == (synthetic_graph.num_nodes, 1)

    # Unpack as 2-tuple: (edge_index, alpha_mean)
    ret_edge_index, alpha_mean = attn
    assert ret_edge_index.shape == synthetic_graph.edge_index.shape
    assert alpha_mean.shape == (synthetic_graph.edge_index.size(1),)

    # Attention weights must be non-negative and bounded in [0, 1]
    assert (alpha_mean >= 0.0).all(), "Attention weights must be >= 0"
    assert (alpha_mean <= 1.0 + 1e-5).all(), "Attention weights must be <= 1"

    # Verify AttentionWeights properties and dictionary access
    assert isinstance(attn, AttentionWeights)
    assert attn.edge_index.shape == synthetic_graph.edge_index.shape
    assert attn.alpha_mean.shape == (synthetic_graph.edge_index.size(1),)
    assert attn.alpha.shape == (synthetic_graph.edge_index.size(1), 4)  # 4 heads
    assert attn["edge_index"].shape == synthetic_graph.edge_index.shape
    assert attn["alpha_mean"].shape == (synthetic_graph.edge_index.size(1),)

    as_dict = attn.to_dict()
    assert "edge_index" in as_dict and "alpha_mean" in as_dict and "alpha" in as_dict


def test_focal_loss_gradient_flow(synthetic_graph: Data) -> None:
    """Test 4: Assert non-zero gradients on all parameters and clean AdamW update step with zero NaN/Inf values."""
    torch.manual_seed(42)
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4)
    model.train()

    optimizer = torch.optim.AdamW(model.parameters(), lr=0.005, weight_decay=1e-4)
    optimizer.zero_grad()

    # Forward pass
    out = model(synthetic_graph.x, synthetic_graph.edge_index, edge_type=synthetic_graph.edge_type)
    loss = focal_loss(out, synthetic_graph.y, gamma=2.0, alpha_pos=5.0)

    assert not torch.isnan(loss), "Loss must not be NaN"
    assert not torch.isinf(loss), "Loss must not be Inf"
    assert loss.item() > 0.0, "Loss must be strictly positive"

    loss.backward()

    # Check gradients on all model parameters
    for name, param in model.named_parameters():
        assert param.grad is not None, f"Gradient for {name} is None"
        assert not torch.isnan(param.grad).any(), f"NaN in gradient for {name}"
        assert not torch.isinf(param.grad).any(), f"Inf in gradient for {name}"
        assert (param.grad != 0).any(), f"Gradient for {name} is entirely zero"

    # Optimizer step
    optimizer.step()

    # Check parameters remain clean after step
    for name, param in model.named_parameters():
        assert not torch.isnan(param).any(), f"NaN in parameter {name} after optimizer step"
        assert not torch.isinf(param).any(), f"Inf in parameter {name} after optimizer step"


def test_parameter_count_and_footprint() -> None:
    """Test 5: Total parameter count < 50,000 and serialized memory footprint < 1.5 MB."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4, edge_dim=16)

    # 1. Total parameter count
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    assert total_params < 50_000, f"Parameter count {total_params:,} exceeds 50,000 limit"
    assert total_params > 10_000, f"Parameter count {total_params:,} unexpectedly low"

    # 2. Serialized footprint
    buffer = io.BytesIO()
    torch.save({"model_state_dict": model.state_dict()}, buffer)
    size_bytes = buffer.tell()
    size_mb = size_bytes / (1024 * 1024)
    assert size_mb < 1.5, f"Serialized model footprint {size_mb:.2f} MB exceeds 1.5 MB limit"


def test_edge_attr_fallback(synthetic_graph: Data) -> None:
    """Test 6: Verify model behaves correctly when optional edge_type is None or continuous edge_attr is supplied."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4, edge_dim=16)
    model.eval()

    n_edges = synthetic_graph.edge_index.size(1)

    # Case A: edge_type is None and edge_attr is None -> graceful fallback to zeros
    with torch.no_grad():
        out_none = model(synthetic_graph.x, synthetic_graph.edge_index, edge_type=None, edge_attr=None)
    assert out_none.shape == (50, 1)

    # Case B: Continuous edge_attr provided with exact edge_dim (16)
    edge_attr_16 = torch.randn(n_edges, 16)
    with torch.no_grad():
        out_attr = model(synthetic_graph.x, synthetic_graph.edge_index, edge_attr=edge_attr_16)
    assert out_attr.shape == (50, 1)

    # Case C: Continuous edge_attr provided with different dimension (e.g. 4) -> dynamic projection
    edge_attr_4 = torch.randn(n_edges, 4)
    with torch.no_grad():
        out_attr_proj = model(synthetic_graph.x, synthetic_graph.edge_index, edge_attr=edge_attr_4)
    assert out_attr_proj.shape == (50, 1)


def test_embed_and_compute_alpha(synthetic_graph: Data) -> None:
    """Additional coverage: embed() method and compute_alpha helper."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4)
    model.eval()

    embeddings = model.embed(synthetic_graph.x, synthetic_graph.edge_index, edge_type=synthetic_graph.edge_type)
    assert embeddings.shape == (50, 16), f"Expected [50, 16] embeddings, got {list(embeddings.shape)}"

    # compute_alpha tests
    alpha_normal = compute_alpha(n_neg=100, n_pos=10, alpha_max=20.0)
    assert alpha_normal == 10.0

    alpha_clamped = compute_alpha(n_neg=1000, n_pos=10, alpha_max=20.0)
    assert alpha_clamped == 20.0

    alpha_zero_pos = compute_alpha(n_neg=100, n_pos=0, alpha_max=20.0)
    assert alpha_zero_pos == 20.0


def test_attention_weights_pickle_and_serialization() -> None:
    """Test 8: Verify AttentionWeights pickle.dumps/loads and torch.save/load work cleanly."""
    import pickle

    ei = torch.tensor([[0, 1, 2], [1, 2, 0]])
    alpha_mean = torch.tensor([0.25, 0.50, 0.75])
    alpha = torch.randn(3, 4)
    aw = AttentionWeights(ei, alpha_mean, alpha)

    # 1. Test standard pickle
    pickled = pickle.dumps(aw)
    aw_unpickled = pickle.loads(pickled)

    assert isinstance(aw_unpickled, AttentionWeights)
    assert torch.equal(aw_unpickled.edge_index, ei)
    assert torch.equal(aw_unpickled.alpha_mean, alpha_mean)
    assert torch.equal(aw_unpickled.alpha, alpha)
    assert aw_unpickled.heads == 4
    # Test tuple unpacking still works on unpickled instance
    ret_ei, ret_alpha = aw_unpickled
    assert torch.equal(ret_ei, ei)
    assert torch.equal(ret_alpha, alpha_mean)

    # 2. Test torch buffer serialization
    buf = io.BytesIO()
    torch.save(aw, buf)
    buf.seek(0)
    aw_torch = torch.load(buf, weights_only=False)
    assert isinstance(aw_torch, AttentionWeights)
    assert torch.equal(aw_torch.edge_index, ei)
    assert torch.equal(aw_torch.alpha_mean, alpha_mean)


def test_graph_transformer_edge_cases() -> None:
    """Test 9: Verify edge cases (E=0, 2D/float edge_type, focal loss boundaries)."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=32, out_dim=16, heads=4)
    model.eval()

    # Case A: Empty edges (E = 0)
    x = torch.randn(10, 8)
    empty_ei = torch.empty((2, 0), dtype=torch.long)
    with torch.no_grad():
        out_e0 = model(x, empty_ei)
        assert out_e0.shape == (10, 1)
        out_e0_attn, attn_e0 = model(x, empty_ei, return_attention=True)
        assert out_e0_attn.shape == (10, 1)
        assert attn_e0.alpha_mean.shape == (0,)

    # Case B: 2D shape [E, 1] and float edge_type
    ei = torch.tensor([[0, 1], [1, 0]])
    et_2d = torch.tensor([[0.0], [1.0]])  # float and 2D
    with torch.no_grad():
        out_2d = model(x[:2], ei, edge_type=et_2d)
        assert out_2d.shape == (2, 1)

    # Case C: Focal loss at extreme probability boundaries (p=0.0, p=1.0)
    p_extreme = torch.tensor([0.0, 1.0])
    y_extreme = torch.tensor([1.0, 0.0])
    loss_extreme = focal_loss(p_extreme, y_extreme, gamma=2.0, alpha_pos=5.0)
    assert not torch.isnan(loss_extreme)
    assert not torch.isinf(loss_extreme)
    assert loss_extreme.item() > 0.0

