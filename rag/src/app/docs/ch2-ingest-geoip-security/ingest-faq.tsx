"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Database,
  Lock,
  Zap,
  Globe,
  FileCode,
  CheckCircle2,
  Server,
  AlertTriangle,
  Fingerprint,
} from "lucide-react";

interface FAQItem {
  question: string;
  category: string;
  badge: string;
  badgeColor: string;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    question: "Why can't we just call Google or commercial cloud APIs for IP locations?",
    category: "SOVEREIGN AIR-GAP",
    badge: "ZERO INTERNET",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
        <p>
          In a classified intelligence environment, <strong>external internet queries are strictly forbidden</strong>.
        </p>
        <p>
          If our system made outbound requests to public APIs (like Google Maps, ipinfo.io, or WHOIS servers), foreign internet service providers and cloud companies would instantly see <strong>which IP addresses and cryptocurrency suspects Indian intelligence is tracking</strong>.
        </p>
        <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-emerald-900 font-medium">
          🛡️ <strong>The NTRO Sovereign Solution:</strong> We package full offline copies of MaxMind City and ASN databases directly in RAM. Every IP is geolocated in under 0.05 milliseconds without ever transmitting a single network packet outside the classified room.
        </div>
      </div>
    ),
  },
  {
    question: "Why did an evidence file upload return 'HTTP 409 Conflict'?",
    category: "ANTI-DUPLICATE SHIELD",
    badge: "0.01s PROTECTION",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
        <p>
          Your upload returned <strong>HTTP 409 Conflict</strong> because the exact same evidence file was already ingested within the past 24 hours.
        </p>
        <p>
          When an investigator drops a file, our engine calculates its unique <strong>SHA-256 digital fingerprint</strong> in real time. If the fingerprint matches an already-processed file, the system immediately rejects the duplicate in <strong>0.01 seconds</strong> and purges the temporary upload.
        </p>
        <p>
          💡 <strong>Why this matters:</strong> This prevents accidental duplicate uploads from choking server RAM, triggering duplicate background worker storms, or confusing teammates with duplicate investigation alerts.
        </p>
      </div>
    ),
  },
  {
    question: "What happens if an IP is a private local Wi-Fi address (like 192.168.1.1)?",
    category: "NETWORK RESOLUTION",
    badge: "DUAL-HOP RADAR",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
        <p>
          Evidence seized from local office routers often lists internal private IPs (such as <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">192.168.1.104</code> or <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">10.0.0.5</code>). These private addresses have no physical country on their own.
        </p>
        <p>
          Instead of giving up and returning &quot;Unknown&quot;, our engine activates <strong>Smart Dual-Hop Resolution</strong>:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-slate-700">
          <li>The engine detects that the source IP is an internal private network address.</li>
          <li>It instantly hops over to inspect the transaction&apos;s <strong>destination relay node IP</strong>.</li>
          <li>It resolves the external gateway, identifying the suspect&apos;s physical country, city, and telecommunications provider (ISP).</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does the system handle corrupted or malicious rows in a 100k-row dump?",
    category: "ZERO-TRUST SAFETY",
    badge: "AIRPORT SCANNER",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
        <p>
          Seized hard drives are notoriously messy — they frequently contain corrupted data rows, truncated Bitcoin addresses, or poisoned test payloads.
        </p>
        <p>
          Our engine uses <strong>strict 14-field Pydantic validation</strong> that works like an airport luggage scanner:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>Pre-Commit Inspection:</strong> Every transaction is checked for strict 64-character hex transaction IDs, valid Bitcoin address formats, and logical non-negative fees.
          </li>
          <li>
            <strong>Quarantine Buffer:</strong> If 50 rows out of 100,000 fail validation, those 50 rows are safely quarantined into an audit log for manual inspection.
          </li>
          <li>
            <strong>Zero Crashes:</strong> The remaining 99,950 legitimate records continue streaming into the database without interruption or pipeline failure.
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "Why is our ingestion engine 26x faster than conventional tools?",
    category: "PERFORMANCE ADVANTAGE",
    badge: "11,938 ROWS/SEC",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
        <p>
          Most government systems and standard web frameworks use an ORM (Object-Relational Mapper). When ingesting 100,000 records, an ORM translates each row one by one, submitting 100,000 separate SQL queries. This chokes the server down to ~450 rows/sec and takes nearly 4 minutes.
        </p>
        <p>
          Our pipeline uses <strong>Direct PostgreSQL Wire-Protocol Streaming (Bulk COPY)</strong>:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            Instead of submitting rows individually, our engine writes clean micro-batches directly into PostgreSQL storage pages in one continuous stream.
          </li>
          <li>
            Ingestion achieves a measured <strong>11,938 transactions per second</strong>, processing 100,000 transactions in just <strong>8.38 seconds</strong>.
          </li>
          <li>
            Memory stays capped at a tiny <strong>18 MB of RAM</strong>, preventing out-of-memory crashes on portable field laptops.
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "Can an investigator re-upload a file if new transaction logs are added?",
    category: "OPERATIONAL PROTOCOL",
    badge: "SMART RE-INGEST",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
        <p>
          <strong>Yes, absolutely.</strong> The digital fingerprint evaluates the actual data inside the file, not just the filename:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-slate-700">
          <li>
            <strong>Updated Evidence:</strong> If an investigator appends new transaction records to a seized drive, the computed SHA-256 fingerprint automatically changes. The engine recognizes it as a new batch and admits it immediately.
          </li>
          <li>
            <strong>24-Hour Expiry:</strong> File locks automatically expire after 24 hours.
          </li>
          <li>
            <strong>Database Protection:</strong> Even if an overlapping file is processed, our database primary key constraint guarantees that existing transactions are never duplicated.
          </li>
        </ul>
      </div>
    ),
  },
];

export function IngestFaq() {
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
            className={`card-tactical rounded-xl border transition-all overflow-hidden ${
              isOpen
                ? "border-slate-300 ring-1 ring-slate-900/5 bg-white shadow-xs"
                : "border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white shadow-xs"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="w-full p-4 sm:p-4.5 text-left flex items-start justify-between gap-4 cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {faq.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${faq.badgeColor}`}
                  >
                    {faq.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {faq.question}
                </h4>
              </div>

              <div
                className={`p-1.5 rounded-lg text-slate-400 transition-transform shrink-0 mt-0.5 ${
                  isOpen ? "rotate-180 text-slate-800 bg-slate-100" : ""
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 pt-1 border-t border-slate-100 animate-in fade-in-50 duration-150">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
