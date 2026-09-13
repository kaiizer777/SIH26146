import React from "react";
import Link from "next/link";
import { Network, GitMerge, HardDrive, Users, ShieldAlert, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { ClusteringSimulator } from "./clustering-simulator";
import { SchemaInspector } from "./schema-inspector";
import { GraphFaq } from "./graph-faq";

export const metadata = {
  title: "Chapter 3: Graph Topology & Entity Clustering — NTRO KB",
  description: "How Neo4j property graphs and the Pizza Bill heuristic cluster thousands of burner wallets into syndicates.",
};

export default function Chapter3Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Graph Topology &amp; Entity Clustering: The Detective&apos;s Pinboard
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Unmasking organized cybercrime syndicates by connecting pseudonymous wallets, transactions, and IPs
            </p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-amber-100 to-amber-50 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(180,83,9,0.12)]">
                <Network className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider">
                  The Problem
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  The Detective&apos;s Corkboard &amp; Red Yarn
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Like pinning suspect photos, receipts, and crime scenes with red yarn, Neo4j links wallets, payments, and IPs. Multi-hop money trails are traced in 15ms without locking the database.
            </p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-semibold text-amber-950 bg-amber-50/90 border border-amber-200/90 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>Sub-15ms multi-hop traversal reveals networks across 24,000+ nodes.</span>
            </div>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-emerald-100 to-emerald-50 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(4,120,87,0.12)]">
                <GitMerge className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
                  The Superpower
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  The &quot;Pizza Bill&quot; Rule (Common-Input)
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If a diner settles one bill by swiping two cards together, both belong to the same person. Spending from multiple Bitcoin inputs at once mathematically proves single-syndicate control.
            </p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-semibold text-emerald-950 bg-emerald-50/90 border border-emerald-200/90 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
              <span>Mathematical proof clusters 24,673 burner addresses into 9,794 syndicates.</span>
            </div>
          </div>
        </div>

        {/* 3 Threat / Challenge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 uppercase tracking-wide">
                1. Sybil Smoke Screen
              </span>
              <Users className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Thousands of Burner Wallets</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Endless disposable wallets create the illusion of independent actors, baffling tabular databases.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 uppercase tracking-wide">
                2. Multi-Hop Maze
              </span>
              <Network className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Deep Laundering Paths</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Laundering spreads across 10-20 hops; recursive SQL joins stall and crash during live raids.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 uppercase tracking-wide">
                3. Mixer Poisoning
              </span>
              <ShieldAlert className="w-4 h-4 text-sky-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">False Clustering Risks</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              CoinJoin mixers blend crowd funds. Smart output filtering prevents innocent citizens from false clustering.
            </p>
          </div>
        </div>

        {/* 4-Column Grounded KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Wallets Mapped</div>
            <div className="text-xl font-mono font-extrabold text-slate-950">24,673 Addrs</div>
            <div className="text-[11px] text-emerald-700 font-semibold">100% clustered into syndicates</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Discovered Syndicates</div>
            <div className="text-xl font-mono font-extrabold text-amber-700">9,794 Entities</div>
            <div className="text-[11px] text-slate-600 font-medium">Ransomware, peeling, &amp; OTC</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Clustering Time</div>
            <div className="text-xl font-mono font-extrabold text-sky-700">6.95 Seconds</div>
            <div className="text-[11px] text-slate-600 font-medium">In-memory Louvain CPU engine</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Connection Pruning</div>
            <div className="text-xl font-mono font-extrabold text-emerald-700">50% RAM Saved</div>
            <div className="text-[11px] text-slate-600 font-medium">Alphabetical edge sorting</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive or Visual Core */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Live Syndicate Detection Simulator</h2>
            <p className="text-xs text-slate-500 font-mono">Step through Louvain community detection to watch scattered burner addresses merge into syndicates</p>
          </div>
        </div>
        <ClusteringSimulator />
      </section>

      {/* SECTION 3: Plain-English Concept Deep-Dive */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Architecture Breakdown: The Dynamic Duo (PostgreSQL + Neo4j)</h2>
            <p className="text-xs text-slate-500 font-mono">Why separating immutable records from graph relationships guarantees lightning-fast forensic analysis</p>
          </div>
        </div>

        <div className="rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/40 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.05)] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-b from-blue-50/80 to-blue-50/30 border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(37,99,235,0.06)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xs border-t border-t-blue-300 border-b border-b-blue-900 shadow-xs">
                    01
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">PostgreSQL Evidence Vault</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-800 uppercase tracking-wider">Immutable Storage</span>
                  </div>
                </div>
                <HardDrive className="w-4 h-4 text-blue-600" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Sub-10ms lookups:</strong> Instantly retrieves raw TXIDs, UTC timestamps, and block numbers.</li>
                <li><strong>11,938 rows/sec:</strong> High-throughput binary ingestion upholding Section 65B court evidence.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-b from-purple-50/80 to-purple-50/30 border-t border-t-purple-100 border-x border-x-purple-200 border-b border-b-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(147,51,234,0.06)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-purple-500 to-purple-700 text-white flex items-center justify-center font-bold text-xs border-t border-t-purple-300 border-b border-b-purple-900 shadow-xs">
                    02
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Neo4j GDS Graph Engine</h3>
                    <span className="text-[10px] font-mono font-bold text-purple-800 uppercase tracking-wider">Relationship Detective</span>
                  </div>
                </div>
                <Network className="w-4 h-4 text-purple-600" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>15-hop paths in 15ms:</strong> Follows money trails across 24,000+ wallets where SQL freezes.</li>
                <li><strong>6.95s Louvain:</strong> Groups burner addresses into syndicates entirely on standard CPU.</li>
              </ul>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_4px_rgba(15,23,42,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 text-white flex items-center justify-center flex-shrink-0 border-t border-t-emerald-300 border-b border-b-emerald-800 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-slate-700">
                <strong>Best of Both Worlds:</strong> Decoupling flat storage from graph intelligence delivers sub-15ms multi-hop queries across millions of transactions with zero GPU cost.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-300/80 text-slate-900 whitespace-nowrap shadow-xs">
              6.95s Louvain • 15ms Multi-Hop
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Interactive Graph Schema &amp; Evidence Inspector</h2>
            <p className="text-xs text-slate-500 font-mono">Explore node labels, relationship edges, and properties powering the forensic intelligence graph</p>
          </div>
        </div>
        <SchemaInspector />
      </section>

      {/* SECTION 5: Frequently Asked Questions (Teammate Cheat Sheet) */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Frequently Asked Questions (Teammate Cheat Sheet)</h2>
            <p className="text-xs text-slate-500 font-mono">Direct, concise answers to technical and investigative questions asked during reviews and evaluator demos</p>
          </div>
        </div>
        <GraphFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch2-ingest-geoip-security"
          className="p-3 px-4 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50 text-slate-800 text-xs font-medium flex items-center gap-3 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.06)] active:translate-y-[0.5px] active:shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)]"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">Previous Chapter</div>
            <div className="font-bold text-slate-900">Ch 2: Ingest, GeoIP &amp; Anti-Duplicate Armor</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-500 font-medium">NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH03</div>
        <Link
          href="/docs/ch4-peeling-mixing-heuristics"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-3 rounded-xl flex items-center gap-3 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_8px_rgba(30,64,175,0.35)] active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-bold">Next Chapter</div>
            <div className="font-bold text-white">Ch 4: Peeling Chains &amp; Mixing Heuristics</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white shrink-0 ml-1" />
        </Link>
      </div>
    </article>
  );
}
