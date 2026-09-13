"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Server,
  Network,
  GitFork,
  Cpu,
  FileCheck2,
  RefreshCw,
  Terminal,
  Database,
  ChevronRight,
  Search,
  Sparkles,
  Layers,
} from "lucide-react";

interface ChapterItem {
  number: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const CHAPTER_GROUPS: { group: string; prefix: string; items: ChapterItem[] }[] = [
  {
    group: "FOUNDATIONS & INGEST",
    prefix: "01",
    items: [
      {
        number: "01",
        title: "Mission & Architecture",
        subtitle: "NTRO Mandate, Tech Stack & Topology",
        href: "/docs/ch1-mission-architecture",
        icon: Server,
        badge: "Core",
      },
      {
        number: "02",
        title: "Ingest & GeoIP Armor",
        subtitle: "MaxMind, Celery & Ingestion Security",
        href: "/docs/ch2-ingest-geoip-security",
        icon: ShieldAlert,
        badge: "Sec",
      },
    ],
  },
  {
    group: "GRAPH & PATTERN DISCOVERY",
    prefix: "02",
    items: [
      {
        number: "03",
        title: "Graph Topology & Clustering",
        subtitle: "Neo4j GDS & Louvain Modularity",
        href: "/docs/ch3-graph-entity-clustering",
        icon: Network,
        badge: "GDS",
      },
      {
        number: "04",
        title: "Laundering Heuristics",
        subtitle: "Peeling Chains, CoinJoin & Mixers",
        href: "/docs/ch4-peeling-mixing-heuristics",
        icon: GitFork,
        badge: "Rules",
      },
    ],
  },
  {
    group: "MACHINE LEARNING & EVIDENCE",
    prefix: "03",
    items: [
      {
        number: "05",
        title: "Dual Transformer ML Engine",
        subtitle: "FT-Transformer & Graph Transformer",
        href: "/docs/ch5-dual-transformer-ml",
        icon: Cpu,
        badge: "GNN",
      },
      {
        number: "06",
        title: "Multi-Factor Risk & Legal",
        subtitle: "XAI SHAP, GNNExplainer & §65B",
        href: "/docs/ch6-risk-engine-xai-legal",
        icon: FileCheck2,
        badge: "§65B",
      },
    ],
  },
  {
    group: "SYNC & SURVEILLANCE RUNBOOK",
    prefix: "04",
    items: [
      {
        number: "07",
        title: "Live Post-Ingest Sync",
        subtitle: "Phase 11 Online Inference Pipeline",
        href: "/docs/ch7-online-inference-sync",
        icon: RefreshCw,
        badge: "Sync",
      },
      {
        number: "08",
        title: "Command Center & Ops",
        subtitle: "Forensic UI & Local Runbook",
        href: "/docs/ch8-command-center-dev-ops",
        icon: Terminal,
        badge: "Ops",
      },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[356px] flex-shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-slate-50/95 via-slate-50/60 to-slate-100/80 flex flex-col h-screen sticky top-0 select-none backdrop-blur-sm z-30 overflow-hidden">
      {/* Sovereign Platform Header Identification */}
      <div className="p-4 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/80 border-x border-x-blue-600/80 border-b border-b-blue-900 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_8px_rgba(29,78,216,0.25)] flex-shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[13px] font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-1.5">
                <span>NTRO Forensic KB</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Node #26146 • Air-Gapped</span>
              </div>
            </div>
          </div>
          <span className="px-2 py-0.75 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 rounded-md border border-blue-200/80 shadow-2xs">
            v2.4-SEC
          </span>
        </div>

        {/* Tactical Search / Query Trigger */}
        <button
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
                bubbles: true,
              })
            );
          }}
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 bg-white border border-blue-300 ring-2 ring-blue-500/10 hover:border-blue-400 hover:ring-blue-500/20 rounded-xl transition-all shadow-2xs cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <Search className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors flex-shrink-0" />
            <span className="text-slate-700 group-hover:text-slate-900 font-sans text-xs">Search technical specs...</span>
          </div>
          <kbd className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 group-hover:bg-blue-100/70 group-hover:text-blue-800 px-2 py-0.5 rounded border border-blue-200 transition-colors">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Chapters Navigation - Gracefully distributed across full 100vh */}
      <div className="flex-1 flex flex-col justify-between px-3.5 py-3.5 overflow-y-auto no-scrollbar">
        {CHAPTER_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1.5">
            <div className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span>{group.prefix} · {group.group}</span>
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-140 ${
                      isActive
                        ? "sidebar-item-active text-slate-950 font-semibold border-l-[3.5px] border-l-blue-600 shadow-xs bg-white"
                        : "text-slate-600 hover:text-slate-950 hover:bg-white/95 hover:border-slate-200/90 border border-transparent hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-140 shadow-2xs ${
                          isActive
                            ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white border-t border-t-blue-400/80 border-b border-b-blue-800"
                            : "bg-slate-100/90 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border group-hover:border-blue-200/80"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className={`truncate font-bold leading-snug tracking-tight ${isActive ? "text-slate-950 text-[13px]" : "text-slate-800 text-[13px] group-hover:text-blue-900"}`}>
                          {item.number}. {item.title}
                        </div>
                        <div className="truncate text-[11px] text-slate-500 font-normal leading-relaxed mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Right indicator */}
                    {isActive ? (
                      <span className="px-2 py-0.5 text-[9.5px] font-mono font-bold rounded-md bg-blue-600 text-white shrink-0 ml-2 shadow-2xs">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-blue-500 transition-all flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}


