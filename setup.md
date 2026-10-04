# SIH26146 — Agent Setup Guide

**Goal:** Get the platform live with 15,000+ wallets on the dashboard, every feature working, and a live end-to-end ingest demo.

---

## Prerequisites

- Git, Docker Desktop 4.x+ (running), Node.js 20+, Python 3.11
- Minimum 8 GB RAM free for Docker (Neo4j's default heap + pagecache budget is ~3 GB)
- Clone the repo:
  ```powershell
  git clone https://github.com/kaiizer777/SIH26146.git
  Set-Location SIH26146
  ```
  ```bash
  git clone https://github.com/kaiizer777/SIH26146.git
  cd SIH26146
  ```

---

## Step 1 — Environment (optional)

**You do not need a `.env` file.** `docker compose up -d` works on a clean clone
with no `.env` at all — every value has a working default in
`docker-compose.yml`. Copy the template only when you want to change something:

```powershell
Copy-Item .env.example .env
```

> **Port note:** published host ports are variables, kept deliberately separate
> from the container ports so changing one can never break the stack's internal
> wiring. Defaults: Postgres **5433** → container `5432`, Redis **6380** →
> container `6379`, Neo4j **7474**/**7687**, API **8000**, dashboard **3000**.
> If you connect from a GUI tool (DBeaver, etc.) or a Redis client, use
> **5433** and **6380** — never `5432`/`6379`.
> Naming is not uniform: only Postgres and Redis use the `_HOST_PORT` suffix.
> `POSTGRES_PORT` survives in `.env.example` as host-side bookkeeping only and
> does **not** drive the mapping; `REDIS_PORT` is gone entirely — use
> **`REDIS_URL`.
>
> **CORS note (only needed off port 3000).** The backend reads `CORS_ORIGINS` as
> a **comma-separated list of origins**; whitespace around each entry is trimmed
> and empty entries are dropped. Unset or empty, it falls back to
> `http://localhost:3000` and `http://127.0.0.1:3000`, so the default stack needs
> nothing. Dashboard on a different port (`FRONTEND_PORT=3100`), in `.env`:
> ```.env
> CORS_ORIGINS=http://localhost:3100
> ```
> More than one origin:
> ```.env
> CORS_ORIGINS=http://localhost:3100,http://127.0.0.1:3100,https://ops.internal.example
> ```
> `FRONTEND_PORT` on its own is **not** sufficient — it republishes the container
> port but does not change the `Origin` header the browser sends, and the
> variable only takes effect once it is in the API container's environment
> (`docker compose up -d fastapi`). And for LAN / remote access the backend
> cannot infer anything: a browser on another machine sends
> `Origin: http://<lan-ip>:3000`, which must be listed explicitly, e.g.
> `CORS_ORIGINS=http://localhost:3000,http://192.168.1.50:3000`.
> `curl` is unaffected — this is a browser-only restriction.

> **`NEO4J_AUTH` is derived, not configured.** `docker-compose.yml` builds it
> from `NEO4J_USER` + `NEO4J_PASSWORD`, so the server and the backend can never
> drift apart. Change those two variables; setting `NEO4J_AUTH` yourself would
> desynchronise them and cause auth failures.

> **`SECRET_KEY`, `ENVIRONMENT` and `GROQ_API_KEY` are listed commented-out at
> the bottom of `.env.example` because nothing reads them.** They are not
> required, and uncommenting them has no effect. `CORS_ORIGINS` used to be in
> that group — the backend reads it now, so uncommenting it **does** have an
> effect (see the CORS note above and the troubleshooting table).

> **MAXMIND keys are optional** — GeoIP enrichment falls back gracefully to `NULL` if not set. For full GeoIP, get a free MaxMind account and set `MAXMIND_ACCOUNT_ID` + `MAXMIND_LICENSE_KEY` in `.env`.

---

## Step 2 — Critical Data Files

The repo contains pre-built model artifacts and XAI files. Verify they exist:

```powershell
# These must all exist — they are NOT generated at runtime
Test-Path data\models\ft_transformer_20260909.pt        # FT-Transformer anomaly model
Test-Path data\models\graph_transformer_20260909.pt     # Graph Transformer risk model
Test-Path data\models\autoencoder_20260907.pt           # Legacy autoencoder (fallback)
Test-Path data\models\graphsage_20260908.pt             # Legacy GraphSAGE (fallback)
Test-Path data\xai\composite_risk_scores.json           # 15,873 pre-scored wallets
Test-Path data\xai\evidence_trails.json                 # 15,873 evidence dossiers
Test-Path data\xai\shap_attributions.json               # 4,839 SHAP XAI values
Test-Path data\xai\gnn_subgraphs.json                   # 100 GNN subgraph explanations
Test-Path data\xai\attention_matrices.json              # 4,839 attention heatmaps
Test-Path data\ransomwhere_seeds.json                   # 11,186 known-illicit seed wallets
Test-Path data\geoip\GeoLite2-City.mmdb                 # GeoIP city DB
Test-Path data\geoip\GeoLite2-ASN.mmdb                  # GeoIP ASN DB
```

All must return `True`. If `geoip\*.mmdb` is missing, run:

```powershell
cd backend
.\venv\Scripts\Activate.ps1   # or python -m venv venv && pip install -r requirements.txt first
python scripts\download_maxmind.py    # needs MAXMIND_ACCOUNT_ID + KEY in .env
```

---

## METHOD A — Docker (Primary, Recommended)

Single command, all 7 services come up together:

```powershell
docker compose up -d
```

This builds/starts:

| Compose service | Container | Published host port | Purpose |
| :--- | :--- | :--- | :--- |
| `postgres` | `sih26146-postgres` | 5433 → 5432 | Transaction + alert DB |
| `neo4j` | `sih26146-neo4j` | 7474 (UI), 7687 (Bolt) | Graph topology DB |
| `redis` | `sih26146-redis` | 6380 → 6379 | Celery broker + cache |
| `migrate` | `sih26146-migrate` | — | One-shot `alembic upgrade head` |
| `fastapi` | `sih26146-fastapi` | 8000 → 8000 | REST API (FastAPI) |
| `celery-worker` | `sih26146-celery` | — | Background ingest worker |
| `next-frontend` | `sih26146-frontend` | 3000 → 3000 | Next.js surveillance dashboard |

### Verify all services healthy:

```powershell
docker compose ps
# postgres / neo4j / redis / fastapi / celery-worker / next-frontend -> "healthy"
# migrate -> "Exited (0)"   <-- THIS IS SUCCESS
```

> **`migrate` showing `Exited (0)` is the expected, healthy outcome — not a
> failure.** It is a one-shot job: it runs `alembic upgrade head` to completion
> and exits. `fastapi` and `celery-worker` are gated behind it with
> `service_completed_successfully`, so they cannot start until the schema is
> ready. **There is no manual migration step to run.**
> `Exited (1)` there is the only bad state — read `docker compose logs migrate`.

```powershell
curl.exe http://localhost:8000/health
# Expected: {"status":"ok"}
# NOTE: this is a liveness probe only — it returns a static payload and does
# NOT report database/neo4j/redis connectivity. For a real dependency check,
# hit an authenticated endpoint, e.g.:
#   curl.exe http://localhost:8000/api/v1/alerts?limit=1 -H "Authorization: Bearer dev-token-ntro-2026"
```

> First boot is slow on purpose: the backend/frontend images build (torch is
> ~700 MB of wheels), Neo4j downloads the ~200 MB Graph Data Science plugin, and
> the API parses ~50 MB of XAI artefacts during startup. The compose healthcheck
> `start_period` values are sized for that — give it a few minutes before
> concluding anything is broken.

### Seed the database (CRITICAL — do this once):

The Docker backend has an empty Postgres/Neo4j on first boot. Populate it via the
API, which dispatches the full Celery pipeline:

```powershell
# 1. Ingest the 100,000-row synthetic dataset via the API
# Note: use curl.exe (not curl) in PowerShell — 'curl' is aliased to Invoke-WebRequest
curl.exe -X POST http://localhost:8000/ingest `
  -H "Authorization: Bearer dev-token-ntro-2026" `
  -F "file=@data/synthetic_transactions.csv"
# Returns: {"task_id": "<uuid>", "status": "PENDING"}
# Poll until SUCCESS before reloading the dashboard (replace YOUR_TASK_ID):
curl.exe http://localhost:8000/ingest/status/YOUR_TASK_ID `
  -H "Authorization: Bearer dev-token-ntro-2026"
```

> **Schema migrations are already done** — the `migrate` service ran
> `alembic upgrade head` before `fastapi` was allowed to start. Do not run
> alembic by hand. If you ever need to re-apply after a code change:
> `docker compose run --rm migrate`

> **⚠️ The old `scripts/build_graph.py` → `detect_coinjoin.py` seed sequence
> does not work under Docker.** `backend/scripts/` is not in the image — the
> Dockerfile copies only `app/`, `alembic/` and `alembic.ini`, so
> `docker exec sih26146-fastapi python scripts/...` fails with
> "can't open file". Those scripts remain valid for the bare-metal route
> (METHOD B) below. Under Docker, step 1 above is the whole seed: ingestion
> writes to Neo4j directly and auto-chains an enrichment pass (Louvain
> clustering, peel + CoinJoin detection, risk scoring, XAI publish) when the
> ingest task completes.
> That auto-chain was validated against `data/test_2000.csv` (2k rows) but
> **not** re-run from scratch on the 100k file. Watch
> `docker compose logs celery-worker` for `publish: wrote N wallets` — if that
> line appears after step 1, the enrichment chain did the work the old steps
> 3-6 used to do.

### Open the dashboard:

```
http://localhost:3000
```

You should see **15,000+ wallets** in the alert table with risk scores, cluster IDs, and graph data populated.

### Tear down:

```powershell
docker compose down           # stops, keeps volumes (data persists)
docker compose down -v        # stops + wipes all volumes (clean slate)
```

---

## METHOD B — Bare-Metal Fallback (if Docker has issues)

Use this if Docker Desktop has WSL2 issues, memory limits, or you need hot-reload dev mode.

### Prerequisites (bare-metal only):
- PostgreSQL 16 running locally on port `5432` with user `sih_user`, password `sih_password`, DB `sih_bitcoin`
- Neo4j 5.x with GDS plugin running on port `7687` / `7474`, auth `neo4j/password123`
- Redis running on port `6379`

> Running the backend on the host against the **Docker** datastores instead?
> Use the published host ports — Postgres `5433`, Redis `6380`, Neo4j
> `7687`/`7474`. The host-side `DATABASE_URL` / `REDIS_URL` / `NEO4J_URI` in
> `.env.example` already point at exactly those, and `docker-compose.yml`
> overrides them back to the service addresses for the containers. See
> [`docs/dev-server.md`](docs/dev-server.md).

### Backend Python setup:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --default-timeout=300 torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu
pip install --default-timeout=300 -r requirements.txt
alembic upgrade head
```

### Open 3 terminals from `backend\` with venv activated:

**Terminal 1 — FastAPI:**
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Celery worker (Windows requires `--pool=solo`):**
```powershell
celery -A app.celery_app worker --loglevel=info --pool=solo
```

**Terminal 3 — Frontend:**
```powershell
cd ..\frontend
npm install
npm run dev
# Dashboard at http://localhost:3000
```

Then run the same seed scripts from the `backend/` dir with venv active:
```powershell
python scripts\build_graph.py
python scripts\cluster_wallets.py
python scripts\compute_composite_risk.py
python scripts\detect_peeling_chains.py
python scripts\detect_coinjoin.py
```

---

## Step 3 — Live Ingest Demo (End-to-End)

Once the dashboard is live with 15k+ wallets, demo the live ingest pipeline:

### ⚠️ Three things that WILL break the recording if you don't know them

**1. After a raw `curl` ingest you must hot-reload the XAI store, or the dashboard shows stale counts.**
The XAI store is loaded into memory at process start. New entities are written
to disk during enrichment but the running API keeps serving the old snapshot.
**Via the UI this is automatic** — `IngestModal` calls the reload endpoint for
you once enrichment reports SUCCESS, so no restart is needed on the UI path.
**Via curl there is no client to do it for you**, so trigger it yourself:
```powershell
# Non-destructive: hot-reload the XAI store in the running API
curl.exe -X POST http://localhost:8000/ingest/enrichment/YOUR_INGEST_TASK_ID/reload `
  -H "Authorization: Bearer dev-token-ntro-2026"
# Returns: {"status":"reloaded","composite_count":<N>}

# Fallback (nukes connections, ~15s downtime) — restart the container instead
docker compose restart fastapi
# Wait ~15s, then reload http://localhost:3000
```
Use the **ingest** task id (from `POST /ingest`), not the enrichment task id.

**2. You can only click the demo dataset ONCE per 24 hours.**
Uploads are deduplicated by SHA-256 in Redis with a 24h TTL. A second click
returns `409 Duplicate upload detected`. If you need to re-record, clear it:
```powershell
docker compose exec -T redis sh -c "redis-cli --scan --pattern 'file_hash:*' | xargs -r redis-cli del"
```

**3. Do NOT show the SHAP waterfall for an ingested wallet — it is empty.**
SHAP attributions for ingested wallets currently come back as 18 zero-valued
contributions (verified: 48 of 48 sampled wallets, every risk tier). The
attention heatmap, the GNN subgraph and the evidence trail on that same screen
are all real and render fine — only the SHAP panel is flat. On camera a flat
waterfall reads as a broken feature.
**Demo SHAP on a pre-loaded seeded wallet instead** (e.g.
`bc1p63703f584305ace011f791e2772a614e1d0fc1a4`), where it is genuine.

### Expected timing
Ingest ~10s → enrichment ~6-7 min (7 stages: Louvain clustering, peel detection,
CoinJoin, wallet attributes, schema contract, Postgres mirror, XAI publish). The
alerts table reflects new entities immediately on the UI path (auto hot-reload);
on the curl path, only after you trigger the reload in (1).

### What "success" looks like
2,000 rows → 8,137 wallets → 3,887 Louvain communities, 126 qualifying peel
chains, 351 CoinJoins. Ingested-wallet verdicts:
**CRITICAL ~116 (1.4%) · HIGH ~607 · MEDIUM ~3,818 · LOW ~3,596**.
Cluster topology for an ingested cluster averages **~5-6 mean degree** across
~150 nodes / ~380-480 links (a pre-loaded baseline cluster is ~1.59).

### Via the UI:
1. Open `http://localhost:3000`
2. Click the **"Ingest Batch"** button in the top-nav
3. Click the built-in **sample dataset** tile (2,000 rows, 1.07 MB)
4. Watch the modal progress bar reach 100%
5. Wait ~6-7 min for the 7 enrichment stages to finish — the modal hot-reloads the XAI store automatically
6. Reload the dashboard — entity count rises and new wallets appear
7. Click an ingested wallet → Entity Drawer opens with:
   - Attention heatmap ✅ (real 18×18)
   - D3 GNN subgraph ✅ (real nodes + edges)
   - Evidence trail, cluster ID, risk verdict ✅
   - Section 65B court-admissible dossier export ✅
   - SHAP waterfall ⚠️ **flat on ingested wallets — do not feature this**

### Via curl (for agents / scripting):
```powershell
# Run from repo root (where data/ folder is)
curl.exe -X POST http://localhost:8000/ingest `
  -H "Authorization: Bearer dev-token-ntro-2026" `
  -F "file=@data/test_2000.csv"
# Returns: {"task_id": "<uuid>", "status": "PENDING"}

# Poll status (replace YOUR_TASK_ID with the uuid from above):
curl.exe http://localhost:8000/ingest/status/YOUR_TASK_ID `
  -H "Authorization: Bearer dev-token-ntro-2026"
# On success the payload includes:
#   total_received: 2000, total_inserted: 2000, total_rejected: 0,
#   graph: { transactions_created: 2000, wallets_created: 8137,
#            cospend_created: 16537, parity: { missing: 0 } },
#   enrichment: { status: "dispatched", task_id: "<uuid>" }

# Optionally track enrichment progress:
curl.exe http://localhost:8000/ingest/enrichment/YOUR_TASK_ID `
  -H "Authorization: Bearer dev-token-ntro-2026"

# THEN: wait ~6-7 min for enrichment, then hot-reload before filming
curl.exe -X POST http://localhost:8000/ingest/enrichment/YOUR_TASK_ID/reload `
  -H "Authorization: Bearer dev-token-ntro-2026"
# Returns: {"status":"reloaded","composite_count":<N>}
```

---

## Baseline Numbers (clean seeded state, no demo ingest)

Say these from the **live UI**, not from memory — the CRITICAL tier moved during
the last round of fixes and the older numbers are wrong:

| Metric | Value |
| :--- | :--- |
| Entities on dashboard | **15,873** |
| Verdict split | **CRITICAL 111 · HIGH 2 · MEDIUM 3,112 · LOW 12,648** |
| Neo4j `:Wallet` nodes | 24,659 |
| Neo4j `:Transaction` nodes | 99,999 |
| Postgres `transactions` rows | 99,990 |

> The verdict split was authored as `103 / 10`. It is now `111 / 2` because the
> CRITICAL threshold moved 0.80 → 0.65 and 8 seeded wallets in the
> `[0.65, 0.80)` band correctly moved up a tier. The dashboard shows 15,873
> while Neo4j holds 24,659 wallets — that gap is expected; the dashboard counts
> *scored* entities, the graph counts all wallet nodes.

## Ports Reference

Host ports published by the Docker stack, and the `*_HOST_PORT` variables that
override them:

| Service | URL | Override var |
| :--- | :--- | :--- |
| **Frontend Dashboard** | http://localhost:3000 | `FRONTEND_PORT` |
| **FastAPI Swagger** | http://localhost:8000/docs | `BACKEND_PORT` |
| **FastAPI Health** | http://localhost:8000/health | `BACKEND_PORT` |
| **Neo4j Browser** | http://localhost:7474 (user: `neo4j` / pass: `password123`) | `NEO4J_HTTP_PORT` |
| **Neo4j Bolt** | `bolt://localhost:7687` | `NEO4J_BOLT_PORT` |
| **PostgreSQL** | `localhost:5433` (container `5432`) | `POSTGRES_HOST_PORT` |
| **Redis** | `localhost:6380` (container `6379`) | `REDIS_HOST_PORT` |

> **API auth:** every endpoint except `/health`, `/docs`, `/redoc` and
> `/openapi.json` requires the header `Authorization: Bearer dev-token-ntro-2026`.
> Without it you get `401`, not `404`. The default lives in `app/config.py`
> (`api_dev_token`).
>
> **To change the token:** set `API_DEV_TOKEN` in `.env` — that is the single
> source of truth. `docker-compose.yml` passes it to the backend *and* derives
> the frontend's `NEXT_PUBLIC_API_TOKEN` build argument from the same variable,
> so the two sides cannot disagree. Do not set `NEXT_PUBLIC_API_TOKEN` yourself.
>
> **A rebuild is mandatory**, because `NEXT_PUBLIC_*` is inlined into the
> browser bundle by `next build`:
> ```powershell
> docker compose build
> docker compose up -d
> ```

---

## Troubleshooting

Deeper Docker-specific diagnostics live in
[`docker/README-docker.md`](docker/README-docker.md).

| Symptom | Fix |
| :--- | :--- |
| Dashboard loads but table is empty | DB not seeded — run the ingest step above |
| `migrate` shows `Exited (1)`; API/worker never start | Migration failed. `docker compose logs migrate`. `Exited (0)` is the success state, not an error |
| `docker compose up` fails on Neo4j memory | Neo4j defaults to ~3 GB (heap max `2g` + pagecache `1g`). Lower `NEO4J_HEAP_INITIAL_SIZE`, `NEO4J_HEAP_MAX_SIZE`, `NEO4J_PAGECACHE_SIZE` in `.env` |
| Neo4j stays unhealthy for minutes on first boot | Downloading the ~200 MB GDS plugin. Needs outbound network once; `start_period` allows ~90s. See `docker/README-docker.md` §3 |
| Browser CORS error / empty panels after changing `FRONTEND_PORT` | The browser's `Origin` is not in the backend allow-list. Set `CORS_ORIGINS` to match the port you actually serve the dashboard on — e.g. `CORS_ORIGINS=http://localhost:3100` for `FRONTEND_PORT=3100` — then `docker compose up -d fastapi` to recreate the API with it in its environment |
| `401` from every API call | Token mismatch — `API_DEV_TOKEN` was changed but the frontend image was not rebuilt (`NEXT_PUBLIC_*` is inlined at `next build`). `docker compose build` then `up -d` |
| Celery worker crashes on Windows (bare-metal) | Always use `--pool=solo` flag |
| `Connection refused` on port 8000 | `fastapi` waits on the `migrate` job, Neo4j's GDS download and ~50 MB of XAI parsing. Give it up to ~90s, then `docker compose logs fastapi` |
| `404` on `/api/v1/entity/{address}/explain` | Address not in the XAI index **and** no transaction rows in Postgres for it. Check `data/xai/` artifacts exist (all 5 `.json` files) |
| Entity count doesn't move after ingesting | The XAI store is in-memory. UI path auto-reloads; on the curl path call `POST /ingest/enrichment/{ingest_task_id}/reload`, or `docker compose restart fastapi`, wait 15s, reload |
| `409 Duplicate upload detected` | 24h SHA-256 dedup. Clear with the redis one-liner in Step 3, warning 2 |
| New wallets ingested but 0 CRITICAL / 0 HIGH | Enrichment hasn't finished (takes 6-7 min) or the XAI store wasn't hot-reloaded. Check `docker compose logs celery-worker` for `publish: wrote` |
| `docker exec sih26146-fastapi python scripts/...` fails | Expected — `backend/scripts/` is not copied into the image. Use the API ingest path for Docker, or run the scripts bare-metal (METHOD B) |
| SHAP waterfall is flat / all zero | **Known limitation for ingested wallets**, not a setup error. Use a pre-loaded seeded address for the SHAP shot |
| Cluster graph shows scattered isolated dots | Cluster rendering picks the 150 highest-degree + highest-severity wallets. Healthy clusters show mean degree ~5-6 |
| Neo4j GDS plugin not found | Use exactly `neo4j:5.26-community`; GDS is downloaded via `NEO4J_PLUGINS='["graph-data-science"]'` and is required by the enrich pipeline |
| `torch` install times out | Use CPU wheel: `pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu` |

---

## Key Files

| File | Purpose |
| :--- | :--- |
| [`docker-compose.yml`](docker-compose.yml) | Full stack orchestration (7 services) |
| [`docker/README-docker.md`](docker/README-docker.md) | Docker troubleshooting appendix — ports, GDS, migrations, rebuilds |
| [`.env.example`](.env.example) | Optional env template (every value has a working default) |
| [`flow.md`](flow.md) | Phase-by-phase build plan (all verified) |
| [`docs/dev-server.md`](docs/dev-server.md) | Detailed bare-metal server guide |
| [`docs/WORK-3.md`](docs/WORK-3.md) | Latest change log + task completion tracker |
| [`backend/app/main.py`](backend/app/main.py) | FastAPI entrypoint |
| [`data/synthetic_transactions.csv`](data/synthetic_transactions.csv) | 100k-row seed dataset |
| [`data/test_2000.csv`](data/test_2000.csv) | 2k-row demo ingest file |
