import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Server,
  Network,
  Cpu,
  RefreshCw,
  Terminal,
  Database,
  Lock,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Layers,
  Sparkles,
  AlertTriangle,
  GitFork,
  Zap,
  ShieldCheck,
  EyeOff,
  Activity,
  Smartphone,
  Scale,
  BrainCircuit,
  Radio,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { TopologyDiagram } from "./topology-diagram";
import { FaqAccordion } from "./faq-accordion";
import { PipelineStepper } from "./pipeline-stepper";

export const metadata = {
  title: "Chapter 1: The NTRO Mission, Tech Stack & System Topology — NTRO KB",
  description:
    "Plain-English guide to the sovereign air-gapped Bitcoin forensic intelligence pipeline for NTRO.",
};

export default function Chapter1Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Real-World Challenge & The Sovereign Mandate */}
      <section className="space-y-6">
        {/* Chapter Header */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Mission: Catching Digital Money Laundering
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why tracking illicit Bitcoin is so difficult and why NTRO needs a 100% offline system
            </p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Analogy 1: Burner Phones */}
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                  The Problem in Plain English
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  Why Tracking Bitcoin is Like Chasing Ghosts
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bitcoin addresses are not like normal bank accounts with names and PAN cards. They are pseudonymous cryptographic addresses (26–62 characters in Base58 or Bech32 format)—functioning just like <strong>disposable burner SIM cards</strong>. Criminals create a new wallet in 2 seconds, move stolen funds through 20 different burner wallets, and leave investigators with thousands of confusing records.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-amber-900 bg-amber-50/70 p-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>Our prototype connects the dots to unmask the single criminal syndicate behind all these burner wallets.</span>
            </div>
          </div>

          {/* Analogy 2: Air-Gapped Sovereignty */}
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                  Our Security Superpower
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  100% Offline (Air-Gapped): Zero Cloud Leaks
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              NTRO handles national security intelligence. If investigators use online tools (like Google or public blockchain explorers) to search suspect wallets, criminals monitor search traffic and immediately realize they are being hunted. Our prototype runs <strong>completely offline with zero internet access</strong>.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-emerald-900 bg-emerald-50/70 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>0 external web calls • 100% local map data • Secret investigations stay completely private</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Pillar 1 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
                1. The Threat
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Ransomware & Black Money
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cyber criminals attack hospitals, banks, and government servers, demanding millions in Bitcoin ransom and moving it across borders in seconds.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                2. The Trick
              </span>
              <GitFork className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Money Peeling & Mixing
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              To hide the money trail, automated scripts split large payments into tiny slices (peeling) or mix dirty money with innocent users (tumblers).
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                3. The Solution
              </span>
              <Scale className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Section 65B Legal Evidence
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI predictions alone mean nothing in court. Our system generates Section 65B (IEA) / Section 63 (BSA 2023) certified evidence dossiers with SHA-256 cryptographic proof.
            </p>
          </div>
        </div>

        {/* High-Impact Ground Truth Corpus KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Total Illicit Flow Tracked
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              $1,018,573,922
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              115,116.91 Bitcoins analyzed
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Ransomware Wallets
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              11,186 Wallets
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              Known criminal origin points
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Malware Families
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              136 Strains
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              LockBit, WannaCry, Conti & more
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              System Security
            </div>
            <div className="text-lg font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Offline
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">
              Zero internet leaks guaranteed
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: The 5-Stage Autonomous Pipeline */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              How the Data Flows: The 5-Step Journey
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              From raw uploaded spreadsheets to a court-ready criminal dossier in 5 simple steps
            </p>
          </div>
        </div>

        {/* Interactive 5-Stage Stepper Component */}
        <PipelineStepper />
      </section>

      {/* SECTION 3: The Dual Transformer AI Engine in Plain English */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              How the AI Brain Works: The 2-Detective Team
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Two specialized AI models collaborating like senior detectives to uncover criminal syndicates
            </p>
          </div>
        </div>

        {/* Dual Detective Breakdown Card */}
        <div className="card-tactical rounded-xl p-6 bg-white border border-slate-200 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detective 1: FT-Transformer */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Detective 1: FT-Transformer
                    </h3>
                    <span className="text-[10px] font-mono font-semibold text-purple-700 uppercase">
                      The Forensic Accountant
                    </span>
                  </div>
                </div>
                <BrainCircuit className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scrutinizes 18 financial and behavioral features per transaction. Like an expert accountant checking the books, its cross-feature attention detects anomalies:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Unusual amounts:</strong> e.g., transferring 0.999 BTC repeatedly to peel away funds.</li>
                <li><strong>Rapid-fire bursts:</strong> Micro-timing spikes and high-frequency bot transaction velocity.</li>
                <li><strong>Overpaying fees:</strong> Paying abnormally high sat/vB fees to rush transactions before freezing.</li>
              </ul>
            </div>

            {/* Detective 2: Relational Graph Transformer */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Detective 2: Graph Transformer
                    </h3>
                    <span className="text-[10px] font-mono font-semibold text-blue-700 uppercase">
                      The Network Sleuth
                    </span>
                  </div>
                </div>
                <Network className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Analyzes graph topology using 4-head relational attention across co-spending, transaction flows, and peeling edges:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Tracking origin proximity:</strong> Tracing hops to 11,186 known Ransomwhere criminal seed addresses.</li>
                <li><strong>Spotting mixers:</strong> Catching funnel patterns where 100 payments merge into one wallet to wash dirty money.</li>
                <li><strong>Co-spend syndicates:</strong> Grouping multi-input wallets to prove common wallet ownership.</li>
              </ul>
            </div>
          </div>

          {/* Unified Output Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Combined Risk Score (0.00 Safe to 1.00 Severe Threat)
                </div>
                <p className="text-[11px] text-slate-500">
                  Merges tabular anomaly + graph risk propagation + heuristic rules into one calibrated score with full SHAP explainability.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800">
                Speed: 4.8ms CPU per entity (Zero GPU)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System Topology & Service Bus */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive System Map (Click Each Block to Learn)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Click on any component below to see what it does, what data goes into it, and what comes out
            </p>
          </div>
        </div>

        {/* Embedded Interactive Topology Component */}
        <TopologyDiagram />
      </section>

      {/* SECTION 5: Key Questions & Plain-English Answers */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Frequently Asked Questions (Teammate Cheat Sheet)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Quick, clear answers to the most common questions you will be asked during reviews or presentations
            </p>
          </div>
        </div>

        {/* Embedded FAQ Accordion */}
        <FaqAccordion />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono text-slate-500">
          NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH01
        </div>

        <Link
          href="/docs/ch2-ingest-geoip-security"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 2: Ingest, GeoIP & Anti-Duplicate Armor</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
