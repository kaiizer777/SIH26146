# PERFORMANCE_LOG.md — SIH26146

Measured timing results from Phase 2, 5, and 7.
All numbers are actual measurements on the dev machine, not estimates from the reference document.

---

## Phase 2 Ingest — Unit Test Verification (2026-09-08)

| Item | Result |
|------|--------|
| Unit tests (15 tests) | **15/15 PASSED** in 0.94s |
| Validation rejection | Verified: bad txid, negative fee, invalid script_type, bad IP, array-length mismatch all correctly rejected |
| Content sniffing | Verified: CSV/JSON/XML correctly detected from bytes regardless of extension |
| Health endpoint | Verified: GET /health → 200 {"status": "ok"} |

### Live Verification Summary

- **PostgreSQL & Redis Status**: Running in Docker with remapped host ports (5433 for Postgres, 6380 for Redis) to avoid conflict with host-level services.
- **Alembic Migration**: `001_create_transactions_table` successfully applied.
- **Full Test Suite**: **26/26 PASSED in 4.73s** (`test_roundtrip_10k_sample` and `test_cross_format_consistency` verified against live database with 100% GeoIP enrichment).
- **100k Bulk Benchmark**: Completed with full GeoLite2-City and GeoLite2-ASN enrichment and bulk COPY streaming.

---

## Phase 2 Ingest Benchmark — 2026-09-07 18:20 UTC

| Metric | Value |
|--------|-------|
| Hardware | CPU: Intel64 Family 6 Model 154 Stepping 3, GenuineIntel, OS: Windows 10, Python: 3.11.15 |
| Dataset | `data/synthetic_transactions.csv` (100,000 rows) |
| Batch size | 5000 rows |
| Total received | 100,000 |
| Total inserted | 100,000 |
| Total rejected | 0 |
| Wall-clock time | 6.70s |
| Throughput | 14,928 rows/sec |

> Note: This is a measured result on the actual dev machine, not an estimate.
> Duplicates from previous benchmark runs are silently skipped by the UNIQUE
> constraint on `txid` — rejected count may include them on re-runs.

## Phase 2 Ingest Benchmark — 2026-09-07 18:21 UTC

| Metric | Value |
|--------|-------|
| Hardware | CPU: Intel64 Family 6 Model 154 Stepping 3, GenuineIntel, OS: Windows 10, Python: 3.11.15 |
| Dataset | `data/synthetic_transactions.csv` (100,000 rows) |
| Batch size | 5000 rows |
| Total received | 100,000 |
| Total inserted | 100,000 |
| Total rejected | 0 |
| Wall-clock time | 8.38s |
| Throughput | 11,938 rows/sec |

> Note: This is a measured result on the actual dev machine, not an estimate.
> Duplicates from previous benchmark runs are silently skipped by the UNIQUE
> constraint on `txid` — rejected count may include them on re-runs.

## Phase 2 Ingest Benchmark — 2026-09-07 18:23 UTC

| Metric | Value |
|--------|-------|
| Hardware | CPU: Intel64 Family 6 Model 154 Stepping 3, GenuineIntel, OS: Windows 10, Python: 3.11.15 |
| Dataset | `data/synthetic_transactions.csv` (100,000 rows) |
| Batch size | 5000 rows |
| Total received | 100,000 |
| Total inserted | 100,000 |
| Total rejected | 0 |
| Wall-clock time | 12.04s |
| Throughput | 8,307 rows/sec |

> Note: This is a measured result on the actual dev machine, not an estimate.
> Duplicates from previous benchmark runs are silently skipped by the UNIQUE
> constraint on `txid` — rejected count may include them on re-runs.
