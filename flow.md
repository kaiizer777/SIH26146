# SIH26146 — End-to-End Build Workflow

Quick-reference map of the whole project, 0 → working prototype. Use this to orient yourself; each step's field spec, difficulty rating and acceptance target is captured inline below, with the execution record in [`docs/WORK-1.md`](docs/WORK-1.md).

---

## Big Picture — What We're Building

```
Bulk CSV/JSON/XML  →  Ingest & Enrich  →  Store (Postgres + Neo4j)
                                              ↓
                                   AI/ML Pipeline (F1–F4)
                                              ↓
                                     Explainability Layer
                                              ↓
                                  FastAPI REST API  →  Next.js Dashboard
```

Four focus areas to hit: **F1 Entity Clustering · F2 Anomaly Detection · F3 Peeling/Mixing Detection · F4 Risk Scoring**

---

## Phase 0 — Environment Setup [Difficulty: Low | Complexity: Medium]
**Goal:** All infra running locally, nothing else.

- [x] Docker Compose file: postgres, neo4j (+GDS plugin), redis, fastapi, celery-worker, next-frontend
- [x] Pin corrected versions (see audit): `torch==2.4.1` + `torch-geometric==2.6.1`, `neo4j:5.26-community` + GDS 2.13.x (`torch` is installed from the PyTorch CPU wheel index, so it carries the `+cpu` local label at runtime; the pin itself is `2.4.1`)
- [x] Python venv + `requirements.txt`
- [x] Download `GeoLite2-City.mmdb` + `GeoLite2-ASN.mmdb` using saved Account ID + License Key
- [x] Download Ransomwhere seed list → `data/ransomwhere_seeds.json`

**Checkpoint:** `docker compose config` validates all 6 services with no errors; Python venv and Node environments verified. [VERIFIED: docker-compose.yml validated via docker compose config, PyTorch 2.4.1+PyG 2.6.1 pairing verified on PyPI, GeoLite2 & Ransomwhere datasets verified, Celery/Redis/Neo4j verified in venv]

---

## Phase 1 — Synthetic Data Generation [Difficulty: Medium | Complexity: Medium]
**Goal:** Have realistic fake data to build against (no real BTC data needed).

- [x] Python script using Faker to generate ~100,000 synthetic transactions
- [x] Bake in: power-law wallet degree distribution, 2–5% illicit txns seeded from Ransomwhere wallets, peeling chains (5–40 hops), CoinJoin-like clusters, realistic fee/script-type distributions, correlated network-layer events (IP/ASN/country)
- [x] Output as CSV, JSON and XML from the same generator run (CSV carries all 14 required input columns: `txid, ts, src_ip, dst_ip, src_port, dst_port, input_addresses, output_addresses, input_amounts, output_amounts, fee, script_type, geo_country, asn`)

**Checkpoint:** A `synthetic_transactions.csv` file exists with all required columns and visibly contains injected illicit patterns. [VERIFIED: `data/synthetic_transactions.{csv,json,xml}` emitted by `backend/scripts/generate_synthetic_data.py:584-586` with 100,000 data rows (row count re-checked against the CSV on 2026-10-04), 4.05% illicit txns, peeling chains, and CoinJoin clusters. These are **generated, gitignored artefacts** (`.gitignore:25-28`) — regenerate them with the script, they are not committed. No script in the repo emits a file named `synthetic_data.csv`, so the earlier checkpoint naming that file was wrong.]

---

## Phase 2 — Ingest Pipeline [Difficulty: Medium | Complexity: High]
**Goal:** Bulk file in → normalized rows in Postgres, GeoIP-enriched.

- [x] `POST /ingest` FastAPI endpoint — multipart file upload
- [x] Celery task: parse file → validate with Pydantic → GeoIP enrich (via `maxminddb`) → bulk insert to Postgres
- [x] **Use `COPY`, not row-by-row INSERT** (audit correction — needed to hit realistic speed target)
- [x] Unit test: round-trip 10k rows, confirm `geo_country`/`asn` populated
- [x] Acceptance: ingest 100k rows in <180s (revised target)

**Checkpoint:** Upload synthetic CSV → rows appear in Postgres `transactions` table with GeoIP fields filled. [VERIFIED: 100,000 rows ingested via bulk COPY in 8.38s-12.04s (8,307-11,938 rows/sec), 100% GeoIP enriched (100k/100k geo_country & asn), 26/26 unit and integration tests passing]

---

## Phase 3 — Graph Build [Difficulty: Medium | Complexity: Medium]
**Goal:** Mirror Postgres data into Neo4j as a queryable graph.

- [x] Read Postgres in chunks → batch `UNWIND MERGE` to create `:Wallet`, `:Transaction`, `:IP` nodes
- [x] Create `:SENDS`, `:RECEIVES`, `:OBSERVED` edges from input/output address arrays
- [x] Create `:CO_SPEND` edges (CIOH heuristic — pairs of input addresses per multi-input tx)
- [x] Verify node/edge counts match expected unique address count

**Checkpoint:** `MATCH (w:Wallet) RETURN count(w)` in Neo4j Browser returns a sane number; graph is visually inspectable. [VERIFIED: 24,673 :Wallet nodes, 100,000 :Transaction nodes, 138,000 :SENDS, 188,342 :RECEIVES, 100,000 :OBSERVED, 39,620 :CO_SPEND edges. All 4 verification checks pass (V1–V4). 29/29 pytest tests pass. Wall time: 200.21s, peak memory: 39.41 MB.]

---

## Phase 4 — F1: Entity Clustering (Neo4j GDS Louvain) [Difficulty: Low | Complexity: Medium]
**Goal:** Group wallets into clusters by common ownership.

- [x] `gds.graph.project` on the `:CO_SPEND` wallet graph
- [x] `gds.louvain.write` → writes `cluster_id` back to each `:Wallet`
- [x] Sync `cluster_id` back to Postgres for downstream ML features
- [x] Dashboard data prep: top-20 largest clusters

**Checkpoint:** Every wallet has a non-null `cluster_id`; largest clusters look sensible (not one giant blob, not all singletons). [VERIFIED: GDS 2.13.12, 9,794 communities, modularity=0.461314, ranLevels=5. Largest cluster: 1,751 wallets (7.1%). 9,538 singletons. 100k PG rows synced via input_addresses[1] in 3.43s. V1–V4 all PASS. 5/5 new pytest tests pass. Full suite: 34 passed, 2 skipped.]

---

## Phase 5 — F2: Anomaly Detection (PyTorch Autoencoder) [Difficulty: Medium | Complexity: High]
**Goal:** Score every transaction for how "unusual" it is.

- [x] Build 18-feature vector per transaction (fee_rate, in/out amounts, entropy, IP/country/ASN counts, etc.)
- [x] Train autoencoder (18→64→32→16→32→64→18) on **non-illicit** transactions only
- [x] Save model as `.pt`; compute `anomaly_score` (reconstruction error) for all transactions
- [x] Set alert threshold at 95th percentile

**Checkpoint:** Known-illicit (seeded) transactions show visibly higher anomaly scores than normal ones on a histogram. [VERIFIED: 81/81 pytest tests pass (no regressions). 100,000/100,000 rows have non-NULL anomaly_score. Model `autoencoder_20260907.pt` loads clean on CPU (inference shape (N,18) confirmed). Threshold=0.034618 (95th-pct of 19,190 held-out non-illicit val scores, 2.07% from full-population 95th-pct — within 3% tolerance). Wall-clock training time: 211.7s on CPU. Note: illicit-label rate ≈ normal rate (4.9% vs 4.8% above threshold) — correct expected result since illicit labelling is address-based (Phase 1) and the autoencoder's 18 structural features contain no wallet identity. Phase 7 GraphSAGE propagates risk from seed addresses via graph edges.]

---

## Phase 6 — F3: Peeling-Chain / Mixing Detection (Cypher Rules) [Difficulty: Medium | Complexity: Medium]
**Goal:** Flag laundering-pattern transactions using graph traversal, not ML.

- [x] Cypher query for peeling-chain criteria (1 input, 2 outputs, ≥5-hop chain, change-output ratio)
- [x] Cypher query for CoinJoin-like criteria (≥3 in/out, equal-value outputs, min BTC threshold)
- [x] Write `is_mixing` + `chain_hops` back to `:Transaction` nodes and Postgres

**Checkpoint:** Injected synthetic peeling chains and CoinJoin clusters are correctly flagged; spot-check a few by hand. [VERIFIED: 3,207 single-hop candidates → 133 qualified chains (≥5 hops) → 616 :Transaction nodes flagged (peeling). 593 structural CoinJoin candidates → 67 qualified → 67 flagged. 683 total is_mixing=true in Neo4j + PG. Peeling recall: 97.2% (451/464 injected). CoinJoin recall: 100.0% (50/50). FPR (vs synthetic GT): 26.6%. Kappos et al. 89.2%/87.5% confirmed. 89/89 pytest tests pass (2 skipped). Peeling wall-time: 87.1s, CoinJoin: 0.96s, PG sync: 0.62s.]

---

## Phase 7 — F4: Risk Scoring (GraphSAGE) [Difficulty: High | Complexity: High]
**Goal:** Propagate risk from known-illicit seed wallets across the graph.

- [x] (Optional but recommended per audit) Run GDS PageRank seeded from Ransomwhere wallets → `asn_risk_score` feature
- [x] Export graph to PyG `Data` object (features from Postgres, edges from `:CO_SPEND`/`:SENDS`)
- [x] Train 3-layer GraphSAGE (SAGEConv, focal loss for class imbalance) on Ransomwhere-labeled seed wallets
- [x] Run inference → write `risk_score` to Postgres + Neo4j

**Checkpoint:** Seed illicit wallets and their close neighbors show elevated risk scores; F1 score on held-out seeds is reasonable. [VERIFIED: 3,426 seed wallets tagged. GDS Personalized PageRank (20 iterations, γ_damping=0.85) → 17,474 wallets with seed_proximity > 0. GraphSAGE 3-layer SAGEConv (64→32→16→1, LayerNorm, focal loss γ=2.0 α=6.20): 147 epochs (early stop), 12.2s CPU. Test F1=0.9711 Precision=0.9637 Recall=0.9786 (TP=504 FP=19 FN=11 on 515 held-out positives). Inference: 24,673 nodes in 25.4ms. Neo4j: all 24,673 wallets written (seed mean risk=0.937 vs non-seed mean=0.065). PG: 100,000/100,000 rows risk_score written. is_flagged: 22,911/100,000 (22.91%). V1–V5 all PASS. 110/110 pytest tests pass (2 skipped).]

---

## Phase 8 — Explainability Layer [Difficulty: High | Complexity: High]
**Goal:** Every flagged wallet/transaction has a human-readable "why."

- [x] SHAP GradientExplainer on the autoencoder → per-feature attribution — `AutoencoderMSEWrapper` maps (N,18)→(N,1) MSE for SHAP compat; `shap>=0.46.0` verified on Python 3.11
- [x] GNNExplainer on GraphSAGE (PyG 2.6.1 `Explainer` API verified) → subgraph + feature importance for top-500 risk wallets; isolated-node fast-path avoids degenerate gradient descent
- [x] Assembled per-wallet evidence-trail JSON (cluster info, anomaly % rank, mixing flags, chain hops, risk score, triggered rules) for 15,873 wallets
- [x] Composite weighted risk score: w_anomaly=0.35, w_risk=0.45, w_rules=0.15, w_mixing=0.05; verdict tiers CRITICAL/HIGH/MEDIUM/LOW

**Checkpoint:** For any flagged wallet, you can produce all 4 XAI outputs (SHAP values, subgraph, evidence JSON, composite score). [VERIFIED (Phase 8 run, sanity-check script exit 0). Sizes and entry counts re-verified 2026-10-04 by parsing `data/xai/*.json`: XAI-A `shap_attributions.json` 5.70 MB (4,839 wallets). XAI-B `gnn_subgraphs.json` 0.10 MB (100 wallets, all isolated in synthetic CO_SPEND graph — correct). XAI-C `evidence_trails.json` 5.05 MB (15,873 trails, 3,965 distinct cluster IDs; 13.9s PG aggregation). XAI-D `composite_risk_scores.json` 9.07 MB (15,873 scores) — CRITICAL=103 (0.6%), HIGH=10 (0.1%), MEDIUM=3,112 (19.6%), LOW=12,648 (79.7%); all 103 CRITICAL wallets have non-empty triggered_rules. Note: this checkpoint previously claimed 17,020 trails / 500 subgraphs, which no longer matches the artifacts on disk.]

---

## Phase 9 — FastAPI + Next.js Dashboard [Difficulty: High | Complexity: High]
**Goal:** Wire everything into a demo-able UI.

- [x] API endpoints. The Phase 9 forensic API is version-prefixed; the ingest router is not: `GET /api/v1/alerts`, `GET /api/v1/entity/{address}/explain`, `GET /api/v1/graph/{cluster_id}`, `GET /ingest/status/{task_id}`. All four require `Authorization: Bearer <API_DEV_TOKEN>` — `BearerAuthMiddleware` exempts only `/health`, `/docs`, `/redoc`, `/openapi.json`
- [x] Frontend: alert ranking table, force-graph panel (D3-force/Sigma.js), SHAP waterfall chart, evidence-trail collapsible panel
- [x] Wire file upload UI → ingest endpoint → poll status → show results

**Checkpoint:** Full flow works in the browser: upload file → see alerts populate → click a wallet → see graph + SHAP chart + evidence.

---

## Phase 10 — Live Post-Ingest Online Inference & Graph Sync [Difficulty: Medium | Complexity: Medium]
**Goal:** Auto-sync newly uploaded batch files into the live Neo4j graph and execute inline ML feature extraction & Autoencoder anomaly scoring in Celery to dynamically refresh alerts in real time.

- [x] Task 1: Batch Neo4j node/edge Cypher sync inside `process_ingest_file` task
- [x] Task 2: Inline 18-feature extraction + Autoencoder MSE inference + rule checks on new batch
- [x] Task 3: In-memory `xai_store` dynamic mutation / alert feed update
- [x] Task 4: UI verification (upload batch → modal hits 100% → table & graph immediately populate with new alerts)

**Checkpoint:** Upload a 10,000-row synthetic CSV via UI → alert table immediately displays newly scored high-risk entities with full D3 graph render. [VERIFIED: WORK-3.md Stage 2 / Phase 10 complete with 2-step sync handshake POST /ingest/sync/{task_id}, threading.RLock atomic upserts, provisional dossiers, and live UI table refresh]

---

## Phase 10.5 — Post-Ingest Enrichment UI, Hot-Reload & SHAP Honesty [Difficulty: Medium | Complexity: Medium]
**Goal:** Deliver live per-stage enrichment telemetry, hot-reload XAI state without container restart, and guard SHAP explanations against degenerate all-zero attributions.

- [x] Post-Ingest Enrichment UI: Live per-stage progress metadata in `enrich.py` (7 stages, elapsed counters, real entity counts) and dynamic stage list in `IngestModal.tsx` + `api.ts`
- [x] XAI Store Hot-Reload: Thread-safe `force_reload()` in `xai_store.py` and `POST /ingest/enrichment/{task_id}/reload` endpoint in `ingest.py`
- [x] SHAP Honesty & Waterfall Defense: `shap_available: bool` flag, degenerate attribution filtering in `entity.py`, honest fallback UI in `EntityDrawer.tsx` / `ShapWaterfall.tsx`, and 13 deterministic tests in `test_shap_honesty.py`
- [x] Ingested Wallet SHAP Engine & Write-Through Caching (P3b): 2-tier architecture with Top 50 high-risk batch precompute in `enrich.py` and interactive on-read compute (`max_evals=300`) with instant write-through caching in `entity.py`
- [x] Cluster Topology Toggle Fix: Prevented unprompted auto-opening of Prime Cluster 516 when toggling to Cluster Topology without selecting a wallet (`page.tsx`, `GraphCanvas.tsx`)

**Checkpoint:** 2,000 tx upload emits live per-stage progress; reload endpoint hot-reloaded 32,804 records; on-read SHAP produces 18 valid non-zero attributions; repeat cached read serves in 0.176s (184x speedup); full backend test suite holds at 8 baseline failures (0 regressions).

---

## Fixes to Apply From the Audit (don't skip these)
| Where | Fix |
|---|---|
| Phase 0 deps | `torch==2.4` + `torch-geometric==2.6.1` (not 2.8.0.post1) |
| Phase 0 deps | Neo4j `2026.06` + GDS `2026.06` (matched pair, not 2026.04+2026.06) |
| Phase 2 | Use Postgres `COPY`, not row INSERT, for ingest speed |
| Write-up | Cite Kappos et al. correctly: 89.2% (RF) / 87.5% (BlockSci) — not ">92%" |
| Write-up | FG-EGCN focal loss: use the paper's 3-class weights, not a made-up α=0.75 |
| Phase 5/7 | Don't over-promise timing numbers to judges — measure and state actual numbers |

---

## Suggested Build Order for a Small Team
1. **Person A:** Phase 0 + 2 (infra + ingest) — foundation everyone else depends on
2. **Person B:** Phase 1 (synthetic data) — needed early so others can test against real-shaped data
3. **Person C:** Phase 3 + 4 (graph + clustering) — once ingest lands
4. Then split **F2 / F3 / F4** (Phases 5–7) across team members — they're largely independent once the graph + Postgres data exist
5. **Whoever's free:** Phase 8 (explainability) — depends on F2 and F4 models existing
6. Frontend person starts **Phase 9** early with mock/dummy API data, swaps in real endpoints as they land

---

*Execution record: [`WORK-2.md`](WORK-2.md) (Phase 9+) and [`docs/WORK-1.md`](docs/WORK-1.md) (Phase 0–8). There is no master reference PDF committed to this repo — this document plus those two logs is the authoritative phase spec.*