# WORK-2.md — UI/UX Anti-Slop Directive, Design System & Phases 9–10 Execution Plan
**Project:** AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic  
**Agency / Context:** NTRO (National Technical Research Organisation) — High-Stakes Financial & Intelligence Forensics  
**Theme Mandate:** **STRICT LIGHT THEME** (Monochrome-First, Tactical Severity Palette, Precision Data Density)  
**Status:** Phase 0–8 Completed (Archived in `WORK-1.md`). This document governs Phases 9 and 10.

---

# SECTION 1: THE "ANTI-SLOP" MANIFESTO & CODING AGENT GUARDRAILS

### 1.1 What is "Frontend AI Slop" & Why It Is Strictly Banned
AI coding agents (Cursor, Claude, v0) trained on generic web templates routinely gravitate toward the statistical median of their training data. When prompted with vague requests like *"build a modern dashboard"*, they generate **"AI UI Slop"**:
1. **The "Dark SaaS / Neon Gaming" Cliché**: Lazy `#09090b` black canvases plastered with blurry purple-to-cyan radial gradient blobs (`blur-3xl`), neon glows, and unreadable low-contrast text that look like a crypto meme coin landing page rather than a sovereign intelligence tool.
2. **The "Pastel Soup" Light Mode Failure**: In light mode, agents often generate washed-out, borderless cards where `#ffffff` cards float invisibly on `#fbfbfb` canvases, text contrast fails WCAG AA standards (`text-slate-400` on `#ffffff`), inputs blend into tables, and buttons have no tactile boundaries.
3. **The "Bento Box / 3-Card Grid" Syndrome**: Cramming arbitrary metrics into three identical cards with a rounded Lucide icon in a tinted square and a fake `+12.4% from last month` green pill, completely disconnected from investigative workflows.
4. **"Chart Slop"**: Decorative SVG curves or spline area charts with zero Y-axis labels, zero timestamps, no interactive crosshairs, and no real data points.
5. **Low Information Density**: Massive paddings (`py-24`, `p-12`), giant 48px headers, and vast empty spaces that force intelligence analysts to scroll for miles just to see 5 transaction rows.
6. **"Missing State" Disease**: Zero loading skeletons (causing jarring layout shifts / CLS), zero actionable empty states (when a filter returns 0 results, showing a blank void), and zero error recovery.
7. **Address Formatting Slop**: Allowing 64-character hex TXIDs or 34-character Base58/Bech32 Bitcoin addresses to wrap across multiple lines as broken strings instead of formatted, truncated monospace elements with copy affordances.

### 1.2 The Explicit Ban List (Instant Rejection Criteria)
The coding agent MUST NOT generate any of the following:
* ❌ **NO Dark Mode defaults or toggle gimmicks**: This interface is strictly designed for **Light Mode** high-stakes operational environments (command centers, analytical daylight offices, PDF intelligence dossiers).
* ❌ **NO Purple / Violet / Indigo gradients or neon glow blobs**: No `bg-gradient-to-tr from-purple-500 to-indigo-600`, no decorative radial glow backdrops.
* ❌ **NO Floating decorative cards without operational utility**: Every element on screen must either display forensic evidence, filter telemetry, or trigger an investigative action.
* ❌ **NO Low-contrast muted text**: Any text lighter than Slate-500 (`#64748b`) on light surfaces is strictly banned. WCAG AAA contrast (minimum 7:1 for body text, 4.5:1 for large text) is required.
* ❌ **NO Proportional fonts for cryptographic data**: All Bitcoin addresses, TXIDs, amounts, satoshis, IP addresses, ASNs, cluster IDs, and timestamps MUST use `font-mono tabular-nums`.
* ❌ **NO Unclickable elements with hover bounces**: Cards that cannot be inspected must never have `hover:-translate-y-1` or `hover:shadow-lg` animations.
* ❌ **NO Fake / Placeholder telemetry**: No "+14.2% from last month", no "Total Users: 12,450", no stock charts. Every metric must be computed directly from PostgreSQL, Neo4j, or XAI artifacts.
* ❌ **NO External CDN dependencies**: No Google Fonts or unpinned external CDNs that violate offline/air-gapped deployment requirements. All fonts and assets must be local.

---

# SECTION 2: HIGH-STAKES LIGHT-THEME DESIGN SYSTEM

### 2.1 Design Archetype: Tactical Forensic Command Center
The aesthetic standard is modeled after industry benchmarks for high-trust, data-dense, mission-critical operational tools: **Linear Light, Stripe Radar, Chainalysis Reactor, Elliptic Investigator, and Bloomberg Terminal**. It is clean, surgical, authoritative, and monochrome-first.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP NAV (48px): NTRO Emblem · System Title · Live Ingest Status · Air-Gap Badge · [Upload Batch]│
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ FILTERS & TELEMETRY      │ MASTER ALERTS & GRAPH VIEW  │ FORENSIC DOSSIER INSPECTOR    │
│ (260px Fixed Sidebar)    │ (Fluid Center Canvas)       │ (440px Sliding / Fixed Panel) │
│                          │                             │                               │
│ • Risk Tier Multi-select │ • View Toggle: Table / D3   │ • Wallet Identity & Copy Hash │
│ • Anomaly Threshold Slid.│ • 38px Dense Data Grid      │ • Composite Risk Gauge (XAI-D)│
│ • Heuristic Toggles      │ • Monospace Hash Truncation │ • SHAP Waterfall Chart (XAI-A)│
│ • Active Cluster Filter  │ • Risk Severity Badges      │ • GNN Subgraph Context (XAI-B)│
│ • Live Batch Counter     │ • Live Ingest Push (SSE)    │ • Evidence Trail List (XAI-C) │
│                          │                             │ • Plain-English Forensic Text │
│                          │                             │ • [Export Dossier PDF/JSON]   │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

### 2.2 Light-Theme Color Tokens (Tailored for Forensic Intelligence)

| Token Name | Hex Code | Tailwind Equivalent | Purpose & Usage |
|---|---|---|---|
| **Canvas Background** | `#f8fafc` | `bg-slate-50` | Primary app background (soft, reduces eye strain vs #fff) |
| **Card / Panel Surface** | `#ffffff` | `bg-white` | Elevated surfaces, data tables, inspection drawer |
| **Header / Inset Well** | `#f1f5f9` | `bg-slate-100` | Table headers, code blocks, filter group containers |
| **Hairline Structural Border** | `#e2e8f0` | `border-slate-200` | Clean 1px grid lines between cells, panels, and dividers |
| **Active / Hover Border** | `#cbd5e1` | `border-slate-300` | Border on table row hover, card focus, or active input |
| **Primary Text (High Contrast)**| `#0f172a` | `text-slate-900` | Critical numbers, addresses, table cell values, headings |
| **Secondary Text (Medium Contrast)**| `#334155` | `text-slate-700` | Table headers, form labels, property names |
| **Muted Metadata** | `#64748b` | `text-slate-500` | Timestamps, secondary IDs, units (BTC / sat/vB) |
| **Focus Ring** | `#0284c7` | `ring-sky-600` | 2px focus ring with 2px offset for keyboard accessibility |

### 2.3 Semantic Severity Palette (Light Backgrounds)
Severity colors must be vivid enough to communicate urgency instantly without bleeding into pastel illegibility:

* **CRITICAL (Risk ≥ 0.80)**:
  * Text: `#b91c1c` (`text-red-700`)
  * Background: `#fef2f2` (`bg-red-50`)
  * Border: `#fecaca` (`border-red-200`)
  * Indicator Dot / Badge: `#dc2626` (`bg-red-600`)
* **HIGH (0.60 ≤ Risk < 0.80)**:
  * Text: `#c2410c` (`text-orange-700`)
  * Background: `#fff7ed` (`bg-orange-50`)
  * Border: `#fed7aa` (`border-orange-200`)
  * Indicator Dot / Badge: `#ea580c` (`bg-orange-600`)
* **MEDIUM (0.40 ≤ Risk < 0.60)**:
  * Text: `#a16207` (`text-yellow-800`)
  * Background: `#fefce8` (`bg-yellow-50`)
  * Border: `#fef08a` (`border-yellow-200`)
  * Indicator Dot / Badge: `#ca8a04` (`bg-yellow-600`)
* **LOW / BENIGN (Risk < 0.40)**:
  * Text: `#15803d` (`text-emerald-700`)
  * Background: `#f0fdf4` (`bg-emerald-50`)
  * Border: `#bbf7d0` (`border-emerald-200`)
  * Indicator Dot / Badge: `#16a34a` (`bg-emerald-600`)
* **TACTICAL ACCENT / ACTIVE SELECTION**:
  * Text: `#0369a1` (`text-sky-700`)
  * Background: `#f0f9ff` (`bg-sky-50`)
  * Border: `#bae6fd` (`border-sky-200`)
  * Accent Fill: `#0284c7` (`bg-sky-600`)

### 2.4 Typography & Cryptographic Formatting Rules
1. **Primary UI Font**: Inter or System UI stack (`system-ui, -apple-system, sans-serif`) with `-0.015em` letter spacing (`tracking-tight`) for headings.
2. **Cryptographic / Data Font**: JetBrains Mono or Fira Code (`font-mono tabular-nums`) for:
   * Bitcoin wallet addresses (`1A1zP...2Qip`)
   * Transaction IDs (`e3b0c...4429`)
   * Satoshi / BTC values (`12.45000000 BTC`)
   * IP addresses and ASNs (`198.51.100.42 [AS13335]`)
   * Reconstructed anomaly scores and SHAP deltas (`+0.0412`)
   * Timestamps (`2026-09-08 07:14:02 UTC`)
3. **Address Truncation & Copy Protocol**:
   * Display as: `1A1zP` + `...` + `2Qip` (first 5 chars + ellipsis + last 4 chars).
   * Hover shows a floating native tooltip with the full 34/62-character hash.
   * Single click copies the full address to clipboard, accompanied by a 1.5-second visual checkmark and a lightweight toast notification via Sonner.

### 2.5 Shadows & Elevation Discipline
* Pure border-based structural containment: `1px solid #e2e8f0` is the default separator.
* Minimal ambient micro-shadows:
  * Cards / Floating Panels: `box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);`
  * Popovers / Drawers: `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);`
  * Muddy black drop shadows (`shadow-2xl`) are strictly forbidden.

---

# SECTION 3: COMPONENT SPECIFICATIONS & INTERACTION ARCHITECTURE

### 3.1 Master Alert Data Grid (High Information Density)
* **Row Height**: Compact 38px height (`py-2 px-3`).
* **Header**: Sticky `top-0`, `bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider`.
* **Row Interactivity**:
  * Hover state: `hover:bg-slate-50/80 cursor-pointer transition-colors`.
  * Selected state: `bg-sky-50/70 border-l-4 border-l-sky-600`.
* **Columns**:
  1. `Risk Verdict`: Severity pill (CRITICAL / HIGH / MEDIUM / LOW) with numeric composite score.
  2. `Entity Address`: Monospace truncated with copy affordance.
  3. `Anomaly Score`: Numeric reconstruction MSE + percentile badge (e.g. `99.4%`).
  4. `Cluster ID`: Clickable badge filtering the view to that cluster.
  5. `Mixing Flag`: Peeling chain / CoinJoin indicator badge (e.g., `7-Hop Peel`, `CoinJoin`).
  6. `Seed Proximity`: Ransomware seed affiliation badge (e.g., `Conti Seed`, `LockBit Seed`, `Clean`).
  7. `Timestamp`: Ingested / observed UTC timestamp in monospace.

### 3.2 D3.js Force-Directed Graph Panel (Light Mode Engineering)
* **Canvas Styling**: `#f8fafc` background with a subtle dot-matrix pattern (`radial-gradient(#e2e8f0 1.5px, transparent 1.5px)` spaced at 20px).
* **Node Taxonomy**:
  * `:Wallet`: Circles (radius 8px–14px based on risk score). Fill colored by severity palette. Crisp 1.5px white stroke.
  * `:Transaction`: Squares or hexagons (radius 10px). Stroke width proportional to anomaly score.
  * `:IP`: Diamonds with 2-letter ISO country code.
  * `Seed Illicit Wallets`: Distinctive double-halo warning ring with a danger badge.
* **Link Taxonomy**:
  * Standard funds flow: Hairline `#cbd5e1` (Slate-300) with directional arrowheads.
  * Edge thickness scales logarithmically with BTC amount.
* **GNNExplainer Subgraph Highlighting**:
  * When an entity is selected in the inspector, non-explanatory nodes and edges fade to 12% opacity.
  * The explanatory subgraph edges glow in `#0284c7` (Sky-600) with `stroke-width: 3px`, and explanatory nodes scale up by 25%.
* **Physics & Bounds**:
  * `alphaDecay(0.05)` ensures simulation settles smoothly within 1.5 seconds without jittering.
  * Bounded within SVG viewport. Zoom and pan enabled with a floating control dock (`[+]`, `[-]`, `[Reset View]`, `[Freeze Physics]`).
  * Safety cap: Maximum 250 nodes rendered simultaneously to guarantee 60 FPS performance.

### 3.3 SHAP Waterfall Chart (Light Mode Visual)
* **Orientation**: Horizontal diverging bar chart anchored to a vertical zero-reference line (`#94a3b8`).
* **Color Coding**:
  * **Positive Risk Drivers (Illicit Push)**: Deep Crimson (`#dc2626`).
  * **Negative Risk Drivers (Benign Pull)**: Forest Green (`#16a34a`).
* **Feature Naming**: Real, formatted human-readable labels:
  * `output_entropy` → **Output Address Entropy**
  * `fee_rate` → **Fee Rate (sat/vByte)**
  * `equal_outputs_flag` → **Equal Outputs Match (CoinJoin)**
  * `unique_asn_count` → **Multi-ASN Routing Count**
* **Tooltips**: High-contrast popover on hover showing exact attribution delta: `+0.0841 towards Anomaly Verdict`.

### 3.4 Forensic Dossier Inspector & Evidence Trail
* **Structure**: Fixed 440px right drawer with smooth slide-in (`transition-transform duration-200`).
* **Header**: Full entity address with copy button, composite risk badge, and Ransomwhere attribution banner (if illicit seed/adjacent).
* **Automated Forensic Narrative**:
  * Plain-English deterministic summary generated from live computed metrics (NO LLM):
  * *Example:* `"Wallet 1A1zP... scored CRITICAL (0.842) based on 7-hop peeling chain detection with 94.2% pass-through, extreme Autoencoder reconstruction error (99.4th percentile), and direct co-spending affiliation with Ransomwhere Conti cluster #412."`
* **Collapsible Evidence Trail Accordions**:
  1. `Cluster Co-Spending Analysis`: Member count, cluster ID, top co-spending peers.
  2. `Autoencoder Reconstruction Breakdown`: Reconstruction MSE, percentile rank, top 3 anomalous features.
  3. `Mixing & Laundering Heuristics`: Peeling chain hops, pass-through ratio, CoinJoin candidate flag.
  4. `GraphSAGE Topology Score`: GNN risk probability, Seed PageRank proximity score.
  5. `Triggered Rules Audit`: List of fired rule badges with timestamps.
* **Export Action**:
  * High-visibility button: `[Download Forensic Dossier (JSON / PDF)]` for submission to NTRO command.

### 3.5 Operational State Hygiene
* **Loading State**: Content-shaped skeleton loaders matching exact table row heights and chart dimensions. Zero layout shifts (CLS = 0).
* **Empty State**: When search or filter returns zero records:
  * A neat slate-100 container with a search-x icon, title `"No matching alerts found"`, description `"No transactions or entities match the active filters (Risk ≥ 0.80)."`, and a primary button `[Reset Filters]`.
* **Error State**: Non-blocking banner with detailed error code, explanation, and `[Retry Request]` button.
* **Keyboard Shortcuts**:
  * `Ctrl + K` or `/` → Focus search bar.
  * `Esc` → Close inspector drawer or modal.
  * `Tab` / `Shift + Tab` → Accessible focus traversal.

---

# SECTION 4: PHASE 9 — API + FRONTEND DASHBOARD EXECUTION PLAN

## Phase 9 — API + Dashboard [Difficulty: High | Complexity: High]
**Goal:** Build and wire the production-grade FastAPI forensic endpoints and the high-density Next.js Light-Theme Dashboard into a fully functional, offline-capable AML surveillance system.

### 9.1 FastAPI Backend Endpoints & Security
- [ ] **Endpoint 1: `GET /alerts` (Paginated, Filterable Alert Feed)**
  - Query params: `limit` (default 50, max 500), `offset` (default 0), `sort` (default `risk_desc`), `min_risk` (float), `min_anomaly` (float), `is_mixing` (bool), `cluster_id` (int), `verdict` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Joins PostgreSQL `transactions` with Phase 8 `composite_risk_scores.json` and `evidence_trails.json`.
  - Returns: `{ total, items: [{ address, txid, cluster_id, anomaly_score, risk_score, composite_score, verdict, is_mixing, is_seed, seed_family, triggered_rules, ts }] }`.
  - Acceptance: Queries return in <50ms with index scans; sort order and limits strictly enforced.
- [ ] **Endpoint 2: `GET /entity/{address}/explain` (Deep-Dive Forensic Dossier)**
  - Path param: `address` (validated Bitcoin address format).
  - Fetches:
    1. XAI-A SHAP attribution waterfall data from `data/xai/shap_attributions.json`.
    2. XAI-B GNNExplainer subgraph (nodes, edges, importance masks) from `data/xai/gnn_subgraphs.json`.
    3. XAI-C Evidence Trail (cluster metrics, peeling hops, triggered rules) from `data/xai/evidence_trails.json`.
    4. XAI-D Composite risk calculation breakdown from `data/xai/composite_risk_scores.json`.
  - Returns 404 with structured JSON `{ detail: "Entity address not found in indexed surveillance set" }` for unknown addresses.
- [ ] **Endpoint 3: `GET /graph/{cluster_id}` (Bounded Subgraph for D3 Canvas)**
  - Path param: `cluster_id` (integer).
  - Query param: `max_nodes` (default 150, hard ceiling 250 to protect browser rendering).
  - Queries Neo4j for `:Wallet`, `:Transaction`, and `:IP` nodes associated with that cluster and their interconnecting `:SENDS`, `:RECEIVES`, and `:CO_SPEND` edges.
  - Returns: `{ cluster_id, nodes: [{ id, label, type, risk_score, anomaly_score, is_seed }], edges: [{ source, target, type, amount, is_explanatory }] }`.
- [ ] **Endpoint 4: `POST /ingest` & `GET /ingest/status/{task_id}` Integration**
  - Verify multipart CSV/JSON/XML upload from the frontend UI connects cleanly to the existing Celery+Redis asynchronous ingest pipeline.
  - Expose SSE endpoint `GET /ingest/events` or 2-second polling endpoint returning task state, rows processed, and live progress percentage.
- [ ] **Security, Privacy & Logging Compliance**
  - Add JWT authentication middleware (with fallback static dev token support for offline demo).
  - Enforce CORS restricted strictly to the Next.js frontend origin (`http://localhost:3000`).
  - Add SHA-256 pseudonymization middleware for application logs: raw wallet addresses must NEVER appear in plaintext in backend stdout/stderr logs (DB retains plaintext for investigative queries). Acceptance: grep log output during test run confirms 0 plaintext addresses.

### 9.2 Next.js Light-Theme Dashboard Implementation
- [ ] **Scaffold Frontend Architecture (`frontend/`)**
  - Next.js 14/15 App Router (`app/layout.tsx`, `app/page.tsx`).
  - Tailwind CSS configured with the exact light-theme tokens (`slate-50`, `slate-100`, `slate-200`, `slate-900`, `sky-600`, severity red/orange/yellow/green).
  - Local font bundling (Inter & JetBrains Mono) with zero external network requests.
  - Install dependencies: `lucide-react`, `d3`, `clsx`, `tailwind-merge`, `sonner`.
- [ ] **Top Navigation & Air-Gap Command Bar**
  - NTRO emblem, system status indicator (green pulsing dot: "SURVEILLANCE ACTIVE — AIR-GAPPED"), database row count counter, and global search trigger (`Ctrl+K`).
  - `[+ Ingest Batch]` button opening modal for drag-and-drop CSV/JSON/XML uploads.
- [ ] **Telemetry & Filter Sidebar**
  - Quick filters: Risk Tier checkboxes (Critical, High, Medium, Low), Mixing Type toggles (Peeling Chain, CoinJoin), Min Anomaly slider (0.0 to 1.0).
  - Real-time counter showing filtered alerts vs total indexed entities.
- [ ] **High-Density Master Alert Table Component**
  - 38px row height, sticky header, clickable rows.
  - Monospace address with 1-click clipboard copy and tooltip.
  - Verdict pills, anomaly rank badges, and Ransomwhere seed warnings.
  - Keyboard arrow navigation (`↑`/`↓`) to preview entities in real-time.
- [ ] **Interactive D3.js Force-Directed Graph Panel**
  - SVG/Canvas force graph on light dot-matrix background.
  - Node color by risk tier; shape by entity type; edge thickness by BTC amount.
  * Zoom/pan/reset toolbar.
  * Hover tooltip showing wallet address and degree.
  * Click node to inspect entity in the side panel.
  * Visual mask illumination when GNNExplainer subgraph is active.
- [ ] **Forensic Dossier Inspector Drawer**
  - 440px slide-in panel displaying entity header, composite risk breakdown meter, and Ransomwhere attribution.
  - **SHAP Waterfall Component**: Render horizontal diverging bars with positive (red) and negative (green) feature attributions and hover deltas.
  - **Deterministic Forensic Summary**: Auto-generated plain-English narrative highlighting why the entity was flagged.
  - **Collapsible Evidence Accordions**: Cluster details, Autoencoder reconstruction error, Peeling hops, Triggered rules list.
  - `[Download Forensic Dossier]` button generating a clean JSON export for external NTRO reporting.
- [ ] **Ingest Modal & Live Progress Tracker**
  - Drag-and-drop file upload with format validation (sniffs CSV, JSON, XML).
  - Live progress bar tracking Celery task completion via polling or SSE.
  - Auto-refresh alerts table upon batch ingestion success without full page reload.

### 9.3 End-to-End Phase 9 Verification Checkpoints
- [x] **API Functional Verification**: All 52 assertions passed (exit code 0). Auth 401/200 ✓, `/alerts` filter/sort/pagination ✓, `/entity/{addr}/explain` full schema ✓, `/graph/{cluster_id}` 200 with node/edge structure ✓, SHA-256 pseudonymization ✓. Verified 2026-09-08 via `backend/scripts/verify_phase9_api.py`.
- [x] **UI Rendering Verification**: 7 React components built (TopNav, FilterSidebar, AlertTable, GraphCanvas, ShapWaterfall, EntityDrawer, IngestModal). Next.js 16 build: compiled in 36.8s, TypeScript clean (0 errors), 4 static pages generated.
- [ ] **Batch Ingest Round-Trip**: Upload a 1,000-row synthetic CSV via the UI modal → watch progress reach 100% → confirm new alerts appear in the table with zero manual page reload.
- [ ] **Air-Gap Verification**: Disable Wi-Fi / disconnect network cable → reload dashboard at `http://localhost:3000` → confirm all fonts, icons, graphs, and API endpoints function with zero network error.

---

# SECTION 5: PHASE 10 — DEMO PREP, WIREFRAMES & SCORING OPTIMIZATION

## Phase 10 — Demo Prep, Wireframes & Scoring Optimization [Difficulty: Low | Complexity: Medium]
**Goal:** Prepare high-impact hackathon artifacts, rehearse the live demo script, and audit the system against the 5 official SIH scoring criteria.

### 10.1 UI Wireframes & Architecture Artifacts
- [ ] **Produce 3-Screen UX Wireframes (Light Mode)**:
  1. *Screen 1: Batch Ingest & Surveillance Command Center* (File dropzone, live queue status, database telemetry).
  2. *Screen 2: High-Density Alert Matrix & Graph Canvas* (Multi-parameter filtering, master data grid, D3 force graph).
  3. *Screen 3: Entity Forensic Dossier & Explainability Deep-Dive* (SHAP waterfall, GNN subgraph mask, evidence trail, plain-English summary).
  - Export clean diagrams / sketches to `docs/wireframes/` labeled with data field bindings.
- [ ] **Threat-Mapping Matrix (1-Page Executive Section)**:
  - Create `docs/THREAT_MAPPING.md` mapping the 4 mandatory criminal behaviors to the exact detection layer:
    1. *Ransomware Extortion*: Ransomwhere seed graph traversal + PageRank teleportation + Louvain co-spend clustering (Phases 1, 4, 7).
    2. *Darknet Market Proceeds & Mixing*: CoinJoin heuristic predicate (≥3 in, ≥3 out, equal outputs) + Autoencoder equal_outputs anomaly detection (Phases 5, 6).
    3. *Layered Money Laundering*: Peeling chain recursive Cypher traversal (1→2 outputs, ≤5% change, ≥80% pass-through, ≥5 hops) (Phase 6).
    4. *Coordinated Mule Networks*: GraphSAGE GNN node classification with focal loss + multi-hop neighborhood embedding (Phase 7).

### 10.2 Technical Documentation & Scoring Alignment
- [ ] **Technical Write-Up (`docs/TECHNICAL_REPORT.md`)**:
  - Direct quote of official problem statement and deliverable compliance matrix.
  - Architectural justification for:
    * PostgreSQL (raw telemetry & relational speed) vs Neo4j (graph traversal & co-spend topology).
    * PyTorch Autoencoder (unsupervised structural anomaly detection) vs GraphSAGE (supervised relational risk scoring).
    * SHAP GradientExplainer + GNNExplainer dual-layer explainability.
- [ ] **Three-Stage Roadmap Narrative (`docs/ROADMAP.md`)**:
  - *Stage 1: Hackathon Prototype* (Single-node Dockerized pipeline, 100k synthetic txns, local CPU execution).
  * *Stage 2: NTRO Agency Pilot* (Kafka stream ingest, GPU-accelerated GNN training, air-gapped secure enclave deployment).
  * *Stage 3: National Inter-Agency Federation* (Cross-institution federated learning across FIU-IND, ED, and CBI without sharing raw customer PII).
- [ ] **Empirical Performance Dossier (`PERFORMANCE_LOG.md` Synthesis)**:
  - Compile real hardware metrics achieved on the development machine:
    * Ingest Throughput: ~10,000 txns/sec (100k rows in ~10s via Postgres `COPY`).
    * Autoencoder Training: 211.7s (3.53 min) on local CPU.
    * GraphSAGE Training: 12.2s (147 epochs with early stopping) on CPU.
    * GraphSAGE Inference: 25.4ms for 24,673 nodes.
    * End-to-End Pipeline Latency: <5 minutes total execution.

### 10.3 Rehearsed Live Demo Script (90-Second Walkthrough)
- [ ] **Live Demo Rehearsal & Timing (`DEMO_SCRIPT.md`)**:
  1. *0:00 - 0:15*: The Hook & Problem Statement (NTRO mandate, Bitcoin opacity, need for explainable offline surveillance).
  2. *0:15 - 0:35*: Ingest & Detection (Upload 10,000-row batch via UI → instant Celery ingestion → alerts table populates with CRITICAL verdict).
  3. *0:35 - 0:65*: The Drill-Down (Click top alert → inspect Ransomwhere Conti affiliation → show 7-hop peeling chain in D3 graph).
  4. *0:65 - 0:80*: The "Why" / Explainability (Highlight SHAP waterfall showing high output entropy & fee anomalies; highlight GNNExplainer subgraph mask).
  5. *0:80 - 0:90*: The Punchline (1-click export of court-ready forensic dossier, 100% offline air-gapped claim).

### 10.4 Scoring Criteria Smoke Test & Final Packaging
- [ ] **5-Criteria Audit against Official Hackathon Rubric**:
  1. *Problem Understanding (20%)*: Verified via threat mapping and NTRO domain specificity.
  2. *Novelty & Innovation (20%)*: Verified via multi-layer correlation (IP/ASN + Blockchain) + Dual XAI (SHAP + GNNExplainer).
  3. *Technical Feasibility (20%)*: Verified by reproducible zero-error execution of all models on commodity CPU hardware.
  4. *Usability & UX (20%)*: Verified by top-tier Light-Theme dashboard adhering to anti-slop guidelines.
  5. *Scale of Impact (20%)*: Verified by 3-stage federation roadmap and high-throughput ingest architecture.
- [ ] **Final Packaging & Air-Gap Validation**:
  - Confirm `docker compose up` brings up all 6 containers cleanly on a pristine clone.
  - Disable network access and execute the complete demo flow end-to-end.

---

# SECTION 6: PHASE 11 — LIVE POST-INGEST ONLINE INFERENCE & GRAPH SYNC PIPELINE

## Phase 11 — Live Post-Ingest Online Inference & Graph Sync [Difficulty: Medium | Complexity: Medium]
**Goal:** Automatically sync newly uploaded transaction batches into the live Neo4j graph and execute inline ML feature extraction & Autoencoder anomaly scoring in Celery, dynamically updating the in-memory alert store and frontend UI in real time.

### 11.1 Online Graph & ML Processing Tasks
- [ ] **Task 1: Neo4j Batch Node & Edge Sync in Celery**
  - In `backend/app/tasks/ingest.py`, after PostgreSQL `COPY` completes, execute unnested batch Cypher queries to merge new `:Wallet`, `:Transaction`, and `:IP` nodes alongside `:SENDS`, `:RECEIVES`, and `:CO_SPEND` edges directly into Neo4j.
- [ ] **Task 2: Inline Anomaly Scoring & Rule Check**
  - Extract 18-dim feature vectors for the new batch and run inference with the saved `autoencoder.pt` model on CPU.
  - Run heuristic rule checks (peeling chain candidates, equal outputs, seed address overlap).
- [ ] **Task 3: Dynamic In-Memory Store (`xai_store`) Mutation**
  - Compute composite risk scores and append newly flagged entity records directly to `xai_store._composite` and `_evidence` in FastAPI without requiring a server reboot.
- [ ] **Task 4: End-to-End Live UI Alert Population**
  - Verify that uploading a new batch via the frontend `IngestModal` completes and immediately causes newly flagged high-risk entities and their graph topologies to appear in `AlertTable` and `GraphCanvas` upon `refresh()`.

---

# SECTION 7: VERSION & FACT-CHECKING REMINDERS

- [x] **PyTorch ↔ PyTorch Geometric pairing**: Verified compatible pair `torch==2.4.1+cpu` and `torch-geometric==2.6.1`. Pinned in `backend/requirements.txt` (Phase 0, Phase 7).
- [x] **Neo4j ↔ Neo4j GDS pairing**: Verified compatible pair `neo4j:5.26-community` with official `NEO4J_PLUGINS='["graph-data-science"]'` (GDS 2.13.x). Pinned in `docker-compose.yml` (Phase 0, Phase 4).
- [x] **CoinJoin detection accuracy statistic**: Correct figures: Random Forest 89.2%, BlockSci heuristics 87.5% (Kappos et al. USENIX Security 2022). Documented in `NOTES.md` and enforced in `verify_phase6.py` (Phase 6).
- [x] **Focal-loss hyperparameters**: Used γ=2.0 (Lin et al. ICCV 2017) + α=6.20 (neg/pos class ratio clamped to 20). No FG-EGCN attribution (Phase 7).
- [x] **Ingest throughput target**: Verified on hardware: 100,000 rows in 8.38s - 12.04s (8,307 - 11,938 rows/sec), surpassing target by >5x (Phase 2).
- [x] **Autoencoder training time**: Verified on hardware: 211.7s (3.53 min) on CPU, surpassing estimate by >4x speed (Phase 5).
- [x] **GraphSAGE training & inference**: Verified on hardware: training 12.2s CPU, inference 25.4ms for 24,673 nodes (Phase 7).
- [x] **XAI-D calibration**: Composite score formula: `clip(0.35·anomaly + 0.45·risk + 0.15·rules + 0.05·mixing, 0, 1)`. Verdict distribution on 17,020 wallets: CRITICAL=103 (0.6%), HIGH=78 (0.5%), MEDIUM=3,377 (19.8%), LOW=13,462 (79.1%). All 103 CRITICAL wallets have non-empty triggered rules. The "87%/72%" placeholder is completely purged (Phase 8).
- [ ] **Full-pipeline end-to-end timing**: Measure and record real wall-clock latency for Phase 10 performance reporting.

