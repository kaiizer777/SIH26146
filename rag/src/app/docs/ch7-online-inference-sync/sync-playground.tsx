"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Play,
  Database,
} from "lucide-react";

type SyncMode = "with_phase11";

export function SyncPlayground() {
  const [mode, setMode] = useState<"with_phase11" | "without_phase11">("with_phase11");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"preview" | "json" | "headers">("preview");

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  const sampleWallet = "bc1q98xkz402flm5e80d9r3a7w19cv8q0x4ptg9z2j";

  const successJson = {
    address: sampleWallet,
    provisional: true,
    composite_score: 0.642,
    verdict: "HIGH",
    anomaly_score: 0.048215,
    anomaly_percentile: 96.4,
    risk_score: 0.0,
    triggered_rules: [
      "PEELING_CHAIN_CANDIDATE",
      "RANSOMWHERE_SEED_RECIPIENT",
    ],
    is_mixing: true,
    seed_wallet_proximity: 0.5,
    cluster_id: null,
    cluster_size: 0,
    model_version: "ft_transformer_20260909+graph_transformer_20260909",
    anomaly_model_version: "ft_transformer_20260909",
    risk_model_version: "graph_transformer_20260909",
    provisional_statutory_caveat:
      "Section 65B IEA / Section 63 BSA 2023 provisional record. In-memory tabular reconstruction verified; topological GDS modularity deferred to scheduled cycle.",
  };

  const failureJson = {
    detail: `Entity '${sampleWallet}' not found in XAI store index. File was written to disk and PostgreSQL by Celery, but in-memory store was un-synced.`,
    error_code: "ENTITY_NOT_INDEXED_404",
    resolution: "Requires POST /ingest/sync/{task_id} trigger inside FastAPI process.",
  };

  return (
    <div className="card-tactical rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SYNCHRONIZATION SIMULATOR &amp; LAB
            </span>
            <span className="text-xs text-slate-400 font-mono">FORENSIC RESPONSE PROBE</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            404 Crisis vs. Live Provisional Online Inference
          </h3>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono">
          <button
            onClick={() => {
              setMode("without_phase11");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              mode === "without_phase11"
                ? "bg-white text-rose-700 shadow-xs border border-rose-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Legacy (No Sync)
          </button>
          <button
            onClick={() => {
              setMode("with_phase11");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              mode === "with_phase11"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Phase 11 Sync (Live)
          </button>
        </div>
      </div>

      {/* Simulator Scenario Configuration Bar */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
            Simulated Ingest Batch Payload
          </div>
          <div className="flex items-center gap-2 font-mono text-slate-800 font-semibold">
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <span>ransomware_illicit_run_nov26.csv</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600">250 txs</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-amber-700 font-bold">42 novel un-indexed wallets</span>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className="btn-tactical-primary text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Simulating Ingest &amp; Query...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Re-Run Investigation Probe</span>
            </>
          )}
        </button>
      </div>

      {/* HTTP Query Header Bar */}
      <div className="p-3.5 rounded-lg bg-slate-900 text-white font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="px-2 py-0.5 rounded bg-sky-600 font-bold text-[10px]">GET</span>
          <span className="text-slate-300 truncate">
            /api/v1/entity/{sampleWallet}/explain
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {mode === "with_phase11" ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              HTTP 200 OK (1.4ms)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <XCircle className="w-3.5 h-3.5" />
              HTTP 404 Not Found (1.1ms)
            </span>
          )}
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[10px]">Host: uvicorn-8000</span>
        </div>
      </div>

      {/* Tab Switcher: UI Preview vs Raw JSON vs Headers */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-mono">
        <button
          onClick={() => setActiveTab("preview")}
          className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === "preview"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Operator UI Visualizer
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === "json"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Raw API JSON Response
        </button>
        <button
          onClick={() => setActiveTab("headers")}
          className={`pb-2.5 font-bold cursor-pointer transition-colors border-b-2 ${
            activeTab === "headers"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          HTTP Wire Headers
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          {mode === "with_phase11" ? (
            /* Success State: Provisional Dossier Rendering */
            <div className="p-5 rounded-xl border border-emerald-200 bg-white space-y-4 shadow-xs">
              {/* Amber Provisional Warning Banner */}
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-900">
                  <div className="font-bold uppercase font-mono text-[11px] flex items-center gap-2">
                    <span>Provisional Analysis Mode</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 text-[9px]">
                      LIVE IN-MEMORY
                    </span>
                  </div>
                  <p className="leading-relaxed text-amber-800">
                    This entity was ingested in the current session. Tabular FT-Transformer anomaly reconstruction and heuristic rules are scored live. Topological GDS modularity and SHAP background sampling will resolve during scheduled batch retraining.
                  </p>
                </div>
              </div>

              {/* Entity Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Verdict</div>
                  <div className="text-sm font-bold text-rose-600 mt-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    HIGH RISK (0.642)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Composite Score</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">FT-Transformer MSE</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">0.048215</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    96.4th Percentile (Anomalous)
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Laundering Signals</div>
                  <div className="text-xs font-bold text-indigo-700 mt-1">PEELING CHAIN</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Seed Recipient Proximity: 0.50</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Graph / Louvain</div>
                  <div className="text-sm font-bold text-slate-400 mt-1">&mdash;</div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    Deferred to GDS Rerun
                  </div>
                </div>
              </div>

              {/* Forensic Status Chip */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 font-semibold">Zero 404s Achieved</span>
                  <span>&bull; In-memory synchronization latency: 1.4ms</span>
                </div>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  INVESTIGATION PROCEEDING
                </span>
              </div>
            </div>
          ) : (
            /* Failure State: 404 Forensic Crisis Rendering */
            <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-4 shadow-xs">
              <div className="p-4 rounded-lg bg-white border border-rose-200 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-rose-900 font-mono text-sm">
                    HTTP 404 Not Found &mdash; Unsynchronized Memory Store
                  </div>
                  <p className="text-rose-800 leading-relaxed">
                    The operator clicked an alert for wallet <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-[11px] text-rose-950 font-bold">{sampleWallet}</code> immediately after Celery finished bulk ingestion.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Why this occurred:</strong> Celery inserted the row into PostgreSQL, but ran inside an isolated OS worker process. FastAPI&rsquo;s in-memory <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-900">xai_store</code> was loaded once at startup and received no notification. The entity is absent from RAM, triggering an instant 404 exception.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-100/60 rounded-lg border border-rose-200 text-xs font-mono text-rose-900 space-y-1">
                <div className="font-bold uppercase text-[10px] text-rose-700">Forensic Impact:</div>
                <div>&bull; Operator blocked: cannot view risk score or examine transaction trail.</div>
                <div>&bull; Section 65B court-admissible certificate generation fails immediately.</div>
                <div>&bull; Urgent LEA seizure window lost while waiting for manual server restart.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "json" && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden font-mono text-xs">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>JSON PAYLOAD ({mode === "with_phase11" ? "200 OK" : "404 Not Found"})</span>
            <span>Content-Type: application/json</span>
          </div>
          <pre className="p-4 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
            {JSON.stringify(mode === "with_phase11" ? successJson : failureJson, null, 2)}
          </pre>
        </div>
      )}

      {activeTab === "headers" && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden font-mono text-xs text-slate-300">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>RAW HTTP RESPONSE HEADERS</span>
            <span>HTTP/1.1</span>
          </div>
          <div className="p-4 space-y-1.5 text-[11px]">
            <div><span className="text-sky-400">Status:</span> {mode === "with_phase11" ? "200 OK" : "404 Not Found"}</div>
            <div><span className="text-sky-400">Content-Type:</span> application/json</div>
            <div><span className="text-sky-400">Server:</span> uvicorn (FastAPI 0.115.0)</div>
            <div><span className="text-sky-400">X-Process-Memory:</span> {mode === "with_phase11" ? "HIT (xai_store in-memory RLock)" : "MISS (key absent from _composite)"}</div>
            <div><span className="text-sky-400">X-Inference-Engine:</span> FT-Transformer-CPU (Latency: 1.4ms)</div>
            <div><span className="text-sky-400">X-Provisional-Mode:</span> {mode === "with_phase11" ? "ENABLED (Phase 11 Handshake)" : "DISABLED"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
