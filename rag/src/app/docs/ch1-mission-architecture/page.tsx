import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Server,
  Network,
  Cpu,
  RefreshCw,
  Terminal,
  Database,
  Lock,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Layers,
  Sparkles,
  AlertTriangle,
  GitFork,
  Binary,
  Compass,
  Zap,
  ShieldCheck,
  Search,
  EyeOff,
  Activity,
} from "lucide-react";
import { TopologyDiagram } from "./topology-diagram";
import { FaqAccordion } from "./faq-accordion";
import { PipelineStepper } from "./pipeline-stepper";

export const metadata = {
  title: "Chapter 1: The NTRO Mission, Tech Stack & System Topology — NTRO KB",
  description:
    "Foundational technical specification of the sovereign air-gapped Bitcoin forensic intelligence pipeline for NTRO.",
};

export default function Chapter1Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Problem Statement & Sovereign Intelligence Mandate */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Problem Statement & Sovereign Mandate
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              National cyber-surveillance, Bitcoin money-laundering evasion, and offline air-gap enforcement
            </p>
          </div>
        </div>

        {/* 3 Executive Threat Pillars (Low Text, High Clarity) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Pillar 1 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
                Threat Vector
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Ransomware & Illicit Capital Flight
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Criminal syndicates exploit Bitcoin’s pseudonymity to extort institutions and funnel ransom proceeds across national borders without bank oversight.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                Evasion Technique
              </span>
              <GitFork className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Peeling Chains & CoinJoin Tumblers
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated scripts split funds into dozens of micro-transfers (peeling) or mix with innocent wallets (CoinJoin) to break linear tracking and confuse investigators.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                Enclave Constraint
              </span>
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              100% Air-Gapped Sovereign Isolation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              National security rules strictly prohibit public cloud APIs, external DNS queries, or font CDNs. All ML inference, GeoIP lookups, and graphs must run offline.
            </p>
          </div>
        </div>

        {/* High-Impact Ground Truth Corpus KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Confirmed Illicit Flow
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              $1,018,573,922
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              115,116.91 BTC tracked
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Ransomware Seeds
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              11,186 Wallets
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              Verified Ransomwhere anchors
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Malware Families
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              136 Strains
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              LockBit, Conti, REvil, WannaCry
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Sovereign Status
            </div>
            <div className="text-lg font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Air-Gapped
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              0 runtime external calls
            </div>
          </div>
        </div>

        {/* Security & OPSEC Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="card-tactical rounded-lg p-3.5 bg-slate-50/50 border border-slate-200/80 flex items-start space-x-3">
            <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Zero-Leakage Air-Gap:</strong> Webfonts are pre-cached locally as <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">.woff2</code>. MaxMind GeoIP City & ASN databases are packaged locally as binary <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">.mmdb</code> files without external DNS lookups.
            </div>
          </div>

          <div className="card-tactical rounded-lg p-3.5 bg-slate-50/50 border border-slate-200/80 flex items-start space-x-3">
            <EyeOff className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900">AddressHashMiddleware OPSEC:</strong> All Base58 and Bech32 Bitcoin addresses emitted to stdout, stderr, or log streams are intercepted and hashed into SHA-256 tokens (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[11px]">[ADDR_HASH:9f86d081884c]</code>).
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: The 5-Tier Forensic Prototype Pipeline */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The 5-Tier Forensic Prototype Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Step-by-step interactive walkthrough: from multi-format bulk ingest to court-admissible legal dossier
            </p>
          </div>
        </div>

        {/* Interactive 5-Stage Stepper Component */}
        <PipelineStepper />

        {/* Visual Benchmark Comparison Strip */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Prototype Performance vs Traditional Manual Investigation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
              <div className="text-slate-500 text-[10.5px] font-mono">Ingest Throughput</div>
              <div className="text-slate-900 font-bold text-sm">11,938 Rows/Sec</div>
              <p className="text-slate-600 text-[11px]">Multipart CSV, JSON, XML normalized asynchronously via Celery & Redis.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
              <div className="text-slate-500 text-[10.5px] font-mono">Pattern Detection Rate</div>
              <div className="text-slate-900 font-bold text-sm">97.2% Peeling • 100% Mixers</div>
              <p className="text-slate-600 text-[11px]">Parameterized Cypher traverses multi-hop peeling paths and CoinJoin pools.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
              <div className="text-slate-500 text-[10.5px] font-mono">Deep Learning Latency</div>
              <div className="text-slate-900 font-bold text-sm">25.4ms on Standard CPU</div>
              <p className="text-slate-600 text-[11px]">PyTorch Autoencoder + GraphSAGE GNN running without GPU/CUDA dependencies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Strictly Pinned Tech Stack & Operational Rationale */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Core Technology Stack & Architecture
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Hermetically sealed dependencies pinned for long-term air-gapped reproducibility
            </p>
          </div>
        </div>

        {/* 6 Executive Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: FastAPI */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>FastAPI 0.115</span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-semibold">
                Python 3.11
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-throughput async REST gateway handling Pydantic v2 data validation, connection pool teardowns, and real-time log address redactor middleware.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Port: TCP 8000</span>
              <span className="font-semibold text-slate-800">&lt;50ms Latency</span>
            </div>
          </div>

          {/* Card 2: Celery + Redis */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>Celery 5.4 + Redis 7</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                Async Queue
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Decouples CPU-heavy multipart uploads and local MaxMind MMDB GeoIP lookups. Redis atomic <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">SETNX</code> locks prevent duplicate file execution.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Port: TCP 6379</span>
              <span className="font-semibold text-slate-800">11.9k rows/sec</span>
            </div>
          </div>

          {/* Card 3: PostgreSQL */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Database className="w-4 h-4 text-blue-600" />
                <span>PostgreSQL 16</span>
              </div>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                ACID Ledger
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides immutable ledger durability for raw transactions. Native SQL array columns eliminate slow join tables during high-volume bulk COPY ingest.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Port: TCP 5432</span>
              <span className="font-semibold text-slate-800">B-Tree Indices</span>
            </div>
          </div>

          {/* Card 4: Neo4j GDS */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Network className="w-4 h-4 text-amber-600" />
                <span>Neo4j 5.26 + GDS</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                Graph Science
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In-memory graph projection of <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">:CO_SPEND</code> wallet networks. Runs Louvain modularity clustering and PageRank seed proximity propagation.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Port: TCP 7687</span>
              <span className="font-semibold text-slate-800">Sub-second Hops</span>
            </div>
          </div>

          {/* Card 5: PyTorch CPU */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>PyTorch 2.4.1 (CPU)</span>
              </div>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-semibold">
                PyG 2.6.1
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              CPU-optimized deep learning runtime. Runs 18-feature Autoencoder MSE anomaly detection and 3-layer GraphSAGE GNN with zero GPU driver dependencies.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Runtime: CPU-Only</span>
              <span className="font-semibold text-slate-800">25.4ms Inference</span>
            </div>
          </div>

          {/* Card 6: Next.js Command Center */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Terminal className="w-4 h-4 text-sky-600" />
                <span>Next.js 16 + Tailwind</span>
              </div>
              <span className="text-[10px] font-mono bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 font-semibold">
                D3.js Force
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Forensic Command Center with local webfonts and 0 external CDN calls. Features interactive D3 graph canvas, SHAP waterfall inspector, and Section 65B dossier compiler.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Port: TCP 3000</span>
              <span className="font-semibold text-slate-800">&lt;150ms Load</span>
            </div>
          </div>
        </div>

        {/* Collapsible Container & Port Specs Matrix */}
        <details className="group border border-slate-200 rounded-xl bg-slate-50/50 p-4 transition-all">
          <summary className="text-xs font-mono font-bold text-slate-700 cursor-pointer select-none flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              Detailed Container Port & Volume Mount Matrix (Click to Expand)
            </span>
            <span className="text-[11px] text-blue-600 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 overflow-x-auto border-t border-slate-200 pt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="font-mono text-[10.5px] text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Service</th>
                  <th className="py-2 px-3">Port Binding</th>
                  <th className="py-2 px-3">Protocol</th>
                  <th className="py-2 px-3">Volume Mount</th>
                  <th className="py-2 px-3">OPSEC Constraint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11.5px]">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Forensic UI</td>
                  <td className="py-2.5 px-3 font-mono text-sky-700 font-semibold">TCP 3000</td>
                  <td className="py-2.5 px-3">HTTP Next.js SSR</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">/app/.next</td>
                  <td className="py-2.5 px-3 text-slate-600">Strict localhost; 0 external CDN calls</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">REST Gateway</td>
                  <td className="py-2.5 px-3 font-mono text-indigo-700 font-semibold">TCP 8000</td>
                  <td className="py-2.5 px-3">HTTP REST / JSON</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">/app/data</td>
                  <td className="py-2.5 px-3 text-slate-600">Bearer Auth; AddressHashMiddleware</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Async Ingest</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">Worker PID</td>
                  <td className="py-2.5 px-3">Celery IPC / AMQP</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">/app/data/geoip</td>
                  <td className="py-2.5 px-3 text-slate-600">Local MaxMind MMDB; no outbound DNS</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Task Broker</td>
                  <td className="py-2.5 px-3 font-mono text-rose-700 font-semibold">TCP 6379</td>
                  <td className="py-2.5 px-3">RESP Protocol</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">redis_data (AOF)</td>
                  <td className="py-2.5 px-3 text-slate-600">Internal docker network; atomic locks</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Relational DB</td>
                  <td className="py-2.5 px-3 font-mono text-blue-700 font-semibold">TCP 5432</td>
                  <td className="py-2.5 px-3">PostgreSQL Wire</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">postgres_data</td>
                  <td className="py-2.5 px-3 text-slate-600">ACID ledger; B-Tree indices on txid</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Graph DB</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 font-semibold">TCP 7687</td>
                  <td className="py-2.5 px-3">Bolt Protocol</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">neo4j_data</td>
                  <td className="py-2.5 px-3 text-slate-600">GDS 2.13.x; bounded in-memory projection</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* SECTION 4: Interactive System Topology & Service Bus */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive System Topology & Inter-Service Bus
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Click any service node below to inspect live ports, protocols, latencies, and operational rationales
            </p>
          </div>
        </div>

        {/* Embedded Interactive Topology Component */}
        <TopologyDiagram />
      </section>

      {/* SECTION 5: Architectural Defenses & Core FAQs */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Architectural Defense & Key Questions
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Direct technical rationales addressing dual-storage, CPU-only ML, OPSEC address hashing, and idempotency
            </p>
          </div>
        </div>

        {/* Embedded FAQ Accordion */}
        <FaqAccordion />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono text-slate-500">
          NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH01
        </div>

        <Link
          href="/docs/ch2-ingest-geoip-security"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 2: Ingest, GeoIP & Anti-Duplicate Armor</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
