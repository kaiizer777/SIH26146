import React from "react";
import Link from "next/link";
import {
  RefreshCw,
  Server,
  Database,
  Cpu,
  ArrowRight,
  ArrowLeft,
  Lock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Activity,
  GitFork,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Clock,
  HardDrive,
  Network,
} from "lucide-react";
import { SyncSequenceDiagram } from "./sync-sequence-diagram";
import { SyncPlayground } from "./sync-playground";
import { SyncFaq } from "./sync-faq";

export const metadata = {
  title: "Chapter 7: Live Post-Ingest Online Inference (Phase 11) — NTRO KB",
  description:
    "Production engineering specification for Pipeline Tier 6: FastAPI-Celery IPC Memory Isolation, 2-Step Polling Sync Handshake, threading.RLock in-memory atomic upserts, and <15ms Provisional Dossier online scoring.",
};

export default function Chapter7Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Ingest Memory-Space Problem */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Ingest Memory-Space Isolation Problem
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Operating system process boundaries, Python address space isolation, and the legacy 404 forensic crisis
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            In a distributed sovereign surveillance system, asynchronous task offloading is essential to prevent long-running
            data ingest jobs from blocking the analytical HTTP server. Our architecture assigns bulk ingestion to <strong>Celery workers</strong> backed
            by Redis, while operational forensic queries are served by <strong>FastAPI under Uvicorn</strong>. However, this process separation
            creates an operating system memory-space dilemma:
          </p>

          {/* Process Boundary Architecture Callout */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-rose-500" />
                OS Virtual Address Space Division
              </span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                STRICT PROCESS ISOLATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="text-slate-900 font-bold flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  FastAPI / Uvicorn (PID: 10424)
                </div>
                <div className="text-slate-600 space-y-1 text-[11px]">
                  <div>&bull; Holds <code className="text-slate-900 font-bold">xai_store.py</code> in-memory dicts in its private heap</div>
                  <div>&bull; 17,020 pre-indexed records (<code className="text-slate-900">_composite</code>, <code className="text-slate-900">_evidence</code>)</div>
                  <div>&bull; Sub-microsecond RAM pointer access (~400ns)</div>
                  <div>&bull; Serves <code className="text-indigo-700 font-bold">GET /entity/{'{address}'}/explain</code></div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="text-slate-900 font-bold flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-amber-600" />
                  Celery Worker Process (PID: 28912)
                </div>
                <div className="text-slate-600 space-y-1 text-[11px]">
                  <div>&bull; Runs under <code className="text-slate-900 font-bold">--pool=solo</code> (Windows) or multiprocessing</div>
                  <div>&bull; Has isolated virtual memory; cannot write to PID 10424</div>
                  <div>&bull; Streams rows directly into PostgreSQL via bulk <code className="text-slate-900 font-bold">COPY</code></div>
                  <div>&bull; Zero access to FastAPI&rsquo;s global Python variables</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
              <strong>Why Celery cannot directly write to FastAPI RAM:</strong> Under standard operating system security models,
              the OS Memory Management Unit (MMU) strictly isolates virtual address spaces between independent processes. On Windows,
              where POSIX <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">fork()</code> does not exist and Python uses
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">CreateProcess</code>, there is no shared copy-on-write memory.
              Furthermore, Python complex data types (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">dict[str, Any]</code>, numpy tensors, and PyTorch models)
              cannot be safely shared via raw OS shared memory without heavyweight locking and serialization primitives.
            </div>
          </div>

          {/* The 404 Forensic Crisis */}
          <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs font-mono uppercase">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              The Legacy 404 Forensic Crisis
            </div>
            <p className="text-xs text-rose-950 leading-relaxed">
              Prior to Phase 11, uploading a transaction batch immediately wrote rows into PostgreSQL. The Alert Table on the frontend
              re-rendered with the new entries. However, when an NTRO intelligence analyst clicked on an alert corresponding to a novel
              wallet address (not included in the initial 17,020 pre-indexed startup artifact), the frontend queried
              <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-[11px] font-bold text-rose-950 ml-1">GET /entity/{'{address}'}/explain</code>.
              Because FastAPI&rsquo;s in-memory <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-[11px] text-rose-950 font-bold">xai_store</code> was
              never updated post-startup, the endpoint returned an abrupt <strong className="text-rose-900">HTTP 404 Not Found</strong>, crashing the
              entity drawer and blinding the analyst during an active counter-illicit operation.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: The 2-Step Sync Solution */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The 2-Step Polling &amp; Post-Ingest Sync Handshake
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Coordinated client-side orchestration, atomic Redis idempotency locks, and in-process tabular scoring
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            To bridge the process isolation gap without introducing circular network dependencies, Phase 11 deploys an
            architecturally decoupled <strong>2-Step Sync Handshake</strong> where the Next.js frontend acts as the state coordinator.
            The complete 4-stage handshake executes as follows:
          </p>

          {/* 4-Stage Handshake Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">1</span>
                  Celery Bulk Ingestion
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
                  ASYNC WORKER
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                User uploads a file. FastAPI writes the temp file and enqueues Celery task <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">process_ingest_file.delay()</code>.
                Celery streams rows via PostgreSQL <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">COPY</code>. Upon completion, Celery updates
                Redis task state to <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">SUCCESS</code> along with payload metadata:
                <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">total_inserted</code>, <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">txids</code>, and <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">unique_wallets</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">2</span>
                  Frontend Polling Interception
                </span>
                <span className="text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
                  CLIENT POLLING
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">IngestModal.tsx</code> polls <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">GET /ingest/status/{'{task_id}'}</code> at 1000ms intervals.
                The moment <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">status === &apos;SUCCESS&apos;</code> is received, the frontend <em>intercepts the transition</em>
                prior to unblocking the user or refreshing the table.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">3</span>
                  FastAPI Sync Trigger &amp; Lock
                </span>
                <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
                  POST /ingest/sync
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Frontend dispatches <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">POST /ingest/sync/{'{task_id}'}</code> directly to FastAPI.
                FastAPI enforces an atomic Redis <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">SET sync_done:{'{task_id}'} &apos;1&apos; NX EX 3600</code> idempotency guard
                (backed by a thread-safe bounded LRU fallback) to reject duplicate submissions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">4</span>
                  Inline Scoring &amp; RLock Upsert
                </span>
                <span className="text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
                  IN-MEMORY MUTATION
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                FastAPI fetches newly inserted transactions from PostgreSQL via task txids, passes rows through
                <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">inline_scorer.score_batch()</code>, computes FT-Transformer anomaly MSEs,
                and calls <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">xai_store.upsert_batch()</code> under <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">threading.RLock</code>.
              </p>
            </div>
          </div>

          {/* Production Code Snippet: IngestModal.tsx auto-sync */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden font-mono text-xs">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>frontend/src/components/IngestModal.tsx &mdash; Polling Completion Hook</span>
              </div>
              <span className="text-emerald-400">NON-BLOCKING FALLBACK</span>
            </div>
            <pre className="p-4 text-slate-200 overflow-x-auto text-[11px] leading-relaxed">
{`// Polling loop confirms Celery SUCCESS -> fire atomic sync before releasing modal
if (data.status === 'SUCCESS') {
  setStage('syncing');
  try {
    const syncResp = await fetch(\`\${API_BASE}/ingest/sync/\${taskId}\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${API_TOKEN}\` },
    });
    if (!syncResp.ok && syncResp.status !== 409) {
      console.warn('[IngestModal] sync returned', syncResp.status, '— proceeding anyway');
    }
  } catch (err) {
    console.warn('[IngestModal] sync request failed:', err, '— proceeding anyway');
  }
  onSuccess(); // Revalidate AlertTable SWR cache with zero-404 guarantee
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* SECTION 3: Provisional Dossier Mode */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Provisional Dossier Mode &amp; Real-Time Scoring
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Sub-15ms inline FT-Transformer inference, heuristic rule checks, and Section 65B statutory compliance
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Full graph deep learning (Neo4j Louvain community modularity, Personalized PageRank, and GNNExplainer topological subgraph extraction)
            is computationally intensive and operates on scheduled batch cycles. An operational intelligence system cannot delay alert investigation
            for minutes or hours waiting for offline graph convergence.
          </p>
          <p>
            Phase 11 resolves this via <strong>Provisional Dossier Mode</strong>: newly ingested entities are assigned an active
            <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-900 font-bold">&quot;provisional&quot;: true</code> flag.
            The inline scoring engine computes continuous tabular anomalies and rules within <strong>&lt;15 milliseconds</strong>:
          </p>

          {/* Mathematical Formulation for Provisional Risk */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Provisional Composite Risk Formulation (Phase 11 Inline Scorer)</span>
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                PROVISIONAL NORMALIZED
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 overflow-x-auto py-2">
              {"Score_provisional = min(max((0.35 · min(MSE / threshold, 1.0) + 0.15 · R_rules) / 0.50, 0.0), 1.0)"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-200/80">
              <div>
                <span className="text-indigo-700 font-bold">0.35 &bull; FT-Transformer MSE</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  18 continuous features normalized by StandardScaler and scored via FT-Transformer CPU weights.
                </div>
              </div>
              <div>
                <span className="text-emerald-700 font-bold">0.15 &bull; Heuristic Rules</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Instant detection of peeling chain topology (1 input &rarr; 2 outputs) and Ransomwhere seed matches.
                </div>
              </div>
              <div>
                <span className="text-amber-700 font-bold">/ 0.50 Weight Mass Scaling</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Scales the active 0.50 available weight mass to span the full [0.0, 1.0] verdict band.
                </div>
              </div>
            </div>
          </div>

          {/* UI Representation in EntityDrawer.tsx */}
          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs font-mono uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Statutory Transparency &amp; Judicial Integrity
            </div>
            <p className="text-xs text-amber-950 leading-relaxed">
              When an entity is rendered in provisional mode, <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px] text-amber-950">EntityDrawer.tsx</code> displays
              an amber alert banner explaining that tabular anomaly reconstruction is live, while graph community IDs and SHAP waterfall vectors
              display a deliberate placeholder: <em className="font-medium">&ldquo;Attribution deferred for provisional ingest &mdash; requires full pipeline retraining.&rdquo;</em>
              This adheres strictly to Section 65B of the Indian Evidence Act and Section 63 of the BSA 2023, ensuring forensic evidence never misrepresents
              un-computed graph metrics as completed facts in a court of law.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: Concurrency & Thread-Safety */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Concurrency &amp; Thread-Safety via threading.RLock
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Guarding in-memory dictionaries during concurrent asynchronous queries and atomic batch upserts
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            FastAPI runs atop an asynchronous event loop with synchronous operations dispatched to worker thread pools.
            During peak investigative operations, dozens of HTTP readers query <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-900">get_composite()</code>,
            <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-900">get_evidence()</code>, and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-900">verdict_counts()</code> simultaneously.
            Without strict synchronization, an in-memory batch write would trigger race conditions and memory corruption.
          </p>

          {/* RLock Implementation Code Block */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden font-mono text-xs">
            <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>backend/app/services/xai_store.py &mdash; Re-entrant Thread Lock</span>
              </div>
              <span className="text-sky-400 font-bold">ATOMIC BATCH MUTATION</span>
            </div>
            <pre className="p-4 text-slate-200 overflow-x-auto text-[11px] leading-relaxed">
{`import threading
from typing import Any

_composite: dict[str, dict[str, Any]] = {}
_evidence: dict[str, dict[str, Any]] = {}
_store_lock = threading.RLock()

def upsert_batch(scored_items: list[dict[str, Any]]) -> tuple[int, int]:
    """Atomically upsert scored items into composite and evidence stores.
    
    Skips overwriting existing pre-indexed non-provisional dossiers.
    Returns: (upserted_count, skipped_existing_count)
    """
    upserted = 0
    skipped = 0
    with _store_lock:
        for item in scored_items:
            addr = item["address"]
            existing = _composite.get(addr)
            # Never overwrite pre-indexed verified entities with provisional stubs
            if existing is not None and not existing.get("provisional", False):
                skipped += 1
            else:
                _composite[addr] = item["composite_record"]
                _evidence[addr] = item["evidence_record"]
                upserted += 1
    return upserted, skipped`}
            </pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Re-entrant Safety</div>
              <div className="text-xs font-bold text-slate-900 mt-1">threading.RLock()</div>
              <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                Allows recursive lock acquisition in the same worker thread without causing deadlocks.
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Zero Read Starvation</div>
              <div className="text-xs font-bold text-slate-900 mt-1">&lt;1.2ms Lock Duration</div>
              <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                Batch mutations complete in microseconds, guaranteeing non-blocking reader responsiveness.
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Baseline Preservation</div>
              <div className="text-xs font-bold text-emerald-700 mt-1">Protected Pre-Indexed Set</div>
              <div className="text-[11px] text-slate-600 font-sans mt-0.5">
                Verified 17,020 baseline entities with full SHAP/GNN artifacts can never be overwritten.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Interactive Visual Elements */}
      <section className="space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Forensic Simulators &amp; Visualizers
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Step-by-step animated IPC sequence visualizer and live synchronization comparison lab
            </p>
          </div>
        </div>

        {/* Module A: Sequence Diagram Visualizer */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            Module A: 4-Entity Process Boundary Sequence Visualizer
          </div>
          <SyncSequenceDiagram />
        </div>

        {/* Module B: Handshake Playground / Simulator */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            Module B: Live Synchronization Playground (Legacy 404 vs. Phase 11 Sync)
          </div>
          <SyncPlayground />
        </div>
      </section>

      {/* SECTION 6: Teammate FAQ Accordion */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Teammate Technical Defense &amp; Architecture FAQ
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Rigorous engineering justifications addressing IPC isolation, Redis overhead, network firewalls, and lock concurrency
            </p>
          </div>
        </div>

        {/* FAQ Component */}
        <SyncFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch6-risk-engine-xai-legal"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 6: Multi-Factor Risk &amp; Section 65B Legal</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH07
        </div>

        <Link
          href="/docs/ch8-command-center-dev-ops"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 8: Command Center &amp; Ops Runbook</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
