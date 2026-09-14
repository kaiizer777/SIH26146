"use client";

import React, { useState } from "react";
import {
  Terminal,
  Copy,
  Check,
  Play,
  Server,
  Cpu,
  Layers,
  ShieldAlert,
  Database,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface CommandTask {
  id: string;
  name: string;
  shortDesc: string;
  category: "RUNBOOK" | "TESTING" | "INFRA" | "SYNC";
  icon: React.ComponentType<{ className?: string }>;
  terminalTitle: string;
  workingDir: string;
  commandTemplate: (params: Record<string, string | boolean>) => string;
  expectedOutput: string;
  prerequisites: string[];
  options?: {
    id: string;
    label: string;
    type: "boolean" | "select" | "text";
    default: any;
    choices?: { value: string; label: string }[];
  }[];
}

const COMMAND_TASKS: CommandTask[] = [
  {
    id: "all_services",
    name: "Spin Up All Services",
    shortDesc: "Complete 3-terminal execution sequence from bare-metal",
    category: "RUNBOOK",
    icon: Play,
    terminalTitle: "PowerShell — Multi-Terminal Launch Orchestration",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const mode = p.detached ? "-NoExit " : "";
      return `# Terminal 1: FastAPI Uvicorn Server (Port 8000)
Start-Process pwsh -ArgumentList "${mode}-Command cd backend; .\\venv\\Scripts\\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Terminal 2: Celery Background Ingestion Worker (--pool=solo)
Start-Process pwsh -ArgumentList "${mode}-Command cd backend; .\\venv\\Scripts\\Activate.ps1; celery -A app.celery_app worker --loglevel=info --pool=solo"

# Terminal 3: Next.js Command Center (Port 3000)
Start-Process pwsh -ArgumentList "${mode}-Command cd frontend; npm run dev"

# Optional Terminal 4: RAG Documentation & AI Doubt Solver (Port 3001)
Start-Process pwsh -ArgumentList "${mode}-Command cd rag; npm run dev"`;
    },
    expectedOutput: `[INFO] Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
[INFO] celery@DESKTOP ready. pool=solo
[INFO] Next.js 16.0.0 ready on http://localhost:3000
[INFO] RAG docs ready on http://localhost:3001`,
    prerequisites: [
      "PostgreSQL 16 active on port 5432 with sih_bitcoin schema",
      "Neo4j 5.x Community + GDS active on port 7687 (bolt)",
      "Redis active on port 6379 (redis://localhost:6379/0)",
      ".env configuration file created in repository root",
    ],
    options: [
      {
        id: "detached",
        label: "Keep Windows Open (-NoExit)",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "backend_api",
    name: "Run Backend API Server",
    shortDesc: "FastAPI with AddressHashMiddleware and live auto-reload",
    category: "RUNBOOK",
    icon: Server,
    terminalTitle: "Terminal 1: FastAPI Uvicorn Server",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146\\backend",
    commandTemplate: (p) => {
      const reload = p.reload ? "--reload" : "";
      const port = p.port || "8000";
      return `# 1. Navigate to backend directory
cd backend

# 2. Activate Python Virtual Environment
.\\venv\\Scripts\\Activate.ps1

# 3. Apply any pending database schema migrations (Alembic)
alembic upgrade head

# 4. Launch FastAPI with Uvicorn
uvicorn app.main:app ${reload} --host 0.0.0.0 --port ${port}`.replace(/\n\n+/g, "\n");
    },
    expectedOutput: `INFO:     Will watch for changes in: ['C:\\\\Users\\\\bari2\\\\Desktop\\\\SIH26146\\\\backend']
INFO:     [MODEL CONFIG] Anomaly: FT-Transformer (primary) | Risk: Graph Transformer (primary)
INFO:     Loading XAI artifact store into memory… (17020 composite records loaded)
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)`,
    prerequisites: [
      "Virtual environment created with Python 3.12 (backend\\venv)",
      "PostgreSQL accessible at localhost:5432 with sih_user credentials",
      "Neo4j accessible at bolt://localhost:7687",
    ],
    options: [
      {
        id: "reload",
        label: "Enable Hot Reload (--reload)",
        type: "boolean",
        default: true,
      },
      {
        id: "port",
        label: "Port Binding",
        type: "select",
        default: "8000",
        choices: [
          { value: "8000", label: "8000 (Default Production Port)" },
          { value: "8001", label: "8001 (Alternative Port)" },
          { value: "8080", label: "8080 (Sandbox Port)" },
        ],
      },
    ],
  },
  {
    id: "celery_worker",
    name: "Start Celery Solo Worker",
    shortDesc: "Windows-compliant solo pool processing async CSV/JSON/XML ingestion",
    category: "RUNBOOK",
    icon: Cpu,
    terminalTitle: "Terminal 2: Celery Background Ingest Worker",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146\\backend",
    commandTemplate: (p) => {
      const logLevel = p.logLevel || "info";
      return `# 1. Navigate to backend directory
cd backend

# 2. Activate Python Virtual Environment
.\\venv\\Scripts\\Activate.ps1

# 3. Start Celery worker with mandatory --pool=solo on Windows
celery -A app.celery_app worker --loglevel=${logLevel} --pool=solo`;
    },
    expectedOutput: ` -------------- celery@DESKTOP-SIH26146 v5.3.6 (emerald-rush)
--- ***** ----- 
-- ******* ---- Windows-11-10.0.26100-SP0 2026-09-13 20:15:00
- *** --- * --- 
- ** ---------- [config]
- ** ---------- .> app:         app.celery_app:0x...
- ** ---------- .> transport:   redis://localhost:6379/0
- ** ---------- .> results:     redis://localhost:6379/0
- *** --- * --- .> concurrency: 1 (solo)
-- ******* ---- .> task events: OFF (enable -E to monitor tasks)
--- ***** ----- 
 -------------- [queues]
                .> celery           exchange=celery(direct) key=celery
[INFO/MainProcess] Connected to redis://localhost:6379/0
[INFO/MainProcess] celery@DESKTOP-SIH26146 ready.`,
    prerequisites: [
      "Redis running on localhost:6379 (redis-cli ping returns PONG)",
      "MaxMind GeoLite2-City.mmdb in backend/data/ or GeoIP configured",
      "Mandatory --pool=solo flag to avoid Windows fork() permission crashes",
    ],
    options: [
      {
        id: "logLevel",
        label: "Log Verbosity",
        type: "select",
        default: "info",
        choices: [
          { value: "info", label: "INFO (Standard Runbook Output)" },
          { value: "debug", label: "DEBUG (Deep Pipeline Tracing)" },
          { value: "warning", label: "WARNING (Quiet Mode)" },
        ],
      },
    ],
  },
  {
    id: "frontend_cockpit",
    name: "Start Next.js Command Center",
    shortDesc: "Forensic dashboard with 38px dense table, D3 visualizer, and HUD",
    category: "RUNBOOK",
    icon: Layers,
    terminalTitle: "Terminal 3: Next.js Frontend Command Center",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146\\frontend",
    commandTemplate: (p) => {
      const port = p.port || "3000";
      return `# 1. Navigate to frontend directory
cd frontend

# 2. Verify local air-gapped node dependencies
npm install

# 3. Start Next.js development server
npm run dev -- -p ${port}`;
    },
    expectedOutput: `▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.104:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 1420ms
 ○ Compiling / ...
 ✓ Compiled / in 980ms (482 modules)`,
    prerequisites: [
      "Node.js 18+ or 20+ installed on host",
      "Backend running on http://localhost:8000 for live data streaming",
      "Local font woff2 pre-cached in .next/static/media (zero CDN calls)",
    ],
    options: [
      {
        id: "port",
        label: "Port Number",
        type: "select",
        default: "3000",
        choices: [
          { value: "3000", label: "3000 (Command Center Default)" },
          { value: "3002", label: "3002 (Alternate UI Port)" },
        ],
      },
    ],
  },
  {
    id: "pytest_suite",
    name: "Run Automated Test Suite",
    shortDesc: "Execute 196+ passing Pytest unit, integration, and security tests",
    category: "TESTING",
    icon: CheckCircle2,
    terminalTitle: "Pytest Automated Verification & Assertion Runner",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const target = p.target || "all";
      const verbose = p.verbose ? "-v" : "-q";
      let pathArg = "backend/tests/";
      if (target === "security") {
        pathArg = "backend/tests/test_alerts_endpoint.py backend/tests/test_dup_ingest.py";
      } else if (target === "sync") {
        pathArg = "backend/tests/test_ingest_sync.py backend/tests/test_inline_scorer.py";
      } else if (target === "ml") {
        pathArg = "backend/tests/test_ft_transformer.py backend/tests/test_graph_transformer.py backend/tests/test_promote_models.py";
      }
      return `# Run tests using virtual environment Python directly
.\\backend\\venv\\Scripts\\python.exe -m pytest ${pathArg} ${verbose} --durations=5`;
    },
    expectedOutput: `============================= test session starts =============================
platform win32 -- Python 3.12.3, pytest-8.3.2, pluggy-1.5.0
collected 198 items

backend/tests/test_alerts_endpoint.py ....                      [  2%]
backend/tests/test_dup_ingest.py ......                         [  5%]
backend/tests/test_entity_subgraph.py ..                        [  6%]
backend/tests/test_fallback_config.py .....                     [  9%]
backend/tests/test_feature_extractor.py .......................................... [ 30%]
backend/tests/test_ft_transformer.py .......                    [ 33%]
backend/tests/test_graph_build.py .....                         [ 36%]
backend/tests/test_graph_router.py .......                      [ 39%]
backend/tests/test_graph_transformer.py .........               [ 44%]
backend/tests/test_ingest.py ................                   [ 52%]
backend/tests/test_ingest_sync.py ........                      [ 56%]
backend/tests/test_inline_scorer.py ...                         [ 58%]
backend/tests/test_naming_parity.py ........                    [ 62%]
backend/tests/test_phase4_clustering.py .....                   [ 64%]
backend/tests/test_phase5_autoencoder.py .....                  [ 67%]
backend/tests/test_phase6_detectors.py ........                 [ 71%]
backend/tests/test_phase7_graphsage.py .....................    [ 81%]
backend/tests/test_phase8_xai.py ......................         [ 92%]
backend/tests/test_promote_models.py .....                      [ 95%]
backend/tests/test_synthetic_generator.py .........             [100%]

============================= 198 passed in 14.82s =============================`,
    prerequisites: [
      "Virtual environment active with all test dependencies",
      "Pre-indexed Phase 8 JSON artifacts present in data/xai/",
      "PyG (torch-geometric) and PyTorch CPU installed",
    ],
    options: [
      {
        id: "target",
        label: "Test Scope",
        type: "select",
        default: "all",
        choices: [
          { value: "all", label: "Full Suite (All 198 Passing Tests)" },
          { value: "sync", label: "Phase 11 Online Sync & Scorer" },
          { value: "ml", label: "Dual Transformer ML & Promotion" },
          { value: "security", label: "Security & Address Redaction" },
        ],
      },
      {
        id: "verbose",
        label: "Verbose Details (-v)",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "trigger_sync",
    name: "Trigger Post-Ingest Sync",
    shortDesc: "Manual execution of Phase 11 IPC sync for freshly uploaded task",
    category: "SYNC",
    icon: RefreshCw,
    terminalTitle: "PowerShell / cURL — Manual Handshake Trigger",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const taskId = p.taskId || "3f2e1a9b-7c8d-4e5f-9a0b-1c2d3e4f5a6b";
      return `# 1. Query Celery task status to ensure SUCCESS
curl -X GET "http://localhost:8000/ingest/status/${taskId}" \`
  -H "Authorization: Bearer dev-token"

# 2. Fire synchronized in-memory XAI upsert to FastAPI process
curl -X POST "http://localhost:8000/ingest/sync/${taskId}" \`
  -H "Authorization: Bearer dev-token" \`
  -H "Content-Type: application/json"`;
    },
    expectedOutput: `{"status":"SUCCESS","total_received":1000,"total_inserted":1000,"total_rejected":0}

# Step 2 Response:
{"status":"SYNCED","scored":24,"upserted":24,"skipped_existing":0,"elapsed_ms":14.2}`,
    prerequisites: [
      "Celery task ID in SUCCESS status",
      "FastAPI server running at http://localhost:8000",
      "API Bearer auth token (dev-token by default)",
    ],
    options: [
      {
        id: "taskId",
        label: "Celery Ingest Task UUID",
        type: "text",
        default: "3f2e1a9b-7c8d-4e5f-9a0b-1c2d3e4f5a6b",
      },
    ],
  },
  {
    id: "port_status",
    name: "Check Port Status & Clean Up",
    shortDesc: "Inspect ports 8000, 3000, 5432, 6379, 7687 and kill conflicting PIDs",
    category: "INFRA",
    icon: ShieldAlert,
    terminalTitle: "PowerShell — Port Collision Diagnostic & Termination",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const targetPort = p.port || "8000";
      return `# Check if ports 8000, 3000, 5432, 6379, 7687 are listening
Get-NetTCPConnection -LocalPort 8000, 3000, 5432, 6379, 7687 -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess, State |
  Format-Table -AutoSize

# Find and kill any orphan process hogging port ${targetPort}:
$proc = (Get-NetTCPConnection -LocalPort ${targetPort} -ErrorAction SilentlyContinue).OwningProcess
if ($proc) {
    Write-Host "Found process $proc listening on port ${targetPort}. Terminating..." -ForegroundColor Yellow
    Stop-Process -Id $proc -Force
    Write-Host "Port ${targetPort} freed successfully." -ForegroundColor Green
} else {
    Write-Host "Port ${targetPort} is completely free." -ForegroundColor Cyan
}`;
    },
    expectedOutput: `LocalPort OwningProcess State
--------- ------------- -----
     3000         14292 Listen
     5432          4820 Listen
     6379          3912 Listen
     7687          8904 Listen
     8000         21840 Listen

Found process 21840 listening on port 8000. Terminating...
Port 8000 freed successfully.`,
    prerequisites: [
      "Administrator or standard user PowerShell privileges",
      "No Docker desktop required (bare-metal native stack)",
    ],
    options: [
      {
        id: "port",
        label: "Target Port to Audit / Free",
        type: "select",
        default: "8000",
        choices: [
          { value: "8000", label: "8000 (FastAPI Backend)" },
          { value: "3000", label: "3000 (Next.js Command Center)" },
          { value: "3001", label: "3001 (RAG Docs)" },
          { value: "6379", label: "6379 (Redis Message Broker)" },
          { value: "7687", label: "7687 (Neo4j Bolt)" },
        ],
      },
    ],
  },
];

export function CliCommandGenerator() {
  const [activeTaskId, setActiveTaskId] = useState<string>("all_services");
  const [params, setParams] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"command" | "output">("command");

  const currentTask = COMMAND_TASKS.find((t) => t.id === activeTaskId) || COMMAND_TASKS[0];

  // Merge default options
  const resolvedParams: Record<string, any> = {};
  currentTask.options?.forEach((opt) => {
    resolvedParams[opt.id] = params[opt.id] ?? opt.default;
  });

  const generatedCommand = currentTask.commandTemplate(resolvedParams);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParamChange = (id: string, value: any) => {
    setParams((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Tactical Widget Top Bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold tracking-wide uppercase text-slate-900 flex items-center gap-2 flex-wrap">
              <span>Operator Runbook Generator</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200 font-bold">
                WINDOWS POWERSHELL
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Syntax-verified execution targets matching dev-server.md &amp; WORK-2.md
            </div>
          </div>
        </div>

        {/* 1-Click Copy CTA with Painted Light Depth */}
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto justify-center btn-tactical-primary text-white text-xs font-mono px-3.5 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">COPIED TO CLIPBOARD</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>COPY POWERSHELL COMMAND</span>
            </>
          )}
        </button>
      </div>

      {/* Task Selector Tabs */}
      <div className="p-3 bg-slate-100/60 border-b border-slate-200 flex flex-wrap gap-1.5">
        {COMMAND_TASKS.map((task) => {
          const isActive = task.id === currentTask.id;
          const Icon = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => {
                setActiveTaskId(task.id);
                setParams({});
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs border border-slate-300 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span>{task.name}</span>
            </button>
          );
        })}
      </div>

      {/* Task Configuration & Command Surface */}
      <div className="p-4 sm:p-5 space-y-5">
        {/* Task Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80">
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>{currentTask.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                {currentTask.category}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">{currentTask.shortDesc}</div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto max-w-full">
            Dir: <code className="text-slate-900 font-semibold break-all sm:break-normal">{currentTask.workingDir}</code>
          </div>
        </div>

        {/* Dynamic Parameter Controls (if task has options) */}
        {currentTask.options && currentTask.options.length > 0 && (
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Command Execution Flags &amp; Arguments
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {currentTask.options.map((opt) => {
                const val = resolvedParams[opt.id];
                if (opt.type === "boolean") {
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 text-xs font-mono text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={!!val}
                        onChange={(e) => handleParamChange(opt.id, e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                }
                if (opt.type === "select") {
                  return (
                    <div key={opt.id} className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-600 shrink-0">{opt.label}:</span>
                      <select
                        value={val}
                        onChange={(e) => handleParamChange(opt.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 font-mono text-xs focus:outline-none focus:border-slate-400"
                      >
                        {opt.choices?.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (opt.type === "text") {
                  return (
                    <div key={opt.id} className="flex items-center gap-2 text-xs font-mono w-full sm:w-auto">
                      <span className="text-slate-600 shrink-0">{opt.label}:</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleParamChange(opt.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-900 font-mono text-xs flex-1 sm:w-64 focus:outline-none focus:border-slate-400"
                        placeholder="Enter value…"
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {/* Command Display Terminal */}
        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
          {/* Terminal Titlebar */}
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="flex space-x-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-400 ml-2 text-[11px] truncate min-w-0">
                {currentTask.terminalTitle}
              </span>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => setActiveTab("command")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === "command"
                    ? "bg-slate-800 text-sky-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Command
              </button>
              <button
                onClick={() => setActiveTab("output")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === "output"
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Mock Output
              </button>
            </div>
          </div>

          {/* Code Window */}
          <div className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
            {activeTab === "command" ? (
              <pre className="text-emerald-400 whitespace-pre font-mono">
                {generatedCommand}
              </pre>
            ) : (
              <pre className="text-slate-300 whitespace-pre font-mono text-[11px]">
                {currentTask.expectedOutput}
              </pre>
            )}
          </div>
        </div>

        {/* Verification & Prerequisites Checklist */}
        <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Infrastructure Verification &amp; Prerequisites
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-mono">
            {currentTask.prerequisites.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                <span className="leading-snug">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
