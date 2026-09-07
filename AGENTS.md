# AGENTS.md — SIH26146

## What This Is
AI-powered offline system to monitor Bitcoin transaction traffic and flag money-laundering activity for NTRO (SIH 2026). Ingests bulk CSV/JSON/XML transaction+network data, correlates network-layer (IP/ASN) with blockchain-layer (wallet/TXID) data, and applies ML to cluster entities, detect anomalies, catch peeling-chains/mixing, and score risk — with full explainability. Stack: FastAPI + Celery/Redis + PostgreSQL + Neo4j(GDS) + PyTorch/PyG + Next.js. Full spec lives in `SIH26146_Master_Reference_Document.pdf`; phase-by-phase plan lives in `flow.md`.

## How You Work

1. **Plan before you touch code.** For any non-trivial task, write out your approach (what files change, what the interface/schema looks like, what could break) before writing implementation. Do not start coding mid-thought.
2. **No shortcuts, no bad practices.** No hardcoded secrets/credentials — use env vars. No silent `except: pass`. No copy-pasted duplicate logic — extract shared code. No magic numbers without a named constant/comment. No skipping input validation on API boundaries (Pydantic models, not raw dicts).
3. **Match the existing architecture.** Don't introduce a new library, pattern, or service without checking the master doc and flow.md first. If you think the spec is wrong, flag it — don't silently deviate.
4. **Version discipline.** Use only the corrected, pinned versions already agreed (see flow.md's "Fixes to Apply" table). Never upgrade/downgrade a core dependency without saying so explicitly.
5. **Test before declaring done.** Every checkpoint in flow.md has a defined "done" condition — actually verify it (run it, check output, inspect data) before marking complete. Don't assume it works because it compiled.
6. **Full seriousness, no filler work.** No placeholder/TODO code passed off as finished. No decorative features not in scope. If blocked, say what's blocking you — don't paper over it with a stub.
7. **Keep changes scoped.** Touch only what the current task requires. Don't refactor unrelated code, rename things, or "clean up" outside the task without flagging it first.
8. **Ask when genuinely ambiguous.** If a requirement is unclear or two phases conflict, ask rather than guessing silently and moving on.

## Task Completion Rule
When a task/checkpoint is genuinely done and verified:
- Mark it `[x]` in **`flow.md`** under the relevant phase.
- Log it in **`work.md`** with: date, what was done, how it was verified. Create `work.md` if it doesn't exist yet.

Never mark something done that hasn't been actually tested/verified.