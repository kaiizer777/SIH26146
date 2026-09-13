import React from "react";
import Link from "next/link";
import { Radio, Activity, ShieldAlert, AlertTriangle, Zap, Sparkles, ShieldCheck, Database, BadgeCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { SyncPlayground } from "./sync-playground";
import { SyncSequenceDiagram } from "./sync-sequence-diagram";

export const metadata = {
  title: "Chapter 7: The Watchtower — Real-Time Mempool Sniffing & Live Graph Sync — NTRO KB",
  description: "Plain-English specification for the NTRO Watchtower: sniffing the Bitcoin Mempool in under 5ms and live Neo4j graph sync in under 850ms.",
};

export default function Chapter7Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">07</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Watchtower: Real-Time Mempool Sniffing &amp; Live Graph Sync</h2>
            <p className="text-xs text-slate-500 font-mono">Catching Bitcoin money laundering before blocks are mined — closing the fatal 10-minute blind spot</p>
          </div>
        </div>

        {/* 2 Relatable Real-World Analogies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-5 bg-gradient-to-b from-white via-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border-t border-t-indigo-100 border-x border-x-indigo-200 border-b border-b-indigo-300 shadow-[0_1px_3px_rgba(99,102,241,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center flex-shrink-0">
                <Radio className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider">The Mempool Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">The Airport Boarding Lounge</h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Miners take ~10 minutes to bundle transactions into blocks. The Mempool is the pre-flight gate: our Watchtower inspects suspicious luggage before the flight departs.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-indigo-950 bg-gradient-to-b from-indigo-50/90 to-indigo-100/50 border border-indigo-200/80 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span>Intercepts illicit transfers in &lt;5ms while funds remain trapped in transit.</span>
            </div>
          </div>

          <div className="rounded-xl p-5 bg-gradient-to-b from-white via-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-[0_1px_3px_rgba(16,185,129,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">The Live Sync Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">Live Flight Radar vs Printed Logs</h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Legacy tools check printed logs hours after criminals flee. Our live graph operates like real-time air traffic radar, moving detective pins and scores in &lt;850ms.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-950 bg-gradient-to-b from-emerald-50/90 to-emerald-100/50 border border-emerald-200/80 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Sub-second Neo4j updates without disrupting active forensic investigations.</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase shadow-2xs">1. The Threat</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">10-Minute Escape Hatch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Laundering bots immediately peel unconfirmed change into privacy mixers before block #1 confirms.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase shadow-2xs">2. The Trick</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Fee Replacement (RBF)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Syndicates broadcast higher-fee replacement txs mid-flight to redirect outputs and evade monitors.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase shadow-2xs">3. The Solution</span>
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Zero-Conf Interception</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inline quantized models score transactions in &lt;5ms, broadcasting provisional alerts to freeze accounts.
            </p>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_5px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Mempool Sniff Latency</div>
            <div className="text-xl font-mono font-bold text-slate-950 tracking-tight">&lt; 5ms</div>
            <div className="text-[11px] text-slate-600 font-medium">ZeroMQ wire packet intercept</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_5px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Tactical Lead Time</div>
            <div className="text-xl font-mono font-bold text-slate-950 tracking-tight">10-Min Headstart</div>
            <div className="text-[11px] text-slate-600 font-medium">Alerts fire before block confirmation</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_5px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Graph Update Latency</div>
            <div className="text-xl font-mono font-bold text-emerald-700 flex items-center gap-1.5 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />&lt; 850ms
            </div>
            <div className="text-[11px] text-slate-600 font-medium">Sub-second Neo4j edge insertion</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_5px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Investigator Push</div>
            <div className="text-xl font-mono font-bold text-slate-950 tracking-tight">&lt; 100ms</div>
            <div className="text-[11px] text-slate-600 font-medium">Instant WebSocket UI streaming</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Live Mempool Sniffing & Sync Simulator */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">02</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Live Mempool Sniffing &amp; Sync Simulator</h2>
            <p className="text-xs text-slate-500 font-mono">Simulate zero-conf transaction arrival, inline AI risk scoring, and real-time graph edge propagation</p>
          </div>
        </div>
        <SyncPlayground />
      </section>

      {/* SECTION 3: Plain-English Concept Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Secret Sauce: Zero-Conf Sniffing &amp; Delta Graph Sync</h2>
            <p className="text-xs text-slate-500 font-mono">Tapping raw P2P broadcasts and updating the detective pinboard without crashing active analyst queries</p>
          </div>
        </div>

        <div className="rounded-xl p-6 bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Pre-Mining Zero-Conf Sniffing */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-indigo-50/70 via-indigo-50/40 to-white border-t border-t-indigo-100 border-x border-x-indigo-200 border-b border-b-indigo-300 shadow-[0_2px_6px_rgba(99,102,241,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">01</div>
                  <div><h3 className="text-sm font-bold text-slate-900">Pre-Mining Zero-Conf Sniffing</h3><span className="text-[10px] font-mono font-semibold text-indigo-700 uppercase">The P2P Wire Tap</span></div>
                </div>
                <Radio className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                Taps Bitcoin node gossip streams via ZeroMQ sockets before miners assemble blocks:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong className="text-slate-900">Wire Decoding:</strong> Unpacks raw inputs, outputs, fee rates, and locktimes in &lt;1.2ms.</li>
                <li><strong className="text-slate-900">Inline Triage:</strong> Quantized models evaluate 18 features in 3.8ms, flagging peeling bursts.</li>
                <li><strong className="text-slate-900">Provisional Tag:</strong> Emits an amber status flag ensuring full Section 65B compliance.</li>
              </ul>
            </div>

            {/* Card 2: Incremental Subgraph Updates */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-emerald-50/70 via-emerald-50/40 to-white border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-[0_2px_6px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">02</div>
                  <div><h3 className="text-sm font-bold text-slate-900">Incremental Subgraph Updates</h3><span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase">Delta Graph Streaming</span></div>
                </div>
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                Updates the Neo4j graph cleanly without locking tables or interrupting active investigators:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong className="text-slate-900">Thread Safety:</strong> Re-entrant locks prevent read/write collisions during active queries.</li>
                <li><strong className="text-slate-900">Surgical Delta Merges:</strong> Only modified wallet nodes and flow edges are updated in &lt;850ms.</li>
                <li><strong className="text-slate-900">Auto-Finalization:</strong> Flips seamlessly from Provisional to Certified once blocks confirm.</li>
              </ul>
            </div>
          </div>

          {/* Why It Matters Takeaway Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs border-t border-t-emerald-300/60 border-b border-b-emerald-700">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Why It Matters: Eliminates the 10-Minute Escape Hatch</div>
                <p className="text-[11px] text-slate-600 font-medium">Detects illicit hops in &lt;5ms • Updates criminal graph in &lt;850ms • Closes getaway windows completely.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
              Lead: 10-Minute Advantage
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">04</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">End-to-End Watchtower Event Lifecycle</h2>
            <p className="text-xs text-slate-500 font-mono">Step through the 5-phase journey from P2P network broadcast to atomic graph commit and forensic alert</p>
          </div>
        </div>
        <SyncSequenceDiagram />
      </section>



      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch6-risk-engine-xai-legal"
          className="p-2.5 px-4 rounded-lg bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] text-slate-700 text-xs font-medium flex items-center gap-2.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 6: Risk Engine &amp; Legal Dossier</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-500 font-medium">NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH07</div>
        <Link
          href="/docs/ch8-command-center-dev-ops"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 8: Command Center &amp; Ops</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white ml-2" />
        </Link>
      </div>
    </article>
  );
}
