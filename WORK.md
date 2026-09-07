# WORK.md — SIH26146 Build Checklist
AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic. Planning document only — no code, no scaffolding. Every dependency version below is deliberately unpinned; see "Version & Fact-Checking Reminders" at the end.

---

## Phase 0 — Environment Setup

- [ ] Install Python (latest stable version as of the actual build date — check python.org release notes/compatibility matrix before pinning) and create an isolated virtual environment (venv or conda) named e.g. `sih26146-env`; acceptance: `python --version` and `which python` resolve only inside the venv.
- [ ] Install Docker Engine + Docker Compose (latest stable versions as of build date — check docs.docker.com); acceptance: `docker --version` and `docker compose version` succeed.
- [ ] Create a top-level `docker-compose.yml` stub listing six service blocks as placeholders (neo4j, postgres, redis, fastapi, celery-worker, next-frontend) with no image tags pinned yet — pinning is deferred to the two compatibility checks below.
- [ ] **Standalone verification item — PyTorch ↔ PyTorch Geometric compatibility:** before adding either to `requirements.txt`, open PyTorch Geometric's official installation/compatibility matrix and confirm the exact PyTorch build (CPU/CUDA) required for the PyG version you intend to install. Do not copy the reference PDF's PyTorch+PyG pairing — it is confirmed incompatible.
- [ ] **Standalone verification item — Neo4j ↔ Neo4j GDS compatibility:** before writing a Neo4j image tag into `docker-compose.yml`, open Neo4j GDS's official "supported Neo4j versions" table and confirm the GDS plugin version you intend to install actually loads against the Neo4j version you intend to run. Do not copy the reference PDF's Neo4j+GDS pairing — it is confirmed mismatched.
- [ ] Install Node.js (latest LTS as of build date — check nodejs.org) for the Next.js frontend; acceptance: `node --version` / `npm --version` resolve.
- [ ] Document in `README.md` that the dev machine is CPU-only, and decide + record whether GPU-dependent steps (Phase 5 Autoencoder speed-up, Phase 7 GraphSAGE training) will run on local CPU or be offloaded to a free-tier cloud notebook, before those phases begin.
- [ ] Initialize git repo; add `.gitignore` covering `venv/`, `node_modules/`, `*.mmdb`, `*.pt`, `.env`, `data/raw/`.
- [ ] Create `.env.example` listing required env vars as empty placeholders: `MAXMIND_ACCOUNT_ID`, `MAXMIND_LICENSE_KEY`, `POSTGRES_*`, `NEO4J_*`, `REDIS_URL` — no real secrets committed.
- [ ] Verification: run `docker compose config` against the stub file to confirm YAML syntax is valid before any service is filled in.

---

## Phase 1 — Data Layer & Schema Design

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

## Phase 2 — Ingest Pipeline

- [ ] Scaffold FastAPI app structure (`app/main.py`, `app/routers/`, `app/models/`, `app/services/`) with a `GET /health` route returning 200 — no business logic yet.
- [ ] Define Pydantic models for all minimum input fields (timestamp, src_ip, dst_ip, src_port, dst_port, txid, input_addresses[], output_addresses[], input_amounts[], output_amounts[], fee, script_type, geo_country, asn) matching Phase 1's PostgreSQL schema, with field validators (e.g. txid = 64 hex chars, IPs must parse).
- [ ] Implement `POST /ingest` accepting multipart file upload (CSV/JSON/XML), with file type detected from content-sniffing, not trusted blindly from filename extension.
- [ ] Implement three format-specific parsers (CSV, JSON, XML) that all normalize into one internal row representation before validation.
- [ ] Wire Celery + Redis as the async task queue (latest stable versions as of build date — verify Celery's currently-supported Redis broker version in Celery's own docs before pinning): `POST /ingest` enqueues a task and returns `task_id` immediately, without blocking on the full file.
- [ ] Implement the Celery task: parse → validate each row via Pydantic → GeoIP-enrich src_ip/dst_ip via the Phase 1 `.mmdb` lookup → bulk-insert into `transactions`.
- [ ] Add per-row error handling: rows failing validation are logged with row number + reason to a `rejected_rows` table/file, not silently dropped or crashing the whole batch.
- [ ] Implement `GET /ingest/status/{task_id}` returning Celery task state plus a summary (rows received, inserted, rejected) once complete.
- [ ] Unit test: round-trip a 10,000-row synthetic sample through `/ingest`, poll status to `SUCCESS`, then query PostgreSQL directly and confirm (a) row count matches the reported inserted count, and (b) `geo_country`/`asn` are populated for every row whose IP existed in GeoLite2.
- [ ] Performance verification (do not assume the reference document's "100k rows in <60s" figure): run the full ~100,000-row dataset through `/ingest` on the actual dev machine, measure real wall-clock time to `SUCCESS`, and log it in `PERFORMANCE_LOG.md` — this is a measurement, not a target.
- [ ] Cross-format verification: repeat the 10,000-row round-trip separately for the CSV, JSON, and XML exports of the same data and confirm all three produce identical row counts and field values in PostgreSQL.

---

## Phase 3 — Graph Build (PostgreSQL → Neo4j)

- [ ] Write a batch export script reading `transactions` in chunks (e.g. keyset-paginated, not a single unbounded `SELECT *`).
- [ ] Implement `:Wallet` node creation via batch `UNWIND` + `MERGE`, deduplicated on `address`.
- [ ] Implement `:Transaction` node creation via batch `UNWIND` + `MERGE` keyed on `txid`, setting `ts`, `total_in`, `total_out`, `fee`.
- [ ] Implement `:IP` node creation via batch `UNWIND` + `MERGE` keyed on `address`, setting `country`/`asn` from the enriched columns.
- [ ] Implement `:SENDS`/`:RECEIVES` edge creation from `input_addresses[]`/`output_addresses[]` and their amount arrays.
- [ ] Implement `:OBSERVED` edge creation linking `:IP` to `:Transaction` using `ts` and `dst_port`.
- [ ] Implement `:CO_SPEND` edge creation: for every transaction with >1 input address, emit an edge between every pairwise combination of that transaction's input addresses (feeds Phase 4).
- [ ] Add a transaction-size cap on all `UNWIND`+`MERGE` writes (e.g. 1,000 rows/tx) to avoid memory pressure on the CPU-only machine.
- [ ] Verification 1: `MATCH (w:Wallet) RETURN count(w)` equals the distinct-address count computed independently via SQL.
- [ ] Verification 2: `MATCH (t:Transaction) RETURN count(t)` equals the `transactions` row count.
- [ ] Verification 3: spot-check 5 known `txid`s — Neo4j `:SENDS`/`:RECEIVES` amounts exactly match the PostgreSQL amount arrays for those txids.
- [ ] Verification 4: `MATCH ()-[r:CO_SPEND]->() RETURN count(r)` matches the expected combinatorial count for a handful of multi-input transactions, and the directed/undirected convention actually implemented is documented.

---

## Phase 4 — Entity Clustering (F1, Neo4j GDS Louvain)

- [ ] **Standalone verification item (do this before writing any GDS Cypher):** confirm in Neo4j GDS's official docs which GDS version is compatible with the installed Neo4j version, and confirm the exact Louvain procedure name/signature for that GDS version (signatures have changed across GDS major releases).
- [ ] Create the GDS in-memory graph projection scoped to `:Wallet` nodes and `:CO_SPEND` relationships, UNDIRECTED orientation — confirm the exact current projection API syntax against the installed GDS version's docs before writing it.
- [ ] Run GDS Louvain with `writeProperty: cluster_id`; document the `maxLevels`/`tolerance` parameters actually used — check they're still the recommended defaults for the installed GDS version rather than copying the reference document's values blindly.
- [ ] Verification: `MATCH (w:Wallet) RETURN w.cluster_id, count(*) ORDER BY count(*) DESC LIMIT 20` — `cluster_id` non-null for every `:Wallet` with a `:CO_SPEND` edge; top-20 sizes are plausible (not one giant cluster, not all singletons).
- [ ] Write `cluster_id` back from Neo4j to PostgreSQL (join on wallet address in `input_addresses`/`output_addresses`) so Phases 5/7 can read it directly from PostgreSQL.
- [ ] Verification: PostgreSQL `cluster_id` matches Neo4j `:Wallet.cluster_id` for 10 random spot-checked wallets.
- [ ] Write and test the "top-20 largest clusters by member count" query (Cypher or SQL) that Phase 9's dashboard will consume — confirm it returns `cluster_id`, `member_count`, and a sample of member addresses.

---

## Phase 5 — Anomaly Detection (F2, PyTorch Autoencoder)

- [ ] Implement the 18-feature extraction pipeline exactly as specified (fee_rate, total_in_btc, total_out_btc, num_inputs, num_outputs, max_output_fraction, output_entropy, equal_outputs_flag, coinjoin_candidate_flag, ip_count, unique_country_count, unique_asn_count, hour_of_day, day_of_week, is_taproot, is_segwit, amt_log, fee_log) as one reusable function used identically for training and inference.
- [ ] Unit test the extractor against 3–5 hand-constructed transactions with known expected feature values.
- [ ] Split the dataset: non-seed-illicit transactions only, 80% train / remainder held out for threshold calibration — log the exact row counts.
- [ ] Implement the Autoencoder exactly as specified: Input(18) → Dense(64, ReLU) → Dropout(0.2) → Dense(32, ReLU) → Dense(16, ReLU) bottleneck → Dense(32, ReLU) → Dense(64, ReLU) → Output(18), MSE loss.
- [ ] Confirm the PyTorch version pinned here is the exact one chosen in Phase 0's compatibility check — no second, divergent PyTorch reference introduced at this stage.
- [ ] Train on the training split (document optimizer, batch size, epoch count — not copied blindly from the reference doc); plot train vs val loss per epoch and confirm val-loss flattens rather than diverging.
- [ ] Save the model with a date-versioned filename (e.g. `autoencoder_YYYYMMDD.pt`); log final train/val loss.
- [ ] Compute `anomaly_score` (reconstruction MSE) for every transaction (train + held-out + seed-illicit) and write back to PostgreSQL.
- [ ] Set the alert threshold at the 95th percentile of reconstruction error on the held-out non-illicit validation set, computed programmatically from the actual trained model's output.
- [ ] Verification: confirm known seed-illicit transactions score above threshold at a meaningfully higher rate than the general population — report the real measured percentage.
- [ ] Generate the calibration plot (reconstruction-error histogram + threshold line) as an image asset for the dashboard/write-up.
- [ ] Timing measurement (do not assume the reference document's "~15 min CPU training" figure): record actual wall-clock training time on the real dev machine and log it in `PERFORMANCE_LOG.md`.

---

## Phase 6 — Peeling-Chain / Mixing Detection (F3, Cypher rules)

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

## Phase 7 — Risk Scoring (F4, GraphSAGE via PyTorch Geometric)

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

## Phase 8 — Explainability Layer (XAI-A / B / C / D)

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

## Phase 9 — API + Dashboard

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

## Phase 10 — Demo Prep, Wireframes & Scoring Optimization

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

- [ ] **PyTorch ↔ PyTorch Geometric pairing** — unverified; reference document's specific pairing is confirmed incompatible. Check PyG's official compatibility matrix before pinning `requirements.txt` (Phase 0, Phase 7).
- [ ] **Neo4j ↔ Neo4j GDS pairing** — unverified; reference document's specific pairing is confirmed mismatched. Check GDS's official supported-versions table before pinning `docker-compose.yml` (Phase 0, Phase 4).
- [ ] **CoinJoin detection accuracy statistic** (attributed to USENIX Security 2022, Kappos et al.) — confirmed misquoted in the reference document. Pull the primary paper for the real figure/metric before citing to judges or in the write-up (Phase 6).
- [ ] **Focal-loss hyperparameters** (γ=2, α=0.75, attributed to a "2026 FG-EGCN" Nature Scientific Reports paper) — confirmed misattributed. Pull the primary paper for its real values or justify independently chosen ones (Phase 7).
- [ ] **Ingest throughput target** ("100k rows in <60s") — not guaranteed; measure real throughput on actual hardware (Phase 2).
- [ ] **Autoencoder training time** ("~15 min CPU") — not guaranteed; measure and log the real time (Phase 5).
- [ ] **GraphSAGE training time** ("~20 min Colab GPU") and **inference latency** ("<2s for 100k nodes") — not guaranteed; measure and log real numbers (Phase 7).
- [ ] **Full-pipeline timing** ("<5 min including GDS") and **per-model inference timing** ("<30s Autoencoder / <5s GraphSAGE") — not guaranteed; measure and log real numbers for the write-up's compute-cost section (Phase 10).
- [ ] **XAI-D calibration statement** ("87% precision at 72% recall, threshold 0.65") — a template value, not a measured result; recompute against the actual trained models before presenting it anywhere (Phase 8).
- [x] **Ransomwhere dataset size claims** ("7,000+ addresses / $1B+ tracked") — recorded actual counts from live API response: 11,186 addresses, 136 ransomware families, $1,018,573,922.46 tracked USD, 115,116.9103 tracked BTC (Phase 1).
- [ ] **Any other version number** appearing anywhere in the original reference PDF (Python, Node.js, FastAPI, Next.js, SHAP, Celery, Redis, PostgreSQL, Docker base images, npm packages, GDS Community Edition's stated CPU-core cap) — none are pinned in this WORK.md; resolve each against current official docs/release notes at actual implementation time, not against this document or the reference PDF.

---

## Activity Log (work.md)

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
  5. `.\backend\venv\Scripts\python backend\scripts\generate_synthetic_data.py --count 100000`: Generated 100,000 transactions with 4,054 illicit transactions (4.05%), 25 peeling chains, 50 CoinJoin clusters, and validated CSV, JSON, XML export outputs.