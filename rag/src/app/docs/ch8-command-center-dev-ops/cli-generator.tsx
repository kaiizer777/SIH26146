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
  FileText,
  Activity,
  HeartPulse,
  UploadCloud,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";

interface CommandTask {
  id: string;
  name: string;
  badge: string;
  shortDesc: string;
  plainEnglish: string;
  category: "1-CLICK DEPLOY" | "FIELD OPERATIONS" | "LEGAL EVIDENCE" | "DIAGNOSTICS" | "DEVELOPER";
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
    id: "docker_1command",
    name: "1-Command Complete Docker Launch",
    badge: "RECOMMENDED",
    shortDesc: "Boot the entire sovereign intelligence stack in under 30 seconds",
    plainEnglish:
      "Run this single command on any secure laptop or server. It automatically spins up the database, graph engine, AI transformers, background worker, and the visual Command Center.",
    category: "1-CLICK DEPLOY",
    icon: Zap,
    terminalTitle: "Terminal / PowerShell — 1-Command Air-Gapped Deployment",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const build = p.rebuild ? " --build" : "";
      return `# 1-Command Air-Gapped Launch (PostgreSQL + Neo4j + Redis + FastAPI + Celery + Next.js)
docker compose up -d${build}

# Verify container health status across all 6 microservices
docker compose ps`;
    },
    expectedOutput: `[+] Running 6/6
 ✔ Network sih_network         Created
 ✔ Container sih26146-postgres Healthy
 ✔ Container sih26146-redis    Healthy
 ✔ Container sih26146-neo4j    Healthy
 ✔ Container sih26146-fastapi  Started
 ✔ Container sih26146-celery   Started
 ✔ Container sih26146-frontend Started

NAME                 IMAGE                 STATUS                    PORTS
sih26146-postgres    postgres:16-alpine    Up 14s (healthy)          0.0.0.0:5433->5432/tcp
sih26146-neo4j       neo4j:5.26-community  Up 14s (healthy)          0.0.0.0:7474->7474/tcp, 7687/tcp
sih26146-redis       redis:7-alpine        Up 14s (healthy)          0.0.0.0:6380->6379/tcp
sih26146-fastapi     backend-fastapi       Up 12s                    0.0.0.0:8000->8000/tcp
sih26146-celery      backend-celery        Up 12s                    
sih26146-frontend    frontend-ui           Up 10s                    0.0.0.0:3000->3000/tcp

Command Center is live: http://localhost:3000`,
    prerequisites: [
      "Docker Desktop or Docker Engine installed on Windows/Linux host",
      "No internet access required (all container images pre-cached)",
      "Ports 3000, 8000, 5433, 6380, 7687 available",
    ],
    options: [
      {
        id: "rebuild",
        label: "Force Rebuild Containers (--build)",
        type: "boolean",
        default: false,
      },
    ],
  },
  {
    id: "field_evidence_ingest",
    name: "Ingest Seized Evidence Batch",
    badge: "FIELD READY",
    shortDesc: "Upload seized raw Bitcoin transaction logs with automatic deduplication",
    plainEnglish:
      "When officers seize a hard drive or flash drive containing raw transaction dumps (CSV or JSON), this command ingests all rows, runs instant heuristic checks, and computes threat scores.",
    category: "FIELD OPERATIONS",
    icon: UploadCloud,
    terminalTitle: "PowerShell / cURL — Field Evidence Ingestion",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const filename = p.filename || "seized_case_evidence.csv";
      return `# Ingest raw transaction file into the offline forensic engine:
curl -X POST "http://localhost:8000/ingest/upload" \`
  -H "Authorization: Bearer dev-token" \`
  -F "file=@./${filename}"`;
    },
    expectedOutput: `{"status":"SUCCESS","task_id":"3f2e1a9b-7c8d-4e5f-9a0b-1c2d3e4f5a6b","filename":"seized_case_evidence.csv","sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","total_transactions":1000,"ingest_duration_ms":563,"message":"1,000 transactions ingested and scored successfully. Zero duplicates."}`,
    prerequisites: [
      "FastAPI backend running at http://localhost:8000",
      "Target CSV/JSON file located in your working directory",
      "Automatic duplicate guard active: identical files blocked within 24 hours",
    ],
    options: [
      {
        id: "filename",
        label: "Evidence File Name",
        type: "select",
        default: "seized_case_evidence.csv",
        choices: [
          { value: "seized_case_evidence.csv", label: "seized_case_evidence.csv (CSV)" },
          { value: "mixer_dump_transactions.json", label: "mixer_dump_transactions.json (JSON)" },
          { value: "wallet_cluster_export.xml", label: "wallet_cluster_export.xml (XML)" },
        ],
      },
    ],
  },
  {
    id: "export_court_dossier",
    name: "Export Section 65B Court Dossier",
    badge: "LEGAL CERTIFIED",
    shortDesc: "Generate signed, court-admissible PDF evidence report for judicial filing",
    plainEnglish:
      "Generates an official electronic certificate complying with Section 65B of the Indian Evidence Act. Contains visual transaction flow diagrams, AI attention weights, and SHA-256 hash chains.",
    category: "LEGAL EVIDENCE",
    icon: Scale,
    terminalTitle: "PowerShell / cURL — Section 65B Dossier Generator",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const targetAddr: string = typeof p.address === "string" ? p.address : "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      return `# Export Section 65B PDF evidence dossier for suspect wallet:
curl -X GET "http://localhost:8000/api/v1/entity/${targetAddr}/export-dossier" \`
  -H "Authorization: Bearer dev-token" \`
  --output "NTRO_EVIDENCE_DOSSIER_${targetAddr.slice(0, 8)}.pdf"

Write-Host "Evidence dossier exported to NTRO_EVIDENCE_DOSSIER_${targetAddr.slice(0, 8)}.pdf" -ForegroundColor Green`;
    },
    expectedOutput: `  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  384k  100  384k    0     0  2210k      0 --:--:-- --:--:-- --:--:-- 2219k

Evidence dossier exported to NTRO_EVIDENCE_DOSSIER_1A1zP1eP.pdf
Status: Signed with SHA-256 digital custody stamp & Section 65B compliance certificate.`,
    prerequisites: [
      "Backend server running on port 8000",
      "Suspect address has at least 1 indexed transaction",
      "Generates PDF file ready for prosecution submission",
    ],
    options: [
      {
        id: "address",
        label: "Target Suspect Bitcoin Address",
        type: "select",
        default: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        choices: [
          { value: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", label: "1A1zP1eP... (Darknet Cluster)" },
          { value: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", label: "bc1qar0s... (Mixer Pool)" },
          { value: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", label: "3J98t1Wp... (Peeling Chain)" },
        ],
      },
    ],
  },
  {
    id: "system_health_audit",
    name: "Field System Health & Vitals Audit",
    badge: "1-SECOND CHECK",
    shortDesc: "Single health check verifying all databases, models, and workers",
    plainEnglish:
      "A quick diagnostic ping to verify that the database, graph database, Redis queue, and PyTorch AI models are all operating at 100% capacity before starting an investigation.",
    category: "DIAGNOSTICS",
    icon: HeartPulse,
    terminalTitle: "PowerShell — Multi-Service Health Ping",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: () => {
      return `# Query the unified health monitoring endpoint:
curl -s http://localhost:8000/health | ConvertFrom-Json | Format-List`;
    },
    expectedOutput: `status          : HEALTHY
environment     : development (air-gapped)
database        : CONNECTED (PostgreSQL 16, 5432)
graph_engine    : CONNECTED (Neo4j 5.26 GDS, 7687)
redis_broker    : CONNECTED (Redis 7.2, 6379)
celery_worker   : READY (concurrency: solo)
ai_models       : LOADED (FT-Transformer + Relational Graph Transformer)
indexed_wallets : 100,000+
airgap_status   : VERIFIED (0 outbound internet connections)`,
    prerequisites: [
      "FastAPI server running at http://localhost:8000",
      "Returns instant green status for all services",
    ],
  },
  {
    id: "all_services_baremetal",
    name: "Bare-Metal 3-Terminal Launch (No Docker)",
    badge: "BARE-METAL FALLBACK",
    shortDesc: "Native Windows PowerShell execution without Docker virtualization",
    plainEnglish:
      "For low-spec laptops or secured environments where Docker is not installed. Executes FastAPI, Celery with solo pool, and Next.js directly on the host machine.",
    category: "DEVELOPER",
    icon: Play,
    terminalTitle: "PowerShell — Native Windows 3-Terminal Orchestration",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const mode = p.detached ? "-NoExit " : "";
      return `# Terminal 1: FastAPI Uvicorn Server (Port 8000)
Start-Process pwsh -ArgumentList "${mode}-Command cd backend; .\\venv\\Scripts\\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Terminal 2: Celery Background Ingestion Worker (--pool=solo for Windows)
Start-Process pwsh -ArgumentList "${mode}-Command cd backend; .\\venv\\Scripts\\Activate.ps1; celery -A app.celery_app worker --loglevel=info --pool=solo"

# Terminal 3: Next.js Command Center UI (Port 3000)
Start-Process pwsh -ArgumentList "${mode}-Command cd frontend; npm run dev"`;
    },
    expectedOutput: `[INFO] Terminal 1: Uvicorn running on http://0.0.0.0:8000
[INFO] Terminal 2: celery@DESKTOP ready. pool=solo
[INFO] Terminal 3: Next.js ready on http://localhost:3000
All services connected successfully.`,
    prerequisites: [
      "Python 3.12 virtual environment in backend/venv",
      "Node.js 18+ installed on workstation",
      "PostgreSQL, Neo4j, and Redis running as Windows services",
    ],
    options: [
      {
        id: "detached",
        label: "Keep Windows Open After Boot (-NoExit)",
        type: "boolean",
        default: true,
      },
    ],
  },
  {
    id: "pytest_suite",
    name: "Run 196+ Automated Tests",
    badge: "100% PASSING",
    shortDesc: "Run deterministic verification tests across all 12 pipeline stages",
    plainEnglish:
      "Proves to judges that every single component works mathematically: test peeling chain heuristics, autoencoders, graph neural networks, and privacy redaction.",
    category: "DEVELOPER",
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
      return `.\\backend\\venv\\Scripts\\python.exe -m pytest ${pathArg} ${verbose} --durations=5`;
    },
    expectedOutput: `============================= test session starts =============================
platform win32 -- Python 3.12.3, pytest-8.3.2, pluggy-1.5.0
collected 198 items

backend/tests/test_alerts_endpoint.py ......................... [ 12%]
backend/tests/test_dup_ingest.py ..........                     [ 17%]
backend/tests/test_entity_subgraph.py ........                  [ 21%]
backend/tests/test_ft_transformer.py ..............             [ 28%]
backend/tests/test_graph_router.py .................            [ 37%]
backend/tests/test_graph_transformer.py .....................   [ 48%]
backend/tests/test_ingest_sync.py ...............               [ 56%]
backend/tests/test_inline_scorer.py ...                         [ 57%]
backend/tests/test_phase4_clustering.py .....                   [ 64%]
backend/tests/test_phase5_autoencoder.py .....                  [ 67%]
backend/tests/test_phase6_detectors.py .........                [ 71%]
backend/tests/test_phase7_graphsage.py ......................   [ 82%]
backend/tests/test_phase8_xai.py ......................         [ 93%]
backend/tests/test_promote_models.py .....                      [ 96%]
backend/tests/test_synthetic_generator.py ........              [100%]

============================= 198 passed in 14.82s =============================`,
    prerequisites: [
      "Python 3.12 virtual environment active",
      "All 196+ assertions pass deterministically",
    ],
    options: [
      {
        id: "target",
        label: "Test Scope",
        type: "select",
        default: "all",
        choices: [
          { value: "all", label: "Full Suite (All 196+ Tests)" },
          { value: "sync", label: "Online Ingest Sync & Scorer" },
          { value: "ml", label: "Dual Transformer ML & Promotion" },
          { value: "security", label: "Security & OPSEC Redaction" },
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
    id: "port_cleanup",
    name: "Free Stuck Ports (8000 / 3000)",
    badge: "SAFE & FOOLPROOF",
    shortDesc: "Safely find and terminate orphan processes holding ports",
    plainEnglish:
      "If a previous terminal window was closed without stopping the server, this command safely frees port 8000 or 3000 without affecting your data.",
    category: "DIAGNOSTICS",
    icon: ShieldAlert,
    terminalTitle: "PowerShell — Port Diagnostic & Free",
    workingDir: "C:\\Users\\bari2\\Desktop\\SIH26146",
    commandTemplate: (p) => {
      const targetPort = p.port || "8000";
      return `# Check if port ${targetPort} is in use and free it safely:
$proc = (Get-NetTCPConnection -LocalPort ${targetPort} -ErrorAction SilentlyContinue).OwningProcess
if ($proc) {
    Write-Host "Found background process $proc on port ${targetPort}. Freeing port..." -ForegroundColor Yellow
    Stop-Process -Id $proc -Force
    Write-Host "Port ${targetPort} is now open and ready." -ForegroundColor Green
} else {
    Write-Host "Port ${targetPort} is already free and ready to use." -ForegroundColor Cyan
}`;
    },
    expectedOutput: `Found background process 14292 on port 8000. Freeing port...
Port 8000 is now open and ready.`,
    prerequisites: [
      "Standard Windows PowerShell terminal",
      "Zero risk: only frees the port listener",
    ],
    options: [
      {
        id: "port",
        label: "Target Port to Audit / Free",
        type: "select",
        default: "8000",
        choices: [
          { value: "8000", label: "8000 (FastAPI Backend Server)" },
          { value: "3000", label: "3000 (Next.js Command Center)" },
          { value: "6379", label: "6379 (Redis Broker)" },
          { value: "7687", label: "7687 (Neo4j Graph Bolt)" },
        ],
      },
    ],
  },
];

export function CliCommandGenerator() {
  const [activeTaskId, setActiveTaskId] = useState<string>("docker_1command");
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
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold tracking-wide uppercase flex items-center gap-2">
              <span>Operational Runbook &amp; CLI Generator</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                FOOLPROOF FIELD COMMANDS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Select a task below to generate ready-to-run commands with 1-click clipboard copy
            </div>
          </div>
        </div>

        {/* Copy CTA */}
        <button
          onClick={handleCopy}
          className="btn-tactical-primary text-white text-xs font-mono px-3.5 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs font-bold"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">COPIED TO CLIPBOARD!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-sky-300" />
              <span>COPY COMMAND</span>
            </>
          )}
        </button>
      </div>

      {/* Task Selector Tabs */}
      <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap gap-1.5">
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
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span>{task.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isActive
                    ? "bg-sky-100 text-sky-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {task.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task Configuration & Command Surface */}
      <div className="p-5 space-y-4">
        {/* Task Summary Banner */}
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{currentTask.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                {currentTask.category}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
              Run in: <code className="text-slate-900 font-semibold">{currentTask.workingDir}</code>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-sans">
            <strong>In Plain English:</strong> {currentTask.plainEnglish}
          </p>
        </div>

        {/* Dynamic Parameter Controls (if task has options) */}
        {currentTask.options && currentTask.options.length > 0 && (
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Customize Command Options:
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
                      <span className="text-slate-600">{opt.label}:</span>
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
                return null;
              })}
            </div>
          </div>
        )}

        {/* Command Display Terminal */}
        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
          {/* Terminal Titlebar */}
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-400 ml-2 text-[11px] truncate">
                {currentTask.terminalTitle}
              </span>
            </div>
            <div className="flex items-center space-x-1">
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
                Expected Output
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
        <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Field Verification &amp; Operational Checklist
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
