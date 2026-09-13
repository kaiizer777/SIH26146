import React from "react";
import Link from "next/link";
import { Radio, Activity, ShieldAlert, AlertTriangle, Zap, Sparkles, ShieldCheck, Database, BadgeCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { SyncPlayground } from "./sync-playground";
import { SyncSequenceDiagram } from "./sync-sequence-diagram";
import { SyncFaq } from "./sync-faq";

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
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center flex-shrink-0"><Radio className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider">The Mempool Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">The Airport Boarding Lounge</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Miners take ~10 minutes to bundle transactions into blocks. The Mempool is the pre-flight gate: our Watchtower inspects suspicious luggage before the flight departs.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-indigo-900 bg-indigo-50/70 p-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span>Intercepts illicit transfers in &lt;5ms while funds remain trapped in transit.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center flex-shrink-0"><Activity className="w-4 h-4 text-emerald-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">The Live Sync Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">Live Flight Radar vs Printed Logs</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Legacy tools check printed logs hours after criminals flee. Our live graph operates like real-time air traffic radar, moving detective pins and scores in &lt;850ms.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-emerald-900 bg-emerald-50/70 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Sub-second Neo4j updates without disrupting active forensic investigations.</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">1. The Threat</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">10-Minute Escape Hatch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Laundering bots immediately peel unconfirmed change into privacy mixers before block #1 confirms.
            </p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">2. The Trick</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Fee Replacement (RBF)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Syndicates broadcast higher-fee replacement txs mid-flight to redirect outputs and evade monitors.
            </p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">3. The Solution</span>
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
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Mempool Sniff Latency</div>
            <div className="text-lg font-mono font-bold text-slate-950">&lt; 5ms</div>
            <div className="text-[10.5px] text-slate-500 font-medium">ZeroMQ wire packet intercept</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Tactical Lead Time</div>
            <div className="text-lg font-mono font-bold text-slate-950">10-Min Headstart</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Alerts fire before block confirmation</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Graph Update Latency</div>
            <div className="text-lg font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />&lt; 850ms
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">Sub-second Neo4j edge insertion</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Investigator Push</div>
            <div className="text-lg font-mono font-bold text-slate-950 font-mono">&lt; 100ms</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Instant WebSocket UI streaming</div>
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

        <div className="card-tactical rounded-xl p-6 bg-white border border-slate-200 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Pre-Mining Zero-Conf Sniffing */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">01</div>
                  <div><h3 className="text-sm font-bold text-slate-900">Pre-Mining Zero-Conf Sniffing</h3><span className="text-[10px] font-mono font-semibold text-indigo-700 uppercase">The P2P Wire Tap</span></div>
                </div>
                <Radio className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Taps Bitcoin node gossip streams via ZeroMQ sockets before miners assemble blocks:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Wire Decoding:</strong> Unpacks raw inputs, outputs, fee rates, and locktimes in &lt;1.2ms.</li>
                <li><strong>Inline Triage:</strong> Quantized models evaluate 18 features in 3.8ms, flagging peeling bursts.</li>
                <li><strong>Provisional Tag:</strong> Emits an amber status flag ensuring full Section 65B compliance.</li>
              </ul>
            </div>

            {/* Card 2: Incremental Subgraph Updates */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">02</div>
                  <div><h3 className="text-sm font-bold text-slate-900">Incremental Subgraph Updates</h3><span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase">Delta Graph Streaming</span></div>
                </div>
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Updates the Neo4j graph cleanly without locking tables or interrupting active investigators:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Thread Safety:</strong> Re-entrant locks prevent read/write collisions during active queries.</li>
                <li><strong>Surgical Delta Merges:</strong> Only modified wallet nodes and flow edges are updated in &lt;850ms.</li>
                <li><strong>Auto-Finalization:</strong> Flips seamlessly from Provisional to Certified once blocks confirm.</li>
              </ul>
            </div>
          </div>

          {/* Why It Matters Takeaway Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Why It Matters: Eliminates the 10-Minute Escape Hatch</div>
                <p className="text-[11px] text-slate-500">Detects illicit hops in &lt;5ms • Updates criminal graph in &lt;850ms • Closes getaway windows completely.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800">
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

      {/* SECTION 5: Frequently Asked Questions (Teammate Cheat Sheet) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">05</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Frequently Asked Questions (Teammate Cheat Sheet)</h2>
            <p className="text-xs text-slate-500 font-mono">Defensible answers on zero-conf legal validity, RBF double-spend handling, and real-time Neo4j concurrency</p>
          </div>
        </div>
        <SyncFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch6-risk-engine-xai-legal"
          className="p-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 6: Risk Engine &amp; Legal Dossier</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-500">NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH07</div>
        <Link
          href="/docs/ch8-command-center-dev-ops"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 8: Command Center &amp; Ops</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
