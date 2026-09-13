import React from "react";
import Link from "next/link";
import {
  BrainCircuit, Network, ShieldAlert, Sliders, Clock,
  ShieldCheck, ArrowRight, ArrowLeft, Sparkles, BadgeCheck,
  Zap,
} from "lucide-react";
import { MlBenchmarkMatrix } from "./ml-benchmark-matrix";
import { AttentionMatrix } from "./attention-matrix";

export const metadata = {
  title: "Chapter 5: Dual Transformer ML Engine (Two AI Detectives & 4.8ms Edge Intelligence) — NTRO KB",
  description: "Plain-English guide to the Dual Transformer ML Engine: FT-Transformer tabular audit, Graph Transformer syndicate tracking, and 4.8ms air-gapped CPU speed.",
};

export default function Chapter5Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">01</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Mission: Two AI Detectives for Crypto Forensics</h2>
            <p className="text-xs text-slate-500 font-mono">Why legacy ML failed, and how two collaborating Transformer models operate in 4.8ms on edge CPUs</p>
          </div>
        </div>

        {/* 2 Relatable Real-World Analogies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-5 bg-gradient-to-br from-white to-purple-50/40 border-t border-t-purple-200/80 border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-300/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <BrainCircuit className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-800 uppercase tracking-wider">Detective A (FT-Transformer)</span>
                <h3 className="text-sm font-bold text-slate-950">The Forensic Accountant: Auditing Transaction Traits</h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Scrutinizes 18 numeric traits on each transaction—fee rate spikes, velocity, and change ratios—without blurring clues together. Spots unseen zero-day laundering tricks in 0.0ms.
            </p>
            <div className="pt-2 border-t border-purple-100/90 flex items-center gap-2 text-[11px] font-medium text-purple-950 bg-purple-100/70 border border-purple-200/80 p-2.5 rounded-lg shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-700 flex-shrink-0" />
              <span>Cross-feature self-attention detects multi-variable tricks that slip past static filters.</span>
            </div>
          </div>

          <div className="rounded-xl p-5 bg-gradient-to-br from-white to-blue-50/40 border-t border-t-blue-200/80 border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-300/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Network className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-800 uppercase tracking-wider">Detective B (Graph Transformer)</span>
                <h3 className="text-sm font-bold text-slate-950">The Undercover Agent: Tracking Syndicates</h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Maps how wallets interact across 4 relation lenses: co-spends, mule routes, peeling chains, and shared infrastructure. Mutes benign noise by 10,000x to isolate cartel rings.
            </p>
            <div className="pt-2 border-t border-blue-100/90 flex items-center gap-2 text-[11px] font-medium text-blue-950 bg-blue-100/70 border border-blue-200/80 p-2.5 rounded-lg shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
              <span>Multi-head relational attention yields 94.8% peeling recall and 0.92 F1 score on real forensic data.</span>
            </div>
          </div>
        </div>

        {/* 3 Threat / Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-xl p-4 bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">1. Edge Blindness</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-950">Legacy Graphs Blurred Links</h3>
            <p className="text-xs text-slate-700 leading-relaxed">Standard graph networks treated normal retail transfers identically to peeling hops, letting syndicates hide in plain sight.</p>
          </div>

          <div className="rounded-xl p-4 bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">2. Feature Soup</span>
              <Sliders className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-950">Mashing Clues Into Averages</h3>
            <p className="text-xs text-slate-700 leading-relaxed">Legacy autoencoders blended all 18 traits into a single average, completely washing out subtle fee spikes and change ratios.</p>
          </div>

          <div className="rounded-xl p-4 bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">3. The Cloud Trap</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-950">250ms Black-Box Lag</h3>
            <p className="text-xs text-slate-700 leading-relaxed">Cloud AI models require expensive GPUs, leak classified case intelligence over the web, and introduce unacceptable latency.</p>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Inference Speed", val: "4.8ms CPU Latency", sub: "0.012ms per node on standard laptops" },
            { label: "Forensic Scope", val: "18 Features Analyzed", sub: "Fees, amounts, entropy, IPs, scripts" },
            { label: "Memory Footprint", val: "<45MB RAM Footprint", sub: "Weights under 1.5MB (fits L3 cache)" },
            { label: "Hardware Dependency", val: "0 Cloud GPUs Required", sub: "100% air-gapped sovereign execution", live: true },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3.5 rounded-xl bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase">{kpi.label}</div>
              <div className={`text-lg font-mono font-bold flex items-center gap-1.5 ${kpi.live ? "text-emerald-700" : "text-slate-950"}`}>
                {kpi.live && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                {kpi.val}
              </div>
              <div className="text-[11px] text-slate-600 font-medium">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: Plain-English Concept Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">02</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">How the Two Detectives Collaborate</h2>
            <p className="text-xs text-slate-500 font-mono">Comparing the Forensic Accountant (Tabular) and the Undercover Agent (Graph)</p>
          </div>
        </div>

        <div className="rounded-xl p-6 bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_3px_8px_rgba(15,23,42,0.06)] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detective A */}
            <div className="p-5 rounded-xl bg-purple-50/70 border-t border-t-purple-100 border-x border-x-purple-200 border-b border-b-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(147,51,234,0.05)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">01</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">Detective A: FT-Transformer</h3>
                    <span className="text-[10px] font-mono font-bold text-purple-800 uppercase">The Forensic Accountant</span>
                  </div>
                </div>
                <BrainCircuit className="w-4 h-4 text-purple-700" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">Audits 18 financial traits without blending numbers together:</p>
              <ul className="text-xs text-slate-800 space-y-1.5 list-disc pl-4">
                <li><strong className="text-slate-950">Dedicated trait tokens:</strong> Each trait receives its own 32-dim digital profile.</li>
                <li><strong className="text-slate-950">Cross-examination:</strong> 4 attention heads cross-reference clues like fee spikes and change ratios.</li>
                <li><strong className="text-slate-950">Zero-day detection:</strong> Learns benign traffic so unseen laundering tricks trigger instant alerts.</li>
                <li><strong className="text-slate-950">Instant XAI (0.0ms):</strong> [CLS] token generates court-admissible heatmaps with zero extra compute.</li>
              </ul>
            </div>

            {/* Detective B */}
            <div className="p-5 rounded-xl bg-blue-50/70 border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(37,99,235,0.05)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">02</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">Detective B: Graph Transformer</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-800 uppercase">The Syndicate Web Tracker</span>
                  </div>
                </div>
                <Network className="w-4 h-4 text-blue-700" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">Inspects multi-hop cartel networks using 4 relational attention lenses:</p>
              <ul className="text-xs text-slate-800 space-y-1.5 list-disc pl-4">
                <li><strong className="text-slate-950">Co-spend lens:</strong> Unmasks common wallet ownership across multi-input transactions.</li>
                <li><strong className="text-slate-950">Money route lens:</strong> Traces funds hopping through disposable mule intermediaries.</li>
                <li><strong className="text-slate-950">Peeling funnel lens:</strong> Isolates asymmetric 1-in-2-out cash-out flows with 94.8% recall.</li>
                <li><strong className="text-slate-950">Infrastructure lens:</strong> Links wallets sharing physical IP peers and autonomous system routing.</li>
              </ul>
            </div>
          </div>

          {/* Unified Output Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_3px_8px_rgba(0,0,0,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Unified Risk Scoring (0.00 Safe to 1.00 Severe Threat)</div>
                <p className="text-[11px] text-slate-300">Fuses tabular anomaly scores and relational graph risk into a single calibrated threat probability.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 whitespace-nowrap shadow-2xs">
              Speed: 4.8ms CPU per entity &bull; Zero Cloud GPUs
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 3: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Canonical ML Benchmark Matrix</h2>
            <p className="text-xs text-slate-500 font-mono">Interactive scorecard comparing Detective A and Detective B against legacy baselines across all verified metrics</p>
          </div>
        </div>
        <MlBenchmarkMatrix />
      </section>

      {/* SECTION 4: Interactive Feature Cross-Attention Heatmap Simulator */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">04</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Detective A: 18-Trait Cross-Examination Heatmap Simulator</h2>
            <p className="text-xs text-slate-500 font-mono">Interactive 18 &times; 18 multi-head self-attention simulator and instant 0.0ms trait attribution engine</p>
          </div>
        </div>
        <AttentionMatrix />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch4-peeling-mixing-heuristics"
          className="p-3 rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-slate-50/90 text-slate-900 text-xs font-medium flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(15,23,42,0.05)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700 -translate-x-0.5 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-bold text-slate-950">Ch 4: Peeling &amp; Mixing Heuristics</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-500 text-center font-semibold">NTRO FORENSIC INTELLIGENCE &bull; SEC-DOC-26146-CH05</div>
        <Link
          href="/docs/ch6-risk-engine-xai-legal"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-3 rounded-lg flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.2)] cursor-pointer"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-bold text-white">Ch 6: Multi-Factor Risk &amp; &sect;65B Legal</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white translate-x-0.5 ml-2 flex-shrink-0" />
        </Link>
      </div>
    </article>
  );
}
