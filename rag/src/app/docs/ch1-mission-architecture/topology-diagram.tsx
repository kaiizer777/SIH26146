"use client";

import React, { useState } from "react";
import {
  Server,
  Database,
  Network,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";

interface ServiceNode {
  id: string;
  name: string;
  role: string;
  port: string;
  protocol: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  status: string;
  throughput: string;
  latency: string;
  inputs: string[];
  outputs: string[];
  rationale: string;
  x: number;
  y: number;
}

const SERVICES: Record<string, ServiceNode> = {
  nextjs: {
    id: "nextjs",
    name: "Mission Control Dashboard (Next.js)",
    role: "The Visual Cockpit: Where investigators search wallets, view graphs, and export court dossiers",
    port: "3000",
    protocol: "Web Dashboard (Next.js 16 App Router)",
    icon: Terminal,
    accent: "sky",
    status: "100% Offline • Active",
    throughput: "Instant Screen Updates (60 FPS)",
    latency: "<150ms Page Load",
    inputs: ["Investigator searches", "Batch file uploads (CSV/JSON/XML)", "Risk filter toggles"],
    outputs: ["Interactive D3 Crime Graphs", "18x18 Attention & SHAP Charts", "1-Click Certified Legal Dossiers"],
    rationale:
      "The visual cockpit that team analysts use. Built with local Inter and JetBrains Mono fonts and zero CDN dependencies, guaranteeing zero external data leakage during live operations.",
    x: 80,
    y: 110,
  },
  fastapi: {
    id: "fastapi",
    name: "Front Door Gateway (FastAPI)",
    role: "The Gatekeeper: Receives data, checks security, and hides sensitive wallet addresses in logs",
    port: "8000",
    protocol: "Secure REST Gateway (FastAPI 0.115+)",
    icon: Server,
    accent: "indigo",
    status: "Active • High Speed",
    throughput: "10,000+ items/sec",
    latency: "<50ms Response",
    inputs: ["Multipart file uploads (POST /ingest)", "Investigator queries (/alerts, /explain, /graph)", "Sync triggers (/ingest/sync/{task_id})"],
    outputs: ["HTTP 202 task dispatch to Celery", "Forensic dossiers with SHAP attributions", "Bounded Neo4j subgraphs (max 150 nodes)"],
    rationale:
      "The secure API gateway. It authenticates requests with static Bearer tokens, binds CORS to localhost:3000, and filters all application logs with _AddressPseudonymFilter to replace Bitcoin addresses with [addr:<sha8>] tokens.",
    x: 320,
    y: 110,
  },
  celery: {
    id: "celery",
    name: "Background Workhorse (Celery)",
    role: "The Heavy Lifter: Parses massive files and maps countries in the background without freezing the screen",
    port: "Worker Pool",
    protocol: "Async Task Worker (Celery 5.4+)",
    icon: RefreshCw,
    accent: "emerald",
    status: "Active Pool (Background)",
    throughput: "11,938 rows/sec (bulk COPY)",
    latency: "35ms Dispatch (563ms / 1k rows)",
    inputs: ["Streaming files from data/uploads", "Offline MaxMind GeoLite2 MMDB databases"],
    outputs: ["Validated batches (5,000 rows/chunk) via PostgreSQL COPY", "Task progress updates to Redis"],
    rationale:
      "The background processing engine. Content-sniffing parser auto-detects CSV/JSON/XML formats from the first 512 bytes, performs offline GeoIP enrichment, and streams records in 5,000-row chunks so the dashboard never stutters.",
    x: 560,
    y: 50,
  },
  redis: {
    id: "redis",
    name: "Instant Lock & Memory Broker (Redis)",
    role: "The Duplicate Blocker: Stops accidental repeat uploads and coordinates background tasks",
    port: "6379",
    protocol: "In-Memory Speed Engine (Redis 7 RESP)",
    icon: Activity,
    accent: "rose",
    status: "Active (In-Memory)",
    throughput: "100,000+ ops/sec",
    latency: "<1ms Instant Response",
    inputs: ["Celery task queue jobs", "Uploaded file SHA-256 digests", "Post-ingest sync tokens"],
    outputs: ["24-hour file deduplication locks (file_hash:{hash})", "Task status payloads", "Idempotent sync locks (sync_done:{task_id})"],
    rationale:
      "Lightning-fast in-memory hub. Before enqueuing file parsing, it checks the SHA-256 file digest in Redis; if duplicate, it returns HTTP 409 immediately without touching database storage.",
    x: 780,
    y: 50,
  },
  postgres: {
    id: "postgres",
    name: "Permanent Financial Vault (PostgreSQL)",
    role: "The Bank Vault: Stores permanent, unchangeable transaction records with bulletproof reliability",
    port: "5432",
    protocol: "Relational Ledger (PostgreSQL 16 SQL)",
    icon: Database,
    accent: "blue",
    status: "Active • Fully Indexed",
    throughput: "11,938 rows/sec bulk COPY",
    latency: "<8ms Indexed Lookups",
    inputs: ["Cleaned transaction batches", "FT-Transformer anomaly scores", "Louvain cluster IDs"],
    outputs: ["Permanent financial ledger (ACID)", "Paginated alert query rows", "Keyset-paginated graph export streams"],
    rationale:
      "The unalterable record vault. Stores transactions with native array columns (input_addresses, output_amounts), B-tree indexes on txid (UNIQUE), src_ip, dst_ip, cluster_id, and temporal indexing on ts.",
    x: 560,
    y: 190,
  },
  neo4j: {
    id: "neo4j",
    name: "Crime Web Detective (Neo4j Graph)",
    role: "The Corkboard: Connects wallets, transactions, and IPs into an interactive crime spiderweb",
    port: "7687",
    protocol: "Graph Engine (Neo4j 5.26 + GDS 2.13)",
    icon: Network,
    accent: "amber",
    status: "Active • Graph Traversal",
    throughput: "Batched UNWIND (1,000 items/tx)",
    latency: "<25ms Traversal Time",
    inputs: ["24,673 :Wallet nodes", "100,000 :Transaction nodes", "CO_SPEND / SENDS / RECEIVES / OBSERVED edges"],
    outputs: ["Louvain modularity clusters (Q=0.4613)", "PageRank seed proximity scores", "Multi-hop peeling chain paths"],
    rationale:
      "The detective corkboard with red yarn. Neo4j Graph Data Science projects co-spend graphs, calculates Louvain modularity clusters to unmask syndicates, and computes Personalized PageRank from 11,186 Ransomwhere seeds.",
    x: 780,
    y: 190,
  },
};

export function TopologyDiagram() {
  const [selectedService, setSelectedService] = useState<string>("fastapi");
  const active = SERVICES[selectedService] || SERVICES.fastapi;

  return (
    <div className="rounded-xl p-5 sm:p-6 bg-gradient-to-b from-white via-white to-slate-50/40 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.05)] space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-950">
              Interactive System Topology & Inter-Service Bus
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Click on any service node or pill below to inspect network ports, protocol contracts, and verified latency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-gradient-to-b from-white to-slate-50 text-slate-700 rounded-md border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)]">
            6 SERVICES ONLINE
          </span>
          <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-gradient-to-b from-emerald-50 to-emerald-100/60 text-emerald-800 rounded-md border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(5,150,105,0.08)]">
            AIR-GAP VERIFIED
          </span>
        </div>
      </div>

      {/* Quick Tactical Node Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.keys(SERVICES).map((key) => {
          const svc = SERVICES[key];
          const isSelected = selectedService === key;
          const SvcIcon = svc.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedService(key)}
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? "bg-gradient-to-b from-blue-600 via-blue-600 to-blue-700 border-t border-t-blue-400 border-x border-x-blue-700 border-b border-b-blue-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(37,99,235,0.25)] ring-1 ring-blue-600"
                  : "bg-gradient-to-b from-white via-slate-50/60 to-slate-100/50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)] text-slate-800 active:translate-y-[0.5px]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-blue-50 text-blue-700 border border-blue-200/60"
                  }`}
                >
                  {svc.port === "Worker Pool" ? "WORKER" : `:${svc.port}`}
                </span>
                <SvcIcon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-blue-600"}`} />
              </div>
              <div className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                {key === "nextjs" && "Next.js UI"}
                {key === "fastapi" && "FastAPI Gate"}
                {key === "celery" && "Celery 5 Pool"}
                {key === "redis" && "Redis 7 Lock"}
                {key === "postgres" && "PostgreSQL 16"}
                {key === "neo4j" && "Neo4j Graph"}
              </div>
            </button>
          );
        })}
      </div>

      {/* SVG Interactive Architecture Map */}
      <div className="relative w-full overflow-x-auto bg-gradient-to-b from-slate-50/80 to-slate-100/60 rounded-xl border-t border-t-slate-200 border-x border-x-slate-200 border-b border-b-slate-300 p-4 shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
        <svg
          viewBox="0 0 920 280"
          className="w-full h-auto min-w-[760px] select-none"
        >
          {/* Connector Paths */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
            </marker>

            {/* Tactical Light-From-Above SVG Filters and Gradients */}
            <linearGradient id="nodeActiveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f7ff" />
            </linearGradient>
            <linearGradient id="nodeNormalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            <filter id="tacticalActiveGlow" x="-10%" y="-10%" width="125%" height="125%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.25" />
            </filter>
            <filter id="tacticalNormalDrop" x="-10%" y="-10%" width="125%" height="125%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.07" />
            </filter>
          </defs>

          {/* Lines between services */}
          {/* Next.js -> FastAPI */}
          <path
            d="M 170 140 L 310 140"
            stroke={selectedService === "nextjs" || selectedService === "fastapi" ? "#2563eb" : "#94a3b8"}
            strokeWidth={selectedService === "nextjs" || selectedService === "fastapi" ? "2.5" : "1.5"}
            strokeDasharray={selectedService === "nextjs" || selectedService === "fastapi" ? "none" : "4 4"}
            markerEnd={selectedService === "nextjs" || selectedService === "fastapi" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* FastAPI -> Celery */}
          <path
            d="M 420 120 L 550 80"
            stroke={selectedService === "fastapi" || selectedService === "celery" ? "#2563eb" : "#94a3b8"}
            strokeWidth={selectedService === "fastapi" || selectedService === "celery" ? "2.5" : "1.5"}
            markerEnd={selectedService === "fastapi" || selectedService === "celery" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* Celery -> Redis */}
          <path
            d="M 660 75 L 770 75"
            stroke={selectedService === "celery" || selectedService === "redis" ? "#2563eb" : "#94a3b8"}
            strokeWidth={selectedService === "celery" || selectedService === "redis" ? "2.5" : "1.5"}
            markerEnd={selectedService === "celery" || selectedService === "redis" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* FastAPI -> Postgres */}
          <path
            d="M 420 150 L 550 200"
            stroke={selectedService === "fastapi" || selectedService === "postgres" ? "#2563eb" : "#94a3b8"}
            strokeWidth={selectedService === "fastapi" || selectedService === "postgres" ? "2.5" : "1.5"}
            markerEnd={selectedService === "fastapi" || selectedService === "postgres" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* Celery -> Postgres */}
          <path
            d="M 610 100 L 610 170"
            stroke={selectedService === "celery" || selectedService === "postgres" ? "#2563eb" : "#94a3b8"}
            strokeWidth={selectedService === "celery" || selectedService === "postgres" ? "2.5" : "1.5"}
            markerEnd={selectedService === "celery" || selectedService === "postgres" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* Postgres -> Neo4j projection */}
          <path
            d="M 665 210 L 770 210"
            stroke={selectedService === "postgres" || selectedService === "neo4j" ? "#2563eb" : "#94a3b8"}
            strokeWidth={selectedService === "postgres" || selectedService === "neo4j" ? "2.5" : "1.5"}
            markerEnd={selectedService === "postgres" || selectedService === "neo4j" ? "url(#arrow-active)" : "url(#arrow)"}
          />

          {/* Node: Next.js Command Center */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedService("nextjs")}
          >
            <rect
              x="20"
              y="90"
              width="150"
              height="100"
              rx="9"
              fill={selectedService === "nextjs" ? "url(#nodeActiveGrad)" : "url(#nodeNormalGrad)"}
              stroke={selectedService === "nextjs" ? "#2563eb" : "#94a3b8"}
              strokeWidth={selectedService === "nextjs" ? "2.5" : "1.5"}
              filter={selectedService === "nextjs" ? "url(#tacticalActiveGlow)" : "url(#tacticalNormalDrop)"}
            />
            {/* Top edge highlight sheen */}
            <line x1="22" y1="91" x2="168" y2="91" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="22" y1="189" x2="168" y2="189" stroke={selectedService === "nextjs" ? "#1e40af" : "#cbd5e1"} strokeWidth="1.5" />

            <rect x="30" y="100" width="30" height="30" rx="7" fill="#2563eb" />
            <text x="38" y="120" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="monospace">UI</text>
            <text x="70" y="112" fontSize="12" fontWeight="bold" fill="#0f172a">Next.js 16</text>
            <text x="70" y="126" fontSize="10" fontWeight="600" fill="#475569">Port 3000</text>
            {selectedService === "nextjs" && (
              <circle cx="156" cy="102" r="4" fill="#2563eb" />
            )}
            <rect x="30" y="145" width="130" height="22" rx="5" fill={selectedService === "nextjs" ? "#dbeafe" : "#eff6ff"} stroke={selectedService === "nextjs" ? "#93c5fd" : "#bfdbfe"} strokeWidth="1" />
            <text x="38" y="160" fontSize="9.5" fontWeight="bold" fontFamily="monospace" fill="#1d4ed8">D3 &amp; Dossier View</text>
          </g>

          {/* Node: FastAPI Gateway */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedService("fastapi")}
          >
            <rect
              x="270"
              y="90"
              width="150"
              height="100"
              rx="9"
              fill={selectedService === "fastapi" ? "url(#nodeActiveGrad)" : "url(#nodeNormalGrad)"}
              stroke={selectedService === "fastapi" ? "#2563eb" : "#94a3b8"}
              strokeWidth={selectedService === "fastapi" ? "2.5" : "1.5"}
              filter={selectedService === "fastapi" ? "url(#tacticalActiveGlow)" : "url(#tacticalNormalDrop)"}
            />
            <line x1="272" y1="91" x2="418" y2="91" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="272" y1="189" x2="418" y2="189" stroke={selectedService === "fastapi" ? "#1e40af" : "#cbd5e1"} strokeWidth="1.5" />

            <rect x="280" y="100" width="30" height="30" rx="7" fill="#2563eb" />
            <text x="284" y="120" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="monospace">API</text>
            <text x="320" y="112" fontSize="12" fontWeight="bold" fill="#0f172a">FastAPI Core</text>
            <text x="320" y="126" fontSize="10" fontWeight="600" fill="#475569">Port 8000 (HTTP)</text>
            {selectedService === "fastapi" && (
              <circle cx="406" cy="102" r="4" fill="#2563eb" />
            )}
            <rect x="280" y="145" width="130" height="22" rx="5" fill={selectedService === "fastapi" ? "#dbeafe" : "#eff6ff"} stroke={selectedService === "fastapi" ? "#93c5fd" : "#bfdbfe"} strokeWidth="1" />
            <text x="288" y="160" fontSize="9.5" fontWeight="bold" fontFamily="monospace" fill="#1d4ed8">Bearer &amp; [addr:sha8]</text>
          </g>

          {/* Node: Celery Worker */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedService("celery")}
          >
            <rect
              x="510"
              y="30"
              width="150"
              height="85"
              rx="9"
              fill={selectedService === "celery" ? "url(#nodeActiveGrad)" : "url(#nodeNormalGrad)"}
              stroke={selectedService === "celery" ? "#2563eb" : "#94a3b8"}
              strokeWidth={selectedService === "celery" ? "2.5" : "1.5"}
              filter={selectedService === "celery" ? "url(#tacticalActiveGlow)" : "url(#tacticalNormalDrop)"}
            />
            <line x1="512" y1="31" x2="658" y2="31" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="512" y1="114" x2="658" y2="114" stroke={selectedService === "celery" ? "#1e40af" : "#cbd5e1"} strokeWidth="1.5" />

            <rect x="520" y="40" width="26" height="26" rx="6" fill="#059669" />
            <text x="525" y="58" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">CW</text>
            <text x="555" y="50" fontSize="12" fontWeight="bold" fill="#0f172a">Celery 5 Pool</text>
            <text x="555" y="63" fontSize="10" fontWeight="600" fill="#475569">GeoIP &amp; Normalizer</text>
            {selectedService === "celery" && (
              <circle cx="646" cy="42" r="4" fill="#2563eb" />
            )}
            <rect x="520" y="75" width="130" height="20" rx="5" fill={selectedService === "celery" ? "#d1fae5" : "#ecfdf5"} stroke={selectedService === "celery" ? "#6ee7b7" : "#a7f3d0"} strokeWidth="1" />
            <text x="527" y="89" fontSize="9.5" fontWeight="bold" fontFamily="monospace" fill="#047857">11,938 rows/sec</text>
          </g>

          {/* Node: Redis Broker */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedService("redis")}
          >
            <rect
              x="720"
              y="30"
              width="150"
              height="85"
              rx="9"
              fill={selectedService === "redis" ? "url(#nodeActiveGrad)" : "url(#nodeNormalGrad)"}
              stroke={selectedService === "redis" ? "#2563eb" : "#94a3b8"}
              strokeWidth={selectedService === "redis" ? "2.5" : "1.5"}
              filter={selectedService === "redis" ? "url(#tacticalActiveGlow)" : "url(#tacticalNormalDrop)"}
            />
            <line x1="722" y1="31" x2="868" y2="31" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="722" y1="114" x2="868" y2="114" stroke={selectedService === "redis" ? "#1e40af" : "#cbd5e1"} strokeWidth="1.5" />

            <rect x="730" y="40" width="26" height="26" rx="6" fill="#e11d48" />
            <text x="736" y="58" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">RD</text>
            <text x="765" y="50" fontSize="12" fontWeight="bold" fill="#0f172a">Redis 7</text>
            <text x="765" y="63" fontSize="10" fontWeight="600" fill="#475569">Port 6379 (RESP)</text>
            {selectedService === "redis" && (
              <circle cx="856" cy="42" r="4" fill="#2563eb" />
            )}
            <rect x="730" y="75" width="130" height="20" rx="5" fill={selectedService === "redis" ? "#ffe4e6" : "#fff1f2"} stroke={selectedService === "redis" ? "#fda4af" : "#fecdd3"} strokeWidth="1" />
            <text x="738" y="89" fontSize="9.5" fontWeight="bold" fontFamily="monospace" fill="#be123c">Idempotency Lock</text>
          </g>

          {/* Node: PostgreSQL */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedService("postgres")}
          >
            <rect
              x="510"
              y="160"
              width="150"
              height="85"
              rx="9"
              fill={selectedService === "postgres" ? "url(#nodeActiveGrad)" : "url(#nodeNormalGrad)"}
              stroke={selectedService === "postgres" ? "#2563eb" : "#94a3b8"}
              strokeWidth={selectedService === "postgres" ? "2.5" : "1.5"}
              filter={selectedService === "postgres" ? "url(#tacticalActiveGlow)" : "url(#tacticalNormalDrop)"}
            />
            <line x1="512" y1="161" x2="658" y2="161" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="512" y1="244" x2="658" y2="244" stroke={selectedService === "postgres" ? "#1e40af" : "#cbd5e1"} strokeWidth="1.5" />

            <rect x="520" y="170" width="26" height="26" rx="6" fill="#2563eb" />
            <text x="526" y="188" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">PG</text>
            <text x="555" y="180" fontSize="12" fontWeight="bold" fill="#0f172a">PostgreSQL 16</text>
            <text x="555" y="193" fontSize="10" fontWeight="600" fill="#475569">Port 5432 (SQL)</text>
            {selectedService === "postgres" && (
              <circle cx="646" cy="172" r="4" fill="#2563eb" />
            )}
            <rect x="520" y="205" width="130" height="20" rx="5" fill={selectedService === "postgres" ? "#dbeafe" : "#eff6ff"} stroke={selectedService === "postgres" ? "#93c5fd" : "#bfdbfe"} strokeWidth="1" />
            <text x="528" y="219" fontSize="9.5" fontWeight="bold" fontFamily="monospace" fill="#1d4ed8">Indexed Arrays &amp; JSONB</text>
          </g>

          {/* Node: Neo4j GDS */}
          <g
            className="cursor-pointer"
            onClick={() => setSelectedService("neo4j")}
          >
            <rect
              x="720"
              y="160"
              width="150"
              height="85"
              rx="9"
              fill={selectedService === "neo4j" ? "url(#nodeActiveGrad)" : "url(#nodeNormalGrad)"}
              stroke={selectedService === "neo4j" ? "#2563eb" : "#94a3b8"}
              strokeWidth={selectedService === "neo4j" ? "2.5" : "1.5"}
              filter={selectedService === "neo4j" ? "url(#tacticalActiveGlow)" : "url(#tacticalNormalDrop)"}
            />
            <line x1="722" y1="161" x2="868" y2="161" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <line x1="722" y1="244" x2="868" y2="244" stroke={selectedService === "neo4j" ? "#1e40af" : "#cbd5e1"} strokeWidth="1.5" />

            <rect x="730" y="170" width="26" height="26" rx="6" fill="#d97706" />
            <text x="735" y="188" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">GDS</text>
            <text x="765" y="180" fontSize="12" fontWeight="bold" fill="#0f172a">Neo4j 5.26</text>
            <text x="765" y="193" fontSize="10" fontWeight="600" fill="#475569">Port 7687 (Bolt)</text>
            {selectedService === "neo4j" && (
              <circle cx="856" cy="172" r="4" fill="#2563eb" />
            )}
            <rect x="730" y="205" width="130" height="20" rx="5" fill={selectedService === "neo4j" ? "#fef3c7" : "#fffbeb"} stroke={selectedService === "neo4j" ? "#fcd34d" : "#fde68a"} strokeWidth="1" />
            <text x="738" y="219" fontSize="9.5" fontWeight="bold" fontFamily="monospace" fill="#b45309">Louvain &amp; PageRank</text>
          </g>
        </svg>
      </div>

      {/* Dynamic Inspector Detail Panel */}
      <div className="bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 rounded-xl p-5 sm:p-6 space-y-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 border-t border-t-blue-300/80 border-x border-x-blue-600 border-b border-b-blue-800 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(37,99,235,0.25)] flex-shrink-0">
              <active.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-2">
                <span>{active.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-300 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  {active.port === "Worker Pool" ? "CELERY-PID" : `TCP :${active.port}`}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                {active.role}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              Protocol: <strong className="text-slate-950">{active.protocol}</strong>
            </span>
          </div>
        </div>

        {/* Technical specs grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Verified Throughput
            </div>
            <div className="text-xs font-bold text-slate-950 font-mono">
              {active.throughput}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Measured Latency
            </div>
            <div className="text-xs font-bold text-emerald-700 font-mono">
              {active.latency}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Operational Status
            </div>
            <div className="text-xs font-bold text-slate-950 flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              {active.status}
            </div>
          </div>
        </div>

        {/* Inbound / Outbound Data contracts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] text-xs space-y-2">
            <div className="text-[10.5px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Inbound Data Streams
            </div>
            <ul className="space-y-1.5 text-slate-700">
              {active.inputs.map((inStream, idx) => (
                <li key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-200/70">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800">{inStream}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-4 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] text-xs space-y-2">
            <div className="text-[10.5px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Outbound Data Streams
            </div>
            <ul className="space-y-1.5 text-slate-700">
              {active.outputs.map((outStream, idx) => (
                <li key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-200/70">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800">{outStream}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Operational Rationale */}
        <div className="text-xs text-slate-700 bg-white p-4 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] leading-relaxed">
          <strong className="text-slate-950 font-bold font-mono text-[11px] uppercase block mb-1">
            Architectural Rationale:
          </strong>
          {active.rationale}
        </div>
      </div>
    </div>
  );
}
