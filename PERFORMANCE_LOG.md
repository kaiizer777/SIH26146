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

### Live Benchmark Status

**Blocked by Docker Desktop API version mismatch on dev machine.**

- Docker CLI expects API v1.53; Docker Desktop Engine returns 500 for API v1.51 routes.
- A separate PostgreSQL instance is running on port 5432 with unknown credentials (not the one defined in docker-compose.yml).
- `docker compose up postgres` fails at the image-pull stage with HTTP 500.

**Resolution:** Run the benchmark manually once Docker Desktop is updated or the postgres container is started with the correct credentials:

```
# Start services
docker compose up postgres redis -d

# Run migration
.\backend\venv\Scripts\python -m alembic -c backend\alembic.ini upgrade head

# Run benchmark
.\backend\venv\Scripts\python backend\scripts\bench_ingest.py
```

The benchmark script (`backend/scripts/bench_ingest.py`) is production-ready and will append measured results to this file automatically.

---
