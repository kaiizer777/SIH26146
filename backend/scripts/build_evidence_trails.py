"""Phase 8 XAI-C — Multi-Layer Evidence Trail Assembly.

For every flagged wallet (is_flagged=true on any tx OR risk_score >= 0.5),
assembles the canonical evidence-trail JSON from Phase 4-7 actual outputs:

    {
      "address": str,
      "cluster_id": int,
      "cluster_size": int,
      "anomaly_score": float,           # best (max) anomaly_score across wallet's txs
      "anomaly_rank_percentile": float,  # %ile rank in full population (0-100)
      "mixing_patterns": [str],         # e.g. ["PEELING_CHAIN", "COINJOIN"]
      "chain_hops": int,                # max chain_hops across wallet's txs
      "risk_score": float,              # from Phase 7 GraphSAGE
      "seed_wallet_proximity": float,   # from Phase 7 GDS PageRank (Neo4j)
      "triggered_rules": [str]          # human-readable rule strings
    }

Sources:
    PostgreSQL: anomaly_score, is_mixing, chain_hops, cluster_id, is_flagged
    Neo4j:      cluster_size (via MATCH/groupBy), seed_proximity
    wallet_risk_scores.json: risk_score per wallet (Phase 7 output)

Output:
    data/xai/evidence_trails.json  keyed by wallet address

Usage:
    backend/venv/Scripts/python backend/scripts/build_evidence_trails.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Set

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

from app.config import settings
from app.services.graph_service import GraphService

# ---------------------------------------------------------------------------
# Thresholds & Dynamic Resolution
# ---------------------------------------------------------------------------
RISK_SCORE_THRESHOLD = 0.5     # match settings.risk_score_flag_threshold
PEELING_CHAIN_MIN_HOPS = 5     # Phase 6 spec


def get_anomaly_threshold() -> float:
    """Resolve calibrated anomaly threshold from active models directory."""
    models_dir = Path(settings.models_dir)
    use_legacy = getattr(settings, "use_legacy_anomaly_model", getattr(settings, "use_legacy_models", False))
    if not use_legacy:
        th_files = sorted(models_dir.glob("ft_threshold_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if th_files:
            try:
                with open(th_files[0], "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return float(data.get("threshold", data.get("calibrated_threshold", 0.036354)))
            except Exception:
                pass
    th_files = sorted(models_dir.glob("threshold_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if th_files:
        try:
            with open(th_files[0], "r", encoding="utf-8") as f:
                return float(json.load(f)["threshold"])
        except Exception:
            pass
    return 0.036354


# ---------------------------------------------------------------------------
# Step 1: Load risk scores from Phase 7 JSON
# ---------------------------------------------------------------------------

def load_risk_scores() -> Dict[str, float]:
    path = Path(settings.wallet_risk_scores_path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_ransomwhere_seeds() -> Set[str]:
    seed_file = _PROJECT_ROOT / "data" / "ransomwhere_seeds.json"
    if not seed_file.exists():
        return set()
    with open(seed_file, "r", encoding="utf-8") as f:
        raw = json.load(f)
    records = raw.get("result", raw) if isinstance(raw, dict) else raw
    return {rec["address"] for rec in records if isinstance(rec, dict) and "address" in rec}


# ---------------------------------------------------------------------------
# Step 2: Aggregate per-wallet data from PostgreSQL
# ---------------------------------------------------------------------------

def _parse_addr_list(value) -> List[str]:
    if isinstance(value, (list, tuple)):
        return [str(v) for v in value]
    if isinstance(value, str):
        cleaned = value.strip().strip("{}")
        if not cleaned:
            return []
        return [a.strip() for a in cleaned.split(",") if a.strip()]
    return []


def aggregate_wallet_pg(conn) -> Dict[str, Dict]:
    """Aggregate per-wallet stats from PostgreSQL.

    Keyed by wallet address (primary input address = input_addresses[0]).
    Also indexes all output addresses to catch receiving-side flagged wallets.

    Fields per wallet:
        max_anomaly_score: float
        has_mixing: bool
        max_chain_hops: int
        cluster_id: int
        is_flagged: bool
        tx_count: int
        all_addresses: set[str]   (all addresses this wallet appears in)
    """
    print("  Aggregating wallet data from PostgreSQL (keyset-paginated) ...")
    t0 = time.time()

    wallet_stats: Dict[str, Dict] = {}

    def _ensure(addr: str) -> Dict:
        if addr not in wallet_stats:
            wallet_stats[addr] = {
                "max_anomaly_score": 0.0,
                "has_mixing": False,
                "max_chain_hops": 0,
                "cluster_id": -1,
                "is_flagged": False,
                "tx_count": 0,
            }
        return wallet_stats[addr]

    chunk = 10_000
    last_id = 0
    total_rows = 0

    while True:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, input_addresses, output_addresses,
                       anomaly_score, is_mixing, chain_hops,
                       cluster_id, is_flagged
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
            in_addrs = _parse_addr_list(row["input_addresses"] or [])
            out_addrs = _parse_addr_list(row["output_addresses"] or [])

            anomaly = float(row["anomaly_score"] or 0.0)
            mixing = bool(row["is_mixing"])
            hops = int(row["chain_hops"] or 0)
            cluster = int(row["cluster_id"]) if row["cluster_id"] is not None else -1
            flagged = bool(row["is_flagged"])

            # Primary wallet = first input address
            primary = in_addrs[0] if in_addrs else None

            # Update primary wallet
            if primary:
                wd = _ensure(primary)
                wd["max_anomaly_score"] = max(wd["max_anomaly_score"], anomaly)
                wd["has_mixing"] = wd["has_mixing"] or mixing
                wd["max_chain_hops"] = max(wd["max_chain_hops"], hops)
                if cluster >= 0:
                    wd["cluster_id"] = cluster
                wd["is_flagged"] = wd["is_flagged"] or flagged
                wd["tx_count"] += 1

            # Also mark output addresses as flagged if the transaction is flagged
            if flagged:
                for addr in out_addrs:
                    wd = _ensure(addr)
                    wd["is_flagged"] = True
                    if cluster >= 0 and wd["cluster_id"] < 0:
                        wd["cluster_id"] = cluster

        total_rows += len(rows)
        last_id = rows[-1]["id"]
        if len(rows) < chunk:
            break

    elapsed = time.time() - t0
    print(f"  Aggregated {len(wallet_stats):,} wallet entries from {total_rows:,} rows in {elapsed:.1f}s.")
    return wallet_stats


# ---------------------------------------------------------------------------
# Step 3: Load cluster sizes from Neo4j
# ---------------------------------------------------------------------------

def load_cluster_sizes(svc: GraphService) -> Dict[int, int]:
    """Return dict cluster_id → member_count from Neo4j."""
    print("  Loading cluster sizes from Neo4j ...")
    sizes: Dict[int, int] = {}
    with svc.driver.session() as s:
        result = s.run(
            """
            MATCH (w:Wallet)
            WHERE w.cluster_id IS NOT NULL
            RETURN w.cluster_id AS cid, count(*) AS cnt
            """
        )
        for rec in result:
            sizes[int(rec["cid"])] = int(rec["cnt"])
    print(f"  {len(sizes):,} distinct cluster IDs.")
    return sizes


def load_seed_proximities(svc: GraphService) -> Dict[str, float]:
    """Load seed_proximity written by Phase 7 GDS PageRank."""
    print("  Loading seed_proximity from Neo4j ...")
    prox: Dict[str, float] = {}
    with svc.driver.session() as s:
        result = s.run(
            "MATCH (w:Wallet) WHERE w.seed_proximity IS NOT NULL "
            "RETURN w.address AS addr, w.seed_proximity AS sp"
        )
        for rec in result:
            prox[rec["addr"]] = float(rec["sp"])
    print(f"  {len(prox):,} wallets with seed_proximity.")
    return prox


# ---------------------------------------------------------------------------
# Step 4: Compute anomaly percentile ranks
# ---------------------------------------------------------------------------

def compute_anomaly_percentiles(wallet_stats: Dict[str, Dict]) -> Dict[str, float]:
    """Return dict addr → percentile rank (0-100) within all wallets."""
    addrs = list(wallet_stats.keys())
    scores = np.array([wallet_stats[a]["max_anomaly_score"] for a in addrs], dtype=np.float64)
    n = len(scores)
    if n == 0:
        return {}
    # Rank: percentile = (number of wallets with score <= this) / n * 100
    ranks = np.searchsorted(np.sort(scores), scores, side="right")
    percentiles = ranks / n * 100.0
    return {a: float(p) for a, p in zip(addrs, percentiles)}


# ---------------------------------------------------------------------------
# Step 5: Build triggered rules
# ---------------------------------------------------------------------------

def _build_triggered_rules(
    anomaly: float,
    anomaly_pct: float,
    risk_score: float,
    has_mixing: bool,
    chain_hops: int,
    cluster_size: int,
    is_seed: bool,
    anomaly_threshold: float,
) -> List[str]:
    """Generate human-readable rule strings from actual computed values."""
    rules: List[str] = []

    if risk_score >= RISK_SCORE_THRESHOLD:
        rules.append(f"HIGH_GRAPH_RISK (score={risk_score:.3f} >= {RISK_SCORE_THRESHOLD:.2f})")

    use_legacy_anom = getattr(settings, "use_legacy_anomaly_model", getattr(settings, "use_legacy_models", False))
    rule_name = "AUTOENCODER_ANOMALY" if use_legacy_anom else "FT_TRANSFORMER_ANOMALY"
    if anomaly >= anomaly_threshold:
        rules.append(
            f"{rule_name} (score={anomaly:.4f} >= {anomaly_threshold:.4f}, "
            f"rank_pct={anomaly_pct:.1f})"
        )

    if has_mixing and chain_hops >= PEELING_CHAIN_MIN_HOPS:
        rules.append(f"PEELING_CHAIN_DETECTED (hops={chain_hops} >= {PEELING_CHAIN_MIN_HOPS})")

    if has_mixing and chain_hops == 0:
        # CoinJoin-like (is_mixing=true but no chain traversal depth)
        rules.append("COINJOIN_PATTERN_DETECTED")

    if is_seed:
        rules.append("RANSOMWHERE_SEED_ADDRESS")

    if cluster_size >= 10:
        rules.append(f"LARGE_CLUSTER (size={cluster_size})")

    return rules


def _build_mixing_patterns(has_mixing: bool, chain_hops: int) -> List[str]:
    patterns: List[str] = []
    if has_mixing and chain_hops >= PEELING_CHAIN_MIN_HOPS:
        patterns.append("PEELING_CHAIN")
    if has_mixing and chain_hops == 0:
        patterns.append("COINJOIN")
    if has_mixing and 0 < chain_hops < PEELING_CHAIN_MIN_HOPS:
        patterns.append("MIXING")
    return patterns


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    xai_dir = Path(settings.xai_dir)
    xai_dir.mkdir(parents=True, exist_ok=True)
    out_path = Path(settings.evidence_trails_path)

    print("=" * 60)
    print("Phase 8 XAI-C — Evidence Trail Assembly")
    print("=" * 60)

    print("\n[1/6] Loading Phase 7 risk scores ...")
    risk_scores = load_risk_scores()
    print(f"  {len(risk_scores):,} wallet risk scores loaded.")

    print("\n[2/6] Loading Ransomwhere seed addresses ...")
    seed_addrs = load_ransomwhere_seeds()
    print(f"  {len(seed_addrs):,} seed addresses.")

    print("\n[3/6] Aggregating wallet data from PostgreSQL ...")
    conn = psycopg2.connect(settings.database_url)
    wallet_stats = aggregate_wallet_pg(conn)
    conn.close()

    print("\n[4/6] Loading cluster sizes + seed_proximity from Neo4j ...")
    with GraphService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password) as svc:
        cluster_sizes = load_cluster_sizes(svc)
        seed_proximities = load_seed_proximities(svc)

    print("\n[5/6] Computing anomaly percentile ranks ...")
    anomaly_pcts = compute_anomaly_percentiles(wallet_stats)

    print("\n[6/6] Assembling evidence trails ...")
    t0 = time.time()

    # Determine the set of wallets to include:
    # Union of: flagged via PG, risk_score >= threshold, seed wallets in graph
    candidate_addrs: Set[str] = set()
    for addr, wd in wallet_stats.items():
        if wd["is_flagged"]:
            candidate_addrs.add(addr)
    for addr, score in risk_scores.items():
        if score >= RISK_SCORE_THRESHOLD:
            candidate_addrs.add(addr)
    for addr in seed_addrs:
        if addr in wallet_stats or addr in risk_scores:
            candidate_addrs.add(addr)

    print(f"  Building trails for {len(candidate_addrs):,} wallets ...")

    anomaly_thresh = get_anomaly_threshold()
    print(f"  Active anomaly threshold: {anomaly_thresh:.6f}")

    trails: Dict[str, dict] = {}
    for addr in candidate_addrs:
        wd = wallet_stats.get(addr, {})
        cluster_id: int = wd.get("cluster_id", -1)
        cluster_size: int = cluster_sizes.get(cluster_id, 1) if cluster_id >= 0 else 1
        anomaly: float = wd.get("max_anomaly_score", 0.0)
        anomaly_pct: float = anomaly_pcts.get(addr, 0.0)
        has_mixing: bool = wd.get("has_mixing", False)
        chain_hops: int = wd.get("max_chain_hops", 0)
        risk_score: float = risk_scores.get(addr, 0.0)
        prox: float = seed_proximities.get(addr, 0.0)
        is_seed: bool = addr in seed_addrs

        mixing_patterns = _build_mixing_patterns(has_mixing, chain_hops)
        triggered_rules = _build_triggered_rules(
            anomaly=anomaly,
            anomaly_pct=anomaly_pct,
            risk_score=risk_score,
            has_mixing=has_mixing,
            chain_hops=chain_hops,
            cluster_size=cluster_size,
            is_seed=is_seed,
            anomaly_threshold=anomaly_thresh,
        )

        trails[addr] = {
            "address": addr,
            "cluster_id": cluster_id,
            "cluster_size": cluster_size,
            "anomaly_score": round(anomaly, 6),
            "anomaly_rank_percentile": round(anomaly_pct, 2),
            "mixing_patterns": mixing_patterns,
            "chain_hops": chain_hops,
            "risk_score": round(risk_score, 6),
            "seed_wallet_proximity": round(prox, 6),
            "triggered_rules": triggered_rules,
        }

    elapsed = time.time() - t0
    print(f"  Assembled {len(trails):,} evidence trails in {elapsed:.2f}s.")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(trails, f, indent=None, separators=(",", ":"))
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"  Written: {out_path} ({size_mb:.2f} MB)")

    # Spot-check verification
    sample_addrs = list(trails.keys())[:3]
    print("\n--- Spot-check (3 wallets) ---")
    for addr in sample_addrs:
        t = trails[addr]
        print(f"  {addr[:20]}... | risk={t['risk_score']:.4f} | "
              f"anomaly={t['anomaly_score']:.4f} | "
              f"cluster_size={t['cluster_size']} | "
              f"rules={len(t['triggered_rules'])}")

    # Verify: all flagged wallets have non-empty triggered_rules
    flagged_empty_rules = sum(
        1 for addr, t in trails.items()
        if wallet_stats.get(addr, {}).get("is_flagged") and not t["triggered_rules"]
    )
    print(f"\n  Flagged wallets with empty triggered_rules: {flagged_empty_rules} "
          f"(should be 0 or near 0)")

    print("\n" + "=" * 60)
    print("XAI-C COMPLETE.")
    print(f"  Output: {out_path}")
    print(f"  Evidence trails: {len(trails):,}")
    print("=" * 60)


if __name__ == "__main__":
    main()
