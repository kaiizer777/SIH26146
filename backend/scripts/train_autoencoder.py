"""Phase 5 — Autoencoder Training & Anomaly Scoring.

Architecture (spec-exact):
    Input(18) -> Dense(64, ReLU) -> Dropout(0.2) -> Dense(32, ReLU)
              -> Dense(16, ReLU) [bottleneck]
              -> Dense(32, ReLU) -> Dense(64, ReLU) -> Output(18)
    Loss: MSE

Pipeline:
    1. Load non-illicit transactions from PostgreSQL.
    2. Extract 18-feature vectors.
    3. 80/20 train/val split (random.seed(42), deterministic).
    4. Fit StandardScaler on train split only; save scaler.
    5. Train autoencoder; plot train/val loss curve.
    6. Save model (.pt).
    7. Score ALL transactions (train + val + illicit) via reconstruction MSE.
    8. Threshold = 95th-pct of val (non-illicit held-out) MSE scores.
    9. Write anomaly_score back to PostgreSQL.
    10. Generate calibration histogram.
    11. Log all timings + measurements to PERFORMANCE_LOG.md.

Usage:
    backend/venv/Scripts/python backend/scripts/train_autoencoder.py [--epochs N] [--batch-size N]
"""

from __future__ import annotations

import argparse
import io
import json
import random
import sys
import time
from datetime import datetime, timezone
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
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from app.config import settings
from app.services.feature_extractor import FEATURE_DIM, FEATURE_NAMES, extract_features_batch

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TRAIN_SPLIT = 0.80
RANDOM_SEED = 42
PERF_LOG = _PROJECT_ROOT / "PERFORMANCE_LOG.md"


# ---------------------------------------------------------------------------
# Autoencoder — exactly as specified
# ---------------------------------------------------------------------------

class Autoencoder(nn.Module):
    """18 → 64(ReLU) → Dropout(0.2) → 32(ReLU) → 16(ReLU) → 32(ReLU) → 64(ReLU) → 18."""

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


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def _load_ransomwhere_seeds() -> set[str]:
    """Load Ransomwhere seed addresses from data/ransomwhere_seeds.json."""
    seed_file = _PROJECT_ROOT / "data" / "ransomwhere_seeds.json"
    if not seed_file.exists():
        print("  WARNING: ransomwhere_seeds.json not found; illicit label set will be empty.")
        return set()
    with open(seed_file, "r", encoding="utf-8") as f:
        raw = json.load(f)
    records = raw.get("result", raw) if isinstance(raw, dict) else raw
    addrs = set()
    for rec in records:
        if isinstance(rec, dict) and "address" in rec:
            addrs.add(rec["address"])
    print(f"  Loaded {len(addrs):,} Ransomwhere seed addresses.")
    return addrs


def _is_illicit(row: dict, seed_set: set[str]) -> bool:
    """True if any input or output address matches a Ransomwhere seed."""
    if not seed_set:
        return False
    in_addrs = row.get("input_addresses") or []
    out_addrs = row.get("output_addresses") or []
    if isinstance(in_addrs, str):
        in_addrs = [a.strip() for a in in_addrs.strip("{}").split(",") if a.strip()]
    if isinstance(out_addrs, str):
        out_addrs = [a.strip() for a in out_addrs.strip("{}").split(",") if a.strip()]
    return bool(seed_set.intersection(in_addrs) or seed_set.intersection(out_addrs))


def load_transactions(conn) -> tuple[list[dict], list[dict]]:
    """Load all transactions from PostgreSQL.

    Returns:
        (non_illicit_rows, all_rows)
    """
    seed_set = _load_ransomwhere_seeds()

    print("  Querying all transactions from PostgreSQL (keyset-paginated)...")
    all_rows: list[dict] = []
    chunk_size = 10_000
    last_id = 0
    t0 = time.time()

    while True:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, ts, input_addresses, output_addresses,
                       input_amounts, output_amounts, fee, script_type,
                       geo_country, asn
                FROM transactions
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s
                """,
                (last_id, chunk_size),
            )
            rows = cur.fetchall()

        if not rows:
            break
        for r in rows:
            all_rows.append(dict(r))
        last_id = rows[-1]["id"]
        if len(rows) < chunk_size:
            break

    elapsed = time.time() - t0
    print(f"  Loaded {len(all_rows):,} rows in {elapsed:.2f}s.")

    non_illicit = [r for r in all_rows if not _is_illicit(r, seed_set)]
    illicit = [r for r in all_rows if _is_illicit(r, seed_set)]
    print(f"  Non-illicit: {len(non_illicit):,} | Illicit (seed-matched): {len(illicit):,}")

    return non_illicit, all_rows


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(
    model: Autoencoder,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int,
    lr: float = 1e-3,
) -> tuple[list[float], list[float]]:
    """Train the autoencoder. Returns (train_losses, val_losses) per epoch."""
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()
    device = torch.device("cpu")
    model.to(device)

    train_losses: list[float] = []
    val_losses: list[float] = []

    print(f"  Training for up to {epochs} epochs (Adam, lr={lr}, MSE loss) ...")

    prev_val = float("inf")
    plateau_count = 0
    PLATEAU_PATIENCE = 10   # stop if val loss doesn't improve for 10 consecutive epochs
    MIN_DELTA = 1e-6

    for epoch in range(1, epochs + 1):
        # --- Train ---
        model.train()
        epoch_train_loss = 0.0
        for (batch,) in train_loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            recon = model(batch)
            loss = criterion(recon, batch)
            loss.backward()
            optimizer.step()
            epoch_train_loss += loss.item() * len(batch)
        avg_train = epoch_train_loss / len(train_loader.dataset)

        # --- Validate ---
        model.eval()
        epoch_val_loss = 0.0
        with torch.no_grad():
            for (batch,) in val_loader:
                batch = batch.to(device)
                recon = model(batch)
                loss = criterion(recon, batch)
                epoch_val_loss += loss.item() * len(batch)
        avg_val = epoch_val_loss / len(val_loader.dataset)

        train_losses.append(avg_train)
        val_losses.append(avg_val)

        if epoch % 10 == 0 or epoch == 1:
            print(f"    Epoch {epoch:4d}/{epochs} | train={avg_train:.6f} | val={avg_val:.6f}")

        # --- Early stopping ---
        if prev_val - avg_val < MIN_DELTA:
            plateau_count += 1
            if plateau_count >= PLATEAU_PATIENCE:
                print(f"  Early stopping at epoch {epoch} (val loss plateau for {PLATEAU_PATIENCE} epochs).")
                break
        else:
            plateau_count = 0
        prev_val = avg_val

    return train_losses, val_losses


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

@torch.no_grad()
def score_rows(
    model: Autoencoder,
    rows: list[dict],
    scaler,
    batch_size: int = 2048,
) -> np.ndarray:
    """Compute per-row reconstruction MSE for each row in `rows`.

    Returns float32 ndarray of shape (N,).
    """
    model.eval()
    device = torch.device("cpu")

    features = extract_features_batch(rows)  # (N, 18)
    features_scaled = scaler.transform(features).astype(np.float32)

    scores: list[float] = []
    for start in range(0, len(features_scaled), batch_size):
        batch = torch.from_numpy(features_scaled[start : start + batch_size]).to(device)
        recon = model(batch)
        # Per-sample MSE: mean over feature dim
        mse = ((recon - batch) ** 2).mean(dim=1).cpu().numpy()
        scores.extend(mse.tolist())

    return np.array(scores, dtype=np.float32)


# ---------------------------------------------------------------------------
# Write-back to PostgreSQL
# ---------------------------------------------------------------------------

def write_anomaly_scores(conn, row_ids: list[int], scores: np.ndarray) -> int:
    """Bulk-write anomaly_score to the transactions table via COPY + JOIN.

    Returns the number of rows updated.
    """
    assert len(row_ids) == len(scores), "row_ids and scores must have equal length"

    buf = io.StringIO()
    for rid, score in zip(row_ids, scores):
        buf.write(f"{rid}\t{float(score):.8f}\n")
    buf.seek(0)

    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TEMP TABLE _anomaly_scores (
                    tx_id BIGINT NOT NULL,
                    anomaly_score NUMERIC(10, 8) NOT NULL
                ) ON COMMIT DROP
            """)
            cur.copy_expert(
                "COPY _anomaly_scores (tx_id, anomaly_score) FROM STDIN WITH (FORMAT TEXT)",
                buf,
            )
            cur.execute("""
                UPDATE transactions t
                SET anomaly_score = s.anomaly_score
                FROM _anomaly_scores s
                WHERE t.id = s.tx_id
            """)
            updated = cur.rowcount

    return updated


# ---------------------------------------------------------------------------
# Plotting
# ---------------------------------------------------------------------------

def save_loss_curve(train_losses: list[float], val_losses: list[float], path: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    epochs = range(1, len(train_losses) + 1)
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(epochs, train_losses, label="Train MSE", linewidth=1.5)
    ax.plot(epochs, val_losses, label="Val MSE", linewidth=1.5)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("MSE Loss")
    ax.set_title("Autoencoder — Train vs Validation MSE")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"  Loss curve saved -> {path}")


def save_calibration_histogram(
    val_scores: np.ndarray,
    illicit_scores: np.ndarray,
    threshold: float,
    path: Path,
) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(12, 5))
    bins = np.linspace(0, max(val_scores.max(), illicit_scores.max() if len(illicit_scores) else val_scores.max()) * 1.05, 100)
    ax.hist(val_scores, bins=bins, alpha=0.6, label=f"Non-illicit held-out (n={len(val_scores):,})", color="steelblue")
    if len(illicit_scores):
        ax.hist(illicit_scores, bins=bins, alpha=0.7, label=f"Seed-illicit (n={len(illicit_scores):,})", color="tomato")
    ax.axvline(threshold, color="black", linestyle="--", linewidth=1.8, label=f"Threshold (95th pct) = {threshold:.5f}")
    ax.set_xlabel("Reconstruction MSE (anomaly_score)")
    ax.set_ylabel("Count")
    ax.set_title("Autoencoder Anomaly Score Distribution")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"  Calibration histogram saved -> {path}")


# ---------------------------------------------------------------------------
# Performance log
# ---------------------------------------------------------------------------

def append_perf_log(metrics: dict) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    entry = f"""
## Phase 5 — Autoencoder Training & Anomaly Scoring — {ts}

| Metric | Value |
|---|---|
| PyTorch version | {torch.__version__} |
| Device | CPU |
| Non-illicit training rows | {metrics['n_train']:,} |
| Non-illicit validation rows | {metrics['n_val']:,} |
| Seed-illicit rows | {metrics['n_illicit']:,} |
| All rows scored | {metrics['n_total']:,} |
| Epochs trained | {metrics['epochs_trained']} |
| Final train MSE | {metrics['final_train_loss']:.6f} |
| Final val MSE | {metrics['final_val_loss']:.6f} |
| Threshold (95th pct, val) | {metrics['threshold']:.6f} |
| Illicit score > threshold | {metrics['illicit_above_pct']:.1f}% |
| Non-illicit score > threshold | {metrics['nonillicit_above_pct']:.1f}% (expected ~5%) |
| Training wall-clock time | {metrics['train_elapsed_s']:.1f}s |
| Scoring wall-clock time | {metrics['score_elapsed_s']:.1f}s |
| Write-back wall-clock time | {metrics['writeback_elapsed_s']:.1f}s |
| Model file | {metrics['model_path']} |
| Scaler file | {metrics['scaler_path']} |

"""
    with open(PERF_LOG, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"  Appended metrics to {PERF_LOG.name}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Train Phase 5 Autoencoder.")
    parser.add_argument("--epochs", type=int, default=150, help="Max training epochs (default 150; early stopping applies)")
    parser.add_argument("--batch-size", type=int, default=256, help="Batch size (default 256)")
    parser.add_argument("--lr", type=float, default=1e-3, help="Adam learning rate (default 0.001)")
    args = parser.parse_args()

    datestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    models_dir = Path(settings.models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    model_path = models_dir / f"autoencoder_{datestamp}.pt"
    scaler_path = models_dir / f"scaler_{datestamp}.pkl"
    loss_curve_path = models_dir / f"loss_curve_{datestamp}.png"
    calib_hist_path = models_dir / f"calibration_hist_{datestamp}.png"

    print("=" * 60)
    print("Phase 5 — Autoencoder Training")
    print("=" * 60)
    print(f"  PyTorch {torch.__version__} | Device: CPU")
    print(f"  Batch size: {args.batch_size} | Max epochs: {args.epochs} | LR: {args.lr}")
    print()

    # 1. Connect to PostgreSQL
    conn = psycopg2.connect(settings.database_url)

    # 2. Load data
    print("[1/8] Loading transactions from PostgreSQL ...")
    non_illicit_rows, all_rows = load_transactions(conn)
    n_illicit_total = len(all_rows) - len(non_illicit_rows)

    # 3. Split
    print("\n[2/8] Splitting non-illicit rows 80/20 ...")
    random.seed(RANDOM_SEED)
    indices = list(range(len(non_illicit_rows)))
    random.shuffle(indices)
    split = int(len(indices) * TRAIN_SPLIT)
    train_idx = indices[:split]
    val_idx = indices[split:]
    train_rows = [non_illicit_rows[i] for i in train_idx]
    val_rows = [non_illicit_rows[i] for i in val_idx]
    print(f"  Train: {len(train_rows):,} rows | Val: {len(val_rows):,} rows")

    # 4. Feature extraction
    print("\n[3/8] Extracting features ...")
    t0 = time.time()
    X_train_raw = extract_features_batch(train_rows).astype(np.float32)
    X_val_raw = extract_features_batch(val_rows).astype(np.float32)
    X_all_raw = extract_features_batch(all_rows).astype(np.float32)
    print(f"  Feature extraction: {time.time() - t0:.2f}s")

    # 5. StandardScaler (fit on train only)
    print("\n[4/8] Fitting StandardScaler on train split ...")
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw).astype(np.float32)
    X_val = scaler.transform(X_val_raw).astype(np.float32)
    joblib.dump(scaler, scaler_path)
    print(f"  Scaler saved -> {scaler_path}")

    # 6. Build DataLoaders
    train_ds = TensorDataset(torch.from_numpy(X_train))
    val_ds = TensorDataset(torch.from_numpy(X_val))
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    # 7. Train
    print("\n[5/8] Training autoencoder ...")
    model = Autoencoder()
    t_train_start = time.time()
    train_losses, val_losses = train(model, train_loader, val_loader, epochs=args.epochs, lr=args.lr)
    train_elapsed = time.time() - t_train_start
    print(f"  Training complete in {train_elapsed:.1f}s | Epochs run: {len(train_losses)}")
    print(f"  Final train MSE: {train_losses[-1]:.6f} | Final val MSE: {val_losses[-1]:.6f}")

    # 8. Save model
    torch.save(model.state_dict(), model_path)
    print(f"  Model saved -> {model_path}")

    # Save loss curve
    save_loss_curve(train_losses, val_losses, loss_curve_path)

    # 9. Score all rows
    print("\n[6/8] Scoring all transactions ...")
    t_score_start = time.time()
    all_scores = score_rows(model, all_rows, scaler, batch_size=2048)
    score_elapsed = time.time() - t_score_start
    print(f"  Scored {len(all_scores):,} rows in {score_elapsed:.2f}s")

    # 10. Compute threshold on val (non-illicit held-out) scores
    val_scores_np = score_rows(model, val_rows, scaler, batch_size=2048)
    threshold = float(np.percentile(val_scores_np, settings.anomaly_threshold_percentile))
    print(f"\n[7/8] Threshold (95th pct of val non-illicit scores): {threshold:.6f}")

    # Compute verification stats
    nonillicit_above = float(np.mean(val_scores_np > threshold)) * 100  # should be ~5%

    # Identify illicit rows in all_rows to get their scores
    seed_set = _load_ransomwhere_seeds()
    illicit_mask = np.array([_is_illicit(r, seed_set) for r in all_rows], dtype=bool)
    if illicit_mask.sum() > 0:
        illicit_scores_np = all_scores[illicit_mask]
        illicit_above = float(np.mean(illicit_scores_np > threshold)) * 100
        print(f"  Illicit score > threshold:     {illicit_above:.1f}%")
        print(f"  Non-illicit score > threshold: {nonillicit_above:.1f}% (expected ~5%)")
    else:
        illicit_scores_np = np.array([], dtype=np.float32)
        illicit_above = 0.0
        print("  No seed-illicit transactions found in DB for verification.")

    # 11. Write-back to PostgreSQL
    print("\n[8/8] Writing anomaly_score to PostgreSQL ...")
    all_ids = [r["id"] for r in all_rows]
    t_wb_start = time.time()
    updated = write_anomaly_scores(conn, all_ids, all_scores)
    wb_elapsed = time.time() - t_wb_start
    print(f"  Updated {updated:,} rows in {wb_elapsed:.2f}s")

    conn.close()

    # 12. Calibration histogram
    save_calibration_histogram(val_scores_np, illicit_scores_np, threshold, calib_hist_path)

    # 13. Persist threshold for Phase 6/8 to consume
    threshold_file = models_dir / f"threshold_{datestamp}.json"
    with open(threshold_file, "w") as f:
        json.dump({"threshold": threshold, "percentile": settings.anomaly_threshold_percentile, "datestamp": datestamp}, f, indent=2)
    print(f"  Threshold JSON saved -> {threshold_file}")

    # 14. Append to PERFORMANCE_LOG.md
    append_perf_log({
        "n_train": len(train_rows),
        "n_val": len(val_rows),
        "n_illicit": int(illicit_mask.sum()),
        "n_total": len(all_rows),
        "epochs_trained": len(train_losses),
        "final_train_loss": train_losses[-1],
        "final_val_loss": val_losses[-1],
        "threshold": threshold,
        "illicit_above_pct": illicit_above,
        "nonillicit_above_pct": nonillicit_above,
        "train_elapsed_s": train_elapsed,
        "score_elapsed_s": score_elapsed,
        "writeback_elapsed_s": wb_elapsed,
        "model_path": str(model_path),
        "scaler_path": str(scaler_path),
    })

    print("\n" + "=" * 60)
    print("Phase 5 COMPLETE.")
    print(f"  Model: {model_path}")
    print(f"  Threshold: {threshold:.6f}")
    print(f"  Illicit above threshold: {illicit_above:.1f}%")
    print(f"  Wall-clock training time: {train_elapsed:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
