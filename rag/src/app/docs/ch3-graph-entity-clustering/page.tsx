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
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Graph Topology &amp; Entity Clustering: The Detective&apos;s Pinboard</h2>
            <p className="text-xs text-slate-500 font-mono">Unmasking organized cybercrime syndicates by connecting pseudonymous wallets, transactions, and IPs</p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-tactical rounded-xl p-4 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center flex-shrink-0"><Network className="w-4 h-4 text-amber-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">The Problem</span>
                <h3 className="text-sm font-bold text-slate-950">The Detective&apos;s Corkboard &amp; Red Yarn</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Like pinning suspect photos, receipts, and crime scenes with red yarn, Neo4j links wallets, payments, and IPs. Multi-hop money trails are traced in 15ms without locking the database.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-amber-900 bg-amber-50/70 p-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>Sub-15ms multi-hop traversal reveals networks across 24,000+ nodes.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center flex-shrink-0"><GitMerge className="w-4 h-4 text-emerald-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">The Superpower</span>
                <h3 className="text-sm font-bold text-slate-950">The &quot;Pizza Bill&quot; Rule (Common-Input)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If a diner settles one bill by swiping two cards together, both belong to the same person. Spending from multiple Bitcoin inputs at once mathematically proves single-syndicate control.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-emerald-900 bg-emerald-50/70 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Mathematical proof clusters 24,673 burner addresses into 9,794 syndicates.</span>
            </div>
          </div>
        </div>

        {/* 3 Threat / Challenge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="card-tactical rounded-xl p-3.5 bg-white border border-slate-200/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">1. Sybil Smoke Screen</span>
              <Users className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Thousands of Burner Wallets</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Endless disposable wallets create the illusion of independent actors, baffling tabular databases.</p>
          </div>

          <div className="card-tactical rounded-xl p-3.5 bg-white border border-slate-200/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">2. Multi-Hop Maze</span>
              <Network className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Deep Laundering Paths</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Laundering spreads across 10-20 hops; recursive SQL joins stall and crash during live raids.</p>
          </div>

          <div className="card-tactical rounded-xl p-3.5 bg-white border border-slate-200/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">3. Mixer Poisoning</span>
              <ShieldAlert className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">False Clustering Risks</h3>
            <p className="text-xs text-slate-600 leading-relaxed">CoinJoin mixers blend crowd funds. Smart output filtering prevents innocent citizens from false clustering.</p>
          </div>
        </div>

        {/* 4-Column Grounded KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Wallets Mapped</div>
            <div className="text-lg font-mono font-bold text-slate-950">24,673 Addrs</div>
            <div className="text-[10.5px] text-emerald-700 font-medium">100% clustered into syndicates</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Discovered Syndicates</div>
            <div className="text-lg font-mono font-bold text-amber-700">9,794 Entities</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Ransomware, peeling, &amp; OTC</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Clustering Time</div>
            <div className="text-lg font-mono font-bold text-sky-700">6.95 Seconds</div>
            <div className="text-[10.5px] text-slate-500 font-medium">In-memory Louvain CPU engine</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Connection Pruning</div>
            <div className="text-lg font-mono font-bold text-emerald-700">50% RAM Saved</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Alphabetical edge sorting</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive or Visual Core */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">02</div>
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
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Architecture Breakdown: The Dynamic Duo (PostgreSQL + Neo4j)</h2>
            <p className="text-xs text-slate-500 font-mono">Why separating immutable records from graph relationships guarantees lightning-fast forensic analysis</p>
          </div>
        </div>

        <div className="card-tactical rounded-xl p-5 bg-white border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">01</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">PostgreSQL Evidence Vault</h3>
                    <span className="text-[10px] font-mono font-semibold text-blue-700 uppercase">Immutable Storage</span>
                  </div>
                </div>
                <HardDrive className="w-4 h-4 text-blue-600" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Sub-10ms lookups:</strong> Instantly retrieves raw TXIDs, UTC timestamps, and block numbers.</li>
                <li><strong>11,938 rows/sec:</strong> High-throughput binary ingestion upholding Section 65B court evidence.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">02</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Neo4j GDS Graph Engine</h3>
                    <span className="text-[10px] font-mono font-semibold text-purple-700 uppercase">Relationship Detective</span>
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

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs"><CheckCircle2 className="w-4 h-4 text-white" /></div>
              <p className="text-xs text-slate-700">
                <strong>Best of Both Worlds:</strong> Decoupling flat storage from graph intelligence delivers sub-15ms multi-hop queries across millions of transactions with zero GPU cost.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 whitespace-nowrap">
              6.95s Louvain • 15ms Multi-Hop
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">04</div>
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
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">05</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Frequently Asked Questions (Teammate Cheat Sheet)</h2>
            <p className="text-xs text-slate-500 font-mono">Direct, concise answers to technical and investigative questions asked during reviews and evaluator demos</p>
          </div>
        </div>
        <GraphFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/docs/ch2-ingest-geoip-security" className="p-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs">
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 2: Ingest, GeoIP &amp; Anti-Duplicate Armor</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-500">NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH03</div>
        <Link href="/docs/ch4-peeling-mixing-heuristics" className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs">
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 4: Peeling Chains &amp; Mixing Heuristics</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
