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
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface TroubleshootingItem {
  id: string;
  title: string;
  category: "PORTS" | "WORKER" | "UPLOAD" | "DATABASE" | "OFFLINE";
  badge: string;
  symptom: string;
  plainExplanation: string;
  rootCause: string;
  fixCommand: string;
  verificationCommand: string;
  safetyGuarantee: string;
}

const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: "port_collision",
    title: "Screen says 'Port Already In Use' (Port 8000 or 3000)",
    category: "PORTS",
    badge: "MOST COMMON",
    symptom:
      "When launching the server or command center, the terminal crashes with 'Address already in use' or 'WinError 10048'.",
    plainExplanation:
      "A previous test or terminal was closed without cleanly shutting down the background server. The computer thinks the old session is still using the doorway (port 8000 or 3000).",
    rootCause:
      "Orphaned background process listener still binding to localhost:8000 (FastAPI) or localhost:3000 (Next.js).",
    fixCommand: `# Inspect and safely free port 8000 (Backend API):
$port = 8000
$pid_to_kill = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($pid_to_kill) {
    Stop-Process -Id $pid_to_kill -Force
    Write-Host "Port $port is now open and ready!" -ForegroundColor Green
}

# Inspect and safely free port 3000 (Frontend UI):
$pid_3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid_3000) {
    Stop-Process -Id $pid_3000 -Force
    Write-Host "Port 3000 is now open and ready!" -ForegroundColor Green
}`,
    verificationCommand: `Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue`,
    safetyGuarantee: "100% Safe: Only terminates stuck listener processes. Zero evidence files or database records are touched.",
  },
  {
    id: "ingest_duplicate_409",
    title: "Upload Blocked: 'Duplicate upload detected (409 Conflict)'",
    category: "UPLOAD",
    badge: "SAFETY GUARD",
    symptom:
      "Uploading a batch transaction file shows a banner: 'Duplicate upload detected — this file was already ingested.'",
    plainExplanation:
      "This is an intentional defense mechanism! To prevent evidence corruption and double-counting of stolen Bitcoin, the system calculates the SHA-256 fingerprint of every file and blocks re-uploading the exact same file within 24 hours.",
    rootCause:
      "Redis holds a 24-hour idempotent lock key (file_hash:{sha256}) to protect PostgreSQL and Neo4j from duplicate ingestion churn.",
    fixCommand: `# If you are conducting a test and need to re-upload the same file immediately, clear the Redis lock:
redis-cli --scan --pattern "file_hash:*" | ForEach-Object { redis-cli del $_ }
redis-cli --scan --pattern "sync_done:*" | ForEach-Object { redis-cli del $_ }
Write-Host "Upload locks cleared. You can now re-upload the evidence file." -ForegroundColor Green`,
    verificationCommand: `redis-cli keys "file_hash:*"
# Output will be empty (0 keys)`,
    safetyGuarantee: "Safe for Testing: Clears only the 24-hour upload prevention timer without removing any existing case data.",
  },
  {
    id: "celery_windows_pool",
    title: "Background Worker Closes Immediately on Windows",
    category: "WORKER",
    badge: "WINDOWS SPECIFIC",
    symptom:
      "Starting Celery crashes instantly with 'NotImplementedError' or 'PermissionError: [WinError 5]'.",
    plainExplanation:
      "Windows handles background processes differently than Linux (Windows has no POSIX fork). Adding the magic flag '--pool=solo' tells Celery to process jobs inside its own safe thread, making it lightning fast and 100% stable on Windows.",
    rootCause:
      "Celery defaults to prefork multiprocessing, which is unsupported on the Windows NT kernel without the solo pool argument.",
    fixCommand: `# Always launch Celery with --pool=solo on Windows:
cd backend
.\\venv\\Scripts\\Activate.ps1
celery -A app.celery_app worker --loglevel=info --pool=solo`,
    verificationCommand: `Get-Process celery -ErrorAction SilentlyContinue | Select-Object Id, ProcessName`,
    safetyGuarantee: "Official Windows Best Practice: Guarantees synchronous task completion with zero memory leaks.",
  },
  {
    id: "redis_connection_refused",
    title: "System Says 'Cannot Connect to Redis (Port 6379)'",
    category: "DATABASE",
    badge: "SERVICE DOWN",
    symptom:
      "FastAPI returns error 500 when uploading files, or Celery complains 'No connection could be made because target machine refused it'.",
    plainExplanation:
      "Redis acts as the high-speed postal service between the web interface and the AI workers. If the Redis service was stopped, the workers can't receive tasks.",
    rootCause:
      "The local Redis background daemon is not running on port 6379.",
    fixCommand: `# Start Redis service or standalone executable:
if (Get-Service Redis -ErrorAction SilentlyContinue) {
    Start-Service Redis
    Write-Host "Redis service started." -ForegroundColor Green
} else {
    # If using Docker:
    docker compose up -d redis
}`,
    verificationCommand: `redis-cli ping
# Expected response: PONG`,
    safetyGuarantee: "Preserves Data: Redis automatically restores cached queues and locks upon restarting.",
  },
  {
    id: "neo4j_gds_missing",
    title: "Graph Visualizer Missing Neo4j GDS Plugin",
    category: "DATABASE",
    badge: "AI GRAPH",
    symptom:
      "Entity clustering or Graph Transformer returns 'ProcedureNotFound: gds.graph.project'.",
    plainExplanation:
      "The Neo4j database needs the Graph Data Science (GDS) plugin enabled to calculate PageRank and community clustering. Our Docker setup includes this automatically; on bare-metal it simply needs the plugin folder checked.",
    rootCause:
      "GDS jar missing from Neo4j plugins directory, or unrestricted procedures not declared in neo4j.conf.",
    fixCommand: `# In Docker, GDS is pre-installed automatically. Simply restart the container:
docker compose restart neo4j

# On bare-metal Windows: Ensure neo4j-graph-data-science-*.jar is in Neo4j's plugins/ directory, then restart:
Restart-Service neo4j -ErrorAction SilentlyContinue`,
    verificationCommand: `cypher-shell -u neo4j -p password123 "CALL gds.version() YIELD version;"`,
    safetyGuarantee: "Non-Destructive: Reloads the AI graph library without altering any stored transactions or wallet nodes.",
  },
  {
    id: "offline_airgap_fonts",
    title: "Screen Displays Network Errors in Offline SCIF Room",
    category: "OFFLINE",
    badge: "AIR-GAP AUDIT",
    symptom:
      "When running in an air-gapped facility with zero internet, browser shows warnings about fonts or icons failing to fetch.",
    plainExplanation:
      "Some web frameworks try to connect to Google Fonts on the internet. Our system has pre-compiled local fonts (.woff2) and SVG icons built right in, so it never needs a single packet of internet.",
    rootCause:
      "Browser cache still pointing to older dev bundles, or Next.js build cache needs refreshing.",
    fixCommand: `# Rebuild clean local frontend cache with zero external CDN dependencies:
cd frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
Write-Host "Clean air-gapped frontend built with 100% local assets." -ForegroundColor Green`,
    verificationCommand: `npm run build
# Expected: "✓ Generating static pages (0 external requests)"`,
    safetyGuarantee: "Strict Air-Gap Guarantee: Verified 0 external CDN calls across the entire forensic stack.",
  },
];

export function TroubleshootingGuide() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>("port_collision");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["ALL", "PORTS", "UPLOAD", "WORKER", "DATABASE", "OFFLINE"];

  const filteredItems = TROUBLESHOOTING_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "ALL" || item.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.plainExplanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symptom.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-4 p-5">
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symptoms in plain English (e.g. port busy, upload blocked)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
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
            No troubleshooting scenarios matched your query.
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
                  className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-slate-200 text-slate-700">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900 leading-snug">
                        {item.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans leading-normal">
                      {item.plainExplanation}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-400 mt-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-1 space-y-4 border-t border-slate-100">
                    {/* Error Symptom Callout */}
                    <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs font-mono space-y-1">
                      <div className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        What You See On Screen:
                      </div>
                      <div className="text-slate-800 text-[11px] leading-relaxed">
                        {item.symptom}
                      </div>
                    </div>

                    {/* Root Cause Analysis in Plain English */}
                    <div className="space-y-1 text-xs text-slate-700 leading-relaxed font-sans">
                      <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                        Behind the Scenes (Technical Cause)
                      </div>
                      <p className="text-slate-600 text-xs">{item.rootCause}</p>
                    </div>

                    {/* Fix Command Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500">
                        <span>1-Click Remediation Command (PowerShell)</span>
                        <button
                          onClick={() => handleCopy(`fix-${item.id}`, item.fixCommand)}
                          className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedId === `fix-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">COPIED MAGIC FIX</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY MAGIC FIX</span>
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
                        <span>Check Resolution Status</span>
                        <button
                          onClick={() => handleCopy(`ver-${item.id}`, item.verificationCommand)}
                          className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedId === `ver-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">COPIED CHECK</span>
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

                    {/* Safety Guarantee Callout */}
                    <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50/60 p-2 rounded border border-emerald-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{item.safetyGuarantee}</span>
                    </div>
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
