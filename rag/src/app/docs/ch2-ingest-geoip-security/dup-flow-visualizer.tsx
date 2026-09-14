"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  Terminal,
  FileCode,
  HardDrive,
  Lock,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

type ScenarioType = "fresh" | "dup1_exact" | "dup2_txid";

interface PipelineStep {
  title: string;
  sub: string;
  status: "success" | "warning" | "error" | "info" | "pending";
  detail: string;
  codeSnippet?: string;
}

export function DupFlowVisualizer() {
  const [scenario, setScenario] = useState<ScenarioType>("dup1_exact");
  const [currentStep, setCurrentStep] = useState<number>(3); // default showing the key 409 rejection step

  const scenarios: Record<
    ScenarioType,
    {
      label: string;
      badge: string;
      badgeColor: string;
      description: string;
      steps: PipelineStep[];
      bannerPreview: {
        type: "red" | "amber" | "green";
        title: string;
        message: string;
        statusText: string;
      };
    }
  > = {
    fresh: {
      label: "Fresh File Ingestion (Happy Path)",
      badge: "HTTP 202 ACCEPTED",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description:
        "Analyst uploads an unprecedented batch. Payload hash is unique; Redis distributed idempotency lock is registered with 24h TTL; Celery bulk worker processes rows via COPY.",
      bannerPreview: {
        type: "green",
        title: "Ingestion Succeeded",
        message: "Successfully ingested 10,000 rows into PostgreSQL ledger. Auto-sync trigger dispatched.",
        statusText: "SUCCESS • 10,000 inserted · 0 rejected",
      },
      steps: [
        {
          title: "Stream & Hash",
          sub: "FastAPI multipart chunking",
          status: "success",
          detail:
            "FastAPI streams the uploaded file in 64KB chunks up to 500MB guard, computing SHA-256 inline: 8f4e2b9c...",
          codeSnippet: 'hasher = hashlib.sha256()\nchunk = await file.read(65_536)\nhasher.update(chunk)',
        },
        {
          title: "Redis Idempotency Check",
          sub: "Atomic key probe",
          status: "success",
          detail:
            "FastAPI checks Redis: GET file_hash:8f4e2b9c... Result is (nil) — file has never been uploaded.",
          codeSnippet: 'existing = redis_cli.get(f"file_hash:{file_hash}")\n# Result: None (Cache Miss)',
        },
        {
          title: "Celery Task Dispatch",
          sub: "Async worker queue",
          status: "success",
          detail:
            "Task queued: process_ingest_file.delay(temp_path, 'csv'). Returns task ID: 'task-a912-7bf'.",
          codeSnippet: "task = process_ingest_file.delay(str(temp_path), 'csv')",
        },
        {
          title: "Lock Reservation",
          sub: "Redis 24-hour TTL",
          status: "success",
          detail:
            "Redis SET file_hash:8f4e2b9c... 'task-a912-7bf' EX 86400 (atomic reservation prevents concurrent races).",
          codeSnippet: 'redis_cli.set(f"file_hash:{file_hash}", task.id, ex=86400)',
        },
        {
          title: "Client Response & Poll",
          sub: "HTTP 202 Accepted",
          status: "success",
          detail:
            "Client receives HTTP 202 with task_id. IngestModal transitions to stage 'polling' until Celery returns SUCCESS.",
          codeSnippet: 'return JSONResponse(status_code=202, content={"task_id": task.id})',
        },
      ],
    },
    dup1_exact: {
      label: "DUP-1 Exact Duplicate File (Backend Guard)",
      badge: "HTTP 409 CONFLICT",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      description:
        "Analyst accidentally drops the exact same dataset within 24 hours. The SHA-256 matches Redis key; temp file is instantly unlinked; HTTP 409 Conflict returned; zero database load incurred.",
      bannerPreview: {
        type: "red",
        title: "Duplicate File Upload Rejected (DUP-2a)",
        message:
          "This file has already been uploaded. Use a different file or wait 24 hours to re-upload.",
        statusText: "HTTP 409 CONFLICT • original_task_id: task-a912-7bf",
      },
      steps: [
        {
          title: "Stream & Hash",
          sub: "FastAPI multipart chunking",
          status: "success",
          detail:
            "FastAPI streams the duplicate file to temp file, computing identical SHA-256 hash: 8f4e2b9c...",
          codeSnippet: 'file_hash = hasher.hexdigest()\n# "8f4e2b9c1d0a...33f"',
        },
        {
          title: "Redis Hash Collision",
          sub: "Idempotency key hit",
          status: "error",
          detail:
            "Redis GET file_hash:8f4e2b9c... returns existing task_id 'task-a912-7bf'. Duplicate detected!",
          codeSnippet: 'existing_task_id = redis_cli.get(f"file_hash:{file_hash}")\n# Found: b"task-a912-7bf"',
        },
        {
          title: "Temp Disk Unlink",
          sub: "Instant storage cleanup",
          status: "warning",
          detail:
            "temp_path.unlink(missing_ok=True) purges the uploaded disk payload immediately to preserve server storage.",
          codeSnippet: "temp_path.unlink(missing_ok=True)\nlogger.warning('Duplicate upload rejected: %s', file_hash)",
        },
        {
          title: "HTTP 409 Raise",
          sub: "Structured error response",
          status: "error",
          detail:
            "FastAPI terminates request with HTTP 409 Conflict payload containing error detail and original_task_id.",
          codeSnippet:
            'raise HTTPException(\n  status_code=409,\n  detail={"detail": "Duplicate upload detected...", "original_task_id": orig_id}\n)',
        },
        {
          title: "DUP-2a UI Red Banner",
          sub: "IngestModal.tsx error handling",
          status: "error",
          detail:
            "Frontend catches err.status === 409, halts all polling timers, suppresses onSuccess(), and renders prominent red warning.",
          codeSnippet:
            'if (err instanceof ApiError && err.status === 409) {\n  setStage("duplicate");\n  toast.error("Duplicate file detected");\n}',
        },
      ],
    },
    dup2_txid: {
      label: "DUP-2b Row-Level Txid Conflict (SQL Guard)",
      badge: "CELERY DEDUP SUCCESS",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      description:
        "Analyst uploads a newly named or modified file whose transaction IDs already exist in PostgreSQL. Celery catches the txid uniqueness conflict; 0 rows inserted; UI renders amber warning.",
      bannerPreview: {
        type: "amber",
        title: "All Rows Duplicate In PostgreSql (DUP-2b)",
        message:
          "No new transactions inserted — all 10,000 rows were rejected as duplicates (txid already exists). The alert table reflects existing data.",
        statusText: "CELERY FINISHED • 0 inserted · 10,000 rejected",
      },
      steps: [
        {
          title: "Modified Container",
          sub: "Different file hash",
          status: "success",
          detail:
            "Filename or wrapper headers altered, yielding a different SHA-256 hash. Passes Redis DUP-1 check.",
          codeSnippet: 'file_hash = "77c1d3f9..." # Redis miss; proceeds to Celery',
        },
        {
          title: "Celery COPY Stream",
          sub: "PostgreSQL table insertion",
          status: "info",
          detail:
            "Worker streams batch into PostgreSQL. Unique constraint on transactions(txid) or staging conflict logic catches duplicate txids.",
          codeSnippet: 'bulk_copy_insert(conn, batch) # Catches txid uniqueness constraint',
        },
        {
          title: "Row Rejection Accounting",
          sub: "Zero silent drops",
          status: "warning",
          detail:
            "Every colliding txid is isolated to rejected_rows with reason 'txid already exists'. Database ACID state preserved.",
          codeSnippet: 'result = {"total_inserted": 0, "total_rejected": 10000, "total_received": 10000}',
        },
        {
          title: "Celery SUCCESS Callback",
          sub: "Task state published",
          status: "success",
          detail:
            "Celery marks task as SUCCESS with result payload showing inserted=0 and rejected=10000.",
          codeSnippet: 'self.update_state(state="SUCCESS", meta=result)',
        },
        {
          title: "DUP-2b UI Amber Banner",
          sub: "Non-destructive warning",
          status: "warning",
          detail:
            "IngestModal detects inserted===0 && rejected>0. Renders Amber Warning Banner, but calls onSuccess() to maintain existing table visibility!",
          codeSnippet:
            'if (inserted === 0 && (rejected > 0 || received > 0)) {\n  setStage("warning");\n  onSuccess(); // Keep existing alerts visible!\n}',
        },
      ],
    },
  };

  const activeScenario = scenarios[scenario];

  const handleScenarioChange = (s: ScenarioType) => {
    setScenario(s);
    setCurrentStep(s === "fresh" ? 4 : s === "dup1_exact" ? 3 : 4);
  };

  return (
    <div className="card-tactical rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>IDEMPOTENCY ENGINE • STAGE 1: DUP-1 & DUP-2 HARDENING</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Anti-Duplicate Upload Armor & Conflict Flow Simulator
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentStep(0)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Scenario Selection Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(["dup1_exact", "dup2_txid", "fresh"] as ScenarioType[]).map((key) => {
            const sc = scenarios[key];
            const isSelected = scenario === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleScenarioChange(key)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? "bg-slate-800 text-slate-200 border-slate-700"
                        : sc.badgeColor
                    }`}
                  >
                    {sc.badge}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className={`text-xs font-bold mt-2 ${isSelected ? "text-white" : "text-slate-900"}`}>
                  {key === "dup1_exact" && "Exact File Dup (DUP-1)"}
                  {key === "dup2_txid" && "Txid Conflict (DUP-2b)"}
                  {key === "fresh" && "Fresh File (Clean Ingest)"}
                </div>
                <div className={`text-[11px] mt-0.5 line-clamp-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {sc.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scenario Overview Description */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
          <strong className="text-slate-900 font-mono text-[11px] uppercase mr-1">
            Simulated Path:
          </strong>
          {activeScenario.description}
        </div>

        {/* Step-by-Step Pipeline Progression */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="font-bold text-slate-700 uppercase">
              Pipeline Execution Sequence (Step {currentStep + 1} of {activeScenario.steps.length})
            </span>
            <div className="flex items-center gap-1">
              {activeScenario.steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                    currentStep === idx
                      ? "bg-slate-900 text-white"
                      : idx < currentStep
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {activeScenario.steps.map((step, idx) => {
              const isActive = currentStep === idx;
              const isPast = idx < currentStep;

              let iconColor = "text-slate-400";
              let badgeBg = "bg-slate-100 text-slate-600";
              if (isActive) {
                if (step.status === "error") {
                  iconColor = "text-rose-600";
                  badgeBg = "bg-rose-100 text-rose-800";
                } else if (step.status === "warning") {
                  iconColor = "text-amber-600";
                  badgeBg = "bg-amber-100 text-amber-800";
                } else {
                  iconColor = "text-emerald-600";
                  badgeBg = "bg-emerald-100 text-emerald-800";
                }
              } else if (isPast) {
                iconColor = "text-emerald-600";
                badgeBg = "bg-emerald-50 text-emerald-700";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isActive
                      ? "border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      STEP 0{idx + 1}
                    </span>
                    {step.status === "error" && isActive ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ) : step.status === "warning" && isActive ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : isPast || (isActive && step.status === "success") ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {step.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {step.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Step Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Left: Step Explanation & Python/Redis Mechanics */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-slate-900 text-slate-100 space-y-3 font-mono text-xs min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                EXECUTION TELEMETRY • STEP {currentStep + 1}
              </span>
              <span className="text-[10px] text-slate-400 uppercase truncate">
                {activeScenario.steps[currentStep].title}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              {activeScenario.steps[currentStep].detail}
            </p>

            {activeScenario.steps[currentStep].codeSnippet && (
              <div className="space-y-1 pt-1 min-w-0">
                <div className="text-[10px] text-slate-400 uppercase">Kernel / Service Code:</div>
                <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-sky-300 overflow-x-auto text-[10px] sm:text-[11px] max-w-full">
                  {activeScenario.steps[currentStep].codeSnippet}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((c) => Math.max(0, c - 1))}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] cursor-pointer"
              >
                ← Prev Step
              </button>
              <button
                type="button"
                disabled={currentStep === activeScenario.steps.length - 1}
                onClick={() =>
                  setCurrentStep((c) => Math.min(activeScenario.steps.length - 1, c + 1))
                }
                className="px-3 py-1 rounded bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                Next Step →
              </button>
            </div>
          </div>

          {/* Right: Frontend UI Simulation (IngestModal.tsx banner) */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  Frontend IngestModal UI State
                </span>
                <span className="text-[10px] font-mono text-slate-400">DUP-2 Render</span>
              </div>
              <p className="text-xs text-slate-500">
                Visual presentation displayed to the sovereign analyst inside the Command Center modal:
              </p>
            </div>

            {/* Simulated Banner Container */}
            <div className="py-2">
              {activeScenario.bannerPreview.type === "red" && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-rose-900">
                        {activeScenario.bannerPreview.title}
                      </div>
                      <div className="text-xs text-rose-700 mt-1 leading-relaxed">
                        {activeScenario.bannerPreview.message}
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-rose-200/80 font-mono text-[10px] text-rose-800">
                    STATUS: {activeScenario.bannerPreview.statusText}
                  </div>
                </div>
              )}

              {activeScenario.bannerPreview.type === "amber" && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        {activeScenario.bannerPreview.title}
                      </div>
                      <div className="text-xs text-amber-700 mt-1 leading-relaxed">
                        {activeScenario.bannerPreview.message}
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-amber-200/80 font-mono text-[10px] text-amber-800">
                    STATUS: {activeScenario.bannerPreview.statusText}
                  </div>
                </div>
              )}

              {activeScenario.bannerPreview.type === "green" && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        {activeScenario.bannerPreview.title}
                      </div>
                      <div className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        {activeScenario.bannerPreview.message}
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-emerald-200/80 font-mono text-[10px] text-emerald-800">
                    STATUS: {activeScenario.bannerPreview.statusText}
                  </div>
                </div>
              )}
            </div>

            {/* Defense Takeaway */}
            <div className="text-[11px] font-mono text-slate-500 bg-white p-2.5 rounded border border-slate-200">
              <span className="font-bold text-slate-700">Forensic Guarantee: </span>
              {scenario === "dup1_exact" && "Zero redundant database load; HTTP 409 terminates within 12ms."}
              {scenario === "dup2_txid" && "ACID ledger integrity maintained; existing alert table remains untouched."}
              {scenario === "fresh" && "Atomic Redis SETNX ensures concurrent uploads cannot double-insert."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
