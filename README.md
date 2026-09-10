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
 Louvain Community Detection                          PyTorch Autoencoder (18-feat)           Deterministic Cypher Rules
 Common-Input-Ownership (CIOH)                       Reconstruction Loss MSE                 Peeling Chains (≥5 hops, ≤5% peel)
 Top-20 Cluster Partitioning                         95th Percentile Dynamic Threshold       CoinJoin Mixers (equal outputs)
        │                                                       │                                       │
        └───────────────────────────────┬───────────────────────┴───────────────────────────────────────┘
                                        ▼
                            [ F4: GNN Risk Scoring ]
                       PyG GraphSAGE (SAGEConv, 3-Layer)
                      Seeded from Ransomwhere Threat Intel
                                        │
                                        ▼
                           [ Dual-Layer Explainability ]
            • XAI-A: SHAP GradientExplainer (18-feature attribution waterfall)
            • XAI-B: PyG GNNExplainer (subgraph masks & relational edge importance)
            • XAI-C: Structured Forensic Evidence Trail JSON (17,041 dossiers)
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
| **PyTorch (CPU)** | `torch==2.4.1+cpu` | Verified against Python 3.11 Windows AMD64 |
| **PyTorch Geometric** | `torch-geometric==2.6.1` | Compatible with PyTorch 2.4.x (replaces broken 2.8.0.post1 reference) |
| **Neo4j Engine** | `neo4j:5.26-community` | Compatible LTS release |
| **Neo4j GDS** | `gds:2.13.x` | Managed via official `NEO4J_PLUGINS='["graph-data-science"]'` |
| **PostgreSQL** | `postgres:16-alpine` | High-performance transactional DB with composite indexes & binary COPY |
| **Redis** | `redis:7-alpine` | In-memory broker for Celery async ingestion tasks |
| **Next.js** | `next:16.3.4` (React 19) | Modern frontend tactical dashboard |

---

## 4. Empirical Performance & Benchmark Results

All figures represent verified measurements on the development machine (documented in `WORK-1.md` and `WORK-2.md`):

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
| **Explainability (XAI)** | Sub-5ms Forensic Index | **17,041 evidence trails** + SHAP waterfall data | Court-admissible dossiers |

> Canonical single source of truth for all model metrics is maintained in [`data/models/BENCHMARK_TRUTH.json`](data/models/BENCHMARK_TRUTH.json) and [`BENCHMARK_TRUTH.md`](data/models/BENCHMARK_TRUTH.md).


---

## 5. UI/UX Tactical Command Center

Built strictly according to the **High-Stakes Light-Theme Design System** (`WORK-2.md`):
- **Monochrome-First Aesthetic:** Clean `#f8fafc` canvas, `#ffffff` panels, `#e2e8f0` structural borders, and high-contrast `#0f172a` typography. Zero dark-mode gaming clichés or blurry neon blobs.
- **Master Alert Grid:** High-density 38px rows, monospace hash truncation with 1-click clipboard copy, and four severity tiers (`CRITICAL ≥ 0.80`, `HIGH ≥ 0.60`, `MEDIUM ≥ 0.40`, `LOW < 0.40`).
- **Interactive D3 Force Graph:** Canvas rendering up to 250 bounded nodes, color-coded by composite risk, with visual illumination of GNNExplainer explanatory subgraphs.
- **Forensic Dossier Drawer:** Slide-in inspection panel featuring the **SHAP Waterfall chart** (horizontal diverging bars), deterministic plain-English narrative (no LLM hallucinations), and 1-click JSON/PDF dossier export for NTRO intelligence briefings.
- **Air-Gapped Operation:** All font bundles (`Inter`, `JetBrains Mono`) and icon assets are packaged locally with zero external CDN egress.

---

## 6. Quick Start & Verification

### 6.1 Prerequisites
- Python 3.11+
- Docker Engine & Docker Compose
- Node.js LTS (v20+ or v24+)

### 6.2 Docker Stack Setup
Validate configuration and start infrastructure:
```bash
# Verify compose syntax and service topology
docker compose config

# Start all core services (PostgreSQL, Neo4j + GDS, Redis)
docker compose up -d postgres neo4j redis

# Or start the entire end-to-end stack including FastAPI, Celery, and Next.js:
docker compose up -d
```

### 6.3 Local Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows PowerShell
# source venv/bin/activate     # Linux / macOS

# Install pinned dependencies
pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple

# Run test suite
pytest tests -v
```

### 6.4 Local Frontend Setup
```bash
cd frontend

# Install dependencies (local npm packages only)
npm install

# Start development server
npm run dev
# Dashboard opens at http://localhost:3000
```
