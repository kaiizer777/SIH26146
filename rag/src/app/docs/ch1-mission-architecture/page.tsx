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
} from "lucide-react";
import { TopologyDiagram } from "./topology-diagram";
import { FaqAccordion } from "./faq-accordion";

export const metadata = {
  title: "Chapter 1: The NTRO Mission, Tech Stack & System Topology — NTRO KB",
  description:
    "Foundational technical specification of the sovereign air-gapped Bitcoin forensic intelligence pipeline for NTRO.",
};

export default function Chapter1Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* Chapter Tactical Header */}
      <div className="border-b border-slate-200 pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider uppercase">
            CHAPTER 01
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            SOVEREIGN INTELLIGENCE PLATFORM
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AIR-GAP CLASSIFIED
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Chapter 1: The NTRO Mission, Tech Stack & System Topology
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          Complete architectural briefing for the sovereign offline intelligence system deployed to monitor
          Bitcoin transaction traffic, de-anonymize peeling chains and mixers, ingest ransomware seeds,
          and score multi-factor risk with Section 65B forensic admissibility.
        </p>

        {/* Quick Spec Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Ransomwhere Seeds</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">11,186 Addrs</div>
            <div className="text-[10px] text-emerald-600 font-semibold">$1.018B Tracked</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Ingest Throughput</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">11,938 rows/s</div>
            <div className="text-[10px] text-emerald-600 font-semibold">100k in 8.38s</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Inference Engine</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">25.4ms CPU</div>
            <div className="text-[10px] text-emerald-600 font-semibold">24,673 Nodes GNN</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Air-Gap Integrity</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">0 External Calls</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Local .woff2 / MMDB</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: NTRO Mandate & Sovereign Air-Gap Compliance */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              NTRO Mandate & Sovereign Air-Gap Compliance
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Statutory jurisdiction, ransomware attribution, and strict physical air-gap enforcement
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Under statutory directive for cyber-surveillance and financial intelligence protection, the
            <strong> National Technical Research Organisation (NTRO)</strong> is mandated to monitor, attribute,
            and de-anonymize illicit cryptocurrency transaction flows traversing national communications infrastructure.
            Illicit threat actors systematically utilize pseudonymous Bitcoin networks, automated peeling chains,
            CoinJoin mixing pools, and darknet cashout gateways to obscure capital flight, ransomware proceeds,
            and state-sponsored cyber offensive financing.
          </p>

          <p>
            To operationalize this directive, the system ingests the verified <strong>Ransomwhere</strong> intelligence corpus,
            seeding the surveillance graph with <strong>11,186 known illicit addresses</strong> spanning <strong>136 ransomware families</strong>
            (representing <strong>$1,018,573,922.46 USD</strong> and <strong>115,116.91 BTC</strong> in confirmed ransom payments).
            These seed clusters provide the ground-truth anchor for Personalized PageRank seed proximity propagation and Louvain modularity clustering.
          </p>
        </div>

        {/* Air-gap compliance cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="card-tactical rounded-lg p-4 bg-slate-50/50 border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs font-mono">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Zero-Leakage Air-Gap Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Designed for isolated sovereign enclaves without external internet routing.
              All external runtime CDN calls are strictly eliminated. Webfonts are pre-cached as local
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px] ml-1">
                .woff2
              </code> files in <code className="font-mono text-[11px]">.next/static/media/</code>.
              MaxMind GeoLite2-City and GeoLite2-ASN databases are packaged locally as binary
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px] ml-1">
                .mmdb
              </code> files, ensuring autonomous geospatial enrichment without DNS or WHOIS requests.
            </p>
          </div>

          <div className="card-tactical rounded-lg p-4 bg-slate-50/50 border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs font-mono">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              <span>AddressHashMiddleware & OPSEC Shield</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To prevent operational compromise during infrastructure logging and multi-agency exports,
              FastAPI implements custom ASGI <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">AddressHashMiddleware</code>.
              All Base58 and Bech32 Bitcoin addresses emitted to stdout, stderr, or log streams are intercepted
              and deterministically hashed into SHA-256 tokens (<code className="font-mono text-[11px]">[ADDR_HASH:9f86d081884c]</code>).
              Zero plaintext addresses are leaked to persistent application logs.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: The 5-Tier Forensic Pipeline */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The 5-Tier Forensic Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              End-to-end data progression from multi-format ingest to court-admissible forensic dossier
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Tier 1 */}
          <div className="card-tactical rounded-lg p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  T1
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Multi-Format Ingestion & GeoIP Enrichment
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                11,938 ROWS/SEC VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Accepts asynchronous bulk uploads across CSV, JSON, and XML formats. A content-sniffing parser normalizes
              disparate schemas into unified Pydantic models. Celery worker pools resolve geographic country codes and
              autonomous system numbers (ASN) via local MaxMind <code className="font-mono text-[11px]">.mmdb</code> files.
              Invalid rows are isolated into <code className="font-mono text-[11px]">rejected_rows</code> with line numbers and failure rationales.
            </p>
          </div>

          {/* Tier 2 */}
          <div className="card-tactical rounded-lg p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  T2
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Relational Ledger & Neo4j Graph Projection
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                KEYS-ET PAGINATED BATCHING
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transactions are written with ACID durability to PostgreSQL 16 using native SQL arrays
              (<code className="font-mono text-[11px]">input_addresses text[]</code>, <code className="font-mono text-[11px]">output_amounts numeric[]</code>)
              and temporal indices. Keyset-paginated batch scripts project transactions into Neo4j 5.26 Community,
              materializing <code className="font-mono text-[11px]">:Wallet</code>, <code className="font-mono text-[11px]">:Transaction</code>, and <code className="font-mono text-[11px]">:IP</code> nodes
              interconnected via <code className="font-mono text-[11px]">:SENDS</code>, <code className="font-mono text-[11px]">:RECEIVES</code>, <code className="font-mono text-[11px]">:OBSERVED</code>,
              and pairwise multi-input <code className="font-mono text-[11px]">:CO_SPEND</code> edges.
            </p>
          </div>

          {/* Tier 3 */}
          <div className="card-tactical rounded-lg p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  T3
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Heuristic Detectors & Louvain Modularity Clustering
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                97.2% PEELING // 100% COINJOIN
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Parameterized Cypher queries traverse the graph to detect linear 1-in-2-out peeling chains
              (≤5% change output, ≥80% forward transfer, depth ≥5 hops) and CoinJoin mixers (≥3 equal outputs ±1%).
              In Neo4j Graph Data Science (GDS 2.13), Louvain modularity optimization partitions co-spending wallets
              into distinct entity clusters, and Personalized PageRank propagates seed proximity scores from Ransomwhere anchors.
            </p>
          </div>

          {/* Tier 4 */}
          <div className="card-tactical rounded-lg p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  T4
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Dual Transformer / Deep Learning Engine (F2 & F4)
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                211.7s AUTOENCODER // 12.2s SAGE
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Two complementary PyTorch models evaluate risk in parallel on CPU:
              <br />
              <strong>1. Unsupervised 18-Feature Autoencoder (F2):</strong> Extracts reconstruction Mean Squared Error (MSE)
              to pinpoint unusual transaction topologies, flagging values above the 95th percentile.
              <br />
              <strong>2. 3-Layer GraphSAGE GNN (F4):</strong> Implements mean aggregation over 8 topological features
              (<code className="font-mono text-[11px]">[cluster_id, anomaly_score, is_mixing, fee_log, inputs, outputs, entropy, asn_risk]</code>)
              trained with Focal Loss (<code className="font-mono text-[11px]">γ=2.0, α=6.20</code>) to conquer class imbalance.
            </p>
          </div>

          {/* Tier 5 */}
          <div className="card-tactical rounded-lg p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  T5
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Explainable AI (XAI) & Section 65B Evidentiary Dossiers
                </span>
              </div>
              <span className="text-[10px] font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                SHAP WATERFALL & GNN SUBGRAPHS
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transforms opaque mathematical scores into court-admissible evidence.
              <strong> SHAP Waterfall</strong> attributes the 18 Autoencoder feature contributions;
              <strong> GNNExplainer</strong> extracts critical subgraphs and edge importance masks;
              and the <strong>Evidence Trail Compiler</strong> builds a deterministic English narrative detailing
              triggered laundering rules, cluster memberships, and seed proximity. Output reports comply with
              <strong> Section 65B of the Indian Evidence Act</strong> for judicial submission.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: Strictly Pinned Tech Stack & Operational Rationale */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Strictly Pinned Tech Stack & Operational Rationale
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Hermetically sealed dependencies pinned for long-term air-gapped reproducibility
            </p>
          </div>
        </div>

        {/* Tech Stack Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-700">
                <th className="py-3 px-4 font-bold">Technology</th>
                <th className="py-3 px-4 font-bold">Pinned Version</th>
                <th className="py-3 px-4 font-bold">Operational Function</th>
                <th className="py-3 px-4 font-bold">Architectural Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  FastAPI
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">0.115.x / Python 3.11</td>
                <td className="py-3 px-4">Forensic REST API Gateway</td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed">
                  Asynchronous I/O, Pydantic v2 data validation, lifespan management with clean Neo4j/Postgres pool teardown, and log address hashing middleware.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  Celery + Redis
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">Celery 5.4 / Redis 7-alpine</td>
                <td className="py-3 px-4">Async Worker & Idempotency Broker</td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed">
                  Decouples CPU-heavy multipart CSV/JSON/XML parsing and MaxMind GeoIP lookups. Redis <code className="font-mono text-[10px]">SETNX</code> locks prevent duplicate file execution.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  PostgreSQL
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">16-alpine</td>
                <td className="py-3 px-4">Relational Ledger & Temporal Index</td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed">
                  ACID durability for raw transactions. Native arrays (<code className="font-mono text-[10px]">input_addresses</code>, <code className="font-mono text-[10px]">output_amounts</code>) eliminate unnecessary join tables during bulk COPY ingest (11k+ rows/s).
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-amber-600" />
                  Neo4j Community + GDS
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">Neo4j 5.26 / GDS 2.13.x</td>
                <td className="py-3 px-4">Graph Topology & Community Detection</td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed">
                  In-memory graph projection of <code className="font-mono text-[10px]">:CO_SPEND</code> edges. Executes Louvain modularity and Personalized PageRank over seed ransomware clusters.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  PyTorch + PyG
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">Torch 2.4.1+cpu / PyG 2.6.1</td>
                <td className="py-3 px-4">Deep Learning Inference Runtime</td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed">
                  CPU-optimized inference eliminates GPU driver and CUDA compatibility risks in air-gapped field hardware. Runs Autoencoder MSE and GraphSAGE in 25.4ms.
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-600" />
                  Next.js + Tailwind
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900">Next 16 / Tailwind 4</td>
                <td className="py-3 px-4">Forensic Surveillance Command Center</td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed">
                  App Router with zero runtime CDN calls. D3.js force-directed graph canvas with GNN attention highlighting, tactile HUD inspector, and SHAP waterfall chart.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* INTERACTIVE VISUAL ELEMENT: Clickable SVG/CSS System Topology Diagram */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive System Topology & Inter-Service Bus
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Live interactive mapping of service ports, protocols, and empirical latency metrics
            </p>
          </div>
        </div>

        {/* Embedded Interactive Topology Component */}
        <TopologyDiagram />
      </section>

      {/* SECTION 4: Architecture Specifications Table & Container Topology */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Architecture Specifications & Port Matrix
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Containerized port bindings, security constraints, and data volume mounts
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-700">
                <th className="py-3 px-3 font-bold">Service</th>
                <th className="py-3 px-3 font-bold">Container / Process</th>
                <th className="py-3 px-3 font-bold">Port Binding</th>
                <th className="py-3 px-3 font-bold">Network Protocol</th>
                <th className="py-3 px-3 font-bold">Storage / Volume Mount</th>
                <th className="py-3 px-3 font-bold">Security & Isolation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Forensic UI</td>
                <td className="py-3 px-3 font-mono text-[11px]">frontend / node</td>
                <td className="py-3 px-3 font-mono text-sky-700 font-semibold">TCP 3000</td>
                <td className="py-3 px-3">HTTP / Next.js SSR</td>
                <td className="py-3 px-3 font-mono text-[11px]">/app/.next</td>
                <td className="py-3 px-3 text-slate-600">Strictly localhost bound; 0 CDN calls</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">REST Gateway</td>
                <td className="py-3 px-3 font-mono text-[11px]">backend / uvicorn</td>
                <td className="py-3 px-3 font-mono text-indigo-700 font-semibold">TCP 8000</td>
                <td className="py-3 px-3">HTTP REST / JSON</td>
                <td className="py-3 px-3 font-mono text-[11px]">/app/data</td>
                <td className="py-3 px-3 text-slate-600">Static Bearer token; AddressHashMiddleware</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Async Ingest</td>
                <td className="py-3 px-3 font-mono text-[11px]">celery worker</td>
                <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">Internal PID</td>
                <td className="py-3 px-3">Celery IPC / AMQP</td>
                <td className="py-3 px-3 font-mono text-[11px]">/app/data/geoip</td>
                <td className="py-3 px-3 text-slate-600">Local MaxMind MMDB; no outbound DNS</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Task Broker</td>
                <td className="py-3 px-3 font-mono text-[11px]">redis:7-alpine</td>
                <td className="py-3 px-3 font-mono text-rose-700 font-semibold">TCP 6379</td>
                <td className="py-3 px-3">RESP (Redis Protocol)</td>
                <td className="py-3 px-3 font-mono text-[11px]">redis_data (AOF)</td>
                <td className="py-3 px-3 text-slate-600">Internal docker bridge; atomic idempotency keys</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Relational DB</td>
                <td className="py-3 px-3 font-mono text-[11px]">postgres:16-alpine</td>
                <td className="py-3 px-3 font-mono text-blue-700 font-semibold">TCP 5432</td>
                <td className="py-3 px-3">PostgreSQL Wire</td>
                <td className="py-3 px-3 font-mono text-[11px]">postgres_data</td>
                <td className="py-3 px-3 text-slate-600">ACID ledger; B-Tree indexes on txid & temporal ts</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-semibold text-slate-900">Graph DB</td>
                <td className="py-3 px-3 font-mono text-[11px]">neo4j:5.26-community</td>
                <td className="py-3 px-3 font-mono text-amber-700 font-semibold">TCP 7687</td>
                <td className="py-3 px-3">Bolt Protocol</td>
                <td className="py-3 px-3 font-mono text-[11px]">neo4j_data</td>
                <td className="py-3 px-3 text-slate-600">GDS plugin 2.13.x; memory-clamped projections</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5: Teammate FAQ Accordion */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Architectural FAQ & Engineering Defense
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Direct technical rationales addressing dual-storage, CPU-only ML, address hashing, and idempotency
            </p>
          </div>
        </div>

        {/* Embedded FAQ Accordion */}
        <FaqAccordion />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono text-slate-500">
          DOCUMENT SPECIFICATION // SEC-DOC-26146-CH01
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
