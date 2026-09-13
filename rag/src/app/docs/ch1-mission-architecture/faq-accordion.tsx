"use client";

import React, { useState } from "react";
import { ChevronDown, Database, Cpu, Lock, Shield, Layers, Zap, FileCheck2 } from "lucide-react";

interface FAQItem {
  question: string;
  category: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    question: "Why does our prototype use TWO databases (PostgreSQL + Neo4j)?",
    category: "STORAGE ARCHITECTURE",
    badge: "Vault + Corkboard",
    icon: Database,
    answer: (
      <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-950 text-[13px]">
          Because one database alone cannot do both jobs without crashing or slowing down. Think of it as a Bank Vault versus a Detective&apos;s Corkboard:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 bg-gradient-to-b from-blue-50/70 via-blue-50/40 to-blue-100/30 rounded-xl border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(37,99,235,0.05)] space-y-1.5">
            <div className="font-bold text-blue-800 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              PostgreSQL 16 (The Bank Vault)
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-700 font-medium">
              <li><strong>Permanent Receipts:</strong> Keeps unalterable financial ledgers with 100% ACID durability and indexed arrays.</li>
              <li><strong>Lightning Bulk Writes:</strong> Saves 11,938 transaction rows per second via bulk COPY without breaking a sweat.</li>
            </ul>
          </div>
          <div className="p-3.5 bg-gradient-to-b from-amber-50/70 via-amber-50/40 to-amber-100/30 rounded-xl border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(217,119,6,0.05)] space-y-1.5">
            <div className="font-bold text-amber-800 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Neo4j 5.26 GDS (The Corkboard)
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-700 font-medium">
              <li><strong>Connects the Dots:</strong> Maps 24,673 wallets, 100,000 transactions, and co-spending syndicates.</li>
              <li><strong>Traces the Money:</strong> Traverses multi-hop peeling chains and computes Louvain clusters in &lt;25 milliseconds.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    question: "What is the 'Dual Transformer AI' and why is it special?",
    category: "AI & MACHINE LEARNING",
    badge: "2 Detectives",
    icon: Cpu,
    answer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-950 text-[13px]">
          Instead of just one basic AI model, we deploy two specialized Transformer detectives that work together as an elite team:
        </p>
        <ul className="list-disc pl-4 space-y-2 text-slate-700 font-medium">
          <li><strong>Detective 1 (FT-Transformer — The Forensic Accountant):</strong> Scrutinizes 18 tabular features (velocity, amount, fee rate, output entropy) using cross-feature self-attention to spot anomalies.</li>
          <li><strong>Detective 2 (Relational Graph Transformer — The Network Sleuth):</strong> Uses 4-head relational attention across co-spending, transaction flows, and peeling edges to trace syndicates back to 11,186 Ransomwhere seeds (F1=0.9209).</li>
          <li><strong>Runs on Normal Laptops (Zero GPUs Required):</strong> Both models run in just <strong>4.8 milliseconds</strong> per entity directly on standard laptop processors (pure CPU), with total model weights under 250 KB.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "Why is '100% Air-Gapped' (Zero Internet) so important for NTRO?",
    category: "NATIONAL SECURITY",
    badge: "Zero Leaks",
    icon: Lock,
    answer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-950 text-[13px]">
          NTRO handles top-secret national intelligence. If our system queried online public websites or cloud servers:
        </p>
        <ul className="list-disc pl-4 space-y-2 text-slate-700 font-medium">
          <li><strong>Criminals Would Get Tipped Off:</strong> If we search a suspect wallet on a public website (like Etherscan or public clouds), adversaries monitor search logs and immediately move their funds to escape.</li>
          <li><strong>Zero Cloud Leaks:</strong> Everything—from local MaxMind GeoLite2 MMDB databases for country/ASN lookups to pre-cached fonts—is bundled directly on the offline machine with <strong>0 outside network calls</strong>.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How do we protect sensitive wallet addresses in system logs?",
    category: "PRIVACY & OPSEC",
    badge: "Address Masking",
    icon: Shield,
    answer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-950 text-[13px]">
          If audit logs are shared across intelligence departments, raw Bitcoin addresses must never be exposed in plaintext:
        </p>
        <ul className="list-disc pl-4 space-y-2 text-slate-700 font-medium">
          <li><strong>Automatic Masking:</strong> Our root logger filter (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 border border-slate-300 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">_AddressPseudonymFilter</code>) automatically catches Base58 and Bech32 Bitcoin addresses before writing logs, replacing them with deterministic SHA-256 tokens (e.g., <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 border border-slate-300 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">[addr:9f86d081]</code>).</li>
          <li><strong>Safe Audits:</strong> Officers can verify system health and pipeline logs without leaking target wallet identities.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "What happens if someone accidentally uploads the same file twice?",
    category: "DATA INTEGRITY",
    badge: "Duplicate Shield",
    icon: Zap,
    answer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-950 text-[13px]">
          A smart multi-layer shield prevents any duplicate records from messing up our investigation:
        </p>
        <ul className="list-disc pl-4 space-y-2 text-slate-700 font-medium">
          <li><strong>Instant File Fingerprint (Redis SHA-256 Lock):</strong> The system hashes uploaded files inline. If the same file is submitted within 24 hours, Redis stops it immediately with an HTTP 409 error before heavy database writes.</li>
          <li><strong>Database Safety Net (PostgreSQL UNIQUE):</strong> If individual transactions already exist in the ledger, PostgreSQL&apos;s <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 border border-slate-300 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">txid</code> unique constraint isolates them into rejected rows without aborting the batch.</li>
          <li><strong>Idempotent Post-Ingest Sync:</strong> Live post-ingest inference is protected by Redis sync locks (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 border border-slate-300 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">sync_done:&lbrace;task_id&rbrace;</code>) to eliminate duplicate AI re-scoring.</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does our 'Section 65B Dossier' hold up in a court of law?",
    category: "LEGAL ENFORCEMENT",
    badge: "Judge-Ready",
    icon: FileCheck2,
    answer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-950 text-[13px]">
          Under Section 65B of the Indian Evidence Act, 1872 and Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023, digital evidence must be tamper-proof and explainable:
        </p>
        <ul className="list-disc pl-4 space-y-2 text-slate-700 font-medium">
          <li><strong>Unbroken Chain of Custody:</strong> Every dossier includes a deterministic SHA-256 cryptographic digest of raw telemetry and dual UTC + IST timestamps proving the data was never altered.</li>
          <li><strong>Zero &ldquo;Black Box&rdquo; AI Claims:</strong> We provide 18-feature SHAP waterfall attributions and relational graph attention weights explaining exactly WHY the AI flagged the suspect, giving prosecutors the exact evidence needed for conviction.</li>
          <li><strong>1-Click Court Export:</strong> Generates court-admissible certified JSON and print-formatted PDF dossiers ready for judicial presentation.</li>
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
            className={`rounded-xl transition-all ${
              isOpen
                ? "bg-white border-t border-t-white border-x border-x-blue-300 border-b border-b-blue-500 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_10px_rgba(37,99,235,0.08)] ring-1 ring-blue-500/20"
                : "bg-gradient-to-b from-white via-slate-50/60 to-slate-100/50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.04)]"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full text-left px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl active:translate-y-[0.5px]"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-50 to-blue-100/80 border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(37,99,235,0.1)] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-blue-800 bg-gradient-to-b from-blue-50 to-blue-100/60 px-2 py-0.5 rounded-md border-t border-t-white border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                      {faq.badge}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5 truncate sm:whitespace-normal">
                    {faq.question}
                  </div>
                </div>
              </div>
              <div className="w-6 h-6 rounded-md bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.05)] flex items-center justify-center flex-shrink-0">
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-blue-600 font-bold" : ""
                  }`}
                />
              </div>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-3 border-t border-slate-200/80">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
