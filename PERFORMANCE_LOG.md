
## Phase 2 Ingest Benchmark — 2026-09-23 16:57 UTC

| Metric | Value |
|--------|-------|
| Hardware | CPU: Intel64 Family 6 Model 154 Stepping 3, GenuineIntel, OS: Windows 10, Python: 3.11.15 |
| Dataset | `data/synthetic_transactions.csv` (100,000 rows) |
| Batch size | 5000 rows |
| Total received | 100,000 |
| Total inserted | 100,000 |
| Total rejected | 0 |
| Wall-clock time | 9.48s |
| Throughput | 10,544 rows/sec |

> Note: This is a measured result on the actual dev machine, not an estimate.
> Duplicates from previous benchmark runs are silently skipped by the UNIQUE
> constraint on `txid` — rejected count may include them on re-runs.

## Phase 3 Graph Build Benchmark — 2026-09-23 17:03 UTC

| Metric | Value |
|--------|-------|
| PostgreSQL rows read | 100,000 |
| Transaction nodes written | 100,000 |
| SENDS edges written | 138,000 |
| RECEIVES edges written | 188,342 |
| OBSERVED edges written | 100,000 |
| CO_SPEND edges written | 45,516 |
| Wall-clock time | 217.83s |
| Throughput | 459 rows/s |
| Peak memory | 39.43 MB |

> Keyset pagination (chunk=5,000 pg rows), Cypher UNWIND batches capped at 1,000 items each.

## Phase 4 — Entity Clustering (GDS Louvain) — 2026-09-23 17:04 UTC

| Metric | Value |
|---|---|
| GDS version | 2.13.12 |
| Louvain maxLevels | 10 |
| Louvain tolerance | 0.0001 |
| Graph projection: nodeCount | 24,673 |
| Graph projection: relationshipCount | 79,240 |
| Graph projection time | 2.42s |
| Louvain communityCount | 9,794 |
| Louvain modularity | 0.461001 |
| Louvain ranLevels | 5 |
| Louvain nodePropertiesWritten | 24,673 |
| Louvain elapsed | 11.19s |
| PostgreSQL rows updated | 100,000 |
| PostgreSQL sync elapsed | 10.48s |

