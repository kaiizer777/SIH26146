# SIH26146 — Knowledge Base, Documentation & RAG Master Execution Blueprint

> **Notice to Orchestrator Agent:**  
> This file contains the complete, battle-tested specification to build the **NTRO Bitcoin AML Knowledge Base & RAG Platform** inside `/rag`.  
> You must follow the strict execution rules below.

---

## 🚨 ORCHESTRATOR AGENT OPERATIONAL DIRECTIVES

You are an **Orchestrator Agent**. You do NOT write implementation code or markdown chapters directly in your own turn. You manage and delegate work exclusively through **Subagents**.

### Mandatory Rules for the Orchestrator:
1. **Subagents ONLY — Zero Manual Work**:  
   All code generation, UI component creation, and chapter authoring must be dispatched to subagents.
2. **1 Subagent per 1 Chapter (Synchronous 1-by-1)**:  
   Execute subagents strictly in sequence. Launch Subagent 1 for Chapter 1 $\to$ verify build/content $\to$ launch Subagent 2 for Chapter 2 $\to$ and so on. Never run concurrent subagents that edit shared directories.
3. **Mandatory Skill Review**:  
   Every single subagent prompt **MUST** explicitly instruct the subagent to view the frontend skill at `c:/Users/bari2/Desktop/SKILLS/frontend/skills.md` before writing any frontend code.
4. **Target Location**:  
   The entire application (both the Documentation portal and the downstream RAG chat/retrieval engine) lives inside the [`/rag`](rag) directory (Next.js 16 + React 19 + Tailwind CSS).
5. **Execution Order**:  
   **Phase 1: Interactive Documentation Platform** (Chapters 1–8) first $\longrightarrow$ **Phase 2: Real-Time JSON Knowledge Retrieval & Teammate Assistant** second.
6. **Color Theme & Design Aesthetic**:  
   **Crisp White Theme (Tactical Light Mode)**:
   - Clean `#ffffff` canvas with subtle `#f8fafc` / `#f1f5f9` surface layers.
   - High-contrast slate borders (`border-slate-200 / border-slate-300`).
   - Deep slate typography (`text-slate-900` headings, `text-slate-700` body) with `JetBrains Mono` for addresses/hashes/code and `Inter` for prose.
   - Tactical semantic badges (Emerald `#10b981`, Sky `#0284c7`, Amber `#f59e0b`, Crimson `#ef4444`) mirroring the NTRO Surveillance dashboard.
   - Zero dark mode default; clean, readable, print-friendly government forensic styling.
7. **Strict Ground Truth**:  
   All facts, equations, architectures, and benchmarks **MUST** be pulled directly from [`WORK-1.md`](WORK-1.md), [`WORK-2.md`](WORK-2.md), and [`WORK-3.md`](WORK-3.md). Zero invented metrics or stubs.

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW (FOR ALL SUBAGENTS)

The project is an **air-gapped, offline AI surveillance system for monitoring Bitcoin transaction traffic and detecting money laundering** developed for the National Technical Research Organisation (NTRO).

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SIH26146 SYSTEM PIPELINE                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │
  1. RAW INGESTION          CSV / JSON / XML (Mempool & Network Telemetry)
                            100,000 txs in 8.38s (>10,000 rows/sec via PostgreSQL COPY)
                                                   │
                                                   ▼
  2. DUAL DATA STORE        PostgreSQL 16 (Relational & GeoIP) + Neo4j 5.26 GDS (Graph Topology)
                            24,673 Wallets · 100,000 Txs · 11,186 Ransomwhere Seeds ($1.018B)
                                                   │
                                                   ▼
  3. HEURISTICS & GRAPH     F1: Louvain Community Detection (9,794 Clusters)
                            F3: Peeling-Chains (97.2% recall) + CoinJoin Detectors (100% recall)
                                                   │
                                                   ▼
  4. DUAL TRANSFORMER ML    ML-1: Tabular FT-Transformer (18 Features, Anomaly MSE, <5ms CPU)
                            ML-2: Relational Graph Transformer (TransformerConv, 3 Edges, F1=0.9209)
                                                   │
                                                   ▼
  5. XAI & LEGAL DOSSIER    SHAP Waterfalls · GNN Attention Masks · Multi-Hop Evidence Trails
                            Section 65B Indian Evidence Act / BSA 2023 Cryptographic Certification
                                                   │
                                                   ▼
  6. COMMAND CENTER         Air-Gapped Next.js 16 UI with D3 Force Topology, Tactical HUD, 3D Lens
```

---

## 📚 THE 9-MODULE BLUEPRINT (8 DOC CHAPTERS + 1 RAG ASSISTANT)

Each chapter corresponds to a dedicated page/module in `/rag/src/app/docs/` with deep, digestible technical explanations, interactive visual cards, code snippets, and FAQ callouts for teammates.

---

### 📖 Chapter 1: The NTRO Mission, Core Stack & System Topology
* **URL Slug**: `/docs/ch1-mission-architecture`
* **Source Records**: [`WORK-1.md §1 & §2`](WORK-1.md), [`WORK-2.md §1.1`](WORK-2.md)
* **What to Cover**:
  1. **NTRO Mandate**: Offline blockchain & network forensic surveillance to de-anonymize illicit Bitcoin actors, uncover mixers, and track ransom flows.
  2. **The 5-Tier Pipeline**: Step-by-step lifecycle from raw transaction packets to forensic conviction.
  3. **Strictly Pinned Tech Stack**:
     - Python 3.11 + FastAPI (REST API & Lifespan management)
     - Celery 5 + Redis 7 (Decoupled async worker queue & idempotency locks)
     - PostgreSQL 16 (Relational ledger with indexed JSONB and arrays)
     - Neo4j 5.26 Community + GDS 2.13.x (Graph Data Science)
     - PyTorch 2.4.1 (CPU wheel) + PyTorch Geometric 2.6.1 (Deep learning runtime)
     - Next.js 16 App Router + Tailwind CSS (Monochrome forensic cockpit, zero external CDN calls)
  4. **Air-Gap Compliance**: Pre-cached local `.woff2` typography, local Lucide icons, and zero runtime internet access.
* **Interactive Element**: Visual clickable SVG pipeline diagram mapping data flow across all 6 Docker services.

---

### 📖 Chapter 2: High-Throughput Ingestion, GeoIP & Anti-Duplicate Armor
* **URL Slug**: `/docs/ch2-ingest-geoip-security`
* **Source Records**: [`WORK-1.md Phase 1–2`](WORK-1.md), [`WORK-3.md Stage 1 (DUP-1, DUP-2)`](WORK-3.md)
* **What to Cover**:
  1. **Multi-Format Streaming**: Normalizing raw CSV, JSON, and XML mempool dumps into unified Pydantic transaction models.
  2. **Bulk `COPY` vs INSERT**: Why standard ORM inserts choked, and how PostgreSQL binary `COPY` achieved **10,000+ rows/sec** (100k transactions ingested in 8.38s).
  3. **Network Layer Correlation**: Offline MaxMind `GeoLite2-City` and `GeoLite2-ASN` resolution (100% enriched `geo_country` and `asn`).
  4. **Intelligence Seeds**: Ingestion of 11,186 Ransomwhere addresses across 136 ransomware families ($1.018B tracked).
  5. **Duplicate Upload Hardening (Stage 1)**:
     - `DUP-1`: Backend Redis SHA-256 file-hash lock preventing re-processing with HTTP 409.
     - `DUP-2`: Frontend amber warning vs red rejection banners in `IngestModal.tsx`.
* **Interactive Element**: Benchmark comparison card showing Bulk `COPY` vs standard `INSERT` throughput and latency.

---

### 📖 Chapter 3: Graph Topology & Entity Clustering (Neo4j GDS)
* **URL Slug**: `/docs/ch3-graph-entity-clustering`
* **Source Records**: [`WORK-1.md Phase 3–4`](WORK-1.md), [`WORK-2.md §4`](WORK-2.md)
* **What to Cover**:
  1. **Neo4j Graph Schema**:
     - Nodes: `:Wallet(address)`, `:Transaction(txid)`, `:IP(ip)`
     - Edges: `:SENDS`, `:RECEIVES`, `:OBSERVED`, and `:CO_SPEND` (Common-Input Ownership Heuristic).
  2. **F1 Entity Clustering (Louvain Algorithm)**:
     - GDS projection of undirected `:Wallet`-[:CO_SPEND]-`:Wallet`.
     - Louvain modularity optimization ($Q=0.4613$, 5 levels) grouping 24,673 wallets into 9,794 distinct entity clusters.
     - Fast synchronization back into PostgreSQL `cluster_id` in 3.43s.
  3. **Graph Router Hardening (WORK-2 §4)**:
     - Enforcing `w1.address < w2.address` to prevent bidirectional cycle explosion.
     - Pruning duplicate `:OBSERVED` links and safe connection teardown.
* **Interactive Element**: Live schema diagram with node badges and Cypher query inspector.

---

### 📖 Chapter 4: Laundering Pattern Detectors (Peeling-Chains & Mixers)
* **URL Slug**: `/docs/ch4-peeling-mixing-heuristics`
* **Source Records**: [`WORK-1.md Phase 6 (F3)`](WORK-1.md)
* **What to Cover**:
  1. **Peeling-Chain Detection Heuristic**:
     - Graph criteria: 1-in-2-out flows, chain length $\ge 5$ hops, change output ratio $\le 5\%$, forward amount $\ge 80\%$.
     - Empirical result: **97.2% recall** on injected laundering chains (451/464 detected).
  2. **CoinJoin / Mixer Detection Heuristic**:
     - Multi-party mixing signatures: $\ge 3$ inputs and outputs, equal output amounts ($\pm 1\%$), minimum threshold $\ge 0.05$ BTC.
     - Empirical result: **100.0% recall** (50/50 detected).
  3. **Academic Alignment**: Aligned with *Kappos et al. (USENIX Security 2022)* baseline standards (RF 89.2%, BlockSci 87.5%).
  4. **PostgreSQL / Neo4j Sync**: Populating `is_mixing=true` and `chain_hops` across both databases.
* **Interactive Element**: Peeling-chain hop simulator showing how 100 BTC peels down to 0.5 BTC across hops.

---

### 📖 Chapter 5: Dual Transformer ML Engine (FT-Transformer & Graph Transformer)
* **URL Slug**: `/docs/ch5-dual-transformer-ml`
* **Source Records**: [`WORK-1.md Phase 5 & 7`](WORK-1.md), [`WORK-3.md Stage 3`](WORK-3.md)
* **What to Cover**:
  1. **The Dual Transformer Architecture**: Why the system was upgraded from baseline Autoencoder + GraphSAGE to SOTA Transformers.
  2. **Model 1: FT-Transformer for Tabular Anomaly**:
     - Linear feature tokenization of 18 tabular features into $\mathbb{R}^{32}$.
     - Prepending `[CLS]` token and 2 Multi-Head Attention layers ($N=4, d=32$).
     - Reconstruction MSE scoring + native $18 \times 18$ attention matrix extraction.
     - Latency: $<5\text{ms}$ on CPU; Model size: $\sim 350\text{ KB}$.
  3. **Model 2: Multi-Head Relational Graph Transformer**:
     - `TransformerConv` over 3 multi-relation edge types: `0: CO_SPEND`, `1: TX_FLOW`, `2: PEELING_FLOW`.
     - Focal loss ($\gamma=2.0, \alpha=6.20$) on Ransomwhere seeds.
     - Empirical Promotion Gate: Achieved test set **$F_1 = 0.9209$** on held-out test split.
  4. **The Canonical Metric Matrix (`BENCHMARK_TRUTH.json`)**:
     - Exact side-by-side comparison of baseline vs transformer metrics.
* **Interactive Element**: Interactive feature attention matrix simulator showing cross-feature correlations.

---

### 📖 Chapter 6: Multi-Factor Risk Scoring, XAI & Section 65B Legal Dossier
* **URL Slug**: `/docs/ch6-risk-engine-xai-legal`
* **Source Records**: [`WORK-1.md Phase 8`](WORK-1.md), [`WORK-3.md Stage 4 (FLEX-4)`](WORK-3.md)
* **What to Cover**:
  1. **Composite Risk Scoring Equation**:
     $$\text{Score} = \text{clip}(0.35 \cdot \text{anomaly} + 0.45 \cdot \text{risk} + 0.15 \cdot \text{rule\_bonus} + 0.05 \cdot \text{mixing}, 0, 1)$$
  2. **Verdict Tiers**: `CRITICAL` ($\ge 0.85$), `HIGH` ($\ge 0.65$), `MEDIUM` ($\ge 0.35$), `LOW` ($< 0.35$).
  3. **Explainability Arsenal**:
     - SHAP Waterfall attributions for tabular feature importance.
     - GNNExplainer subgraphs showing influential neighboring transactions.
     - Deterministic natural language forensic narrative engine.
  4. **Section 65B Court-Admissible Legal Export (`dossierExport.ts`)**:
     - Adherence to Section 65B of Indian Evidence Act / Bharatiya Sakshya Adhiniyam (BSA 2023).
     - Cryptographic SHA-256 checksums, chain-of-custody metadata, air-gap sovereign compliance, and print-ready PDF/JSON.
* **Interactive Element**: Live risk score calculator slider and mock Section 65B forensic certificate viewer.

---

### 📖 Chapter 7: Live Post-Ingest Online Inference (Phase 11)
* **URL Slug**: `/docs/ch7-online-inference-sync`
* **Source Records**: [`WORK-3.md Stage 2 (Phase 11)`](WORK-3.md)
* **What to Cover**:
  1. **The Ingest Memory-Space Problem**: Celery worker runs in an isolated OS process with zero access to FastAPI's in-memory `xai_store` (17,020 indexed wallets).
  2. **The 2-Step Sync Solution**:
     - Step 1: User uploads CSV/JSON/XML $\to$ Celery processes bulk insert $\to$ Frontend polls until `SUCCESS`.
     - Step 2: Frontend fires `POST /ingest/sync/{task_id}` inside FastAPI.
     - Step 3: FastAPI runs `inline_scorer.score_batch()` on newly inserted rows and atomically upserts records to `xai_store` with `threading.RLock`.
  3. **Provisional Dossier Mode**:
     - Newly ingested wallets get instant provisional scoring, heuristic rule flags, and yellow warning badges (preventing 404 errors).
* **Interactive Element**: Step-by-step sequence diagram illustrating Celery vs FastAPI process boundary and sync handshake.

---

### 📖 Chapter 8: Forensic Command Center & Local Operator Guide
* **URL Slug**: `/docs/ch8-command-center-dev-ops`
* **Source Records**: [`WORK-2.md §1.2, §5`](WORK-2.md), [`WORK-3.md Stage 5`](WORK-3.md), [`dev-server.md`](dev-server.md)
* **What to Cover**:
  1. **Next.js Forensic Command Center**:
     - `AlertTable`: 38px dense forensic stream with instant address search and severity pills.
     - `GraphCanvas`: D3 force-directed visualizer with relational attention edge glow and HUD Inspector.
     - `Tactile 3D Cockpit UI`: Spherical 3D LED indicator lenses, recessed digital segment counters, and painted-light filter tiles.
  2. **Security & Privacy Guardrails**:
     - `AddressHashMiddleware`: Hashes wallet addresses to SHA-256 tokens in server logs (0 plaintext leaks).
  3. **Local Developer Runbook (`dev-server.md`)**:
     - Starting PostgreSQL, Neo4j, Redis.
     - Starting Backend: `uvicorn app.main:app --reload --port 8000`.
     - Starting Celery: `celery -A app.celery_app worker --loglevel=info --pool=solo`.
     - Starting Frontend: `npm run dev`.
  4. **Automated Verification**:
     - Running backend test suite (`pytest backend/tests/` — 196/196 passing).
     - Running type checks (`npx tsc --noEmit` — 0 errors).
* **Interactive Element**: Interactive CLI command generator and troubleshooting accordion for common developer errors.

---

## 🤖 ORCHESTRATOR EXECUTION PROTOCOL & SUBAGENT PROMPTS

When the orchestrator agent executes this blueprint, it **MUST** invoke subagents synchronously using the following strict template:

### Subagent Prompt Template (Use for each Chapter 1 to 8):
```markdown
Task: Build Chapter [N]: [Chapter Title] inside `/rag/src/app/docs/[slug]/page.tsx` and register it in the docs navigation.
Prerequisites:
1. STRICT: View `c:/Users/bari2/Desktop/SKILLS/frontend/skills.md` first before writing any frontend code.
2. Read the source section in `WORK-1.md`, `WORK-2.md`, or `WORK-3.md` as specified in `docs.md`.
Design Guidelines:
- Color Theme: Pure White Theme (Canvas: #ffffff, cards: #f8fafc, borders: slate-200, text: slate-900, code: JetBrains Mono).
- High visual excellence: Include interactive visual cards, mathematical callouts, metrics badges, and teammate FAQ accordions.
- Build & Type-safety: Ensure `npm run build` or `npx tsc --noEmit` compiles with 0 errors.
```

---

## 📋 CHAPTER COMPLETION TRACKER

- [x] **Chapter 1**: The NTRO Mission, Tech Stack & System Topology (`/docs/ch1-mission-architecture`)
- [x] **Chapter 2**: Ingestion Engine, GeoIP & Anti-Duplicate Armor (`/docs/ch2-ingest-geoip-security`)
- [x] **Chapter 3**: Graph Topology & Entity Clustering (Neo4j GDS) (`/docs/ch3-graph-entity-clustering`)
- [x] **Chapter 4**: Laundering Pattern Detectors (Peeling & Mixers) (`/docs/ch4-peeling-mixing-heuristics`)
- [x] **Chapter 5**: Dual Transformer ML Engine (`/docs/ch5-dual-transformer-ml`)
- [x] **Chapter 6**: Multi-Factor Risk Scoring, XAI & Section 65B Legal Dossier (`/docs/ch6-risk-engine-xai-legal`)
- [x] **Chapter 7**: Live Post-Ingest Online Inference (Phase 11) (`/docs/ch7-online-inference-sync`)
- [x] **Chapter 8**: Forensic Command Center & Local Operator Guide (`/docs/ch8-command-center-dev-ops`)
- [x] **Chapter 9 (Subagent 9 — Final)**: Real-Time JSON-Based RAG Assistant (`/assistant` & floating modal)

---

## ⚡ SUBAGENT 9 (FINAL): REAL-TIME JSON-BASED RAG ASSISTANT

> **Goal for Subagent 9**:  
> Build an ultra-fast, air-gapped, **JSON-based Retrieval-Augmented Generation (RAG) assistant** inside `/rag` so any of your 5 teammates can type questions and get instant, factual, cited answers to clear their doubts real-time without getting stuck or hallucinating.

### 1. High-Density Knowledge Corpus (`/rag/src/data/project_knowledge.json`)
Subagent 9 must construct a comprehensive, structured JSON database populated directly from `WORK-1.md`, `WORK-2.md`, `WORK-3.md`, `FLOW.md`, and `dev-server.md`.

**Schema per Knowledge Entry**:
```json
{
  "id": "KB-ML-002",
  "category": "Machine Learning & Transformers",
  "topic": "Relational Graph Transformer vs GraphSAGE",
  "tags": ["ml", "graph-transformer", "graphsage", "focal-loss", "benchmark", "edge-types"],
  "question": "Why did we upgrade from GraphSAGE to the Relational Graph Transformer?",
  "tldr": "GraphSAGE only aggregated static neighbors on CO_SPEND edges. The Relational Graph Transformer uses Multi-Head TransformerConv over 3 distinct edge types (CO_SPEND, TX_FLOW, PEELING_FLOW) and achieved test F1=0.9209 with <10ms CPU latency.",
  "detailed_answer": "In Stage 3 (WORK-3.md), we upgraded to a Multi-Head Relational Graph Transformer using PyG's TransformerConv. It models 3 distinct relation types embedded via nn.Embedding(3, edge_dim): (0) CO_SPEND, (1) TX_FLOW (2-hop SENDS->RECEIVES), and (2) PEELING_FLOW (2-hop flows flagged with is_mixing=true). Trained with Focal Loss (gamma=2.0, alpha=6.20) on 11,186 Ransomwhere seed addresses, it hit a promoted test set F1 of 0.9209, maintaining 4.8ms CPU inference.",
  "source_files": [
    "WORK-3.md §STAGE 3",
    "backend/app/ml/graph_transformer.py",
    "backend/scripts/train_graph_transformer.py"
  ],
  "doc_chapter_link": "/docs/ch5-dual-transformer-ml",
  "verification_command": "pytest backend/tests/test_graph_transformer.py"
}
```

The JSON corpus must span all core domains:
- **Architecture & Ingestion**: Bulk `COPY`, GeoLite2 City/ASN, Pydantic normalization, Redis SHA-256 duplicate file locks (DUP-1/DUP-2).
- **Graph & Clustering**: `:CO_SPEND`, `:SENDS`, `:RECEIVES`, `:OBSERVED`, Neo4j GDS Louvain modularity $Q=0.4613$.
- **Laundering Heuristics**: Peeling-chain criteria ($\ge 5$ hops, 97.2% recall) & CoinJoin multi-party criteria (100% recall).
- **Dual Transformer Models**: FT-Transformer (18 features, reconstruction MSE, attention matrix) & Relational Graph Transformer ($F_1 = 0.9209$).
- **Explainability & Law**: SHAP Waterfalls, GNNExplainer subgraphs, Composite Risk Formula, Section 65B Indian Evidence Act / BSA 2023 legal compliance.
- **Live Post-Ingest Sync (Phase 11)**: Celery process boundary, `POST /ingest/sync/{task_id}`, atomic `xai_store` upserts with `threading.RLock`, provisional dossiers.
- **Local Dev & Ops**: Ports (8000, 3000, 5432, 7687, 6379), `dev-server.md` commands, `AddressHashMiddleware`, pytest runbook.

---

### 2. Fast Air-Gapped Retrieval Engine (`/rag/src/lib/ragEngine.ts`)
Subagent 9 must implement a lightweight, zero-dependency in-memory search and semantic ranking engine:
- **Tokenization & Inverted Indexing**: Normalizes queries (lowercasing, punctuation stripping, stop-word pruning, Bitcoin term stemming).
- **Multi-Tier Relevance Scoring**:
  $$\text{Score} = 3.0 \cdot \text{Match}_{\text{question}} + 2.5 \cdot \text{Match}_{\text{tags}} + 2.0 \cdot \text{Match}_{\text{tldr}} + 1.0 \cdot \text{Match}_{\text{body}}$$
- **Dynamic Fuzzy & Keyword Booster**: Exact matches for keywords like `409`, `COPY`, `Peeling`, `Louvain`, `TransformerConv`, `Section 65B`, `dev-server` receive elevated weights.
- **Zero Latency**: Executes queries in $<2\text{ms}$ entirely client-side or via lightweight Next.js server actions with zero external network or LLM API calls (100% air-gapped).

---

### 3. Interactive Teammate Assistant UI (`/rag/src/app/assistant/page.tsx`)
Subagent 9 will create the full-page assistant and a floating pop-out trigger available across all doc chapters.

**UI Specifications (Strict White Theme)**:
- **Canvas & Card**: `#ffffff` background with crisp `border-slate-200` cards, matching the NTRO Surveillance dashboard.
- **Search & Doubt Input**: Prominent, autofocus search bar with `Ctrl+K` keyboard shortcut and real-time live filtering.
- **One-Click Teammate Doubt Solvers** (Quick Pill Prompts):
  - ⚡ *"Why did re-uploading the same CSV return HTTP 409?"*
  - ⚡ *"How does peeling chain traversal work in Cypher?"*
  - ⚡ *"How does the FT-Transformer compute anomaly scores on 18 features?"*
  - ⚡ *"What is the difference between GraphSAGE and Relational Graph Transformer?"*
  - ⚡ *"Why does Celery not write directly to xai_store in Phase 11?"*
  - ⚡ *"What is Section 65B Indian Evidence Act certification in our export?"*
  - ⚡ *"How do I run the backend and celery locally without Docker?"*
- **Response Card**:
  - **Verdict Header**: Category badge + Topic title + Confidence match indicator.
  - **Quick Answer (TL;DR)**: Bold, highlighted 2-sentence explanation for rapid comprehension.
  - **Deep Forensic Explanation**: Formatted with Markdown, mathematical equations, and file paths.
  - **Cross-Reference Buttons**: Clickable direct link to the corresponding chapter (e.g. `📖 Jump to Chapter 5`) + Source code citations.

---

### 4. Subagent 9 Execution Instructions (For Orchestrator)
When launching Subagent 9, pass the following exact prompt:
```markdown
Task: Build the JSON-Based Real-Time RAG Assistant inside `/rag`.
Files to Create/Update:
1. `/rag/src/data/project_knowledge.json` — Comprehensive knowledge corpus derived strictly from WORK-1, WORK-2, WORK-3, and dev-server.md.
2. `/rag/src/lib/ragEngine.ts` — In-memory multi-tier scoring and retrieval engine.
3. `/rag/src/app/assistant/page.tsx` — Full-page interactive doubt solver UI in pure white theme.
4. `/rag/src/components/FloatingAssistant.tsx` — Global floating RAG chat button embedded across all docs pages.
Prerequisites:
- STRICT: View `c:/Users/bari2/Desktop/SKILLS/frontend/skills.md` first before writing any frontend code.
- Ground every answer in WORK-1.md, WORK-2.md, and WORK-3.md.
Design Guidelines:
- Pure White Theme: Canvas #ffffff, cards #f8fafc, borders slate-200, typography slate-900, JetBrains Mono for code.
- Ensure `npx tsc --noEmit` and `npm run build` compile cleanly with 0 errors.
```
