"use client";

import React, { useState } from "react";
import { ChevronDown, Database, Cpu, Lock, Shield, Layers, Zap } from "lucide-react";

interface FAQItem {
  question: string;
  category: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    question: "Why use dual-database PostgreSQL + Neo4j instead of just graph?",
    category: "STORAGE ARCHITECTURE",
    badge: "Dual Engine",
    icon: Database,
    answer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p className="font-medium text-slate-900">
          Storing raw transactions in pure graph databases causes severe memory bloat. Decoupling storage provides the best of both worlds:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
            <div className="font-bold text-slate-900 font-mono text-[11px] uppercase text-blue-700">
              PostgreSQL 16 (Ledger)
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li><strong>High Write Speed:</strong> Ingests 11,938+ rows/sec using native SQL arrays.</li>
              <li><strong>ACID Durability:</strong> B-Tree indexes for instant transaction lookup by timestamp or TXID.</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
            <div className="font-bold text-slate-900 font-mono text-[11px] uppercase text-amber-700">
              Neo4j 5.26 GDS (Graph)
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li><strong>Entity Clustering:</strong> Louvain algorithm groups co-spending wallets together.</li>
              <li><strong>Deep Traversal:</strong> Detects multi-hop peeling chains (5+ hops) in milliseconds.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    question: "Why CPU-only PyTorch (2.4.1+cpu) instead of requiring GPU/CUDA?",
    category: "MACHINE LEARNING",
    badge: "Air-Gap Ready",
    icon: Cpu,
    answer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p className="font-medium text-slate-900">
          Sovereign air-gapped field setups cannot rely on external proprietary Nvidia drivers or CUDA toolkits. Both models were optimized for CPU speed:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
          <li><strong>Ultra-Fast Inference:</strong> Runs on CPU in just <strong>25.4ms</strong> for 24,673 nodes (beating the 2.0s SLA by 70x).</li>
          <li><strong>Lightweight Training:</strong> 18-Feature Autoencoder trains in <strong>3.5 mins</strong>; GraphSAGE trains in <strong>12.2s</strong>.</li>
          <li><strong>Zero Supply-Chain Risk:</strong> Runs out of the box on any standard x86 CPU hardware without driver mismatches.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How is the zero-leakage air-gap guarantee enforced in practice?",
    category: "SECURITY & COMPLIANCE",
    badge: "Zero Network Leaks",
    icon: Lock,
    answer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p className="font-medium text-slate-900">
          The system maintains a verified <strong>zero runtime external request policy</strong>:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
          <li><strong>Local Webfonts:</strong> Fonts are bundled locally as <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">.woff2</code> files inside the build; zero Google Fonts CDN calls.</li>
          <li><strong>Local GeoIP Databases:</strong> MaxMind GeoLite2 City and ASN are packaged as binary <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">.mmdb</code> files; zero external DNS/WHOIS lookups.</li>
          <li><strong>Pre-compiled Packages:</strong> All Python wheels, D3 scripts, and icons are baked directly into the local image.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does AddressHashMiddleware prevent Bitcoin address leaks in logs?",
    category: "LOG AUDITING & OPSEC",
    badge: "Privacy Redaction",
    icon: Shield,
    answer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p className="font-medium text-slate-900">
          Exposing plaintext Bitcoin addresses in logs creates operational security vulnerabilities during multi-agency audits:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
          <li><strong>Real-Time Interception:</strong> Custom ASGI middleware scans all outgoing log lines for Base58 and Bech32 address patterns.</li>
          <li><strong>Deterministic Hashing:</strong> Plaintext wallets are replaced with SHA-256 tokens (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">[ADDR_HASH:9f86d081884c]</code>).</li>
          <li><strong>Audit Safe:</strong> Zero plaintext addresses exist in log files, while log events remain correlate-able.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "What stops duplicate transaction processing across concurrent batch uploads?",
    category: "INGESTION INTEGRITY",
    badge: "Idempotency",
    icon: Zap,
    answer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p className="font-medium text-slate-900">
          A multi-layer anti-duplicate shield prevents duplicate records and double-counting:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
          <li><strong>Redis Lock:</strong> File SHA-256 hash is locked in Redis via atomic <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">SETNX</code> to reject concurrent duplicate file uploads.</li>
          <li><strong>Unique DB Constraints:</strong> PostgreSQL enforces unique constraints on <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">txid</code>.</li>
          <li><strong>Safe Ingestion:</strong> Celery bulk workers use <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">ON CONFLICT (txid) DO NOTHING</code>, safely skipping duplicate transactions.</li>
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
        const Icon = faq.icon;
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
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-6 h-6 rounded-[6px] bg-blue-50 border border-blue-200/70 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <span className="text-[9.5px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60 font-medium">
                      {faq.badge}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate sm:whitespace-normal">
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
              <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
