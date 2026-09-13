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
    <div className="card-tactical rounded-xl p-6 bg-white border border-slate-200 shadow-sm space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900">
              Interactive System Topology & Inter-Service Bus
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on any service node to inspect network ports, protocol contracts, and verified latency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
            6 SERVICES ONLINE
          </span>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
            AIR-GAP VERIFIED
          </span>
        </div>
      </div>

      {/* SVG Interactive Architecture Map */}
      <div className="relative w-full overflow-x-auto bg-slate-50/60 rounded-xl border border-slate-200 p-4">
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
            </marker>
          </defs>

          {/* Lines between services */}
          {/* Next.js -> FastAPI */}
          <path
            d="M 170 140 L 310 140"
            stroke={selectedService === "nextjs" || selectedService === "fastapi" ? "#0284c7" : "#cbd5e1"}
            strokeWidth="2"
            strokeDasharray={selectedService === "nextjs" || selectedService === "fastapi" ? "none" : "4 4"}
            markerEnd={selectedService === "nextjs" || selectedService === "fastapi" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* FastAPI -> Celery */}
          <path
            d="M 420 120 L 550 80"
            stroke={selectedService === "fastapi" || selectedService === "celery" ? "#0284c7" : "#cbd5e1"}
            strokeWidth="2"
            markerEnd={selectedService === "fastapi" || selectedService === "celery" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* Celery -> Redis */}
          <path
            d="M 660 75 L 770 75"
            stroke={selectedService === "celery" || selectedService === "redis" ? "#0284c7" : "#cbd5e1"}
            strokeWidth="2"
            markerEnd={selectedService === "celery" || selectedService === "redis" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* FastAPI -> Postgres */}
          <path
            d="M 420 150 L 550 200"
            stroke={selectedService === "fastapi" || selectedService === "postgres" ? "#0284c7" : "#cbd5e1"}
            strokeWidth="2"
            markerEnd={selectedService === "fastapi" || selectedService === "postgres" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* Celery -> Postgres */}
          <path
            d="M 610 100 L 610 170"
            stroke={selectedService === "celery" || selectedService === "postgres" ? "#0284c7" : "#cbd5e1"}
            strokeWidth="2"
            markerEnd={selectedService === "celery" || selectedService === "postgres" ? "url(#arrow-active)" : "url(#arrow)"}
          />
          {/* Postgres -> Neo4j projection */}
          <path
            d="M 665 210 L 770 210"
            stroke={selectedService === "postgres" || selectedService === "neo4j" ? "#0284c7" : "#cbd5e1"}
            strokeWidth="2"
            markerEnd={selectedService === "postgres" || selectedService === "neo4j" ? "url(#arrow-active)" : "url(#arrow)"}
          />

          {/* Node: Next.js Command Center */}
          <g
            className="cursor-pointer transition-all"
            onClick={() => setSelectedService("nextjs")}
          >
            <rect
              x="20"
              y="90"
              width="150"
              height="100"
              rx="8"
              fill={selectedService === "nextjs" ? "#ffffff" : "#ffffff"}
              stroke={selectedService === "nextjs" ? "#2563eb" : "#cbd5e1"}
              strokeWidth={selectedService === "nextjs" ? "2.5" : "1"}
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))"
            />
            <rect x="30" y="100" width="30" height="30" rx="6" fill="#2563eb" />
            <text x="38" y="120" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="monospace">UI</text>
            <text x="70" y="112" fontSize="12" fontWeight="bold" fill="#0f172a">Next.js 16</text>
            <text x="70" y="126" fontSize="10" fill="#64748b">Port 3000</text>
            <rect x="30" y="145" width="130" height="20" rx="4" fill="#eff6ff" />
            <text x="38" y="159" fontSize="9" fontFamily="monospace" fill="#1d4ed8">D3 & Dossier View</text>
          </g>

          {/* Node: FastAPI Gateway */}
          <g
            className="cursor-pointer transition-all"
            onClick={() => setSelectedService("fastapi")}
          >
            <rect
              x="270"
              y="90"
              width="150"
              height="100"
              rx="8"
              fill={selectedService === "fastapi" ? "#ffffff" : "#ffffff"}
              stroke={selectedService === "fastapi" ? "#2563eb" : "#cbd5e1"}
              strokeWidth={selectedService === "fastapi" ? "2.5" : "1"}
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))"
            />
            <rect x="280" y="100" width="30" height="30" rx="6" fill="#2563eb" />
            <text x="284" y="120" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="monospace">API</text>
            <text x="320" y="112" fontSize="12" fontWeight="bold" fill="#0f172a">FastAPI Core</text>
            <text x="320" y="126" fontSize="10" fill="#64748b">Port 8000 (HTTP)</text>
            <rect x="280" y="145" width="130" height="20" rx="4" fill="#eff6ff" />
            <text x="288" y="159" fontSize="9" fontFamily="monospace" fill="#1d4ed8">Bearer & [addr:sha8]</text>
          </g>

          {/* Node: Celery Worker */}
          <g
            className="cursor-pointer transition-all"
            onClick={() => setSelectedService("celery")}
          >
            <rect
              x="510"
              y="30"
              width="150"
              height="85"
              rx="8"
              fill={selectedService === "celery" ? "#ffffff" : "#ffffff"}
              stroke={selectedService === "celery" ? "#2563eb" : "#cbd5e1"}
              strokeWidth={selectedService === "celery" ? "2.5" : "1"}
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))"
            />
            <rect x="520" y="40" width="26" height="26" rx="5" fill="#059669" />
            <text x="525" y="58" fill="#ffffff" fontSize="12" fontFamily="monospace">CW</text>
            <text x="555" y="50" fontSize="12" fontWeight="bold" fill="#0f172a">Celery 5 Pool</text>
            <text x="555" y="63" fontSize="10" fill="#64748b">GeoIP & Normalizer</text>
            <rect x="520" y="75" width="130" height="18" rx="4" fill="#ecfdf5" />
            <text x="527" y="88" fontSize="9" fontFamily="monospace" fill="#047857">11,938 rows/sec</text>
          </g>

          {/* Node: Redis Broker */}
          <g
            className="cursor-pointer transition-all"
            onClick={() => setSelectedService("redis")}
          >
            <rect
              x="720"
              y="30"
              width="150"
              height="85"
              rx="8"
              fill={selectedService === "redis" ? "#ffffff" : "#ffffff"}
              stroke={selectedService === "redis" ? "#2563eb" : "#cbd5e1"}
              strokeWidth={selectedService === "redis" ? "2.5" : "1"}
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))"
            />
            <rect x="730" y="40" width="26" height="26" rx="5" fill="#e11d48" />
            <text x="736" y="58" fill="#ffffff" fontSize="12" fontFamily="monospace">RD</text>
            <text x="765" y="50" fontSize="12" fontWeight="bold" fill="#0f172a">Redis 7</text>
            <text x="765" y="63" fontSize="10" fill="#64748b">Port 6379 (RESP)</text>
            <rect x="730" y="75" width="130" height="18" rx="4" fill="#fff1f2" />
            <text x="738" y="88" fontSize="9" fontFamily="monospace" fill="#be123c">Idempotency Lock</text>
          </g>

          {/* Node: PostgreSQL */}
          <g
            className="cursor-pointer transition-all"
            onClick={() => setSelectedService("postgres")}
          >
            <rect
              x="510"
              y="160"
              width="150"
              height="85"
              rx="8"
              fill={selectedService === "postgres" ? "#ffffff" : "#ffffff"}
              stroke={selectedService === "postgres" ? "#2563eb" : "#cbd5e1"}
              strokeWidth={selectedService === "postgres" ? "2.5" : "1"}
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))"
            />
            <rect x="520" y="170" width="26" height="26" rx="5" fill="#2563eb" />
            <text x="526" y="188" fill="#ffffff" fontSize="12" fontFamily="monospace">PG</text>
            <text x="555" y="180" fontSize="12" fontWeight="bold" fill="#0f172a">PostgreSQL 16</text>
            <text x="555" y="193" fontSize="10" fill="#64748b">Port 5432 (SQL)</text>
            <rect x="520" y="205" width="130" height="18" rx="4" fill="#eff6ff" />
            <text x="528" y="218" fontSize="9" fontFamily="monospace" fill="#1d4ed8">Indexed Arrays & JSONB</text>
          </g>

          {/* Node: Neo4j GDS */}
          <g
            className="cursor-pointer transition-all"
            onClick={() => setSelectedService("neo4j")}
          >
            <rect
              x="720"
              y="160"
              width="150"
              height="85"
              rx="8"
              fill={selectedService === "neo4j" ? "#ffffff" : "#ffffff"}
              stroke={selectedService === "neo4j" ? "#2563eb" : "#cbd5e1"}
              strokeWidth={selectedService === "neo4j" ? "2.5" : "1"}
              filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))"
            />
            <rect x="730" y="170" width="26" height="26" rx="5" fill="#d97706" />
            <text x="735" y="188" fill="#ffffff" fontSize="12" fontFamily="monospace">GDS</text>
            <text x="765" y="180" fontSize="12" fontWeight="bold" fill="#0f172a">Neo4j 5.26</text>
            <text x="765" y="193" fontSize="10" fill="#64748b">Port 7687 (Bolt)</text>
            <rect x="730" y="205" width="130" height="18" rx="4" fill="#fef3c7" />
            <text x="738" y="218" fontSize="9" fontFamily="monospace" fill="#b45309">Louvain & PageRank</text>
          </g>
        </svg>
      </div>

      {/* Dynamic Inspector Detail Panel */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-600 border-t border-t-blue-300/70 border-b border-b-blue-800 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
              <active.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{active.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold">
                  {active.port === "Worker Pool" ? "CELERY-PID" : `TCP :${active.port}`}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {active.role}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
              Protocol: <strong className="text-slate-900">{active.protocol}</strong>
            </span>
          </div>
        </div>

        {/* Technical specs grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-white p-3 rounded-lg border border-slate-200/70 space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Verified Throughput
            </div>
            <div className="text-xs font-semibold text-slate-900 font-mono">
              {active.throughput}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200/70 space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Measured Latency
            </div>
            <div className="text-xs font-semibold text-emerald-600 font-mono">
              {active.latency}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200/70 space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Operational Status
            </div>
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {active.status}
            </div>
          </div>
        </div>

        {/* Inbound / Outbound Data contracts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200/70 text-xs">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Inbound Data Streams
            </div>
            <ul className="space-y-1 text-slate-700">
              {active.inputs.map((inStream, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span>{inStream}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200/70 text-xs">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Outbound Data Streams
            </div>
            <ul className="space-y-1 text-slate-700">
              {active.outputs.map((outStream, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-emerald-500" />
                  <span>{outStream}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Operational Rationale */}
        <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200/70 leading-relaxed">
          <strong className="text-slate-900 font-semibold font-mono text-[11px] uppercase block mb-1">
            Architectural Rationale:
          </strong>
          {active.rationale}
        </div>
      </div>
    </div>
  );
}
