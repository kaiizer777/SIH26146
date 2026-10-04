# WORK-3.md — Active Execution Plan: Duplicate Hardening & Phase 11

**Project:** SIH26146 — AI-Powered NTRO Bitcoin AML Surveillance  
**Status as of 2026-09-09:** Phases 0–9.5 complete and verified. This file covers ALL remaining execution plans for the working prototype:
1. **Duplicate File Upload Hardening** (Defensive demo safety)
2. **Phase 11 — Live Post-Ingest Online Inference `[STRETCH]`** (Provisional live scoring)

Historical phases: Phases 0–8 in [`WORK-1.md`](WORK-1.md); Phase 9 & 9.5 in [`WORK-2.md`](WORK-2.md).

---

## CURRENT SYSTEM STATE

| Component | Status |
|---|---|
| PostgreSQL | 100,000 tx rows · anomaly_score · risk_score · is_mixing · cluster_id populated |
| Neo4j | 24,673 :Wallet · 100k :Transaction · all edges · seed_proximity written |
| XAI Artifacts | 15,873 evidence trails · 4,839 SHAP wallets · 100 GNN subgraphs · 15,873 composite scores |
| FastAPI | Docker port 8000 · All 52 Phase 9 assertions pass |
| Celery + Redis | Async ingest works · 1,000 rows in 563ms · Alert grid auto-refreshes |
| Next.js Frontend | Port 3000 · 7 components built and wired · 0 TypeScript errors |
| Air-gap | Fonts pre-cached as woff2 in `.next/static/media/` · Zero CDN requests at runtime |
| Ingest round-trip | Upload → Celery SUCCESS → alert table auto-refresh: **1,983ms total verified** |

> **Critical Gap:** Uploading a *new* file only writes rows to PostgreSQL. The XAI store is loaded once at startup from Phase 8 JSON artifacts. A freshly uploaded wallet not in the 15,873 indexed set returns 404 from `/api/v1/entity/{address}/explain`. Phase 11 closes this gap with lightweight inline scoring.
>
> **Safe demo workaround:** Upload using wallet addresses already in the 15,873 indexed set — everything works end-to-end. Use this if Phase 11 is not wired in time.

---

## SEQUENTIAL EXECUTION ROADMAP

Follow this sequential order to avoid context switching or editing the same files twice:

```
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: DUPLICATE UPLOAD HARDENING (Demo Stability)                  │
│  1.1 DUP-1: backend/app/routers/ingest.py (Redis hash check)          │
│  1.2 DUP-2: frontend/src/components/IngestModal.tsx (409/warn banners)│
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 2: PHASE 11 — LIVE POST-INGEST INFERENCE [STRETCH]              │
│  2.1 11.1: backend/app/services/xai_store.py (thread-safe upserts)    │
│  2.2 11.2: backend/app/services/inline_scorer.py + test               │
│  2.3 11.3: backend/app/routers/ingest.py (POST /ingest/sync/{task_id})│
│  2.4 11.4: frontend/src/components/IngestModal.tsx (auto-sync call)  │
│  2.5 11.5: frontend/src/components/EntityDrawer.tsx (provisional UI) │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 3: MODEL UPGRADE — DUAL TRANSFORMER ARCHITECTURE (SOTA ELEVATION)│
│  3.1 ML-1: FT-Transformer for Tabular Anomaly Detection                │
│  3.2 ML-2: Multi-Head Relational Graph Transformer for Risk Proximity  │
│  3.3 ML-3: Staging Evaluation, Promotion Gate (F1>=0.88) & DB Sync    │
│  3.4 ML-4: Attention Heatmap Extraction & Full Pipeline Verification   │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 4: JURY FLEX & ADVANCED FORENSIC XAI VISUALIZATIONS [STRETCH]    │
│  4.1 FLEX-1: Feature Attention Heatmap Tab in EntityDrawer (18x18 Grid)│
│  4.2 FLEX-2: Multi-Head Relational Attention Edge Glow in GraphCanvas  │
│  4.3 FLEX-3: Model Provenance & Live Architecture Chip in TopNav/Drawer│
│  4.4 FLEX-4: Court-Admissible Sec 65B Dossier Export (SHA-256 + GeoIP) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ─────────────────────────────────────────
## STAGE 1 — DUPLICATE FILE UPLOAD HANDLING
## ─────────────────────────────────────────

**Current state:** If the same file is uploaded twice, it is processed twice. PostgreSQL's `txid` UNIQUE constraint catches and rejects row-level duplicates at `COPY` time, but the UI currently lacks explicit feedback (it looks like a silent 0-row ingest).

---

### DUP-1 — Backend: 409 on Duplicate File Hash

**File:** [`backend/app/routers/ingest.py`](../backend/app/routers/ingest.py)

**Where to add:** In `post_ingest()`, after streaming the file to disk, before calling `process_ingest_file.delay(...)`.

**Implementation details:**
- Compute the SHA-256 hash of the uploaded temp file.
- Use a Redis client (`redis.from_url(settings.redis_url)`) to check if key `file_hash:{hash_hex}` exists.
- If it exists, unlink the temp file and return HTTP 409:
  ```python
  raise HTTPException(
      status_code=409,
      detail={
          "detail": "Duplicate upload detected — this file was already ingested.",
          "original_task_id": existing_task_id.decode() if isinstance(existing_task_id, bytes) else str(existing_task_id),
      },
  )
  ```
- If it does not exist, store `file_hash:{hash_hex}` in Redis with a 24-hour TTL (`ex=86400`, value=`task.id`).

- [x] Add SHA-256 file hash check and Redis client to `backend/app/routers/ingest.py`
- [x] Verify: upload same CSV twice → second call returns HTTP 409 with `original_task_id`

---

### DUP-2 — Frontend: Clear Error Messaging for Duplicate Cases

**File:** [`frontend/src/components/IngestModal.tsx`](../frontend/src/components/IngestModal.tsx)

- **Case A — HTTP 409 from `POST /ingest`:**  
  Catch the 409 status code during upload:
  Show red error banner: `"This file has already been uploaded. Use a different file or wait 24 hours to re-upload."`  
  Do not start polling. Do not call `onSuccess()`.
- **Case B — Celery SUCCESS but `total_inserted === 0 AND total_rejected === total_received`:**  
  In the polling completion check:
  Show orange warning banner: `"No new transactions inserted — all [N] rows were rejected as duplicates (txid already exists). The alert table reflects existing data."`  
  Still call `onSuccess()` so existing data remains visible.

- [x] Handle 409 in `IngestModal.tsx` — show red banner, no polling, no `onSuccess()`
- [x] Handle all-rejected Celery result — show orange warning banner, still call `onSuccess()`
- [x] Verify both cases produce visually distinct, actionable UI feedback — no silent failures

---

## ─────────────────────────────────────────
## STAGE 2 — PHASE 11: Live Post-Ingest Online Inference `[STRETCH]`
**Goal:** After a new file is ingested, score new wallets inline (Autoencoder MSE + rule checks) and append them to the in-memory XAI store so the dossier drawer works immediately for newly uploaded wallets.

### Architecture Overview

The XAI store (`xai_store.py`) is loaded once at FastAPI startup. **Celery is a separate worker process with zero access to FastAPI's memory space.** The correct architectural approach:

1. Frontend polls `/ingest/status/{task_id}` until `SUCCESS`
2. Frontend calls `POST /ingest/sync/{task_id}`
3. **That endpoint runs inside the FastAPI process**, fetches the newly ingested rows from PostgreSQL, calls `inline_scorer.score_batch()`, and upserts results into `xai_store`
4. Subsequent `/api/v1/entity/{address}/explain` calls hit the updated in-memory store
5. We compute a lightweight **provisional** dossier:
   - Autoencoder MSE (~25ms whole batch via `app.services.feature_extractor`)
   - Heuristic rule checks (peeling chain candidate, equal outputs, Ransomwhere seed overlap)
   - Provisional composite: `clip(0.35 * anomaly + 0.15 * rules, 0, 1)` *(no GNN — requires Neo4j)*
   - `"provisional": true` flag so the UI displays an informative badge/banner

---

### 11.1 — `xai_store.py` Mutation API

**File:** [`backend/app/services/xai_store.py`](../backend/app/services/xai_store.py)

Add thread-safe upsert functions. Existing `load()`, `get_composite()`, `get_evidence()`, `get_shap()`, `get_subgraph()` remain unchanged.

```python
import threading
_store_lock = threading.Lock()

def upsert_composite(address: str, record: dict[str, Any]) -> None:
    """Thread-safe upsert into the in-memory composite store."""
    with _store_lock:
        _composite[address] = record

def upsert_evidence(address: str, record: dict[str, Any]) -> None:
    """Thread-safe upsert into the in-memory evidence store."""
    with _store_lock:
        _evidence[address] = record
```

- [x] Add `upsert_composite` and `upsert_evidence` to `xai_store.py` with `threading.Lock`
- [x] Verify existing `get_*` functions are unmodified

---

### 11.2 — Inline Scoring Service

**File:** `backend/app/services/inline_scorer.py` *(new file)*

**Implementation details:**
- Reuses existing `FEATURE_DIM`, `FEATURE_NAMES`, and `extract_features_batch` from [`backend/app/services/feature_extractor.py`](../backend/app/services/feature_extractor.py).
- At import / init: load `data/models/autoencoder_20260907.pt`, `data/models/scaler_20260907.pkl`, and `data/models/threshold_20260907.json`.
- At import / init: load `data/ransomwhere_seeds.json` into a set for O(1) seed lookup.
- Public function: `score_batch(rows: list[dict[str, Any]]) -> list[dict[str, Any]]`

**Rule checks per row:**
- **Seed overlap:** If any address in `input_addresses`/`output_addresses` is in the Ransomwhere seed set → append `"RANSOMWHERE_SEED_INPUT"` or `"RANSOMWHERE_SEED_OUTPUT"` to `triggered_rules`.
- **Peeling chain candidate:** If `output_count == 2` and `input_count == 1` → set `is_peeling_chain_candidate: true`.

**Output format per wallet address:**
```python
composite_record = {
    "address": addr,
    "anomaly_score": float(mse),
    "risk_score": 0.0,           # unknown — no GNN for newly ingested wallets
    "composite_score": float(provisional_score),
    "verdict": verdict,          # CRITICAL/HIGH/MEDIUM/LOW from provisional_score
    "triggered_rules": rules,
    "is_mixing": is_candidate,
    "provisional": True,
    "ts": row["ts"],
}
evidence_record = {
    "address": addr,
    "cluster_id": None,          # unknown — no Louvain for newly ingested wallets
    "anomaly_score": float(mse),
    "anomaly_percentile": float(percentile),  # vs the 17,020 indexed baseline
    "seed_wallet_proximity": 0.0,
    "mixing_hops": None,
    "triggered_rules": rules,
    "provisional": True,
}
```

- [x] Create `backend/app/services/inline_scorer.py` reusing `feature_extractor.py`
- [x] Create `backend/tests/test_inline_scorer.py` — 10 dummy rows, assert: output length == unique addresses, `anomaly_score >= 0`, `verdict` in `{CRITICAL,HIGH,MEDIUM,LOW}`, no exceptions
- [x] Run `pytest backend/tests/test_inline_scorer.py -v` — must pass

---

### 11.3 — `POST /ingest/sync/{task_id}` Endpoint

**File:** [`backend/app/routers/ingest.py`](../backend/app/routers/ingest.py)

**Endpoint spec:**
```
POST /ingest/sync/{task_id}
Auth: Bearer token optional / dev-token fallback
→ 404  task_id not found or not in SUCCESS state
→ 409  already synced within last 60s (idempotent guard)
→ 200  { "scored": N, "upserted": N, "skipped_existing": N }
```

**Query newly inserted transactions:**
```sql
SELECT * FROM transactions WHERE ingested_at > NOW() - INTERVAL '2 minutes'
```

**Idempotency guard:** Check Redis for `"sync_done:{task_id}"`. If exists → 409. After processing → set `"sync_done:{task_id}"` in Redis with TTL=3600.

- [x] Add `POST /ingest/sync/{task_id}` to `backend/app/routers/ingest.py`
- [x] Verify: first call → 200 with scored/upserted counts
- [x] Verify: second call → 409 `"already synced"`
- [x] Verify: `GET /entity/{new_wallet_address}/explain` immediately after sync → 200 with provisional record (not 404)

---

### 11.4 — Frontend: Auto-Call Sync After Ingest Success

**File:** [`frontend/src/components/IngestModal.tsx`](../frontend/src/components/IngestModal.tsx)

After polling confirms `status === 'SUCCESS'`, before calling `onSuccess()`, fire `POST /ingest/sync/{taskId}`. Accept 200 or 409. Fallback silently on any other error — pre-indexed wallets must never break.

```typescript
try {
  const syncResp = await fetch(`${API_BASE}/ingest/sync/${taskId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!syncResp.ok && syncResp.status !== 409) {
    console.warn('[IngestModal] sync returned', syncResp.status, '— proceeding anyway');
  }
} catch (err) {
  console.warn('[IngestModal] sync request failed:', err, '— proceeding anyway');
}
onSuccess(); // always refresh alert table
```

- [x] Add sync call to `IngestModal.tsx` with the try/catch fallback
- [x] End-to-end test: upload CSV with a wallet NOT in 17,020 indexed set → after ingest SUCCESS → clicking that wallet in AlertTable opens a provisional dossier (not a 404)

---

### 11.5 — UI: Provisional Dossier Banner in EntityDrawer

**File:** [`frontend/src/components/EntityDrawer.tsx`](../frontend/src/components/EntityDrawer.tsx)

When `response.provisional === true`:
- Show yellow alert banner at top: `bg-amber-50 border border-amber-200 text-amber-900` — Text: `"Provisional Analysis — This entity was ingested in the current session. SHAP waterfall and GNN subgraph are available only for pre-indexed entities. Anomaly score and rule detections are live."`
- Replace SHAP Waterfall section with: `"SHAP attribution unavailable for newly ingested entities — run full pipeline retraining to compute."`
- Replace GNN Subgraph section with equivalent explanation placeholder.
- Show Evidence Trail with available fields: `anomaly_score`, `anomaly_percentile`, `verdict`, `triggered_rules`, `is_mixing`. Render `cluster_id` and `seed_wallet_proximity` as `—` with tooltip `"Requires full Louvain/PageRank rerun"`.

Check must be `response.provisional === true` strictly. All 17,020 pre-indexed wallets have no `provisional` field and must render the full dossier unchanged.

- [x] Add provisional mode rendering to `EntityDrawer.tsx`
- [x] Verify: provisional wallets show banner, placeholders for SHAP/GNN, partial evidence trail
- [x] Verify: pre-indexed wallets render full SHAP + GNN dossier without regression

---

## ─────────────────────────────────────────
## STAGE 3 — MODEL ARCHITECTURE UPGRADE (DUAL TRANSFORMER SOTA) [Difficulty: High | Complexity: High]
## ─────────────────────────────────────────

> **Empirical Promotion Gate & Safe Staging Protocol:**
> 1. **Current Models Stay Active:** The existing, verified **Autoencoder + GraphSAGE** models remain the active, production-serving engine powering FastAPI, Celery, and Next.js throughout all Stage 3 development. Zero baseline model files or weights are deleted.
> 2. **Isolated Staging Evaluation:** The **Dual Transformer** architectures are implemented, trained, and benchmarked in isolated staging scripts without mutating current active models.
> 3. **Promotion Quality Gate ($F_1 \ge 0.88$):** The Dual Transformer will **ONLY** be promoted to active production if the Graph Transformer hits test set **$F_1 \ge 0.88$** and FT-Transformer demonstrates clean anomaly calibration on CPU ($<10\text{ms}$ latency).
> 4. **Fallback & Preservation Rule:** If the retrained Transformer fails to meet the $F_1 \ge 0.88$ gate, we strictly retain the battle-tested GraphSAGE + Autoencoder baseline as our production system, discard the promotion, and present GraphSAGE as the production architecture to guarantee a flawless, high-speed demo.

**Objective:** Upgrade core models to an end-to-end **Dual Transformer** deep learning architecture (**FT-Transformer** for tabular anomaly detection + **Multi-Head Relational Graph Transformer** for topological risk propagation). Maintains $<10\text{ms}$ CPU inference on Acer Aspire Lite, ultra-compact disk storage ($<5\text{MB}$ total), native attention heatmaps, and 100% pipeline compatibility.

---

### ML-1 — Tabular FT-Transformer (Feature Tokenizer Transformer)

**Files:** [`backend/app/ml/ft_transformer.py`](../backend/app/ml/ft_transformer.py) (new architecture) & [`backend/scripts/train_autoencoder.py`](../backend/scripts/train_autoencoder.py) / [`backend/scripts/explain_autoencoder.py`](../backend/scripts/explain_autoencoder.py)

**Mathematical Formulation:**
- **Feature Tokenization:** Each of the 18 tabular features $x_i$ is projected into embedding space $e_i = x_i W_i + b_i \in \mathbb{R}^{32}$.
- **Prepended `[CLS]` Token:** $E = [e_{\text{cls}}, e_1, e_2, \dots, e_{18}] \in \mathbb{R}^{19 \times 32}$.
- **Multi-Head Self-Attention:** 2 Transformer Encoder layers ($N_{\text{heads}}=4$, $d_{\text{model}}=32$, $d_{\text{ff}}=64$, dropout=0.1).
  $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
- **Reconstruction / Anomaly Head:** Linear projection from `[CLS]` token output to reconstruct normalized input tensor $\hat{X} \in \mathbb{R}^{18}$.
- **Anomaly Score:** Normalized Reconstruction MSE with native cross-feature attention weights.
- **Weights File:** `data/models/ft_transformer_YYYYMMDD.pt` (~300–500 KB)
- **Scaler File:** `data/models/ft_scaler_YYYYMMDD.pkl` (~2 KB)
- **Threshold File:** `data/models/ft_threshold_YYYYMMDD.json`
- **Attention Extraction:** Implements custom encoder with `need_weights=True`; exports cross-feature matrix $\mathbf{A}_{1:, 1:} \in \mathbb{R}^{18 \times 18}$ and `[CLS]` attribution $\mathbf{A}_{0, 1:} \in \mathbb{R}^{18}$.

- [x] Create `backend/app/ml/ft_transformer.py` implementing `FTTransformerAnomaly` PyTorch model class
- [x] Train in staging mode (`batch_size=512`, `epochs=30`, `patience=5`, <30s CPU) and export weights to `data/models/ft_transformer_*.pt`, `data/models/ft_scaler_*.pkl`, `data/models/ft_threshold_*.json`
- [x] Update `backend/scripts/explain_autoencoder.py` to extract feature attention matrices alongside SHAP values

---

### ML-2 — Multi-Head Relational Graph Transformer (`TransformerConv`)

**Files:** [`backend/app/ml/graph_transformer.py`](../backend/app/ml/graph_transformer.py) (new architecture) & [`backend/scripts/train_graph_transformer.py`](../backend/scripts/train_graph_transformer.py) / [`backend/scripts/explain_graphsage.py`](../backend/scripts/explain_graphsage.py)

**Relational Graph Attention Formulation:**
- Replaces static neighbor aggregation with Multi-Head Self-Attention over graph topology using `torch_geometric.nn.TransformerConv`:
  $$h_i^{(l+1)} = W_1 h_i^{(l)} + \sum_{j \in \mathcal{N}(i)} \alpha_{i,j} W_2 h_j^{(l)}$$
  $$\alpha_{i,j} = \text{softmax}_j \left( \frac{(W_3 h_i)^T (W_4 h_j + W_e e_{i,j})}{\sqrt{d}} \right)$$
- **Multi-Relation Edge Encoding:** Projects Wallet-to-Wallet relations: `0: CO_SPEND` (common input co-spend), `1: TX_FLOW` (2-hop SENDS $\to$ RECEIVES), `2: PEELING_FLOW` (2-hop flow with `is_mixing=true`), embedded via `nn.Embedding(3, edge_dim)`.
- **Loss:** Focal Loss ($\gamma = 2.0$, $\alpha = \text{neg/pos}$) for extreme class imbalance.
- **Weights File:** `data/models/graph_transformer_YYYYMMDD.pt` (~500 KB – 1.2 MB)
- **Index Map:** `data/wallet_index_map.json` (canonical JSON conforming to `settings.wallet_index_map_path`)

- [x] Create `backend/app/ml/graph_transformer.py` implementing `RelationalGraphTransformer` PyTorch Geometric model class with optional `edge_attr` fallback
- [x] Create staging evaluation runner `backend/scripts/train_graph_transformer.py` supporting CPU training (<60s) with 3 relational edge types
- [x] Export weights to `data/models/graph_transformer_*.pt` and verify `data/wallet_index_map.json`

---

### ML-3 — Staging Evaluation, Promotion Gate ($F_1 \ge 0.88$) & DB Sync

- [x] Execute staging evaluation on held-out test split: verify test set $F_1 \ge 0.88$ and CPU inference $<10\text{ms}$ with zero DB writes
- [x] Only upon PASSING gate: execute promotion script (`python backend/scripts/promote_models.py` or `--promote`) to sync scores to PostgreSQL, Neo4j, and rebuild `evidence_trails.json`
- [x] Verify `pytest backend/tests/` passes 100% with 0 regressions

---

### ML-4 — End-to-End Naming Synchronization & Provenance Guard

**Files:** [`frontend/src/components/EntityDrawer.tsx`](../frontend/src/components/EntityDrawer.tsx), [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx), [`backend/app/services/inline_scorer.py`](../backend/app/services/inline_scorer.py), [`backend/app/routers/entity.py`](../backend/app/routers/entity.py)

- **UI Naming Parity:** Replace hardcoded `"Autoencoder Reconstruction"` title in `EntityDrawer.tsx` with dynamic/explicit `"FT-Transformer Tabular Anomaly"` (and MSE reconstruction metrics).
- **Metadata Parity:** Update `layout.tsx` metadata and `EvidenceTrail` description strings to cite `"FT-Transformer anomaly detection and Relational Graph Transformer risk scoring"`.
- **Narrative Parity:** Update `_FEATURE_LABELS` and `_build_narrative` in `backend/app/routers/entity.py` to cite FT-Transformer and Relational Graph Transformer.
- **Backend Logging Parity:** Ensure `inline_scorer.py` and `xai_store.py` log `FTTransformerAnomaly` loaded weights with zero stale labels.
- **Zero Ambiguity Check:** Verify search across frontend and API responses yields 100% consistent transformer nomenclature when Stage 3 is active.

- [x] Synchronize UI titles and accordion headers in `EntityDrawer.tsx` to `FT-Transformer`
- [x] Synchronize application metadata in `layout.tsx` and `backend/app/routers/entity.py` narratives
- [x] Update `inline_scorer.py` and `xai_store.py` artifact loaders to support `ft_transformer_*.pt` and `graph_transformer_*.pt` with accurate logging

---

## ─────────────────────────────────────────
## STAGE 4 — JURY FLEX & ADVANCED FORENSIC VISUALIZATIONS [Difficulty: Medium | Complexity: Medium]
## ─────────────────────────────────────────

**Objective:** Elevate the frontend intelligence command center to visually showcase the Dual Transformer's multi-head attention capabilities, live architecture benchmarks, and court-admissible forensic export compliance (Section 65B Indian Evidence Act / BSA 2023). 100% backward-compatible with legacy Autoencoder/GraphSAGE artifacts.

---

### FLEX-1 — Interactive Feature-to-Feature Attention Matrix Heatmap

**File:** [`frontend/src/components/EntityDrawer.tsx`](../frontend/src/components/EntityDrawer.tsx) & [`frontend/src/components/AttentionHeatmap.tsx`](../frontend/src/components/AttentionHeatmap.tsx)

- Add segmented toggle tab in EntityDrawer: `[ 📊 SHAP Waterfall | 🧠 Transformer Attention Matrix ]`.
- Render an interactive $18 \times 18$ grid heatmap visualizing FT-Transformer cross-feature self-attention weights ($\alpha_{i,j}$).
- Dynamic cell illumination with tooltip detailing pairwise feature correlations (e.g. `fee_rate` $\leftrightarrow$ `output_entropy` $\leftrightarrow$ `asn`).
- Backward-compatibility guard: if `attention_matrix` is absent in XAI payload, gracefully default to standard SHAP Waterfall.

- [x] Create `frontend/src/components/AttentionHeatmap.tsx` SVG/Canvas matrix renderer
- [x] Wire segmented toggle inside `EntityDrawer.tsx`
- [x] Verify: clicking toggle switches seamlessly between SHAP Waterfall and Attention Heatmap

---

### FLEX-2 — Multi-Head Relational Attention Edge Glow & HUD Inspector

**File:** [`frontend/src/components/GraphCanvas.tsx`](../frontend/src/components/GraphCanvas.tsx)

- Scale D3 edge stroke opacity and luminous cyan glow dynamically via `link.attention_score ?? (link.is_explanatory ? 0.85 : 0.45)`.
- When an edge or node is pinned in GraphCanvas, the Inspector HUD displays a multi-head attention breakdown:
  - `Head 1: Co-Spending Flow` ($\alpha = 0.91$)
  - `Head 2: Multi-Hop Relational Flow` ($\alpha = 0.84$)
  - `Head 3: Seed Proximity Weight` ($\alpha = 0.78$)
- Backward-compatibility guard: if `attention_score` is undefined, fallback to standard binary `is_explanatory` cyan stroke.

- [x] Add continuous attention-weight stroke and glow filters to `GraphCanvas.tsx`
- [x] Add multi-head attention breakdown card to GraphCanvas Inspector HUD
- [x] Verify: high-attention laundering paths illuminate with variable intensity; graph physics remain locked at 60 FPS

---

### FLEX-3 — Model Architecture Provenance & Live Telemetry Badge

**File:** [`frontend/src/components/TopNav.tsx`](../frontend/src/components/TopNav.tsx) & [`frontend/src/components/EntityDrawer.tsx`](../frontend/src/components/EntityDrawer.tsx)

- Add tactile forensic badge in TopNav and EntityDrawer header:
  `⚡ Dual Transformer Engine (FT-Trans + RGT 4-Head) • 4.8ms CPU`
- Clicking badge displays a lightweight popover comparing Dual Transformer vs Baseline MLP benchmark metrics (F1 score, Peeling recall, inference latency, parameter footprint).
- Backward-compatibility guard: defaults to standard NTRO Forensic Ledger title if metadata is omitted.

- [x] Add architecture provenance chip and benchmark popover in `TopNav.tsx`
- [x] Add model provenance tag in `EntityDrawer.tsx`
- [x] Verify: badge renders cleanly across all viewport widths with zero layout shift

---

### FLEX-4 — Court-Admissible Section 65B Forensic Dossier Export

**File:** [`frontend/src/components/EntityDrawer.tsx`](../frontend/src/components/EntityDrawer.tsx) & [`frontend/src/lib/dossierExport.ts`](../frontend/src/lib/dossierExport.ts)

- Add "Export Certified Legal Dossier" button in EntityDrawer.
- Generates a court-admissible forensic certificate complying with **Section 65B Indian Evidence Act / BSA 2023**:
  - Cryptographic SHA-256 hash of raw ingested blockchain/network telemetry
  - Sovereign air-gap certificate and timestamped chain-of-custody log
  - Deterministic English narrative summary with rule violation citations
  - Mathematical SHAP & Attention weight attribution tables
- Allows 1-click JSON and print-formatted PDF export.

- [x] Implement `dossierExport.ts` generating Section 65B forensic certificate payloads
- [x] Wire export action to EntityDrawer "Download Dossier" button
- [x] Verify: generates signed, formatted forensic audit report in <100ms

---

## TASK COMPLETION TRACKER

### Stage 1: Duplicate File Upload Handling
- [x] `DUP-1` Backend 409 on duplicate file hash (Redis key check before enqueue)
- [x] `DUP-2a` `IngestModal.tsx` — red banner on 409, no polling, no `onSuccess()`
- [x] `DUP-2b` `IngestModal.tsx` — orange warning on all-rejected Celery result

### Stage 2: Phase 11 `[STRETCH]`
- [x] `11.1` `xai_store.py` — `upsert_composite`, `upsert_evidence`, and atomic `upsert_batch` with `threading.RLock`
- [x] `11.2` `inline_scorer.py` — clean forensic attribution, rescaled provisional scoring, `score_batch()` implemented
- [x] `11.2` `test_inline_scorer.py` — unit test passes (`pytest -v`)
- [x] `11.3` `POST /ingest/sync/{task_id}` — atomic SETNX, task-scoped txid query, DB 500 guard, UUID validation, new wallet dossier returns 200 with provisional: True
- [x] `11.4` `IngestModal.tsx` — auto-calls sync after SUCCESS with try/catch fallback
- [x] `11.5` `EntityDrawer.tsx` — provisional mode renders · pre-indexed wallets unaffected

### Stage 3: Model Architecture Upgrade (Dual Transformer SOTA)
- [x] `ML-1` `ft_transformer.py` & `train_ft_transformer.py` — FT-Transformer implementation (`data/models/ft_transformer_*.pt`, `data/models/ft_scaler_*.pkl`, `data/models/ft_threshold_*.json`)
- [x] `ML-2` `graph_transformer.py` & `train_graph_transformer.py` — Multi-Head Relational Graph Transformer (`data/models/graph_transformer_*.pt`)
- [x] `ML-3` Staging Evaluation, Promotion Gate ($F_1 \ge 0.88$) & DB Sync (<60s on CPU)
- [x] `ML-4` End-to-End Naming Synchronization — Update `EntityDrawer.tsx` titles, `layout.tsx` metadata, logs, and zero naming mismatch

### Stage 4: Jury Flex & Advanced Forensic XAI Visualizations [STRETCH]
- [x] `FLEX-1` `AttentionHeatmap.tsx` & `EntityDrawer.tsx` — 18x18 Feature Self-Attention Matrix Heatmap vs SHAP toggle
- [x] `FLEX-2` `GraphCanvas.tsx` — Multi-Head Relational Attention Edge Glow & HUD Inspector breakdown
- [x] `FLEX-3` `TopNav.tsx` & `EntityDrawer.tsx` — Model Provenance & Live Architecture Benchmark chip
- [x] `FLEX-4` `EntityDrawer.tsx` & `dossierExport.ts` — Section 65B (Indian Evidence Act / BSA 2023) Court-Admissible Dossier Export
- [x] `FLEX-5` `BENCHMARK_TRUTH.json` & Codebase-Wide Metric Reconciliation — Single canonical source of truth for all 4 models (Graph Transformer F1 0.9209, FT-Transformer F1 0.6972 / Prec 0.7379, GraphSAGE 0.9711 co-spend / 0.8696 multi-rel, Autoencoder 0.034618 threshold); eliminated drift in `ModelProvenanceModal.tsx`, `dossierExport.ts`, `config.py`, `.env.example`, `README.md`; verified zero regressions (196/196 pytest passed, 0 tsc errors)

### Stage 5: Tactical Surveillance UI/UX & 3D Hardware Elevation
- [x] `UI-1` `next.config.ts` — Disabled Next.js dev indicator overlay (`devIndicators: false`) preventing UI obstruction
- [x] `UI-2` `globals.css` & `FilterSidebar.tsx` — Painted-light 3D tactile elevation for Risk Verdict tiles with permanent unselected 3D rest styling and embossed active states
- [x] `UI-3` `globals.css` & `FilterSidebar.tsx` — Realistic spherical 3D LED indicator lenses with off-center reflection points and solid status glow (removed distracting ping animation)
- [x] `UI-4` `globals.css` & `FilterSidebar.tsx` — Recessed digital segment counters (`counter-3d-*`), 3D bezel card enclosure, and recessed light-pipe progress bar
- [x] `UI-5` `FilterSidebar.tsx` & `TopNav.tsx` — Single-line Stream Telemetry layout, streamlined sidebar top boundary, and cockpit hardware heuristic toggles; verified 0 tsc errors

### Stage 6: Knowledge Base, Documentation & RAG Master Platform
- [x] `DOC-1` `src/app/docs/ch1-mission-architecture/` — Chapter 1: The NTRO Mission, Tech Stack & System Topology (SVG pipeline topology, specifications & ports matrix, teammate FAQ)
- [x] `DOC-1.1` `src/app/docs/ch1-mission-architecture/` (Audit & Sync) — End-to-end fact-check and synchronization of Chapter 1 with ground-truth prototype code: 4.8ms CPU latency (BENCHMARK_TRUTH.json), FT-Transformer (18 tabular traits) + Relational Graph Transformer (4-head attention), 11,938 rows/s ingest, `[addr:<sha8>]` log pseudonymization, and Section 65B / Section 63 BSA legal proof.
- [x] `DOC-2` `src/app/docs/ch2-ingest-geoip-security/` — Chapter 2: Ingestion Engine, GeoIP & Anti-Duplicate Armor (bulk COPY 11,938 rows/s benchmark, DUP-1/DUP-2 visualizer, ingest FAQ)
- [x] `DOC-3` `src/app/docs/ch3-graph-entity-clustering/` — Chapter 3: Graph Topology & Entity Clustering (Neo4j GDS Louvain Q=0.4613, schema & Cypher inspector, CIOH clustering simulator)
- [x] `DOC-4` `src/app/docs/ch4-peeling-mixing-heuristics/` — Chapter 4: Laundering Pattern Detectors (peeling-chain simulator with 97.2% recall, CoinJoin matrix with 100% recall, heuristics FAQ)
- [x] `DOC-5` `src/app/docs/ch5-dual-transformer-ml/` — Chapter 5: Dual Transformer ML Engine (interactive 18x18 attention matrix simulator, FT-Transformer & Graph Transformer F1=0.9209 pipeline, canonical benchmark matrix)
- [x] `DOC-6` `src/app/docs/ch6-risk-engine-xai-legal/` — Chapter 6: Multi-Factor Risk Scoring, XAI & Section 65B Legal Dossier (live composite risk slider, SHAP waterfall, interactive Section 65B certificate viewer)
- [x] `DOC-7` `src/app/docs/ch7-online-inference-sync/` — Chapter 7: Live Post-Ingest Online Inference Phase 11 (FastAPI/Celery IPC process boundary visualizer, sync playground, provisional dossier explanation)
- [x] `DOC-8` `src/app/docs/ch8-command-center-dev-ops/` — Chapter 8: Forensic Command Center & Local Operator Guide (38px forensic alert table, interactive CLI command generator, troubleshooting accordion, ops FAQ)
- [x] `DOC-9` `src/app/assistant/` & `src/data/project_knowledge.json` & `src/lib/ragEngine.ts` & `src/app/api/ask/` — Subagent 9 Final Real-Time RAG Assistant (31 knowledge entries across 7 domains, <1.8ms in-memory air-gapped retrieval, Groq `llama-3.3-70b-versatile` AI synthesis route, global `FloatingAssistant` drawer embedded across all chapters; verified 0 tsc errors and 15/15 routes built).


