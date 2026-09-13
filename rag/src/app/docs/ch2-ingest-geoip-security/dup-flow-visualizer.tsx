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
  Fingerprint,
} from "lucide-react";

type ScenarioType = "dup1_exact" | "dup2_txid" | "fresh";

interface PipelineStep {
  title: string;
  sub: string;
  status: "success" | "warning" | "error" | "info" | "pending";
  detail: string;
  codeSnippet?: string;
}

export function DupFlowVisualizer() {
  const [scenario, setScenario] = useState<ScenarioType>("dup1_exact");
  const [currentStep, setCurrentStep] = useState<number>(3);

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
    dup1_exact: {
      label: "Accidental Re-Upload (Same File Twice)",
      badge: "0.01s FINGERPRINT DROP",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      description:
        "An analyst accidentally drags and drops the exact same evidence folder twice. Our SHA-256 digital fingerprint detects the match in 0.01 seconds and drops the duplicate immediately without bothering the database!",
      bannerPreview: {
        type: "red",
        title: "Duplicate File Upload Prevented",
        message:
          "This exact evidence file was already processed. The system safely rejected the duplicate upload to prevent database clutter.",
        statusText: "HTTP 409 CONFLICT • Original Batch ID: task-a912-7bf",
      },
      steps: [
        {
          title: "Stream & Fingerprint",
          sub: "Real-time digital hashing",
          status: "success",
          detail:
            "As the file uploads, our engine calculates its unique SHA-256 digital fingerprint on the fly (e.g. 8f4e2b9c...) in fractions of a millisecond.",
          codeSnippet: "hasher = hashlib.sha256()\nchunk = await file.read(65_536)\nhasher.update(chunk)",
        },
        {
          title: "Memory Probe",
          sub: "Checking known fingerprints",
          status: "error",
          detail:
            "The engine checks our ultra-fast in-memory cache: 'Have we ingested this exact fingerprint in the last 24 hours?' Result: YES! It was processed previously.",
          codeSnippet: 'existing = redis_cli.get(f"file_hash:{file_hash}")\n# Match found: task-a912-7bf',
        },
        {
          title: "Instant Temp Purge",
          sub: "Reclaiming disk space",
          status: "warning",
          detail:
            "The temporary uploaded duplicate file is immediately deleted from disk. Not a single megabyte of storage or server RAM is wasted.",
          codeSnippet: "temp_path.unlink(missing_ok=True)\nlogger.info('Purged duplicate evidence upload')",
        },
        {
          title: "Fast Notification",
          sub: "HTTP 409 response in 12ms",
          status: "error",
          detail:
            "The server immediately tells the frontend: 'This file is already in your database. Here is the original task ID.' Zero background workers are queued.",
          codeSnippet:
            'raise HTTPException(status_code=409, detail={"detail": "Duplicate upload detected...", "original_task_id": orig_id})',
        },
        {
          title: "Clean UI Alert",
          sub: "Clear visual feedback",
          status: "error",
          detail:
            "The Command Center UI displays a crisp red banner letting the analyst know the file is already recorded, preventing confusion or double investigations.",
          codeSnippet: 'toast.error("Duplicate evidence file already ingested.")',
        },
      ],
    },
    dup2_txid: {
      label: "Overlapping Transactions (Shared TxIDs)",
      badge: "ROW-LEVEL DEDUP GUARD",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      description:
        "An analyst uploads a newly created or renamed file that contains transactions already in the ledger. The database ingests any new data while safely ignoring duplicates, leaving all existing investigation alerts intact.",
      bannerPreview: {
        type: "amber",
        title: "Overlapping Records Identified",
        message:
          "Transactions already present in the database were safely skipped. Existing investigation alerts and graphs remain 100% intact.",
        statusText: "COMPLETED • 0 new records · 10,000 existing skipped",
      },
      steps: [
        {
          title: "New File Envelope",
          sub: "Different file fingerprint",
          status: "success",
          detail:
            "Because the file was renamed or repackaged, the file-level hash is new. The system admits the file into the parsing pipeline.",
          codeSnippet: 'file_hash = "77c1d3f9..." # New container admitted',
        },
        {
          title: "Fast Ingestion Stream",
          sub: "Direct database highway",
          status: "info",
          detail:
            "The worker streams the transactions into PostgreSQL. The database primary key constraint checks every single 64-character Bitcoin TXID.",
          codeSnippet: "bulk_copy_insert(conn, batch) # Verifies txid uniqueness",
        },
        {
          title: "Smart Conflict Filter",
          sub: "Zero corruptions or drops",
          status: "warning",
          detail:
            "Transactions that already exist in the database are filtered out. New transactions (if any) are smoothly inserted without overwriting history.",
          codeSnippet: 'result = {"total_inserted": 0, "total_rejected": 10000, "reason": "txid_exists"}',
        },
        {
          title: "Worker State Update",
          sub: "Telemetry recorded",
          status: "success",
          detail:
            "The background worker signals completion with exact accounting: total received, newly inserted, and previously existing records.",
          codeSnippet: 'self.update_state(state="SUCCESS", meta=result)',
        },
        {
          title: "Non-Destructive Alert",
          sub: "Keeps existing views alive",
          status: "warning",
          detail:
            "The UI displays a gentle amber notice. It does NOT wipe the screen or reset the analyst's investigation dashboard.",
          codeSnippet: 'setStage("warning");\nonSuccess(); // Preserves active investigation table!',
        },
      ],
    },
    fresh: {
      label: "Brand New Evidence File (Happy Path)",
      badge: "SEAMLESS INGESTION",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description:
        "Fresh raid evidence drops into the pipeline. The format is auto-detected, IPs are enriched offline in RAM, and all records stream into the forensic database in seconds.",
      bannerPreview: {
        type: "green",
        title: "Ingestion Succeeded",
        message:
          "Successfully parsed, geolocated, and indexed 10,000 forensic transactions in 0.84 seconds.",
        statusText: "SUCCESS • 10,000 inserted · 0 duplicates · 100% geolocated",
      },
      steps: [
        {
          title: "Stream & Fingerprint",
          sub: "Auto format & hash",
          status: "success",
          detail:
            "FastAPI streams the seized file in small memory chunks, sniffs the format (CSV, JSON, or XML), and records its SHA-256 fingerprint.",
          codeSnippet: "format = detect_format(header_bytes) # e.g. CSV\nfile_hash = hasher.hexdigest()",
        },
        {
          title: "Unique Fingerprint Confirmed",
          sub: "In-memory cache miss",
          status: "success",
          detail:
            "The cache confirms this evidence file has never been seen before. The green light is immediately given.",
          codeSnippet: 'existing = redis_cli.get(f"file_hash:{file_hash}") # None',
        },
        {
          title: "Dispatched to Worker",
          sub: "Instant task ID generation",
          status: "success",
          detail:
            "A background worker picks up the job. The file is locked in memory for 24 hours so no concurrent upload can double-insert.",
          codeSnippet: "task = process_ingest_file.delay(temp_path, 'csv')\nredis_cli.set(f'file_hash:{hash}', task.id, ex=86400)",
        },
        {
          title: "Offline GeoIP & Bulk Stream",
          sub: "11,938 rows/sec in RAM",
          status: "success",
          detail:
            "The worker maps every IP to physical cities and ISPs using local MaxMind MMDB in RAM, then streams all rows into PostgreSQL.",
          codeSnippet: "geo_country, asn = enricher.resolve(src_ip, dst_ip)\nbulk_copy_insert(conn, records)",
        },
        {
          title: "Live Dashboard Update",
          sub: "Instant forensic visualization",
          status: "success",
          detail:
            "The Command Center UI receives the success confirmation and immediately displays the new transactions, alerts, and map markers.",
          codeSnippet: 'toast.success("10,000 forensic transactions indexed!")',
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
    <div className="card-tactical rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-xs">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
            <span>IDEMPOTENCY ARMOR • SMART DUPLICATE PROTECTION</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Interactive Duplicate Protection Simulator
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test what happens when investigators accidentally upload duplicates or overlapping transaction dumps
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentStep(0)}
          className="p-1.5 px-3 rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-slate-100 text-slate-900 shadow-xs text-xs font-mono flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Stepper</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Scenario Selection Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["dup1_exact", "dup2_txid", "fresh"] as ScenarioType[]).map((key) => {
            const sc = scenarios[key];
            const isSelected = scenario === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleScenarioChange(key)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-slate-50 text-slate-800 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isSelected
                        ? "bg-slate-800 text-slate-200 border-slate-700"
                        : sc.badgeColor
                    }`}
                  >
                    {sc.badge}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className={`text-xs font-bold mt-2.5 ${isSelected ? "text-white" : "text-slate-900"}`}>
                  {sc.label}
                </div>
                <div className={`text-[11px] mt-1 line-clamp-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {key === "dup1_exact" && "Re-upload dropped in 0.01s"}
                  {key === "dup2_txid" && "Duplicate txids filtered safely"}
                  {key === "fresh" && "100% clean direct ingestion"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scenario Overview Description */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <strong className="text-slate-900 font-mono text-[11px] uppercase mr-1.5">
            Scenario Behavior:
          </strong>
          {activeScenario.description}
        </div>

        {/* Step-by-Step Pipeline Progression */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="font-bold text-slate-700 uppercase">
              Pipeline Execution Sequence (Step {currentStep + 1} of {activeScenario.steps.length})
            </span>
            <div className="flex items-center gap-1.5">
              {activeScenario.steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                    currentStep === idx
                      ? "bg-slate-900 text-white shadow-xs"
                      : idx < currentStep
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {activeScenario.steps.map((step, idx) => {
              const isActive = currentStep === idx;
              const isPast = idx < currentStep;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? "border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-xs"
                      : "border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white text-slate-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      STEP 0{idx + 1}
                    </span>
                    {step.status === "error" && isActive ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    ) : step.status === "warning" && isActive ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ) : isPast || (isActive && step.status === "success") ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Left: Step Explanation */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                EXECUTION TELEMETRY • STEP {currentStep + 1}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">
                {activeScenario.steps[currentStep].title}
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              {activeScenario.steps[currentStep].detail}
            </p>

            {activeScenario.steps[currentStep].codeSnippet && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-slate-400 uppercase">Engine Code:</div>
                <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-300 overflow-x-auto text-[11px]">
                  {activeScenario.steps[currentStep].codeSnippet}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((c) => Math.max(0, c - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-white border-t border-t-slate-700 border-b border-b-black shadow-xs disabled:opacity-40 disabled:cursor-not-allowed text-[11px] cursor-pointer"
              >
                ← Prev Step
              </button>
              <button
                type="button"
                disabled={currentStep === activeScenario.steps.length - 1}
                onClick={() =>
                  setCurrentStep((c) => Math.min(activeScenario.steps.length - 1, c + 1))
                }
                className="btn-tactical-primary text-white disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold cursor-pointer flex items-center gap-1 px-3.5 py-1.5 rounded-lg shadow-xs"
              >
                Next Step →
              </button>
            </div>
          </div>

          {/* Right: Frontend UI Simulation */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  Analyst UI Notification Preview
                </span>
                <span className="text-[10px] font-mono text-slate-500">Live Response</span>
              </div>
              <p className="text-xs text-slate-500">
                What the investigator sees in the Command Center alert banner:
              </p>
            </div>

            {/* Simulated Banner */}
            <div className="py-2">
              {activeScenario.bannerPreview.type === "red" && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
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
                  <div className="pt-1.5 border-t border-rose-200/80 font-mono text-[10.5px] text-rose-800 font-semibold">
                    STATUS: {activeScenario.bannerPreview.statusText}
                  </div>
                </div>
              )}

              {activeScenario.bannerPreview.type === "amber" && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
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
                  <div className="pt-1.5 border-t border-amber-200/80 font-mono text-[10.5px] text-amber-800 font-semibold">
                    STATUS: {activeScenario.bannerPreview.statusText}
                  </div>
                </div>
              )}

              {activeScenario.bannerPreview.type === "green" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
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
                  <div className="pt-1.5 border-t border-emerald-200/80 font-mono text-[10.5px] text-emerald-800 font-semibold">
                    STATUS: {activeScenario.bannerPreview.statusText}
                  </div>
                </div>
              )}
            </div>

            {/* Defense Takeaway */}
            <div className="text-[11px] font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900">Takeaway: </span>
              {scenario === "dup1_exact" && "Zero database load; duplicates are safely rejected in 0.01 seconds."}
              {scenario === "dup2_txid" && "Existing investigation graphs and alerts remain completely undisturbed."}
              {scenario === "fresh" && "High-speed concurrent ingestion with zero race conditions or dropped records."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
