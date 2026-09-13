"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Scale,
  Activity,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  category: "JUDGES_FAVORITES" | "HOW_IT_WORKS" | "LEGAL_EVIDENCE" | "SPEED_AND_TECH";
  badgeText: string;
  badgeColor: string;
  analogy: string;
  answer: string;
  keyTakeaway: string;
}

const FAQS: FAQItem[] = [
  {
    id: "why-not-wait-for-blockchain",
    question: "Why not just wait 10 minutes for the transaction to confirm on the blockchain?",
    category: "JUDGES_FAVORITES",
    badgeText: "THE 10-MINUTE FATAL FLAW",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    analogy:
      "Waiting for a block is like waiting for a printed bank statement in the mail 10 days after a bank robbery. By then, the getaway car has crossed state borders.",
    answer:
      "Bitcoin blocks take an average of 10 minutes to mine. In high-speed cybercrime, modern money-laundering bots don't wait for confirmation — they spend unconfirmed change outputs immediately across 5 nested hops. If law enforcement waits 10 minutes, the funds have already been swapped into anonymous privacy coins or cashed out at an off-ramp. Our Watchtower catches them in 5 milliseconds while the money is still in the lobby.",
    keyTakeaway: "Waiting 10 minutes means losing the criminal. Catching them in the Mempool preserves the chase.",
  },
  {
    id: "what-is-the-mempool-waiting-room",
    question: "What exactly is the Mempool, and how does the Watchtower sniff it?",
    category: "HOW_IT_WORKS",
    badgeText: "THE WAITING ROOM CONCEPT",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    analogy:
      "The Mempool is the airport departure lounge where passengers gather before boarding the airplane (the mined block).",
    answer:
      "When someone sends Bitcoin, it doesn't appear on the blockchain instantly. It is broadcast to thousands of network nodes and waits in an in-memory queue called the Mempool. The NTRO Watchtower connects directly to this gossip network, listening to raw packet broadcasts. The moment a transaction is announced, our system copies and analyzes it without needing any permission from miners.",
    keyTakeaway: "The Mempool is public, instant, and completely transparent to our real-time listeners.",
  },
  {
    id: "how-can-ai-run-in-under-5ms",
    question: "How can deep learning score complex transactions in under 5 milliseconds?",
    category: "SPEED_AND_TECH",
    badgeText: "SUB-5MS INLINE INFERENCE",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    analogy:
      "Like a veteran border officer spotting a forged passport with a quick glance at key security holograms rather than sending the entire passport to a laboratory.",
    answer:
      "Full graph recalculation across millions of wallets takes time, but initial triage doesn't have to. We deploy a lightweight, quantized FT-Transformer CPU model paired with inline heuristic rules. In under 5 milliseconds, it checks 18 critical parameters: peeling chain ratios, rapid velocity, and known illicit seed lists. This gives investigators an instant provisional verdict while heavy offline graph models run in the background.",
    keyTakeaway: "Fast triage in 5ms; deep structural retraining asynchronously. Best of both worlds.",
  },
  {
    id: "can-criminal-cancel-or-rbf",
    question: "What happens if the criminal cancels or replaces the transaction (Replace-By-Fee)?",
    category: "JUDGES_FAVORITES",
    badgeText: "RBF & DOUBLE-SPEND DEFENSE",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    analogy:
      "A suspect tries to switch get-away cars mid-chase, but the helicopter spotlight tracks the switch in real time.",
    answer:
      "Bitcoin allows transactions to be replaced with a higher fee (Replace-By-Fee, or RBF). If a criminal attempts to cancel or divert their payment, the Watchtower detects the conflicting replacement packet immediately. The Neo4j detective pinboard links both transactions together, exposing the criminal's panic diversion as additional incriminating behavioral evidence.",
    keyTakeaway: "RBF attempts don't fool the Watchtower; they actually give investigators extra behavioral proof.",
  },
  {
    id: "what-is-provisional-dossier-legal",
    question: "What does 'Provisional' mean, and is this legal evidence in court under Section 65B?",
    category: "LEGAL_EVIDENCE",
    badgeText: "STATUTORY INTEGRITY (SEC 65B)",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    analogy:
      "An urgent APB (All-Points Bulletin) sent to patrol cars versus a final certified forensic autopsy report presented at trial.",
    answer:
      "A 'Provisional Dossier' is an unconfirmed alert meant for immediate tactical containment (such as serving an urgent freeze notice under Section 91/102 CrPC). To strictly uphold Section 65B of the Indian Evidence Act and Section 63 of the BSA 2023, our system stamps these alerts with a clear 'Provisional' badge. Once the block is mined 10 minutes later, the system automatically seals the permanent cryptographic hash without human tampering.",
    keyTakeaway: "Immediate operational alerts for police; strict judicial transparency for the judge.",
  },
  {
    id: "live-graph-pinboard-no-crash",
    question: "How does the Neo4j detective pinboard update in real time without freezing or crashing?",
    category: "SPEED_AND_TECH",
    badgeText: "NON-BLOCKING GRAPH SYNC",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    analogy:
      "Adding sticky notes to an ongoing investigation board without knocking over the table or asking everyone to leave the room.",
    answer:
      "Our backend uses re-entrant threading locks (RLock) and atomic in-memory stores. When new Mempool alerts arrive, FastAPI merges the new node and edge into the live graph store in under 1.2ms without blocking analysts who are actively reading or querying existing cases. The frontend updates smoothly via event streams with zero page refreshes.",
    keyTakeaway: "Smooth, zero-lag detective pinboard updates that never interrupt an active investigation.",
  },
];

export function SyncFaq() {
  const [openId, setOpenId] = useState<string>("why-not-wait-for-blockchain");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCat = selectedCategory === "ALL" || faq.category === selectedCategory;
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.analogy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="card-tactical rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              NON-TECHNICAL DEFENSE FAQ
            </span>
            <span className="text-xs text-slate-400 font-mono">JUDGE &amp; TEAMMATE Q&amp;A</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Questions Hackathon Judges Love to Ask (And How to Answer Them)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Clear, jargon-free explanations to defend real-time Mempool sniffing and live graph sync.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        {[
          { id: "ALL", label: "All Questions" },
          { id: "JUDGES_FAVORITES", label: "Judge Favorites" },
          { id: "HOW_IT_WORKS", label: "How It Works" },
          { id: "LEGAL_EVIDENCE", label: "Legal & Court Proof" },
          { id: "SPEED_AND_TECH", label: "Speed & Tech" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer font-semibold ${
              selectedCategory === cat.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={`rounded-xl border transition-all ${
                isOpen
                  ? "border-indigo-300 bg-indigo-50/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <button
                onClick={() => setOpenId(isOpen ? "" : faq.id)}
                className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold border ${faq.badgeColor}`}>
                      {faq.badgeText}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {faq.question}
                  </h4>
                </div>
                <div
                  className={`p-1 rounded-full text-slate-400 transition-transform mt-0.5 shrink-0 ${
                    isOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-slate-100 text-xs leading-relaxed text-slate-700">
                  {/* Analogy Callout */}
                  <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono font-bold uppercase text-[10px] text-amber-900">
                        Visual Analogy:{" "}
                      </span>
                      <span className="text-amber-950 font-medium">{faq.analogy}</span>
                    </div>
                  </div>

                  {/* Main Plain English Answer */}
                  <p className="font-sans text-slate-800 text-[13px] leading-relaxed">
                    {faq.answer}
                  </p>

                  {/* Key Takeaway Banner */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Judge Takeaway:</strong> {faq.keyTakeaway}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500 font-mono">
            No matching questions found for &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
