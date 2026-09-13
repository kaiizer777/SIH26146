"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Database,
  Cpu,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Terminal,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  Zap,
  Activity,
  ShieldCheck,
} from "lucide-react";

interface StepDetail {
  step: number;
  title: string;
  source: string;
  target: string;
  action: string;
  protocol: string;
  description: string;
  frontendState: string;
  redisState: string;
  celeryState: string;
  fastapiState: string;
  terminalLogs: string[];
}

const STEPS: StepDetail[] = [
  {
    step: 1,
    title: "File Ingest & Asynchronous Enqueue",
    source: "Next.js Frontend",
    target: "FastAPI Engine",
    action: "POST /ingest (multipart CSV/JSON)",
    protocol: "HTTP/1.1 MultiPart -> Redis Broker",
    description:
      "Operator uploads a transaction batch via IngestModal. FastAPI streams chunks, records the SHA-256 hash in Redis with a 24h TTL idempotency guard, and enqueues task 'process_ingest_file.delay()' to the Redis Celery broker.",
    frontendState: "State: UPLOADING -> task_id received, starts polling",
    redisState: "file_hash:7a9c... = 'task-8f4e-2b9c' | celery_queue: [task-8f4e-2b9c]",
    celeryState: "IDLE (worker pool listening on Redis 'celery' key)",
    fastapiState: "HTTP 202 Accepted returned. xai_store untouched (17,020 indexed records)",
    terminalLogs: [
      "[FASTAPI 20:11:02] POST /ingest HTTP/1.1 202 Accepted | size=2.4MB hash=7a9c20be...",
      "[REDIS   20:11:02] SET file_hash:7a9c20be... '8f4e2b9c-5a12-4f89-b9d2-7c3a1e0f4567' EX 86400",
      "[CELERY  20:11:02] Received task: app.tasks.ingest.process_ingest_file[8f4e2b9c-5a12-4f89-b9d2-7c3a1e0f4567]",
    ],
  },
  {
    step: 2,
    title: "Isolated OS Process Bulk Ingestion",
    source: "Celery Ingest Worker",
    target: "PostgreSQL & Redis",
    action: "PostgreSQL COPY & Redis Task SUCCESS",
    protocol: "OS Process Boundary • psycopg2 COPY",
    description:
      "Celery worker runs in an isolated OS process (pool=solo on Windows / multiprocessing on Linux). It streams rows into PostgreSQL via bulk COPY. Once inserted, it writes task state SUCCESS into Redis with metadata (txids, total_inserted=1000). Crucially, Celery cannot modify FastAPI's in-memory xai_store.",
    frontendState: "POLLING: GET /ingest/status/8f4e2b9c... (interval: 1000ms)",
    redisState: "celery-task-meta-8f4e2b9c: {status: 'SUCCESS', total_inserted: 1000, txids: ['tx-01', ...]}",
    celeryState: "PROCESSING -> Bulk COPY completed in 563ms. Status SUCCESS committed.",
    fastapiState: "NO ACCESS: FastAPI xai_store remains unaware of the 1,000 new rows.",
    terminalLogs: [
      "[CELERY  20:11:03] Task process_ingest_file: streaming 1,000 rows into PostgreSQL...",
      "[POSTGRES 20:11:03] COPY 1000 transactions (0 duplicates, 1000 committed)",
      "[CELERY  20:11:03] Task succeeded in 0.563s: total_inserted=1000, total_wallets=42",
      "[REDIS   20:11:03] Task 8f4e2b9c state -> SUCCESS stored in backend key",
    ],
  },
  {
    step: 3,
    title: "Polling Completion Handshake",
    source: "Next.js Frontend",
    target: "Redis (via FastAPI)",
    action: "GET /ingest/status/{task_id} -> status: 'SUCCESS'",
    protocol: "AsyncResult Query",
    description:
      "Frontend's polling loop queries GET /ingest/status/8f4e2b9c. FastAPI checks Redis AsyncResult. State evaluates to SUCCESS. The frontend intercepts the completion event and immediately coordinates the live sync trigger before unblocking the operator UI.",
    frontendState: "POLL DETECTED SUCCESS! Prepares immediate POST /ingest/sync trigger.",
    redisState: "Task state remains SUCCESS. sync_done key not yet set.",
    celeryState: "IDLE (Task execution finished; waiting for next broker job)",
    fastapiState: "Returned {status: 'SUCCESS', result: {total_inserted: 1000}}",
    terminalLogs: [
      "[NEXTJS  20:11:04] Polling loop: received status === 'SUCCESS' for task 8f4e2b9c",
      "[FASTAPI 20:11:04] GET /ingest/status/8f4e2b9c-5a12-4f89-b9d2-7c3a1e0f4567 HTTP/1.1 200 OK",
      "[NEXTJS  20:11:04] Dispatching auto-sync handshake: POST /ingest/sync/8f4e2b9c...",
    ],
  },
  {
    step: 4,
    title: "Direct Sync Trigger & Idempotency Lock",
    source: "Next.js Frontend",
    target: "FastAPI Ingest Router",
    action: "POST /ingest/sync/8f4e2b9c-5a12-4f89-b9d2-7c3a1e0f4567",
    protocol: "HTTP/1.1 Direct FastAPI IPC Trigger",
    description:
      "Frontend calls POST /ingest/sync/{task_id} directly on FastAPI. FastAPI verifies the Celery task state in Redis, enforces an atomic Redis SETNX lock ('sync_done:{task_id}' with TTL=3600), and queries PostgreSQL for newly inserted rows by task txids.",
    frontendState: "Awaiting sync response (modal shows 'Synchronizing XAI memory index...')",
    redisState: "sync_done:8f4e2b9c = '1' EX 3600 (Atomic SETNX acquired; prevents double-sync)",
    celeryState: "IDLE (Uninvolved in sync; decoupling isolates worker from web server)",
    fastapiState: "SELECT * FROM transactions WHERE txid = ANY(:txids) -> 1,000 rows retrieved",
    terminalLogs: [
      "[FASTAPI 20:11:04] POST /ingest/sync/8f4e2b9c-5a12-4f89-b9d2-7c3a1e0f4567 received",
      "[REDIS   20:11:04] SET sync_done:8f4e2b9c '1' NX EX 3600 -> OK (Lock reserved)",
      "[POSTGRES 20:11:04] Executing SELECT * FROM transactions WHERE txid = ANY(:txids)",
      "[FASTAPI 20:11:04] Fetched 1,000 transactions across 42 unique wallet entities",
    ],
  },
  {
    step: 5,
    title: "Inline FT-Transformer Scoring & RLock Upsert",
    source: "FastAPI Process",
    target: "xai_store In-Memory Dicts",
    action: "inline_scorer.score_batch() -> threading.RLock Upsert",
    protocol: "In-Process PyTorch CPU + threading.RLock",
    description:
      "FastAPI's internal worker thread invokes inline_scorer.score_batch(). 18 continuous tabular features are standardized and passed through the FT-Transformer (<15ms CPU). Heuristic rules check for peeling chains and Ransomwhere seed matches. With _store_lock: xai_store atomically upserts composite and evidence records.",
    frontendState: "Awaiting sync response...",
    redisState: "sync_done:8f4e2b9c active. Redis holds transaction metadata.",
    celeryState: "IDLE",
    fastapiState: "RLock acquired. _composite updated: 17,020 -> 17,062 (+42 novel wallets)",
    terminalLogs: [
      "[INLINE-SCORER 20:11:04] Extracting 18 features for 1,000 rows...",
      "[FT-TRANSFORMER 20:11:04] CPU Batch Anomaly inference: 1,000 rows scored in 8.42ms",
      "[HEURISTICS    20:11:04] Detected 3 Peeling Chains, 1 Ransomwhere seed recipient",
      "[XAI-STORE     20:11:04] with _store_lock: upserted=42 novel wallets, skipped_existing=0",
      "[FASTAPI       20:11:04] Returning IngestSyncResponse: {scored: 1000, upserted: 42}",
    ],
  },
  {
    step: 6,
    title: "Zero-404 Alert Resolution & UI Refresh",
    source: "FastAPI Engine",
    target: "Next.js Frontend",
    action: "HTTP 200 OK -> onSuccess() Alert Grid Auto-Refresh",
    protocol: "JSON Response -> React SWR Revalidation",
    description:
      "FastAPI responds with HTTP 200 {scored: 1000, upserted: 42}. Frontend closes IngestModal, triggers onSuccess(), and revalidates the AlertTable. When an analyst clicks any newly ingested wallet, GET /entity/{addr}/explain hits the updated xai_store immediately: zero 404s, returning a live Provisional Dossier!",
    frontendState: "MODAL CLOSED. AlertTable auto-refreshed. Operator clicks new wallet -> 200 OK!",
    redisState: "sync_done key persists for 1 hour to reject redundant duplicate sync calls",
    celeryState: "IDLE (Ready for next bulk archive)",
    fastapiState: "Serving GET /entity/{address}/explain in 1.2ms from synchronized in-memory index",
    terminalLogs: [
      "[FASTAPI 20:11:04] HTTP/1.1 200 OK -> {scored: 1000, upserted: 42, skipped_existing: 0}",
      "[NEXTJS  20:11:04] IngestModal onSuccess() called. Revalidating /api/alerts...",
      "[NEXTJS  20:11:05] Analyst clicks bc1q98x... -> GET /entity/bc1q98x.../explain",
      "[FASTAPI 20:11:05] GET /entity/bc1q98x/explain HTTP/1.1 200 OK (Provisional Dossier served in 1.4ms)",
    ],
  },
];

const ACTORS = [
  { id: "frontend", name: "Next.js Frontend", icon: Server, port: "Port 3000", tag: "Client UI" },
  { id: "redis", name: "Redis Broker & State", icon: Database, port: "Port 6379", tag: "IPC Coordinator" },
  { id: "celery", name: "Celery Worker", icon: Cpu, port: "Worker Process", tag: "Isolated OS Process" },
  { id: "fastapi", name: "FastAPI + xai_store", icon: RefreshCw, port: "Port 8000", tag: "In-Memory Host" },
];

export function SyncSequenceDiagram() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => (prev >= STEPS.length ? 1 : prev + 1));
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const current = STEPS[activeStep - 1];

  return (
    <div className="card-tactical rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
              INTERACTIVE IPC SEQUENCE VISUALIZER
            </span>
            <span className="text-xs text-slate-400 font-mono">STEP {activeStep} OF {STEPS.length}</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            FastAPI &harr; Celery Process Boundary &amp; Post-Ingest Sync Handshake
          </h3>
        </div>

        {/* Step controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => {
              setIsPlaying(false);
              setActiveStep((prev) => Math.max(1, prev - 1));
            }}
            disabled={activeStep === 1}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            aria-label="Previous step"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded btn-tactical-primary text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-sky-400" />
                <span>Auto-Step</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setActiveStep((prev) => Math.min(STEPS.length, prev + 1));
            }}
            disabled={activeStep === STEPS.length}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            aria-label="Next step"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setActiveStep(1);
            }}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors shadow-xs"
            title="Reset to Step 1"
            aria-label="Reset to Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Pills Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {STEPS.map((s) => {
          const isActive = s.step === activeStep;
          const isPassed = s.step < activeStep;
          return (
            <button
              key={s.step}
              onClick={() => {
                setIsPlaying(false);
                setActiveStep(s.step);
              }}
              className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/10"
                  : isPassed
                  ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                <span>STAGE 0{s.step}</span>
                {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {isActive && <Activity className="w-3 h-3 text-sky-400 animate-pulse" />}
              </div>
              <div className="font-semibold truncate text-[11px] leading-tight">
                {s.title.split(" ")[0]} {s.title.split(" ")[1] || ""}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4 Process Pillars Visual Diagram */}
      <div className="p-5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {ACTORS.map((actor) => {
            const Icon = actor.icon;
            const isSource = current.source.toLowerCase().includes(actor.id);
            const isTarget = current.target.toLowerCase().includes(actor.id);
            const isCurrentInvolved = isSource || isTarget;

            return (
              <div
                key={actor.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  isCurrentInvolved
                    ? "bg-white border-sky-400 shadow-xs ring-1 ring-sky-400/30"
                    : "bg-white/80 border-slate-200 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center ${
                        isCurrentInvolved ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-none">{actor.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{actor.port}</div>
                    </div>
                  </div>
                  {isCurrentInvolved && (
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase">{actor.tag}</span>
                  {isSource && (
                    <span className="text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded font-bold">
                      ORIGIN
                    </span>
                  )}
                  {isTarget && (
                    <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                      TARGET
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Action Banner between Source and Target */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-slate-900 uppercase">TRANSMISSION:</span>
              <span className="text-sky-700 font-semibold">{current.source}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-indigo-700 font-semibold">{current.target}</span>
            </div>
            <div className="text-xs text-slate-600">
              <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 font-semibold">
                {current.action}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500">PROTOCOL:</span>
            <span className="text-slate-900 font-semibold">{current.protocol}</span>
          </div>
        </div>

        {/* Deep Explanatory Description */}
        <div className="text-xs text-slate-700 leading-relaxed bg-white/60 p-3.5 rounded-lg border border-slate-200/80">
          <p className="font-sans">{current.description}</p>
        </div>

        {/* Live Entity States Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Server className="w-3 h-3 text-sky-500" />
              Next.js Client State
            </div>
            <div className="text-slate-800 text-[11px] font-semibold">{current.frontendState}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Database className="w-3 h-3 text-emerald-500" />
              Redis IPC State
            </div>
            <div className="text-slate-800 text-[11px] font-semibold break-all">{current.redisState}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-amber-500" />
              Celery Worker Process
            </div>
            <div className="text-slate-800 text-[11px] font-semibold">{current.celeryState}</div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-indigo-500" />
              FastAPI Process (xai_store)
            </div>
            <div className="text-slate-800 text-[11px] font-semibold">{current.fastapiState}</div>
          </div>
        </div>
      </div>

      {/* Simulated Production Terminal Logs */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xs font-mono text-xs">
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-slate-200">ORCHESTRATION TERMINAL STREAM • STAGE 0{current.step}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>IPC MONITORED</span>
          </div>
        </div>
        <div className="p-4 space-y-1.5 overflow-x-auto text-[11px] text-slate-300">
          {current.terminalLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-600 select-none">&gt;</span>
              <span
                className={
                  log.includes("FASTAPI")
                    ? "text-sky-300"
                    : log.includes("CELERY")
                    ? "text-amber-300"
                    : log.includes("REDIS")
                    ? "text-emerald-300"
                    : log.includes("XAI-STORE")
                    ? "text-purple-300 font-bold"
                    : "text-slate-200"
                }
              >
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
