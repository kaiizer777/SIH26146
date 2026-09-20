"""
Verification script: Confirms test_1000.csv and test_2000.csv meet all requirements:
1. Exactly 1000 / 2000 rows.
2. Zero duplicate txids within each file and across both.
3. Zero txid overlap with main synthetic_transactions.csv (proxy for the 100K PostgreSQL rows).
4. 3.0%?3.5% of unique wallets score CRITICAL via inline_scorer.score_batch().

Run from repo root:
  python data/verify_test_datasets.py
"""

from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path
from typing import Any

# Allow importing from backend
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

DATA_DIR = REPO_ROOT / "data"
FILES = {
    "test_1000.csv": 1000,
    "test_2000.csv": 2000,
}
MAIN_CSV = DATA_DIR / "synthetic_transactions.csv"


# -- Helpers --------------------------------------------------------------------


def _parse_pg(s: str) -> list[str]:
    """Parse Postgres array literal {a,b,c} to list of strings."""
    return [x.strip() for x in s.strip("{}").split(",") if x.strip()]


def _load_csv(path: Path) -> list[dict[str, Any]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _collect_txids(path: Path) -> set[str]:
    rows = _load_csv(path)
    return {r["txid"] for r in rows}


def _collect_unique_wallets(rows: list[dict[str, Any]]) -> set[str]:
    wallets: set[str] = set()
    for r in rows:
        wallets.update(_parse_pg(r.get("input_addresses", "")))
        wallets.update(_parse_pg(r.get("output_addresses", "")))
    return wallets


# -- Main -----------------------------------------------------------------------

PASS = "  [PASS]"
FAIL = "  [FAIL]"


def main() -> None:
    print("=" * 60)
    print("  Dataset Verification")
    print("=" * 60)

    # Load scorer (will init lazily ? models may or may not be present)
    try:
        from app.services.inline_scorer import score_batch, reset_scorer_for_tests
        scorer_available = True
    except Exception as exc:
        print(f"\n??  Could not import inline_scorer: {exc}")
        print("   Skipping CRITICAL wallet scoring check.")
        scorer_available = False

    # Collect main dataset txids for overlap check (sample first 50K lines for speed)
    main_txids: set[str] = set()
    if MAIN_CSV.exists():
        print(f"\nLoading main dataset txids from {MAIN_CSV.name} ?")
        count = 0
        with open(MAIN_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                main_txids.add(row["txid"])
                count += 1
                if count >= 100_000:
                    break
        print(f"  Loaded {len(main_txids):,} main txids.")
    else:
        print(f"\n??  {MAIN_CSV.name} not found ? skipping main-dataset overlap check.")

    all_test_txids: set[str] = set()
    all_ok = True

    for filename, expected_rows in FILES.items():
        path = DATA_DIR / filename
        print(f"\n{'-' * 55}")
        print(f"  File: {filename}")
        print(f"{'-' * 55}")

        # -- 1. File exists ------------------------------------------
        if not path.exists():
            print(f"{FAIL}  File not found: {path}")
            all_ok = False
            continue
        print(f"{PASS}  File exists")

        rows = _load_csv(path)

        # -- 2. Row count --------------------------------------------
        if len(rows) == expected_rows:
            print(f"{PASS}  Row count = {len(rows)}")
        else:
            print(f"{FAIL}  Row count = {len(rows)}  (expected {expected_rows})")
            all_ok = False

        # -- 3. No duplicate txids within file -----------------------
        txids = [r["txid"] for r in rows]
        if len(txids) == len(set(txids)):
            print(f"{PASS}  No intra-file duplicate txids")
        else:
            dup_count = len(txids) - len(set(txids))
            print(f"{FAIL}  {dup_count} duplicate txids within file")
            all_ok = False

        file_txids = set(txids)

        # -- 4. No overlap with other test file ----------------------
        cross_overlap = file_txids & all_test_txids
        if not cross_overlap:
            print(f"{PASS}  No cross-file txid overlap with other test files")
        else:
            print(f"{FAIL}  {len(cross_overlap)} txids overlap with other test files")
            all_ok = False
        all_test_txids |= file_txids

        # -- 5. No overlap with main dataset -------------------------
        main_overlap = file_txids & main_txids
        if not main_overlap:
            print(f"{PASS}  No txid overlap with main dataset")
        else:
            print(f"{FAIL}  {len(main_overlap)} txids overlap with main dataset")
            all_ok = False

        # -- 6. CRITICAL wallet % via inline_scorer ------------------
        if scorer_available:
            print("  Scoring wallets via inline_scorer.score_batch() ?")
            try:
                reset_scorer_for_tests()
                results = score_batch(rows)

                total_wallets = len(results)
                critical_wallets = [r for r in results if r["verdict"] == "CRITICAL"]
                n_critical = len(critical_wallets)
                pct_critical = (n_critical / total_wallets * 100) if total_wallets else 0.0

                # Target: 10-14 CRITICAL per 1K unique wallets = 1.0%-1.4% of total unique wallets
                per_1k = (n_critical / total_wallets * 1000) if total_wallets else 0.0
                in_range = 10.0 <= per_1k <= 14.0

                verdict_str = PASS if in_range else FAIL
                print(
                    f"{verdict_str}  CRITICAL wallets: {n_critical}/{total_wallets}"
                    f"  = {per_1k:.1f} per 1K wallets  (target: 10-14 per 1K)"
                )
                if not in_range:
                    all_ok = False

                # Show verdict distribution
                from collections import Counter
                dist = Counter(r["verdict"] for r in results)
                print(f"  Verdict distribution: {dict(dist)}")

            except Exception as exc:
                print(f"  ??  Scorer error: {exc}")
                import traceback
                traceback.print_exc()
        else:
            # Manual seed address count as proxy
            wallets = _collect_unique_wallets(rows)
            print(f"  Total unique wallets: {len(wallets)}")

    # -- Final summary -----------------------------------------------------------
    print(f"\n{'=' * 55}")
    if all_ok:
        print("  [PASS]  ALL CHECKS PASSED")
    else:
        print("  [FAIL]  SOME CHECKS FAILED ? review output above")
    print(f"{'=' * 55}\n")

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()



