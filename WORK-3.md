# WORK-3.md — Active Execution Plan: Duplicate Hardening & Phase 11

**Project:** SIH26146 — AI-Powered NTRO Bitcoin AML Surveillance  
**Status as of 2026-09-09:** Phases 0–9.5 complete and verified. This file covers ALL remaining execution plans for the working prototype:
1. **Duplicate File Upload Hardening** (Defensive demo safety)
2. **Phase 11 — Live Post-Ingest Online Inference `[STRETCH]`** (Provisional live scoring)

Historical phases: Phases 0–8 in [`WORK-1.md`](file:///c:/Users/bari2/Desktop/SIH26146/WORK-1.md); Phase 9 & 9.5 in [`WORK-2.md`](file:///c:/Users/bari2/Desktop/SIH26146/WORK-2.md).

---

## CURRENT SYSTEM STATE

| Component | Status |
|---|---|
| PostgreSQL | 100,000 tx rows · anomaly_score · risk_score · is_mixing · cluster_id populated |
| Neo4j | 24,673 :Wallet · 100k :Transaction · all edges · seed_proximity written |
| XAI Artifacts | 17,020 evidence trails · 4,839 SHAP wallets · 500 GNN subgraphs · 17,020 composite scores |
| FastAPI | Docker port 8000 · All 52 Phase 9 assertions pass |
| Celery + Redis | Async ingest works · 1,000 rows in 563ms · Alert grid auto-refreshes |
| Next.js Frontend | Port 3000 · 7 components built and wired · 0 TypeScript errors |
| Air-gap | Fonts pre-cached as woff2 in `.next/static/media/` · Zero CDN requests at runtime |
| Ingest round-trip | Upload → Celery SUCCESS → alert table auto-refresh: **1,983ms total verified** |

> **Critical Gap:** Uploading a *new* file only writes rows to PostgreSQL. The XAI store is loaded once at startup from Phase 8 JSON artifacts. A freshly uploaded wallet not in the 17,020 indexed set returns 404 from `/entity/{address}/explain`. Phase 11 closes this gap with lightweight inline scoring.
>
> **Safe demo workaround:** Upload using wallet addresses already in the 17,020 indexed set — everything works end-to-end. Use this if Phase 11 is not wired in time.

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
│  3.3 ML-3: Fast CPU Retraining & Export (models/ft_*, models/graph_*)  │
│  3.4 ML-4: Attention Heatmap Extraction & Full Pipeline Verification   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ─────────────────────────────────────────
## STAGE 1 — DUPLICATE FILE UPLOAD HANDLING
## ─────────────────────────────────────────

**Current state:** If the same file is uploaded twice, it is processed twice. PostgreSQL's `txid` UNIQUE constraint catches and rejects row-level duplicates at `COPY` time, but the UI currently lacks explicit feedback (it looks like a silent 0-row ingest).

---

### DUP-1 — Backend: 409 on Duplicate File Hash

**File:** [`backend/app/routers/ingest.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/app/routers/ingest.py)

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

**File:** [`frontend/src/components/IngestModal.tsx`](file:///c:/Users/bari2/Desktop/SIH26146/frontend/src/components/IngestModal.tsx)

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
## ─────────────────────────────────────────

> **Decision gate:** Phase 11 is NOT strictly required for a successful SIH demo if using the safe demo flow (pre-indexed wallet addresses). Implement only if demo day is more than 2 days away. A static, reliable system beats a live-sync feature that risks breaking mid-demo.

**Goal:** After a new file is ingested, score new wallets inline (Autoencoder MSE + rule checks) and append them to the in-memory XAI store so the dossier drawer works immediately for newly uploaded wallets.

### Architecture Overview

The XAI store (`xai_store.py`) is loaded once at FastAPI startup. **Celery is a separate worker process with zero access to FastAPI's memory space.** The correct architectural approach:

1. Frontend polls `/ingest/status/{task_id}` until `SUCCESS`
2. Frontend calls `POST /ingest/sync/{task_id}`
3. **That endpoint runs inside the FastAPI process**, fetches the newly ingested rows from PostgreSQL, calls `inline_scorer.score_batch()`, and upserts results into `xai_store`
4. Subsequent `/entity/{address}/explain` calls hit the updated in-memory store
5. We compute a lightweight **provisional** dossier:
   - Autoencoder MSE (~25ms whole batch via `app.services.feature_extractor`)
   - Heuristic rule checks (peeling chain candidate, equal outputs, Ransomwhere seed overlap)
   - Provisional composite: `clip(0.35 * anomaly + 0.15 * rules, 0, 1)` *(no GNN — requires Neo4j)*
   - `"provisional": true` flag so the UI displays an informative badge/banner

---

### 11.1 — `xai_store.py` Mutation API

**File:** [`backend/app/services/xai_store.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/xai_store.py)

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

- [ ] Add `upsert_composite` and `upsert_evidence` to `xai_store.py` with `threading.Lock`
- [ ] Verify existing `get_*` functions are unmodified

---

### 11.2 — Inline Scoring Service

**File:** `backend/app/services/inline_scorer.py` *(new file)*

**Implementation details:**
- Reuses existing `FEATURE_DIM`, `FEATURE_NAMES`, and `extract_features_batch` from [`backend/app/services/feature_extractor.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/feature_extractor.py).
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

- [ ] Create `backend/app/services/inline_scorer.py` reusing `feature_extractor.py`
- [ ] Create `backend/tests/test_inline_scorer.py` — 10 dummy rows, assert: output length == unique addresses, `anomaly_score >= 0`, `verdict` in `{CRITICAL,HIGH,MEDIUM,LOW}`, no exceptions
- [ ] Run `pytest backend/tests/test_inline_scorer.py -v` — must pass

---

### 11.3 — `POST /ingest/sync/{task_id}` Endpoint

**File:** [`backend/app/routers/ingest.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/app/routers/ingest.py)

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

- [ ] Add `POST /ingest/sync/{task_id}` to `backend/app/routers/ingest.py`
- [ ] Verify: first call → 200 with scored/upserted counts
- [ ] Verify: second call → 409 `"already synced"`
- [ ] Verify: `GET /entity/{new_wallet_address}/explain` immediately after sync → 200 with provisional record (not 404)

---

### 11.4 — Frontend: Auto-Call Sync After Ingest Success

**File:** [`frontend/src/components/IngestModal.tsx`](file:///c:/Users/bari2/Desktop/SIH26146/frontend/src/components/IngestModal.tsx)

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

- [ ] Add sync call to `IngestModal.tsx` with the try/catch fallback
- [ ] End-to-end test: upload CSV with a wallet NOT in 17,020 indexed set → after ingest SUCCESS → clicking that wallet in AlertTable opens a provisional dossier (not a 404)

---

### 11.5 — UI: Provisional Dossier Banner in EntityDrawer

**File:** [`frontend/src/components/EntityDrawer.tsx`](file:///c:/Users/bari2/Desktop/SIH26146/frontend/src/components/EntityDrawer.tsx)

When `response.provisional === true`:
- Show yellow alert banner at top: `bg-amber-50 border border-amber-200 text-amber-900` — Text: `"Provisional Analysis — This entity was ingested in the current session. SHAP waterfall and GNN subgraph are available only for pre-indexed entities. Anomaly score and rule detections are live."`
- Replace SHAP Waterfall section with: `"SHAP attribution unavailable for newly ingested entities — run full pipeline retraining to compute."`
- Replace GNN Subgraph section with equivalent explanation placeholder.
- Show Evidence Trail with available fields: `anomaly_score`, `anomaly_percentile`, `verdict`, `triggered_rules`, `is_mixing`. Render `cluster_id` and `seed_wallet_proximity` as `—` with tooltip `"Requires full Louvain/PageRank rerun"`.

Check must be `response.provisional === true` strictly. All 17,020 pre-indexed wallets have no `provisional` field and must render the full dossier unchanged.

- [ ] Add provisional mode rendering to `EntityDrawer.tsx`
- [ ] Verify: provisional wallets show banner, placeholders for SHAP/GNN, partial evidence trail
- [ ] Verify: pre-indexed wallets render full SHAP + GNN dossier without regression

---

## ─────────────────────────────────────────
## STAGE 3 — MODEL ARCHITECTURE UPGRADE (DUAL TRANSFORMER SOTA)
## ─────────────────────────────────────────

**Objective:** Upgrade core models to an end-to-end **Dual Transformer** deep learning architecture (**FT-Transformer** for tabular anomaly detection + **Multi-Head Relational Graph Transformer** for topological risk propagation). Maintains $<10\text{ms}$ CPU inference on Acer Aspire Lite, ultra-compact disk storage ($<5\text{MB}$ total), native attention heatmaps, and 100% pipeline compatibility.

---

### ML-1 — Tabular FT-Transformer (Feature Tokenizer Transformer)

**File:** [`backend/scripts/train_autoencoder.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/scripts/train_autoencoder.py) & [`backend/scripts/explain_autoencoder.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/scripts/explain_autoencoder.py)

**Mathematical Formulation:**
- **Feature Tokenization:** Each of the 18 tabular features $x_i$ is projected into embedding space $e_i = x_i W_i + b_i \in \mathbb{R}^{32}$.
- **Prepended `[CLS]` Token:** $E = [e_{\text{cls}}, e_1, e_2, \dots, e_{18}] \in \mathbb{R}^{19 \times 32}$.
- **Multi-Head Self-Attention:** 2 Transformer Encoder layers ($N_{\text{heads}}=4$, $d_{\text{model}}=32$, $d_{\text{ff}}=64$, dropout=0.1).
  $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
- **Reconstruction / Anomaly Head:** Linear projection from `[CLS]` token output to reconstruct normalized input tensor $\hat{X} \in \mathbb{R}^{18}$.
- **Anomaly Score:** Normalized Reconstruction MSE with native cross-feature attention weights.
- **Weights File:** `models/ft_transformer_anomaly.pt` (~300–500 KB)
- **Scaler File:** `models/ft_scaler.pkl` (~2 KB)

- [ ] Implement `FTTransformerAnomaly` PyTorch model class with Feature Tokenizer and Multi-Head Attention in `train_autoencoder.py`
- [ ] Train on synthetic dataset (<30s CPU) and export weights to `models/ft_transformer_anomaly.pt` and `models/ft_scaler.pkl`
- [ ] Update `backend/scripts/explain_autoencoder.py` to extract feature attention matrices alongside SHAP values

---

### ML-2 — Multi-Head Relational Graph Transformer (`TransformerConv`)

**File:** [`backend/app/ml/graphsage.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/app/ml/graphsage.py) & [`backend/scripts/train_graphsage.py`](file:///c:/Users/bari2/Desktop/SIH26146/backend/scripts/train_graphsage.py)

**Relational Graph Attention Formulation:**
- Replaces static neighbor aggregation with Multi-Head Self-Attention over graph topology using `torch_geometric.nn.TransformerConv`:
  $$h_i^{(l+1)} = W_1 h_i^{(l)} + \sum_{j \in \mathcal{N}(i)} \alpha_{i,j} W_2 h_j^{(l)}$$
  $$\alpha_{i,j} = \text{softmax}_j \left( \frac{(W_3 h_i)^T (W_4 h_j + W_e e_{i,j})}{\sqrt{d}} \right)$$
- **Multi-Relation Edge Encoding:** Injects edge types (`CO_SPEND`, `TRANSFERRED_TO`, `PEELING_CHAIN`) as relational edge embeddings $W_e e_{i,j}$.
- **Loss:** Focal Loss ($\gamma = 2.0$, $\alpha = \text{neg/pos}$) for extreme class imbalance.
- **Weights File:** `models/graph_transformer_risk.pt` (~500 KB – 1.2 MB)
- **Lookup File:** `models/graph_address_map.pkl` (~1.5 MB – 2.5 MB)

- [ ] Implement `RelationalGraphTransformer` PyTorch Geometric model class using `TransformerConv` in `backend/app/ml/graphsage.py`
- [ ] Update `train_graphsage.py` to train Graph Transformer on CPU (<60s) with edge features
- [ ] Export weights to `models/graph_transformer_risk.pt` and lookup map to `models/graph_address_map.pkl`

---

### ML-3 — Retrain & Verify Pipeline Invariants

- [ ] Run `python backend/scripts/train_autoencoder.py` → verify FT-Transformer anomaly scores calibrate cleanly to $[0, 1]$ in PostgreSQL
- [ ] Run `python backend/scripts/train_graphsage.py` → verify Graph Transformer test set F1 $\ge 0.88$ and risk scores populate PostgreSQL + Neo4j
- [ ] Run `python backend/scripts/build_evidence_trails.py` → verify composite scores and plain-English narratives update seamlessly
- [ ] Verify `pytest backend/tests/` passes 100% with 0 regressions

---

## TASK COMPLETION TRACKER

### Stage 1: Duplicate File Upload Handling
- [x] `DUP-1` Backend 409 on duplicate file hash (Redis key check before enqueue)
- [x] `DUP-2a` `IngestModal.tsx` — red banner on 409, no polling, no `onSuccess()`
- [x] `DUP-2b` `IngestModal.tsx` — orange warning on all-rejected Celery result

### Stage 2: Phase 11 `[STRETCH]`
- [ ] `11.1` `xai_store.py` — `upsert_composite` + `upsert_evidence` with `threading.Lock`
- [ ] `11.2` `inline_scorer.py` — reuses `feature_extractor.py`, `score_batch()` implemented
- [ ] `11.2` `test_inline_scorer.py` — unit test passes (`pytest -v`)
- [ ] `11.3` `POST /ingest/sync/{task_id}` — 200 on first call · 409 on repeat · new wallet dossier returns 200
- [ ] `11.4` `IngestModal.tsx` — auto-calls sync after SUCCESS with try/catch fallback
- [ ] `11.5` `EntityDrawer.tsx` — provisional mode renders · pre-indexed wallets unaffected

### Stage 3: Model Architecture Upgrade (Dual Transformer SOTA)
- [ ] `ML-1` `train_autoencoder.py` — FT-Transformer implementation (`models/ft_transformer_anomaly.pt`, `models/ft_scaler.pkl`)
- [ ] `ML-2` `graphsage.py` & `train_graphsage.py` — Multi-Head Relational Graph Transformer (`models/graph_transformer_risk.pt`, `models/graph_address_map.pkl`)
- [ ] `ML-3` Retrain models on synthetic + Ransomwhere dataset (<60s on CPU) and export `.pt`/`.pkl` artifacts
- [ ] `ML-4` Verify Attention Heatmaps + SHAP + GNNExplainer compatibility and run full test suite with 0 regressions

---

## VERIFICATION LOG

*(Append entries as tasks complete — format: `YYYY-MM-DD · [task ID] · what was done · how verified`)*
- 2026-09-09 · [DUP-1, DUP-2a, DUP-2b] · Implemented Redis SHA-256 duplicate file upload detection with HTTP 409 HTTPException in backend/app/routers/ingest.py (24h TTL) and dual UI banners in IngestModal.tsx (red for 409 duplicate file, amber warning for all-rejected rows with alert table refresh) · Verified via 4 new unit tests in test_dup_ingest.py (202 caching, 409 conflict with original_task_id, defensive Redis error fallbacks), 15 passing ingest tests in test_ingest.py, and clean Next.js build with 0 TypeScript errors.
- 2026-09-09 · [DUP-1, DUP-2 REVIEW FIXES] · Hardened duplicate handling following adversarial staff review: in-stream SHA-256 calculation avoiding redundant disk I/O, Redis socket/connect timeouts (2.0s), incrementing total_rejected on DB COPY failures in Celery task, fixed IngestModal polling hoisting/ESLint errors, and defensive duplicate condition avoiding false success on 0-row ingests · Verified via 5/5 passing pytest in test_dup_ingest.py, 15/15 passing test_ingest.py, 0 ESLint errors/warnings on Stage 1 frontend files, and successful Next.js build.
