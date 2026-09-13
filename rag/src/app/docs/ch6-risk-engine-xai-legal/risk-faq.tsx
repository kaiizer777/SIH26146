"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Scale,
  Lock,
  Search,
  CheckCircle2,
  FileCode,
  Network,
  AlertTriangle,
  Gavel,
  BookOpen,
  Cpu,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  category: "PITCH_DEFENSE" | "LEGAL_COURT" | "SCORING_LOGIC" | "EXPLAINABLE_AI";
  badgeText: string;
  oneLinerAnswer: string;
  detailedAnswer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: "explain-to-judge-30s",
    question: "How do you explain this entire system to a judge in 30 seconds?",
    category: "PITCH_DEFENSE",
    badgeText: "30-SECOND PITCH",
    oneLinerAnswer: "We turn complex Bitcoin transactions into an itemized, tamper-proof legal receipt with a single 0–100% danger score.",
    detailedAnswer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p>
          &ldquo;Your Honor, criminals use Bitcoin because they believe peeling chains and mixers make them invisible. Our system does three simple things:
        </p>
        <ol className="list-decimal pl-4 space-y-1 text-slate-800 font-medium">
          <li><strong>Combines 3 Signals:</strong> It checks known laundering tricks (40%), neural network AI (40%), and high-risk foreign hosters (20%) into one clear 0–100% danger rating.</li>
          <li><strong>No Black Box:</strong> Like an itemized grocery receipt, it lists exactly which factors raised the score (e.g. 98% funds peeled in 12 seconds).</li>
          <li><strong>Stamped for Indian Courts:</strong> It automatically prints an official Section 65B certificate with a cryptographic seal that breaks if anyone alters even a single byte.&rdquo;</li>
        </ol>
      </div>
    ),
  },
  {
    id: "why-not-chatgpt-court",
    question: "Why can't we just use ChatGPT or an LLM to write the forensic court reports?",
    category: "LEGAL_COURT",
    badgeText: "ZERO HALLUCINATIONS",
    oneLinerAnswer: "LLMs invent facts and give different words every time; Indian courts require 100% deterministic, reproducible truth.",
    detailedAnswer: (
      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <p>
          Large Language Models operate on probabilities—if you ask ChatGPT the same question twice, you get different wording. In a criminal prosecution, that is fatal for two reasons:
        </p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong>Perjury Risk:</strong> If an AI hallucinates a non-existent wallet or mixes up a transaction ID, the investigating officer signing the affidavit can be charged with perjury under Section 193 of the Indian Penal Code (IPC) / Section 227 BNS.
          </li>
          <li>
            <strong>Deterministic Templates Win:</strong> We use rigid, mathematically locked templates. If peeling hops &ge; 5 and ratio &gt; 85%, the system prints the exact verified mathematical statement. If the defense re-runs the analysis 10 years later on another PC, they get the exact same sentence down to the letter.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "defense-attorney-black-box",
    question: "What happens if a defense attorney argues: 'Your AI is an untrustworthy black box'?",
    category: "EXPLAINABLE_AI",
    badgeText: "BLACK-BOX DEFENSE",
    oneLinerAnswer: "We don't show an AI guess; we hand the court an itemized SHAP receipt where every percentage point is tied to real Bitcoin blockchain records.",
    detailedAnswer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p>
          Under Section 45 of the Indian Evidence Act (expert testimony), a prosecutor cannot say &ldquo;the AI model said he is guilty.&rdquo; The defense will rightfully object.
        </p>
        <p>
          Instead, we present an <strong>itemized SHAP attribution receipt</strong>:
        </p>
        <div className="p-3.5 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)] font-mono text-[11px] text-slate-800 space-y-1">
          <div>&bull; +28% Danger: 98.4% of funds swept to secret change wallet</div>
          <div>&bull; +19% Danger: Payer bumped mempool fee by 8.2x for panic confirmation</div>
          <div>&bull; +18% Danger: Broadcast routed via offshore bulletproof ASN</div>
          <div>&bull; -3% Relief: Used standard SegWit address format</div>
        </div>
        <p>
          Every single factor is provable from raw Bitcoin blockchain data that any independent expert can inspect.
        </p>
      </div>
    ),
  },
  {
    id: "why-three-ingredient-formula",
    question: "Why combine Heuristics (40%) + AI (40%) + GeoIP (20%) instead of relying 100% on AI?",
    category: "SCORING_LOGIC",
    badgeText: "DEFENSE IN DEPTH",
    oneLinerAnswer: "Criminal syndicates can sometimes fool one layer, but they cannot fool all three layers at the same time.",
    detailedAnswer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p>
          Relying on a single system creates blind spots:
        </p>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong>If we only used AI:</strong> Novel laundering tricks never seen during training might slip past the neural network.
          </li>
          <li>
            <strong>If we only used Heuristics:</strong> Criminals could slightly tweak their transfer sizes from 0.05 BTC to 0.051 BTC to avoid hardcoded rules.
          </li>
          <li>
            <strong>The 3-Pillar Synergy:</strong> By requiring structural rules (40%) + multi-hop neural graph tracing (40%) + network infrastructure intelligence (20%), sophisticated adversaries find it mathematically impossible to camouflage their laundering trails.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "sec65b-vs-sec63-plain-english",
    question: "What is Section 65B, and how does it compare to Section 63 BSA 2023?",
    category: "LEGAL_COURT",
    badgeText: "INDIAN EVIDENCE LAW",
    oneLinerAnswer: "Section 65B was the 1872 rule for electronic printouts; Section 63 BSA is the modernized 2024 law for digital evidence.",
    detailedAnswer: (
      <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p>
          In India, digital files (like computer logs, spreadsheets, or Bitcoin traces) are considered &ldquo;secondary electronic evidence.&rdquo;
        </p>
        <p>
          The Supreme Court ruled in <em>Arjun Panditrao Khotkar (2020)</em> that secondary evidence is completely inadmissible unless accompanied by an official certificate attesting that the computer was operating lawfully and without tampering.
        </p>
        <p>
          In July 2024, India replaced the Indian Evidence Act with the <strong>Bharatiya Sakshya Adhiniyam (BSA) 2023</strong>. Section 63 BSA updated Section 65B to explicitly cover cloud networks, digital hashes, and cryptographic signatures. Our system generates dual citations so the evidence is legally valid regardless of whether the case was filed before or after 2024.
        </p>
      </div>
    ),
  },
];

export function RiskFaq() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    "explain-to-judge-30s": true,
    "why-not-chatgpt-court": true,
  });

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const categories = [
    { key: "ALL", label: "All Questions" },
    { key: "PITCH_DEFENSE", label: "Judge Pitch & 30s" },
    { key: "EXPLAINABLE_AI", label: "Explainable AI (No Black Box)" },
    { key: "LEGAL_COURT", label: "Sec 65B & Indian Law" },
    { key: "SCORING_LOGIC", label: "Scoring Formula (40/40/20)" },
  ];

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCat = selectedCategory === "ALL" || faq.category === selectedCategory;
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.oneLinerAnswer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.badgeText.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="bg-white rounded-xl border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-sky-400/30">
              HACKATHON &amp; JUDGE DEFENSE
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Frequently Asked Questions &amp; Cross-Examination Defense
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Plain-English answers for non-technical teammates, hackathon judges, and courtroom cross-examination
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 text-xs font-mono border-t border-t-slate-700 border-x border-x-slate-700 border-b border-b-slate-600 shadow-inner focus:outline-hidden focus:border-slate-500"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all ${
              selectedCategory === cat.key
                ? "bg-slate-900 text-white font-bold border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.3)]"
                : "bg-white text-slate-800 font-medium border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      <div className="divide-y divide-slate-200">
        {filteredFaqs.map((faq) => {
          const isOpen = Boolean(openIds[faq.id]);
          return (
            <div key={faq.id} className="transition-colors">
              <button
                onClick={() => toggleAccordion(faq.id)}
                className={`w-full text-left px-5 py-4 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                  isOpen ? "bg-slate-50/70" : "bg-white"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
                      {faq.badgeText}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 leading-snug">
                    {faq.question}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-1 font-normal">
                    {faq.oneLinerAnswer}
                  </p>
                </div>

                <div
                  className={`mt-1 w-6 h-6 rounded flex items-center justify-center text-slate-500 transition-transform duration-200 ${
                    isOpen ? "transform rotate-180 text-slate-900 bg-slate-200/80" : ""
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 bg-white border-t border-slate-100">
                  <div className="p-3 bg-gradient-to-b from-blue-50 to-blue-100/40 border-t border-t-blue-100 border-x border-x-blue-200/70 border-b border-b-blue-200 rounded-lg text-xs font-medium text-blue-950 mb-3 shadow-2xs">
                    <strong>TL;DR: </strong>{faq.oneLinerAnswer}
                  </div>
                  {faq.detailedAnswer}
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            No matching questions found for &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
