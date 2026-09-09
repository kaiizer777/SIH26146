"""Stage 3 ML-3 — Sync FT-Transformer Anomaly Scores to PostgreSQL.

Loads transactions from PostgreSQL, extracts 18 features, scores with
FTTransformerAnomaly checkpoint, updates transactions.anomaly_score via COPY,
and re-evaluates is_flagged.

Usage:
    backend/venv/Scripts/python backend/scripts/sync_ft_transformer_to_postgres.py
"""

from __future__ import annotations

import io
import json
import logging
import sys
import time
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import joblib
import numpy as np
import psycopg2
import torch

from app.config import settings
from app.ml.ft_transformer import FTTransformerAnomaly
from app.services.feature_extractor import extract_features_batch
from scripts.train_ft_transformer import load_transactions

logger = logging.getLogger("sync_ft_transformer")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def sync_anomaly_scores() -> tuple[int, int]:
    models_dir = Path(settings.models_dir)
    model_files = sorted(models_dir.glob("ft_transformer_*.pt"), reverse=True)
    scaler_files = sorted(models_dir.glob("ft_scaler_*.pkl"), reverse=True)
    thresh_files = sorted(models_dir.glob("ft_threshold_*.json"), reverse=True)

    if not model_files or not scaler_files or not thresh_files:
        raise FileNotFoundError("FT-Transformer artifacts not found in models directory.")

    model_path = model_files[0]
    scaler_path = scaler_files[0]
    thresh_path = thresh_files[0]

    with open(thresh_path, "r", encoding="utf-8") as f:
        thresh_data = json.load(f)
    calibrated_th = float(thresh_data.get("threshold", thresh_data.get("calibrated_threshold", 0.036354)))

    logger.info("Loading FT-Transformer artifacts: model=%s, scaler=%s, threshold=%.6f",
                model_path.name, scaler_path.name, calibrated_th)

    scaler = joblib.load(scaler_path)
    model = FTTransformerAnomaly()
    ckpt = torch.load(model_path, map_location="cpu", weights_only=False)
    state = ckpt.get("model_state_dict", ckpt) if isinstance(ckpt, dict) else ckpt
    model.load_state_dict(state)
    model.eval()

    logger.info("Connecting to PostgreSQL: %s", settings.database_url)
    conn = psycopg2.connect(settings.database_url)

    logger.info("Loading all transactions from PostgreSQL...")
    t0_load = time.time()
    _, all_rows = load_transactions(conn)
    logger.info("Loaded %d transactions in %.2fs", len(all_rows), time.time() - t0_load)

    logger.info("Extracting features and scaling...")
    t0_feat = time.time()
    feats_raw = extract_features_batch(all_rows)
    feats_scaled = scaler.transform(feats_raw).astype(np.float32)
    logger.info("Features ready in %.2fs", time.time() - t0_feat)

    logger.info("Scoring all transactions with FT-Transformer...")
    t0_inf = time.time()
    scores = model.score_numpy(feats_scaled, batch_size=2048)
    logger.info("Scoring finished in %.2fs (mean=%.6f, std=%.6f, median=%.6f)",
                time.time() - t0_inf, float(scores.mean()), float(scores.std()), float(np.median(scores)))

    logger.info("Bulk updating transactions.anomaly_score in PostgreSQL via COPY...")
    t0_up = time.time()
    with conn.cursor() as cur:
        cur.execute("CREATE TEMP TABLE _tx_anomaly (id BIGINT, anomaly_score NUMERIC(6,4)) ON COMMIT DROP")
        buf = io.StringIO()
        for r, s in zip(all_rows, scores):
            s_clamped = min(max(float(s), 0.0), 99.9999)
            buf.write(f"{r['id']}\t{s_clamped:.4f}\n")
        buf.seek(0)
        cur.copy_expert("COPY _tx_anomaly (id, anomaly_score) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')", buf)

        cur.execute("""
            UPDATE transactions t
            SET anomaly_score = ta.anomaly_score
            FROM _tx_anomaly ta
            WHERE t.id = ta.id
        """)
        updated_rows = cur.rowcount

        cur.execute("""
            UPDATE transactions
            SET is_flagged = (
                anomaly_score >= %s
                OR risk_score >= %s
                OR is_mixing = true
            )
        """, (calibrated_th, settings.risk_score_flag_threshold))
        flagged_rows = cur.rowcount
        conn.commit()

    conn.close()
    logger.info("PostgreSQL sync completed in %.2fs: %d anomaly scores updated, %d flagged rows re-evaluated.",
                time.time() - t0_up, updated_rows, flagged_rows)
    return updated_rows, flagged_rows


if __name__ == "__main__":
    t_start = time.time()
    print("=" * 65)
    print("STAGE 3 ML-3: FT-TRANSFORMER POSTGRESQL SYNCHRONIZATION")
    print("=" * 65)
    up, fl = sync_anomaly_scores()
    print("=" * 65)
    print(f"SYNC SUCCESS: {up:,} anomaly scores updated, {fl:,} transactions flagged ({time.time()-t_start:.2f}s total).")
    print("=" * 65)
