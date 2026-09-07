# SIH26146 — End-to-End Build Workflow

Quick-reference map of the whole project, 0 → working prototype. Use this to orient yourself; the Master Reference Document is the detailed spec for each step.

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
- [x] Pin corrected versions (see audit): `torch==2.4.1+cpu` + `torch-geometric==2.6.1`, `neo4j:5.26-community` + GDS 2.13.x
- [x] Python venv + `requirements.txt`
- [x] Download `GeoLite2-City.mmdb` + `GeoLite2-ASN.mmdb` using saved Account ID + License Key
- [x] Download Ransomwhere seed list → `data/ransomwhere_seeds.json`

**Checkpoint:** `docker compose config` validates all 6 services with no errors; Python venv and Node environments verified. [VERIFIED: docker-compose.yml validated via docker compose config, PyTorch 2.4.1+PyG 2.6.1 pairing verified on PyPI, GeoLite2 & Ransomwhere datasets verified, Celery/Redis/Neo4j verified in venv]

---

## Phase 1 — Synthetic Data Generation [Difficulty: Medium | Complexity: Medium]
**Goal:** Have realistic fake data to build against (no real BTC data needed).

- [x] Python script using Faker to generate ~100,000 synthetic transactions
- [x] Bake in: power-law wallet degree distribution, 2–5% illicit txns seeded from Ransomwhere wallets, peeling chains (5–40 hops), CoinJoin-like clusters, realistic fee/script-type distributions, correlated network-layer events (IP/ASN/country)
- [x] Output as CSV (matches the minimum input field spec in §1 of master doc)

**Checkpoint:** A `synthetic_data.csv` file exists with all required columns and visibly contains injected illicit patterns. [VERIFIED: data/synthetic_data.csv & data/synthetic_transactions.{csv,json,xml} generated with 100,000 rows, 4.05% illicit txns, peeling chains, and CoinJoin clusters]

---

## Phase 2 — Ingest Pipeline [Difficulty: Medium | Complexity: High]
**Goal:** Bulk file in → normalized rows in Postgres, GeoIP-enriched.

- [ ] `POST /ingest` FastAPI endpoint — multipart file upload
- [ ] Celery task: parse file → validate with Pydantic → GeoIP enrich (via `maxminddb`) → bulk insert to Postgres
- [ ] **Use `COPY`, not row-by-row INSERT** (audit correction — needed to hit realistic speed target)
- [ ] Unit test: round-trip 10k rows, confirm `geo_country`/`asn` populated
- [ ] Acceptance: ingest 100k rows in <180s (revised target)

**Checkpoint:** Upload synthetic CSV → rows appear in Postgres `transactions` table with GeoIP fields filled.

---

## Phase 3 — Graph Build [Difficulty: Medium | Complexity: Medium]
**Goal:** Mirror Postgres data into Neo4j as a queryable graph.

- [ ] Read Postgres in chunks → batch `UNWIND MERGE` to create `:Wallet`, `:Transaction`, `:IP` nodes
- [ ] Create `:SENDS`, `:RECEIVES`, `:OBSERVED` edges from input/output address arrays
- [ ] Create `:CO_SPEND` edges (CIOH heuristic — pairs of input addresses per multi-input tx)
- [ ] Verify node/edge counts match expected unique address count

**Checkpoint:** `MATCH (w:Wallet) RETURN count(w)` in Neo4j Browser returns a sane number; graph is visually inspectable.

---

## Phase 4 — F1: Entity Clustering (Neo4j GDS Louvain) [Difficulty: Low | Complexity: Medium]
**Goal:** Group wallets into clusters by common ownership.

- [ ] `gds.graph.project` on the `:CO_SPEND` wallet graph
- [ ] `gds.louvain.write` → writes `cluster_id` back to each `:Wallet`
- [ ] Sync `cluster_id` back to Postgres for downstream ML features
- [ ] Dashboard data prep: top-20 largest clusters

**Checkpoint:** Every wallet has a non-null `cluster_id`; largest clusters look sensible (not one giant blob, not all singletons).

---

## Phase 5 — F2: Anomaly Detection (PyTorch Autoencoder) [Difficulty: Medium | Complexity: High]
**Goal:** Score every transaction for how "unusual" it is.

- [ ] Build 18-feature vector per transaction (fee_rate, in/out amounts, entropy, IP/country/ASN counts, etc.)
- [ ] Train autoencoder (18→64→32→16→32→64→18) on **non-illicit** transactions only
- [ ] Save model as `.pt`; compute `anomaly_score` (reconstruction error) for all transactions
- [ ] Set alert threshold at 95th percentile

**Checkpoint:** Known-illicit (seeded) transactions show visibly higher anomaly scores than normal ones on a histogram.

---

## Phase 6 — F3: Peeling-Chain / Mixing Detection (Cypher Rules) [Difficulty: Medium | Complexity: Medium]
**Goal:** Flag laundering-pattern transactions using graph traversal, not ML.

- [ ] Cypher query for peeling-chain criteria (1 input, 2 outputs, ≥5-hop chain, change-output ratio)
- [ ] Cypher query for CoinJoin-like criteria (≥3 in/out, equal-value outputs, min BTC threshold)
- [ ] Write `is_mixing` + `chain_hops` back to `:Transaction` nodes and Postgres

**Checkpoint:** Injected synthetic peeling chains and CoinJoin clusters are correctly flagged; spot-check a few by hand.

---

## Phase 7 — F4: Risk Scoring (GraphSAGE) [Difficulty: High | Complexity: High]
**Goal:** Propagate risk from known-illicit seed wallets across the graph.

- [ ] (Optional but recommended per audit) Run GDS PageRank seeded from Ransomwhere wallets → `asn_risk_score` feature
- [ ] Export graph to PyG `Data` object (features from Postgres, edges from `:CO_SPEND`/`:SENDS`)
- [ ] Train 3-layer GraphSAGE (SAGEConv, focal loss for class imbalance) on Ransomwhere-labeled seed wallets
- [ ] Run inference → write `risk_score` to Postgres + Neo4j

**Checkpoint:** Seed illicit wallets and their close neighbors show elevated risk scores; F1 score on held-out seeds is reasonable.

---

## Phase 8 — Explainability Layer [Difficulty: High | Complexity: High]
**Goal:** Every flagged wallet/transaction has a human-readable "why."

- [ ] SHAP DeepExplainer on the autoencoder → per-feature attribution (waterfall chart data) — **keep model as plain `nn.Module`, don't `torch.compile()` it first**
- [ ] GNNExplainer on GraphSAGE → subgraph + feature importance for top-500 risk wallets
- [ ] Assemble per-wallet evidence-trail JSON (cluster info, anomaly %, mixing flags, chain hops, risk score, triggered rules)
- [ ] Compute composite weighted risk score (documented formula + calibration note)

**Checkpoint:** For any flagged wallet, you can produce all 4 XAI outputs (SHAP values, subgraph, evidence JSON, composite score).

---

## Phase 9 — FastAPI + Next.js Dashboard [Difficulty: High | Complexity: High]
**Goal:** Wire everything into a demo-able UI.

- [ ] API endpoints: `GET /alerts`, `GET /entity/{address}/explain`, `GET /graph/{cluster_id}`, `GET /ingest/status/{task_id}`
- [ ] Frontend: alert ranking table, force-graph panel (D3-force/Sigma.js), SHAP waterfall chart, evidence-trail collapsible panel
- [ ] Wire file upload UI → ingest endpoint → poll status → show results

**Checkpoint:** Full flow works in the browser: upload file → see alerts populate → click a wallet → see graph + SHAP chart + evidence.

---

## Phase 10 — Demo Prep & Polish [Difficulty: Low | Complexity: Medium]
**Goal:** Ready for judges.

- [ ] Rehearse the 90-second live demo flow (upload → alerts → drill-down → SHAP → graph → evidence) until it's under 2 minutes
- [ ] Write the technical write-up (approach, model choices, explainability method)
- [ ] Prepare 1-page threat-mapping slide + 3-screen UX wireframes (per scoring rec)
- [ ] Smoke-test all 5 scoring criteria against the checklist in §7 of master doc

**Checkpoint:** A stranger can watch the demo and understand what's being detected and why, without narration.

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

*Reference: `SIH26146_Master_Reference_Document.pdf` for full technical detail on every phase above.*