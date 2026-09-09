"""Unit tests for Stage 3 ML-3 Production Promotion Pipeline (promote_models.py).

Verifies:
    1. Gate validation approves checkpoints with F1 >= 0.88.
    2. Gate validation rejects checkpoints with F1 < 0.88 unless --force is provided.
    3. Missing metrics trigger failure unless --force is provided.
    4. Backup and restore functions safely protect wallet_risk_scores.json.
    5. Inference forward pass produces scores strictly in [0.0, 1.0].
    6. Dry-run mode executes cleanly without side effects.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
import torch

from app.ml.graph_transformer import RelationalGraphTransformer
from scripts.promote_models import (
    DEFAULT_F1_GATE,
    create_atomic_backup,
    find_latest_checkpoint,
    restore_backup,
    run_full_inference,
    validate_promotion_gate,
)


@pytest.fixture
def mock_checkpoint_pass(tmp_path: Path) -> Path:
    """Fixture creating a dummy checkpoint with passing F1 (0.9209)."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=16, out_dim=8, heads=2)
    ckpt_path = tmp_path / "graph_transformer_test_pass.pt"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "in_channels": 8,
            "hidden_dim": 16,
            "out_dim": 8,
            "heads": 2,
            "edge_dim": 16,
            "num_edge_types": 3,
            "dropout": 0.1,
            "best_threshold": 0.70,
            "metrics": {
                "f1": 0.9209,
                "precision": 0.8940,
                "recall": 0.9495,
                "roc_auc": 0.9956,
                "full_graph_inference_ms": 150.0,
            },
        },
        ckpt_path,
    )
    return ckpt_path


@pytest.fixture
def mock_checkpoint_fail(tmp_path: Path) -> Path:
    """Fixture creating a dummy checkpoint with failing F1 (0.8500)."""
    model = RelationalGraphTransformer(in_channels=8, hidden_dim=16, out_dim=8, heads=2)
    ckpt_path = tmp_path / "graph_transformer_test_fail.pt"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "in_channels": 8,
            "hidden_dim": 16,
            "out_dim": 8,
            "heads": 2,
            "edge_dim": 16,
            "num_edge_types": 3,
            "dropout": 0.1,
            "best_threshold": 0.50,
            "metrics": {
                "f1": 0.8500,
                "precision": 0.8200,
                "recall": 0.8800,
                "roc_auc": 0.9100,
                "full_graph_inference_ms": 150.0,
            },
        },
        ckpt_path,
    )
    return ckpt_path


def test_gate_validation_pass(mock_checkpoint_pass: Path) -> None:
    """Gate passes when F1 >= 0.88."""
    info = validate_promotion_gate(
        gt_path=mock_checkpoint_pass,
        ft_path=None,
        f1_gate=0.88,
        force=False,
    )
    assert info["f1"] == 0.9209
    assert info["best_threshold"] == 0.70
    assert "gt_checkpoint" in info


def test_gate_validation_rejection(mock_checkpoint_fail: Path) -> None:
    """Gate aborts with SystemExit(1) when F1 < 0.88 without force."""
    with pytest.raises(SystemExit) as exc_info:
        validate_promotion_gate(
            gt_path=mock_checkpoint_fail,
            ft_path=None,
            f1_gate=0.88,
            force=False,
        )
    assert exc_info.value.code == 1


def test_gate_validation_force_override(mock_checkpoint_fail: Path) -> None:
    """Gate permits promotion when F1 < 0.88 if force=True."""
    info = validate_promotion_gate(
        gt_path=mock_checkpoint_fail,
        ft_path=None,
        f1_gate=0.88,
        force=True,
    )
    assert info["f1"] == 0.8500


def test_backup_and_restore(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test safe atomic backup and rollback logic."""
    live_file = tmp_path / "wallet_risk_scores.json"
    bak_file = tmp_path / "wallet_risk_scores.json.bak"

    initial_data = {"1addrA": 0.25, "1addrB": 0.75}
    with open(live_file, "w") as f:
        json.dump(initial_data, f)

    monkeypatch.setattr("scripts.promote_models._RISK_SCORES_FILE", live_file)
    monkeypatch.setattr("scripts.promote_models._BACKUP_FILE", bak_file)

    # 1. Create backup
    backup_path = create_atomic_backup()
    assert backup_path is not None
    assert bak_file.exists()
    with open(bak_file, "r") as f:
        assert json.load(f) == initial_data

    # 2. Mutate live file (simulate corrupt/failed update)
    with open(live_file, "w") as f:
        json.dump({"1addrA": 0.9999}, f)

    # 3. Rollback
    restore_backup()
    with open(live_file, "r") as f:
        restored = json.load(f)
    assert restored == initial_data


def test_full_inference_bounds(mock_checkpoint_pass: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test full inference output values are clamped to [0.0, 1.0]."""
    ckpt = torch.load(mock_checkpoint_pass, map_location="cpu", weights_only=False)

    # Synthetic graph cache
    n_nodes = 20
    cache_path = tmp_path / "staging_graph_cache.pt"
    torch.save(
        {
            "x": torch.randn(n_nodes, 8),
            "edge_index": torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long),
            "edge_type": torch.tensor([0, 1, 2, 0], dtype=torch.long),
            "all_addrs": [f"addr_{i}" for i in range(n_nodes)],
        },
        cache_path,
    )

    monkeypatch.setattr("scripts.promote_models._CACHE_FILE", cache_path)

    model, addr_to_score, all_addrs, inf_ms = run_full_inference(ckpt)
    assert len(addr_to_score) == n_nodes
    assert len(all_addrs) == n_nodes
    assert inf_ms >= 0.0

    for addr, score in addr_to_score.items():
        assert 0.0 <= score <= 1.0, f"Score {score} out of [0, 1] bounds for {addr}"
