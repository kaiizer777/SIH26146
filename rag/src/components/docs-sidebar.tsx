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
    <aside className="w-[320px] flex-shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-slate-50/95 via-slate-50/60 to-slate-100/80 flex flex-col h-screen sticky top-0 select-none backdrop-blur-sm z-30 overflow-hidden">
      {/* Sovereign Platform Header Identification */}
      <div className="p-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/80 border-x border-x-blue-600/80 border-b border-b-blue-900 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_8px_rgba(29,78,216,0.25)] flex-shrink-0">
              <Database className="w-[17px] h-[17px] text-white" />
            </div>
            <div>
              <div className="text-[11.5px] font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-1.5">
                <span>NTRO Forensic KB</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Node #26146 • Air-Gapped</span>
              </div>
            </div>
          </div>
          <span className="px-[7px] py-[2px] text-[9px] font-mono font-bold bg-blue-50 text-blue-700 rounded-[5px] border border-blue-200/80 shadow-2xs">
            v2.4-SEC
          </span>
        </div>

        {/* Tactical Search / Query Trigger - Fixed in active tactile state with zero hover twitch */}
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
          className="w-full flex items-center justify-between px-2.5 py-[7px] text-[11px] text-slate-700 bg-white border border-slate-300 rounded-[9px] shadow-2xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Search className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-slate-700 font-sans text-[11px]">
              Search technical specs...
            </span>
          </div>
          <kbd className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50/60 px-1.5 py-[1.5px] rounded-[3.5px] border border-blue-200/80 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Chapters Navigation - Gracefully distributed across full 100vh */}
      <div className="flex-1 flex flex-col justify-between px-3 py-3 overflow-y-auto no-scrollbar">
        {CHAPTER_GROUPS.map((group) => (
          <div key={group.group} className="space-y-[5px]">
            <div className="px-[7px] py-[2px] text-[9.5px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <span className="text-blue-600/75 font-bold">{group.prefix}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{group.group}</span>
            </div>
            <div className="space-y-[5px]">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center justify-between px-2.5 py-[8.5px] rounded-[10px] text-[11px] outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      isActive
                        ? "bg-white border border-blue-200/90 shadow-[0_2px_8px_rgba(37,99,235,0.08),0_1px_2px_rgba(15,23,42,0.04)]"
                        : "bg-white border border-slate-200/90 shadow-2xs"
                    }`}
                  >
                    {/* High-Precision Tactile Left Indicator for Active Chapter */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.45)]" />
                    )}

                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-1">
                      <div
                        className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? "bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-white border-t border-t-blue-300/70 border-b border-b-blue-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(29,78,216,0.25)]"
                            : "bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate min-w-0">
                        <div
                          className={`truncate leading-snug tracking-tight text-[13px] ${
                            isActive
                              ? "font-bold text-slate-950"
                              : "font-semibold text-slate-950"
                          }`}
                        >
                          {item.number}. {item.title}
                        </div>
                        <div
                          className={`truncate text-[10.5px] leading-relaxed mt-[1px] ${
                            isActive
                              ? "text-blue-700/85 font-medium"
                              : "text-slate-500 font-normal"
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Right indicator */}
                    {isActive ? (
                      <span className="px-1.5 py-[2px] text-[8.5px] font-mono font-bold rounded-[5px] bg-blue-600 text-white shrink-0 ml-1.5 shadow-[0_1px_3px_rgba(37,99,235,0.3)]">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Air-Gapped Sovereign Security Status Footer */}
      <div className="p-3 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between text-[10px] font-mono text-slate-500 shrink-0">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">AIR-GAP ENCLAVE</span>
        </div>
        <span className="text-[9px] text-slate-400 font-mono tracking-tight">FIPS-140-3</span>
      </div>
    </aside>
  );
}


