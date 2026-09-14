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
} from "lucide-react";
import { TopologyDiagram } from "./topology-diagram";

export const metadata = {
  title: "Chapter 1: The NTRO Mission, Tech Stack & System Topology — NTRO KB",
  description:
    "Foundational technical specification of the sovereign air-gapped Bitcoin forensic intelligence pipeline for NTRO.",
};

export default function Chapter1Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* Chapter Tactical Header */}
      <div className="border-b border-slate-200 pb-6 sm:pb-8 space-y-3.5 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider uppercase">
            CHAPTER 01
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            SOVEREIGN INTELLIGENCE PLATFORM
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AIR-GAP CLASSIFIED
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Chapter 1: The NTRO Mission, Tech Stack & System Topology
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
          Complete architectural briefing for the sovereign offline intelligence system deployed to monitor
          Bitcoin transaction traffic, de-anonymize peeling chains and mixers, ingest ransomware seeds,
          and score multi-factor risk with Section 65B forensic admissibility.
        </p>

        {/* Quick Spec Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Ransomwhere Seeds</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">11,186 Addrs</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">$1.018B Tracked</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Ingest Throughput</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">11,938 rows/s</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">100k in 8.38s</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Inference Engine</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">4.8ms CPU</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">Dual Transformer (F1: 0.921)</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Air-Gap Integrity</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">0 External Calls</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">Local .woff2 / MMDB</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: NTRO Mandate & Sovereign Air-Gap Compliance */}
      <section className="space-y-5 sm:space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-xs shrink-0">
            01
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              NTRO Mandate & Sovereign Air-Gap Compliance
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
              Statutory jurisdiction, ransomware attribution, and strict physical air-gap enforcement
            </p>
          </div>
        </div>

        <div className="space-y-3.5 sm:space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 pt-2">
          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-slate-50/50 border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs font-mono">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
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

          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-slate-50/50 border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs font-mono">
              <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
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
      <section className="space-y-5 sm:space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-xs shrink-0">
            02
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              The 5-Tier Forensic Pipeline
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
              End-to-end data progression from multi-format ingest to court-admissible forensic dossier
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Tier 1 */}
          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                  T1
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Multi-Format Ingestion & GeoIP Enrichment
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold self-start sm:self-auto shrink-0">
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
          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                  T2
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Relational Ledger & Neo4j Graph Projection
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold self-start sm:self-auto shrink-0">
                KEYSET PAGINATED BATCHING
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
          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                  T3
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Heuristic Detectors & Louvain Modularity Clustering
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold self-start sm:self-auto shrink-0">
                97.2% PEELING • 100% COINJOIN
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
          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                  T4
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Dual Transformer / Deep Learning Engine (F2 & F4)
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold self-start sm:self-auto shrink-0">
                4.8ms DUAL TRANSFORMER • F1: 0.9209
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Two sovereign PyTorch models evaluate risk concurrently in 4.8ms CPU composite latency:
              <br />
              <strong>1. FT-Transformer Tabular Anomaly Engine (F2):</strong> Projects 18 tabular features into 32d embeddings processed through 2 Multi-Head Self-Attention (MHSA) layers (18,930 parameters, 85.54 KB, 0.0222 ms/sample) to yield a calibrated continuous anomaly score (F1=0.6972, calibrated threshold &theta;=0.0364).
              <br />
              <strong>2. Relational Graph Transformer (F4):</strong> PyG <code className="font-mono text-[11px]">TransformerConv</code> with 4 attention heads and 16-dim relation embeddings across <code className="font-mono text-[11px]">:CO_SPEND</code>, <code className="font-mono text-[11px]">:TX_FLOW</code>, and <code className="font-mono text-[11px]">:PEELING_FLOW</code> (34,865 parameters, 145.42 KB, 0.0120 ms/node), achieving F1=0.9209 and 94.8% peeling recall.
              <br />
              <span className="text-[11px] text-slate-500 italic block mt-1">
                * Note: The earlier 7-layer MLP Autoencoder (211.7s baseline, MSE threshold 0.034618) and GraphSAGE (12.2s baseline, F1=0.8696 multi-rel) serve strictly as superseded legacy baselines.
              </span>
            </p>
          </div>

          {/* Tier 5 */}
          <div className="card-tactical rounded-lg p-3.5 sm:p-4 bg-white border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                  T5
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                  Explainable AI (XAI) & Section 65B Evidentiary Dossiers
                </span>
              </div>
              <span className="text-[10px] font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold self-start sm:self-auto shrink-0">
                SHAP WATERFALL & GNN SUBGRAPHS
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transforms opaque mathematical scores into court-admissible evidence.
              <strong> SHAP Waterfall</strong> attributes the 18 FT-Transformer tabular feature contributions;
              <strong> native attention weights + GNNExplainer</strong> extract critical subgraphs and relational edge importance masks for the Graph Transformer;
              and the <strong>Evidence Trail Compiler</strong> builds a deterministic English narrative detailing
              triggered laundering rules, cluster memberships, and seed proximity. Output reports comply with
              <strong> Section 65B of the Indian Evidence Act</strong> for judicial submission.
            </p>
          </div>
        </div>

        {/* Canonical Phase 8 Composite Risk Formulation Callout */}
        <div className="p-3.5 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Canonical Phase 8 Composite Risk Formulation</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              PROVABLY BOUNDED [0.0, 1.0]
            </span>
          </div>
          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/90 shadow-2xs overflow-x-auto">
            <div className="text-xs sm:text-sm md:text-base font-bold text-slate-950 whitespace-nowrap">
              {"Risk = clip(0.35 * S_anom + 0.45 * P_gnn + 0.15 * R_rules + 0.05 * M_mix, 0.0, 1.0)"}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2 text-xs border-t border-slate-200/80">
            <div className="bg-white/60 p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-indigo-700 font-bold">0.35 &bull; S_anom</span>
              <div className="text-[11px] text-slate-500 font-sans mt-0.5 leading-tight">
                FT-Transformer tabular anomaly score (threshold &theta; = 0.0364).
              </div>
            </div>
            <div className="bg-white/60 p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-sky-700 font-bold">0.45 &bull; P_gnn</span>
              <div className="text-[11px] text-slate-500 font-sans mt-0.5 leading-tight">
                Relational Graph Transformer illicit proximity (F1 = 0.9209).
              </div>
            </div>
            <div className="bg-white/60 p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-amber-700 font-bold">0.15 &bull; R_rules</span>
              <div className="text-[11px] text-slate-500 font-sans mt-0.5 leading-tight">
                Rule penalty bonus (high-risk ASN hops, fee surges, velocity).
              </div>
            </div>
            <div className="bg-white/60 p-2 sm:p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-purple-700 font-bold">0.05 &bull; M_mix</span>
              <div className="text-[11px] text-slate-500 font-sans mt-0.5 leading-tight">
                Mixing indicator (&ge;5-hop peeling chains or CoinJoin pools).
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[10.5px] sm:text-[11px] font-mono text-slate-500">
            <div>
              <strong className="text-slate-700">Batch Verdicts:</strong> CRITICAL &ge; 0.80 &bull; HIGH &ge; 0.60 &bull; MEDIUM &ge; 0.40 &bull; LOW &lt; 0.40
            </div>
            <div>
              <strong className="text-slate-700">Online Provisional:</strong> CRITICAL &ge; 0.70 &bull; HIGH &ge; 0.50 &bull; MEDIUM &ge; 0.30 &bull; LOW &lt; 0.30
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Strictly Pinned Tech Stack & Operational Rationale */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-xs shrink-0">
            03
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Strictly Pinned Tech Stack & Operational Rationale
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
              Hermetically sealed dependencies pinned for long-term air-gapped reproducibility
            </p>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Indicator */}
        <div className="md:hidden flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
          <span className="font-semibold text-slate-700">TECH STACK MATRIX</span>
          <span className="text-sky-600 font-bold flex items-center gap-1">Swipe to view details →</span>
        </div>

        {/* Tech Stack Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full max-w-full overscroll-x-contain">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[10.5px] sm:text-[11px] text-slate-700">
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold w-[180px] sm:w-[22%]">Technology</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold w-[160px] sm:w-[20%]">Pinned Version</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold w-[170px] sm:w-[22%]">Operational Function</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold min-w-[240px] sm:w-[36%]">Architectural Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>FastAPI</span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">0.115.x / Python 3.11</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">Forensic REST Gateway</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 leading-relaxed">
                    Asynchronous I/O, Pydantic v2 data validation, lifespan management with clean Neo4j/Postgres pool teardown, and log address hashing middleware.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Celery + Redis</span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">Celery 5.4 / Redis 7</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">Async Worker & Broker</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 leading-relaxed">
                    Decouples CPU-heavy multipart CSV/JSON/XML parsing and MaxMind GeoIP lookups. Redis <code className="font-mono text-[10px]">SETNX</code> locks prevent duplicate file execution.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>PostgreSQL</span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">16-alpine</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">Relational Ledger</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 leading-relaxed">
                    ACID durability for raw transactions. Native arrays (<code className="font-mono text-[10px]">input_addresses</code>, <code className="font-mono text-[10px]">output_amounts</code>) eliminate unnecessary join tables during bulk COPY ingest (11k+ rows/s).
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Network className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Neo4j + GDS</span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">Neo4j 5.26 / GDS 2.13</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">Graph Topology</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 leading-relaxed">
                    In-memory graph projection of <code className="font-mono text-[10px]">:CO_SPEND</code> edges. Executes Louvain modularity and Personalized PageRank over seed ransomware clusters.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>PyTorch + PyG</span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">Torch 2.4.1 / PyG 2.6.1</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">Dual Transformer Engine</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 leading-relaxed">
                    CPU-optimized sovereign Dual Transformer pipeline (FT-Transformer + PyG TransformerConv) running in 4.8ms composite CPU latency with 231 KB weights fitting in L3 cache.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Next.js + Tailwind</span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">Next 16 / Tailwind 4</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">Command Center UI</td>
                  <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 leading-relaxed">
                    App Router with zero runtime CDN calls. D3.js force-directed graph canvas with GNN attention highlighting, tactile HUD inspector, and SHAP waterfall chart.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* INTERACTIVE VISUAL ELEMENT: Clickable SVG/CSS System Topology Diagram */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-xs shrink-0">
            04
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Interactive System Topology & Inter-Service Bus
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
              Live interactive mapping of service ports, protocols, and empirical latency metrics
            </p>
          </div>
        </div>

        {/* Embedded Interactive Topology Component */}
        <TopologyDiagram />
      </section>

      {/* SECTION 5: Architecture Specifications Table & Container Topology */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs sm:text-sm shadow-xs shrink-0">
            05
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Architecture Specifications & Port Matrix
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
              Containerized port bindings, security constraints, and data volume mounts
            </p>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Indicator */}
        <div className="md:hidden flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
          <span className="font-semibold text-slate-700">PORT MATRIX</span>
          <span className="text-sky-600 font-bold flex items-center gap-1">Swipe to view details →</span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full max-w-full overscroll-x-contain">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[10.5px] sm:text-[11px] text-slate-700">
                  <th className="py-2.5 sm:py-3 px-3 font-bold w-[120px] sm:w-[15%]">Service</th>
                  <th className="py-2.5 sm:py-3 px-3 font-bold w-[140px] sm:w-[18%]">Container / Process</th>
                  <th className="py-2.5 sm:py-3 px-3 font-bold w-[100px] sm:w-[13%]">Port Binding</th>
                  <th className="py-2.5 sm:py-3 px-3 font-bold w-[130px] sm:w-[17%]">Network Protocol</th>
                  <th className="py-2.5 sm:py-3 px-3 font-bold w-[110px] sm:w-[14%]">Storage / Volume</th>
                  <th className="py-2.5 sm:py-3 px-3 font-bold min-w-[180px] sm:w-[23%]">Security & Isolation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 sm:py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">Forensic UI</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">frontend / node</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-sky-700 font-semibold whitespace-nowrap">TCP 3000</td>
                  <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">HTTP / Next.js SSR</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">/app/.next</td>
                  <td className="py-2.5 sm:py-3 px-3 text-slate-600">Strictly localhost bound; 0 CDN calls</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 sm:py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">REST Gateway</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">backend / uvicorn</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-indigo-700 font-semibold whitespace-nowrap">TCP 8000</td>
                  <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">HTTP REST / JSON</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">/app/data</td>
                  <td className="py-2.5 sm:py-3 px-3 text-slate-600">Static Bearer token; AddressHashMiddleware</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 sm:py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">Async Ingest</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">celery worker</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-emerald-700 font-semibold whitespace-nowrap">Internal PID</td>
                  <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">Celery IPC / AMQP</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">/app/data/geoip</td>
                  <td className="py-2.5 sm:py-3 px-3 text-slate-600">Local MaxMind MMDB; no outbound DNS</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 sm:py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">Task Broker</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">redis:7-alpine</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-rose-700 font-semibold whitespace-nowrap">TCP 6379</td>
                  <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">RESP (Redis Protocol)</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">redis_data (AOF)</td>
                  <td className="py-2.5 sm:py-3 px-3 text-slate-600">Internal docker bridge; atomic idempotency keys</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 sm:py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">Relational DB</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">postgres:16-alpine</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-blue-700 font-semibold whitespace-nowrap">TCP 5432</td>
                  <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">PostgreSQL Wire</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">postgres_data</td>
                  <td className="py-2.5 sm:py-3 px-3 text-slate-600">ACID ledger; B-Tree indexes on txid & temporal ts</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 sm:py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">Graph DB</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">neo4j:5.26-community</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-amber-700 font-semibold whitespace-nowrap">TCP 7687</td>
                  <td className="py-2.5 sm:py-3 px-3 whitespace-nowrap">Bolt Protocol</td>
                  <td className="py-2.5 sm:py-3 px-3 font-mono text-[11px] whitespace-nowrap">neo4j_data</td>
                  <td className="py-2.5 sm:py-3 px-3 text-slate-600">GDS plugin 2.13.x; memory-clamped projections</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-6 sm:pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="text-[11px] sm:text-xs font-mono text-slate-500 text-center sm:text-left">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH01
        </div>

        <Link
          href="/docs/ch2-ingest-geoip-security"
          className="btn-tactical-primary text-white text-xs font-medium px-4 sm:px-5 py-2.5 rounded-lg flex items-center justify-between sm:justify-start gap-2 group cursor-pointer shadow-xs w-full sm:w-auto"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 2: Ingest, GeoIP & Anti-Duplicate Armor</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2 shrink-0" />
        </Link>
      </div>
    </article>
  );
}
