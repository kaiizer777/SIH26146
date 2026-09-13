import React from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, Lock, AlertTriangle,
  ShieldAlert, ShieldCheck, Scale, Sparkles, BadgeCheck, Eye,
} from "lucide-react";
import { ForensicCockpitPreview } from "./forensic-cockpit-preview";
import { CliCommandGenerator } from "./cli-generator";

export const metadata = {
  title: "Chapter 8: Forensic Command Center & 1-Command Deployment — NTRO KB",
  description: "Plain-English guide for the NTRO Forensic Command Center, 1-command air-gapped deployment, and Section 65B exports.",
};

export default function Chapter8Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">08</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Forensic Command Center &amp; 1-Command Deployment</h2>
            <p className="text-xs text-slate-500 font-mono">A unified cockpit for intelligence officers, deployable anywhere with 100% air-gapped offline readiness</p>
          </div>
        </div>

        {/* 2 Relatable Real-World Analogies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider">The Analyst Cockpit Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">The Fighter Pilot&rsquo;s Heads-Up Display</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Fighter pilots cannot juggle ten separate gauges mid-flight. Our Command Center synthesizes graph flows, risk scores, mempool alerts, and court dossiers into one intuitive heads-up display.</p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-indigo-900 bg-indigo-50/70 p-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span>Paste an address and visually watch the money trail unfold in real time.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">The Air-Gap Deployment Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">The Self-Sustaining Expedition Crate</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Polar explorers carry sealed crates containing every tool needed to survive completely off the grid. Our entire forensic suite boots with a single command, keeping sensitive investigations strictly offline.</p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-emerald-900 bg-emerald-50/70 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>0 external web calls • 100% self-contained • Classified targets never leak.</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat / Challenge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">1. The Threat</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Operational Fragility</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Standard tools require days of manual setup and leak sensitive suspect queries to external cloud servers.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">2. The Trick</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Analyst Cognitive Overload</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Investigators drown across disconnected spreadsheet tabs and database terminals, losing precious response time.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">3. The Solution</span>
              <Scale className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Turnkey Sovereign Appliance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">A 1-command Docker orchestration packaging local AI, Neo4j, and court-certified Section 65B exports in 1.2s.</p>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">1-Command Deploy</div>
            <div className="text-lg font-mono font-bold text-slate-950">docker compose up</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Boots entire 6-service stack</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Air-Gap Readiness</div>
            <div className="text-lg font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Offline
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">Zero internet or cloud calls</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Graph Visualization</div>
            <div className="text-lg font-mono font-bold text-slate-950">60 FPS WebGL</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Accelerated D3 force layout</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Section 65B PDF Export</div>
            <div className="text-lg font-mono font-bold text-slate-950">1.2s Fast PDF</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Court-certified digital dossier</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Forensic Command Center Simulator */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">02</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Forensic Command Center Simulator</h2>
            <p className="text-xs text-slate-500 font-mono">Explore the unified analyst cockpit: interactive money-trail graph, live mempool alerts, and instant legal export</p>
          </div>
        </div>
        <ForensicCockpitPreview />
      </section>

      {/* SECTION 3: Plain-English Concept Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Secret Sauce: Single Pane of Glass &amp; Sovereign Stack</h2>
            <p className="text-xs text-slate-500 font-mono">Eliminating cognitive fatigue while guaranteeing airtight privacy for national security investigations</p>
          </div>
        </div>

        {/* 2-Card Comparison Breakdown */}
        <div className="card-tactical rounded-xl p-6 bg-white border border-slate-200 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">01</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Unified Investigation Cockpit</h3>
                    <span className="text-[10px] font-mono font-semibold text-indigo-700 uppercase">Single Pane of Glass</span>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Binds four mission-critical investigator views into one reactive interface:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Interactive D3 Canvas:</strong> Dynamic graph view highlighting transaction flows and peeling hops.</li>
                <li><strong>Entity Risk Dials:</strong> 4-tier risk ratings with instant breakdown upon clicking any wallet.</li>
                <li><strong>Live Mempool Stream:</strong> Detects unconfirmed high-risk transfers in under 5ms.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">02</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">100% Offline Air-Gapped Engine</h3>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase">Zero-Leak Infrastructure</span>
                  </div>
                </div>
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Built specifically for classified facilities and seized hardware:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Local Model Weights:</strong> Transformer neural models run purely on local CPU cores.</li>
                <li><strong>Self-Contained DBs:</strong> Bundled PostgreSQL 16, Redis 7.2, and Neo4j with GDS plugin.</li>
                <li><strong>Zero Telemetry:</strong> No external CDN scripts, remote fonts, or telemetry pings.</li>
              </ul>
            </div>
          </div>

          {/* Why It Matters Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Why It Matters: Zero Setup Lag &amp; Total Case Secrecy</div>
                <p className="text-[11px] text-slate-500">Deploys in under 30 seconds with 100% data sovereignty and sub-second graph navigation across 100,000+ entities.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800">Setup: 1 Single Command</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">04</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Air-Gapped Deployment &amp; CLI Command Generator</h2>
            <p className="text-xs text-slate-500 font-mono">Copy ready-to-run commands for Docker orchestration, automated verification tests, and evidence export</p>
          </div>
        </div>
        <CliCommandGenerator />
      </section>



      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch7-online-inference-sync"
          className="p-3 rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-slate-50/90 text-slate-900 text-xs font-medium flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(15,23,42,0.05)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700 -translate-x-0.5 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-bold text-slate-950">Ch 7: Online Inference &amp; Live Sync</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-500 text-center font-semibold">
          NTRO FORENSIC INTELLIGENCE &bull; SEC-DOC-26146-CH08
        </div>

        <Link
          href="/docs/ch1-mission-architecture"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-3 rounded-lg flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.2)] cursor-pointer"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Loop Back</div>
            <div className="font-bold text-white">Ch 1: Mission Architecture</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white translate-x-0.5 ml-2 flex-shrink-0" />
        </Link>
      </div>
    </article>
  );
}
