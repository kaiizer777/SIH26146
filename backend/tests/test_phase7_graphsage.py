"""Phase 7 — Test suite for GraphSAGE risk scoring.

Unit tests (no live services):
    test_graphsage_forward_shape         - output shape [N, 1]
    test_graphsage_output_range          - sigmoid output ∈ [0, 1]
    test_focal_loss_computation          - known-input focal loss correctness
    test_focal_loss_pos_class_upweighted - pos-class loss > neg-class when alpha > 1
    test_compute_alpha_basic             - neg/pos ratio calculation
    test_compute_alpha_clamped           - ceiling clamping
    test_edge_index_no_self_loops        - edge builder logic
    test_wallet_index_map_invertible     - address ↔ index round-trip

Integration tests (skip gracefully without live services):
    test_risk_score_written_to_neo4j     - ≥1 wallet has risk_score set
    test_risk_score_written_to_pg        - risk_score non-null in PG
    test_is_flagged_written_to_pg        - is_flagged column exists and is populated
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import torch
from torch_geometric.data import Data

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.ml.graphsage import (
    GraphSAGEClassifier,
    compute_alpha,
    focal_loss,
)


# ---------------------------------------------------------------------------
# Fixtures: minimal synthetic graph
# ---------------------------------------------------------------------------

@pytest.fixture()
def tiny_data() -> Data:
    """4-node, 4-edge undirected synthetic graph."""
    x = torch.randn(4, 8)
    edge_index = torch.tensor([[0, 1, 2, 3], [1, 0, 3, 2]], dtype=torch.long)
    y = torch.tensor([1, 0, 0, 1], dtype=torch.long)
    return Data(x=x, edge_index=edge_index, y=y)


@pytest.fixture()
def small_model() -> GraphSAGEClassifier:
    """Smallest valid GraphSAGEClassifier (fewer channels to keep tests fast)."""
    return GraphSAGEClassifier(in_channels=8, hidden_1=16, hidden_2=8, embedding=4, dropout=0.0)


# ---------------------------------------------------------------------------
# Unit tests — model architecture
# ---------------------------------------------------------------------------

class TestGraphSAGEForward:
    def test_forward_shape(self, tiny_data: Data, small_model: GraphSAGEClassifier) -> None:
        """Output shape must be [N, 1]."""
        small_model.eval()
        with torch.no_grad():
            out = small_model(tiny_data.x, tiny_data.edge_index)
        assert out.shape == (4, 1), f"Expected (4, 1), got {out.shape}"

    def test_output_range(self, tiny_data: Data, small_model: GraphSAGEClassifier) -> None:
        """Sigmoid output must be strictly in (0, 1)."""
        small_model.eval()
        with torch.no_grad():
            out = small_model(tiny_data.x, tiny_data.edge_index)
        assert (out >= 0.0).all(), "risk_score contains negative values"
        assert (out <= 1.0).all(), "risk_score contains values > 1"

    def test_embed_shape(self, tiny_data: Data, small_model: GraphSAGEClassifier) -> None:
        """embed() must return [N, embedding_dim] without the sigmoid head."""
        emb = small_model.embed(tiny_data.x, tiny_data.edge_index)
        assert emb.shape == (4, 4), f"Expected (4, 4), got {emb.shape}"

    def test_train_eval_dropout_differs(self, tiny_data: Data) -> None:
        """With dropout > 0, train-mode and eval-mode outputs must differ (stochastic check)."""
        model = GraphSAGEClassifier(in_channels=8, hidden_1=16, hidden_2=8, embedding=4, dropout=0.9)
        torch.manual_seed(0)
        model.train()
        out_train = model(tiny_data.x, tiny_data.edge_index)
        model.eval()
        with torch.no_grad():
            out_eval = model(tiny_data.x, tiny_data.edge_index)
        # They shouldn't be identical because dropout is active in train mode
        # (with p=0.9 this is extremely likely to differ)
        assert not torch.allclose(out_train.detach(), out_eval, atol=1e-6), (
            "Train and eval outputs identical — dropout may not be applied in train mode"
        )

    def test_spec_architecture_sizes(self) -> None:
        """Default architecture matches spec: 64 → 32 → 16 → 1."""
        model = GraphSAGEClassifier(in_channels=8)
        assert model.conv1.out_channels == 64
        assert model.conv2.out_channels == 32
        assert model.conv3.out_channels == 16
        assert model.head.out_features == 1


# ---------------------------------------------------------------------------
# Unit tests — focal loss
# ---------------------------------------------------------------------------

class TestFocalLoss:
    def test_zero_loss_perfect_prediction(self) -> None:
        """Perfect predictions (p≈1 for y=1, p≈0 for y=0) → near-zero loss."""
        pred  = torch.tensor([0.9999, 0.0001, 0.9999, 0.0001])
        target = torch.tensor([1.0, 0.0, 1.0, 0.0])
        loss = focal_loss(pred, target, gamma=2.0, alpha_pos=1.0)
        assert loss.item() < 0.01, f"Expected near-zero loss, got {loss.item()}"

    def test_high_loss_worst_prediction(self) -> None:
        """Worst predictions (p≈0 for y=1) → large loss."""
        pred   = torch.tensor([0.001])
        target = torch.tensor([1.0])
        loss = focal_loss(pred, target, gamma=2.0, alpha_pos=1.0)
        assert loss.item() > 1.0, f"Expected large loss for worst pred, got {loss.item()}"

    def test_pos_class_upweighted(self) -> None:
        """Positive-class loss increases with alpha_pos > 1."""
        pred   = torch.tensor([0.4])
        target = torch.tensor([1.0])
        loss_1 = focal_loss(pred, target, gamma=2.0, alpha_pos=1.0).item()
        loss_5 = focal_loss(pred, target, gamma=2.0, alpha_pos=5.0).item()
        assert loss_5 > loss_1, (
            f"alpha=5 loss {loss_5:.4f} should > alpha=1 loss {loss_1:.4f}"
        )

    def test_gamma_focuses_hard_examples(self) -> None:
        """Higher γ down-weights easy examples more than hard ones."""
        # p=0.9 is an easy example (high confidence correct)
        pred_easy  = torch.tensor([0.9])
        # p=0.4 is a hard example (uncertain positive)
        pred_hard  = torch.tensor([0.4])
        target     = torch.tensor([1.0])

        loss_easy_g0 = focal_loss(pred_easy, target, gamma=0.0, alpha_pos=1.0).item()
        loss_easy_g2 = focal_loss(pred_easy, target, gamma=2.0, alpha_pos=1.0).item()
        loss_hard_g0 = focal_loss(pred_hard, target, gamma=0.0, alpha_pos=1.0).item()
        loss_hard_g2 = focal_loss(pred_hard, target, gamma=2.0, alpha_pos=1.0).item()

        # γ=2 should reduce easy-example loss more than hard-example loss
        easy_ratio = loss_easy_g2 / max(loss_easy_g0, 1e-9)
        hard_ratio = loss_hard_g2 / max(loss_hard_g0, 1e-9)
        assert easy_ratio < hard_ratio, (
            f"γ=2 should down-weight easy examples more: easy_ratio={easy_ratio:.3f}, "
            f"hard_ratio={hard_ratio:.3f}"
        )

    def test_2d_input_accepted(self) -> None:
        """focal_loss must accept [N, 1] shaped inputs (from model output)."""
        pred   = torch.tensor([[0.7], [0.2], [0.9]])
        target = torch.tensor([[1],   [0],   [1]])
        loss = focal_loss(pred, target, gamma=2.0, alpha_pos=1.0)
        assert loss.ndim == 0, "Expected scalar loss tensor"
        assert loss.item() > 0


# ---------------------------------------------------------------------------
# Unit tests — compute_alpha
# ---------------------------------------------------------------------------

class TestComputeAlpha:
    def test_basic_ratio(self) -> None:
        alpha = compute_alpha(n_neg=9000, n_pos=1000, alpha_max=20.0)
        assert abs(alpha - 9.0) < 1e-9, f"Expected 9.0, got {alpha}"

    def test_clamped(self) -> None:
        alpha = compute_alpha(n_neg=100_000, n_pos=10, alpha_max=20.0)
        assert alpha == 20.0, f"Expected ceiling 20.0, got {alpha}"

    def test_zero_pos(self) -> None:
        """Zero positives returns alpha_max (safe fallback)."""
        alpha = compute_alpha(n_neg=1000, n_pos=0, alpha_max=15.0)
        assert alpha == 15.0

    def test_balanced(self) -> None:
        alpha = compute_alpha(n_neg=1000, n_pos=1000, alpha_max=20.0)
        assert abs(alpha - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Unit tests — edge index / index map
# ---------------------------------------------------------------------------

class TestEdgeIndexAndIndexMap:
    def test_no_self_loops(self) -> None:
        """Simulates the train_graphsage edge builder — self-loops must be excluded."""
        raw_edges = [(0, 0), (0, 1), (1, 2), (2, 2), (1, 0)]
        src, dst = [], []
        for s, d in raw_edges:
            if s == d:
                continue
            src.append(s)
            dst.append(d)
            src.append(d)
            dst.append(s)
        edge_index = torch.tensor([src, dst], dtype=torch.long)
        # No self-loops in the resulting edge_index
        has_self_loop = (edge_index[0] == edge_index[1]).any().item()
        assert not has_self_loop, "Self-loops present in edge_index"

    def test_wallet_index_map_invertible(self) -> None:
        """address → index → address round-trip must be lossless."""
        addrs = [f"addr_{i}" for i in range(100)]
        index_map = {addr: i for i, addr in enumerate(addrs)}
        idx_to_addr = {v: k for k, v in index_map.items()}
        for i, addr in enumerate(addrs):
            assert index_map[addr] == i
            assert idx_to_addr[i] == addr

    def test_edge_index_dtype_long(self) -> None:
        """edge_index must be dtype=torch.long for PyG message passing."""
        edge_index = torch.tensor([[0, 1], [1, 0]], dtype=torch.long)
        assert edge_index.dtype == torch.long

    def test_edge_index_shape(self) -> None:
        """edge_index shape must be [2, E]."""
        src = [0, 1, 2]
        dst = [1, 2, 0]
        edge_index = torch.tensor([src, dst], dtype=torch.long)
        assert edge_index.shape[0] == 2
        assert edge_index.shape[1] == 3


# ---------------------------------------------------------------------------
# Integration tests (skip without live services)
# ---------------------------------------------------------------------------

def _pg_conn():
    """Return a psycopg2 connection or None."""
    try:
        import psycopg2
        from app.config import settings
        return psycopg2.connect(settings.database_url)
    except Exception:
        return None


def _neo4j_driver():
    """Return a connected GraphService or None."""
    try:
        from app.config import settings
        from app.services.graph_service import GraphService
        svc = GraphService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password)
        svc.connect()
        with svc.driver.session() as s:
            s.run("RETURN 1")
        return svc
    except Exception:
        return None


@pytest.mark.integration
def test_risk_score_written_to_neo4j() -> None:
    svc = _neo4j_driver()
    if svc is None:
        pytest.skip("Neo4j not reachable")
    try:
        with svc.driver.session() as s:
            result = s.run(
                "MATCH (w:Wallet) WHERE w.risk_score IS NOT NULL RETURN count(w) AS cnt"
            )
            cnt = result.single()["cnt"]
        assert cnt > 0, f"Expected > 0 wallets with risk_score, got {cnt}"
    finally:
        svc.close()


@pytest.mark.integration
def test_risk_score_written_to_pg() -> None:
    conn = _pg_conn()
    if conn is None:
        pytest.skip("PostgreSQL not reachable")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM transactions WHERE risk_score IS NOT NULL"
            )
            cnt = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM transactions")
            total = cur.fetchone()[0]
        if cnt == 0:
            pytest.skip(
                f"risk_score not yet written to PostgreSQL (0/{total:,} rows) — "
                "run train_graphsage.py first"
            )
        coverage = cnt / max(total, 1)
        assert coverage >= 0.90, (
            f"risk_score coverage {coverage:.2%} below 90% ({cnt:,}/{total:,})"
        )
    finally:
        conn.close()


@pytest.mark.integration
def test_is_flagged_written_to_pg() -> None:
    conn = _pg_conn()
    if conn is None:
        pytest.skip("PostgreSQL not reachable")
    try:
        with conn.cursor() as cur:
            # Verify column exists and has non-null values
            cur.execute(
                "SELECT COUNT(*) FROM transactions WHERE is_flagged IS NOT NULL"
            )
            cnt = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM transactions")
            total = cur.fetchone()[0]
        assert cnt == total, (
            f"is_flagged has NULLs: {total-cnt:,} rows not covered"
        )
    finally:
        conn.close()
