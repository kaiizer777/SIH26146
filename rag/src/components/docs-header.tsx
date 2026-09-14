"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Server,
  ShieldAlert,
  Network,
  GitFork,
  Cpu,
  FileCheck2,
  RefreshCw,
  Terminal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ChapterMeta {
  href: string;
  num: string;
  title: string;
  category: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHAPTER_ORDER: ChapterMeta[] = [
  {
    href: "/docs/ch1-mission-architecture",
    num: "01",
    title: "The NTRO Mission, Tech Stack & System Topology",
    category: "Foundations & Ingest",
    badge: "Core Spec",
    icon: Server,
  },
  {
    href: "/docs/ch2-ingest-geoip-security",
    num: "02",
    title: "Ingest & GeoIP Armor",
    category: "Foundations & Ingest",
    badge: "Ingest Sec",
    icon: ShieldAlert,
  },
  {
    href: "/docs/ch3-graph-entity-clustering",
    num: "03",
    title: "Graph Topology & Entity Clustering (Neo4j GDS)",
    category: "Graph Discovery",
    badge: "Neo4j GDS",
    icon: Network,
  },
  {
    href: "/docs/ch4-peeling-mixing-heuristics",
    num: "04",
    title: "Laundering Pattern Detectors (Peeling-Chains & Mixers)",
    category: "Graph Discovery",
    badge: "Heuristics",
    icon: GitFork,
  },
  {
    href: "/docs/ch5-dual-transformer-ml",
    num: "05",
    title: "Dual Transformer ML Engine",
    category: "ML & Evidence",
    badge: "PyTorch/PyG",
    icon: Cpu,
  },
  {
    href: "/docs/ch6-risk-engine-xai-legal",
    num: "06",
    title: "Multi-Factor Risk Scoring, XAI & Section 65B Legal Dossier",
    category: "ML & Evidence",
    badge: "Legal §65B",
    icon: FileCheck2,
  },
  {
    href: "/docs/ch7-online-inference-sync",
    num: "07",
    title: "Live Post-Ingest Online Inference (Phase 11)",
    category: "Sync & Runbook",
    badge: "Online Sync",
    icon: RefreshCw,
  },
  {
    href: "/docs/ch8-command-center-dev-ops",
    num: "08",
    title: "Forensic Command Center & Local Operator Guide",
    category: "Sync & Runbook",
    badge: "Operations",
    icon: Terminal,
  },
  {
    href: "/assistant",
    num: "AI",
    title: "Forensic Knowledge Base & Intelligence Assistant",
    category: "Neural Copilot",
    badge: "RAG Model",
    icon: Sparkles,
  },
];

export function DocsHeader() {
  const pathname = usePathname();

  const currentIndex = CHAPTER_ORDER.findIndex((c) => c.href === pathname);
  const current =
    currentIndex !== -1
      ? CHAPTER_ORDER[currentIndex]
      : CHAPTER_ORDER[0];

  const prevChapter = currentIndex > 0 ? CHAPTER_ORDER[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < CHAPTER_ORDER.length - 1
      ? CHAPTER_ORDER[currentIndex + 1]
      : null;

  return (
    <header className="h-[64px] border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] select-none">
      {/* Left: Category & Chapter No in 1 line -> Vertical Divider -> Title */}
      <div className="flex-1 flex items-center space-x-3.5 min-w-0 mr-4 sm:mr-6">
        {/* Category & Chapter Badge in 1 line */}
        <div className="flex items-center space-x-2 flex-shrink-0 font-mono text-[11.5px]">
          <span className="font-semibold text-slate-600 tracking-wide uppercase">
            {current.category}
          </span>
          <span className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded-[4px] border border-slate-300/90 shadow-2xs">
            {current.num === "AI" ? "AI ASSISTANT" : `CH ${current.num}`}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-[1.5px] bg-slate-300 flex-shrink-0" />

        {/* Chapter Title (Takes full available width, large crisp font-bold) */}
        <h1 className="flex-1 text-[22px] sm:text-[24px] font-bold text-slate-950 tracking-tight truncate">
          {current.title}
        </h1>
      </div>

      {/* Right Navigation & Instrument Controls */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Prev Chapter Link / Button */}
        {prevChapter ? (
          <Link
            href={prevChapter.href}
            title={`Previous: ${prevChapter.title}`}
            className="btn-tactical-secondary inline-flex items-center space-x-1.5 px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center space-x-1.5 px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-300 bg-slate-50 border border-slate-200/60 opacity-60 cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Prev</span>
          </button>
        )}

        {/* Next Chapter Link / Button */}
        {nextChapter ? (
          <Link
            href={nextChapter.href}
            title={`Next: ${nextChapter.title}`}
            className="btn-tactical-secondary inline-flex items-center space-x-1.5 px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-800 cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center space-x-1.5 px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-300 bg-slate-50 border border-slate-200/60 opacity-60 cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          </button>
        )}

        {/* Security / Node Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-[6px] rounded-[7px] bg-slate-50 border-t border-t-white border-x border-slate-200 border-b border-b-slate-300 text-slate-700 text-[10.5px] font-mono shadow-[0_1px_2px_rgba(0,0,0,0.03)] ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">Air-Gapped Enclave</span>
        </div>

      </div>
    </header>
  );
}

