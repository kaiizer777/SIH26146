# Context Transfer — SIH26146

**Date:** 2026-09-29 · **Branch:** `main` (this repo is a documented exception — work directly on `main`, no branches/PRs)
**State at handoff:** everything in "Done" is committed and pushed to `origin/main` at `b7bcccd`.

---

## 0. YOU ARE THE ORCHESTRATOR — READ THIS FIRST

**Do not implement anything yourself.** This task is large and parallelisable.

1. **Delegate all implementation to `worker` subagents.** Give each a self-contained brief: scope, exact files they own, what they must not touch, and how to verify.
2. **Delegate all review/verification to `verifier` subagents, not yourself.** Have them exercise the **live running system** (HTTP endpoints, psql, Neo4j) and treat every prior claim as unverified until reproduced. Assume nothing.
3. **Never let two agents own the same file.** Serialise the ones that touch `enrich.py`, `entity.py`, `alerts.py`, `xai_store.py`, `inline_scorer.py`.
4. **Report failures honestly.** An honest FAIL is more useful than a soft PASS. Do not let an agent claim a fix it did not measure.
5. Keep the user informed between phases. They have time; prefer correctness over speed.

> ⚠️ Subagents have repeatedly died mid-task with `insufficient balance (1008)`. **A dead agent mid-run can leave a half-finished destructive change.** Before trusting any state, verify it. For multi-step destructive DB work, consider doing it yourself.

---

## 1. Environment cheat-sheet (hard-won, saves an hour)

| Fact | Value |
| :--- | :--- |
| API auth | `Authorization: Bearer dev-token-ntro-2026` |
| **API routes are at ROOT, not `/api/v1`** | `POST /ingest` · `GET /ingest/status/{task_id}` · `GET /ingest/enrichment/{task_id}` · `GET /alerts` · `GET /entity/{address}/explain` |
| Upload shape | multipart form field named `file` — use `curl.exe -F "file=@data/test_2000.csv;type=text/csv"` (PowerShell `-InFile` is wrong) |
| Tests | `docker compose exec -T fastapi python -m pytest tests -q` — **host cannot import `app`** |
| SQL | `docker compose exec -T postgres psql -U sih_user -d sih_bitcoin` — **`psycopg` is NOT installed**, don't try SQLAlchemy |
| Neo4j | `bolt://neo4j:7687`, creds `neo4j` / `password123` |
| Compose services | `fastapi`, `celery-worker` (container names are `sih26146-*`) |
| Restart after code change | `docker compose restart fastapi celery-worker`, then wait ~15s |
| Neo4j 6.x trap | fully-bound `MERGE (a:X {k:$p})-[r]->(b:Y {k:$p})` throws `ConstraintValidationFailed`. Use MATCH-then-MERGE. See `graph_writer.py` |
| Cypher traps | `count(n) FILTER (...)` invalid → use `sum(CASE WHEN ...)`; `tot` is reserved; `size((a)-[]-())` invalid → use `COUNT {}` |
| Script in container | run from `/app`; a script at `/tmp` needs `-e PYTHONPATH=/app` |

---

## 2. Database state (ingested data was deliberately deleted at handoff)

| Store | Count |
| :--- | :--- |
| PG `transactions` | **99,990** |
| Neo4j `:Wallet` | **24,659** |
| Neo4j `:Transaction` | **99,999** |
| Neo4j `:IP` | **2,540** |
| Dashboard entities | **15,873** → CRITICAL 111 · HIGH 2 · MEDIUM 3,112 · LOW 12,648 |
| `data/xai/runtime/` | **empty** (gitignored generated overlay) |
| Redis `file_hash:*` | **cleared** |

Ingested data is identified by `cluster_id >= 1000000`. **Important trap:** freshly-ingested PG rows have `cluster_id IS NULL` *until enrichment finishes* — the boundary only works after the chain completes.

---

## 3. What was DONE (committed, pushed)

| # | Fix | Why it mattered |
| :--- | :--- | :--- |
| 1 | Regenerated `data/generate_synthetic.py` with real topology | It seeded a fresh address per row ("zero duplicate addresses") → 2,000 disconnected stars, 0 wallets in >1 tx. Now 72.7% in >1 tx, max 191 tx/wallet, 64 peel chains, IPs reused 119× |
| 2 | New `services/graph_writer.py` + `tasks/enrich.py` | Ingest wrote **Postgres only, never Neo4j** → no `:Wallet`/`:Transaction`/`:IP`, no `CO_SPEND` → graphs rendered as isolated dots. Now writes both + auto-chains Louvain/peel/CoinJoin/risk/publish |
| 3 | `_mirror_anomaly_to_graph()` in `enrich.py` | **Root cause of the flat scoring.** FT-Transformer wrote `anomaly_score` to PG, but the XAI publish stage reads it from **Neo4j**, where nothing ever wrote it. Value dropped between stores. `mixing_indicator` also stored the weighted component instead of 0/1, and required `chain_hops == 0`. Together these capped every ingested wallet at **0.521** — below the 0.60 HIGH threshold. CRITICAL/HIGH were *mathematically unreachable* |
| 4 | `anomaly_score` NUMERIC(6,4) → **NUMERIC(12,4)** | Unbounded MSE reaches ~326 but the column saturated at 99.9999 |
| 5 | Verdict labels now **derived** via `map_verdict` in `entity.py`, `alerts.py`, `xai_store.verdict_counts()` | Stored `verdict` strings were produced under the old cut and survived the threshold change, so the table/drawer/graph each reported different severities for one wallet |
| 6 | CRITICAL cut **0.80 → 0.65** | At 0.80 the tier was unreachable for ingested wallets (max score 0.7812) |
| 7 | `graph.py`: colour by composite_score, not raw `risk_score`; reserve 24 node-budget slots for highest severity | A CRITICAL (1.000) wallet rendered **green** because its raw graph risk was 0.202, and was cut from its own cluster by degree-first ordering |
| 8 | `"Clean"` → `"No seed hit"` | The column reports seed-intelligence match only. "Clean" next to `CRITICAL 1.000` + `7-hop peel` read as "nothing to see" |
| 9 | `setup.md` updated | Counts, restart requirement, 24h dedup, SHAP caveat, baseline numbers |

### Verified on a clean-slate run (deleted all ingested data → re-ingested → re-enriched)

```
8,137/8,137 wallets scored
CRITICAL 116 (1.43%) · HIGH 607 (7.46%) · MEDIUM 3,818 (46.9%) · LOW 3,596 (44.2%)
anomaly_score max 326.6, non-zero for 4,909      mixing_indicator 1.0 for exactly 1,984
pass_through_ratio: 957 measured, 0 unavailable
score components sum to composite_score ....... 0 / 25 mismatches
label agreement table vs drawer ............... 0 / 25 mismatches
ingested cluster topology: 150 nodes / 377-478 links, mean degree 5.03-6.37
                             (pre-loaded baseline cluster = 1.59)
```

Backend suite: **8 failed / 240 passed / 2 skipped** — all 8 pre-existing (fixture paths resolving `/data` vs `/app/data`, hardcoded row counts now seeing 101,990, stale model thresholds). None introduced.

---

## 4. NEXT WORK — priority order

### P1 · Live progress UI during enrichment *(do first — most demo-visible per hour)*

**Why:** the enrichment chain takes **6–7 minutes** of dead air. Its per-stage output is the most persuasive thing the system produces and is currently buried in `docker compose logs`.

**Current state:** `GET /ingest/enrichment/{task_id}` exists but is *after-the-fact* only. `enrich.py` runs ~9 stages, logs to stdout, returns one stats dict at the end. **There is no live progress plumbing.** (That is why the endpoint returned `not_dispatched` when probed mid-run.)

**Stage timings (lopsided — matters for design):**

| Stage | Time |
| :--- | ---: |
| cluster (Louvain) | ~6s |
| **peel** | **~73s** |
| coinjoin | ~0.5s |
| **risk (wallet_attributes)** | **~90s** |
| seed | ~9s |
| pg anomaly + mirror | ~20s |
| **publish** | **~157s** |
| schema_contract | ~1s |

**Deliverable:**
1. `enrich.py` publishes `{stage, status, elapsed, counts}` to Redis after each stage.
2. `/ingest/enrichment/{task_id}` returns partial state.
3. Frontend polls ~1.5s and renders a **stage list with real counts** — NOT a naive percentage bar.
4. On completion, trigger an XAI-store reload (see P2).

**⚠️ The trap:** a percentage bar sits frozen at ~47% for three minutes (risk + publish) and reads as a hang. Must be per-stage. `publish` is already batched so it can honestly show `12,400 / 16,923`; `peel` and `risk` need intermediate checkpoints or at minimum a live elapsed counter.

**Est: 5–7 hrs.**

---

### P2 · XAI store staleness *(same code area as P1 — bundle them)*

`xai_store` loads into memory at process start. New entities are written to disk during enrichment but the running API serves the old snapshot. **Ingest → immediately film dashboard → count has not moved.**

Today the manual fix is `docker compose restart fastapi` mid-demo. Make the P1 completion handler reload the store instead, so ingest→dashboard becomes one click.

**Est: 0.5–1 hr once P1 exists.**

---

### P3 · SHAP is degenerate for ingested wallets *(the real correctness hole)*

**Measured: 48 of 48 sampled ingested wallets — 12 each from CRITICAL/HIGH/MEDIUM/LOW — have `contribution == 0.0` on all 18 attributions.**

Important nuance: the payload is **present and correct** — 18 entries with real `feature`, `label` and `value` (e.g. `num_outputs`, value `32.691014`). Only `contribution` is zero. Feature extraction demonstrably works; the values are real and non-trivial.

**Seeded wallets are fine** — `data/xai/shap_attributions.json` is txid-keyed, 4,839 records, real signed non-zero attributions (e.g. `output_entropy attribution=+0.02052588`).

**Why it is almost certainly a wiring gap, not math:** `shap.PermutationExplainer` in `services/shap_service.py` was independently verified at additivity ~2e-6. The values are *exactly* zero, not small — math does not produce exact zeros; a disconnected code path does.

**Two unknowns to resolve first (do NOT design around these yet):**
- Does the FT-Transformer load **inside the Celery worker**? A worker flagged `torch_geometric` may be missing. If it can't load in Celery, compute-at-ingest is impossible and the design changes completely.
- Would `LinearExplainer` work? Exact and far faster. If yes, the cost constraint below evaporates.

**Cost budget (why a gate is needed) — ~10s/tx at `max_evals=2000`:**

| Gate | Wallets | Time |
| :--- | ---: | ---: |
| all | 8,137 | **22.6 hrs** |
| top 1,000 by score | 1,000 | 2.8 hrs |
| CRITICAL + HIGH | 723 | 2.0 hrs |
| CRITICAL only | 116 | 19 min |

**Design guidance:** gate on **rank by `composite_score`, not on the verdict label.** The label is derived and threshold-dependent (it already moved once this session); gating on it re-creates the exact bug being fixed — "explanation exists only for some wallets" — at a different boundary. Pair a precomputed top-N with **on-read compute as a backstop** so no wallet ever hits a hard "unavailable" wall.

**P3a — do regardless of P3b, ship first (~1–2 hrs, low risk):** never present a degenerate vector as real. Add an explicit `shap_available` flag; UI says *"explanation unavailable"* instead of drawing a flat waterfall; add a test that fails if zeros are returned as real. This is not a performance decision — it is the dossier telling the truth.

**Est: P3a 1–2 hrs · P3b 4–8 hrs · total 4.5–10 hrs.**

---

## 5. Smaller open items

| Item | Note |
| :--- | :--- |
| **24h Redis upload dedup** | Second click on the demo tile → `409`. Clear: `docker compose exec -T redis sh -c "redis-cli --scan --pattern 'file_hash:*' \| xargs -r redis-cli del"` |
| **14 wallets missing** | Same count in two independent places (8,137 demo addresses → 8,123 published; 24,673 Neo4j baseline → 24,659). Likely one systematic loss, untraced. Invisible on camera |
| **seed steps 3–6 may be redundant** | `setup.md` flags this. Ingest now writes Neo4j + auto-enriches. Validated on the 2k file, **not** on a from-scratch 100k seed. Confirm `publish: wrote N wallets` appears in celery logs after step 2 before dropping them |
| **8 failing backend tests** | All pre-existing. Don't fix by weakening assertions |
| `docs/demo-brief/` | Untracked, 3.19 MB of demo PDFs/PNGs. User's material — do not commit without asking |
| `risk_score_source` in alerts payload | Deferred as cosmetic; not rendered in the UI |
| `frontend/src/{app/globals.css,components/IngestModal.tsx}` | Uncommitted. Adds a `.tactile-btn-sky` class and switches two retry buttons to it. Also has a stray leading space in `" Ingestion Failed"` |

---

## 6. Do NOT regress these

- `test_provisional_explain.py::test_get_entity_explain_provisional_flow` asserts breakdown sums to `composite_score` within 1e-6. **Do not weaken it.**
- `LEGACY_INLINE_VERDICT_TIERS` in `risk_thresholds.py` is audit-only — never label records with it.
- Ingested PG rows have `cluster_id IS NULL` until enrichment runs. Do not assume the boundary is available before the chain finishes.
- `data/xai/runtime/` is gitignored generated state (~20 MB rewritten per run). Never commit it.
