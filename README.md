# SIH26146 — AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic

Offline/air-gappable intelligence and anti-money laundering (AML) monitoring platform engineered for the **National Technical Research Organisation (NTRO)** (Smart India Hackathon 2026).

The system correlates network-layer telemetry (IPv4/IPv6, Autonomous System Numbers, BGP prefixes, geolocation) with blockchain-layer graph topologies (transactions, input/output address mappings, script semantics) to uncover illicit financial networks, peeling chains, CoinJoin mixers, ransomware cashout clusters, and high-risk entities with complete explainability.

---

## 1. System Architecture

```
[ Ingest Pipeline ]
Bulk CSV/JSON/XML ──> FastAPI (/ingest) ──> Celery Queue (Redis)
                            │
                            ├──> GeoIP & ASN Enrichment (MaxMind GeoLite2)
                            └──> Keyset Bulk Copy ──> PostgreSQL (Relational & Analytical Store)
                                                           │
                                                           ▼
                                              Neo4j 5.26 + GDS Plugin
                                        (Heterogeneous Transaction Graph)
                                                           │
        ┌──────────────────────────────────────────────────┴───────────────────────────────────┐
        ▼                                                  ▼                                   ▼
 [ F1: Entity Clustering ]                      [ F2: Anomaly Detection ]            [ F3: Laundering Detection ]
 Louvain Community Detection                     PyTorch Autoencoder (18-feat)         Cypher Graph Patterns
 Common-Input-Ownership (CIOH)                  Reconstruction Loss MSE               Peeling Chains (5-40 hops)
 Top-20 Cluster Partitioning                    95th Percentile Dynamic Alert         CoinJoin / Equal Outputs
        │                                                  │                                   │
        └──────────────────────────┬───────────────────────┴───────────────────────────────────┘
                                   ▼
                       [ F4: GNN Risk Scoring ]
                  PyG GraphSAGE (SAGEConv, 3-Layer)
                 Seeded from Ransomwhere Threat Intel
                                   │
                                   ▼
                      [ XAI Explainability Layer ]
          SHAP DeepExplainer (F2) + PyG GNNExplainer (F4)
          Structured Forensic Evidence Trail JSON (XAI-C)
                                   │
                                   ▼
                  [ Operator Dashboard (Next.js) ]
             Alert Feed · D3 Subgraph · SHAP Waterfall
```

---

## 2. Hardware Environment & Compute Strategy

### 2.1 Hardware Specification
- **Environment:** Local Development Workstation (CPU-only, no discrete CUDA GPU).
- **Target OS:** Windows 10/11 x86_64 & Linux container runtime.
- **Python Runtime:** CPython 3.11.15.
- **Containerization:** Docker Engine 29.x + Docker Compose v5.x.

### 2.2 Decision on Compute Targets (Phases 5 & 7)
- **Phase 5 (Autoencoder Anomaly Detection):**
  - Runs **locally on CPU**.
  - The model is a lightweight 7-layer MLP (18 → 64 → 32 → 16 → 32 → 64 → 18).
  - On a ~100k transaction dataset with PyTorch vectorization and optimized mini-batch sizes (e.g., 256–512), CPU convergence is rapid (~2–5 minutes).
- **Phase 7 (GraphSAGE GNN Risk Scoring):**
  - Baseline training and inference will execute **locally on CPU** using PyTorch Geometric neighbor sampling (`NeighborLoader`) to maintain zero cloud dependency for offline air-gapped capability.
  - An exportable Jupyter/Colab notebook artifact (`notebooks/train_graphsage_cloud.ipynb`) is maintained in the repository to allow training offload to a free-tier cloud GPU (e.g. Google Colab / Kaggle T4) if larger graph scales or parameter sweeps are required during evaluation.

---

## 3. Verified Dependency Compatibility Matrix

As verified in Phase 0 audit:
| Component Pairing | Pinned Version | Status / Notes |
|---|---|---|
| **PyTorch (CPU)** | `torch==2.4.1+cpu` | Verified against Python 3.11 Windows AMD64 |
| **PyTorch Geometric** | `torch-geometric==2.6.1` | Verified compatible with PyTorch 2.4.x (replaces incompatible 2.8.0.post1) |
| **Neo4j Engine** | `neo4j:5.26-community` | Compatible LTS release |
| **Neo4j GDS** | `gds:2.13.x` | Managed via official `NEO4J_PLUGINS='["graph-data-science"]'` |
| **PostgreSQL** | `postgres:16-alpine` | High-performance transactional DB with composite indexes |
| **Redis** | `redis:7-alpine` | In-memory message broker for Celery async tasks |
| **Next.js** | `next:16.3.4` (React 19) | Modern frontend dashboard |

---

## 4. Quick Start & Verification

### 4.1 Prerequisites
- Python 3.11+
- Docker Engine & Docker Compose
- Node.js LTS (v20+ or v24+)

### 4.2 Verify Docker Topology
Validate the compose topology and all six services without launching containers:
```bash
docker compose config
```

### 4.3 Run Services
Start infrastructure stack:
```bash
docker compose up -d postgres neo4j redis
```

### 4.4 Local Python Environment Setup
```bash
cd backend
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install dependencies (CPU PyTorch + PyG + DB drivers)
pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple
```

### 4.5 Run Tests
```bash
pytest backend/tests -v
```
