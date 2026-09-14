"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Shield, Database, Cpu, Lock, CheckCircle2 } from "lucide-react";

interface FAQItem {
  question: string;
  category: string;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    question: "Why dual-database PostgreSQL + Neo4j instead of just graph?",
    category: "STORAGE ARCHITECTURE",
    answer: (
      <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
        <p>
          Relational <strong>PostgreSQL 16</strong> is engineered for high-write-throughput append-only transaction ledgers with strict ACID durability, keyset-based cursor pagination, B-Tree indexes on temporal timestamps, <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">txid</code>, <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">src_ip</code>, and native SQL arrays (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">input_addresses text[]</code>, <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">output_amounts numeric[]</code>).
        </p>
        <p>
          Conversely, <strong>Neo4j 5.26 Community with GDS 2.13</strong> is engineered for high-degree entity link analysis: projecting pairwise <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">:CO_SPEND</code> heuristics, running Louvain modularity clustering, computing Personalized PageRank proximity, and traversing deep multi-hop peeling chains (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">≥5 hops</code>).
        </p>
        <p className="bg-slate-50 p-2.5 rounded border border-slate-200/80 font-mono text-[11px] text-slate-700">
          <strong>Key Decoupling:</strong> Storing millions of transaction rows in pure graph nodes induces extreme JVM heap bloat and page-cache thrashing. Decoupling the relational ledger (11,938 rows/sec bulk ingest) from in-memory graph data science gives us predictable sub-second queries across both domains.
        </p>
      </div>
    ),
  },
  {
    question: "Why CPU-only PyTorch (2.4.1+cpu) instead of GPU/CUDA?",
    category: "MACHINE LEARNING",
    answer: (
      <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
        <p>
          Sovereign defense field deployments require zero hardware dependencies on proprietary Nvidia drivers, CUDA toolkits, or cuDNN binaries that create severe supply-chain constraints in air-gapped field operations.
        </p>
        <p>
          Both forensic neural networks were architected specifically for CPU-first execution efficiency:
        </p>
        <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-slate-700">
          <li>
            <strong>18-Feature Deep Autoencoder:</strong> Trained on CPU in only <strong>211.7s (3.53 minutes)</strong> on non-illicit splits with zero divergence.
          </li>
          <li>
            <strong>3-Layer GraphSAGE GNN:</strong> Trained on CPU in only <strong>12.2s</strong> (147 epochs with early stopping) for 24,673 nodes.
          </li>
          <li>
            <strong>Inference Latency:</strong> Only <strong>25.4ms</strong> on CPU for 24,673 nodes—beating the required 2.0s SLA by &gt;70x.
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does the air-gap guarantee work in practice with zero CDN dependencies?",
    category: "SECURITY & COMPLIANCE",
    answer: (
      <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
        <p>
          The system maintains a strict <strong>zero runtime external request policy</strong> verified through network interface packet capture:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-slate-700">
          <li>
            <strong>Local Webfonts:</strong> Google Fonts are pre-cached as local <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">.woff2</code> assets inside <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">.next/static/media/</code>, eliminating all runtime calls to <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">fonts.googleapis.com</code>.
          </li>
          <li>
            <strong>Local GeoIP MMDB:</strong> MaxMind GeoLite2-City and GeoLite2-ASN databases are bundled as local <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">.mmdb</code> files inside <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">data/geoip/</code>.
          </li>
          <li>
            <strong>Bundled NPM/Python Wheels:</strong> Lucide SVG icons, D3.js visualization scripts, and PyTorch libraries are entirely pre-compiled inside the container filesystems.
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does AddressHashMiddleware prevent Base58/Bech32 address leaks in application logs?",
    category: "LOG AUDITING & OPSEC",
    answer: (
      <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
        <p>
          Exposing plaintext Bitcoin addresses (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">1A1zP...</code> or <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">bc1q...</code>) in application logging poses severe surveillance leakage risks during cross-agency audits.
        </p>
        <p>
          FastAPI implements a custom ASGI <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">AddressHashMiddleware</code> that evaluates all outbound log streams using regex patterns matching Base58 and Bech32 Bitcoin address grammars. Matches are deterministically hashed into SHA-256 tokens (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">[ADDR_HASH:9f86d081884c]</code>).
        </p>
        <p>
          This guarantees that even if application logs are exported or compromised, <strong>0 plaintext addresses are leaked</strong> while maintaining correlation traceability across log events.
        </p>
      </div>
    ),
  },
  {
    question: "What prevents duplicate transaction processing across concurrent batch uploads?",
    category: "INGESTION ARMOR",
    answer: (
      <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
        <p>
          The pipeline enforces a multi-tier anti-duplicate armor:
        </p>
        <ol className="list-decimal pl-4 space-y-1 text-slate-700">
          <li>
            <strong>Redis Distributed Idempotency Lock:</strong> Before file processing commences, a SHA-256 checksum of the raw payload is stored in Redis via atomic <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">SETNX batch:hash 1 EX 3600</code>. Concurrent uploads of the same file are rejected immediately with a conflict status.
          </li>
          <li>
            <strong>Relational B-Tree Primary Key:</strong> The PostgreSQL <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">transactions</code> table enforces a unique constraint on <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">txid</code>.
          </li>
          <li>
            <strong>Idempotent Ingestion Query:</strong> Celery bulk workers execute <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">INSERT ... ON CONFLICT (txid) DO NOTHING</code>, safely skipping duplicate transactions without rolling back valid sibling records.
          </li>
        </ol>
      </div>
    ),
  },
  {
    question: "How does the system scale when processing tens of millions of historical transactions?",
    category: "SCALABILITY & PERFORMANCE",
    answer: (
      <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
        <p>
          Scalability is achieved through strict separation of concerns and pagination discipline:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-slate-700">
          <li>
            <strong>Keyset (Cursor) Pagination:</strong> Queries avoid high-offset scans (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">OFFSET 500000</code>) by utilizing indexed seek predicates (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">WHERE id &gt; :last_id ORDER BY id ASC LIMIT 1000</code>), maintaining constant $O(1)$ query overhead.
          </li>
          <li>
            <strong>Micro-Batched Graph Cypher:</strong> Neo4j batch insertion scripts leverage parameterized <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">UNWIND $batch AS row MERGE ...</code> with explicit transaction commits every 1,000 rows, preventing Java Garbage Collector pauses.
          </li>
          <li>
            <strong>Bounded Graph Visualizer:</strong> The Next.js Command Center enforces a hard ceiling of 150–250 nodes per visual cluster query, preventing WebGL / D3 force-layout starvation in the browser.
          </li>
        </ul>
      </div>
    ),
  },
];

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="space-y-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            className={`border rounded-lg transition-all ${
              isOpen
                ? "bg-white border-slate-300 shadow-xs"
                : "bg-slate-50/50 border-slate-200/80 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <div>
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {faq.category}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">
                    {faq.question}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-slate-900" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
