# AGENTS.md — SIH26146

## What This Is
AI-powered offline system to monitor Bitcoin transaction traffic and flag money-laundering activity for NTRO (SIH 2026). Ingests bulk CSV/JSON/XML transaction+network data, correlates network-layer (IP/ASN) with blockchain-layer (wallet/TXID) data, and applies ML to cluster entities, detect anomalies, catch peeling-chains/mixing, and score risk — with full explainability. Stack: FastAPI + Celery/Redis + PostgreSQL + Neo4j(GDS) + PyTorch/PyG + Next.js. No master reference PDF is committed to this repo; `flow.md` is the authoritative phase-by-phase plan and `docs/WORK-1.md` / `WORK-2.md` are the execution record.


## Instructions for AI Agents Working on This Repo

This is a **production-grade, user-facing system** — not a side project, demo, or prototype. Real repos, real CI, real PRs. Code quality must be shippable. Treat every change as if it will run in production tomorrow.

Strict: Never write, modify, or debug code without viewing the matching skill file first.

Don't make branches when working on this repo as this repo is exception to the branch and pr type work, so directly work on the main branch.

## How You Work

1. **Plan before you touch code.** For any non-trivial task, write out your approach (what files change, what the interface/schema looks like, what could break) before writing implementation. Do not start coding mid-thought.
2. **No shortcuts, no bad practices.** No hardcoded secrets/credentials — use env vars. No silent `except: pass`. No copy-pasted duplicate logic — extract shared code. No magic numbers without a named constant/comment. No skipping input validation on API boundaries (Pydantic models, not raw dicts).
3. **Match the existing architecture.** Don't introduce a new library, pattern, or service without checking `flow.md` and the matching `docs/WORK-*.md` log first. If you think the spec is wrong, flag it — don't silently deviate.
4. **Version discipline.** Use only the corrected, pinned versions already agreed (see flow.md's "Fixes to Apply" table). Never upgrade/downgrade a core dependency without saying so explicitly.
5. **Test before declaring done.** Every checkpoint in flow.md has a defined "done" condition — actually verify it (run it, check output, inspect data) before marking complete. Don't assume it works because it compiled.
6. **Full seriousness, no filler work.** No placeholder/TODO code passed off as finished. No decorative features not in scope. If blocked, say what's blocking you — don't paper over it with a stub.
7. **Keep changes scoped.** Touch only what the current task requires. Don't refactor unrelated code, rename things, or "clean up" outside the task without flagging it first.
8. **Ask when genuinely ambiguous.** If a requirement is unclear or two phases conflict, ask rather than guessing silently and moving on.

## Dev Server Execution Rule
When the user asks to "spin up dev server", "start dev server", or run the project locally without Docker:
- **Strictly follow [`docs/dev-server.md`](docs/dev-server.md)**.
- Ensure backend (`uvicorn app.main:app --reload --port 8000`), Celery worker (`celery -A app.celery_app worker --loglevel=info --pool=solo`), and frontend (`npm run dev`) are executed according to the exact environment configurations and port mappings detailed in `dev-server.md`.

## Task Completion Rule
When a task/checkpoint is genuinely done and verified:
- Mark it `[x]` in **`flow.md`** under the relevant phase.
- Log it in **`WORK-2.md`** (or `WORK-1.md` for historical Phase 0-8 items) with: date, what was done, how it was verified.

Never mark something done that hasn't been actually tested/verified.