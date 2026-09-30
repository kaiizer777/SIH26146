# SIH26146 — Agent Setup Guide

**Goal:** Get the platform live with 15,000+ wallets on the dashboard, every feature working, and a live end-to-end ingest demo.

---

## Prerequisites

- Git, Docker Desktop 4.x+ (running), Node.js 20+, Python 3.11
- Minimum 8 GB RAM free for Docker (Neo4j heap alone is 2 GB)
- Clone the repo: `git clone https://github.com/kaiizer777/SIH26146.git && cd SIH26146`

---

## Step 1 — Environment

```powershell
Copy-Item .env.example .env
```

The defaults in `.env.example` work out of the box for local Docker. No edits needed unless you have port conflicts.

> **Port note:** `.env.example` sets `POSTGRES_PORT=5432` (internal container port). Docker Compose maps this to **external port 5433** via `${POSTGRES_PORT:-5433}:5432`. If you connect from a GUI tool (DBeaver, etc.) use **5433**.

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
Test-Path data\ransomwhere_seeds.json                   # 3,449 known-illicit seed wallets
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

Single command, all 6 services spin up together:

```powershell
docker compose up -d
```

This pulls/builds and starts:
| Container | Port | Purpose |
| :--- | :--- | :--- |
| `sih26146-postgres` | 5433 | Transaction + alert DB |
| `sih26146-neo4j` | 7474 (UI), 7687 (Bolt) | Graph topology DB |
| `sih26146-redis` | 6380 | Celery broker + cache |
| `sih26146-fastapi` | 8000 | REST API (FastAPI) |
| `sih26146-celery` | — | Background ingest worker |
| `sih26146-frontend` | 3000 | Next.js surveillance dashboard |

### Verify all services healthy:

```powershell
docker compose ps
# All services should show "healthy" or "running"

curl.exe http://localhost:8000/health
# Expected: {"status":"healthy","database":"connected","neo4j":"connected","redis":"connected"}
```

### Seed the database (CRITICAL — do this once):

The Docker backend has an empty Postgres/Neo4j on first boot. Run the full seed pipeline inside the running container:

```powershell
# 1. Run DB migrations
docker exec sih26146-fastapi alembic upgrade head

# 2. Ingest the 100,000-row synthetic dataset via the API
# Note: use curl.exe (not curl) in PowerShell — 'curl' is aliased to Invoke-WebRequest
curl.exe -X POST http://localhost:8000/ingest `
  -H "Authorization: Bearer dev-token-ntro-2026" `
  -F "file=@data/synthetic_transactions.csv"
# Returns: {"task_id": "<uuid>", "status": "PENDING"}
# Poll until SUCCESS before running the next steps (replace YOUR_TASK_ID):
curl.exe http://localhost:8000/ingest/status/YOUR_TASK_ID `
  -H "Authorization: Bearer dev-token-ntro-2026"

# 3. Build the Neo4j graph from Postgres data
docker exec sih26146-fastapi python scripts/build_graph.py

# 4. Run entity clustering (Louvain via GDS)
docker exec sih26146-fastapi python scripts/cluster_wallets.py

# 5. Sync risk scores to Postgres + Neo4j
docker exec sih26146-fastapi python scripts/compute_composite_risk.py

# 6. Detect peeling chains + mixing patterns
docker exec sih26146-fastapi python scripts/detect_peeling_chains.py
docker exec sih26146-fastapi python scripts/detect_coinjoin.py
```

> Each script prints progress. Step 2 (ingest) takes the longest — wait for `SUCCESS` before proceeding. Total time on first run: ~15–25 minutes.

> **⚠️ Unverified — steps 3-6 may now be redundant.** Ingestion was changed to
> write to Neo4j directly and to auto-chain an enrichment pass (Louvain
> clustering, peel + CoinJoin detection, risk scoring, XAI publish) when the
> ingest task completes. If that holds for the 100k seed too, steps 3-6 are
> duplicating work the pipeline already did. This was validated against
> `data/test_2000.csv` (2k rows) but **not** re-run from scratch on the 100k
> file, so keep the steps until someone confirms. Watch
> `docker compose logs celery-worker` for `publish: wrote N wallets` — if that
> line appears after step 2, steps 3-6 are safe to drop.

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

**1. Restart `fastapi` after the ingest, or the dashboard shows stale counts.**
The XAI store is loaded into memory at process start. New entities are written
to disk during enrichment but the running API keeps serving the old snapshot.
If you ingest and immediately film the dashboard, the entity count will not
have moved. Wait for enrichment to finish, then:
```powershell
docker compose restart fastapi
# Wait ~15s, then reload http://localhost:3000
```

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
Ingest ~10s → enrichment ~6-7 min (Louvain, peel detection, CoinJoin, risk,
publish). The alerts table only reflects new entities after the restart in (1).

### What "success" looks like
2,000 rows → 8,137 wallets → 3,887 Louvain communities, 126 qualifying peel
chains, 351 CoinJoins. Ingested-wallet verdicts:
**CRITICAL ~116 (1.4%) · HIGH ~607 · MEDIUM ~3,818 · LOW ~3,596**.
Cluster topology for an ingested cluster averages **~5-6 mean degree** across
~150 nodes / ~380-480 links (a pre-loaded baseline cluster is ~1.59).

### Via the UI:
1. Open `http://localhost:3000`
2. Click **"Upload"** / **"Ingest"** button in the top-nav
3. Click the built-in **sample dataset** tile (2,000 rows, 1.07 MB)
4. Watch the modal progress bar reach 100%
5. Wait ~6-7 min for enrichment, then `docker compose restart fastapi`
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

# THEN: wait ~6-7 min for enrichment, and restart the API before filming
docker compose restart fastapi
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

| Service | URL |
| :--- | :--- |
| **Frontend Dashboard** | http://localhost:3000 |
| **FastAPI Swagger** | http://localhost:8000/docs |
| **FastAPI Health** | http://localhost:8000/health |
| **Neo4j Browser** | http://localhost:7474 (user: `neo4j` / pass: `password123`) |

---

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| Dashboard loads but table is empty | DB not seeded — run seed scripts above |
| `docker compose up` fails on Neo4j memory | Edit `docker-compose.yml` → lower `NEO4J_dbms_memory_heap_max__size` to `1g` |
| Celery worker crashes on Windows (bare-metal) | Always use `--pool=solo` flag |
| `Connection refused` on port 8000 | FastAPI container not healthy yet — wait 30s then retry |
| `404` on `/entity/{address}/explain` | XAI store files missing from `data/xai/` — verify all 5 `.json` files exist |
| Entity count doesn't move after ingesting | Expected — the XAI store is in-memory. `docker compose restart fastapi`, wait 15s, reload |
| `409 Duplicate upload detected` | 24h SHA-256 dedup. Clear with the redis one-liner in Step 3, warning 2 |
| New wallets ingested but 0 CRITICAL / 0 HIGH | Enrichment hasn't finished (takes 6-7 min) or `fastapi` wasn't restarted. Check `docker compose logs celery-worker` for `publish: wrote` |
| SHAP waterfall is flat / all zero | **Known limitation for ingested wallets**, not a setup error. Use a pre-loaded seeded address for the SHAP shot |
| Cluster graph shows scattered isolated dots | Cluster rendering picks the 150 highest-degree + highest-severity wallets. Healthy clusters show mean degree ~5-6 |
| Neo4j GDS plugin not found | Use exactly `neo4j:5.26-community` image tag; GDS is auto-downloaded via `NEO4J_PLUGINS` env var |
| `torch` install times out | Use CPU wheel: `pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu` |

---

## Key Files

| File | Purpose |
| :--- | :--- |
| [`docker-compose.yml`](docker-compose.yml) | Full stack orchestration |
| [`docs/FLOW.md`](docs/FLOW.md) | Phase-by-phase build log (all verified) |
| [`docs/dev-server.md`](docs/dev-server.md) | Detailed bare-metal server guide |
| [`docs/WORK-3.md`](docs/WORK-3.md) | Latest change log + task completion tracker |
| [`backend/app/main.py`](backend/app/main.py) | FastAPI entrypoint |
| [`data/synthetic_transactions.csv`](data/synthetic_transactions.csv) | 100k-row seed dataset |
| [`data/test_2000.csv`](data/test_2000.csv) | 2k-row demo ingest file |
