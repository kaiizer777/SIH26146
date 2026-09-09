"""Phase 8 XAI-A — Autoencoder SHAP Feature Attribution.

Explainer: shap.GradientExplainer
Reason: DeepExplainer has known instability on PyTorch 2.4 (in-place op conflicts,
        additivity assertion failures, unrecognised layers). GradientExplainer uses
        standard PyTorch autograd — confirmed stable on torch==2.4.1+cpu.

Pipeline:
    1. Load autoencoder .pt + scaler .pkl + threshold .json.
    2. Build AutoencoderMSEWrapper (nn.Module, plain — no torch.compile).
    3. Sample 100 normal (anomaly_score < threshold) transactions as SHAP background.
    4. Build shap.GradientExplainer on the wrapper.
    5. Batch-compute SHAP values for all flagged txids (anomaly_score >= threshold).
    6. Emit per-txid waterfall JSON: list of {feature, attribution, value} sorted by |attribution| desc.
    7. Write data/xai/shap_attributions.json keyed by txid.

Usage:
    backend/venv/Scripts/python backend/scripts/explain_autoencoder.py [--batch-size N]

Verified APIs (2026-09-08):
    shap 0.51.0 — GradientExplainer confirmed compatible with torch 2.4.1+cpu.
    shap.GradientExplainer(model, background_tensor).shap_values(inputs) API stable.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

# Force UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import joblib
import numpy as np
import psycopg2
import psycopg2.extras
import shap
import torch
import torch.nn as nn

from app.config import settings
from app.services.feature_extractor import FEATURE_NAMES, extract_features_batch

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
_DATA_DIR = _PROJECT_ROOT / "data"
_MODELS_DIR = Path(settings.models_dir)

NODE_FEATURE_NAMES = [
    "cluster_id",
    "anomaly_score",
    "is_mixing_flag",
    "fee_log",
    "num_inputs",
    "num_outputs",
    "output_entropy",
    "asn_risk_score",
]


# ---------------------------------------------------------------------------
# Autoencoder definition (must match train_autoencoder.py exactly)
# ---------------------------------------------------------------------------
from app.ml.ft_transformer import FTTransformerAnomaly
from app.services.feature_extractor import FEATURE_DIM


class Autoencoder(nn.Module):
    """18 → 64(ReLU) → Dropout(0.2) → 32(ReLU) → 16(ReLU) → 32(ReLU) → 64(ReLU) → 18.

    Identical to train_autoencoder.py — kept as plain nn.Module (no torch.compile).
    """

    def __init__(self) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(FEATURE_DIM, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, FEATURE_DIM),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.decoder(self.encoder(x))


class AnomalyMSEWrapper(nn.Module):
    """Wraps Autoencoder or FTTransformerAnomaly so forward() returns per-sample reconstruction MSE.

    Shape: input [N, 18] → output [N, 1] (mean squared error per sample).
    This is the scalar that SHAP attributes to individual features.
    GradientExplainer requires output shape [N, num_outputs]; for anomaly
    score we use num_outputs=1.
    """

    def __init__(self, model: nn.Module) -> None:
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        recon = self.model(x)
        if isinstance(recon, tuple):
            recon = recon[0]
        # Per-sample MSE: shape [N]
        mse = ((recon - x) ** 2).mean(dim=1)
        return mse.unsqueeze(1)  # [N, 1] — required by GradientExplainer


# Backward compatibility alias
AutoencoderMSEWrapper = AnomalyMSEWrapper


# ---------------------------------------------------------------------------
# Load artifacts
# ---------------------------------------------------------------------------

def _find_latest(pattern: str) -> Path:
    """Find the most recent file matching a glob pattern in models dir."""
    matches = sorted(_MODELS_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"No file matching {pattern} in {_MODELS_DIR}")
    return matches[-1]


def load_model(
    model_type: str = "auto",
    model_path_str: str | None = None,
) -> tuple[AnomalyMSEWrapper, object, float, str]:
    """Load autoencoder or FT-Transformer, scaler, and threshold.

    Returns:
        (wrapper, scaler, threshold, resolved_model_type)
    """
    resolved_type = model_type.lower()
    if resolved_type == "auto":
        if model_path_str and "ft_transformer" in model_path_str.lower():
            resolved_type = "ft_transformer"
        else:
            # Default to autoencoder if available, otherwise check ft_transformer
            if list(_MODELS_DIR.glob("autoencoder_*.pt")):
                resolved_type = "autoencoder"
            elif list(_MODELS_DIR.glob("ft_transformer_*.pt")):
                resolved_type = "ft_transformer"
            else:
                resolved_type = "autoencoder"

    if resolved_type == "ft_transformer":
        model_path = Path(model_path_str) if model_path_str else _find_latest("ft_transformer_*.pt")
        scaler_path = _find_latest("ft_scaler_*.pkl")
        thresh_path = _find_latest("ft_threshold_*.json")

        print(f"  Model:     {model_path.name} (FT-Transformer)")
        print(f"  Scaler:    {scaler_path.name}")
        print(f"  Threshold: {thresh_path.name}")

        model: nn.Module = FTTransformerAnomaly(num_features=FEATURE_DIM, d_model=32, n_layers=2, n_heads=4, d_ff=64)
        model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
        model.eval()
    else:
        resolved_type = "autoencoder"
        model_path = Path(model_path_str) if model_path_str else _find_latest("autoencoder_*.pt")
        scaler_path = _find_latest("scaler_*.pkl")
        thresh_path = _find_latest("threshold_*.json")

        print(f"  Model:     {model_path.name} (Autoencoder)")
        print(f"  Scaler:    {scaler_path.name}")
        print(f"  Threshold: {thresh_path.name}")

        model = Autoencoder()
        model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
        model.eval()

    wrapper = AnomalyMSEWrapper(model)
    wrapper.eval()

    scaler = joblib.load(scaler_path)

    with open(thresh_path, "r", encoding="utf-8") as f:
        thresh_data = json.load(f)
    threshold: float = float(thresh_data["threshold"])
    print(f"  Anomaly threshold: {threshold:.6f}")

    return wrapper, scaler, threshold, resolved_type


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_background_rows(conn, threshold: float, n: int = 100) -> list[dict]:
    """Sample n normal transactions (anomaly_score < threshold) for SHAP background."""
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.execute(
            """
            SELECT id, txid, ts, input_addresses, output_addresses,
                   input_amounts, output_amounts, fee, script_type,
                   geo_country, asn
            FROM transactions
            WHERE anomaly_score IS NOT NULL
              AND anomaly_score < %s
            ORDER BY RANDOM()
            LIMIT %s
            """,
            (threshold, n),
        )
        rows = [dict(r) for r in cur.fetchall()]
    print(f"  Loaded {len(rows)} background (normal) transactions.")
    return rows


def load_flagged_rows(conn, threshold: float) -> list[dict]:
    """Load all transactions with anomaly_score >= threshold (flagged by Phase 5)."""
    print("  Loading flagged transactions (anomaly_score >= threshold) ...")
    all_rows: list[dict] = []
    chunk = 5_000
    last_id = 0
    while True:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, txid, ts, input_addresses, output_addresses,
                       input_amounts, output_amounts, fee, script_type,
                       geo_country, asn, anomaly_score
                FROM transactions
                WHERE anomaly_score >= %s
                  AND id > %s
                ORDER BY id ASC
                LIMIT %s
                """,
                (threshold, last_id, chunk),
            )
            rows = cur.fetchall()
        if not rows:
            break
        all_rows.extend(dict(r) for r in rows)
        last_id = rows[-1]["id"]
        if len(rows) < chunk:
            break
    print(f"  Found {len(all_rows):,} flagged transactions.")
    return all_rows


# ---------------------------------------------------------------------------
# SHAP computation
# ---------------------------------------------------------------------------

def compute_shap_attributions(
    wrapper: AnomalyMSEWrapper,
    scaler,
    background_rows: list[dict],
    flagged_rows: list[dict],
    batch_size: int = 256,
) -> tuple[dict[str, list[dict]], dict[str, dict]]:
    """Compute GradientExplainer SHAP values for all flagged transactions.

    When FTTransformerAnomaly is active, also extracts native cross-feature
    and [CLS] self-attention matrices.

    Returns:
        (results, attention_matrices) where:
            results: dict txid → waterfall list [{feature, attribution, value, (optional) attention}]
            attention_matrices: dict txid → {cross_feature_attention: [18, 18], cls_attention: [18]}
    """
    is_ft = isinstance(wrapper.model, FTTransformerAnomaly)

    print("\n  Building SHAP background tensor ...")
    bg_feats = extract_features_batch(background_rows).astype(np.float32)  # (100, 18)
    bg_scaled = scaler.transform(bg_feats).astype(np.float32)
    bg_tensor = torch.from_numpy(bg_scaled)

    print("  Initialising shap.GradientExplainer ...")
    explainer = shap.GradientExplainer(wrapper, bg_tensor)

    print(f"  Computing SHAP values for {len(flagged_rows):,} flagged txs "
          f"(batch_size={batch_size}) ...")
    if is_ft:
        print("  FT-Transformer detected: extracting native cross-feature self-attention...")

    results: dict[str, list[dict]] = {}
    attention_matrices: dict[str, dict] = {}
    t0 = time.time()

    for start in range(0, len(flagged_rows), batch_size):
        batch = flagged_rows[start : start + batch_size]
        feats_raw = extract_features_batch(batch).astype(np.float32)   # (B, 18)
        feats_scaled = scaler.transform(feats_raw).astype(np.float32)
        input_tensor = torch.from_numpy(feats_scaled)

        # GradientExplainer.shap_values() returns:
        #   ndarray of shape (B, F, num_outputs) = (B, 18, 1) for our single-output wrapper.
        # Squeeze the trailing output dimension to get (B, 18).
        shap_vals = explainer.shap_values(input_tensor)
        if isinstance(shap_vals, list):
            # Older shap path: list of one (B, F) array per output
            attr_matrix = np.array(shap_vals[0])  # (B, 18)
        else:
            # shap 0.46+ path: ndarray (B, F) or (B, F, 1)
            attr_matrix = np.array(shap_vals)      # ensure numpy
        if attr_matrix.ndim == 3:
            # (B, F, 1) -> (B, F)
            attr_matrix = attr_matrix.squeeze(axis=-1)

        # Extract native attention from FT-Transformer if active
        cross_attn_batch = None
        cls_attn_batch = None
        if is_ft:
            with torch.no_grad():
                _, attn_dict = wrapper.model(input_tensor, return_attention=True)
                cross_attn_batch = attn_dict["cross_feature_attention"].cpu().numpy()  # (B, 18, 18)
                cls_attn_batch = attn_dict["cls_attention"].cpu().numpy()              # (B, 18)

        for i, row in enumerate(batch):
            txid = str(row.get("txid", f"__unknown_{start + i}__"))
            attrs = attr_matrix[i]          # (18,)
            raw_vals = feats_raw[i]         # (18,) — unscaled feature values for display

            waterfall = [
                {
                    "feature": FEATURE_NAMES[j],
                    "attribution": round(float(attrs[j]), 8),
                    "value": round(float(raw_vals[j]), 6),
                }
                for j in range(len(FEATURE_NAMES))
            ]

            if cls_attn_batch is not None:
                for entry in waterfall:
                    j = FEATURE_NAMES.index(entry["feature"])
                    entry["attention"] = round(float(cls_attn_batch[i, j]), 6)

            # Sort by absolute attribution magnitude descending
            waterfall.sort(key=lambda d: abs(d["attribution"]), reverse=True)
            results[txid] = waterfall

            if cross_attn_batch is not None and cls_attn_batch is not None:
                attention_matrices[txid] = {
                    "cross_feature_attention": cross_attn_batch[i].round(6).tolist(),
                    "cls_attention": cls_attn_batch[i].round(6).tolist(),
                }

        if (start // batch_size) % 5 == 0:
            pct = min(100, (start + len(batch)) / len(flagged_rows) * 100)
            print(f"    {start + len(batch):,}/{len(flagged_rows):,} ({pct:.0f}%) "
                  f"| elapsed: {time.time()-t0:.1f}s")

    elapsed = time.time() - t0
    print(f"  SHAP complete: {len(results):,} txids in {elapsed:.1f}s.")
    return results, attention_matrices


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 8 XAI-A: Autoencoder / FT-Transformer SHAP Attribution.")
    parser.add_argument("--batch-size", type=int, default=256,
                        help="SHAP batch size (default 256)")
    parser.add_argument("--background-n", type=int, default=100,
                        help="Number of background (normal) samples (default 100)")
    parser.add_argument("--model-type", type=str, default="auto", choices=["auto", "autoencoder", "ft_transformer"],
                        help="Model type to explain: auto (default), autoencoder, or ft_transformer")
    parser.add_argument("--model-path", type=str, default=None,
                        help="Explicit path to .pt model weights")
    args = parser.parse_args()

    xai_dir = Path(settings.xai_dir)
    xai_dir.mkdir(parents=True, exist_ok=True)
    out_path = Path(settings.shap_attributions_path)
    attn_out_path = xai_dir / "attention_matrices.json"

    print("=" * 60)
    print("Phase 8 XAI-A — Feature Attribution & Attention Extraction")
    print("=" * 60)
    print(f"  shap version: {shap.__version__}")
    print(f"  torch version: {torch.__version__}")
    print(f"  Explainer: GradientExplainer (safe on torch 2.4.1)")
    print()

    # 1. Load model + scaler + threshold
    print("[1/4] Loading model artifacts ...")
    wrapper, scaler, threshold, resolved_type = load_model(
        model_type=args.model_type,
        model_path_str=args.model_path,
    )

    # 2. Connect to PostgreSQL
    conn = psycopg2.connect(settings.database_url)

    # 3. Load background + flagged rows
    print("\n[2/4] Loading transaction data from PostgreSQL ...")
    bg_rows = load_background_rows(conn, threshold, n=args.background_n)
    flagged_rows = load_flagged_rows(conn, threshold)
    conn.close()

    if not flagged_rows:
        print("  WARNING: No flagged transactions found. Exiting.")
        return

    # 4. Compute SHAP & Attention
    print("\n[3/4] Computing SHAP attributions & attention slices ...")
    attributions, attention_matrices = compute_shap_attributions(
        wrapper, scaler, bg_rows, flagged_rows, batch_size=args.batch_size
    )

    # 5. Write output
    print(f"\n[4/4] Writing {len(attributions):,} SHAP attribution records -> {out_path} ...")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(attributions, f, indent=None, separators=(",", ":"))
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"  Written: {out_path} ({size_mb:.2f} MB)")

    if attention_matrices:
        print(f"  Writing {len(attention_matrices):,} attention matrices -> {attn_out_path} ...")
        with open(attn_out_path, "w", encoding="utf-8") as f:
            json.dump(attention_matrices, f, indent=None, separators=(",", ":"))
        attn_mb = attn_out_path.stat().st_size / 1024 / 1024
        print(f"  Written: {attn_out_path} ({attn_mb:.2f} MB)")

    print("\n" + "=" * 60)
    print("XAI-A COMPLETE.")
    print(f"  Output: {out_path}")
    print(f"  Txids with SHAP values: {len(attributions):,}")
    # Spot-check: first txid, top feature
    first_txid = next(iter(attributions))
    top_feat = attributions[first_txid][0]
    print(f"  Sample [{first_txid[:16]}...] top feature: "
          f"{top_feat['feature']} (attribution={top_feat['attribution']:.6f})")
    print("=" * 60)


if __name__ == "__main__":
    main()
