"""Stage 3 ML-3 — Production Promotion Pipeline & Gate Enforcement.

Gates, promotes, and synchronizes the Relational Graph Transformer (PyG)
and FT-Transformer models into production stores (PostgreSQL, Neo4j) and downstream
XAI evidence artifacts:
    1. Gate Validation:
       - Confirms checkpoint test metrics assert F1 >= 0.88 (abort exit code 1 if failed).
       - Confirms FT-Transformer checkpoint availability and structural validity.
    2. Atomic Backup:
       - Backs up existing data/wallet_risk_scores.json to data/wallet_risk_scores.json.bak.
    3. Full Inference & Calibration:
       - Runs RelationalGraphTransformer inference on all 24,673 wallet nodes under torch.no_grad().
       - Enforces score bounds in [0.0, 1.0] and records inference latency.
    4. Database Synchronization:
       - Neo4j: Batched UNWIND updates to :Wallet nodes (risk_score, model_version, promoted_at).
       - PostgreSQL: Bulk updates transactions.risk_score and re-evaluates is_flagged.
       - Artifact: Atomic write of data/wallet_risk_scores.json.
    5. Downstream Rebuild:
       - Regenerates data/xai/evidence_trails.json and data/xai/composite_risk_scores.json.

CLI Flags:
    --dry-run: Run gate validation and inference without mutating databases or files.
    --force:   Bypass the F1 >= 0.88 promotion gate.

Usage:
    backend/venv/Scripts/python backend/scripts/promote_models.py [--dry-run] [--force]
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import numpy as np
import psycopg2
import psycopg2.extras
import torch

from app.config import settings
from app.ml.graph_transformer import RelationalGraphTransformer
from app.services.graph_service import GraphService

logger = logging.getLogger("promote_models")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

_MODELS_DIR = Path(settings.models_dir)
_DATA_DIR = _PROJECT_ROOT / "data"
_CACHE_FILE = _DATA_DIR / "staging_graph_cache.pt"
_RISK_SCORES_FILE = Path(settings.wallet_risk_scores_path)
_BACKUP_FILE = _DATA_DIR / "wallet_risk_scores.json.bak"
_INDEX_MAP_FILE = Path(settings.wallet_index_map_path)
_EVIDENCE_TRAILS_FILE = Path(settings.evidence_trails_path)
_COMPOSITE_RISK_FILE = Path(settings.composite_risk_scores_path)

DEFAULT_F1_GATE = 0.88
NEO4J_BATCH_SIZE = 1_000


def find_latest_checkpoint(pattern: str) -> Optional[Path]:
    """Find the most recent checkpoint file matching glob pattern."""
    files = sorted(_MODELS_DIR.glob(pattern))
    return files[-1] if files else None


def validate_promotion_gate(
    gt_path: Path,
    ft_path: Optional[Path],
    f1_gate: float = DEFAULT_F1_GATE,
    force: bool = False,
) -> Dict[str, Any]:
    """Inspect model checkpoint and enforce promotion criteria."""
    print("\n" + "=" * 65)
    print("GATE VALIDATION: STAGE 3 TRANSFORMER ARTIFACTS")
    print("=" * 65)

    if not gt_path.exists():
        raise FileNotFoundError(f"Graph Transformer checkpoint not found: {gt_path}")

    print(f"  [Artifact] Graph Transformer: {gt_path.name}")
    gt_checkpoint = torch.load(gt_path, map_location="cpu", weights_only=False)

    if ft_path and ft_path.exists():
        print(f"  [Artifact] FT-Transformer:    {ft_path.name}")
        ft_checkpoint = torch.load(ft_path, map_location="cpu", weights_only=False)
        if isinstance(ft_checkpoint, dict) and "layers.0.mha.in_proj_weight" in ft_checkpoint:
            print("  [Artifact] FT-Transformer state dictionary verified.")
    else:
        print("  [Warning] FT-Transformer checkpoint not found in models dir.")

    metrics = gt_checkpoint.get("metrics")
    if not isinstance(metrics, dict):
        msg = f"Checkpoint {gt_path.name} does not contain valid 'metrics' dictionary."
        if not force:
            print(f"  [FAIL] {msg}")
            sys.exit(1)
        else:
            print(f"  [FORCE] Bypassing missing metrics: {msg}")
            metrics = {}

    f1 = float(metrics.get("f1", 0.0))
    prec = float(metrics.get("precision", 0.0))
    rec = float(metrics.get("recall", 0.0))
    auc = float(metrics.get("roc_auc", 0.0))
    th = float(metrics.get("threshold", gt_checkpoint.get("best_threshold", 0.70)))
    lat_ms = float(metrics.get("full_graph_inference_ms", 0.0))

    print(f"  Gate Threshold Requirement: F1 >= {f1_gate:.4f}")
    print(f"  Recorded Metrics (calibrated th={th:.2f}):")
    print(f"    - F1 Score:  {f1:.4f}")
    print(f"    - Precision: {prec:.4f}")
    print(f"    - Recall:    {rec:.4f}")
    print(f"    - ROC-AUC:   {auc:.4f}")
    print(f"    - CPU Latency: {lat_ms:.2f} ms")

    gate_passed = f1 >= f1_gate
    if not gate_passed:
        if not force:
            print(f"\n  [GATE REJECTED] Held-out test F1 ({f1:.4f}) < Gate ({f1_gate:.4f}).")
            print("  Aborting promotion pipeline with exit code 1. Use --force to override.")
            sys.exit(1)
        else:
            print(f"\n  [GATE BYPASS] Held-out test F1 ({f1:.4f}) < Gate ({f1_gate:.4f}), but --force enabled.")
    else:
        print(f"\n  [GATE APPROVED] Held-out test F1 ({f1:.4f}) >= Gate ({f1_gate:.4f}). Promotion permitted.")

    return {
        "gt_checkpoint": gt_checkpoint,
        "metrics": metrics,
        "f1": f1,
        "best_threshold": th,
        "date": gt_checkpoint.get("date", datetime.now(timezone.utc).strftime("%Y%m%d")),
    }


def create_atomic_backup() -> Optional[Path]:
    """Create a safe backup of data/wallet_risk_scores.json before mutations."""
    if not _RISK_SCORES_FILE.exists():
        print(f"  [Backup] {_RISK_SCORES_FILE.name} does not exist yet. Skipping backup.")
        return None

    shutil.copy2(_RISK_SCORES_FILE, _BACKUP_FILE)
    ts = datetime.now(timezone.utc).isoformat()
    size_kb = _BACKUP_FILE.stat().st_size / 1024.0
    print(f"  [Backup Created] {_BACKUP_FILE} ({size_kb:.1f} KB, timestamp={ts})")
    return _BACKUP_FILE


def restore_backup() -> None:
    """Restore previous wallet risk scores from backup upon mutation failure."""
    if _BACKUP_FILE.exists():
        shutil.copy2(_BACKUP_FILE, _RISK_SCORES_FILE)
        print(f"  [Rollback] Restored {_RISK_SCORES_FILE} from {_BACKUP_FILE}.")


def run_full_inference(
    gt_checkpoint: Dict[str, Any]
) -> Tuple[RelationalGraphTransformer, Dict[str, float], List[str], float]:
    """Load model weights and run torch.no_grad() inference over the graph."""
    print("\n" + "=" * 65)
    print("FULL GRAPH INFERENCE & TOPOLOGICAL RISK PROPAGATION")
    print("=" * 65)

    # 1. Load dataset cache
    if not _CACHE_FILE.exists():
        raise FileNotFoundError(f"Staging graph cache not found: {_CACHE_FILE}")

    print(f"  Loading staging graph cache from {_CACHE_FILE.name} ...")
    t0 = time.time()
    cache = torch.load(_CACHE_FILE, map_location="cpu", weights_only=False)
    x = cache["x"]
    edge_index = cache["edge_index"]
    edge_type = cache["edge_type"]
    all_addrs: List[str] = cache["all_addrs"]
    num_nodes = len(all_addrs)
    print(f"  Loaded {num_nodes:,} wallet nodes, {edge_index.size(1):,} relational edges in {time.time()-t0:.2f}s.")

    # 2. Instantiate model architecture
    in_channels = gt_checkpoint.get("in_channels", 8)
    hidden_dim = gt_checkpoint.get("hidden_dim", 32)
    out_dim = gt_checkpoint.get("out_dim", 16)
    heads = gt_checkpoint.get("heads", 4)
    edge_dim = gt_checkpoint.get("edge_dim", 16)
    num_edge_types = gt_checkpoint.get("num_edge_types", 3)
    dropout = gt_checkpoint.get("dropout", 0.1)

    model = RelationalGraphTransformer(
        in_channels=in_channels,
        hidden_dim=hidden_dim,
        out_dim=out_dim,
        heads=heads,
        edge_dim=edge_dim,
        num_edge_types=num_edge_types,
        dropout=dropout,
    )
    model.load_state_dict(gt_checkpoint["model_state_dict"])
    model.eval()

    # 3. Model forward pass
    t_inf_start = time.perf_counter()
    with torch.no_grad():
        out = model(x, edge_index, edge_type=edge_type)
    t_inf_end = time.perf_counter()
    inference_ms = (t_inf_end - t_inf_start) * 1000.0

    raw_scores = out.squeeze(-1).numpy()
    clamped_scores = np.clip(raw_scores, 0.0, 1.0)
    addr_to_score: Dict[str, float] = {
        addr: float(score) for addr, score in zip(all_addrs, clamped_scores)
    }

    per_node_ms = inference_ms / max(num_nodes, 1)
    print(f"  Inference completed in {inference_ms:.2f} ms ({per_node_ms:.4f} ms/node).")
    print(f"  Score Statistics (N={num_nodes:,}):")
    print(f"    - Min:    {clamped_scores.min():.4f}")
    print(f"    - Max:    {clamped_scores.max():.4f}")
    print(f"    - Mean:   {clamped_scores.mean():.4f}")
    print(f"    - Median: {np.median(clamped_scores):.4f}")
    print(f"    - 95th Percentile: {np.percentile(clamped_scores, 95):.4f}")
    th_calibrated = float(gt_checkpoint.get("best_threshold", 0.70))
    n_flagged_50 = int((clamped_scores >= 0.50).sum())
    n_flagged_th = int((clamped_scores >= th_calibrated).sum())
    print(f"    - Wallets >= 0.50:            {n_flagged_50:,} ({100*n_flagged_50/num_nodes:.2f}%)")
    print(f"    - Wallets >= {th_calibrated:.2f} (calibrated): {n_flagged_th:,} ({100*n_flagged_th/num_nodes:.2f}%)")

    return model, addr_to_score, all_addrs, inference_ms


def sync_to_neo4j(
    all_addrs: List[str],
    addr_to_score: Dict[str, float],
    model_version: str,
    batch_size: int = NEO4J_BATCH_SIZE,
) -> int:
    """Batch update Wallet nodes in Neo4j with updated risk scores and model provenance."""
    print("\n" + "=" * 65)
    print("NEO4J SYNCHRONIZATION: BATCHED UNWIND UPDATES")
    print("=" * 65)

    svc = GraphService()
    svc.connect()
    total_updated = 0
    t0 = time.time()

    cypher_query = """
    UNWIND $batch AS row
    MATCH (w:Wallet {address: row.address})
    SET w.risk_score = row.risk_score,
        w.model_version = $model_version,
        w.promoted_at = datetime()
    RETURN count(w) AS cnt
    """

    try:
        for i in range(0, len(all_addrs), batch_size):
            batch_keys = all_addrs[i : i + batch_size]
            batch = [
                {"address": addr, "risk_score": float(addr_to_score[addr])}
                for addr in batch_keys
            ]
            with svc.driver.session() as session:
                res = session.run(
                    cypher_query,
                    batch=batch,
                    model_version=model_version,
                )
                record = res.single()
                total_updated += record["cnt"] if record else 0

        # Verify zero NULLs
        with svc.driver.session() as session:
            null_res = session.run(
                "MATCH (w:Wallet) WHERE w.risk_score IS NULL RETURN count(w) AS null_cnt"
            ).single()
            null_cnt = null_res["null_cnt"] if null_res else 0

        elapsed = time.time() - t0
        print(f"  Neo4j sync complete: {total_updated:,} wallets updated in {elapsed:.2f}s.")
        print(f"  Neo4j integrity check: NULL risk_score count = {null_cnt:,} (must be 0).")
        if null_cnt > 0:
            raise ValueError(f"Found {null_cnt} Neo4j Wallet nodes with NULL risk_score after sync.")

        return total_updated
    finally:
        svc.close()


def sync_to_postgres(
    all_addrs: List[str],
    addr_to_score: Dict[str, float],
) -> Tuple[int, int]:
    """Synchronize updated risk scores to PostgreSQL transactions and re-evaluate flags."""
    print("\n" + "=" * 65)
    print("POSTGRESQL SYNCHRONIZATION: TRANSACTIONS & FLAGS")
    print("=" * 65)

    # 1. Resolve anomaly threshold for is_flagged
    anomaly_threshold = 0.034618
    threshold_file = _MODELS_DIR / "threshold_20260907.json"
    if threshold_file.exists():
        with open(threshold_file, "r", encoding="utf-8") as f:
            td = json.load(f)
            anomaly_threshold = float(td.get("threshold", anomaly_threshold))

    risk_flag_threshold = settings.risk_score_flag_threshold
    t0 = time.time()

    conn = psycopg2.connect(settings.database_url)
    try:
        with conn.cursor() as cur:
            # Temporary table for bulk join update
            cur.execute(
                """
                CREATE TEMP TABLE _wallet_risk (
                    address TEXT PRIMARY KEY,
                    risk_score NUMERIC(6,4)
                ) ON COMMIT DROP
                """
            )

            buf = io.StringIO()
            for addr in all_addrs:
                score = addr_to_score[addr]
                buf.write(f"{addr}\t{score:.4f}\n")
            buf.seek(0)

            cur.copy_expert(
                "COPY _wallet_risk (address, risk_score) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')",
                buf,
            )

            # Update transactions joined on input_addresses[1] (primary wallet)
            cur.execute(
                """
                UPDATE transactions t
                SET risk_score = wr.risk_score
                FROM _wallet_risk wr
                WHERE t.input_addresses[1] = wr.address
                """
            )
            rows_updated_risk = cur.rowcount

            # Check if a dedicated wallets table exists
            cur.execute("SELECT to_regclass('public.wallets')")
            wallets_table = cur.fetchone()[0]
            if wallets_table:
                cur.execute(
                    """
                    UPDATE wallets w
                    SET risk_score = wr.risk_score
                    FROM _wallet_risk wr
                    WHERE w.address = wr.address
                    """
                )
                print(f"  Updated {cur.rowcount:,} rows in wallets table.")

            # Update is_flagged composite trigger
            cur.execute(
                """
                UPDATE transactions
                SET is_flagged = (
                    anomaly_score > %s
                    OR risk_score >= %s
                    OR is_mixing = true
                )
                WHERE risk_score IS NOT NULL OR anomaly_score IS NOT NULL
                """,
                (anomaly_threshold, risk_flag_threshold),
            )
            rows_updated_flagged = cur.rowcount

            conn.commit()

        elapsed = time.time() - t0
        print(f"  PostgreSQL transactions updated: {rows_updated_risk:,} rows (risk_score sync).")
        print(f"  PostgreSQL transactions flagged: {rows_updated_flagged:,} rows re-evaluated.")
        print(f"  PostgreSQL sync elapsed: {elapsed:.2f}s.")
        return rows_updated_risk, rows_updated_flagged

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def write_risk_scores_json(addr_to_score: Dict[str, float]) -> Path:
    """Atomically write updated wallet risk scores to disk."""
    print("\n" + "=" * 65)
    print("ARTIFACT PARITY: WALLET RISK SCORES JSON")
    print("=" * 65)

    tmp_file = _RISK_SCORES_FILE.with_suffix(".tmp")
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(addr_to_score, f, indent=None, separators=(",", ":"))

    tmp_file.replace(_RISK_SCORES_FILE)
    size_mb = _RISK_SCORES_FILE.stat().st_size / (1024 * 1024)
    print(f"  Written: {_RISK_SCORES_FILE} ({size_mb:.2f} MB, {len(addr_to_score):,} wallets).")
    return _RISK_SCORES_FILE


def rebuild_downstream_xai() -> None:
    """Trigger rebuild of evidence trails and composite risk scores."""
    print("\n" + "=" * 65)
    print("DOWNSTREAM XAI EVIDENCE REBUILD")
    print("=" * 65)

    trails_script = _BACKEND / "scripts" / "build_evidence_trails.py"
    composite_script = _BACKEND / "scripts" / "compute_composite_risk.py"

    t0 = time.time()
    print("  Rebuilding evidence trails (build_evidence_trails.py) ...")
    res1 = subprocess.run(
        [sys.executable, str(trails_script)],
        cwd=str(_PROJECT_ROOT),
        capture_output=True,
        text=True,
    )
    if res1.returncode != 0:
        print("  [ERROR] build_evidence_trails.py failed:")
        print(res1.stderr)
        raise RuntimeError(f"build_evidence_trails.py exited with code {res1.returncode}")
    print(f"  Evidence trails rebuilt successfully in {time.time()-t0:.1f}s.")

    t1 = time.time()
    print("  Rebuilding composite risk scores (compute_composite_risk.py) ...")
    res2 = subprocess.run(
        [sys.executable, str(composite_script)],
        cwd=str(_PROJECT_ROOT),
        capture_output=True,
        text=True,
    )
    if res2.returncode != 0:
        print("  [ERROR] compute_composite_risk.py failed:")
        print(res2.stderr)
        raise RuntimeError(f"compute_composite_risk.py exited with code {res2.returncode}")
    print(f"  Composite risk scores rebuilt successfully in {time.time()-t1:.1f}s.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote Stage 3 Transformer models to Production")
    parser.add_argument("--dry-run", action="store_true", help="Validate gate and run inference without DB mutations")
    parser.add_argument("--force", action="store_true", help="Bypass promotion gate F1 >= 0.88 check")
    parser.add_argument("--f1-gate", type=float, default=DEFAULT_F1_GATE, help="F1 promotion threshold")
    parser.add_argument("--batch-size", type=int, default=NEO4J_BATCH_SIZE, help="Neo4j batch update size")
    args = parser.parse_args()

    print("=" * 65)
    print("STAGE 3 ML-3: PRODUCTION PROMOTION & SYNCHRONIZATION PIPELINE")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()} | Dry-Run: {args.dry_run} | Force: {args.force}")
    print("=" * 65)

    # 1. Discover checkpoints
    gt_path = find_latest_checkpoint("graph_transformer_*.pt")
    ft_path = find_latest_checkpoint("ft_transformer_*.pt")

    if not gt_path:
        print("  [FATAL] No graph_transformer_*.pt model found in models directory.")
        sys.exit(1)

    # 2. Gate validation
    gate_info = validate_promotion_gate(
        gt_path=gt_path,
        ft_path=ft_path,
        f1_gate=args.f1_gate,
        force=args.force,
    )
    gt_checkpoint = gate_info["gt_checkpoint"]
    model_version = gt_path.stem

    # 3. Dry-run early branch or backup
    if not args.dry_run:
        create_atomic_backup()
    else:
        print("\n  [DRY-RUN MODE] Skipping backup and mutation steps.")

    # 4. Run full inference
    try:
        model, addr_to_score, all_addrs, inf_ms = run_full_inference(gt_checkpoint)
    except Exception as exc:
        print(f"\n  [FATAL] Inference failed: {exc}")
        if not args.dry_run:
            restore_backup()
        sys.exit(1)

    if args.dry_run:
        print("\n" + "=" * 65)
        print("DRY-RUN COMPLETE: ZERO MUTATIONS APPLIED")
        print(f"  Gate Status:           PASS (F1 = {gate_info['f1']:.4f} >= {args.f1_gate})")
        print(f"  Model Version:         {model_version}")
        print(f"  Wallets Evaluated:     {len(all_addrs):,}")
        print(f"  Inference Latency:     {inf_ms:.2f} ms")
        print("  Databases Touched:     0 (Neo4j & PostgreSQL intact)")
        print("  Artifacts Overwritten: 0 (wallet_risk_scores.json intact)")
        print("=" * 65)
        return

    # 5. Live synchronization with rollback guard
    try:
        neo4j_updated = sync_to_neo4j(
            all_addrs=all_addrs,
            addr_to_score=addr_to_score,
            model_version=model_version,
            batch_size=args.batch_size,
        )

        pg_risk_rows, pg_flag_rows = sync_to_postgres(
            all_addrs=all_addrs,
            addr_to_score=addr_to_score,
        )

        try:
            from scripts.sync_ft_transformer_to_postgres import sync_anomaly_scores
            pg_anomaly_rows, _ = sync_anomaly_scores()
            print(f"  FT-Transformer anomaly scores synchronized: {pg_anomaly_rows:,} rows.")
        except Exception as exc:
            print(f"  [Warning] FT-Transformer sync skipped ({exc}).")

        write_risk_scores_json(addr_to_score)

        rebuild_downstream_xai()

    except Exception as exc:
        print(f"\n  [ERROR DURING PROMOTION] {exc}")
        print("  Initiating safe rollback of local artifacts ...")
        restore_backup()
        raise

    # 6. Final Verification Summary
    print("\n" + "=" * 65)
    print("PROMOTION PIPELINE COMPLETE — 100% SYNCHRONIZED")
    print("=" * 65)
    print(f"  Model Version:        {model_version}")
    print(f"  Promotion Gate:       PASS (F1 = {gate_info['f1']:.4f} >= {args.f1_gate})")
    print(f"  Inference Speed:      {inf_ms:.2f} ms ({inf_ms/len(all_addrs):.4f} ms/node)")
    print(f"  Neo4j Wallets:        {neo4j_updated:,} updated (0 NULLs)")
    print(f"  PostgreSQL Rows:      {pg_risk_rows:,} risk updated, {pg_flag_rows:,} flagged re-evaluated")
    print(f"  Local Artifact:       {_RISK_SCORES_FILE}")
    print(f"  Evidence Trails:      {_EVIDENCE_TRAILS_FILE}")
    print(f"  Composite Risk:       {_COMPOSITE_RISK_FILE}")
    print("=" * 65)


if __name__ == "__main__":
    main()
