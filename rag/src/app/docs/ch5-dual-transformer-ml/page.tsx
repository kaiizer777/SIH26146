import React from "react";
import Link from "next/link";
import {
  BrainCircuit, Network, ShieldAlert, Sliders, Clock,
  ShieldCheck, ArrowRight, ArrowLeft, Sparkles, BadgeCheck,
} from "lucide-react";
import { MlBenchmarkMatrix } from "./ml-benchmark-matrix";

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
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200/80 flex items-center justify-center flex-shrink-0"><BrainCircuit className="w-4 h-4 text-purple-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider">Detective A (FT-Transformer)</span>
                <h3 className="text-sm font-bold text-slate-950">The Forensic Accountant: Auditing Transaction Traits</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scrutinizes 18 numeric traits on each transaction—fee rate spikes, velocity, and change ratios—without blurring clues together. Spots unseen zero-day laundering tricks in 0.0ms.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-purple-900 bg-purple-50/70 p-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
              <span>Cross-feature self-attention detects multi-variable tricks that slip past static filters.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center flex-shrink-0"><Network className="w-4 h-4 text-blue-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider">Detective B (Graph Transformer)</span>
                <h3 className="text-sm font-bold text-slate-950">The Undercover Agent: Tracking Syndicates</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maps how wallets interact across 4 relation lenses: co-spends, mule routes, peeling chains, and shared infrastructure. Mutes benign noise by 10,000x to isolate cartel rings.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-blue-900 bg-blue-50/70 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Multi-head relational attention yields 94.8% peeling recall and 0.92 F1 score on real forensic data.</span>
            </div>
          </div>
        </div>

        {/* 3 Threat / Concept Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">1. Edge Blindness</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Legacy Graphs Blurred Links</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Standard graph networks treated normal retail transfers identically to peeling hops, letting syndicates hide in plain sight.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">2. Feature Soup</span>
              <Sliders className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Mashing Clues Into Averages</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Legacy autoencoders blended all 18 traits into a single average, completely washing out subtle fee spikes and change ratios.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">3. The Cloud Trap</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">250ms Black-Box Lag</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Cloud AI models require expensive GPUs, leak classified case intelligence over the web, and introduce unacceptable latency.</p>
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
            <div key={kpi.label} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">{kpi.label}</div>
              <div className={`text-lg font-mono font-bold flex items-center gap-1.5 ${kpi.live ? "text-emerald-700" : "text-slate-950"}`}>
                {kpi.live && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                {kpi.val}
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium">{kpi.sub}</div>
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

        <div className="card-tactical rounded-xl p-6 bg-white border border-slate-200 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detective A */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">01</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Detective A: FT-Transformer</h3>
                    <span className="text-[10px] font-mono font-semibold text-purple-700 uppercase">The Forensic Accountant</span>
                  </div>
                </div>
                <BrainCircuit className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Audits 18 financial traits without blending numbers together:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Dedicated trait tokens:</strong> Each trait receives its own 32-dim digital profile.</li>
                <li><strong>Cross-examination:</strong> 4 attention heads cross-reference clues like fee spikes and change ratios.</li>
                <li><strong>Zero-day detection:</strong> Learns benign traffic so unseen laundering tricks trigger instant alerts.</li>
                <li><strong>Instant XAI (0.0ms):</strong> [CLS] token generates court-admissible heatmaps with zero extra compute.</li>
              </ul>
            </div>

            {/* Detective B */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">02</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Detective B: Graph Transformer</h3>
                    <span className="text-[10px] font-mono font-semibold text-blue-700 uppercase">The Syndicate Web Tracker</span>
                  </div>
                </div>
                <Network className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Inspects multi-hop cartel networks using 4 relational attention lenses:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Co-spend lens:</strong> Unmasks common wallet ownership across multi-input transactions.</li>
                <li><strong>Money route lens:</strong> Traces funds hopping through disposable mule intermediaries.</li>
                <li><strong>Peeling funnel lens:</strong> Isolates asymmetric 1-in-2-out cash-out flows with 94.8% recall.</li>
                <li><strong>Infrastructure lens:</strong> Links wallets sharing physical IP peers and autonomous system routing.</li>
              </ul>
            </div>
          </div>

          {/* Unified Output Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs"><BadgeCheck className="w-5 h-5 text-white" /></div>
              <div>
                <div className="text-xs font-bold text-slate-900">Unified Risk Scoring (0.00 Safe to 1.00 Severe Threat)</div>
                <p className="text-[11px] text-slate-500">Fuses tabular anomaly scores and relational graph risk into a single calibrated threat probability.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 whitespace-nowrap">
              Speed: 4.8ms CPU per entity • Zero Cloud GPUs
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

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/docs/ch4-peeling-mixing-heuristics" className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs">
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 4: Peeling &amp; Mixing Heuristics</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-400 text-center">NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH05</div>
        <Link href="/docs/ch6-risk-engine-xai-legal" className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs">
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 6: Multi-Factor Risk &amp; &sect;65B Legal</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
