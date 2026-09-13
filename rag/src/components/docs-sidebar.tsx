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
  Lock,
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
    <aside className="w-80 flex-shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-slate-50/95 via-slate-50/60 to-slate-100/80 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none backdrop-blur-sm">
      {/* Sovereign Platform Header Identification */}
      <div className="p-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/80 border-x border-x-blue-600/80 border-b border-b-blue-900 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_8px_rgba(29,78,216,0.25)]">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase flex items-center gap-1.5">
                <span>NTRO Forensic KB</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Node #26146 // Air-Gapped</span>
              </div>
            </div>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-900 text-blue-400 rounded border border-slate-700 shadow-2xs">
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
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 hover:ring-2 hover:ring-blue-500/10 rounded-md transition-all shadow-2xs cursor-pointer group"
        >
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-slate-400 group-hover:text-slate-700 font-sans">Search technical specs...</span>
          </div>
          <kbd className="text-[9px] font-mono font-bold text-slate-500 bg-white group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 px-1.5 py-0.5 rounded border border-slate-200 transition-colors">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Chapters Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4 pb-8">
        {CHAPTER_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-2 py-0.5 text-[9.5px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span>// {group.prefix} · {group.group}</span>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all duration-140 ${
                      isActive
                        ? "sidebar-item-active text-slate-950 font-semibold border-l-[3px] border-l-blue-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-950 hover:bg-white/95 hover:border-slate-200/90 border border-transparent hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-140 shadow-2xs ${
                          isActive
                            ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white border-t border-t-blue-400/80 border-b border-b-blue-800"
                            : "bg-slate-100/90 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border group-hover:border-blue-200/80"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className={`truncate font-medium tracking-tight ${isActive ? "text-slate-950 font-semibold" : "text-slate-800 group-hover:text-blue-900"}`}>
                          {item.number}. {item.title}
                        </div>
                        <div className="truncate text-[10px] text-slate-500 font-normal">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Right indicator */}
                    {isActive ? (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-blue-600 text-white shrink-0 ml-1.5 shadow-2xs">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-blue-500 transition-all flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sovereign System Telemetry Status Footer */}
      <div className="p-3 border-t border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-blue-600" />
            <span className="font-semibold text-slate-700">SOVEREIGN AIR-GAP</span>
          </div>
          <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/70">
            0 EGRESS
          </span>
        </div>
      </div>
    </aside>
  );
}


