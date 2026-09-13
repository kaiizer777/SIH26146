"use client";

import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  Search,
  Bot,
  Layers,
} from "lucide-react";

const CHAPTER_MAP: Record<string, { num: string; name: string }> = {
  "/docs/ch1-mission-architecture": {
    num: "01",
    name: "Mission & System Topology",
  },
  "/docs/ch2-ingest-geoip-security": {
    num: "02",
    name: "Ingest, GeoIP & Anti-Duplicate Armor",
  },
  "/docs/ch3-graph-entity-clustering": {
    num: "03",
    name: "Graph Topology & Entity Clustering",
  },
  "/docs/ch4-peeling-mixing-heuristics": {
    num: "04",
    name: "Laundering Heuristics & Mixers",
  },
  "/docs/ch5-dual-transformer-ml": {
    num: "05",
    name: "Dual Transformer ML Engine",
  },
  "/docs/ch6-risk-engine-xai-legal": {
    num: "06",
    name: "Multi-Factor Risk & §65B Legal",
  },
  "/docs/ch7-online-inference-sync": {
    num: "07",
    name: "Live Post-Ingest Sync (Phase 11)",
  },
  "/docs/ch8-command-center-dev-ops": {
    num: "08",
    name: "Command Center & Local Runbook",
  },
  "/assistant": {
    num: "AI",
    name: "RAG Knowledge Base & Doubt Solver",
  },
};

export function DocsHeader() {
  const pathname = usePathname();
  const current = CHAPTER_MAP[pathname] || {
    num: "01",
    name: "Mission & System Topology",
  };

  const openAssistant = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <header className="h-14 border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] relative">
      {/* Left Context: System State */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
        <span className="hidden md:inline font-semibold text-slate-700 tracking-wider uppercase text-[11px]">
          Sovereign Docs
        </span>
      </div>

      {/* Middle: Chapter Progress / Context Indicator */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100/90 px-3 py-1 rounded-md border border-slate-200/80 shadow-2xs max-w-[55vw] truncate">
        <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/70 shadow-2xs shrink-0">
          CHAPTER {current.num}/08
        </span>
        <span className="text-slate-300 shrink-0">•</span>
        <span className="text-slate-900 font-medium truncate">
          {current.name}
        </span>
      </div>

      {/* Right Action: AI Assistant Trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={openAssistant}
          type="button"
          className="btn-tactical-secondary text-slate-800 text-xs font-mono font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 cursor-pointer shadow-2xs hover:text-blue-900 hover:border-blue-300 group"
          title="Open Forensic Assistant (Ctrl+K)"
        >
          <Bot className="w-3.5 h-3.5 text-blue-600 group-hover:scale-105 transition-transform" />
          <span className="hidden sm:inline">Ask AI</span>
          <kbd className="text-[9px] font-mono font-bold bg-slate-200/80 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 px-1 py-0.2 rounded border border-slate-300/80 transition-colors">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
}

