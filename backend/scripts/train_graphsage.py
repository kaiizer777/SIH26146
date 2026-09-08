"""Phase 7 — F4: Risk Scoring (GraphSAGE via PyTorch Geometric).

Pipeline:
    Step 1: Run GDS PageRank seeded from Ransomwhere illicit wallets
            → seed_proximity_score per wallet (normalised to [0,1]).
    Step 2: Export wallet graph to PyG Data object.
            Node features (D=8): cluster_id_norm, max_anomaly_score,
            mixing_ratio, avg_fee_log, num_inputs_total_log,
            num_outputs_total_log, avg_output_entropy, seed_proximity_score.
            Edge index: CO_SPEND undirected, shape [2, 2*E].
            Labels y: 1 if address in Ransomwhere seeds, else 0.
            Masks: train/val/test 70/15/15 stratified.
    Step 3: Train 3-layer GraphSAGE (focal loss, γ=2.0, α=neg/pos ratio).
    Step 4: Inference → write risk_score to Neo4j + PostgreSQL.
            Compute is_flagged composite trigger.
    Step 5: Evaluate F1/precision/recall on test mask; log timings.

Focal-loss hyperparameter justification:
    γ=2.0: Lin et al. "Focal Loss for Dense Object Detection", ICCV 2017,
           Table 1, γ=2 shown best on standard dense-detection benchmarks.
    α: computed from neg/pos class ratio in the training split, clamped to 20.
    No values are attributed to "FG-EGCN" (confirmed misattribution per WORK.md).

Usage:
    backend/venv/Scripts/python backend/scripts/train_graphsage.py [--epochs N]
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

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

import numpy as np
import psycopg2
import psycopg2.extras
import torch
from sklearn.preprocessing import StandardScaler
from torch_geometric.data import Data

from app.config import settings
from app.ml.graphsage import (
    GraphSAGEClassifier,
    compute_alpha,
    focal_loss,
)
from app.services.graph_service import GraphService

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TRAIN_RATIO = 0.70
VAL_RATIO   = 0.15
# TEST_RATIO  = 0.15  (implied)
RANDOM_SEED = 42

# Training hyperparameters
DEFAULT_EPOCHS   = 200
LR               = 5e-3
WEIGHT_DECAY     = 5e-4
EARLY_STOP_PAT   = 20   # patience in epochs

# Architecture (mirrors config defaults — config is the single source of truth)
HIDDEN_1    = settings.graphsage_hidden_dim_1     # 64
HIDDEN_2    = settings.graphsage_hidden_dim_2     # 32
EMBED_DIM   = settings.graphsage_embedding_dim    # 16
DROPOUT     = settings.graphsage_dropout          # 0.2
FOCAL_GAMMA = settings.graphsage_focal_gamma      # 2.0
ALPHA_MAX   = settings.graphsage_focal_alpha_max  # 20.0

# Node feature dimension (fixed)
NODE_FEATURE_DIM = 8

# GDS PageRank params
GDS_GRAPH_NAME     = "wallet_seeded_pr"
GDS_PR_ITERATIONS  = 20
GDS_PR_DAMPING     = 0.85   # standard damping factor

# Neo4j write batch size
NEO4J_BATCH = 1_000

# File paths
_DATA_DIR          = _PROJECT_ROOT / "data"
_MODELS_DIR        = Path(settings.models_dir)
_RANSOMWHERE_FILE  = _DATA_DIR / "ransomwhere_seeds.json"
_INDEX_MAP_FILE    = Path(settings.wallet_index_map_path)
_RISK_SCORES_FILE  = Path(settings.wallet_risk_scores_path)
_PERF_LOG          = _PROJECT_ROOT / "PERFORMANCE_LOG.md"


# ---------------------------------------------------------------------------
# Helpers: Ransomwhere seeds
# ---------------------------------------------------------------------------

def load_ransomwhere_seeds() -> set[str]:
    """Load Ransomwhere seed addresses from data/ransomwhere_seeds.json."""
    if not _RANSOMWHERE_FILE.exists():
        print("  WARNING: ransomwhere_seeds.json not found; positive label set will be empty.")
        return set()
    with open(_RANSOMWHERE_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    records = raw.get("result", raw) if isinstance(raw, dict) else raw
    addrs = {rec["address"] for rec in records if isinstance(rec, dict) and "address" in rec}
    print(f"  Loaded {len(addrs):,} Ransomwhere seed addresses.")
    return addrs


# ---------------------------------------------------------------------------
# Step 1: Seeded PageRank via Neo4j GDS
# ---------------------------------------------------------------------------

def _tag_seed_wallets(svc: GraphService, seed_addrs: set[str]) -> int:
    """Set is_seed_illicit=true on :Wallet nodes matching Ransomwhere addresses.

    Returns the count of tagged nodes.
    """
    print("  Tagging seed-illicit wallets in Neo4j ...")
    # First clear any previous tagging to keep this idempotent
    with svc.driver.session() as s:
        s.run("MATCH (w:Wallet) WHERE w.is_seed_illicit = true SET w.is_seed_illicit = false")

    seed_list = list(seed_addrs)
    tagged = 0
    batch_size = 1_000
    for i in range(0, len(seed_list), batch_size):
        batch = seed_list[i : i + batch_size]
        with svc.driver.session() as s:
            result = s.run(
                """
                UNWIND $addrs AS addr
                MATCH (w:Wallet {address: addr})
                SET w.is_seed_illicit = true
                RETURN count(w) AS cnt
                """,
                addrs=batch,
            )
            tagged += result.single()["cnt"]
    print(f"  Tagged {tagged:,} wallets as is_seed_illicit=true.")
    return tagged


def run_seeded_pagerank(svc: GraphService, seed_addrs: set[str]) -> Dict[str, float]:
    """Run GDS PageRank with teleport bias towards seed-illicit wallets.

    GDS Personalized PageRank restarts the random walk from a specified subset
    of source nodes, effectively propagating their influence through the graph.
    The resulting scores are normalised to [0, 1].

    Returns:
        dict mapping wallet address → normalised PageRank score.
    """
    print("\n[Step 1] Seeded PageRank (GDS Personalized PageRank) ...")

    # Tag seed wallets in Neo4j
    n_tagged = _tag_seed_wallets(svc, seed_addrs)
    if n_tagged == 0:
        print("  WARNING: 0 seed wallets found in Neo4j — seed_proximity_score will be all-zero.")
        return {}

    # Drop stale projection
    with svc.driver.session() as s:
        s.run("CALL gds.graph.drop($name, false) YIELD graphName", name=GDS_GRAPH_NAME)

    # Project wallet + CO_SPEND graph
    print(f"  Projecting '{GDS_GRAPH_NAME}' ...")
    t0 = time.time()
    with svc.driver.session() as s:
        s.run(
            """
            CALL gds.graph.project(
                $name,
                'Wallet',
                {CO_SPEND: {orientation: 'UNDIRECTED'}}
            )
            """,
            name=GDS_GRAPH_NAME,
        )
    print(f"  Projection done in {time.time()-t0:.1f}s.")

    # Run Personalized PageRank (stream mode — no write needed, we handle storage)
    # GDS 2.13 sourceNodes must be actual node references, not element ID strings.
    # We collect the seed nodes first via a subquery and pass them as a Cypher list.
    print(f"  Running Personalized PageRank (iterations={GDS_PR_ITERATIONS}) ...")
    t1 = time.time()
    scores: Dict[str, float] = {}
    with svc.driver.session() as s:
        result = s.run(
            """
            MATCH (seed:Wallet {is_seed_illicit: true})
            WITH collect(seed) AS seedNodes
            CALL gds.pageRank.stream(
                $name,
                {
                    maxIterations: $iters,
                    dampingFactor: $damp,
                    sourceNodes: seedNodes
                }
            )
            YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS w, score
            RETURN w.address AS address, score
            """,
            name=GDS_GRAPH_NAME,
            iters=GDS_PR_ITERATIONS,
            damp=GDS_PR_DAMPING,
        )
        for rec in result:
            scores[rec["address"]] = rec["score"]

    elapsed = time.time() - t1
    print(f"  PageRank streamed {len(scores):,} scores in {elapsed:.1f}s.")

    # Drop in-memory projection (free RAM)
    with svc.driver.session() as s:
        s.run("CALL gds.graph.drop($name, false) YIELD graphName", name=GDS_GRAPH_NAME)

    # Normalise to [0, 1]
    if scores:
        max_score = max(scores.values())
        if max_score > 0:
            scores = {a: v / max_score for a, v in scores.items()}

    non_zero = sum(1 for v in scores.values() if v > 0)
    print(f"  Seed-proximity scores: {non_zero:,} wallets with score > 0.")
    return scores


# ---------------------------------------------------------------------------
# Step 2: PostgreSQL feature aggregation per wallet
# ---------------------------------------------------------------------------

def _parse_pg_array(value) -> List[float]:
    """Parse PostgreSQL TEXT[] or NUMERIC[] to a Python list of floats."""
    if isinstance(value, (list, tuple)):
        return [float(v) for v in value]
    if isinstance(value, str):
        cleaned = value.strip().strip("{}")
        if not cleaned:
            return []
        return [float(x.strip()) for x in cleaned.split(",") if x.strip()]
    return []


def _shannon_entropy(amounts: List[float]) -> float:
    """Shannon entropy of output-amount proportions."""
    total = sum(amounts)
    if total <= 0 or len(amounts) < 2:
        return 0.0
    probs = [a / total for a in amounts if a > 0]
    return -sum(p * math.log2(p) for p in probs if p > 0)


def aggregate_wallet_features(conn) -> Dict[str, Dict]:
    """Aggregate transaction-level features to wallet level from PostgreSQL.

    For each unique wallet address (from input_addresses[1] — primary sender),
    compute:
        cluster_id (from PG — set by Phase 4)
        max_anomaly_score
        mixing_ratio (fraction of txs with is_mixing=true)
        avg_fee_log
        num_inputs_total (sum of input address counts)
        num_outputs_total (sum of output address counts)
        avg_output_entropy

    Returns:
        dict address → feature dict
    """
    print("\n  Aggregating wallet features from PostgreSQL (keyset-paginated) ...")
    t0 = time.time()

    # We accumulate per wallet
    wallet_data: Dict[str, Dict] = {}  # address → aggregation buckets

    chunk = 10_000
    last_id = 0
    total_rows = 0

    while True:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, input_addresses, output_addresses,
                       output_amounts, fee, anomaly_score,
                       is_mixing, cluster_id
                FROM transactions
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s
                """,
                (last_id, chunk),
            )
            rows = cur.fetchall()

        if not rows:
            break

        for row in rows:
            in_addrs = row["input_addresses"] or []
            if isinstance(in_addrs, str):
                in_addrs = [a.strip() for a in in_addrs.strip("{}").split(",") if a.strip()]

            out_addrs = row["output_addresses"] or []
            if isinstance(out_addrs, str):
                out_addrs = [a.strip() for a in out_addrs.strip("{}").split(",") if a.strip()]

            out_amts = _parse_pg_array(row["output_amounts"] or [])
            fee = float(row["fee"] or 0.0)
            anomaly = float(row["anomaly_score"] or 0.0)
            mixing = bool(row["is_mixing"])
            cluster = int(row["cluster_id"]) if row["cluster_id"] is not None else -1
            entropy = _shannon_entropy(out_amts)
            n_in = max(len(in_addrs), 1)
            n_out = max(len(out_addrs), 1)
            fee_log = math.log1p(fee)

            # Primary sender wallet gets the aggregation
            primary = in_addrs[0] if in_addrs else "__unknown__"
            if primary not in wallet_data:
                wallet_data[primary] = {
                    "cluster_id": cluster,
                    "anomaly_scores": [],
                    "mixing_flags": [],
                    "fee_logs": [],
                    "n_inputs_total": 0,
                    "n_outputs_total": 0,
                    "entropies": [],
                }
            wd = wallet_data[primary]
            wd["cluster_id"] = cluster  # last-write wins (consistent with Phase 4)
            wd["anomaly_scores"].append(anomaly)
            wd["mixing_flags"].append(1.0 if mixing else 0.0)
            wd["fee_logs"].append(fee_log)
            wd["n_inputs_total"] += n_in
            wd["n_outputs_total"] += n_out
            wd["entropies"].append(entropy)

        total_rows += len(rows)
        last_id = rows[-1]["id"]
        if len(rows) < chunk:
            break

    elapsed = time.time() - t0
    print(f"  Aggregated {len(wallet_data):,} wallets from {total_rows:,} rows in {elapsed:.1f}s.")
    return wallet_data


# ---------------------------------------------------------------------------
# Step 2: Build PyG Data object
# ---------------------------------------------------------------------------

def build_pyg_data(
    svc: GraphService,
    seed_addrs: set[str],
    seed_prox: Dict[str, float],
    wallet_features: Dict[str, Dict],
) -> Tuple[Data, Dict[str, int], List[str]]:
    """Build PyG Data object from Neo4j graph + wallet features.

    Returns:
        data:        PyG Data with x, edge_index, y, train/val/test masks.
        index_map:   dict address → node index (0..N-1).
        idx_to_addr: list of addresses indexed by node index.
    """
    print("\n[Step 2] Building PyG Data object ...")

    # --- Pull all wallet addresses from Neo4j (canonical ordering) ---
    print("  Fetching wallet addresses from Neo4j ...")
    all_addrs: List[str] = []
    with svc.driver.session() as s:
        result = s.run("MATCH (w:Wallet) RETURN w.address AS address ORDER BY w.address")
        for rec in result:
            all_addrs.append(rec["address"])
    N = len(all_addrs)
    print(f"  {N:,} wallet nodes.")

    index_map: Dict[str, int] = {addr: i for i, addr in enumerate(all_addrs)}

    # --- Node features ---
    print("  Assembling node feature matrix ...")

    # Gather cluster IDs for normalisation
    cluster_ids = []
    for addr in all_addrs:
        wd = wallet_features.get(addr, {})
        cluster_ids.append(wd.get("cluster_id", -1))

    max_cluster = max((c for c in cluster_ids if c >= 0), default=1) or 1

    feature_matrix = np.zeros((N, NODE_FEATURE_DIM), dtype=np.float32)
    for i, addr in enumerate(all_addrs):
        wd = wallet_features.get(addr, {})
        cid = wd.get("cluster_id", -1)
        cid_norm = cid / max_cluster if cid >= 0 else 0.0

        anomaly_scores = wd.get("anomaly_scores", [0.0])
        max_anomaly = max(anomaly_scores) if anomaly_scores else 0.0

        mixing_flags = wd.get("mixing_flags", [0.0])
        mixing_ratio = sum(mixing_flags) / len(mixing_flags) if mixing_flags else 0.0

        fee_logs = wd.get("fee_logs", [0.0])
        avg_fee_log = sum(fee_logs) / len(fee_logs) if fee_logs else 0.0

        n_in = wd.get("n_inputs_total", 1)
        n_out = wd.get("n_outputs_total", 1)
        n_in_log = math.log1p(n_in)
        n_out_log = math.log1p(n_out)

        entropies = wd.get("entropies", [0.0])
        avg_entropy = sum(entropies) / len(entropies) if entropies else 0.0

        prox = seed_prox.get(addr, 0.0)

        feature_matrix[i] = [
            cid_norm,      # 0: cluster_id_norm
            max_anomaly,   # 1: max_anomaly_score
            mixing_ratio,  # 2: is_mixing_ratio
            avg_fee_log,   # 3: avg_fee_log
            n_in_log,      # 4: num_inputs_total_log
            n_out_log,     # 5: num_outputs_total_log
            avg_entropy,   # 6: avg_output_entropy
            prox,          # 7: seed_proximity_score
        ]

    # StandardScaler fit on non-seed nodes only (avoid data leakage from labels)
    seed_mask_np = np.array([addr in seed_addrs for addr in all_addrs], dtype=bool)
    non_seed_idx = np.where(~seed_mask_np)[0]
    scaler = StandardScaler()
    if len(non_seed_idx) > 0:
        scaler.fit(feature_matrix[non_seed_idx])
    else:
        scaler.fit(feature_matrix)
    feature_matrix = scaler.transform(feature_matrix).astype(np.float32)
    print(f"  Feature matrix: {feature_matrix.shape}, scaled on {len(non_seed_idx):,} non-seed nodes.")

    # --- Edge index from CO_SPEND (undirected → both directions) ---
    print("  Fetching CO_SPEND edges from Neo4j ...")
    t0 = time.time()
    edges_src: List[int] = []
    edges_dst: List[int] = []
    skip = 0
    with svc.driver.session() as s:
        result = s.run(
            """
            MATCH (a:Wallet)-[:CO_SPEND]->(b:Wallet)
            RETURN a.address AS src, b.address AS dst
            """
        )
        for rec in result:
            src_idx = index_map.get(rec["src"])
            dst_idx = index_map.get(rec["dst"])
            if src_idx is None or dst_idx is None or src_idx == dst_idx:
                skip += 1
                continue
            # Both directions for undirected message passing
            edges_src.append(src_idx)
            edges_dst.append(dst_idx)
            edges_src.append(dst_idx)
            edges_dst.append(src_idx)

    print(f"  {len(edges_src)//2:,} unique CO_SPEND pairs → {len(edges_src):,} directed entries. "
          f"({skip} skipped). Elapsed: {time.time()-t0:.1f}s")

    edge_index = torch.tensor(
        [edges_src, edges_dst], dtype=torch.long
    )  # shape [2, 2*E]

    # --- Labels ---
    labels = torch.tensor(
        [1 if addr in seed_addrs else 0 for addr in all_addrs],
        dtype=torch.long,
    )
    n_pos = int(labels.sum().item())
    n_neg = N - n_pos
    print(f"  Labels: {n_pos:,} positive (illicit), {n_neg:,} negative. "
          f"Imbalance ratio: {n_neg/max(n_pos,1):.1f}:1")

    # --- Stratified masks: 70 / 15 / 15 ---
    rng = np.random.default_rng(RANDOM_SEED)
    pos_idx = np.where(labels.numpy() == 1)[0]
    neg_idx = np.where(labels.numpy() == 0)[0]

    def _split(idx: np.ndarray, train_r: float, val_r: float):
        n = len(idx)
        shuffled = rng.permutation(idx)
        n_train = int(n * train_r)
        n_val = int(n * val_r)
        return shuffled[:n_train], shuffled[n_train:n_train + n_val], shuffled[n_train + n_val:]

    pos_train, pos_val, pos_test = _split(pos_idx, TRAIN_RATIO, VAL_RATIO)
    neg_train, neg_val, neg_test = _split(neg_idx, TRAIN_RATIO, VAL_RATIO)

    train_idx = np.concatenate([pos_train, neg_train])
    val_idx   = np.concatenate([pos_val, neg_val])
    test_idx  = np.concatenate([pos_test, neg_test])

    def _bool_mask(idx: np.ndarray) -> torch.Tensor:
        m = torch.zeros(N, dtype=torch.bool)
        m[idx] = True
        return m

    train_mask = _bool_mask(train_idx)
    val_mask   = _bool_mask(val_idx)
    test_mask  = _bool_mask(test_idx)

    print(f"  Masks — train: {train_mask.sum().item():,} | "
          f"val: {val_mask.sum().item():,} | "
          f"test: {test_mask.sum().item():,}")

    data = Data(
        x=torch.tensor(feature_matrix),
        edge_index=edge_index,
        y=labels,
        train_mask=train_mask,
        val_mask=val_mask,
        test_mask=test_mask,
    )

    return data, index_map, all_addrs


# ---------------------------------------------------------------------------
# Step 3: Training
# ---------------------------------------------------------------------------

def train_model(
    data: Data,
    epochs: int,
) -> Tuple[GraphSAGEClassifier, List[float], List[float]]:
    """Train GraphSAGE with focal loss.

    Returns:
        Trained model, train_losses, val_losses (per epoch).
    """
    print(f"\n[Step 3] Training GraphSAGE ({epochs} epochs max, early-stop patience={EARLY_STOP_PAT}) ...")

    device = torch.device("cpu")

    # Compute focal loss alpha from training split class distribution
    train_labels = data.y[data.train_mask]
    n_pos_train = int((train_labels == 1).sum().item())
    n_neg_train = int((train_labels == 0).sum().item())
    alpha = compute_alpha(n_neg_train, n_pos_train, alpha_max=ALPHA_MAX)
    print(f"  Focal loss: γ={FOCAL_GAMMA}, α={alpha:.2f} "
          f"(neg={n_neg_train:,}, pos={n_pos_train:,})")

    model = GraphSAGEClassifier(
        in_channels=NODE_FEATURE_DIM,
        hidden_1=HIDDEN_1,
        hidden_2=HIDDEN_2,
        embedding=EMBED_DIM,
        dropout=DROPOUT,
    ).to(device)

    x = data.x.to(device)
    ei = data.edge_index.to(device)
    y = data.y.to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)

    train_losses: List[float] = []
    val_losses: List[float] = []
    best_val_loss = float("inf")
    best_state = None
    patience_counter = 0

    t_start = time.time()
    for epoch in range(1, epochs + 1):
        # --- Train ---
        model.train()
        optimizer.zero_grad()
        out = model(x, ei).squeeze(-1)          # [N]
        loss_train = focal_loss(
            out[data.train_mask], y[data.train_mask].float(),
            gamma=FOCAL_GAMMA, alpha_pos=alpha,
        )
        loss_train.backward()
        optimizer.step()

        # --- Validate ---
        model.eval()
        with torch.no_grad():
            out_eval = model(x, ei).squeeze(-1)
            loss_val = focal_loss(
                out_eval[data.val_mask], y[data.val_mask].float(),
                gamma=FOCAL_GAMMA, alpha_pos=alpha,
            )

        tl = loss_train.item()
        vl = loss_val.item()
        train_losses.append(tl)
        val_losses.append(vl)

        if epoch % 20 == 0 or epoch == 1:
            elapsed = time.time() - t_start
            print(f"  Epoch {epoch:>3}/{epochs} — train_loss={tl:.4f}  val_loss={vl:.4f}  [{elapsed:.0f}s]")

        # Early stopping on val loss
        if vl < best_val_loss - 1e-6:
            best_val_loss = vl
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= EARLY_STOP_PAT:
                print(f"  Early stop at epoch {epoch} (patience={EARLY_STOP_PAT}).")
                break

    total_time = time.time() - t_start
    print(f"  Training complete — {len(train_losses)} epochs, {total_time:.1f}s total.")

    # Restore best checkpoint
    if best_state is not None:
        model.load_state_dict(best_state)

    return model, train_losses, val_losses


def save_loss_curve(train_losses: List[float], val_losses: List[float], date_str: str) -> Path:
    """Save train/val loss curve to PNG."""
    try:
        import matplotlib.pyplot as plt  # type: ignore
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.plot(train_losses, label="train", linewidth=1.2)
        ax.plot(val_losses, label="val", linewidth=1.2)
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Focal Loss")
        ax.set_title(f"GraphSAGE Training — {date_str}")
        ax.legend()
        ax.grid(alpha=0.3)
        fig.tight_layout()
        out_path = _MODELS_DIR / f"graphsage_loss_{date_str}.png"
        fig.savefig(out_path, dpi=120)
        plt.close(fig)
        print(f"  Loss curve saved: {out_path}")
        return out_path
    except Exception as exc:
        print(f"  WARNING: could not save loss curve: {exc}")
        return _MODELS_DIR / f"graphsage_loss_{date_str}.png"


# ---------------------------------------------------------------------------
# Step 4: Evaluation
# ---------------------------------------------------------------------------

def evaluate(model: GraphSAGEClassifier, data: Data) -> Dict[str, float]:
    """Compute binary classification metrics on the test mask."""
    model.eval()
    with torch.no_grad():
        probs = model(data.x, data.edge_index).squeeze(-1)

    threshold = settings.risk_score_flag_threshold
    preds = (probs >= threshold).long()
    y_true = data.y[data.test_mask].numpy()
    y_pred = preds[data.test_mask].numpy()

    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())

    precision = tp / max(tp + fp, 1)
    recall    = tp / max(tp + fn, 1)
    f1        = (2 * precision * recall) / max(precision + recall, 1e-9)

    metrics = {
        "threshold": threshold,
        "tp": tp, "fp": fp, "fn": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "test_pos": int(y_true.sum()),
        "test_neg": int((y_true == 0).sum()),
    }
    return metrics


# ---------------------------------------------------------------------------
# Step 4: Write-back to Neo4j
# ---------------------------------------------------------------------------

def write_risk_scores_to_neo4j(
    svc: GraphService,
    all_addrs: List[str],
    risk_scores: np.ndarray,
) -> None:
    """Write risk_score to each :Wallet node in Neo4j (batched UNWIND MERGE)."""
    print(f"\n  Writing risk_score to {len(all_addrs):,} Neo4j wallet nodes ...")
    t0 = time.time()
    total_written = 0

    for i in range(0, len(all_addrs), NEO4J_BATCH):
        batch_addrs = all_addrs[i : i + NEO4J_BATCH]
        batch_scores = risk_scores[i : i + NEO4J_BATCH]
        batch = [
            {"address": addr, "risk_score": float(score)}
            for addr, score in zip(batch_addrs, batch_scores)
        ]
        with svc.driver.session() as s:
            result = s.run(
                """
                UNWIND $batch AS row
                MATCH (w:Wallet {address: row.address})
                SET w.risk_score = row.risk_score
                RETURN count(w) AS cnt
                """,
                batch=batch,
            )
            total_written += result.single()["cnt"]

    print(f"  Neo4j write-back: {total_written:,} wallets updated in {time.time()-t0:.1f}s.")


def write_pagerank_to_neo4j(
    svc: GraphService,
    seed_prox: Dict[str, float],
) -> int:
    """Persist GDS Personalized PageRank scores as w.seed_proximity on :Wallet nodes.

    This is the MISSING step that caused seed_wallet_proximity to be all-zero
    in evidence_trails.json: build_evidence_trails.py reads w.seed_proximity
    from Neo4j (via load_seed_proximities), but train_graphsage.py only ever
    used the in-memory dict as a training feature — never wrote it back.

    Writes only wallets with score > 0 (the rest default to 0 in Cypher's
    coalesce). Also clears any stale seed_proximity on nodes not in this run's
    result set (handles graph re-runs cleanly).

    Returns the number of :Wallet nodes updated.
    """
    if not seed_prox:
        print("  WARNING: seed_prox dict is empty — skipping seed_proximity write-back.")
        return 0

    print(f"\n  Writing seed_proximity to Neo4j ({len(seed_prox):,} scored wallets) ...")
    t0 = time.time()
    total_written = 0

    # First, clear stale seed_proximity on all wallets (idempotent across re-runs)
    with svc.driver.session() as s:
        s.run(
            "MATCH (w:Wallet) WHERE w.seed_proximity IS NOT NULL "
            "REMOVE w.seed_proximity"
        )

    # Write non-zero scores in batches
    non_zero = {addr: score for addr, score in seed_prox.items() if score > 0.0}
    items = list(non_zero.items())
    for i in range(0, len(items), NEO4J_BATCH):
        batch = [
            {"address": addr, "sp": float(score)}
            for addr, score in items[i : i + NEO4J_BATCH]
        ]
        with svc.driver.session() as s:
            result = s.run(
                """
                UNWIND $batch AS row
                MATCH (w:Wallet {address: row.address})
                SET w.seed_proximity = row.sp
                RETURN count(w) AS cnt
                """,
                batch=batch,
            )
            total_written += result.single()["cnt"]

    elapsed = time.time() - t0
    print(
        f"  seed_proximity write-back: {total_written:,} wallets written "
        f"({len(non_zero):,} non-zero scores) in {elapsed:.1f}s."
    )
    return total_written


# ---------------------------------------------------------------------------
# Step 4: Write-back to PostgreSQL
# ---------------------------------------------------------------------------

def write_risk_scores_to_postgres(
    conn,
    all_addrs: List[str],
    risk_scores: np.ndarray,
) -> Tuple[int, int]:
    """Write risk_score + is_flagged to PostgreSQL transactions table.

    Strategy mirrors Phase 4's cluster_id sync: join on input_addresses[1]
    (the primary sender wallet) for deterministic, index-friendly updates.

    is_flagged rule (documented):
        anomaly_score > phase5_threshold   (structural anomalousness)
        OR risk_score >= risk_score_flag_threshold   (graph risk propagation)
        OR is_mixing = true                (detected peeling-chain / CoinJoin)

    Returns:
        (rows_updated_risk, rows_updated_flagged)
    """
    print("  Writing risk_score to PostgreSQL ...")

    # Load Phase 5 threshold for is_flagged computation
    threshold_file = _MODELS_DIR / sorted(
        [f.name for f in _MODELS_DIR.glob("threshold_*.json")]
    )[-1] if list(_MODELS_DIR.glob("threshold_*.json")) else None

    anomaly_threshold = 0.034618  # Phase 5 measured default
    if threshold_file and threshold_file.exists():
        with open(threshold_file, "r") as f:
            td = json.load(f)
            anomaly_threshold = float(td.get("threshold", anomaly_threshold))

    risk_flag_threshold = settings.risk_score_flag_threshold

    # Build address→score map for bulk update
    addr_to_score = {addr: float(score) for addr, score in zip(all_addrs, risk_scores)}

    # Write risk_score using temp table approach (fast, avoids N separate UPDATEs)
    t0 = time.time()
    with conn.cursor() as cur:
        # Create temp table
        cur.execute(
            """
            CREATE TEMP TABLE _wallet_risk (
                address TEXT PRIMARY KEY,
                risk_score NUMERIC(6,4)
            ) ON COMMIT DROP
            """
        )

        # Bulk-insert into temp table via COPY
        import io
        buf = io.StringIO()
        for addr, score in addr_to_score.items():
            buf.write(f"{addr}\t{score:.4f}\n")
        buf.seek(0)
        cur.copy_expert(
            "COPY _wallet_risk (address, risk_score) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')",
            buf,
        )

        # Update transactions: join on input_addresses[1]
        cur.execute(
            """
            UPDATE transactions t
            SET risk_score = wr.risk_score
            FROM _wallet_risk wr
            WHERE t.input_addresses[1] = wr.address
            """
        )
        rows_updated_risk = cur.rowcount

        # Compute is_flagged composite trigger
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
    print(f"  PostgreSQL: {rows_updated_risk:,} rows risk_score written, "
          f"{rows_updated_flagged:,} rows is_flagged computed in {elapsed:.1f}s.")
    return rows_updated_risk, rows_updated_flagged


# ---------------------------------------------------------------------------
# Performance log
# ---------------------------------------------------------------------------

def _append_perf_log(
    date_str: str,
    n_nodes: int,
    n_edges: int,
    n_pos: int,
    n_neg: int,
    actual_epochs: int,
    train_time_s: float,
    inference_time_s: float,
    metrics: Dict,
    n_flagged: int,
    n_total: int,
) -> None:
    entry = f"""
### Phase 7 — GraphSAGE Risk Scoring ({date_str})
| Metric | Value |
|---|---|
| Nodes (wallets) | {n_nodes:,} |
| Edges (CO_SPEND, undirected×2) | {n_edges:,} |
| Positive labels (Ransomwhere seed) | {n_pos:,} |
| Negative labels | {n_neg:,} |
| Imbalance ratio | {n_neg/max(n_pos,1):.1f}:1 |
| Focal loss γ | {FOCAL_GAMMA} (Lin et al. ICCV 2017) |
| Focal loss α | {compute_alpha(n_neg, n_pos, ALPHA_MAX):.2f} (neg/pos ratio, clamped to {ALPHA_MAX}) |
| Epochs run | {actual_epochs} |
| Training time (CPU) | {train_time_s:.1f}s ({train_time_s/60:.1f} min) |
| Inference time (CPU, full graph) | {inference_time_s:.3f}s |
| Test F1 | {metrics['f1']} |
| Test Precision | {metrics['precision']} |
| Test Recall | {metrics['recall']} |
| Test TP / FP / FN | {metrics['tp']} / {metrics['fp']} / {metrics['fn']} |
| is_flagged transactions | {n_flagged:,} / {n_total:,} ({100*n_flagged/max(n_total,1):.2f}%) |
"""
    with open(_PERF_LOG, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"  Performance metrics appended to {_PERF_LOG.name}.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(epochs: int = DEFAULT_EPOCHS) -> None:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Phase 7 — F4: GraphSAGE Risk Scoring")
    print(f"  Date: {date_str} | Epochs: {epochs} | Device: CPU")
    print("=" * 60)

    # --- Connect to services ---
    db_url = settings.database_url
    conn = psycopg2.connect(db_url)

    with GraphService(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    ) as svc:
        seed_addrs = load_ransomwhere_seeds()

        # Step 1: Seeded PageRank
        t_pr = time.time()
        seed_prox = run_seeded_pagerank(svc, seed_addrs)
        pr_time = time.time() - t_pr

        # Step 2: Aggregate wallet features from PostgreSQL
        wallet_features = aggregate_wallet_features(conn)

        # Step 2 (cont.): Build PyG Data
        data, index_map, all_addrs = build_pyg_data(svc, seed_addrs, seed_prox, wallet_features)
        N = len(all_addrs)
        n_pos = int(data.y.sum().item())
        n_neg = N - n_pos

        # Save node index map for Phase 8
        with open(_INDEX_MAP_FILE, "w", encoding="utf-8") as f:
            json.dump(index_map, f, separators=(",", ":"))
        print(f"  Wallet index map saved -> {_INDEX_MAP_FILE} ({N:,} entries).")

        # Step 3: Train
        t_train = time.time()
        model, train_losses, val_losses = train_model(data, epochs=epochs)
        train_time = time.time() - t_train
        actual_epochs = len(train_losses)

        # Save loss curve
        save_loss_curve(train_losses, val_losses, date_str)

        # Save model
        model_path = _MODELS_DIR / f"graphsage_{date_str}.pt"
        torch.save(
            {
                "model_state_dict": model.state_dict(),
                "in_channels": NODE_FEATURE_DIM,
                "hidden_1": HIDDEN_1,
                "hidden_2": HIDDEN_2,
                "embedding": EMBED_DIM,
                "dropout": DROPOUT,
                "date": date_str,
                "epochs_trained": actual_epochs,
                "train_loss_final": train_losses[-1],
                "val_loss_final": val_losses[-1],
                "focal_gamma": FOCAL_GAMMA,
                "focal_alpha": compute_alpha(n_neg, n_pos, ALPHA_MAX),
            },
            model_path,
        )
        print(f"  Model saved -> {model_path}")

        # Step 4: Inference
        print("\n[Step 4] Running full-graph inference ...")
        model.eval()
        t_inf = time.time()
        with torch.no_grad():
            risk_scores_tensor = model(data.x, data.edge_index).squeeze(-1)
        inference_time = time.time() - t_inf
        risk_scores = risk_scores_tensor.numpy()  # shape [N]
        print(f"  Inference: {N:,} nodes in {inference_time*1000:.1f}ms.")

        # Evaluate
        metrics = evaluate(model, data)
        print(
            f"\n  Evaluation (test mask, threshold={metrics['threshold']}):\n"
            f"    F1={metrics['f1']}  Precision={metrics['precision']}  Recall={metrics['recall']}\n"
            f"    TP={metrics['tp']}  FP={metrics['fp']}  FN={metrics['fn']}\n"
            f"    Test positives={metrics['test_pos']}  negatives={metrics['test_neg']}"
        )

        # Save wallet risk scores JSON for Phase 8
        risk_map = {addr: float(risk_scores[i]) for i, addr in enumerate(all_addrs)}
        with open(_RISK_SCORES_FILE, "w", encoding="utf-8") as f:
            json.dump(risk_map, f, separators=(",", ":"))
        print(f"  Wallet risk scores saved -> {_RISK_SCORES_FILE} ({N:,} entries).")

        # Write risk_score to Neo4j
        write_risk_scores_to_neo4j(svc, all_addrs, risk_scores)

        # Write seed_proximity to Neo4j — this was the missing step causing
        # seed_wallet_proximity=0.0 in evidence_trails.json (Phase 9.5 fix).
        write_pagerank_to_neo4j(svc, seed_prox)

        # Write to PostgreSQL
        rows_risk, rows_flagged = write_risk_scores_to_postgres(conn, all_addrs, risk_scores)

        # Count flagged transactions
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM transactions WHERE is_flagged = true")
            n_flagged = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM transactions")
            n_total = cur.fetchone()[0]
        print(f"\n  is_flagged summary: {n_flagged:,} / {n_total:,} transactions flagged "
              f"({100*n_flagged/max(n_total,1):.2f}%)")

        # Append performance log
        _append_perf_log(
            date_str=date_str,
            n_nodes=N,
            n_edges=data.edge_index.shape[1],
            n_pos=n_pos,
            n_neg=n_neg,
            actual_epochs=actual_epochs,
            train_time_s=train_time,
            inference_time_s=inference_time,
            metrics=metrics,
            n_flagged=n_flagged,
            n_total=n_total,
        )

        print("\n[Done] Phase 7 complete.")
        print(f"  PageRank time:  {pr_time:.1f}s")
        print(f"  Training time:  {train_time:.1f}s ({train_time/60:.1f} min)")
        print(f"  Inference time: {inference_time*1000:.1f}ms")

    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Phase 7: GraphSAGE risk scoring")
    parser.add_argument(
        "--epochs", type=int, default=DEFAULT_EPOCHS,
        help=f"Maximum training epochs (default: {DEFAULT_EPOCHS})",
    )
    args = parser.parse_args()
    main(epochs=args.epochs)
