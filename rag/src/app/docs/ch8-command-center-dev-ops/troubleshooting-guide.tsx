"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  Bug,
  HelpCircle,
  Search,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

interface TroubleshootingItem {
  id: string;
  title: string;
  category: "PORT" | "CELERY" | "NEO4J" | "REDIS" | "INGEST" | "FRONTEND";
  errorCode: string;
  symptom: string;
  rootCause: string;
  fixCommand: string;
  verificationCommand: string;
  notes?: string;
}

const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: "port_collision",
    title: "Port 8000 or 3000 Already In Use (WinError 10048 / EADDRINUSE)",
    category: "PORT",
    errorCode: "OS Error [WinError 10048] / Error: listen EADDRINUSE: address already in use :::3000",
    symptom:
      "Uvicorn or Next.js crashes on startup with 'Only one usage of each socket address is normally permitted' or 'address already in use'.",
    rootCause:
      "A previous Uvicorn, Celery, or Node.js background process did not terminate cleanly when the terminal was closed, leaving an orphaned socket listener locked on port 8000 or 3000.",
    fixCommand: `# Inspect and kill whatever process is holding port 8000 (FastAPI):
$port = 8000
$pid_to_kill = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($pid_to_kill) {
    Stop-Process -Id $pid_to_kill -Force
    Write-Host "Process $pid_to_kill killed. Port $port is now open." -ForegroundColor Green
}

# Repeat for frontend port 3000 if needed:
$pid_3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid_3000) { Stop-Process -Id $pid_3000 -Force }`,
    verificationCommand: `Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue | Format-Table`,
    notes:
      "Always inspect the PID before issuing -Force to ensure you are not closing a system service.",
  },
  {
    id: "celery_windows_pool",
    title: "Celery Crashes on Windows (NotImplementedError / PermissionError)",
    category: "CELERY",
    errorCode: "NotImplementedError: Operation not supported on platform Windows / PermissionError: [WinError 5]",
    symptom:
      "Celery worker immediately crashes after connecting to Redis when attempting to spawn worker subprocesses or execute tasks.",
    rootCause:
      "Windows operating system does not implement POSIX fork(). By default, Celery tries to use prefork multiprocessing, which fails on Windows due to unpicklable thread state and memory mapping restrictions.",
    fixCommand: `# Always launch Celery with the mandatory --pool=solo flag on Windows:
cd backend
.\\venv\\Scripts\\Activate.ps1
celery -A app.celery_app worker --loglevel=info --pool=solo`,
    verificationCommand: `Get-Process celery -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU`,
    notes:
      "--pool=solo executes tasks synchronously inside the worker process, avoiding Windows IPC fork restrictions while achieving blazing fast in-memory ingest performance.",
  },
  {
    id: "neo4j_gds_plugin",
    title: "Neo4j GDS Plugin Not Recognized or Louvain Procedure Fails",
    category: "NEO4J",
    errorCode: "Neo.ClientError.Procedure.ProcedureNotFound: There is no procedure with the name 'gds.graph.project' registered for this user",
    symptom:
      "Phase 3/4 clustering scripts fail with 'ProcedureNotFound' when projecting graph topologies or calling gds.louvain.stream.",
    rootCause:
      "The Neo4j Graph Data Science (GDS) library .jar file is missing from Neo4j's plugins directory, or neo4j.conf does not whitelist GDS in dbms.security.procedures.unrestricted.",
    fixCommand: `# 1. Locate Neo4j home directory and plugins/ folder
# Ensure neo4j-graph-data-science-*.jar is placed in plugins/

# 2. Add or verify unrestricted procedures in neo4j.conf:
# dbms.security.procedures.unrestricted=gds.*,apoc.*
# dbms.security.procedures.allowlist=gds.*,apoc.*

# 3. Restart the Neo4j Windows Service or Desktop instance
Restart-Service neo4j -ErrorAction SilentlyContinue`,
    verificationCommand: `cypher-shell -u neo4j -p password123 "CALL gds.version() YIELD version;"`,
    notes:
      "For SIH26146, GDS 2.5+ or 2.6+ Community is required for in-memory PageRank and Louvain modularity calculations.",
  },
  {
    id: "redis_connection_refused",
    title: "Redis Connection Refused (WinError 10061 / 127.0.0.1:6379)",
    category: "REDIS",
    errorCode: "redis.exceptions.ConnectionError: Error 10061 connecting to 127.0.0.1:6379. No connection could be made because the target machine actively refused it.",
    symptom:
      "Celery worker cannot boot and FastAPI /ingest endpoint returns HTTP 500 when creating Celery tasks or checking file hashes.",
    rootCause:
      "The Redis broker service is not currently running on port 6379 on the local Windows host.",
    fixCommand: `# If using Redis via Windows Service:
Start-Service Redis -ErrorAction SilentlyContinue

# If running Redis via standalone redis-server executable:
Start-Process "C:\\Program Files\\Redis\\redis-server.exe"

# If running Redis through WSL2 Ubuntu:
wsl sudo service redis-server start`,
    verificationCommand: `redis-cli ping
# Expected output: PONG`,
    notes:
      "Redis holds both the Celery message queue and the 24-hour file_hash duplicate upload lock keys.",
  },
  {
    id: "ingest_duplicate_409",
    title: "HTTP 409 Conflict During File Upload ('Duplicate upload detected')",
    category: "INGEST",
    errorCode: "HTTP 409 Conflict: {'detail': 'Duplicate upload detected — this file was already ingested.', 'original_task_id': '...'}",
    symptom:
      "Uploading a batch transaction file returns a red banner: 'This file has already been uploaded. Use a different file or wait 24 hours to re-upload.'",
    rootCause:
      "Stage 1 defensive upload hardening computes the SHA-256 hash of every uploaded file and stores file_hash:{hash} in Redis with a 24-hour TTL (ex=86400). Re-uploading the identical file within 24 hours triggers an idempotent HTTP 409 guard to prevent PostgreSQL transaction ID collisions.",
    fixCommand: `# To manually flush the duplicate upload lock in Redis for testing:
redis-cli --scan --pattern "file_hash:*" | ForEach-Object { redis-cli del $_ }

# Or flush all duplicate and sync lock keys at once:
redis-cli del (redis-cli keys "file_hash:*")
redis-cli del (redis-cli keys "sync_done:*")`,
    verificationCommand: `redis-cli keys "file_hash:*"
# Should return empty list (integer) 0`,
    notes:
      "This guard is a demo safety mechanism ensuring duplicate rows are not ingested twice and prevents unnecessary worker churn.",
  },
  {
    id: "frontend_hydration_fonts",
    title: "Next.js Font Flicker / Hydration Mismatch in Offline Mode",
    category: "FRONTEND",
    errorCode: "Warning: Extra attributes from the server: ... / Failed to fetch Google Fonts (net::ERR_INTERNET_DISCONNECTED)",
    symptom:
      "Browser console shows network errors attempting to reach fonts.googleapis.com, or layout shifts on initial load.",
    rootCause:
      "Sovereign NTRO air-gap standards prohibit runtime external CDN requests. If Next.js attempts to load Google fonts dynamically without pre-cached local assets, offline rendering stutters.",
    fixCommand: `# Ensure local fonts are properly loaded via Next.js next/font/local in layout.tsx:
# Fonts are already pre-cached in .next/static/media/*.woff2

# To rebuild clean local frontend cache:
cd frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build`,
    verificationCommand: `npm run build
# Expected: "✓ Generating static pages (0 errors)"`,
    notes:
      "Air-gap audit verified 0 runtime CDN requests across D3, Lucide, Sonner, and typography files.",
  },
];

export function TroubleshootingGuide() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>("port_collision");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["ALL", "PORT", "CELERY", "NEO4J", "REDIS", "INGEST", "FRONTEND"];

  const filteredItems = TROUBLESHOOTING_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "ALL" || item.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.errorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rootCause.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-4 p-4 sm:p-5">
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symptoms, errors, fixes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 self-start sm:self-auto overflow-x-auto max-w-full pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer shrink-0 ${
                activeCategory === cat
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-lg">
            No troubleshooting entries matched your search query.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-lg border transition-all ${
                  isExpanded
                    ? "border-slate-300 bg-white shadow-xs"
                    : "border-slate-200 bg-slate-50/50 hover:bg-white"
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full text-left p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-slate-200 text-slate-700 shrink-0">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900 leading-snug">
                        {item.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate max-w-2xl">
                      {item.errorCode}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-400 mt-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="px-3.5 sm:px-4 pb-5 pt-1 space-y-4 border-t border-slate-100">
                    {/* Error Symptom Callout */}
                    <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200/80 text-xs font-mono space-y-1">
                      <div className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Exact Error Symptom
                      </div>
                      <div className="text-slate-800 text-[11px] leading-relaxed">
                        {item.symptom}
                      </div>
                    </div>

                    {/* Root Cause Analysis */}
                    <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                      <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                        Root Cause Diagnosis
                      </div>
                      <p className="text-slate-600 text-xs">{item.rootCause}</p>
                    </div>

                    {/* Fix Command Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500">
                        <span>Terminal Remediation Command (PowerShell)</span>
                        <button
                          onClick={() => handleCopy(`fix-${item.id}`, item.fixCommand)}
                          className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedId === `fix-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY FIX</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                        <pre className="text-emerald-400 text-xs font-mono whitespace-pre">
                          {item.fixCommand}
                        </pre>
                      </div>
                    </div>

                    {/* Verification Command */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500">
                        <span>Resolution Verification Check</span>
                        <button
                          onClick={() => handleCopy(`ver-${item.id}`, item.verificationCommand)}
                          className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedId === `ver-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY CHECK</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                        <pre className="text-sky-300 text-[11px] font-mono whitespace-pre">
                          {item.verificationCommand}
                        </pre>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="text-[11px] font-mono text-slate-500 flex items-start gap-1.5 pt-1">
                        <span className="text-slate-400 font-bold">&bull;</span>
                        <span>{item.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
