"""Inline Scorer Service — Phase 11.2 (Live Post-Ingest Online Inference).

Scores newly ingested transactions in-process using:
1. PyTorch FT-Transformer tabular reconstruction MSE (anomaly score; legacy Autoencoder fallback)
2. Scaler normalization (StandardScaler)
3. Heuristic rule detections (Ransomwhere seed overlap, peeling chain candidate)
4. Provisional composite scoring: clip(0.35 * min(mse/threshold, 1.0) + 0.15 * rules, 0.0, 1.0)
5. Generation of provisional composite and evidence records for XAI store upserts.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import threading
from typing import Any, Sequence

import joblib
import numpy as np
import torch
import torch.nn as nn

from app.config import settings
from app.services.feature_extractor import FEATURE_DIM, FEATURE_NAMES, extract_features_batch

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]

# ---------------------------------------------------------------------------
# Autoencoder architecture (matches train_autoencoder.py exactly)
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
# Lazy Artifact Registry
# ---------------------------------------------------------------------------

_model: nn.Module | None = None
_scaler: Any = None
_threshold: float = 0.03461795300245285
_seeds: set[str] = set()
_baseline_scores: np.ndarray | None = None
_anomaly_version: str = "ft_transformer_20260909"
_risk_version: str = "graph_transformer_20260909"
_init_lock = threading.Lock()
_initialized = False


def _find_file(pattern: str, base_dir: Path) -> Path | None:
    if not base_dir.exists():
        return None
    matches = sorted(base_dir.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def init_scorer() -> None:
    """Lazily load models, scaler, threshold, seeds, and baseline scores."""
    global _model, _scaler, _threshold, _seeds, _baseline_scores, _anomaly_version, _risk_version, _initialized
    if _initialized:
        return

    with _init_lock:
        if _initialized:
            return

        models_dir = Path(settings.models_dir)

        use_legacy_anomaly = getattr(settings, "use_legacy_anomaly_model", getattr(settings, "use_legacy_models", False))
        use_legacy_risk = getattr(settings, "use_legacy_risk_model", getattr(settings, "use_legacy_models", False))

        anom_label = "Autoencoder (legacy fallback)" if use_legacy_anomaly else "FT-Transformer (primary)"
        risk_label = "GraphSAGE (legacy fallback)" if use_legacy_risk else "Graph Transformer (primary)"
        logger.info("[MODEL CONFIG] Anomaly: %s | Risk: %s", anom_label, risk_label)

        # Resolve risk model version for metadata stamps
        if use_legacy_risk:
            gs_file = _find_file("graphsage_*.pt", models_dir)
            _risk_version = gs_file.stem if gs_file else "graphsage_20260908"
        else:
            gt_file = _find_file("graph_transformer_*.pt", models_dir)
            _risk_version = gt_file.stem if gt_file else "graph_transformer_20260909"

        if use_legacy_anomaly:
            logger.info("Fallback configuration active: loading legacy Autoencoder weights.")
            # 1. Threshold
            threshold_file = _find_file("threshold_*.json", models_dir)
            if threshold_file and threshold_file.exists():
                try:
                    with open(threshold_file, "r", encoding="utf-8") as f:
                        _threshold = float(json.load(f)["threshold"])
                except Exception as exc:
                    logger.warning("Failed to load legacy threshold json: %s", exc)

            # 2. Scaler
            scaler_file = _find_file("scaler_*.pkl", models_dir)
            if scaler_file and scaler_file.exists():
                try:
                    _scaler = joblib.load(scaler_file)
                except Exception as exc:
                    logger.warning("Failed to load legacy scaler pkl: %s", exc)

            # 3. Model
            model_file = _find_file("autoencoder_*.pt", models_dir)
            if model_file and model_file.exists():
                try:
                    model = Autoencoder()
                    state = torch.load(model_file, map_location="cpu", weights_only=True)
                    model.load_state_dict(state)
                    model.eval()
                    _model = model
                    _anomaly_version = model_file.stem
                    logger.info("Loaded legacy autoencoder model: %s (architecture: Autoencoder)", model_file)
                except Exception as exc:
                    logger.warning("Failed to load autoencoder model: %s", exc)
        else:
            # Stage 3 Default: Prioritize FT-Transformer
            # 1. Threshold (prioritize FT-Transformer threshold)
            threshold_file = _find_file("ft_threshold_*.json", models_dir) or _find_file("threshold_*.json", models_dir)
            if threshold_file and threshold_file.exists():
                try:
                    with open(threshold_file, "r", encoding="utf-8") as f:
                        _threshold = float(json.load(f)["threshold"])
                except Exception as exc:
                    logger.warning("Failed to load threshold json (%s), using default: %s", threshold_file, exc)

            # 2. Scaler (prioritize FT-Transformer scaler)
            scaler_file = _find_file("ft_scaler_*.pkl", models_dir) or _find_file("scaler_*.pkl", models_dir)
            if scaler_file and scaler_file.exists():
                try:
                    _scaler = joblib.load(scaler_file)
                except Exception as exc:
                    logger.warning("Failed to load scaler pkl (%s): %s", scaler_file, exc)

            # 3. Model: Prioritize FT-Transformer checkpoint; fallback to legacy Autoencoder
            ft_model_file = _find_file("ft_transformer_*.pt", models_dir)
            if ft_model_file and ft_model_file.exists():
                try:
                    from app.ml.ft_transformer import FTTransformerAnomaly

                    ckpt = torch.load(ft_model_file, map_location="cpu", weights_only=False)
                    if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
                        state_dict = ckpt["model_state_dict"]
                        model = FTTransformerAnomaly(
                            num_features=ckpt.get("num_features", 18),
                            d_model=ckpt.get("d_model", 64),
                            n_layers=ckpt.get("n_layers", 2),
                            n_heads=ckpt.get("n_heads", 4),
                            d_ff=ckpt.get("d_ff", 128),
                            dropout=ckpt.get("dropout", 0.1),
                        )
                    else:
                        state_dict = ckpt
                        model = FTTransformerAnomaly()

                    model.load_state_dict(state_dict)
                    model.eval()
                    _model = model
                    _anomaly_version = ft_model_file.stem
                    logger.info("Loaded FT-Transformer model: %s (architecture: FTTransformerAnomaly)", ft_model_file)
                except Exception as exc:
                    logger.warning("Failed to load FT-Transformer model (%s): %s", ft_model_file, exc)

            if _model is None:
                model_file = _find_file("autoencoder_*.pt", models_dir)
                if model_file and model_file.exists():
                    try:
                        model = Autoencoder()
                        state = torch.load(model_file, map_location="cpu", weights_only=True)
                        model.load_state_dict(state)
                        model.eval()
                        _model = model
                        _anomaly_version = model_file.stem
                        logger.info("Loaded legacy autoencoder model: %s (architecture: Autoencoder)", model_file)
                    except Exception as exc:
                        logger.warning("Failed to load autoencoder model (%s): %s", model_file, exc)

        # 4. Ransomwhere Seeds
        seed_paths = [
            models_dir.parent / "ransomwhere_seeds.json",
            _PROJECT_ROOT / "data" / "ransomwhere_seeds.json",
        ]
        for sp in seed_paths:
            if sp.exists():
                try:
                    with open(sp, "r", encoding="utf-8") as f:
                        raw = json.load(f)
                    records = raw.get("result", raw) if isinstance(raw, dict) else raw
                    _seeds = {
                        r["address"] for r in records if isinstance(r, dict) and "address" in r
                    }
                    logger.info("Loaded %d Ransomwhere seed addresses from %s", len(_seeds), sp)
                    break
                except Exception as exc:
                    logger.warning("Failed reading seeds from %s: %s", sp, exc)

        # 5. Baseline Anomaly Scores (for percentile ranking)
        xai_comp_path = Path(settings.composite_risk_scores_path)
        if xai_comp_path.exists():
            try:
                with open(xai_comp_path, "r", encoding="utf-8") as f:
                    raw_comp = json.load(f)
                items = raw_comp.values() if isinstance(raw_comp, dict) else raw_comp
                scores = [
                    float(item.get("anomaly_score", 0.0) or 0.0)
                    for item in items
                    if isinstance(item, dict) and "anomaly_score" in item
                ]
                if scores:
                    _baseline_scores = np.sort(np.array(scores, dtype=np.float32))
            except Exception as exc:
                logger.warning("Failed loading baseline scores from %s: %s", xai_comp_path, exc)

        _initialized = True
        logger.info(
            "Inline scorer initialized: threshold=%.6f, model_ready=%s, scaler_ready=%s, seeds=%d, baseline_scores=%d",
            _threshold,
            _model is not None,
            _scaler is not None,
            len(_seeds),
            len(_baseline_scores) if _baseline_scores is not None else 0,
        )


# ---------------------------------------------------------------------------
# Address extraction & helper utilities
# ---------------------------------------------------------------------------


def _parse_addresses(val: Any) -> list[str]:
    """Parse address list from Python list, tuple, string, or PostgreSQL array notation."""
    if isinstance(val, (list, tuple)):
        return [str(a).strip() for a in val if a and str(a).strip()]
    if isinstance(val, str):
        cleaned = val.strip().strip("{}")
        if not cleaned:
            return []
        return [a.strip() for a in cleaned.split(",") if a.strip()]
    return []


def map_verdict(score: float) -> str:
    """Map composite score to categorical verdict."""
    if score >= 0.70:
        return "CRITICAL"
    if score >= 0.50:
        return "HIGH"
    if score >= 0.30:
        return "MEDIUM"
    return "LOW"


def compute_percentile(anomaly_score: float) -> float:
    """Compute anomaly percentile vs indexed baseline (or fallback approximation)."""
    global _baseline_scores, _threshold
    if _baseline_scores is not None and len(_baseline_scores) > 0:
        rank = np.searchsorted(_baseline_scores, anomaly_score, side="right")
        return float(rank / len(_baseline_scores) * 100.0)

    # Deterministic fallback relative to 95th-percentile threshold
    if anomaly_score <= 0.0:
        return 0.0
    thresh = max(_threshold, 1e-8)
    if anomaly_score >= thresh:
        delta = (anomaly_score - thresh) / thresh
        return min(95.0 + 5.0 * min(delta, 1.0), 100.0)
    return (anomaly_score / thresh) * 95.0


# ---------------------------------------------------------------------------
# Public Scoring API
# ---------------------------------------------------------------------------


def score_batch(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Score a batch of newly ingested transaction rows inline.

    Args:
        rows: Sequence of transaction dictionaries (from PostgreSQL or ingest parser).

    Returns:
        List of scored records for every unique address appearing in rows, containing
        both composite_record and evidence_record schemas with provisional=True.
    """
    if not rows:
        return []

    init_scorer()

    # 1. Feature extraction & Anomaly MSE
    features = extract_features_batch(rows)
    N = len(rows)

    if _scaler is not None:
        scaled_features = _scaler.transform(features).astype(np.float32)
    else:
        scaled_features = features.astype(np.float32)

    if _model is not None:
        if hasattr(_model, "score_numpy"):
            mses = _model.score_numpy(scaled_features).tolist()
        else:
            device = torch.device("cpu")
            with torch.no_grad():
                batch_tensor = torch.from_numpy(scaled_features).to(device)
                recon = _model(batch_tensor)
                mses = ((recon - batch_tensor) ** 2).mean(dim=1).cpu().numpy().tolist()
    else:
        # Fallback if model could not be loaded: use normalized feature sum
        mses = [float(np.mean(row_feat ** 2)) for row_feat in scaled_features]

    # 2. Rule evaluation and address aggregation
    # Map each address to aggregated stats across all transactions it appears in
    address_map: dict[str, dict[str, Any]] = {}
    thresh = max(_threshold, 1e-8)

    for i, row in enumerate(rows):
        mse = float(mses[i])
        norm_anomaly = min(mse / thresh, 1.0)
        in_addrs = _parse_addresses(row.get("input_addresses"))
        out_addrs = _parse_addresses(row.get("output_addresses"))
        row_ts = row.get("ts")

        # Row-level conditions
        # Peeling chain candidate check: exactly 2 outputs, exactly 1 input
        is_candidate = (len(out_addrs) == 2 and len(in_addrs) == 1)
        has_seed_in = any(a in _seeds for a in in_addrs)

        # Combine all addresses involved in this transaction
        all_row_addrs = list(dict.fromkeys(in_addrs + out_addrs))

        for addr in all_row_addrs:
            addr_rules: list[str] = []
            addr_prox = 0.0

            is_in = addr in in_addrs
            is_out = addr in out_addrs
            is_seed = addr in _seeds

            if is_in and is_seed:
                addr_rules.append("RANSOMWHERE_SEED_INPUT")
                addr_prox = max(addr_prox, 1.0)
            if is_out and is_seed:
                addr_rules.append("RANSOMWHERE_SEED_OUTPUT")
                addr_prox = max(addr_prox, 1.0)
            if is_out and has_seed_in and not is_seed:
                addr_rules.append("RANSOMWHERE_SEED_RECIPIENT")
                addr_prox = max(addr_prox, 0.5)

            if is_candidate:
                addr_rules.append("PEELING_CHAIN_CANDIDATE")

            rule_factor = 1.0 if addr_rules else 0.0
            raw_prov = 0.35 * norm_anomaly + 0.15 * rule_factor
            prov_score = min(max(raw_prov / 0.50, 0.0), 1.0)

            if addr not in address_map:
                address_map[addr] = {
                    "anomaly_score": mse,
                    "provisional_score": prov_score,
                    "rules": set(addr_rules),
                    "is_mixing": is_candidate,
                    "seed_proximity": addr_prox,
                    "ts": row_ts,
                }
            else:
                entry = address_map[addr]
                if mse > entry["anomaly_score"]:
                    entry["anomaly_score"] = mse
                if prov_score > entry["provisional_score"]:
                    entry["provisional_score"] = prov_score
                entry["rules"].update(addr_rules)
                entry["is_mixing"] = entry["is_mixing"] or is_candidate
                if addr_prox > entry["seed_proximity"]:
                    entry["seed_proximity"] = addr_prox
                if row_ts is not None and (entry["ts"] is None or str(row_ts) > str(entry["ts"])):
                    entry["ts"] = row_ts

    # 3. Assemble composite and evidence records per unique address
    results: list[dict[str, Any]] = []

    for addr, agg in address_map.items():
        score = float(agg["provisional_score"])
        anomaly = float(agg["anomaly_score"])
        rules_list = sorted(list(agg["rules"]))
        verdict = map_verdict(score)
        percentile = compute_percentile(anomaly)
        is_mix = bool(agg["is_mixing"])
        seed_prox = float(agg["seed_proximity"])
        ts_str = str(agg["ts"]) if agg["ts"] is not None else None

        model_version_stamp = f"{_anomaly_version}+{_risk_version}"

        composite_record = {
            "address": addr,
            "anomaly_score": anomaly,
            "risk_score": 0.0,
            "composite_score": score,
            "verdict": verdict,
            "triggered_rules": rules_list,
            "is_mixing": is_mix,
            "provisional": True,
            "ts": ts_str,
            "rule_bonus": 0.15 if rules_list else 0.0,
            "mixing_indicator": 1.0 if is_mix else 0.0,
            "cluster_id": None,
            "cluster_size": 0,
            "chain_hops": 1 if is_mix else 0,
            "mixing_patterns": ["PEELING_CHAIN_CANDIDATE"] if is_mix else [],
            "seed_wallet_proximity": seed_prox,
            "model_version": model_version_stamp,
            "anomaly_model_version": _anomaly_version,
            "risk_model_version": _risk_version,
        }

        evidence_record = {
            "address": addr,
            "cluster_id": None,
            "anomaly_score": anomaly,
            "anomaly_percentile": percentile,
            "anomaly_rank_percentile": percentile,
            "seed_wallet_proximity": seed_prox,
            "mixing_hops": None,
            "triggered_rules": rules_list,
            "provisional": True,
            "model_version": model_version_stamp,
            "anomaly_model_version": _anomaly_version,
            "risk_model_version": _risk_version,
        }

        # Top-level item satisfies both direct schema assertions and nested upsert lookups
        item = {
            "address": addr,
            "anomaly_score": anomaly,
            "risk_score": 0.0,
            "composite_score": score,
            "verdict": verdict,
            "triggered_rules": rules_list,
            "is_mixing": is_mix,
            "provisional": True,
            "ts": ts_str,
            "model_version": model_version_stamp,
            "anomaly_model_version": _anomaly_version,
            "risk_model_version": _risk_version,
            "composite_record": composite_record,
            "evidence_record": evidence_record,
        }
        results.append(item)

    return results


def reset_scorer_for_tests() -> None:
    """Reset scorer singleton state for testing fallback configurations."""
    global _model, _scaler, _threshold, _seeds, _baseline_scores, _anomaly_version, _risk_version, _initialized
    with _init_lock:
        _model = None
        _scaler = None
        _threshold = 0.03461795300245285
        _seeds = set()
        _baseline_scores = None
        _anomaly_version = "ft_transformer_20260909"
        _risk_version = "graph_transformer_20260909"
        _initialized = False


def get_model_info() -> dict[str, Any]:
    """Return dictionary of loaded model type, threshold, and model versions."""
    return {
        "model_type": type(_model).__name__ if _model is not None else None,
        "threshold": _threshold,
        "scaler_loaded": _scaler is not None,
        "anomaly_version": _anomaly_version,
        "risk_version": _risk_version,
        "model_version": f"{_anomaly_version}+{_risk_version}",
    }


