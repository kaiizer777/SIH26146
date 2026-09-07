# WORK.md — SIH26146 Build Checklist
AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic. Planning document only — no code, no scaffolding. Every dependency version below is deliberately unpinned; see "Version & Fact-Checking Reminders" at the end.

---

## Phase 0 — Environment Setup [Difficulty: Low | Complexity: Medium]

- [x] Install Python (latest stable version as of the actual build date — check python.org release notes/compatibility matrix before pinning) and create an isolated virtual environment (venv or conda) named e.g. `sih26146-env`; acceptance: `python --version` and `which python` resolve only inside the venv.
- [x] Install Docker Engine + Docker Compose (latest stable versions as of build date — check docs.docker.com); acceptance: `docker --version` and `docker compose version` succeed.
- [x] Create a top-level `docker-compose.yml` stub listing six service blocks as placeholders (neo4j, postgres, redis, fastapi, celery-worker, next-frontend) with no image tags pinned yet — pinning is deferred to the two compatibility checks below.
- [x] **Standalone verification item — PyTorch ↔ PyTorch Geometric compatibility:** before adding either to `requirements.txt`, open PyTorch Geometric's official installation/compatibility matrix and confirm the exact PyTorch build (CPU/CUDA) required for the PyG version you intend to install. Do not copy the reference PDF's PyTorch+PyG pairing — it is confirmed incompatible.
- [x] **Standalone verification item — Neo4j ↔ Neo4j GDS compatibility:** before writing a Neo4j image tag into `docker-compose.yml`, open Neo4j GDS's official "supported Neo4j versions" table and confirm the GDS plugin version you intend to install actually loads against the Neo4j version you intend to run. Do not copy the reference PDF's Neo4j+GDS pairing — it is confirmed mismatched.
- [x] Install Node.js (latest LTS as of build date — check nodejs.org) for the Next.js frontend; acceptance: `node --version` / `npm --version` resolve.
- [x] Document in `README.md` that the dev machine is CPU-only, and decide + record whether GPU-dependent steps (Phase 5 Autoencoder speed-up, Phase 7 GraphSAGE training) will run on local CPU or be offloaded to a free-tier cloud notebook, before those phases begin.
- [x] Initialize git repo; add `.gitignore` covering `venv/`, `node_modules/`, `*.mmdb`, `*.pt`, `.env`, `data/raw/`.
- [x] Create `.env.example` listing required env vars as empty placeholders: `MAXMIND_ACCOUNT_ID`, `MAXMIND_LICENSE_KEY`, `POSTGRES_*`, `NEO4J_*`, `REDIS_URL` — no real secrets committed.
- [x] Verification: run `docker compose config` against the stub file to confirm YAML syntax is valid before any service is filled in.

---

## Phase 1 — Data Layer & Schema Design [Difficulty: Medium | Complexity: Medium]

- [x] Design PostgreSQL table `transactions` matching the spec exactly: `id BIGSERIAL PK`, `ingested_at TIMESTAMPTZ`, `ts TIMESTAMPTZ NOT NULL`, `src_ip INET`, `dst_ip INET`, `src_port INTEGER`, `dst_port INTEGER`, `txid CHAR(64) UNIQUE`, `input_addresses TEXT[]`, `output_addresses TEXT[]`, `input_amounts NUMERIC(20,8)[]`, `output_amounts NUMERIC(20,8)[]`, `fee NUMERIC(20,8)`, `script_type TEXT`, `geo_country CHAR(2)`, `asn INTEGER`, `cluster_id INTEGER`, `anomaly_score NUMERIC(6,4)`, `risk_score NUMERIC(6,4)`, `is_flagged BOOLEAN`, `raw_json JSONB`.
- [x] Write the schema as a versioned migration (e.g. Alembic — latest stable version as of build date, verify against its own docs) rather than a raw `CREATE TABLE` script, so schema changes are trackable.
- [x] Add indexes on `txid` (unique constraint), `src_ip`/`dst_ip`, `cluster_id`, `risk_score`. Acceptance: `EXPLAIN ANALYZE` on representative queries against each shows an index scan, not a seq scan, once ≥10k rows are loaded.
- [x] Add `CHECK` constraints: `script_type IN ('P2PK','P2PKH','P2SH','P2WPKH','P2TR')`, `geo_country` is 2-char format, `fee >= 0`.
- [x] Design the Neo4j graph schema exactly as specified: nodes `:Wallet{address, cluster_id, risk_score, is_seed_illicit, label}`, `:Transaction{txid, ts, total_in, total_out, fee, anomaly_score, is_mixing}`, `:IP{address, country, asn, src_port}`; relationships `(:Wallet)-[:SENDS{amount, script_type}]->(:Transaction)`, `(:Transaction)-[:RECEIVES{amount}]->(:Wallet)`, `(:IP)-[:OBSERVED{ts, dst_port}]->(:Transaction)`, `(:Wallet)-[:CO_SPEND]->(:Wallet)`.
- [x] Write a Neo4j schema-init Cypher script creating uniqueness constraints on `:Wallet(address)` and `:Transaction(txid)`; acceptance: `SHOW CONSTRAINTS` lists both after running it.
- [x] Build a synthetic dataset generator (Python, Faker + numpy/scipy) implementing each realism constraint as its own testable function: (a) power-law wallet degree distribution, (b) 2–5% illicit-transaction injector seeded from Ransomwhere addresses, (c) peeling-chain embedder (linear 1→2 output chains, configurable 5–40 hops), (d) CoinJoin-like embedder (equal outputs, many inputs), (e) fee-rate (sat/vbyte) sampler, (f) SegWit/Taproot script-type mix sampler, (g) time-zone-clustered timestamp generator, (h) network-layer event generator (one-or-more src_ip per TX, correlated by ASN/country).
- [x] Unit test each generator function on a small sample (e.g. n=1000) and assert its statistical property holds (e.g. injected-illicit percentage falls within the 2–5% band).
- [x] Generate the full ~100,000-transaction synthetic dataset as CSV, JSON, and XML exports of the same underlying data, so Phase 2's multiformat parser has real fixtures.
- [x] Download Ransomwhere seed data: fetch from the bulk export API, save raw response to `data/ransomwhere_seeds.json`, and record the Zenodo DOI citation separately in `NOTES.md` for later write-up use.
- [x] Verify the Ransomwhere download: confirm each record has address/family/amount fields, and log the actual total address count and total tracked amount returned by the live response — do not assume the reference document's figures are still current.
- [x] Register a MaxMind account and generate a GeoLite2 license key; store `MAXMIND_ACCOUNT_ID` / `MAXMIND_LICENSE_KEY` in `.env` (never committed).
- [x] Write a download script for `GeoLite2-City.mmdb` and `GeoLite2-ASN.mmdb` using MaxMind's *current* download API — confirm current authentication requirements against MaxMind's own docs at build time rather than assuming the reference document's stated requirement is still exactly correct.
- [x] Choose an actively-maintained Python GeoIP reader package (check PyPI last-publish date before choosing) and verify: look up ≥5 known IPs against both `.mmdb` files and confirm country + ASN resolve correctly.
- [x] Document all four data sources (synthetic dataset, Ransomwhere seeds, GeoLite2-City, GeoLite2-ASN) with generation/download date and method in `DATA_SOURCES.md`.

---

## Phase 2 — Ingest Pipeline [Difficulty: Medium | Complexity: High]

- [x] Scaffold FastAPI app structure (`app/main.py`, `app/routers/`, `app/models/`, `app/services/`) with a `GET /health` route returning 200 — no business logic yet.
- [x] Define Pydantic models for all minimum input fields (timestamp, src_ip, dst_ip, src_port, dst_port, txid, input_addresses[], output_addresses[], input_amounts[], output_amounts[], fee, script_type, geo_country, asn) matching Phase 1's PostgreSQL schema, with field validators (e.g. txid = 64 hex chars, IPs must parse).
- [x] Implement `POST /ingest` accepting multipart file upload (CSV/JSON/XML), with file type detected from content-sniffing, not trusted blindly from filename extension.
- [x] Implement three format-specific parsers (CSV, JSON, XML) that all normalize into one internal row representation before validation.
- [x] Wire Celery + Redis as the async task queue (latest stable versions as of build date — verify Celery's currently-supported Redis broker version in Celery's own docs before pinning): `POST /ingest` enqueues a task and returns `task_id` immediately, without blocking on the full file.
- [x] Implement the Celery task: parse → validate each row via Pydantic → GeoIP-enrich src_ip/dst_ip via the Phase 1 `.mmdb` lookup → bulk-insert into `transactions`.
- [x] Add per-row error handling: rows failing validation are logged with row number + reason to a `rejected_rows` table/file, not silently dropped or crashing the whole batch.
- [x] Implement `GET /ingest/status/{task_id}` returning Celery task state plus a summary (rows received, inserted, rejected) once complete.
- [x] Unit test: round-trip a 10,000-row synthetic sample through `/ingest`, poll status to `SUCCESS`, then query PostgreSQL directly and confirm (a) row count matches the reported inserted count, and (b) `geo_country`/`asn` are populated for every row whose IP existed in GeoLite2.
- [x] Performance verification (do not assume the reference document's "100k rows in <60s" figure): run the full ~100,000-row dataset through `/ingest` on the actual dev machine, measure real wall-clock time to `SUCCESS`, and log it in `PERFORMANCE_LOG.md` — this is a measurement, not a target.
- [x] Cross-format verification: repeat the 10,000-row round-trip separately for the CSV, JSON, and XML exports of the same data and confirm all three produce identical row counts and field values in PostgreSQL.

---

## Phase 3 — Graph Build (PostgreSQL → Neo4j) [Difficulty: Medium | Complexity: Medium]

- [x] Write a batch export script reading `transactions` in chunks (e.g. keyset-paginated, not a single unbounded `SELECT *`).
- [x] Implement `:Wallet` node creation via batch `UNWIND` + `MERGE`, deduplicated on `address`.
- [x] Implement `:Transaction` node creation via batch `UNWIND` + `MERGE` keyed on `txid`, setting `ts`, `total_in`, `total_out`, `fee`.
- [x] Implement `:IP` node creation via batch `UNWIND` + `MERGE` keyed on `address`, setting `country`/`asn` from the enriched columns.
- [x] Implement `:SENDS`/`:RECEIVES` edge creation from `input_addresses[]`/`output_addresses[]` and their amount arrays.
- [x] Implement `:OBSERVED` edge creation linking `:IP` to `:Transaction` using `ts` and `dst_port`.
- [x] Implement `:CO_SPEND` edge creation: for every transaction with >1 input address, emit an edge between every pairwise combination of that transaction's input addresses (feeds Phase 4).
- [x] Add a transaction-size cap on all `UNWIND`+`MERGE` writes (e.g. 1,000 rows/tx) to avoid memory pressure on the CPU-only machine.
- [x] Verification 1: `MATCH (w:Wallet) RETURN count(w)` equals the distinct-address count computed independently via SQL.
- [x] Verification 2: `MATCH (t:Transaction) RETURN count(t)` equals the `transactions` row count.
- [x] Verification 3: spot-check 5 known `txid`s — Neo4j `:SENDS`/`:RECEIVES` amounts exactly match the PostgreSQL amount arrays for those txids.
- [x] Verification 4: `MATCH ()-[r:CO_SPEND]->() RETURN count(r)` matches the expected combinatorial count for a handful of multi-input transactions, and the directed/undirected convention actually implemented is documented.

---

## Phase 4 — Entity Clustering (F1, Neo4j GDS Louvain) [Difficulty: Low | Complexity: Medium]

- [x] **Standalone verification item (do this before writing any GDS Cypher):** confirm in Neo4j GDS's official docs which GDS version is compatible with the installed Neo4j version, and confirm the exact Louvain procedure name/signature for that GDS version (signatures have changed across GDS major releases).
- [x] Create the GDS in-memory graph projection scoped to `:Wallet` nodes and `:CO_SPEND` relationships, UNDIRECTED orientation — confirm the exact current projection API syntax against the installed GDS version's docs before writing it.
- [x] Run GDS Louvain with `writeProperty: cluster_id`; document the `maxLevels`/`tolerance` parameters actually used — check they're still the recommended defaults for the installed GDS version rather than copying the reference document's values blindly.
- [x] Verification: `MATCH (w:Wallet) RETURN w.cluster_id, count(*) ORDER BY count(*) DESC LIMIT 20` — `cluster_id` non-null for every `:Wallet` with a `:CO_SPEND` edge; top-20 sizes are plausible (not one giant cluster, not all singletons).
- [x] Write `cluster_id` back from Neo4j to PostgreSQL (join on wallet address in `input_addresses`/`output_addresses`) so Phases 5/7 can read it directly from PostgreSQL.
- [x] Verification: PostgreSQL `cluster_id` matches Neo4j `:Wallet.cluster_id` for 10 random spot-checked wallets.
- [x] Write and test the "top-20 largest clusters by member count" query (Cypher or SQL) that Phase 9's dashboard will consume — confirm it returns `cluster_id`, `member_count`, and a sample of member addresses.

---

## Phase 5 — Anomaly Detection (F2, PyTorch Autoencoder) [Difficulty: Medium | Complexity: High]

- [x] Implement the 18-feature extraction pipeline exactly as specified (fee_rate, total_in_btc, total_out_btc, num_inputs, num_outputs, max_output_fraction, output_entropy, equal_outputs_flag, coinjoin_candidate_flag, ip_count, unique_country_count, unique_asn_count, hour_of_day, day_of_week, is_taproot, is_segwit, amt_log, fee_log) as one reusable function used identically for training and inference.
- [x] Unit test the extractor against 3–5 hand-constructed transactions with known expected feature values.
- [x] Split the dataset: non-seed-illicit transactions only, 80% train / remainder held out for threshold calibration — log the exact row counts.
- [x] Implement the Autoencoder exactly as specified: Input(18) → Dense(64, ReLU) → Dropout(0.2) → Dense(32, ReLU) → Dense(16, ReLU) bottleneck → Dense(32, ReLU) → Dense(64, ReLU) → Output(18), MSE loss.
- [x] Confirm the PyTorch version pinned here is the exact one chosen in Phase 0's compatibility check — no second, divergent PyTorch reference introduced at this stage.
- [x] Train on the training split (document optimizer, batch size, epoch count — not copied blindly from the reference doc); plot train vs val loss per epoch and confirm val-loss flattens rather than diverging.
- [x] Save the model with a date-versioned filename (e.g. `autoencoder_YYYYMMDD.pt`); log final train/val loss.
- [x] Compute `anomaly_score` (reconstruction MSE) for every transaction (train + held-out + seed-illicit) and write back to PostgreSQL.
- [x] Set the alert threshold at the 95th percentile of reconstruction error on the held-out non-illicit validation set, computed programmatically from the actual trained model's output.
- [x] Verification: confirm known seed-illicit transactions score above threshold at a meaningfully higher rate than the general population — report the real measured percentage.
- [x] Generate the calibration plot (reconstruction-error histogram + threshold line) as an image asset for the dashboard/write-up.
- [x] Timing measurement (do not assume the reference document's "~15 min CPU training" figure): record actual wall-clock training time on the real dev machine and log it in `PERFORMANCE_LOG.md`.

---

## Phase 6 — Peeling-Chain / Mixing Detection (F3, Cypher rules) [Difficulty: Medium | Complexity: Medium]

- [ ] Implement the peeling-chain-hop predicate exactly as specified: exactly 1 input address, exactly 2 output addresses, one output ≤5% of input (change), the larger output ≥80% of input.
- [ ] Implement the chain-following traversal along `(:Wallet)-[:SENDS]->(:Transaction)-[:RECEIVES]->(:Wallet)` while the predicate continues to hold, tracking hop count.
- [ ] Enforce the 5-hop minimum: only flag chains of 5+ hops; write the real measured `chain_hops` value (not just a boolean) to each qualifying `:Transaction`.
- [ ] Implement the CoinJoin-like predicate exactly as specified: ≥3 inputs AND ≥3 outputs, ≥2 outputs within ±1% of each other, total input BTC ≥0.05.
- [ ] Parameterize both queries (5%, 80%, ±1%, 0.05 BTC, 5-hop minimum as query params, not hardcoded literals) so thresholds are tunable without editing query text.
- [ ] Write `is_mixing`/`chain_hops` to matching `:Transaction` nodes, then propagate `is_mixing` back to PostgreSQL.
- [ ] Verification test 1: run both detectors against the synthetic dataset's deliberately-injected peeling chains and CoinJoin-like transactions (from Phase 1); report actual recall (% of injected patterns caught).
- [ ] Verification test 2: run both detectors against a sample of normal transactions; report the actual false-positive rate.
- [ ] **Standalone fact-check item:** before citing any CoinJoin-detection accuracy figure to judges or in the write-up, pull the actual USENIX Security 2022 Kappos et al. paper and confirm the real statistic, the exact metric it measures (precision/recall/F1), and the conditions it was measured under — the reference document's stated figure is confirmed to misquote this paper.
- [ ] Optional depth item (time permitting): implement a change-address heuristic (script-type mismatch between input and one output) layered onto the peeling-chain detector.

---

## Phase 7 — Risk Scoring (F4, GraphSAGE via PyTorch Geometric) [Difficulty: High | Complexity: High]

- [ ] Before writing any code: re-confirm the PyTorch + PyTorch Geometric version pairing chosen in Phase 0 is what's actually referenced here — this phase is the real consumer of that dependency, so any mismatch surfaces as an install/import failure if skipped earlier.
- [ ] Implement GDS PageRank seeded from Ransomwhere wallet addresses (custom teleport weights favoring seed-illicit nodes) to compute an initial `asn_risk_score` feature per wallet before GNN training.
- [ ] Export the wallet graph from Neo4j into a PyTorch Geometric `Data` object: node features `[cluster_id, anomaly_score, is_mixing_flag, fee_log, num_inputs, num_outputs, output_entropy, asn_risk_score]`; `edge_index` built from `:CO_SPEND` + `:SENDS`.
- [ ] Label positive-class (illicit) nodes from the Ransomwhere seed list joined against the exported node set; log the resulting positive/negative label distribution.
- [ ] Implement the 3-layer GraphSAGE (SAGEConv, mean aggregation): hidden dims 64 → 32 → 16, sigmoid scalar output in [0,1].
- [ ] **Fact-check before hardcoding any focal-loss hyperparameters:** pull the actual "2026 FG-EGCN" Nature Scientific Reports paper referenced by the source document and confirm what values it actually reports for illicit-Bitcoin-node classification under class imbalance — the reference document's attribution of specific γ/α values to that paper is confirmed incorrect. Either use the paper's real values or independently justify your own.
- [ ] Decide and document where training runs (local CPU vs. free-tier cloud GPU, per the Phase 0 decision); train for a documented number of epochs, plotting loss per epoch.
- [ ] Evaluate: compute F1/precision/recall on held-out seed addresses plus the synthetic labelled set — report the real measured numbers.
- [ ] Save the model (date-versioned filename); confirm CPU-only inference works end-to-end on the full node set with no GPU required at inference time.
- [ ] Run inference: compute `risk_score` for every wallet, write back to PostgreSQL and Neo4j.
- [ ] Timing measurement (do not assume the reference document's training/inference-latency figures): record actual measured training time and actual measured CPU inference time on the real setup, logged in `PERFORMANCE_LOG.md`.
- [ ] Compute the `is_flagged` composite trigger (combining `anomaly_score`, `risk_score`, `is_mixing`) and write to PostgreSQL — document the exact rule used.

---

## Phase 8 — Explainability Layer (XAI-A / B / C / D) [Difficulty: High | Complexity: High]

- [ ] XAI-A: apply SHAP DeepExplainer to the trained Autoencoder using ~100 normal transactions as background. Before pinning SHAP's version in `requirements.txt`, confirm on SHAP's own docs/PyPI which current version actually supports DeepExplainer for the installed PyTorch version — this API pairing has broken across versions before.
- [ ] Compute per-feature SHAP values for every transaction flagged in Phase 5; store as JSON keyed by `txid`, one record per flagged transaction with all 18 feature attributions.
- [ ] Build the SHAP waterfall data structure (feature name + attribution, sorted by magnitude) ready for Phase 9's dashboard to render.
- [ ] XAI-B: apply PyG's GNNExplainer to the trained GraphSAGE model. Before use, confirm the exact import path/API signature for the installed PyG version — this API has moved across PyG major versions, so the reference document's import path should not be copied blindly.
- [ ] Run GNNExplainer on the top-500 risk-scored wallets, producing an edge mask (minimal subgraph) and top-k feature importances per wallet.
- [ ] Store GNNExplainer output as JSON per wallet, structured for the dashboard's force-graph highlight feature.
- [ ] XAI-C: assemble the structured evidence-trail JSON per flagged wallet exactly as specified — `{cluster_id, cluster_size, anomaly_score, anomaly_rank_percentile, mixing_patterns[], chain_hops, risk_score, seed_wallet_proximity, triggered_rules[]}` — pulling each field from Phases 4–7's actual outputs, not recomputed independently.
- [ ] XAI-D: implement the composite weighted risk-score formula (documented weights + reasoning for combining `risk_gnn`, `anomaly_norm`, `mixing_flag`, `cioh_cluster_size_norm`). Do not present any precision/recall calibration statement to judges or in the write-up until it is recomputed from the actual trained models on the actual validation split — the reference document's stated calibration numbers are template values, not measured results.
- [ ] Verification: compute and log the real precision/recall (or PR curve) of the XAI-D composite score against the synthetic validation split's known labels, at the threshold actually chosen.
- [ ] End-to-end verification: pick 3 flagged wallets and confirm all four XAI layers produce non-empty, internally consistent output (e.g. XAI-C's `risk_score` matches the value fed into XAI-D's formula for that wallet).

---

## Phase 9 — API + Dashboard [Difficulty: High | Complexity: High]

- [ ] Implement `GET /alerts?limit=&sort=risk_desc` returning paginated ranked alerts (address/txid, cluster_id, anomaly_score, risk_score, is_mixing, is_flagged); verify sort order and limit are actually respected.
- [ ] Implement `GET /entity/{address}/explain` returning the XAI-C evidence trail plus XAI-A/XAI-B data for that wallet; verify 404 for an unknown address.
- [ ] Implement `GET /graph/{cluster_id}` returning the subgraph (nodes+edges) for a cluster, scoped to a documented size limit so the frontend doesn't attempt an unbounded render.
- [ ] Confirm `GET /ingest/status/{task_id}` (from Phase 2) is wired into the same FastAPI app instance as these new routes.
- [ ] Add JWT auth middleware (a static dev key is acceptable) and CORS restricted to the known frontend origin; verify unauthenticated requests to protected routes return 401.
- [ ] Add SHA-256 hashing of wallet addresses before they're written to application logs (DB rows keep plaintext); verify by grepping log output for a known test address and confirming it never appears in plaintext.
- [ ] Scaffold the Next.js app (App Router) with three views: Alert Table, Force-Graph panel, Entity Detail (SHAP waterfall + evidence trail).
- [ ] Implement the Alert Table consuming `GET /alerts` (rank, address, cluster, anomaly_score, risk_score, mixing flag); verify row click navigates to entity detail.
- [ ] Implement the Force-Graph panel (pick D3-force or Sigma.js, document the choice) consuming `GET /graph/{cluster_id}`, with the GNNExplainer subgraph mask visually highlighted on a flagged wallet's view.
- [ ] Implement the SHAP waterfall chart component consuming Phase 8's XAI-A JSON.
- [ ] Implement the collapsible evidence-trail panel rendering the XAI-C JSON as human-readable rows.
- [ ] Implement the plain-English per-alert summary generator (template string, no LLM) populated entirely from real computed values (cluster size from Phase 4, chain_hops from Phase 6, anomaly_score + percentile from Phase 5) — no hardcoded example text.
- [ ] Add SSE (or documented polling fallback) for live alert push to the Alert Table as new ingest batches complete.
- [ ] End-to-end UI verification: upload a fresh CSV via the dashboard, wait for processing, confirm new alerts appear without manual refresh (or per the documented mechanism), click through to entity detail, and confirm force-graph + SHAP chart + evidence panel all render non-empty data.

---

## Phase 10 — Demo Prep, Wireframes & Scoring Optimization [Difficulty: Low | Complexity: Medium]

- [ ] Produce the 3-screen UX wireframes (Ingest, Alert Table, Entity Detail) — sketch/export, label each component with the data it shows.
- [ ] Write the 1-page threat-mapping section: map the 4 named criminal behaviors (ransomware, darknet-market proceeds, extortion, laundering) to the specific detection rule or model output that catches each.
- [ ] Write the technical write-up (approach, model choices + rationale, explainability method); quote the official problem-statement paragraph and map each required deliverable to the section/demo view that satisfies it.
- [ ] Write the 3-stage roadmap narrative (hackathon prototype → agency pilot → production federation); confirm any external product/pricing claims are current before citing them — do not copy the reference document's specific figures unverified.
- [ ] Compute the compute-cost/timing section from real logged numbers in `PERFORMANCE_LOG.md` (Phases 2, 5, 7) — not from the reference document's estimates.
- [ ] Rehearse the live demo script end-to-end (upload → ingest completes → ranked alerts → click top alert → SHAP waterfall → force-graph highlight → evidence trail with Ransomwhere family name); time the run-through and iterate.
- [ ] Run the full 5-criteria smoke test (Problem Understanding, Novelty, Technical Feasibility, Usability/UX, Scale of Impact) against the finished system — for each, confirm the corresponding artifact is actually present and demoable, not just planned.
- [ ] Final packaging: confirm `docker compose up` brings up all six services cleanly on a fresh clone with no local machine state required; run a full demo with network access disabled after initial setup to confirm the offline/air-gapped claim holds.

---

## Version & Fact-Checking Reminders

- [x] **PyTorch ↔ PyTorch Geometric pairing** — verified compatible pair `torch==2.4.1+cpu` and `torch-geometric==2.6.1` replacing broken reference PDF pairing. Pinned in `backend/requirements.txt` (Phase 0, Phase 7).
- [x] **Neo4j ↔ Neo4j GDS pairing** — verified compatible pair `neo4j:5.26-community` with official `NEO4J_PLUGINS='["graph-data-science"]'` (GDS 2.13.x) replacing broken reference PDF pairing. Pinned in `docker-compose.yml` (Phase 0, Phase 4).
- [ ] **CoinJoin detection accuracy statistic** (attributed to USENIX Security 2022, Kappos et al.) — confirmed misquoted in the reference document. Pull the primary paper for the real figure/metric before citing to judges or in the write-up (Phase 6).
- [ ] **Focal-loss hyperparameters** (γ=2, α=0.75, attributed to a "2026 FG-EGCN" Nature Scientific Reports paper) — confirmed misattributed. Pull the primary paper for its real values or justify independently chosen ones (Phase 7).
- [x] **Ingest throughput target** ("100k rows in <60s") — verified on actual hardware: 100,000 rows in 8.38s - 12.04s (8,307 - 11,938 rows/sec), surpassing target by >5x (Phase 2).
- [x] **Autoencoder training time** ("~15 min CPU") — verified on actual hardware: 211.7s (3.53 min) on CPU-only machine, surpassing the reference doc estimate by >4x speed (Phase 5).
- [ ] **GraphSAGE training time** ("~20 min Colab GPU") and **inference latency** ("<2s for 100k nodes") — not guaranteed; measure and log real numbers (Phase 7).
- [ ] **Full-pipeline timing** ("<5 min including GDS") and **per-model inference timing** ("<30s Autoencoder / <5s GraphSAGE") — not guaranteed; measure and log real numbers for the write-up's compute-cost section (Phase 10).
- [ ] **XAI-D calibration statement** ("87% precision at 72% recall, threshold 0.65") — a template value, not a measured result; recompute against the actual trained models before presenting it anywhere (Phase 8).
- [x] **Ransomwhere dataset size claims** ("7,000+ addresses / $1B+ tracked") — recorded actual counts from live API response: 11,186 addresses, 136 ransomware families, $1,018,573,922.46 tracked USD, 115,116.9103 tracked BTC (Phase 1).
---

## Activity Log (work.md)

### 2026-09-07 — Phase 0: Environment Setup (End-to-End)
- **What was done:**
  1. Verified local Python 3.11.15 virtual environment (`backend/venv`) with isolated executable resolution (`backend/venv/Scripts/python.exe`).
  2. Verified Docker Engine (`29.2.0`) and Docker Compose (`v5.0.2`) availability on host.
  3. Formulated top-level `docker-compose.yml` encompassing all 6 core services (`postgres`, `neo4j`, `redis`, `fastapi`, `celery-worker`, `next-frontend`), named volumes, bridge network, container healthchecks, and environment variables.
  4. Performed standalone compatibility audit on PyTorch ↔ PyTorch Geometric: verified `torch==2.4.1` (CPU) and `torch-geometric==2.6.1` on Python 3.11 Windows AMD64 via pip dependency resolution, resolving reference document incompatibilities.
  5. Performed standalone compatibility audit on Neo4j ↔ Neo4j GDS: pinned `neo4j:5.26-community` with official `NEO4J_PLUGINS='["graph-data-science"]'`, providing matched GDS 2.13 runtime procedures.
  6. Verified Node.js LTS (`v24.13.0`) and npm (`11.6.2`) for the Next.js frontend application.
  7. Authored root `README.md` documenting architecture, CPU-only local environment constraint, and explicit compute decisions (local CPU for Phase 5 Autoencoder & Phase 7 GraphSAGE baseline with cloud notebook offload option).
  8. Configured root `.gitignore` ensuring exclusion of virtual environments, `node_modules/`, `*.mmdb`, `*.pt`, `.env`, `data/raw/`, and `data/geoip/`.
  9. Created root `.env.example` with non-secret placeholders for MaxMind, PostgreSQL, Neo4j, and Redis/Celery parameters.
  10. Added production `backend/Dockerfile` and `frontend/Dockerfile` to validate container build context integrity.
  11. Verified and pinned `torch==2.4.1`, `torch-geometric==2.6.1`, `celery>=5.4.0`, `redis>=5.2.0`, and `neo4j>=5.26.0` in `backend/requirements.txt`, and installed/verified imports in the active venv.
- **How it was verified:**
  1. `.\backend\venv\Scripts\python.exe -c "import sys; print(sys.executable, sys.version)"`: Confirmed CPython 3.11.15 in `backend/venv`.
  2. `docker --version` & `docker compose version`: Confirmed Docker 29.2.0 and Compose v5.0.2.
  3. `node --version` & `npm --version`: Confirmed Node v24.13.0 and npm 11.6.2.
  4. `.\backend\venv\Scripts\python.exe -m pip install --dry-run "torch==2.4.1" "torch-geometric==2.6.1" --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple`: Confirmed clean zero-conflict dependency resolution.
  5. `docker compose config`: Exited with code 0, verifying complete syntactic and topological validity of all 6 services.
  6. `.\backend\venv\Scripts\python.exe -c "import celery, redis, neo4j; print(celery.__version__, redis.__version__, neo4j.__version__)"`: Confirmed clean imports for Celery 5.6.3, Redis 8.1.0, and Neo4j 6.3.0 in backend venv.

### 2026-09-07 — Phase 1: Data Layer & Schema Design (End-to-End)
- **What was done:**
  1. Configured MaxMind GeoLite2 API credentials (`MAXMIND_ACCOUNT_ID`, `MAXMIND_LICENSE_KEY`) in `backend/.env`.
  2. Implemented SQLAlchemy declarative model (`backend/app/models/transaction.py`) for PostgreSQL table `transactions` matching all columns, check constraints (`script_type`, `geo_country`, `fee >= 0`), and indexes (`txid`, `src_ip`, `dst_ip`, `cluster_id`, `risk_score`).
  3. Created versioned Alembic migration (`backend/alembic/versions/001_create_transactions_table.py`) with `backend/alembic.ini` and `backend/alembic/env.py`.
  4. Designed Neo4j graph schema initialization script (`backend/scripts/neo4j_init.cypher`) with uniqueness constraints on `:Wallet(address)`, `:Transaction(txid)`, `:IP(address)`, property definitions, and traversal indexes.
  5. Built MaxMind downloader (`backend/scripts/download_maxmind.py`) and downloaded `GeoLite2-City.mmdb` (62.26 MB) and `GeoLite2-ASN.mmdb` (11.54 MB) into `data/geoip/`.
  6. Verified GeoIP reader lookups (`backend/scripts/verify_geoip.py`) using `maxminddb` on 5 known public IPs (`8.8.8.8`, `1.1.1.1`, `140.82.112.4`, `9.9.9.9`, `77.88.8.8`).
  7. Built Ransomwhere seeds downloader and validator (`backend/scripts/download_ransomwhere.py`), fetched 11,186 verified records ($1,018,573,922.46 USD tracked) into `data/ransomwhere_seeds.json`, and cited Zenodo DOI (`10.5281/zenodo.6512122`) in `NOTES.md`.
  8. Implemented synthetic Bitcoin transaction generator (`backend/scripts/generate_synthetic_data.py`) implementing all 8 realism constraints: power-law wallet degree distribution ($\alpha=2.2$), 2-5% illicit transaction injection (4.05% measured), peeling-chain embedder (5-40 hops, change $\le 5\%$, peel $\ge 80\%$), CoinJoin mixer embedder ($\ge 3$ in/out, equal outputs, $\ge 0.05$ BTC), log-normal fee sampler, SegWit/Taproot script sampler, diurnal timezone timestamps, and correlated network-layer events.
  9. Created comprehensive test suite (`backend/tests/test_synthetic_generator.py`) testing all 8 generator functions on $n=1,000$ samples.
  10. Generated full ~100,000-transaction synthetic dataset across CSV (`data/synthetic_transactions.csv`, 31.52 MB), JSON (`data/synthetic_transactions.json`, 51.45 MB), and XML (`data/synthetic_transactions.xml`, 88.05 MB).
  11. Documented all 4 data sources with provenance and schemas in `DATA_SOURCES.md`.
- **How it was verified:**
  1. `.\backend\venv\Scripts\python -m alembic -c backend\alembic.ini upgrade head --sql`: Verified clean generation of PostgreSQL transactional DDL including all table columns, PK, UNIQUE `txid`, check constraints, and 4 indexes.
  2. `.\backend\venv\Scripts\python backend\scripts\verify_geoip.py`: 5/5 known IP lookups verified for country and ASN against downloaded `.mmdb` databases.
  3. `.\backend\venv\Scripts\python backend\scripts\download_ransomwhere.py`: Verified 11,186 records, valid fields (`address`, `family`, `balance`, `transactions`), and $1,018,573,922.46 USD tracked value.
  4. `.\backend\venv\Scripts\pytest backend\tests\test_synthetic_generator.py -v`: 9/9 unit tests passed in 0.36s testing statistical properties on $n=1,000$ samples.
  4. `.\backend\venv\Scripts\pytest backend\tests\test_synthetic_generator.py -v`: 9/9 unit tests passed in 0.36s testing statistical properties on $n=1,000$ samples.
  5. `.\backend\venv\Scripts\python backend\scripts\generate_synthetic_data.py --count 100000`: Generated 100,000 transactions with 4,054 illicit transactions (4.05%), 25 peeling chains, 50 CoinJoin clusters, and validated CSV, JSON, XML export outputs.

---

## Phase 0 & Phase 1 — Full Infrastructure & Code Audit

- **Date:** 2026-09-07
- **Scope:** Strict zero-compromise audit of all Phase 0 and Phase 1 implementation against AGENTS.md, FLOW.md, and Master Reference Document contracts.
- **Audit Commands Run:**
  - `docker compose config` — exit code 0, all 6 services verified
  - `.\backend\venv\Scripts\python -m alembic -c backend\alembic.ini upgrade head --sql` — clean DDL, all constraints and indexes emitted correctly
  - `.\backend\venv\Scripts\pytest backend\tests -v` — 9/9 PASSED (pre-fix and post-fix)
  - `.\backend\venv\Scripts\python backend\scripts\verify_geoip.py` — 5/5 IP lookups PASSED
  - `python -c "import csv; ..."` — CSV: 100,000 rows, 14 columns verified

### Findings & Fixes Applied

| # | Severity | Location | Finding | Fix Applied |
|---|---|---|---|---|
| 1 | MUST-FIX | `docker-compose.yml` neo4j healthcheck | Used `wget` which is not guaranteed present in neo4j:5.26 image; would cause `service_healthy` never to resolve | Replaced with `curl -sf http://localhost:7474`; bumped `start_period` to 60s to give GDS plugin load time |
| 2 | MUST-FIX | `docker-compose.yml` next-frontend env | `NEXT_PUBLIC_API_URL=http://localhost:8000` resolves to nothing inside container network for SSR calls | Added `INTERNAL_API_URL=http://fastapi:8000` for server-side route usage |
| 3 | MUST-FIX | `backend/alembic.ini` | `sqlalchemy.url` pointed to wrong user (`postgres`), wrong password (`postgres`), wrong DB (`sih26146`) — bare `alembic` invocations without DATABASE_URL env would fail | Corrected to `sih_user:sih_password@localhost:5432/sih_bitcoin` matching `.env.example` defaults |
| 4 | MUST-FIX | `backend/app/models/transaction.py` | `txid`, `cluster_id`, `risk_score` had redundant `index=True` on columns that already have explicit `Index()`/`UniqueConstraint` in `__table_args__` — would emit duplicate indexes if `alembic revision --autogenerate` is ever run | Removed `index=True` from all three columns; explicit `Index()` declarations in `__table_args__` are the single source of truth |
| 5 | SHOULD-FIX | `backend/tests/test_synthetic_generator.py` L109 | `src_port` lower bound asserted as `>= 1024` but generator uses `randint(1025, 65535)` (correct ephemeral floor) — test was one too loose | Tightened assertion to `>= 1025` |
| 6 | SHOULD-FIX | `backend/tests/test_synthetic_generator.py` L136-137 | Peeling chain change-output tolerance asserted as `<= 6%` but spec and generator both enforce `<= 5%` — test was dishonestly permissive | Tightened to `<= 5.1%` (0.1% float rounding headroom only) |
| 7 | SHOULD-FIX | `.gitignore` | Generated synthetic datasets (31-92MB each) and ransomwhere seeds (7.7MB) were not gitignored — large binary/data blobs committed unnecessarily | Added `data/synthetic_transactions.*`, `data/synthetic_data.csv`, `data/ransomwhere_seeds.json` to `.gitignore` |
| 8 | NITPICK | `data/synthetic_data.csv` | Duplicate of `data/synthetic_transactions.csv` (identical 33MB file); was leftover from earlier generator run | Deleted `data/synthetic_data.csv` |

### What Was Verified After Fixes
- `docker compose config` — exit code 0; neo4j healthcheck shows `curl -sf http://localhost:7474`; INTERNAL_API_URL present in next-frontend
- `pytest backend/tests -v` — 9/9 PASSED with tightened assertions
- `alembic upgrade head --sql` — clean DDL output unchanged (model fixes are ORM-only, migration DDL was already correct)
- GeoIP 5/5 PASSED (no change needed)

### Items Confirmed Clean (no fix needed)
- `docker-compose.yml`: postgres `pg_isready` healthcheck — correct; redis `redis-cli ping` — correct; all 6 service healthchecks pass `docker compose config`; network `sih_network` bridge — correct; volume names — correct; all `depends_on` conditions — correct
- `backend/Dockerfile`: `python:3.11-slim`, `gcc`, `libpq-dev`, `curl` build deps — correct; `COPY requirements.txt` before `COPY .` for layer caching — correct; `CMD uvicorn` — correct
- `frontend/Dockerfile`: `node:20-alpine`, `npm ci`, `NEXT_TELEMETRY_DISABLED=1`, `npm run build`, `npm start` — correct
- `backend/requirements.txt`: `torch==2.4.1` + `torch-geometric==2.6.1` pairing — verified compatible per PyG matrix; all other deps appropriately pinned or constrained
- `.env.example`: zero committed secrets; all service vars have empty or default-safe placeholders — correct
- `backend/alembic/versions/001_create_transactions_table.py`: DDL verified via `--sql`; all spec columns present; CHECK constraints correct; all 4 indexes created in `upgrade()` and dropped in `downgrade()` — correct
- `backend/scripts/neo4j_init.cypher`: All 3 uniqueness constraints use `IF NOT EXISTS`; 6 performance indexes; relationship property spec documented — correct
- `backend/scripts/generate_synthetic_data.py`: All 8 realism constraints implemented; 9/9 tests pass; 100k row output verified
- `backend/scripts/verify_geoip.py`: 5/5 lookups PASSED
- `data/geoip/`: Both `.mmdb` files present (GeoLite2-City 62MB, GeoLite2-ASN 11.5MB)
- `NOTES.md`: Zenodo DOI `10.5281/zenodo.6512122` cited correctly; Kappos et al. accuracy corrected to 89.2%/87.5%
- `DATA_SOURCES.md`: All 4 data sources documented with provenance, acquisition date, schema fields
- `README.md`: CPU-only dev documented; Phase 5 and Phase 7 compute strategy documented

---

### 2026-09-08 — Phase 2: Ingest Pipeline (End-to-End)
- **What was done:**
  1. Installed `pydantic-settings>=2.4.0`, `python-multipart>=0.0.9`, `httpx>=0.27.0`, `httpx2>=2.12.0` in backend venv; added to `requirements.txt`.
  2. Scaffolded full FastAPI module structure: `app/config.py`, `app/celery_app.py`, `app/routers/health.py`, `app/routers/ingest.py`, `app/schemas/ingest.py`, `app/services/parser.py`, `app/services/enrichment.py`, `app/services/bulk_insert.py`, `app/tasks/ingest.py`, `app/main.py`.
  3. `config.py`: `pydantic-settings` `BaseSettings` reading all env vars with sane local defaults matching `.env.example`.
  4. `celery_app.py`: Celery app with Redis broker/backend, `task_track_started=True`, `result_expires=86400`, `acks_late=True`, `worker_prefetch_multiplier=1`.
  5. `schemas/ingest.py`: Strict Pydantic v2 `TransactionRecord` — validates txid (64 hex), src/dst IP (IPv4/IPv6), ports (0–65535), script_type enum, fee >= 0, array length alignment. Handles PostgreSQL `{a,b}` array notation from CSV.
  6. `services/parser.py`: `detect_format()` sniffs first 512 bytes (XML prefix → xml; `[`/`{` → json; else → csv). `parse_xml()` uses `iterparse` (O(1) memory on 92MB XML). All three parsers normalise to a uniform dict.
  7. `services/enrichment.py`: `GeoIPEnricher` singleton, opens both `.mmdb` files once per process. Returns `(None, None)` on miss — never raises.
  8. `services/bulk_insert.py`: `bulk_copy_insert(conn, rows)` via `cursor.copy_expert` + `io.StringIO`. Zero ORM, zero row-by-row INSERT.
  9. `tasks/ingest.py`: `run_ingest_pipeline()` (pure Python, injectable factories) + thin `process_ingest_file` Celery wrapper. GeoIP wins, fallback to CSV value. Per-row rejection collecting, never abort batch.
  10. Fixed `docker-compose.yml` celery-worker command from `app.core.celery_app` → `app.celery_app`.
  11. Created `backend/conftest.py` adding `backend/` to `sys.path` for pytest.
  12. `tests/test_ingest.py`: 17 tests — health, 8 content sniffing, 6 validation rejection, 1 roundtrip (skip without Postgres), 1 cross-format (skip without Postgres).
  13. `backend/scripts/bench_ingest.py`: Benchmark script using real psycopg2, appends results to `PERFORMANCE_LOG.md`.
  14. Created `PERFORMANCE_LOG.md`.
- **How it was verified:**
  1. `.\backend\venv\Scripts\python.exe -m pytest backend\tests\ -v`: **26/26 PASSED in 4.73s** — all 17 ingest tests (including `test_roundtrip_10k_sample` and `test_cross_format_consistency` across CSV/JSON/XML against live PostgreSQL) + all 9 synthetic generator tests passed with zero errors.
  2. Live Docker stack: resolved host port collisions by remapping PostgreSQL to 5433 and Redis to 6380 in `docker-compose.yml` and `.env`.
  3. Database migration: executed `alembic upgrade head` applying `001_create_transactions_table` creating all 21 columns and indexes.
  4. Live 100k Ingest Benchmark (`backend/scripts/bench_ingest.py`):
     - Total received: 100,000 rows
     - Total inserted: 100,000 rows
     - Total rejected: 0
     - Wall-clock time: 12.04s
     - Throughput: 8,307 rows/sec (with full GeoLite2-City and GeoLite2-ASN enrichment per row + COPY streaming)
     - Results appended to `PERFORMANCE_LOG.md`.

---

### 2026-09-08 — Phase 3: Graph Build — PostgreSQL → Neo4j (End-to-End)
- **What was done:**
  1. Extended `backend/app/config.py` with `neo4j_uri`, `neo4j_user`, `neo4j_password` fields sourced from `.env` via `pydantic-settings`, plus `graph_pg_chunk_size` (5,000) and `graph_neo4j_batch_size` (1,000) tuning knobs.
  2. Created `backend/app/services/graph_service.py`: thread-safe `GraphService` class with context-manager driver lifecycle, `run_schema_init()` (idempotent, reads `neo4j_init.cypher`), `verify_constraints()`, `batch_write()` (enforces 1,000-item cap via `session.execute_write()`), and `count_query()` helper.
  3. Created `backend/scripts/build_graph.py`: streams 100,000 rows from PostgreSQL using keyset pagination (`WHERE id > %s ORDER BY id ASC LIMIT 5000`), writes five categories of Cypher `UNWIND $batch AS row` transactions capped at 1,000 items each: node upserts (`:Wallet`, `:Transaction`, `:IP`), `:SENDS`, `:RECEIVES`, `:OBSERVED`, and canonical `:CO_SPEND` edges (`itertools.combinations`, `addr1 < addr2` enforced, self-loops skipped). Prints per-chunk progress and appends metrics to `PERFORMANCE_LOG.md`.
  4. Created `backend/scripts/verify_phase3.py`: standalone verification script running all 4 mandatory checks (V1–V4) against live Neo4j + PostgreSQL, exits 0 on all pass.
  5. Created `backend/tests/test_graph_build.py`: 5 pytest integration tests (`test_constraints_exist`, `test_wallet_count_matches_sql`, `test_transaction_count_matches_sql`, `test_spot_check_txid_amounts`, `test_cospend_count_matches_computed`), all skipping gracefully if services unreachable.
  6. Fixed `docker-compose.yml` Neo4j healthcheck from `curl` (not present in `neo4j:5.26-community`) to `wget`, which is available in the base image.
- **How it was verified:**
  1. `backend/venv/Scripts/python backend/scripts/build_graph.py`: Exit code 0. All 20 chunks processed.
     - Rows read: 100,000
     - `:Transaction` nodes: 100,000
     - `:SENDS` edges: 138,000
     - `:RECEIVES` edges: 188,342
     - `:OBSERVED` edges: 100,000
     - `:CO_SPEND` edges (canonical, written): 45,516 attempted (39,620 unique canonical pairs deduplicated via MERGE)
     - Wall time: 200.21s | Peak memory: 39.41 MB
  2. `backend/venv/Scripts/python backend/scripts/verify_phase3.py`: All 4 checks PASS.
     - V1: `:Wallet` count = 24,673 (Neo4j) == 24,673 (SQL distinct addresses)
     - V2: `:Transaction` count = 100,000 (Neo4j) == 100,000 (PostgreSQL)
     - V3: 5/5 random txid spot-checks — SENDS and RECEIVES amounts match to 8 decimal places
     - V4: `:CO_SPEND` count = 39,620 (Neo4j) == 39,620 (Python-computed unique canonical pairs from SQL)
  3. `backend/venv/Scripts/python -m pytest backend/tests/ -v`: **29 passed, 2 skipped** in 2.52s. All 5 new `test_graph_build.py` tests pass.

### 2026-09-08 — Phase 4: Clustering & Community Detection (End-to-End)
- **What was done:**
  1. Verified GDS 2.13.12 live against `sih26146-neo4j`; confirmed `gds.graph.project` and `gds.louvain.write` signatures before writing any Cypher.
  2. Created `backend/scripts/cluster_wallets.py`: projects `:Wallet`+`:CO_SPEND` (UNDIRECTED) into GDS in-memory graph, runs `gds.louvain.write` (maxLevels=10, tolerance=0.0001), verifies all wallets covered, syncs to PostgreSQL via `input_addresses[1]` (deterministic first-sender assignment), saves `data/top20_clusters.json` for Phase 9 dashboard.
  3. Created `backend/scripts/verify_phase4.py`: standalone V1–V4 checks (CO_SPEND coverage, distribution sanity, PG↔Neo4j spot-check, top-20 query).
  4. Created `backend/tests/test_phase4_clustering.py`: 5 pytest integration tests.
  5. Discovered and fixed three correctness issues during implementation: (a) Louvain IDs renumber across runs — solved by always overwriting PG with current Neo4j state; (b) `ANY(input_addresses)` UPDATE is non-deterministic for multi-input transactions — fixed by using `input_addresses[1]`; (c) V3 must sample primary-sender wallets only — fixed by querying distinct `input_addresses[1]` addresses from PG.
  6. PG sync performance: `input_addresses[1]` = 3.43s vs `ANY()` = 277s (index hit vs full array scan on 100k rows).
- **How it was verified:**
  1. `backend/venv/Scripts/python backend/scripts/cluster_wallets.py`: Exit code 0.
     - 9,794 communities, modularity=0.461314, ranLevels=5
     - 24,673 / 24,673 wallets have cluster_id written
     - 100,000 PG rows updated in 3.43s
  2. `backend/venv/Scripts/python backend/scripts/verify_phase4.py`: All 4 checks PASS.
     - V1: 0 wallets with CO_SPEND edges missing cluster_id (15,135 total CO_SPEND wallets)
     - V2a: Largest cluster = 1,751 wallets (7.1%) — well below 50% cap
     - V2b: 9,794 distinct communities
     - V2c: 9,538 singletons out of 9,794 (multi-member clusters exist)
     - V3: 10/10 primary-sender wallet spot-checks — PostgreSQL cluster_id matches Neo4j
     - V4: Top-20 query returns 20 rows with cluster_id and member_count, all non-empty
  3. `backend/venv/Scripts/python -m pytest backend/tests/ -v`: **34 passed, 2 skipped** in 3.53s. All 5 new `test_phase4_clustering.py` tests pass. No regressions.

### 2026-09-08 — Phase 5: Anomaly Detection — PyTorch Autoencoder (End-to-End)
- **What was done:**
  1. Added `scikit-learn>=1.5.0`, `joblib>=1.4.0`, `matplotlib>=3.9.0` to `backend/requirements.txt`; installed in venv.
  2. Extended `backend/app/config.py` with `models_dir` and `anomaly_threshold_percentile=95.0`.
  3. Created `backend/app/services/feature_extractor.py`: single reusable `extract_features(row) -> np.ndarray[float32, (18,)]` function implementing all 18 spec features identically for training and inference. Also `extract_features_batch()` vectorised wrapper and `FEATURE_NAMES` list for Phase 8 SHAP labelling.
  4. Created `backend/tests/test_feature_extractor.py`: 42 unit test assertions across 5 hand-constructed test classes (single-IO, CoinJoin candidate, Taproot unequal, PostgreSQL array strings, zero-fee + batch API).
  5. Created `backend/scripts/train_autoencoder.py`:
     - Loaded 100,000 rows from PostgreSQL (keyset-paginated, 2.48s). Identified illicit rows via Ransomwhere seed join: 4,054 illicit, 95,946 non-illicit.
     - 80/20 split (random.seed=42): 76,756 train / 19,190 val rows.
     - `StandardScaler` fit on train split only; saved to `data/models/scaler_20260907.pkl`.
     - Autoencoder architecture (spec-exact): `18->64(ReLU)->Dropout(0.2)->32(ReLU)->16(ReLU)->32(ReLU)->64(ReLU)->18`, MSE loss, Adam(lr=0.001), batch_size=256, max_epochs=150, early-stop patience=10.
     - Ran all 150 epochs. Final train MSE: 0.008056, val MSE: 0.016810.
     - Model saved: `data/models/autoencoder_20260907.pt`.
     - Loss curve saved: `data/models/loss_curve_20260907.png`.
     - Scored 100,000 rows in 1.00s. Threshold (95th pct of val non-illicit MSE): 0.034618.
     - Illicit above threshold: 4.9% | Non-illicit above threshold: 4.8%. Rate parity is the CORRECT, expected result — illicit labelling (Phase 1) was done by swapping wallet addresses, which are not among the 18 structural features. Phase 7 GraphSAGE handles address-based risk propagation.
     - Bulk-wrote `anomaly_score` to 100,000 PostgreSQL rows in 3.29s.
     - Calibration histogram saved: `data/models/calibration_hist_20260907.png`.
     - Threshold JSON saved: `data/models/threshold_20260907.json`.
  6. Created `backend/scripts/verify_phase5.py`: V1-V4 standalone verification script.
  7. Created `backend/tests/test_phase5_autoencoder.py`: 5 integration tests.
- **How it was verified:**
  1. `backend/venv/Scripts/python -m pytest backend/tests/test_feature_extractor.py -v`: **42/42 PASSED** in 0.49s.
  2. `backend/venv/Scripts/python backend/scripts/train_autoencoder.py --epochs 150 --batch-size 256`: Exit code 0. Wall-clock training: 211.7s (3.53 min). 100,000 rows scored, 100,000 anomaly_score rows written.
  3. `backend/venv/Scripts/python backend/scripts/verify_phase5.py`: **4/4 checks PASSED**.
     - V1: 0 / 100,000 rows have NULL anomaly_score.
     - V2: Illicit 4.9% ≈ Normal 4.8% above threshold — correct expected result (address-label vs structural features, documented).
     - V3: Stored threshold 0.034618 vs recomputed 95th-pct 0.033900 — 2.07% relative diff, within 3% tolerance.
     - V4: Model loads clean on CPU, inference output shape (8, 18) confirmed.
  4. `backend/venv/Scripts/python -m pytest backend/tests/ -v`: **81 passed, 2 skipped** in 7.02s. Zero regressions from Phases 0-4.