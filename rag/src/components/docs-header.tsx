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
  Menu,
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

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent("ntro:toggle-docs-sidebar"));
  };

  return (
    <header className="h-[64px] border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-5 lg:px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] select-none">
      {/* Left: Mobile Menu Trigger + Category & Chapter No -> Vertical Divider -> Title */}
      <div className="flex-1 flex items-center space-x-2 sm:space-x-3.5 min-w-0 mr-2 sm:mr-4 lg:mr-6">
        {/* Mobile Hamburger Trigger (< lg only) */}
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-slate-200/80 bg-slate-50/80 shadow-2xs"
          aria-label="Toggle navigation sidebar"
          title="Toggle Navigation"
        >
          <Menu className="w-4 h-4 text-slate-700" />
        </button>

        {/* Category & Chapter Badge */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0 font-mono text-[11px] sm:text-[11.5px]">
          <span className="hidden md:inline font-semibold text-slate-600 tracking-wide uppercase">
            {current.category}
          </span>
          <span className="hidden md:inline text-slate-300">·</span>
          <span className="font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded-[4px] border border-slate-300/90 shadow-2xs whitespace-nowrap">
            {current.num === "AI" ? "AI ASSISTANT" : `CH ${current.num}`}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 sm:h-6 w-[1.5px] bg-slate-300 flex-shrink-0" />

        {/* Chapter Title (Takes full available width, large crisp font-bold) */}
        <h1 className="flex-1 text-sm sm:text-base md:text-lg lg:text-[22px] xl:text-[24px] font-bold text-slate-950 tracking-tight truncate">
          {current.title}
        </h1>
      </div>

      {/* Right Navigation & Instrument Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
        {/* Prev Chapter Link / Button */}
        {prevChapter ? (
          <Link
            href={prevChapter.href}
            title={`Previous: ${prevChapter.title}`}
            className="btn-tactical-secondary inline-flex items-center space-x-1 px-2 sm:px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center space-x-1 px-2 sm:px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-300 bg-slate-50 border border-slate-200/60 opacity-60 cursor-not-allowed"
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
            className="btn-tactical-secondary inline-flex items-center space-x-1 px-2 sm:px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-800 cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center space-x-1 px-2 sm:px-3 py-[6px] rounded-[7px] text-[12px] font-semibold text-slate-300 bg-slate-50 border border-slate-200/60 opacity-60 cursor-not-allowed"
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

