"""Phase 9.5 Fix — seed_wallet_proximity Zeroing Bug.

Root cause: train_graphsage.py ran GDS Personalized PageRank and stored the
scores in-memory as seed_prox, but never wrote them back as w.seed_proximity
on :Wallet nodes in Neo4j. build_evidence_trails.py reads w.seed_proximity
from Neo4j — since it was never written, load_seed_proximities() returned {}
and every wallet got seed_wallet_proximity=0.0 in evidence_trails.json.

This script:
  1. Re-runs ONLY the PageRank step (no model training).
  2. Persists w.seed_proximity on :Wallet nodes in Neo4j.
  3. Re-runs build_evidence_trails to regenerate evidence_trails.json.

Usage:
    backend/venv/Scripts/python backend/scripts/fix_seed_proximity.py

Estimated runtime: ~30s (PageRank only, no training).
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict

_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.config import settings
from app.services.graph_service import GraphService

# Import the two functions we need from train_graphsage
from scripts.train_graphsage import (
    load_ransomwhere_seeds,
    run_seeded_pagerank,
    write_pagerank_to_neo4j,
    NEO4J_BATCH,
)

_DATA_DIR = _PROJECT_ROOT / "data"
_RANSOMWHERE_FILE = _DATA_DIR / "ransomwhere_seeds.json"


def main() -> None:
    print("=" * 60)
    print("Phase 9.5 Fix — seed_wallet_proximity Write-Back")
    print("=" * 60)

    print("\n[1/3] Loading Ransomwhere seed addresses ...")
    seed_addrs = load_ransomwhere_seeds()
    print(f"  {len(seed_addrs):,} seed addresses loaded.")

    print("\n[2/3] Running GDS Personalized PageRank ...")
    t0 = time.time()
    with GraphService(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    ) as svc:
        seed_prox = run_seeded_pagerank(svc, seed_addrs)
        pr_elapsed = time.time() - t0
        print(f"  PageRank complete in {pr_elapsed:.1f}s — {len(seed_prox):,} wallets scored.")

        non_zero = sum(1 for v in seed_prox.values() if v > 0)
        print(f"  Non-zero proximity scores: {non_zero:,}")

        print("\n[3/3] Writing seed_proximity to Neo4j ...")
        written = write_pagerank_to_neo4j(svc, seed_prox)

        # Spot-check: verify 5 wallets near seed addresses have non-zero scores
        print("\n--- Spot-check: top-10 wallets by seed_proximity ---")
        top = sorted(seed_prox.items(), key=lambda x: x[1], reverse=True)[:10]
        for addr, score in top:
            print(f"  {addr[:20]}...  proximity={score:.6f}")

        # Verify in Neo4j
        print("\n--- Verifying Neo4j write (sample 5 non-zero nodes) ---")
        with svc.driver.session() as s:
            result = s.run(
                """
                MATCH (w:Wallet)
                WHERE w.seed_proximity IS NOT NULL AND w.seed_proximity > 0
                RETURN w.address AS addr, w.seed_proximity AS sp
                ORDER BY w.seed_proximity DESC
                LIMIT 5
                """
            )
            rows = list(result)
            if not rows:
                print("  ERROR: No nodes with seed_proximity > 0 found after write!")
                sys.exit(1)
            for row in rows:
                print(f"  {row['addr'][:20]}...  seed_proximity={row['sp']:.6f}")

        print(f"\n  {written:,} Neo4j wallet nodes updated with seed_proximity.")

    print("\n[4/4] Regenerating evidence_trails.json ...")
    print("  Running build_evidence_trails.py ...")

    # Import and call main directly to avoid subprocess overhead
    import importlib
    bet = importlib.import_module("scripts.build_evidence_trails")
    bet.main()

    # Final verification: check seed_wallet_proximity in output JSON
    evidence_path = Path(settings.evidence_trails_path)
    with open(evidence_path, "r", encoding="utf-8") as f:
        trails = json.load(f)

    non_zero_prox = sum(
        1 for t in trails.values() if t.get("seed_wallet_proximity", 0.0) > 0.0
    )
    total_trails = len(trails)

    print(f"\n--- Evidence trail verification ---")
    print(f"  Total trails: {total_trails:,}")
    print(f"  Trails with seed_wallet_proximity > 0: {non_zero_prox:,}")

    if non_zero_prox == 0:
        print("  FAIL: seed_wallet_proximity is still zero in all trails!")
        sys.exit(1)
    else:
        print(f"  PASS: {non_zero_prox:,} wallets have non-zero seed_wallet_proximity.")

    print("\n" + "=" * 60)
    print("Fix complete. Re-start the FastAPI server to reload artifacts.")
    print("=" * 60)


if __name__ == "__main__":
    main()
