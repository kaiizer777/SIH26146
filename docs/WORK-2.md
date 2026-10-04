# WORK-2.md — Phase 9, 9.5 & Graph Hardening Log

**Project:** AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic (NTRO)  
**Status:** **100% COMPLETE & VERIFIED**  
**Context:** Record of Phase 9 forensic API, Next.js surveillance dashboard, Phase 9.5 integration fixes, and graph topology router hardening. For foundational Phases 0–8, see [`WORK-1.md`](WORK-1.md). For Phase 11 online inference and model upgrades, see [`WORK-3.md`](WORK-3.md).

---

## 1. Phase 9 — Forensic API & Surveillance Dashboard

### 1.1 Backend Forensic API (FastAPI)
- **`GET /api/v1/alerts`**: Paginated alert feed joining PostgreSQL transactions with composite risk scores and evidence trails. Latency `<50ms`.
- **`GET /api/v1/entity/{address}/explain`**: Deep forensic dossier returning 18 SHAP feature attributions, GNNExplainer subgraph masks, multi-hop evidence trails, and composite risk breakdown.
- **`GET /api/v1/graph/{cluster_id}`**: Bounded Neo4j subgraph extraction (`max_nodes=150`, hard ceiling 250) for force-directed visualizer.
- **`POST /ingest` & `GET /ingest/status/{task_id}`**: Asynchronous multipart CSV/JSON/XML upload backed by Celery and Redis.
- **Security & Air-Gap Compliance**:
  - Static Bearer auth with dev-token fallback (`Authorization: Bearer <token>`).
  - CORS strictly bound to `http://localhost:3000`.
  - `AddressHashMiddleware`: Replaces Base58/Bech32 addresses with SHA-256 tokens in application logs (0 plaintext addresses leaked).
  - All 52 automated assertions verified via `verify_phase9_api.py`.

### 1.2 Next.js Forensic Dashboard
- **Architecture**: Next.js 16 App Router, Tailwind CSS (monochrome-first forensic palette: `slate-50`, `slate-100`, `slate-200`, `sky-600`, semantic severity tags), local Inter & JetBrains Mono typography. Zero external runtime CDN calls.
- **Component Breakdown**:
  - `TopNav`: Live air-gap indicator, clock, and manual ingest modal trigger.
  - `FilterSidebar`: Risk tiers (Critical/High/Med/Low), anomaly MSE sliders, mixing toggles, and live bucket counters.
  - `AlertTable`: 38px dense grid, single-click address copy, verdict pills, and responsive pagination.
  - `GraphCanvas`: D3 force-directed layout with GNN attention masking, cluster quotas, and focus inspection.
  - `ShapWaterfall`: Diverging horizontal bars showing top positive/negative feature contributions with hover tooltips.
  - `EntityDrawer`: Slide-over card displaying deterministic English forensic narrative, collapsible evidence accordions, and JSON dossier export.
  - `IngestModal`: Drag-and-drop batch upload supporting CSV, JSON, and XML.
- **Build Verification**: Compiled cleanly in **36.8s** (`npx tsc --noEmit` passed with 0 errors).

---

## 2. Phase 9.5 — Integration & Pipeline Remediation

| Issue Addressed | Root Cause & Resolution | Verification |
| :--- | :--- | :--- |
| **Ingest Round-Trip** | Stale port binding and Docker CMD pointing to `main:app`. Corrected to `app.main:app` with `DATA_ROOT=/app/data`. Unregistered legacy service worker. | 1,000-row batch ingested in **1.9s** (1,000 inserted, 0 rejected). Grid auto-refreshed via `onSuccess()`. |
| **Air-Gap Audit** | Pre-cached Google Fonts as local `.woff2` files in `.next/static/media/`. | Verified 0 runtime CDN requests. D3, Lucide, and Sonner resolve locally. |
| **`seed_wallet_proximity` Backfill** | GDS Personalized PageRank computed in-memory without persisting `w.seed_proximity` to Neo4j nodes. Added `write_pagerank_to_neo4j()`. | 17,474 wallets scored; 12,750 wallets populated with verified non-zero proximity in `evidence_trails.json`. |
| **GNN Subgraph Projection** | Top-risk wallets had sparse `CO_SPEND` edges in synthetic graph. Projected 296,120 2-hop `Wallet→Tx→Wallet` pairs into PyG `Data`. | Ran `explain_graphsage.py --top-k 100`: zero empty subgraphs across all 100 inspected entities. |
| **End-to-End Latency** | Measured wall-clock latency across all pipeline tiers for 1,000-row batch. | Upload & Celery dispatch: **35ms**; Ingest & GeoIP: **563ms**; Alert fetch: **1,386ms**. **Total: 1,983ms (~2.0s)**. |

---

## 3. UI/UX Refinements (2026-09-09)

- **High-Contrast Graph Canvas**: Replaced radial gradient SVG fills with solid forensic palette fills (Emerald `#10b981`, Amber `#f59e0b`, Orange `#f97316`, Crimson `#dc2626`). Added radar dash reticle (`stroke-dasharray="4,3"`) to seed nodes.
- **1-Hop Neighborhood Highlighting**: Interacting with any node illuminates its direct 1-hop connections and dims unconnected graph components to `0.15` / `0.08` opacity.
- **Tactile HUD Inspector**: Consolidated floating tooltip and click cards into a single dark HUD inspector with live degree metrics and forensic drawer link.

---

## 4. Graph Topology Router Hardening (2026-09-10)

- **Seed Attribution Isolation**: Removed continuous PageRank proximity check (`seed_prox > 0.0`) from `is_seed` attribution, eliminating false-positive flags across ~75% of downstream cluster entities.
- **Thread-Safe Explanatory Pairs**: Replaced un-locked global dictionary scan across `_composite` (17,020 entries) with post-Step-1 targeted lookups using thread-safe `xai_store.get_subgraph(addr)` capped at 100 wallet nodes.
- **`CO_SPEND` Directional Ordering**: Added Cypher predicate `w1.address < w2.address` and bi-directional set deduplication to prevent bidirectional reciprocal limit burning in Neo4j.
- **`OBSERVED` Deduplication**: Corrected relationship semantics to `(ip:IP)-[:OBSERVED]-(t:Transaction)` with `DISTINCT` query projections and `seen_links` tracking.
- **Downstream Recipient Protection**: Excluded rules containing `"RECIPIENT"` (e.g. `RANSOMWHERE_SEED_RECIPIENT`) from seed rule matching.
- **Connection Pool Teardown**: Exported `close_driver()` in `graph.py` and connected it to FastAPI `lifespan` application teardown.
- **Verification**: All **160 backend integration tests passed** (including `max_nodes=0` boundary check and `RANSOMWHERE_SEED_RECIPIENT` regression test).

## 5. Graph Edge & Inspector HUD UI Elevation (2026-09-11)

- **Edge Color Restyling**: Replaced legacy harsh electric blue/cyan lines with authoritative solid black (`#0f172a` in light mode, `#e2e8f0` in dark mode). Preserved semantic green inbound funding flows (`#047857`) and dimmed background vectors (`0.08` opacity).
- **Proportional Micro-Darts**: Scaled down chunky arrowhead markers from `6.5px` blocks to streamlined `4.5px` precision darts (`d="M0,-2L4.5,0L0,2Z"`), with perimeter truncation offset (`rTgt + 3.8`) flush against node boundaries.
- **HUD Viewport Containment**: Clamped dynamic vertical placement (`top = Math.max(56, Math.min(ch - effectiveCardH - 16, top))`) with `max-h-[calc(100%-72px)]` and `overflow-y-auto overscroll-contain` to guarantee the forensic dossier card never clips or overflows the viewport on any screen resolution.
- **Verification**: Verified via `npx tsc --noEmit` (0 errors) and live browser inspection.

---

## 6. Documentation Suite UI/UX Elevation & Tactile 3D Inversion (2026-09-14)

- **Total Hover Inversion (Chapters 1–8)**:
  - Eliminated all `hover:*` and `group-hover:*` utility classes across 35 files in `rag/src/app/docs/` (`ch1-mission-architecture` through `ch8-command-center-dev-ops`).
  - Promoted elevated visual states, rich border contrasts, and high-legibility text colors to be the permanent default visible UI across all cards, badges, steppers, simulator controls, and tables.
- **Tactile 3D Depth Model**:
  - Implemented light-from-above directional split borders (`border-t-white`, `border-x-slate-200`, `border-b-slate-300`).
  - Layered subtle top inset sheens (`shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)]`) on all interactive and metric cards.
  - Added physical `:active` depression feedback (`active:translate-y-[0.5px]`) on interactive buttons and controls.
- **Forensic Content Integrity**:
  - Maintained golden blueprint across all chapters (~200–250 lines per chapter page).
  - Preserved Section 65B legal evidentiary dossiers, SHA-256 seals, 18-trait self-attention heatmaps, and offline Louvain clustering benchmarks.
- **Verification**:
  - Recursive regex audit (`(hover:|group-hover:)`): Verified 0 occurrences across `rag/src/app/docs`.
  - Typecheck verification: `npx tsc --noEmit` passed with 0 errors across the entire application.
  - Committed clean on `main` branch (`d5acc58`).

---

## 10. Phase 11.2 Fix — False-Alarm CRITICAL Verdicts in Inline Scorer (2026-09-18)

**File:** `backend/app/services/inline_scorer.py`

### Root causes fixed:
1. **Naive peeling chain heuristic** (was line 353): Standard 1-in/2-out UTXO transfers (e.g. 67/33 split) were flagged `PEELING_CHAIN_CANDIDATE`. Fixed: now requires the larger output to carry ≥ 80% of total output value (genuine peeling asymmetry).
2. **Hard anomaly saturation** (was line 346): `min(mse / thresh, 1.0)` caused MSE=0.04 vs thresh=0.0346 → `norm_anomaly=1.0` instantly. Fixed: smooth ceiling `min(mse / (3 × thresh), 1.0)` — MSE must be 3× threshold to fully saturate.
3. **Provisional re-normalization inflation** (was line 382): `raw_prov / 0.50` re-normalized scores to full [0,1], producing prov_score=1.000 CRITICAL on ordinary benign txs. Fixed: keep raw_prov as actual weighted confidence, cap at 0.65 (HIGH) unless `addr_prox >= 0.5` (direct seed wallet contact).

### Verification:
- `pytest tests/test_inline_scorer.py -v` → **3/3 PASSED** (17.17s)
- Peeling chain still detected on genuine 80/20 split tx (tx0 with `[0.08, 0.40]` amounts)
- Benign 3-output txs (no seed, no peel) confirmed LOW/MEDIUM via regression guard assertion
- `test_provisional_explain.py` skipped in this env: pre-existing `neo4j` module not installed (unrelated to this fix)

---

## 11. Cluster Topology UI/UX Elevation (2026-09-19)

- **Calibrated Blueprint Grid Matrix**: Replaced harsh high-contrast grid lines with subtle defense coordinate grid tokens (`20px` sub-grid at `rgba(148, 163, 184, 0.12)` and `120px` major grid at `rgba(100, 116, 139, 0.22)`), ensuring optical clarity for graph nodes and directional flow darts.
- **Tactile 3D Command Toolbar**:
  - Elevated Cluster stats badge with light-from-above 3D surface, top inset sheen, and animated GNN pulse beacon.
  - Recessed 3D track (`bg-slate-200/60`) for entity filters with distinct elevated active states for *All*, *High Risk*, *Seeds* (pulsing ruby beacon), *Wallets*, *Txs*, and *IPs*.
  - Added embedded `⌘K` keyboard badge on search box and interactive search autocomplete dropdown.
  - Added **Multi-Head Transformer Saliency Toggle** button to dynamically filter high-attention relational edge flows.
  - Recessed layout mode switcher and navigation zoom buttons with physical `:active` depression feedback (`active:translate-y-[0.5px]`).
- **Forensic Inspector HUD & Radar Leader Beam**:
  - Precision cyan/sky radar reticle with animated leader dashes connecting the focused entity to the floating dark glass HUD card (`bg-slate-950/95 backdrop-blur-xl border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]`).
  - Tactile 3D *"Inspect Full Forensic Dossier"* CTA button with top highlight sheen and downward click depression.
- **Operator Status Footer**: Segmented tactical legend pills with live entity counts, cluster metadata tags, and live military SYS UTC clock with a glowing operational LED indicator.
- **Verification**: Verified on Next.js dev server with clean rendering across all viewports.

---

## 12. Post-Ingest Enrichment Telemetry, XAI Hot-Reload & SHAP Honesty (2026-09-29)

### 12.1 What Was Done
- **P1: Live Enrichment Progress UI**:
  - Implemented rich per-stage enrichment progress metadata in `backend/app/tasks/enrich.py` (`elapsed_total`, `stage_elapsed`, `stages_completed`, `stages_total=7`, `counts`).
  - Wired live polling and stage list UI in `frontend/src/components/IngestModal.tsx` and `frontend/src/lib/api.ts`.
- **P2: XAI Store Hot-Reload**:
  - Added thread-safe `force_reload()` to `backend/app/services/xai_store.py`.
  - Added `POST /ingest/enrichment/{task_id}/reload` endpoint in `backend/app/routers/ingest.py` to enable hot-reload without container restart.
- **P3a: SHAP Honesty Flag & Degenerate Waterfall Defense**:
  - Added `shap_available: bool` to `EntityExplainResponse` schema in `backend/app/schemas/entity.py`.
  - Filtered degenerate all-zero SHAP attributions in `backend/app/routers/entity.py`.
  - Added honesty guards & fallbacks in `frontend/src/components/EntityDrawer.tsx` and `frontend/src/components/ShapWaterfall.tsx`.
  - Added 13 deterministic tests in `backend/tests/test_shap_honesty.py`.

### 12.2 How It Was Verified
- **Live Docker Run**: 2,000 tx upload, verified all 7 stages emitted live progress, reload endpoint hot-reloaded 32,804 records.
- **SHAP Honesty Suite**: 13/13 passed in `test_shap_honesty.py`.
- **Full Backend Test Suite**: 253 passed, 8 failed (clean baseline, 0 regressions).
- **Live Forensic API**: `GET /api/v1/entity/{address}/explain` verified returning `shap_available: true/false`.
- **Frontend Build**: `npm run build` compiled cleanly with 0 TypeScript/build errors.

---

## 13. Ingested Wallet SHAP Engine & Write-Through Caching (P3b) (2026-09-29)

### 13.1 What Was Done
- **Tier 1 (Celery Pre-computation)**:
  - Added batch SHAP pre-computation in `backend/app/tasks/enrich.py` for Top 50 highest-anomaly transactions associated with newly ingested wallets (`TOP_SHAP_LIMIT = 50`, `SHAP_MAX_EVALS = 500`).
  - Pre-computes real PermutationExplainer SHAP and cross-feature attention using empirical background distributions from PostgreSQL.
  - Persists durable explanations via `xai_store.upsert_shap` and `xai_store.upsert_attention`.
  - Propagates `"shap_precomputed"` metric into stage report and Celery progress telemetry.
- **Tier 2 (Interactive On-Read Backstop & Write-Through Cache)**:
  - Configured `_SHAP_ON_READ_MAX_EVALS = 300` in `backend/app/routers/entity.py` to bound interactive CPU latency to ~1.2s.
  - Implemented automatic write-through caching in `get_entity_explain`: when on-read provisional SHAP is computed, it is immediately persisted into `xai_store`.
  - Subsequent requests for the same entity or transaction are served directly from memory in < 5ms.
- **Cluster Topology View Toggle Fix**:
  - In `frontend/src/app/page.tsx`, removed auto-populate `useEffect` that forced Cluster #516 to fetch on view change.
  - Updated toggle to preserve table mode with "Topology Mode Active" guidance banner until an alert row is clicked.
  - Broadened `frontend/src/components/GraphCanvas.tsx` empty state for null clusters.

### 13.2 How It Was Verified
- **Live Interactive Explain Benchmark**:
  - Polled `GET /api/v1/entity/3i6MTfegKrt4Ansmej1YdGLLthzBfpncs/explain`.
  - 1st Request (on-read compute): returned `shap_available: True` with 18 valid non-zero attributions.
  - 2nd Request (write-through cache hit): served in **0.176s** (184x speedup).
- **Unit & Integration Tests**:
  - `backend/tests/test_verifier_fixes.py`: 27/27 passed.
  - `backend/tests/test_shap_honesty.py`: 13/13 passed.
  - `backend/tests/test_enrich.py`: 12/12 passed.
- **Backend Test Suite**:
  - Overall suite held at 252 passed, 8 baseline failures (0 regressions introduced).
- **Frontend Build**:
  - Turbopack / Next.js 16.3.4 compiled cleanly with 0 errors.

---

## 14. Documentation Accuracy Audit (2026-10-04)

Doc-only pass. Every claim in `README.md`, `setup.md` and `docs/**` was re-verified
against the source of truth (backend code, `docker-compose.yml`, `.env.example`,
`requirements.txt`, `frontend/src`, and the actual on-disk `data/` artifacts).
No application code, Docker config or env template was touched.

### 14.1 Corrections applied

| Doc claim | Reality (evidence) | Fix |
| :--- | :--- | :--- |
| `GET /health` returns `{"status":"healthy","database":"connected","neo4j":"connected","redis":"connected"}` | Static liveness payload `{"status":"ok"}` — `backend/app/routers/health.py:16` | Corrected in `setup.md`, `docs/dev-server.md`; added the note that `/health` does **not** report dependency health |
| `GET /alerts?limit=5` | Route is `GET /api/v1/alerts` — `backend/app/routers/alerts.py:38` | Corrected in `docs/dev-server.md` |
| `/entity/{address}/explain` | Route is `/api/v1/entity/{address}/explain` — `backend/app/routers/entity.py:38` | Corrected in `setup.md`, `docs/dev-server.md`, `docs/WORK-3.md` |
| Unauthenticated `curl` against the API | `BearerAuthMiddleware` 401s every path except `/health`, `/docs`, `/redoc`, `/openapi.json` — `backend/app/main.py:81-104` | Added the bearer header to every smoke-test command + an auth note in both guides |
| `data/ransomwhere_seeds.json` = "3,449 seed wallets" | 11,186 records — `data/ransomwhere_seeds.json` → `result` list; corroborated by `docs/DATA_SOURCES.md:15` | Corrected in `setup.md` |
| Severity tiers `CRITICAL ≥ 0.80` | Canonical ladder is `0.65 / 0.60 / 0.40 / 0.00` — `backend/app/services/risk_thresholds.py:154-157` | Corrected in `README.md` |
| "SHAP GradientExplainer" | `shap.PermutationExplainer`; the module docstring explicitly states it is **not** Gradient/DeepExplainer — `backend/app/services/shap_service.py:15-19,97` | Corrected in `README.md` |
| F2 = Autoencoder, F4 = GraphSAGE in the architecture diagram | Active defaults are FT-Transformer and Graph Transformer; the legacy models are opt-in — `backend/app/config.py:99,104`, `.env.example:37,42` | Diagram updated in `README.md` |
| D3 canvas "up to 250 bounded nodes" | Dashboard requests 150; 250 is the API hard ceiling — `frontend/src/app/page.tsx:137,164`, `frontend/src/lib/api.ts:264`, `backend/app/routers/graph.py:9,63` | Corrected in `README.md` |
| "High-density 38px rows" | No `38px` literal in the source; cells are Tailwind `py-2.5` — `frontend/src/components/AlertTable.tsx:292+` | Restated as `py-2.5` cells in `README.md` |
| "1-click JSON/PDF dossier export" | JSON download + `printCertificateWindow` (browser print dialog); no direct PDF file — `frontend/src/lib/dossierExport.ts:259,280` | Restated in `README.md` |
| `torch==2.4.1+cpu` | Pin is `torch==2.4.1`; `+cpu` is a local-version label from the CPU wheel index — `backend/requirements.txt:48` | Corrected in `README.md` |
| Top-nav button is "Upload" / "Ingest" | Label is **"Ingest Batch"** — `frontend/src/components/TopNav.tsx:117` | Corrected in `setup.md` |
| "Restart `fastapi` after ingest or counts are stale" | UI path auto-calls `POST /ingest/enrichment/{task_id}/reload`; the curl path has no client to do it — `frontend/src/components/IngestModal.tsx:219`, `backend/app/routers/ingest.py:584-616` | Rewritten in `setup.md`: UI = automatic, curl = explicit reload endpoint (container restart kept as fallback) |
| Enrichment described as "Louvain, peel detection, CoinJoin, risk, publish" | 7 named stages: cluster, peeling, coinjoin, wallet_attributes, schema_contract, postgres_mirror, xai_publish — `backend/app/tasks/enrich.py:2704-2713,2758` | Corrected in `setup.md` |
| `alembic upgrade head` presented as a required manual step | The `fastapi` container command already runs it before Uvicorn — `docker-compose.yml:73` | Annotated as a no-op on a healthy Docker stack in `setup.md`; kept and marked required for bare-metal in `README.md` |
| `WORK-2.md` linked to `WORK-1.md` / `WORK-3.md` at repo root | Neither exists at root; both live in `docs/` | Links corrected |
| `docs/docs.md` used absolute `file:///c:/Users/bari2/.../` links to `WORK-1/2/3.md` and `dev-server.md` | `dev-server.md` is at `docs/dev-server.md`, not repo root; absolute user paths break for every other machine | Converted to relative links (10 occurrences) |
| `docs/WORK-3.md` "CURRENT SYSTEM STATE" listed 17,020 evidence trails / 500 GNN subgraphs / 17,020 composite scores | `evidence_trails.json` = 15,873, `gnn_subgraphs.json` = **100**, `composite_risk_scores.json` = 15,873 | Corrected |

### 14.2 `docs/dev-server.md` binary corruption repaired

The tracked file `docs/dev-server.md` contained raw control bytes (`\x08`,
`\r`, `\x0c`) that had eaten characters inside otherwise-correct content:

- Every Markdown code fence was reduced to a single stray backtick (e.g. `` `ash ``
  instead of ` ```bash `), making all 8 command blocks render as prose.
- `bolt://localhost:7687` → `\x08olt://…`; `neo4j` → `eo4j`;
  `redis://…` and `redis-cli` → `\redis://…`; `fork` → `\x0cork`.

All fences restored and the mangled table row, `redis-server.exe` and `fork`
tokens repaired. Verified: 0 control characters remain, 16 balanced fences.

### 14.3 Verification method

No dev server, Docker stack or test suite was run (docs-only change). Every
correction is backed by a direct read of the referenced source line or by parsing
the on-disk `data/` artifact (JSON/dir counts, file sizes). Cross-checks that
were run and **passed**: all 12 `setup.md` `Test-Path` data files exist; all 5
seed scripts exist; all 6 compose service names, container names and port
mappings match; `.env.example` values match `app/config.py` defaults; the
`setup.md` verdict split (111 / 2 / 3,112 / 12,648) was reproduced exactly by
applying `risk_thresholds.map_verdict` to all 15,873 stored composite scores;
every README benchmark figure matches `data/models/BENCHMARK_TRUTH.json`.

### 14.4 Secrets check

`.env` is gitignored (`.gitignore:5`) and untracked; `backend/.env` is gitignored
(`backend/.gitignore:4`) and untracked. No credential values were added to any
doc, and no doc instructs the reader to commit real secrets. The `dev-token-ntro-2026`
value used throughout the guides is the non-secret local demo default already
committed in `.env.example` and `app/config.py` — acceptable for the offline
demo, but it must be overridden via `API_DEV_TOKEN` for any shared deployment.

---

## 15. Consolidated Engineering Log (2026-10-04)

Full-day record across every agent that touched the repo today. §14 above covers the
documentation-accuracy audit in detail; this section is the single place where all six
workstreams of the day are listed together, plus the flow.md / AGENTS.md repairs and the
duplicate-docs audit that closed the day out.

**Verification provenance used throughout this section:**
- **[run]** — verified by executing it (Docker, build, HTTP request, test suite).
- **[file]** — verified by reading the file / `git show` / parsing an on-disk artefact.
  No container was started for this log entry.

### 15.1 Documentation accuracy audit

~20 factual corrections across `README.md`, `setup.md` and `docs/**`, every one re-derived
from source rather than from the old prose. Full evidence table in **§14.1**; the
correction classes were:

| Area | Correction | Evidence |
| :--- | :--- | :--- |
| Health payload | `/health` returns `{"status":"ok"}` only — it does **not** report DB/Neo4j/Redis health | `backend/app/routers/health.py:16` |
| API prefixes | `/alerts` → `/api/v1/alerts`; `/entity/{address}/explain` → `/api/v1/entity/{address}/explain` | `backend/app/routers/alerts.py:38`, `backend/app/routers/entity.py:38` |
| API auth | `BearerAuthMiddleware` 401s everything except `/health`, `/docs`, `/redoc`, `/openapi.json` — every smoke-test `curl` needed the bearer header | `backend/app/main.py:83,96-113` |
| Seed count | "3,449 seed wallets" → **11,186** records | `data/ransomwhere_seeds.json`; `docs/DATA_SOURCES.md:15` |
| Severity ladder | `CRITICAL ≥ 0.80` → canonical **0.65 / 0.60 / 0.40 / 0.00** | `backend/app/services/risk_thresholds.py:23,25,142-160` |
| XAI engine | "SHAP GradientExplainer" → the live service uses **`shap.PermutationExplainer`** (its docstring states explicitly it is *not* Gradient/DeepExplainer) | `backend/app/services/shap_service.py:15-19,97` |
| Active models | Architecture diagram said F2=Autoencoder / F4=GraphSAGE → active defaults are **FT-Transformer** and **Graph Transformer**; the legacy pair is opt-in | `backend/app/config.py:102,107`; `.env.example` |
| Graph node cap | "up to 250 bounded nodes" → the dashboard asks for **150**; 250 is only the API hard ceiling | `frontend/src/app/page.tsx:137,164`; `backend/app/routers/graph.py:9,63` |
| Torch pin | `torch==2.4.1+cpu` → the pin is **`torch==2.4.1`**; `+cpu` is a local-version label from the CPU wheel index | `backend/requirements.txt:48` |
| Enrichment stages | 6 named stages → **7** (`cluster, peeling, coinjoin, wallet_attributes, schema_contract, postgres_mirror, xai_publish`) | `backend/app/tasks/enrich.py:2704-2713,2758` |
| UI label | Top-nav "Upload"/"Ingest" → actual label is **"Ingest Batch"** | `frontend/src/components/TopNav.tsx:117` |
| Dossier export | "1-click JSON/PDF" → **JSON download + browser print dialog** (`printCertificateWindow`); no PDF file is produced | `frontend/src/lib/dossierExport.ts:263,280` |
| Row density | "38px dense grid" → no `38px` literal exists; cells are Tailwind `py-2.5` | `frontend/src/components/AlertTable.tsx:292+` |
| Migrations | `alembic upgrade head` presented as a manual step → the `migrate` compose service already runs it | `docker-compose.yml:142` |
| XAI counts | 17,020 trails / 500 subgraphs / 17,020 composites → **15,873 / 100 / 15,873** | `data/xai/*.json` top-level key counts |

Two files were repaired beyond content accuracy:

- **`docs/dev-server.md` binary corruption.** The tracked file carried raw control bytes
  (`\x08`, `\r`, `\x0c`) that had eaten characters inside otherwise-correct text: all 8
  code fences were collapsed to a single stray backtick, and `bolt://` → `\x08olt://`,
  `neo4j` → `eo4j`, `redis://`/`redis-cli` → `\redis://`, `fork` → `\x0cork`. Fences and
  tokens restored; 0 control characters remain, 16 balanced fences. **[file]**
- **`docs/docs.md` machine-specific links.** 10 absolute `file:///c:/Users/bari2/...`
  links (to `WORK-1/2/3.md` and `dev-server.md`) converted to repo-relative links. They
  now resolve inside `docs/`. **[file]**

### 15.2 Repository metadata

- GitHub repo description set and **20 topics** attached via `gh repo edit` — description
  "Bitcoin transaction monitoring & AML detection with graph analytics (Neo4j) and PyTorch
  GNN scoring"; topics `aml, anomaly-detection, bitcoin, blockchain-analytics, celery,
  docker, explainable-ai, fastapi, forensics, graph-analytics, graph-data-science,
  graph-neural-networks, money-laundering, neo4j, nextjs, postgresql, pytorch, redis, shap,
  typescript`. **[run]** — re-read back with `gh repo view --json`, which returns the
  description and exactly 20 topics.
- Root `package.json`: added `name` (`sih26146`), `version`, `private`, `description`,
  `license: UNLICENSED`, `engines.node >=20`. Previously it held only `dependencies`.
- `frontend/package.json`: `name` `frontend` → `sih26146-frontend`, plus `description`
  and `license`. **[file]**

### 15.3 Docker bring-up hardening

`docker-compose.yml`:

- Healthchecks on all six long-running services (`postgres:68`, `neo4j:104`, `redis:127`,
  `fastapi:168`, `celery-worker:206`, `frontend:237`), and `fastapi` / `celery-worker` now
  gate on `service_healthy` for their dependencies instead of merely starting in order.
- **New one-shot `migrate` service** (`docker-compose.yml:138-149`): `restart: "no"`,
  `command: ["alembic","upgrade","head"]`, gated on `postgres` being healthy. `fastapi`
  and `celery-worker` gate on `service_completed_successfully`, so a failed migration stops
  the stack instead of letting Uvicorn crash-loop. The old
  `sh -c "alembic upgrade head && uvicorn …"` command on `fastapi` is gone.
- `API_DEV_TOKEN` wired into the shared backend env anchor and the `fastapi`/`celery-worker`
  services; the frontend derives `NEXT_PUBLIC_API_TOKEN` from the *same* variable, so the
  browser and the API can never disagree.
- `NEO4J_AUTH` is now **derived** — `${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD:-password123}` —
  instead of a second, independently-defaulted variable that could drift from the app's own
  credentials.
- Host ports separated from in-network ports: `POSTGRES_HOST_PORT` (was `POSTGRES_PORT`),
  `REDIS_HOST_PORT` (was `REDIS_PORT`), plus `NEO4J_HTTP_PORT` / `NEO4J_BOLT_PORT`. Every
  container-to-container URL keeps the canonical `5432`/`6379`/`7687`.
- Removed the `- ./backend:/app` development bind mount (it shadowed the image's own code
  and made the build meaningless) and the phantom env vars that no code read
  (`POSTGRES_HOST`, `POSTGRES_PORT`, `MAXMIND_ACCOUNT_ID`, `MAXMIND_LICENSE_KEY`).

Images:

- **Backend slimmed.** Dropped `gcc`, `g++` and `libpq-dev` from the runtime stage — every
  pin resolves to a cp311 manylinux wheel, so `build-essential` was ~250 MB of unused
  attack surface. Replaced `--no-cache-dir` with a BuildKit pip cache mount so ~700 MB of
  torch/shap/scipy wheels survive rebuilds, and narrowed `COPY . .` to `app/`, `alembic/`,
  `alembic.ini` so no host `venv/` or `__pycache__/` can leak in. **[file]**
- **Frontend rebuilt as 3 stages on `node:22-alpine`, runtime stage `USER node`**
  (`deps` → `builder` → `runner`, `npm prune --omit=dev`). Image 1.48 GB → **1.18 GB**.
  **[run]** — `docker images` before/after.
- New `.dockerignore` for both `backend/` and `frontend/`. **[file]**
- `.env.example` rewritten: removed the stale `POSTGRES_PORT=5432`, hard-coded
  `DATABASE_URL`/`NEO4J_URI`/`NEO4J_AUTH`/`REDIS_URL` that contradicted the compose
  service names, and the blank `SECRET_KEY`; replaced with the `*_HOST_PORT` contract and
  documented defaults matching `app/config.py`. **[file]**
- New `docker/README-docker.md` — ports, GDS first-boot download, migration failures,
  rebuild triggers, log locations. Linked from `setup.md:430`. **[file]**

Verified: `docker compose config` clean; both images build; **6 services healthy** plus
`migrate` at **`Exited (0)`** (the success state); `/health` and the frontend both return
200; the authenticated `GET /api/v1/alerts` returns real rows; Neo4j GDS live at
**2.13.13**. **[run]** — reported by the agent that executed the stack; not re-run during
this docs-only pass (see §15.7).

### 15.4 `.gitignore` — docs were being silently untracked

The blanket `*.md` / `**/*.md` rules added in commit `2c85edc` were untracking the entire
project documentation set without saying so. That same commit also ran `git rm` on nine
docs (`AGENTS.md`, `DATA_SOURCES.md`, `FLOW.md`, `NOTES.md`, `PERFORMANCE_LOG.md`,
`WORK-1.md`, `WORK-2.md`, `frontend/AGENTS.md`, `frontend/CLAUDE.md`) — 1,108 lines
deleted in one commit.

Both rules removed. `git ls-files --others --exclude-standard "*.md"` now returns the
**15** project docs as untracked-but-not-ignored (previously they were invisible), and
tracked markdown is down to 7 files. **[file]** — `git show --stat 2c85edc`,
`git ls-files`, `git ls-files --others`.

### 15.5 Frontend lockfile — `npm ci` was structurally broken

Root cause: commit `3d2561f` shipped `frontend/package-lock.json` with
`node_modules/@emnapi/wasi-threads` as the only resolved `@emnapi/*` entry —
`@emnapi/core` and `@emnapi/runtime` were **absent** while four dependents
(`@napi-rs/wasm-runtime`, `@img/sharp-*`, `@tailwindcss/oxide*`, the nested
`oxide-wasm32-wasi` tree) still declared them as required dependencies. `npm ci` therefore
could not resolve the tree. **[file]** — `git show 3d2561f:frontend/package-lock.json`
has exactly one `node_modules/@emnapi*` key against four dependents.

Fix: lockfile regenerated **on Linux** (`docker run --rm -v "$PWD":/app -w /app
node:22-alpine npm install --package-lock-only`). npm 11 on Windows prunes the bundled
wasm32 optional dependencies and re-breaks the lock, so the Windows path is not viable —
the reason is documented inline in `frontend/Dockerfile:21-26` so the next agent does not
rediscover it the hard way. `@emnapi/wasi-threads` 1.2.1 → **1.2.3**;
`@emnapi/core`/`@emnapi/runtime` back at 1.11.3. `frontend/Dockerfile` uses `npm ci` again.

Verified: frontend build OK, container healthy, HTTP 200. **[run]**

### 15.6 Docs reconciled with the new Docker reality

- `README.md` §6.2 "Quick start for judges" rewritten around `docker compose up -d --build`
  + `docker compose ps`, with the expectation table showing all six services
  `Up (healthy)` and `migrate` at `Exited (0)`, plus the explicit note that
  **`Exited (0)` on `migrate` is success, not failure**.
- Host-port contract documented in both guides: Postgres `5433 -> 5432`, Redis
  `6380 -> 6379`, Neo4j HTTP/BOLT, with the rationale (a host-installed server on
  `5432`/`6379` would otherwise collide).
- `migrate` semantics documented in both guides, including the manual recovery path
  `docker compose run --rm migrate` and the "only `Exited (1)` is a bad state" rule.
- **Token rebuild contract:** `API_DEV_TOKEN` is the single source of truth; because
  `NEXT_PUBLIC_*` is inlined at build time, changing it requires an image rebuild —
  documented, with the resulting symptom (`401` on every call) mapped to its cause in the
  troubleshooting table.
- `README.md` §6.6 **Known Limitations** added: no login/user store (the static
  `API_DEV_TOKEN` default is committed), single-node offline demo scope, and the
  `MAXMIND_LICENSE_KEY` caveat.

All six confirmed present by grepping the two guides. **[file]**

### 15.7 `flow.md` / `AGENTS.md` repairs + duplicate-docs audit (closed out)

- **`flow.md` API paths corrected** against the real routers — `GET /alerts`,
  `GET /entity/{address}/explain`, `GET /graph/{cluster_id}` were all missing the
  `/api/v1` prefix, and `POST /ingest/sync` was missing its `/{task_id}` path segment.
  `POST /ingest`, `GET /ingest/status/{task_id}` and
  `POST /ingest/enrichment/{task_id}/reload` were already correct and were left alone.
- **`flow.md` stale data corrected.** `data/synthetic_data.csv` does not exist and no
  script in the repo emits it — `backend/scripts/generate_synthetic_data.py:584-586`
  writes `synthetic_transactions.{csv,json,xml}` only. The checkpoint was reworded to name
  the real artefacts and to state that they are generated and gitignored
  (`.gitignore:25-28`) rather than committed. XAI counts recomputed by parsing
  `data/xai/*.json`: evidence trails **15,873** (not 17,020), GNN subgraphs **100**
  (not 500), composite scores **15,873**, distinct cluster IDs in the trails **3,965**
  (not 9,794 — 9,794 is the *Louvain community count*, a different quantity that the old
  text conflated), file sizes 5.05 / 0.10 / 9.07 MB, and the verdict split recomputed from
  the stored scores as CRITICAL 103 / HIGH 10 / MEDIUM 3,112 / LOW 12,648.
  The `torch==2.4.1+cpu` pin was aligned to `torch==2.4.1` per `backend/requirements.txt:48`.
  `flow.md`'s "SHAP GradientExplainer" was **deliberately not changed**: that claim is
  accurate for the Phase 8 batch script `backend/scripts/explain_autoencoder.py:297`,
  which really does call `shap.GradientExplainer`. Only the *live* service moved to
  `PermutationExplainer`. **[file]**
- **`AGENTS.md` dead links fixed.** `file:///c:/Users/bari2/Desktop/SIH26146/dev-server.md`
  pointed at a repo-root file that does not exist → replaced with the relative
  `docs/dev-server.md`. The promised `SIH26146_Master_Reference_Document.pdf` does not
  exist anywhere in the repo → the four references to it were reworded to point at
  `flow.md` + the `docs/WORK-*.md` logs, which do exist. **[file]** — `Test-Path` on both.
- **Duplicate-docs audit (report only, nothing deleted).** `flow.md` vs `docs/FLOW.md`,
  `WORK-2.md` vs `docs/WORK-2.md`, `PERFORMANCE_LOG.md` vs `docs/PERFORMANCE_LOG.md`.
  Findings are in §15.8; the merge/delete decision is deliberately left open.
- **Known unverified / out of scope.** Two numbers in `flow.md` could not be settled from
  the repo alone and were left untouched rather than guessed: the Phase 3 `:CO_SPEND`
  edge count (`flow.md` says 39,620; both `PERFORMANCE_LOG.md` files record 45,516 written
  — plausibly the post-dedup figure after the §4 direction/dedup hardening, but nothing in
  the repo proves it) and the Phase 4 Postgres sync time (`flow.md` says 3.43 s;
  `docs/PERFORMANCE_LOG.md:166` says 4.33 s for the same Louvain run signature — 9,794
  communities, modularity 0.461314, 100,000 rows updated). `flow.md`'s "4.05% illicit
  txns" also could not be re-derived: the CSV has no `is_illicit` column, and the
  generator draws `rng.uniform(0.025, 0.045)` per run, so the figure is run-specific.
  `backend/requirements.txt:57-58` carries a stale comment claiming GradientExplainer is
  the chosen explainer; it is a source file and was not touched.

### 15.8 Duplicate-docs audit — findings (no files deleted)

`git diff --no-index` on each pair:

| Pair | Relationship |
| :--- | :--- |
| `flow.md` vs `docs/FLOW.md` | **Near-identical, `docs/FLOW.md` is a stale subset.** Byte-identical from the title through the start of Phase 10.5; `docs/FLOW.md` is then missing the last two Phase 10.5 bullets present in the root file (the P3b write-through SHAP engine and the Cluster Topology toggle fix) and carries the older, pre-P3b checkpoint sentence. After today's corrections both agree on every line they share. |
| `WORK-2.md` vs `docs/WORK-2.md` | **Genuine duplicate, `docs/WORK-2.md` was a truncated prefix.** Byte-identical §1–§12 except the header links (which are correctly `WORK-1.md`/`WORK-3.md` when read from inside `docs/`). `docs/WORK-2.md` was missing §13 and §14 entirely; both sections are now mirrored, so the two files differ only in that one header line. |
| `PERFORMANCE_LOG.md` vs `docs/PERFORMANCE_LOG.md` | **Genuinely different and complementary — not duplicates.** The root file holds three *newer* runs (2026-09-23: ingest 9.48 s / 10,544 rows·s⁻¹, graph build 217.83 s, Louvain 9,794 communities @ modularity 0.461001). `docs/PERFORMANCE_LOG.md` holds a title, the 2026-09-08 ingest unit-test verification, eight 2026-09-07 runs (3× ingest, 1× graph build, 4× Louvain), Phase 5 autoencoder training and Phase 7 GraphSAGE. Neither file is a copy of the other and **no measured value in one contradicts the other** — the overlapping entries differ only because they record different runs. The one real clash is *between a log and `flow.md`*: `docs/PERFORMANCE_LOG.md:166` records a 4.33 s Postgres sync for the Louvain run whose signature `flow.md:80` also cites (9,794 communities, modularity 0.461314, ranLevels 5, 100,000 rows updated), but `flow.md:80` states 3.43 s. Left as-is — settling it needs a live re-measure or your decision. |

---

## 16. Configurable CORS Origins & Constant-Time Token Comparison (2026-10-04)

Second wave of the 2026-10-04 hardening. A code fix landed *after* §15 was written
that falsified two claims those docs were resting on: `backend/app/config.py` gained
`cors_origins` and `backend/app/main.py` now reads it, so CORS is no longer pinned to
`localhost:3000`; and the bearer-token check is now constant-time. This entry records
the code change, how it was verified, the dependency-integrity finding that came out of
the same wave, and the doc sweep that followed. The docs pass touched only `README.md`,
`setup.md`, `docs/dev-server.md` and these two logs — no application code,
`docker-compose.yml`, `.env.example`, Dockerfile or env template.

**Verification provenance:** as in §15 — **[run]** executed, **[file]** read from source.
The runtime results in §16.1 and §16.2 are reported by the agent that made the code fix
and were **not** re-executed during this docs-only pass.

### 16.1 `CORS_ORIGINS` is now read

- `backend/app/config.py:93` adds `cors_origins: str = ""` in the Phase 9 API-security
  block, next to `api_dev_token`. The adjacent comment states the contract: a
  comma-separated list consumed by `CORSMiddleware` in `app/main.py`, empty meaning
  "fall back to the localhost:3000 dev origins".
- `backend/app/main.py` implements it: `_DEFAULT_CORS_ORIGINS = ("http://localhost:3000",
  "http://127.0.0.1:3000")` (`:164`), `_cors_origins()` (`:167-174`) splitting
  `settings.cors_origins` on `,`, `.strip()`ping each entry, dropping empties, and
  returning the default list when nothing survives. `allow_origins=_cors_origins()` is
  passed to `app.add_middleware(CORSMiddleware, ...)` at `:184`.
- Unchanged and worth keeping: `allow_credentials=False` (`:185`), methods
  `GET, POST, OPTIONS` and headers `Authorization, Content-Type, Accept` (`:186-187`).
- Operational detail: `_cors_origins()` is called once at import, so the allow-list is
  fixed for the life of the process — a changed `CORS_ORIGINS` needs a restart, not a
  reload of settings.

Verified with a raw-ASGI harness that drives the app without binding a socket: a valid
token returns **200**; a wrong token, an empty bearer token and a latin-1 token
(`Bearer café`) each return **401** (the last one a 401 rather than a `TypeError`
traceback — see §16.2); `Origin: http://localhost:3100` yields a response carrying
`access-control-allow-origin`; a non-matching origin is rejected. `backend/tests/test_alerts_endpoint.py`
passes (4 tests) and the full backend suite collects **271 tests with zero collection
errors**. **[run]**

### 16.2 Bearer-token comparison is constant-time

`backend/app/main.py:103-108` compares the presented token against the configured one
with `secrets.compare_digest(expected_token.encode("utf-8"), token.encode("utf-8"))`
instead of a plain string `==`. Two traps were hit while making that change, and both
are load-bearing:

1. **`compare_digest` raises `TypeError` on non-ASCII `str`.** It accepts ASCII-only
   strings, so a header like `Authorization: Bearer café` would have turned an
   authentication failure into a 500. Encoding both sides to utf-8 bytes first keeps
   that case on the 401 path — which is exactly what the harness in §16.1 exercises.
2. **An empty configured token must not match an empty bearer token.**
   `compare_digest(b"", b"")` is `True`, so with `API_DEV_TOKEN` unset or empty a bare
   `Authorization: Bearer ` would have authenticated successfully. The
   `not expected_token or ...` guard short-circuits before the comparison is reached.

`/health`, `/docs`, `/redoc`, `/openapi.json` and every `OPTIONS` preflight remain
exempt (`_AUTH_SKIP_PREFIXES`, `main.py:83,92`) — unchanged behaviour.

### 16.3 `httpx2` is a legitimate dependency — do not remove it

`backend/requirements.txt:41` pins `httpx2>=2.12.0` directly beneath `httpx>=0.27.0`
(`:40`). The doubled name reads exactly like a typosquat, and an in-repo grep for who
imports it turns up no application code at all — which is how it got flagged as
possibly-unused. **It is not a typosquat.** **[file]**

- `backend/venv/Lib/site-packages/httpx2-2.12.0.dist-info/METADATA` →
  `Name: httpx2`, `Version: 2.12.0`, `Summary: The next generation HTTP client.`,
  `License-Expression: BSD-3-Clause`, `Author-email: Tom Christie <tom@tomchristie.com>`,
  `Homepage: https://github.com/pydantic/httpx2`. It is the pydantic-org successor to
  `httpx`, same author.
- `starlette==1.6.0`'s `TestClient` imports it:
  `backend/venv/Lib/site-packages/starlette/testclient.py:33` is
  `import httpx2 as httpx`, and `starlette-1.6.0.dist-info/METADATA` declares
  `Requires-Dist: httpx2>=2.0.0; extra == 'full'`. Dropping the pin breaks every
  `TestClient`-based API test — including the four in
  `backend/tests/test_alerts_endpoint.py` that cover §16.1.

**Lesson worth keeping for the next audit:** an in-repo grep for a dependency's usage
is structurally blind to transitive imports that live inside `site-packages`. Before
calling a pin unused, read `*.dist-info/METADATA` `Requires-Dist` for the packages
that depend on *it* — that is where the real consumer shows up, and no amount of
grepping `backend/` will ever find it.

### 16.4 Settings live in `backend/app/config.py` — there is no `app/core/`

`backend/app/` contains only `ml/`, `models/`, `routers/`, `schemas/`, `services/`,
`tasks/` plus top-level modules; there is **no `core/` package**. Settings are
`backend/app/config.py` — a single `Settings(BaseSettings)` with the module-level
`settings` instance — imported everywhere as `from app.config import settings`.
Any doc pointing at `app/core/config.py` or `app/core/settings.py` names a path that
does not exist. **[file]** — directory listing of `backend/app/`, `config.py:23,133`.

### 16.5 Documentation sweep that followed the fix

| Stale claim | Reality (evidence) | Fix |
| :--- | :--- | :--- |
| `README.md` §6.5 — `CORS_ORIGINS` is listed among the vars "no code reads", uncommenting "changes nothing" | `cors_origins` is read — `config.py:93`, `main.py:167-174,184` | Removed from the not-consumed list; points forward to §6.6 |
| `README.md` §6.6 — "**CORS is hardcoded.** `main.py:156` pins `allow_origins` … `CORS_ORIGINS` is **never read** … A real fix means editing `main.py`" | Configurable, with the localhost:3000 fallback | Bullet deleted; replaced by a **Browser origins (CORS)** block: list format, trimming/dropping rule, fallback, `.env` examples for a non-default port and for multiple origins, and the LAN case |
| `setup.md` Step 1 — `CORS_ORIGINS` "because nothing reads them … uncommenting them has no effect" | Same | Reworded to say it *is* read, plus a full CORS note next to the port note |
| `setup.md` troubleshooting — "`allow_origins` is hardcoded … `CORS_ORIGINS` is not read. Keep the dashboard on port 3000, or edit `main.py`" | Same | Row rewritten as a cause→fix: set `CORS_ORIGINS` to the origin actually served, recreate the API |
| `README.md` §6.6 — "**`npm ci` is not usable in `frontend/`** — lockfile out of sync, so the image uses `npm install`" | Lock was repaired in §15.5; `frontend/Dockerfile` stage `deps` runs `npm ci`, and the image is the 3-stage `node:22-alpine` build that ships a production-only tree via `npm prune --omit=dev` | Bullet rewritten around the real constraint (regenerate the lock **on Linux**), not around `npm install` |
| `docs/dev-server.md` §2 — `CORS_ORIGINS` listed under "Key environment variables required" | Optional — the fallback already covers `npm run dev` on port 3000 | Marked optional with the fallback + LAN caveat; added a matching §5 troubleshooting entry |

Two honesty notes on that sweep:

- **`FRONTEND_PORT` alone is not enough**, and no doc may imply otherwise. It
  republishes the container port; it does not change the `Origin` header the browser
  sends. All three guides now say so explicitly.
- **LAN / remote access cannot be inferred by the backend.** A browser on a second
  machine sends `Origin: http://<lan-ip>:3000`. That origin is rejected unless listed
  by hand — so `--host 0.0.0.0` on uvicorn or a published `FRONTEND_PORT` is *not* a
  substitute. Documented in all three guides with an explicit LAN example.

Not changed, deliberately: **no doc described the token comparison**, so nothing about
`compare_digest` needed correcting — the guides only ever described *which* requests
need the header and that a bad one yields `401`, both of which remain true.

### 16.6 Still open at the time of this entry

- **`CORS_ORIGINS` does not yet reach the Dockerized API.** The shared
  `x-backend-environment` anchor in `docker-compose.yml:24-43` passes `API_DEV_TOKEN`
  and the two model flags but no `CORS_ORIGINS`, and `.env.example:141-158` still
  lists it under "NOT CONSUMED BY THE BACKEND" with the pre-fix wording ("This value is
  ignored — and because it is ignored, changing `FRONTEND_PORT` away from `3000`
  breaks browser calls … until main.py is updated"). Both files are owned by a parallel
  agent on this wave and were not touched here. Until they land, an `.env` value for
  `CORS_ORIGINS` cannot reach the container: `config.py`'s `env_file` resolves to
  `/.env` in Docker (`parents[2]` of `/app/app/config.py` — see the existing comment at
  `config.py:17`) and nothing is mounted there, so compose `environment:` is the only
  channel. The bare-metal route in `docs/dev-server.md` is unaffected — there `.env` is
  read directly. **[file]**
- **`docker/README-docker.md` still carries the pre-fix text** and is outside this
  pass's ownership: line 59 says "`app/main.py` hardcodes the CORS allow-list", and
  §9 "Why `npm ci` is not used in `frontend/Dockerfile`" (lines 203-217) still says
  "The image uses `npm install`". Both statements are now false. **[file]**


---

## 17. Final Cleanup Wave — Neo4j Memory Keys, CORS Propagation & Doc Truth (2026-10-04)

Third and closing wave of the 2026-10-04 hardening. It closes both items §16.6 left
explicitly open, migrates the Neo4j memory settings off their deprecated aliases, and
sweeps the two remaining docs whose text today's changes falsified.

**Scope of edits:** `docker-compose.yml`, `.env.example`, `docker/README-docker.md`,
`docs/26146.md`, and this log. No application code, no Dockerfile, no `.dockerignore`,
no `README.md` / `setup.md` / `flow.md` / `AGENTS.md`, no `package.json`, and no `.env`
content change (the file was touched only for a probe and restored byte-identical —
see §17.2).

**Verification provenance** as in §15/§16:
- **[run]** — executed: containers started/recreated, HTTP requests issued, Cypher
  queries run, files hashed.
- **[file]** — read from source or from the image on disk. No container needed.

### 17.1 `CORS_ORIGINS` now reaches the Dockerized API

§16.6 recorded the gap: the shared `x-backend-environment` anchor
(`docker-compose.yml:24-43`) passed `API_DEV_TOKEN` and the two model flags but no
`CORS_ORIGINS`, so an `.env` value was silently dropped. Compose `environment:` is the
only channel that works, because `config.py`'s `env_file` resolves to `/.env` inside
the container (`config.py:25`, `parents[2]` of `/app/app/config.py`) and the image
ships no `.env` — `.dockerignore` excludes it.

**Fixed:** `docker-compose.yml:47` now carries

```yaml
CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}
```

inside `x-backend-environment`, so it is propagated by reference into `migrate`,
`fastapi` and `celery-worker` (all three use `environment: *backend-environment`).

Verified live. **[run]**

| Check | Result |
| :--- | :--- |
| `docker compose exec fastapi printenv CORS_ORIGINS` with `CORS_ORIGINS=http://localhost:3100` | `http://localhost:3100` |
| `docker compose exec celery-worker printenv CORS_ORIGINS` (same run) | `http://localhost:3100` |
| `curl -H "Origin: http://localhost:3100" … /api/v1/alerts?limit=1` | `HTTP/1.1 200 OK` + `access-control-allow-origin: http://localhost:3100` |
| Same request with `Origin: http://localhost:3000` | `HTTP/1.1 200 OK`, **no** `access-control-allow-origin` header |
| `migrate` under the same configuration | `Exited (0)` |

**The honest behaviour, stated plainly: `FRONTEND_PORT` alone still breaks the
dashboard.** Verified, not assumed. **[run]** With only
`FRONTEND_PORT=3100 docker compose up -d fastapi`, `printenv CORS_ORIGINS` inside the
container returns `http://localhost:3000` — the value already sitting in the host
`.env`, interpolated by compose — and a request carrying
`Origin: http://localhost:3100` comes back `200 OK` with **no**
`access-control-allow-origin` header at all.

The reason is worth recording because it is easy to misread. `CORSMiddleware` does not
reject the request server-side; it serves it normally and simply *withholds* the CORS
headers when the `Origin` is not on the list. The `200` in the table above is
therefore not a pass — the **browser** is the component that refuses the response, and
the visible symptom is a console CORS error plus dashboard panels that stay empty
while every panel's HTTP request looks successful in the network tab.

`FRONTEND_PORT` republishes the container on a different *host* port; it does not and
cannot change the `Origin` the browser sends. Both variables have to move together.

### 17.2 Neo4j memory settings: the deprecated aliases **did work**

The brief for this wave described the `dbms.memory.*` aliases as a functional bug whose
effect "may be fiction". **They are not fiction.** They are honoured, and the migration
below is hygiene — log hygiene, and immunity from a future removal, nothing more.

Evidence, in order. **[run]** unless marked.

1. **Image and version.** `docker-compose.yml:84` pins `neo4j:5.26-community`
   (`docker images` → `ab3aafb0020e`). The *keys* before this change were
   `NEO4J_dbms_memory_heap_initial__size`, `NEO4J_dbms_memory_heap_max__size` and
   `NEO4J_dbms_memory_pagecache_size`.

2. **How the image maps env-var names.** Not from memory — from the image's own
   `/startup/docker-entrypoint.sh`. **[file]** Lines 549-555 state the convention and
   line 607 implements it:

   ```bash
   setting=$(echo "${i}" | sed 's|^NEO4J_||' | sed 's|_|.|g' | sed 's|\.\.|_|g')
   ```

   Strip `NEO4J_`, then `_` → `.`, then `..` → `_`. So `__` encodes a literal `_`
   inside a setting name and every other `_` is a namespace separator.
   `NEO4J_dbms_memory_heap_max__size` therefore resolves to
   `dbms.memory.heap.max_size`. Lines 559-561 add entrypoint-level shims for exactly
   three renamed settings — `db.tx_log.rotation.retention_policy`,
   `dbms.memory.pagecache.size` and `dbms.default_listen_address` — and **no shim for
   the heap keys**, which is why the heap aliases reach `neo4j.conf` verbatim.

3. **The deprecation WARN is real.** On first boot with the old keys:

   ```
   WARN  Use of deprecated setting 'dbms.memory.pagecache.size'. It is replaced by 'server.memory.pagecache.size'.
   WARN  Use of deprecated setting 'dbms.memory.heap.max_size'. It is replaced by 'server.memory.heap.max_size'.
   WARN  Use of deprecated setting 'dbms.memory.heap.initial_size'. It is replaced by 'server.memory.heap.initial_size'.
   ```

4. **Proof the alias is honoured, not ignored — negative test.** Appended
   `NEO4J_HEAP_MAX_SIZE=100m` to the host `.env` (leaving `NEO4J_HEAP_INITIAL_SIZE`
   at its `512m` default, so max < initial is a deliberately invalid combination) and
   recreated the container. Neo4j refused to boot and crash-looped (`RestartCount` 1 → 2):

   ```
   Error occurred during initialization of VM
   Initial heap size set to a larger value than the maximum heap size
   ```

   Had the alias been ignored, max would have stayed `2g`, initial would have stayed
   `512m`, and the container would have started normally. It did not.

5. **Proof the alias is honoured — positive test.** Same channel, `NEO4J_HEAP_MAX_SIZE=3g`,
   healthy start, and `SHOW SETTINGS`:

   | Setting | Effective value |
   | :--- | :--- |
   | `server.memory.heap.initial_size` | `512.00MiB` |
   | `server.memory.heap.max_size` | `3.00GiB` |
   | `server.memory.pagecache.size` | `1.00GiB` |

   The `3.00GiB` came in through the deprecated alias. Confirmed applied, not merely
   accepted.

6. **`.env` restored and verified.** SHA-256 before the probe, after the restore, and
   of the untouched backup were all
   `451DF1E5DFE95D836DB7C5A12CB980BF92BF105FCFB640E6E287F78020AF0C84`. The probe lines
   are gone (`Select-String` for `NEO4J_HEAP_MAX_SIZE` / `TEMP probe` returns 0).

**The migration.** `docker-compose.yml:96-104`, before → after:

```yaml
# before
NEO4J_dbms_memory_heap_initial__size: ${NEO4J_HEAP_INITIAL_SIZE:-512m}
NEO4J_dbms_memory_heap_max__size: ${NEO4J_HEAP_MAX_SIZE:-2g}
NEO4J_dbms_memory_pagecache_size: ${NEO4J_PAGECACHE_SIZE:-1g}
```

```yaml
# after
NEO4J_server_memory_heap_initial__size: ${NEO4J_HEAP_INITIAL_SIZE:-512m}
NEO4J_server_memory_heap_max__size: ${NEO4J_HEAP_MAX_SIZE:-2g}
NEO4J_server_memory_pagecache_size: ${NEO4J_PAGECACHE_SIZE:-1g}
```

The `__` stays on the two heap keys: `server.memory.heap.max_size` and
`server.memory.heap.initial_size` contain literal underscores, so they encode as
`__` under the convention above. `server.memory.pagecache.size` has no underscore in it
and therefore takes none.

Result after recreating the container **[run]**:

- deprecation WARNs in `docker compose logs neo4j`: **3 → 0**. The only remaining WARN
  is `GDS metrics disabled`, which is GDS's own doing and unrelated.
- `neo4j.conf` memory lines: **4 → 3**, and all three are canonical now:

  ```
  355:server.memory.pagecache.size=1g
  356:server.memory.heap.max_size=2g
  357:server.memory.heap.initial_size=512m
  ```

  Worth noting why it was 4 before: the entrypoint shim at line 560 translated
  `NEO4J_dbms_memory_pagecache_size` into `NEO4J_server_memory_pagecache_size` *while*
  the generic loop still wrote the original as `dbms.memory.pagecache.size` — so the
  pagecache value was being written twice, once canonically and once as an alias.

- `SHOW SETTINGS` returns the same `512.00MiB` / `2.00GiB` / `1.00GiB` as before the
  migration. Nothing was lost.

`.env.example` gained the full mapping table, the note that these three are compose
interpolation variables rather than Neo4j setting names, and the
`NEO4J_HEAP_INITIAL_SIZE <= NEO4J_HEAP_MAX_SIZE` constraint that produces the crash-loop
in §17.2 step 4 — that failure mode is now also a row in the `README-docker.md`
troubleshooting table. The advice to lower these on a memory-constrained laptop was
never wrong and remains correct; only the wording about which Neo4j settings they map
onto changed.

### 17.3 `.gitignore` secrets block at repo root

`.gitignore:9-17` gained a `# Secrets` block: `*.pem`, `*.key`, `*.pfx`, `*.p12`.
Previously these patterns existed only in `frontend/.gitignore` (which ships the
Create-Next-App default `*.pem` under `# misc`) and therefore covered the frontend
subtree and nothing else — a private key or TLS certificate added anywhere else in the
tree would have been picked up by `git add` without complaint. **[file]** —
`git diff .gitignore`.

Two honest qualifications to the comment written there. First, the block does not
change what is *currently* tracked: `git ls-files` returns 0 matches for all four
patterns. Second, the block's claim that "nothing in the repo matches these today" is
true of trackable files but not literally true of the working tree — two `*.pem`
files exist on disk, `backend/venv/Lib/site-packages/certifi/cacert.pem` and
`backend/venv/Lib/site-packages/pip/_vendor/certifi/cacert.pem`. Both are already
excluded by `backend/.gitignore:1` (`venv/`), confirmed with `git check-ignore -v`, and
neither appears in `git status --porcelain`. The block is purely preventive.

### 17.4 Doc-truth fixes

`docker/README-docker.md` — four corrections plus a fifth found during the sweep:

| Was | Reality | Fix |
| :--- | :--- | :--- |
| `FRONTEND_PORT=3100 BACKEND_PORT=8100 docker compose up -d` presented as sufficient | The browser's `Origin` changes with the published port; the allow-list is a fixed string list | `CORS_ORIGINS=http://localhost:3100` added to the example, with the reason spelled out |
| §2 "Frontend port gotcha": `app/main.py` **hardcodes** the allow-list, "also edit the `allow_origins` list", "then rebuild the frontend image" | `config.py:93` declares `cors_origins`; `main.py:167-184` builds the list from it with a `localhost:3000` + `127.0.0.1:3000` fallback; compose propagates it; CORS is a backend concern | Rewritten as the `CORS_ORIGINS` note, citing `config.py:93` and `main.py:167-184`, and stating explicitly that no source edit and no frontend rebuild are needed |
| §10 row "Browser CORS error \| `FRONTEND_PORT` changed from 3000 \| §2" pointed at the false block | Same | Rewritten cause → fix: list the new origin, then `docker compose up -d fastapi` |
| §9 "Why `npm ci` is **not** used in `frontend/Dockerfile`", with a stale `npm ci` error dump and "the image uses `npm install`" | `frontend/Dockerfile:33` runs `npm ci`; the lock carries `@tailwindcss/oxide-wasm32-wasi` **and** its bundled `@emnapi/core` / `@emnapi/runtime` / `@emnapi/wasi-threads` | §9 retitled "The frontend lockfile must be regenerated on Linux" and rewritten around the real constraint, with the exact `node:22-alpine` container command and a `grep` to verify the three `@emnapi/*` lock entries |
| §3 pre-seed workaround: `neo4j-admin server plugins install graph-data-science` | **That subcommand does not exist in `neo4j:5.26-community`.** `neo4j-admin server` offers only `console, help, memory-recommendation, migrate-configuration, report, restart, start, status, stop, unbind, validate-config`; the call fails with `Unmatched arguments from index 1: 'plugins', 'install', 'graph-data-science'` | Replaced with the verified working form — let the entrypoint's own `NEO4J_PLUGINS` path do the install, then exit via `true`. Proven end-to-end into a throwaway volume, which contained `graph-data-science.jar` (65,774,694 bytes) afterwards; the probe volume was removed |

Also corrected, in both files that carried it: the procedure name
`gds.ml.louvain.stream` is wrong — there is no `gds.ml.` reference anywhere in
`backend/`, and the real call is `gds.louvain.stream` at
`backend/app/tasks/enrich.py:180` (alongside `gds.graph.project.cypher` at `:167` and
`gds.graph.drop` at `:130`). Fixed in `docker/README-docker.md` and
`docker-compose.yml:91-92`.

`docs/26146.md` — four corrections:

| Was | Reality | Fix |
| :--- | :--- | :--- |
| `next-frontend` = `Node.js 20-alpine`, "Production standalone build" | `node:22-alpine`; 3-stage `deps → builder → runner`; `next.config.ts` does **not** set `output: "standalone"`, so the runtime stage ships a real `node_modules` pruned with `npm prune --omit=dev` | Both cells rewritten |
| "an orchestration of 6 isolated containers"; `migrate` absent from the diagram and the service table | 7 services — 6 long-running plus the one-shot `migrate`, which gates `fastapi` and `celery-worker` on `service_completed_successfully` | Count corrected; `migrate` added to the mermaid diagram and the table |
| "SHAP GradientExplainer" in five places (Stage 4 box, Layer 5 diagram, §2 XAI-A heading and body, §7 audit box) | The live service uses `shap.PermutationExplainer` — `shap_service.py:15-19,97,644-647`, whose module docstring states explicitly that it is *not* Gradient- or DeepExplainer. Already corrected in `README.md` by §15.1 | All five occurrences corrected, including the ASCII-box cells |
| `neo4j` resource column said "Heap: `512m`-`2g`, Pagecache: `1g`" | Values unchanged and still correct, but the settings behind them are now named | Restated as the three explicit `server.memory.*` settings |

**Known remaining discrepancy, deliberately not rewritten.** `docs/26146.md`'s entire
Stage 4 / Layer 3 / Layer 5 body documents the **legacy** Autoencoder + GraphSAGE pair,
but `config.py:102,107` defaults `use_legacy_anomaly_model` and `use_legacy_risk_model`
to `False`, which activates the **FT-Transformer** and **Relational Graph
Transformer** weights instead (`xai_store.py:331-356,398-399`). Every measured figure in
those sections — the autoencoder MSEs and the 0.034618 threshold, the GraphSAGE
F1 0.9711 and 25.4 ms inference — belongs to the legacy pair, which is still a real,
supported and benchmarked configuration reachable via
`USE_LEGACY_ANOMALY_MODEL=true` / `USE_LEGACY_RISK_MODEL=true`.

Correcting it properly means rewriting Stage 4, the whole of Layer 3, the Stage 4 box
in §1.2, the composite-risk formula and the §7 audit box, i.e. re-benchmarking the
dossier against the active weights. That is a dossier rewrite, not a cleanup, so it was
**not** done here. What was done instead is two explicit scope notes — one after the
§2.1 pipeline diagram and one at the head of Layer 3 — stating that the documented
pipeline is the legacy pair and pointing at the flags that enable it. Anyone reading the
dossier can no longer mistake it for a description of the shipped default.

### 17.5 Full verification

```
docker compose config --quiet   ->  exit 0
```

`docker compose ps -a`:

```
SERVICE         STATE     STATUS
celery-worker   running   Up (healthy)
fastapi         running   Up (healthy)
next-frontend   running   Up (healthy)      0.0.0.0:3100->3000/tcp
migrate         exited    Exited (0)
neo4j           running   Up (healthy)      7474->7474, 7687->7687
postgres        running   Up (healthy)      0.0.0.0:5433->5432/tcp
redis           running   Up (healthy)      0.0.0.0:6380->6379/tcp
```

Neo4j deprecation WARNs, `docker compose logs neo4j | grep -i deprecat`:
**before `3` → after `0`**.

All containers were stopped afterwards with `docker compose down`; volumes
(`sih26146_postgres_data`, `sih26146_neo4j_data`, `sih26146_neo4j_plugins`,
`sih26146_redis_data`) were left intact. Nothing was staged or committed.