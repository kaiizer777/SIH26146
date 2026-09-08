"""Phase 8 XAI-B — GraphSAGE Subgraph & Feature Importance via GNNExplainer.

API verified (2026-09-08) for torch-geometric==2.6.1:
    from torch_geometric.explain import Explainer, GNNExplainer
    from torch_geometric.explain.config import ModelConfig
    Confirmed working: python -c "from torch_geometric.explain import Explainer, GNNExplainer; print('OK')"

Pipeline:
    1. Load graphsage_*.pt + wallet_index_map.json + wallet_risk_scores.json.
    2. Rebuild PyG Data object (features from PostgreSQL, CO_SPEND edges from Neo4j).
    3. Select top-K risk wallets (settings.gnn_explainer_top_k = 500).
    4. Run Explainer(GNNExplainer) for each target wallet node.
    5. Extract edge mask (>= 0.2 importance OR top-10) + node feature importances.
    6. Map back to wallet addresses; pull is_seed from ransomwhere set.
    7. Write data/xai/gnn_subgraphs.json keyed by wallet address.

Output format per wallet:
    {
      "address": str,
      "risk_score": float,
      "is_seed": bool,
      "nodes": [{"address": str, "risk_score": float, "is_seed": bool}],
      "edges": [{"source": str, "target": str, "weight": float, "edge_importance": float}],
      "feature_importance": [{"feature": str, "importance": float}]
    }

Usage:
    backend/venv/Scripts/python backend/scripts/explain_graphsage.py [--top-k N] [--epochs N]
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

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
from sklearn.preprocessing import StandardScaler
from torch_geometric.data import Data
from torch_geometric.explain import Explainer, GNNExplainer
from torch_geometric.explain.config import ModelConfig

from app.config import settings
from app.ml.graphsage import GraphSAGEClassifier
from app.services.graph_service import GraphService

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
_DATA_DIR = _PROJECT_ROOT / "data"
_MODELS_DIR = Path(settings.models_dir)

NODE_FEATURE_NAMES: List[str] = [
    "cluster_id",
    "anomaly_score",
    "is_mixing_flag",
    "fee_log",
    "num_inputs",
    "num_outputs",
    "output_entropy",
    "asn_risk_score",
]
NODE_FEATURE_DIM = len(NODE_FEATURE_NAMES)  # 8

# Edge mask threshold: keep edges with importance >= this, OR the top-K below
EDGE_MASK_THRESHOLD = 0.2
EDGE_MASK_TOP_K = 10  # fallback: always include the top-10 incident edges


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def _find_latest(pattern: str) -> Path:
    matches = sorted(_MODELS_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"No file matching {pattern} in {_MODELS_DIR}")
    return matches[-1]


def load_graphsage() -> GraphSAGEClassifier:
    model_path = _find_latest("graphsage_*.pt")
    print(f"  Model: {model_path.name}")
    ckpt = torch.load(model_path, map_location="cpu", weights_only=True)
    # train_graphsage.py saves a dict with model_state_dict + architecture metadata.
    # Fall back to treating the whole object as a state_dict (bare .pt).
    if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
        state_dict = ckpt["model_state_dict"]
        in_ch   = int(ckpt.get("in_channels", NODE_FEATURE_DIM))
        h1      = int(ckpt.get("hidden_1",    settings.graphsage_hidden_dim_1))
        h2      = int(ckpt.get("hidden_2",    settings.graphsage_hidden_dim_2))
        emb     = int(ckpt.get("embedding",   settings.graphsage_embedding_dim))
        drop    = float(ckpt.get("dropout",   settings.graphsage_dropout))
    else:
        state_dict = ckpt
        in_ch = NODE_FEATURE_DIM
        h1    = settings.graphsage_hidden_dim_1
        h2    = settings.graphsage_hidden_dim_2
        emb   = settings.graphsage_embedding_dim
        drop  = settings.graphsage_dropout
    model = GraphSAGEClassifier(
        in_channels=in_ch, hidden_1=h1, hidden_2=h2, embedding=emb, dropout=drop,
    )
    model.load_state_dict(state_dict)
    model.eval()
    return model


# ---------------------------------------------------------------------------
# Data helpers (mirrors train_graphsage.py — no reimplementation)
# ---------------------------------------------------------------------------

def _parse_pg_array(value) -> List[float]:
    if isinstance(value, (list, tuple)):
        return [float(v) for v in value]
    if isinstance(value, str):
        cleaned = value.strip().strip("{}")
        if not cleaned:
            return []
        return [float(x.strip()) for x in cleaned.split(",") if x.strip()]
    return []


def _shannon_entropy(amounts: List[float]) -> float:
    total = sum(amounts)
    if total <= 0 or len(amounts) < 2:
        return 0.0
    probs = [a / total for a in amounts if a > 0]
    return -sum(p * math.log2(p) for p in probs if p > 0)


def load_ransomwhere_seeds() -> Set[str]:
    seed_file = _DATA_DIR / "ransomwhere_seeds.json"
    if not seed_file.exists():
        return set()
    with open(seed_file, "r", encoding="utf-8") as f:
        raw = json.load(f)
    records = raw.get("result", raw) if isinstance(raw, dict) else raw
    return {rec["address"] for rec in records if isinstance(rec, dict) and "address" in rec}


def load_wallet_risk_scores() -> Dict[str, float]:
    path = Path(settings.wallet_risk_scores_path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_wallet_index_map() -> Dict[str, int]:
    path = Path(settings.wallet_index_map_path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def rebuild_pyg_data(
    conn,
    svc: GraphService,
    seed_addrs: Set[str],
) -> Tuple[Data, List[str], Dict[str, int]]:
    """Rebuild PyG Data object from PostgreSQL + Neo4j.

    svc must already be connected (context manager in caller).
    Returns: (data, idx_to_addr, index_map)
    """

    print("  Fetching all wallet addresses from Neo4j ...", flush=True)
    all_addrs: List[str] = []
    with svc.driver.session() as s:
        result = s.run("MATCH (w:Wallet) RETURN w.address AS address ORDER BY w.address")
        for rec in result:
            all_addrs.append(rec["address"])
    N = len(all_addrs)
    index_map: Dict[str, int] = {addr: i for i, addr in enumerate(all_addrs)}
    print(f"  {N:,} wallet nodes.", flush=True)

    # Aggregate wallet features from PostgreSQL
    print("  Aggregating wallet features from PostgreSQL ...", flush=True)
    wallet_data: Dict[str, Dict] = {}
    chunk = 10_000
    last_id = 0
    total_rows = 0

    while True:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, input_addresses, output_addresses,
                       output_amounts, fee, anomaly_score, is_mixing, cluster_id
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
            wd["cluster_id"] = cluster
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
    print(f"  Aggregated {len(wallet_data):,} wallets from {total_rows:,} rows.", flush=True)

    # Load seed_proximity from Neo4j (written by Phase 7)
    # The property may not exist if Phase 7 GDS PageRank wasn't persisted — handled gracefully.
    print("  Loading seed_proximity from Neo4j ...", flush=True)
    seed_prox: Dict[str, float] = {}
    with svc.driver.session() as s:
        try:
            result = s.run(
                "MATCH (w:Wallet) WHERE w.seed_proximity IS NOT NULL "
                "RETURN w.address AS addr, w.seed_proximity AS sp"
            )
            for rec in result:
                seed_prox[rec["addr"]] = float(rec["sp"])
        except Exception:
            pass  # property absent — seed_prox stays empty, feature col zeros out
    print(f"  {len(seed_prox):,} wallets with seed_proximity.", flush=True)

    # Build feature matrix
    cluster_ids = [wallet_data.get(a, {}).get("cluster_id", -1) for a in all_addrs]
    max_cluster = max((c for c in cluster_ids if c >= 0), default=1) or 1
    feature_matrix = np.zeros((N, NODE_FEATURE_DIM), dtype=np.float32)
    for i, addr in enumerate(all_addrs):
        wd = wallet_data.get(addr, {})
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
        entropies = wd.get("entropies", [0.0])
        avg_entropy = sum(entropies) / len(entropies) if entropies else 0.0
        prox = seed_prox.get(addr, 0.0)
        feature_matrix[i] = [
            cid_norm, max_anomaly, mixing_ratio, avg_fee_log,
            math.log1p(n_in), math.log1p(n_out), avg_entropy, prox,
        ]

    # Scale (fit on non-seed only, same as training)
    seed_mask_np = np.array([addr in seed_addrs for addr in all_addrs], dtype=bool)
    non_seed_idx = np.where(~seed_mask_np)[0]
    scaler = StandardScaler()
    scaler.fit(feature_matrix[non_seed_idx] if len(non_seed_idx) > 0 else feature_matrix)
    feature_matrix = scaler.transform(feature_matrix).astype(np.float32)

    # CO_SPEND edges — cap at 500k pairs to avoid memory/time blowout on large graphs
    _EDGE_LIMIT = 500_000
    print(f"  Fetching CO_SPEND edges from Neo4j (LIMIT {_EDGE_LIMIT:,}) ...", flush=True)
    t0 = time.time()
    edges_src: List[int] = []
    edges_dst: List[int] = []
    with svc.driver.session() as s:
        result = s.run(
            "MATCH (a:Wallet)-[:CO_SPEND]->(b:Wallet) "
            f"RETURN a.address AS src, b.address AS dst LIMIT {_EDGE_LIMIT}"
        )
        for rec in result:
            si = index_map.get(rec["src"])
            di = index_map.get(rec["dst"])
            if si is None or di is None or si == di:
                continue
            edges_src.append(si)
            edges_dst.append(di)
            edges_src.append(di)
            edges_dst.append(si)
    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)
    print(f"  {len(edges_src) // 2:,} CO_SPEND pairs fetched in {time.time()-t0:.1f}s.", flush=True)

    data = Data(
        x=torch.tensor(feature_matrix),
        edge_index=edge_index,
    )
    return data, all_addrs, index_map


# ---------------------------------------------------------------------------
# GNNExplainer
# ---------------------------------------------------------------------------

def run_gnn_explainer(
    model: GraphSAGEClassifier,
    data: Data,
    all_addrs: List[str],
    index_map: Dict[str, int],
    risk_scores: Dict[str, float],
    seed_addrs: Set[str],
    top_k: int,
    gnn_epochs: int,
) -> Dict[str, dict]:
    """Run GNNExplainer for top-K wallets and collect subgraph + feature attributions.

    Returns dict keyed by wallet address.
    """
    # Select top-K wallets by risk score that exist in our graph
    ranked = sorted(
        ((addr, score) for addr, score in risk_scores.items() if addr in index_map),
        key=lambda x: x[1],
        reverse=True,
    )[:top_k]
    print(f"  Selected {len(ranked)} target wallets (top-{top_k} by risk_score).")

    # Build PyG explainer
    # API verified for torch-geometric 2.6.1:
    #   Explainer(model, algorithm=GNNExplainer(epochs=N), explanation_type='model',
    #             node_mask_type='attributes', edge_mask_type='object',
    #             model_config=ModelConfig(...))
    explainer = Explainer(
        model=model,
        algorithm=GNNExplainer(epochs=gnn_epochs),
        explanation_type="model",
        node_mask_type="attributes",
        edge_mask_type="object",
        model_config=ModelConfig(
            mode="binary_classification",
            task_level="node",
            return_type="probs",
        ),
    )

    x = data.x
    edge_index = data.edge_index
    # Build an inverse map: index → address (for edge node lookup)
    idx_to_addr = all_addrs  # ordered list, positional index = node index

    results: Dict[str, dict] = {}
    t0 = time.time()

    edge_src_np_full = edge_index[0].numpy()
    edge_dst_np_full = edge_index[1].numpy()

    for rank_i, (addr, risk_score) in enumerate(ranked):
        target_idx = index_map[addr]

        # Skip isolated nodes — GNNExplainer produces degenerate zero masks
        # and wastes ~7s of CPU per node with no informative output.
        incident_check = (edge_src_np_full == target_idx) | (edge_dst_np_full == target_idx)
        has_edges = bool(incident_check.any())

        if not has_edges:
            results[addr] = {
                "address": addr,
                "risk_score": float(risk_score),
                "is_seed": addr in seed_addrs,
                "nodes": [{"address": addr, "risk_score": float(risk_score), "is_seed": addr in seed_addrs}],
                "edges": [],
                "feature_importance": [{"feature": name, "importance": 0.0} for name in NODE_FEATURE_NAMES],
            }
            if (rank_i + 1) % 10 == 0 or rank_i == 0:
                print(f"    [{rank_i+1}/{len(ranked)}] {addr[:20]}... ISOLATED (no edges)", flush=True)
            continue

        try:
            explanation = explainer(x, edge_index, index=target_idx)
        except Exception as exc:
            print(f"  WARNING: GNNExplainer failed for {addr[:16]}...: {exc}", flush=True)
            continue

        # --- Feature importance: node_mask for the target node ---
        # explanation.node_mask shape: [N, F]  — per-node, per-feature importance
        # We take the target node's feature mask
        node_mask = explanation.node_mask  # Tensor [N, F] or None
        if node_mask is not None:
            target_feat_imp = node_mask[target_idx].detach().cpu().numpy()  # (F,)
            feat_importance = [
                {"feature": NODE_FEATURE_NAMES[j], "importance": float(target_feat_imp[j])}
                for j in range(NODE_FEATURE_DIM)
            ]
            feat_importance.sort(key=lambda d: d["importance"], reverse=True)
        else:
            feat_importance = [
                {"feature": name, "importance": 0.0} for name in NODE_FEATURE_NAMES
            ]

        # --- Edge mask: extract incident edges ---
        edge_mask = explanation.edge_mask  # Tensor [E] or None
        if edge_mask is not None:
            edge_mask_np = edge_mask.detach().cpu().numpy()  # (E,)
            edge_src_np = edge_index[0].numpy()
            edge_dst_np = edge_index[1].numpy()

            # Find edges incident to target_idx
            incident_mask = (edge_src_np == target_idx) | (edge_dst_np == target_idx)
            incident_indices = np.where(incident_mask)[0]

            if len(incident_indices) > 0:
                incident_importances = edge_mask_np[incident_indices]

                # Keep edges: importance >= threshold OR top-K
                top_idx = np.argsort(incident_importances)[::-1][:EDGE_MASK_TOP_K]
                threshold_idx = np.where(incident_importances >= EDGE_MASK_THRESHOLD)[0]
                keep_set = set(top_idx.tolist()) | set(threshold_idx.tolist())
                keep_incident = [incident_indices[k] for k in keep_set]

                subgraph_edges = []
                subgraph_node_indices: set[int] = {target_idx}
                for ei in keep_incident:
                    src_i = int(edge_src_np[ei])
                    dst_i = int(edge_dst_np[ei])
                    subgraph_node_indices.add(src_i)
                    subgraph_node_indices.add(dst_i)
                    subgraph_edges.append({
                        "source": idx_to_addr[src_i] if src_i < len(idx_to_addr) else str(src_i),
                        "target": idx_to_addr[dst_i] if dst_i < len(idx_to_addr) else str(dst_i),
                        "weight": float(risk_scores.get(
                            idx_to_addr[src_i] if src_i < len(idx_to_addr) else "", 0.0
                        )),
                        "edge_importance": float(edge_mask_np[ei]),
                    })
            else:
                subgraph_edges = []
                subgraph_node_indices = {target_idx}
        else:
            subgraph_edges = []
            subgraph_node_indices = {target_idx}

        # Build subgraph node list
        subgraph_nodes = [
            {
                "address": idx_to_addr[ni] if ni < len(idx_to_addr) else str(ni),
                "risk_score": float(risk_scores.get(
                    idx_to_addr[ni] if ni < len(idx_to_addr) else "", 0.0
                )),
                "is_seed": (idx_to_addr[ni] if ni < len(idx_to_addr) else "") in seed_addrs,
            }
            for ni in sorted(subgraph_node_indices)
        ]

        results[addr] = {
            "address": addr,
            "risk_score": float(risk_score),
            "is_seed": addr in seed_addrs,
            "nodes": subgraph_nodes,
            "edges": subgraph_edges,
            "feature_importance": feat_importance,
        }

        if (rank_i + 1) % 10 == 0 or rank_i == 0:
            print(f"    [{rank_i+1}/{len(ranked)}] {addr[:20]}... "
                  f"risk={risk_score:.4f} edges_kept={len(subgraph_edges)} "
                  f"elapsed={time.time()-t0:.1f}s", flush=True)

    print(f"  GNNExplainer done: {len(results)} wallets in {time.time()-t0:.1f}s.")
    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 8 XAI-B: GNNExplainer Subgraph.")
    parser.add_argument("--top-k", type=int, default=settings.gnn_explainer_top_k,
                        help=f"Number of top-risk wallets to explain (default {settings.gnn_explainer_top_k})")
    parser.add_argument("--epochs", type=int, default=30,
                        help="GNNExplainer optimisation epochs (default 30)")
    args = parser.parse_args()

    xai_dir = Path(settings.xai_dir)
    xai_dir.mkdir(parents=True, exist_ok=True)
    out_path = Path(settings.gnn_subgraphs_path)

    print("=" * 60)
    print("Phase 8 XAI-B — GraphSAGE GNNExplainer Subgraphs")
    print("=" * 60)
    print(f"  torch-geometric 2.6.1 Explainer API (verified 2026-09-08)")
    print(f"  Top-K: {args.top_k} | GNNExplainer epochs: {args.epochs}")
    print()

    print("[1/5] Loading model ...")
    model = load_graphsage()

    print("\n[2/5] Loading seed addresses + risk scores ...")
    seed_addrs = load_ransomwhere_seeds()
    risk_scores = load_wallet_risk_scores()
    print(f"  {len(seed_addrs):,} seed addresses | {len(risk_scores):,} risk scores")

    print("\n[3/5] Rebuilding PyG Data object ...")
    conn = psycopg2.connect(settings.database_url)
    with GraphService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password) as svc:
        data, all_addrs, index_map = rebuild_pyg_data(conn, svc, seed_addrs)
    conn.close()

    print("\n[4/5] Running GNNExplainer ...")
    subgraphs = run_gnn_explainer(
        model=model,
        data=data,
        all_addrs=all_addrs,
        index_map=index_map,
        risk_scores=risk_scores,
        seed_addrs=seed_addrs,
        top_k=args.top_k,
        gnn_epochs=args.epochs,
    )

    print(f"\n[5/5] Writing {len(subgraphs)} subgraph records -> {out_path} ...")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(subgraphs, f, indent=None, separators=(",", ":"))
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"  Written: {out_path} ({size_mb:.2f} MB)")

    print("\n" + "=" * 60)
    print("XAI-B COMPLETE.")
    print(f"  Output: {out_path}")
    print(f"  Wallets explained: {len(subgraphs):,}")
    print("=" * 60)


if __name__ == "__main__":
    main()
