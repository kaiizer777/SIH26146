# SIH26146 — AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic

Offline, air-gappable intelligence and anti-money laundering (AML) monitoring platform engineered for the **National Technical Research Organisation (NTRO)** (Smart India Hackathon 2026).

The system correlates network-layer telemetry (IPv4/IPv6, Autonomous System Numbers, BGP prefixes, geolocation via local MaxMind databases) with blockchain-layer graph topologies (transactions, input/output address mappings, script semantics) to uncover illicit financial networks, peeling chains, CoinJoin mixers, ransomware cashout clusters, and high-risk entities with complete mathematical and graphical explainability.

---

## 1. System Architecture

```
[ Ingest Pipeline ]
Bulk CSV/JSON/XML ──> FastAPI (/ingest) ──> Celery Queue (Redis)
                            │
                            ├──> Offline GeoIP & ASN Enrichment (MaxMind GeoLite2 .mmdb)
                            └──> Streaming Binary COPY ──> PostgreSQL 16 (Relational & Analytical Store)
                                                                │
                                                                ▼
                                                   Neo4j 5.26 + GDS 2.13 Plugin
                                                (Heterogeneous Transaction Graph)
                                                                │
        ┌───────────────────────────────────────────────────────┴───────────────────────────────────────┐
        ▼                                                       ▼                                       ▼
[ F1: Entity Clustering ]                           [ F2: Anomaly Detection ]              [ F3: Laundering Detection ]
  Louvain Community Detection                          FT-Transformer (18-feat, active)        Deterministic Cypher Rules
  Common-Input-Ownership (CIOH)                       Permutation-Explainer SHAP               Peeling Chains (≥5 hops, ≤5% peel)
  Top-20 Cluster Partitioning                         Autoencoder fallback                     CoinJoin Mixers (equal outputs)
                                                   (USE_LEGACY_ANOMALY_MODEL=true)
         │                                                       │                                       │
         └───────────────────────────────┬───────────────────────┴───────────────────────────────────────┘
                                         ▼
                            [ F4: GNN Risk Scoring ]
                   Relational Graph Transformer (active) · PyG TransformerConv
                   GraphSAGE fallback (USE_LEGACY_RISK_MODEL=true)
                       Seeded from Ransomwhere Threat Intel
                                         │
                                         ▼
                            [ Dual-Layer Explainability ]
             • XAI-A: shap.PermutationExplainer (18-feature attribution waterfall)
             • XAI-B: PyG GNNExplainer (subgraph masks & relational edge importance)
             • XAI-C: Structured Forensic Evidence Trail JSON (15,873 dossiers)
             • XAI-D: Composite Risk Calibration (CRITICAL, HIGH, MEDIUM, LOW)
                                        │
                                        ▼
                [ Tactical Forensic Command Center (Next.js 16) ]
          Strict Light Theme · Master Alert Feed · D3 Subgraph · SHAP Waterfall
```

---

## 2. Hardware Environment & Compute Verification

### 2.1 Hardware Specification
- **Environment:** Local Workstation (CPU-only, no discrete CUDA GPU required).
- **Target OS:** Windows 10/11 x86_64 & Linux container runtime.
- **Python Runtime:** CPython 3.11.x.
- **Containerization:** Docker Engine 29.x + Docker Compose v2/v5.

### 2.2 Verified Compute Strategy (Zero Cloud Dependencies)
- **Phase 5 (Autoencoder Anomaly Detection):**
  - Executed **100% locally on CPU**.
  - Lightweight 7-layer architecture (18 → 64 → 32 → 16 → 32 → 64 → 18).
  - Wall-clock training time on 100k transactions: **211.7 seconds (~3.5 minutes)** on commodity CPU. Threshold calibrated at 95th percentile validation reconstruction error (`0.0346`).
- **Phase 7 (GraphSAGE GNN Risk Scoring):**
  - Executed **100% locally on CPU** using PyG 2.6.1 with SAGEConv and focal loss ($\gamma=2.0$, $\alpha=6.20$).
  - Wall-clock training time: **12.2 seconds** (147 epochs with early stopping) on CPU.
  - Achieved **F1 = 0.9711**, Precision = 0.9637, Recall = 0.9786 against held-out Ransomwhere seed entities.
  - Inference latency: **25.4 ms** across all 24,673 graph nodes. Zero cloud/GPU offload required.

---

## 3. Verified Dependency Compatibility Matrix

Pinned and verified in Phase 0 audit and active builds:

| Component Pairing | Pinned Version | Status / Notes |
|---|---|---|
| **PyTorch (CPU)** | `torch==2.4.1` | Verified against Python 3.11 Windows AMD64; CPU wheel resolved via the `--index-url` in §6.7 |
| **PyTorch Geometric** | `torch-geometric==2.6.1` | Compatible with PyTorch 2.4.x (replaces broken 2.8.0.post1 reference) |
| **Neo4j Engine** | `neo4j:5.26-community` | Compatible LTS release |
| **Neo4j GDS** | `gds:2.13.x` | Managed via official `NEO4J_PLUGINS='["graph-data-science"]'` |
| **PostgreSQL** | `postgres:16-alpine` | High-performance transactional DB with composite indexes & binary COPY |
| **Redis** | `redis:7-alpine` | In-memory broker for Celery async ingestion tasks |
| **Next.js** | `next:16.3.4` (React 19) | Modern frontend tactical dashboard |

---

## 4. Empirical Performance & Benchmark Results

All figures represent verified measurements on the development machine (documented in [`docs/WORK-1.md`](docs/WORK-1.md), [`docs/WORK-2.md`](docs/WORK-2.md) and [`docs/WORK-3.md`](docs/WORK-3.md)):

| Pipeline Stage | Metric / Benchmark | Measured Value | Operational Status |
|---|---|---|---|
| **Bulk Ingestion** | Throughput (100k transactions) | **8,307 – 11,938 tx/sec** (8.38s – 12.04s total) | Exceeds target by >5x |
| **GeoIP Enrichment** | MaxMind GeoLite2 City/ASN coverage | **100%** (100,000 / 100,000 rows resolved) | Complete offline operation |
| **Graph Population** | Keyset UNWIND MERGE (Neo4j) | 24,673 `:Wallet`, 100,000 `:Transaction`, 39,620 `:CO_SPEND` | All constraints validated |
| **Entity Clustering** | GDS Louvain Community Detection | 9,794 communities, modularity = 0.4613 | Synced to Postgres in 3.43s |
| **Autoencoder (F2 - Baseline)** | Training Time (CPU) / Threshold | **211.7s** / Threshold = 0.0346 (95th pct) | 100k rows scored |
| **FT-Transformer (SOTA Anomaly)** | Test F1 / Precision / Latency | **F1 = 0.6972**, Prec = 0.7379, Latency = **0.0222ms** | Active Production Engine |
| **Peeling Traversal (F3)** | Detection Recall (≥5 hops) | **97.2%** (451 / 464 injected chains caught) | Cypher graph traversal |
| **CoinJoin Detection (F3)** | Detection Recall (equal outputs) | **100.0%** (50 / 50 synthetic candidates caught) | Heuristic rule validated |
| **GraphSAGE GNN (F4 - Baseline)** | Training / Inference Time | **12.2s CPU** / **25.4ms** for 24,673 nodes | F1 = 0.9711 (co-spend) |
| **Graph Transformer (SOTA Risk)** | Test F1 / ROC-AUC / Latency | **F1 = 0.9209**, AUC = 0.9956, Latency = **0.0120ms** | Active Production Engine |
| **Explainability (XAI)** | Sub-5ms Forensic Index | **15,873 evidence trails** + SHAP waterfall data | Court-admissible dossiers |

> Canonical single source of truth for all model metrics is maintained in [`data/models/BENCHMARK_TRUTH.json`](data/models/BENCHMARK_TRUTH.json) and [`BENCHMARK_TRUTH.md`](data/models/BENCHMARK_TRUTH.md).


---

## 5. UI/UX Tactical Command Center

Built strictly according to the **High-Stakes Light-Theme Design System** ([`docs/WORK-2.md`](docs/WORK-2.md)):
- **Monochrome-First Aesthetic:** Clean `#f8fafc` canvas, `#ffffff` panels, `#e2e8f0` structural borders, and high-contrast `#0f172a` typography. Zero dark-mode gaming clichés or blurry neon blobs.
- **Master Alert Grid:** High-density rows (Tailwind `py-2.5` cells), monospace hash truncation with 1-click clipboard copy, and four severity tiers (`CRITICAL ≥ 0.65`, `HIGH ≥ 0.60`, `MEDIUM ≥ 0.40`, `LOW < 0.40`) — the single canonical ladder in `backend/app/services/risk_thresholds.py`.
- **Interactive D3 Force Graph:** Canvas rendering 150 bounded nodes per request (API hard ceiling 250 via `?max_nodes=`), color-coded by composite risk, with visual illumination of GNNExplainer explanatory subgraphs.
- **Forensic Dossier Drawer:** Slide-in inspection panel featuring the **SHAP Waterfall chart** (horizontal diverging bars), deterministic plain-English narrative (no LLM hallucinations), 1-click JSON dossier export and a Section 65B certificate rendered to a printable window for PDF export.
- **Air-Gapped Operation:** All font bundles (`Inter`, `JetBrains Mono`) and icon assets are packaged locally with zero external CDN egress.

---

## 6. Quick Start & Verification

### 6.1 Prerequisites
- **Docker Desktop** 4.x+ (running) with Compose v2 — the primary, judge-facing path.
- ~8 GB free RAM (Neo4j alone defaults to a 3 GB heap + pagecache budget) and ~15 GB free disk.
- Outbound network access **once**, for base images and the Neo4j GDS plugin.
- Bare-metal route only (optional): Python 3.11+, Node.js 20+.

> **Seeding runbook: [`setup.md`](setup.md).**
> **Docker troubleshooting appendix: [`docker/README-docker.md`](docker/README-docker.md).**
> **Bare-metal (no Docker) runbook: [`docs/dev-server.md`](docs/dev-server.md).**

### 6.2 Quick start for judges

```bash
git clone https://github.com/kaiizer777/SIH26146.git
cd SIH26146
docker compose up -d
```
```powershell
git clone https://github.com/kaiizer777/SIH26146.git
Set-Location SIH26146
docker compose up -d
```

**There is no `.env` step.** Every value the stack needs has a working default compiled into `docker-compose.yml`, so a clean clone boots with no configuration at all.

The first `up -d` takes a few minutes: the backend and frontend images build (torch alone is ~700 MB of wheels), then Neo4j downloads the ~200 MB Graph Data Science plugin into its volume.

| Surface | URL |
| :--- | :--- |
| **Tactical dashboard** | http://localhost:3000 |
| **API docs (Swagger UI)** | http://localhost:8000/docs |
| **Liveness probe** | http://localhost:8000/health → `{"status":"ok"}` |
| **Neo4j Browser** | http://localhost:7474 — user `neo4j`, password `password123` |

Confirm every service came up:
```bash
docker compose ps
```

| Service | Expected | Published host port |
| :--- | :--- | :--- |
| `postgres` | `Up (healthy)` | `5433 -> 5432` |
| `neo4j` | `Up (healthy)` | `7474`, `7687` |
| `redis` | `Up (healthy)` | `6380 -> 6379` |
| `migrate` | **`Exited (0)`** | — |
| `fastapi` | `Up (healthy)` | `8000 -> 8000` |
| `celery-worker` | `Up (healthy)` | — |
| `next-frontend` | `Up (healthy)` | `3000 -> 3000` |

> **`migrate` at `Exited (0)` is success, not failure.** It is a one-shot job that runs `alembic upgrade head` and exits; `fastapi` and `celery-worker` are gated behind it via `service_completed_successfully`. **There is no manual migration step.** `Exited (1)` is the only bad state there — read `docker compose logs migrate`.

Prove the API is serving real data rather than just that the port is open (`/health` is a static payload and touches no database):
```bash
curl -H "Authorization: Bearer dev-token-ntro-2026" \
  "http://localhost:8000/api/v1/alerts?limit=1"
```
```powershell
curl.exe -H "Authorization: Bearer dev-token-ntro-2026" `
  "http://localhost:8000/api/v1/alerts?limit=1"
```

> The dashboard renders immediately from the committed XAI artefacts in `data/xai/`, but **PostgreSQL and Neo4j start empty**. Populate them via the seed pipeline in [`setup.md`](setup.md) to exercise ingest, clustering and the graph views.

Tear down:
```bash
docker compose down          # stop, keep volumes (data persists)
docker compose down -v       # stop and destroy all data
```

### 6.3 Published ports

Every published host port is a variable, deliberately kept **separate from the container ports** the services talk to each other on — changing one can never break the internal wiring.

| Variable (set in `.env`) | Default | Maps to container port | Purpose |
| :--- | :--- | :--- | :--- |
| `POSTGRES_HOST_PORT` | `5433` | `5432` | Postgres — for `psql` / DBeaver |
| `REDIS_HOST_PORT` | `6380` | `6379` | Redis |
| `NEO4J_HTTP_PORT` | `7474` | `7474` | Neo4j Browser |
| `NEO4J_BOLT_PORT` | `7687` | `7687` | Neo4j Bolt |
| `BACKEND_PORT` | `8000` | `8000` | FastAPI |
| `FRONTEND_PORT` | `3000` | `3000` | Next.js dashboard |

> Postgres and Redis are deliberately **not** on `5432`/`6379` so a locally installed server cannot collide with the stack. From the host, connect to **5433** and **6380**. Override in `.env` or inline: `FRONTEND_PORT=3100 BACKEND_PORT=8100 docker compose up -d`.
>
> Changing `FRONTEND_PORT` also needs a matching `CORS_ORIGINS` entry, or the browser will refuse the dashboard's API calls — see §6.6.
>
> Note the naming is not uniform: only Postgres and Redis carry the `_HOST_PORT` suffix. `POSTGRES_PORT` still exists in `.env.example` but is **host-side bookkeeping only** — it does not drive the port mapping. `REDIS_PORT` is gone entirely; use `REDIS_URL`.

### 6.4 API authentication

Every endpoint except `/health`, `/docs`, `/redoc` and `/openapi.json` requires `Authorization: Bearer <API_DEV_TOKEN>` — without it you get `401`, not `404`. The default is `dev-token-ntro-2026` (`backend/app/config.py`).

`API_DEV_TOKEN` is the **single source of truth for both sides**: `docker-compose.yml` hands it to the API *and* derives the frontend's `NEXT_PUBLIC_API_TOKEN` build argument from it, so the browser and the API cannot disagree. To change it, set `API_DEV_TOKEN` in `.env` once, then rebuild — `NEXT_PUBLIC_*` is inlined into the client bundle by `next build`, so a restart alone is not enough:
```bash
docker compose build
docker compose up -d
```

> `NEO4J_AUTH` is likewise **derived** — `docker-compose.yml` builds it from `NEO4J_USER` + `NEO4J_PASSWORD`. Set those two; never set `NEO4J_AUTH` directly, or the server and the backend desynchronise and auth fails.

### 6.5 Environment File (optional)

`.env` is **not required** — the stack boots with no `.env` present. Copy the template only when you want to change something:
```bash
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

`.env` is gitignored — never commit real credentials (e.g. `MAXMIND_LICENSE_KEY`). What is worth changing: the `*_HOST_PORT` ports, the Postgres/Neo4j passwords, `API_DEV_TOKEN`, `MAXMIND_*`, and the `USE_LEGACY_ANOMALY_MODEL` / `USE_LEGACY_RISK_MODEL` architecture toggles (these change the risk scores the dashboard shows).

> `SECRET_KEY`, `ENVIRONMENT` and `GROQ_API_KEY` sit **commented out** at the bottom of `.env.example` precisely because no code reads them. Uncommenting them changes nothing. `CORS_ORIGINS` used to be in that group; it is read now — see §6.6.

### 6.6 Known limitations

Documented rather than hidden:

- **First boot needs the network once.** The Neo4j `graph-data-science` plugin (~200 MB) is fetched by `NEO4J_PLUGINS` into the `neo4j_plugins` volume, and GDS is mandatory — `app/tasks/enrich.py` calls `gds.graph.project.cypher`, `gds.ml.louvain.stream` and `gds.graph.drop`. Without it Neo4j either never reports healthy, or the enrich pipeline fails with `There is no procedure with the name gds.*`. Cached in the volume after the first success.
- **Neo4j defaults to ~3 GB of RAM** (`NEO4J_HEAP_MAX_SIZE=2g` + `NEO4J_PAGECACHE_SIZE=1g`, initial heap `512m`). On a low-RAM machine Neo4j will refuse to start — lower `NEO4J_HEAP_INITIAL_SIZE`, `NEO4J_HEAP_MAX_SIZE` and `NEO4J_PAGECACHE_SIZE` in `.env`.
- **No login and no user store.** `API_DEV_TOKEN` is a static offline-demo bearer token whose default is committed. It is not a credential system — do not expose this stack beyond localhost as-is.
- **`backend/scripts/` is not in the Docker image** (the Dockerfile copies only `app/`, `alembic/`, `alembic.ini`). The Docker seed path is the HTTP ingest API, which auto-chains enrichment; the standalone scripts are bare-metal only.
- **`frontend/package-lock.json` must be regenerated on Linux.** The Docker build uses `npm ci`, so the lock has to stay a superset that every platform accepts. npm 11 on Windows drops the bundled optional deps of `cpu: ["wasm32"]` packages (e.g. `@tailwindcss/oxide-wasm32-wasi`), which removes `@emnapi/core` / `@emnapi/runtime` from the lock and breaks the build. The image is a 3-stage `node:22-alpine` build (`deps` → `builder` → `runner`) that installs with `npm ci` and ships a production-only tree (`npm prune --omit=dev`). Rationale in [`docker/README-docker.md`](docker/README-docker.md).

#### Browser origins (CORS)

The backend builds its `CORSMiddleware` allow-list from `CORS_ORIGINS`, a **comma-separated list of origins**. Whitespace around each entry is trimmed and empty entries are dropped. When the variable is unset or empty the backend falls back to `http://localhost:3000` and `http://127.0.0.1:3000` — so a clean clone needs no CORS configuration at all.

Dashboard on a non-default port (`FRONTEND_PORT=3100`), in `.env`:

```.env
CORS_ORIGINS=http://localhost:3100
```

Several origins at once:

```.env
CORS_ORIGINS=http://localhost:3100,http://127.0.0.1:3100,https://ops.internal.example
```

Two things this does **not** do:

- **`FRONTEND_PORT` alone is not enough.** It only republishes the container port; it does not change what the browser puts in the `Origin` header, and the allow-list is a fixed set of strings, not a pattern. If you move the dashboard off port 3000 you must set `CORS_ORIGINS` to match. The variable has to be present in the API container's environment, so recreate that service (`docker compose up -d fastapi`) — editing `.env` alone changes nothing until it does.
- **LAN / remote access is not inferable.** A browser on a second machine sends `Origin: http://<lan-ip>:3000` — the backend cannot guess your LAN address, so that origin is rejected unless you list it explicitly:

  ```.env
  CORS_ORIGINS=http://localhost:3000,http://192.168.1.50:3000
  ```

  `curl` is unaffected by all of this — it is a browser-only restriction. Keep `allow_origins` narrow: it is an explicit list by design, and there is no wildcard mode.

### 6.7 Local Backend Setup (bare-metal only)
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows PowerShell
# source venv/bin/activate     # Linux / macOS

# Install pinned dependencies (torch must resolve from the CPU wheel index first)
pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Apply DB migrations — required here; in Docker the `migrate` service does this
alembic upgrade head

# Run test suite (works from the repo root too: pytest backend/tests)
pytest tests -v
```

### 6.8 Local Frontend Setup
```bash
cd frontend

# Install dependencies (local npm packages only)
npm install

# Start development server
npm run dev
# Dashboard opens at http://localhost:3000
```
