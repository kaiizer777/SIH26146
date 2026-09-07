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

## Phase 3 Graph Build Benchmark — 2026-09-07 18:40 UTC

| Metric | Value |
|--------|-------|
| PostgreSQL rows read | 100,000 |
| Transaction nodes written | 100,000 |
| SENDS edges written | 138,000 |
| RECEIVES edges written | 188,342 |
| OBSERVED edges written | 100,000 |
| CO_SPEND edges written | 45,516 |
| Wall-clock time | 200.21s |
| Throughput | 499 rows/s |
| Peak memory | 39.41 MB |

> Keyset pagination (chunk=5,000 pg rows), Cypher UNWIND batches capped at 1,000 items each.

## Phase 4 — Entity Clustering (GDS Louvain) — 2026-09-07 19:03 UTC

| Metric | Value |
|---|---|
| GDS version | 2.13.12 |
| Louvain maxLevels | 10 |
| Louvain tolerance | 0.0001 |
| Graph projection: nodeCount | 24,673 |
| Graph projection: relationshipCount | 79,240 |
| Graph projection time | 0.11s |
| Louvain communityCount | 9,793 |
| Louvain modularity | 0.461029 |
| Louvain ranLevels | 5 |
| Louvain nodePropertiesWritten | 24,673 |
| Louvain elapsed | 8.68s |
| PostgreSQL rows updated | 100,000 |
| PostgreSQL sync elapsed | 290.83s |


## Phase 4 — Entity Clustering (GDS Louvain) — 2026-09-07 19:14 UTC

| Metric | Value |
|---|---|
| GDS version | 2.13.12 |
| Louvain maxLevels | 10 |
| Louvain tolerance | 0.0001 |
| Graph projection: nodeCount | 24,673 |
| Graph projection: relationshipCount | 79,240 |
| Graph projection time | 0.04s |
| Louvain communityCount | 9,791 |
| Louvain modularity | 0.461114 |
| Louvain ranLevels | 5 |
| Louvain nodePropertiesWritten | 24,673 |
| Louvain elapsed | 9.95s |
| PostgreSQL rows updated | 200,000 |
| PostgreSQL sync elapsed | 606.62s |


## Phase 4 — Entity Clustering (GDS Louvain) — 2026-09-07 19:37 UTC

| Metric | Value |
|---|---|
| GDS version | 2.13.12 |
| Louvain maxLevels | 10 |
| Louvain tolerance | 0.0001 |
| Graph projection: nodeCount | 24,673 |
| Graph projection: relationshipCount | 79,240 |
| Graph projection time | 1.15s |
| Louvain communityCount | 9,796 |
| Louvain modularity | 0.461007 |
| Louvain ranLevels | 5 |
| Louvain nodePropertiesWritten | 24,673 |
| Louvain elapsed | 9.82s |
| PostgreSQL rows updated | 100,000 |
| PostgreSQL sync elapsed | 279.6s |


## Phase 4 — Entity Clustering (GDS Louvain) — 2026-09-07 19:44 UTC

| Metric | Value |
|---|---|
| GDS version | 2.13.12 |
| Louvain maxLevels | 10 |
| Louvain tolerance | 0.0001 |
| Graph projection: nodeCount | 24,673 |
| Graph projection: relationshipCount | 79,240 |
| Graph projection time | 0.11s |
| Louvain communityCount | 9,794 |
| Louvain modularity | 0.461314 |
| Louvain ranLevels | 5 |
| Louvain nodePropertiesWritten | 24,673 |
| Louvain elapsed | 6.95s |
| PostgreSQL rows updated | 100,000 |
| PostgreSQL sync elapsed | 4.33s |


## Phase 5 — Autoencoder Training & Anomaly Scoring — 2026-09-07 20:03 UTC

| Metric | Value |
|---|---|
| PyTorch version | 2.4.1+cpu |
| Device | CPU |
| Non-illicit training rows | 76,756 |
| Non-illicit validation rows | 19,190 |
| Seed-illicit rows | 4,054 |
| All rows scored | 100,000 |
| Epochs trained | 150 |
| Final train MSE | 0.008056 |
| Final val MSE | 0.016810 |
| Threshold (95th pct, val) | 0.034618 |
| Illicit score > threshold | 4.9% |
| Non-illicit score > threshold | 5.0% (expected ~5%) |
| Training wall-clock time | 211.7s |
| Scoring wall-clock time | 1.0s |
| Write-back wall-clock time | 3.3s |
| Model file | C:\Users\bari2\Desktop\SIH26146\data\models\autoencoder_20260907.pt |
| Scaler file | C:\Users\bari2\Desktop\SIH26146\data\models\scaler_20260907.pkl |

