"""Performance benchmark: ingest 100k-row CSV through the full pipeline.

Calls run_ingest_pipeline() directly (no Celery broker) with a real
psycopg2 connection to the local Postgres instance.

Usage:
    python backend/scripts/bench_ingest.py

Requires DATABASE_URL env var (or Postgres running on localhost with
sih_user:sih_password@localhost:5432/sih_bitcoin defaults).

Results are appended to PERFORMANCE_LOG.md in the project root.
"""

import os
import platform
import sys
import time
from pathlib import Path

# Ensure backend/ is on the path regardless of CWD.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND_DIR))

from app.tasks.ingest import run_ingest_pipeline

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DATA_CSV = _PROJECT_ROOT / "data" / "synthetic_transactions.csv"
_PERF_LOG = _PROJECT_ROOT / "PERFORMANCE_LOG.md"


def main() -> None:
    if not _DATA_CSV.exists():
        print(f"[bench] ERROR: {_DATA_CSV} not found", file=sys.stderr)
        sys.exit(1)

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin",
    )

    print(f"[bench] Starting 100k-row ingest benchmark")
    print(f"[bench] File : {_DATA_CSV}")
    print(f"[bench] DB   : {db_url.split('@')[-1]}")  # Don't print credentials

    import psycopg2

    try:
        conn_test = psycopg2.connect(db_url, connect_timeout=5)
        conn_test.close()
    except Exception as exc:
        print(f"[bench] ERROR: Cannot connect to Postgres: {exc}", file=sys.stderr)
        sys.exit(1)

    def real_conn_factory():
        return psycopg2.connect(db_url)

    from app.services.bulk_insert import bulk_copy_insert

    t_start = time.perf_counter()
    summary = run_ingest_pipeline(
        str(_DATA_CSV),
        "csv",
        insert_fn=bulk_copy_insert,
        db_conn_factory=real_conn_factory,
    )
    elapsed = time.perf_counter() - t_start

    received = summary["total_received"]
    inserted = summary["total_inserted"]
    rejected = summary["total_rejected"]
    throughput = inserted / elapsed if elapsed > 0 else 0

    print(f"\n[bench] Results:")
    print(f"  Total received : {received:,}")
    print(f"  Total inserted : {inserted:,}")
    print(f"  Total rejected : {rejected:,}")
    print(f"  Elapsed time   : {elapsed:.2f}s")
    print(f"  Throughput     : {throughput:,.0f} rows/sec")

    # Append to PERFORMANCE_LOG.md
    import datetime
    hw_info = f"CPU: {platform.processor()}, OS: {platform.system()} {platform.release()}, Python: {sys.version.split()[0]}"
    log_entry = f"""
## Phase 2 Ingest Benchmark — {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}

| Metric | Value |
|--------|-------|
| Hardware | {hw_info} |
| Dataset | `data/synthetic_transactions.csv` (100,000 rows) |
| Batch size | {os.environ.get("INGEST_BATCH_SIZE", "5000")} rows |
| Total received | {received:,} |
| Total inserted | {inserted:,} |
| Total rejected | {rejected:,} |
| Wall-clock time | {elapsed:.2f}s |
| Throughput | {throughput:,.0f} rows/sec |

> Note: This is a measured result on the actual dev machine, not an estimate.
> Duplicates from previous benchmark runs are silently skipped by the UNIQUE
> constraint on `txid` — rejected count may include them on re-runs.
"""

    with open(_PERF_LOG, "a", encoding="utf-8") as f:
        f.write(log_entry)

    print(f"\n[bench] Results appended to {_PERF_LOG}")


if __name__ == "__main__":
    main()
