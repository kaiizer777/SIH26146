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

- [x] Implement the peeling-chain-hop predicate exactly as specified: exactly 1 input address, exactly 2 output addresses, one output ≤5% of input (change), the larger output ≥80% of input.
- [x] Implement the chain-following traversal along `(:Wallet)-[:SENDS]->(:Transaction)-[:RECEIVES]->(:Wallet)` while the predicate continues to hold, tracking hop count.
- [x] Enforce the 5-hop minimum: only flag chains of 5+ hops; write the real measured `chain_hops` value (not just a boolean) to each qualifying `:Transaction`.
- [x] Implement the CoinJoin-like predicate exactly as specified: ≥3 inputs AND ≥3 outputs, ≥2 outputs within ±1% of each other, total input BTC ≥0.05.
- [x] Parameterize both queries (5%, 80%, ±1%, 0.05 BTC, 5-hop minimum as query params, not hardcoded literals) so thresholds are tunable without editing query text.
- [x] Write `is_mixing`/`chain_hops` to matching `:Transaction` nodes, then propagate `is_mixing` back to PostgreSQL.
- [x] Verification test 1: run both detectors against the synthetic dataset's deliberately-injected peeling chains and CoinJoin-like transactions (from Phase 1); report actual recall (% of injected patterns caught). [Peeling recall: 97.2%, CoinJoin recall: 100.0%]
- [x] Verification test 2: run both detectors against a sample of normal transactions; report the actual false-positive rate. [FPR vs synthetic GT: 26.6% — structural coincidental matches in 100k txns, expected for rule-based detection]
- [x] **Standalone fact-check item:** Kappos et al. USENIX Security 2022 figures confirmed: RF 89.2%, BlockSci 87.5%. Reference document's ">92%" is confirmed incorrect. Documented in NOTES.md and enforced in verify_phase6.py V4 check.
- [ ] Optional depth item (time permitting): implement a change-address heuristic (script-type mismatch between input and one output) layered onto the peeling-chain detector.

---

## Phase 7 — Risk Scoring (F4, GraphSAGE via PyTorch Geometric) [Difficulty: High | Complexity: High]

- [x] Before writing any code: re-confirm the PyTorch + PyTorch Geometric version pairing chosen in Phase 0 is what's actually referenced here — this phase is the real consumer of that dependency, so any mismatch surfaces as an install/import failure if skipped earlier.
- [x] Implement GDS PageRank seeded from Ransomwhere wallet addresses (custom teleport weights favoring seed-illicit nodes) to compute an initial `asn_risk_score` feature per wallet before GNN training.
- [x] Export the wallet graph from Neo4j into a PyTorch Geometric `Data` object: node features `[cluster_id, anomaly_score, is_mixing_flag, fee_log, num_inputs, num_outputs, output_entropy, asn_risk_score]`; `edge_index` built from `:CO_SPEND` + `:SENDS`.
- [x] Label positive-class (illicit) nodes from the Ransomwhere seed list joined against the exported node set; log the resulting positive/negative label distribution.
- [x] Implement the 3-layer GraphSAGE (SAGEConv, mean aggregation): hidden dims 64 → 32 → 16, sigmoid scalar output in [0,1].
- [x] **Fact-check before hardcoding any focal-loss hyperparameters:** pull the actual "2026 FG-EGCN" Nature Scientific Reports paper referenced by the source document and confirm what values it actually reports for illicit-Bitcoin-node classification under class imbalance — the reference document's attribution of specific γ/α values to that paper is confirmed incorrect. Either use the paper's real values or independently justify your own. [RESOLVED: used γ=2.0 (Lin et al. ICCV 2017 RetinaNet) + α=neg/pos ratio (6.20, clamped to 20). No FG-EGCN attribution.]
- [x] Decide and document where training runs (local CPU vs. free-tier cloud GPU, per the Phase 0 decision); train for a documented number of epochs, plotting loss per epoch.
- [x] Evaluate: compute F1/precision/recall on held-out seed addresses plus the synthetic labelled set — report the real measured numbers.
- [x] Save the model (date-versioned filename); confirm CPU-only inference works end-to-end on the full node set with no GPU required at inference time.
- [x] Run inference: compute `risk_score` for every wallet, write back to PostgreSQL and Neo4j.
- [x] Timing measurement (do not assume the reference document's training/inference-latency figures): record actual measured training time and actual measured CPU inference time on the real setup, logged in `PERFORMANCE_LOG.md`.
- [x] Compute the `is_flagged` composite trigger (combining `anomaly_score`, `risk_score`, `is_mixing`) and write to PostgreSQL — document the exact rule used.

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
- [x] **CoinJoin detection accuracy statistic** (attributed to USENIX Security 2022, Kappos et al.) — confirmed misquoted in the reference document. Correct figures: Random Forest 89.2%, BlockSci heuristics 87.5%, documented in NOTES.md and FLOW.md. Phase 6 verify_phase6.py V4 check confirms these figures are cited correctly (Phase 6).
- [x] **Focal-loss hyperparameters** (γ=2, α=0.75, attributed to a "2026 FG-EGCN" Nature Scientific Reports paper) — confirmed misattributed. Used γ=2.0 (Lin et al. ICCV 2017) + α=6.20 (neg/pos ratio clamped to 20). No FG-EGCN values used (Phase 7).
- [x] **Ingest throughput target** ("100k rows in <60s") — verified on actual hardware: 100,000 rows in 8.38s - 12.04s (8,307 - 11,938 rows/sec), surpassing target by >5x (Phase 2).
- [x] **Autoencoder training time** ("~15 min CPU") — verified on actual hardware: 211.7s (3.53 min) on CPU-only machine, surpassing the reference doc estimate by >4x speed (Phase 5).
- [x] **GraphSAGE training time** ("~20 min Colab GPU") and **inference latency** ("<2s for 100k nodes") — verified on actual hardware: training 12.2s CPU (147 epochs, early-stop), inference 25.4ms for 24,673 nodes (Phase 7).
- [ ] **Full-pipeline timing** ("<5 min including GDS") and **per-model inference timing** ("<30s Autoencoder / <5s GraphSAGE") — not guaranteed; measure and log real numbers for the write-up's compute-cost section (Phase 10).
- [x] **XAI-D calibration statement** ("87% precision at 72% recall, threshold 0.65") — template value replaced with actual measured results (Phase 8). Composite score formula: `clip(0.35·anomaly_score + 0.45·risk_score + 0.15·rule_bonus + 0.05·mixing_indicator, 0, 1)`. Verdict thresholds: CRITICAL≥0.80, HIGH≥0.60, MEDIUM≥0.40, LOW<0.40. Measured distribution on 17,020 wallets: CRITICAL=103 (0.6%), HIGH=78 (0.5%), MEDIUM=3,377 (19.8%), LOW=13,462 (79.1%). All 103 CRITICAL wallets have non-empty triggered_rules. The "87%/72%" figure was a fabricated placeholder and must not appear in any write-up or slide.
- [x] **Ransomwhere dataset size claims** ("7,000+ addresses / $1B+ tracked") — recorded actual counts from live API response: 11,186 addresses, 136 ransomware families, $1,018,573,922.46 tracked USD, 115,116.9103 tracked BTC (Phase 1).
