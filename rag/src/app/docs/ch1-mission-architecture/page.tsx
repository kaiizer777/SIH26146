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
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-[10px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(37,99,235,0.3)] flex-shrink-0">
            01
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                MISSION DIRECTIVE • SEC-DOC-26146-CH01
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1">
              The Mission: Catching Digital Money Laundering
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
              Why tracking illicit Bitcoin is so difficult and why NTRO mandates a 100% sovereign offline system
            </p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Analogy 1: Burner Phones */}
          <div className="rounded-xl p-5 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/60 border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.05)] space-y-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-amber-50 to-amber-100/80 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(217,119,6,0.12)] flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div>
                <span className="text-[10.5px] font-mono font-bold text-amber-800 uppercase tracking-wider">
                  The Problem in Plain English
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  Why Tracking Bitcoin is Like Chasing Ghosts
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Bitcoin addresses are not like normal bank accounts with names and PAN cards. They are pseudonymous cryptographic addresses (26–62 characters in Base58 or Bech32 format)—functioning just like <strong>disposable burner SIM cards</strong>. Criminals create a new wallet in 2 seconds, move stolen funds through 20 different burner wallets, and leave investigators with thousands of confusing records.
            </p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2.5 text-[11.5px] font-medium text-amber-950 bg-gradient-to-b from-amber-50 to-amber-100/60 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300/80 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Our prototype connects the dots to unmask the single criminal syndicate behind all these burner wallets.</span>
            </div>
          </div>

          {/* Analogy 2: Air-Gapped Sovereignty */}
          <div className="rounded-xl p-5 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/60 border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.05)] space-y-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-emerald-50 to-emerald-100/80 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(5,150,105,0.12)] flex items-center justify-center flex-shrink-0">
                <Lock className="w-4.5 h-4.5 text-emerald-700" />
              </div>
              <div>
                <span className="text-[10.5px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
                  Our Security Superpower
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  100% Offline (Air-Gapped): Zero Cloud Leaks
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              NTRO handles national security intelligence. If investigators use online tools (like Google or public blockchain explorers) to search suspect wallets, criminals monitor search traffic and immediately realize they are being hunted. Our prototype runs <strong>completely offline with zero internet access</strong>.
            </p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2.5 text-[11.5px] font-medium text-emerald-950 bg-gradient-to-b from-emerald-50 to-emerald-100/60 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300/80 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>0 external web calls • 100% local map data • Secret investigations stay completely private</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Pillar 1 */}
          <div className="rounded-xl p-4.5 bg-gradient-to-b from-white to-slate-50/50 border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.04)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200/80 uppercase tracking-wider">
                1. The Threat
              </span>
              <div className="w-7 h-7 rounded-md bg-rose-50 border border-rose-200/80 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-rose-700" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-950">
              Ransomware & Black Money
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cyber criminals attack hospitals, banks, and government servers, demanding millions in Bitcoin ransom and moving it across borders in seconds.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-xl p-4.5 bg-gradient-to-b from-white to-slate-50/50 border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.04)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/80 uppercase tracking-wider">
                2. The Trick
              </span>
              <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200/80 flex items-center justify-center">
                <GitFork className="w-4 h-4 text-amber-700" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-950">
              Money Peeling & Mixing
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              To hide the money trail, automated scripts split large payments into tiny slices (peeling) or mix dirty money with innocent users (tumblers).
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-xl p-4.5 bg-gradient-to-b from-white to-slate-50/50 border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.04)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/80 uppercase tracking-wider">
                3. The Solution
              </span>
              <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200/80 flex items-center justify-center">
                <Scale className="w-4 h-4 text-blue-700" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-950">
              Section 65B Legal Evidence
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI predictions alone mean nothing in court. Our system generates Section 65B (IEA) / Section 63 (BSA 2023) certified evidence dossiers with SHA-256 cryptographic proof.
            </p>
          </div>
        </div>

        {/* High-Impact Ground Truth Corpus KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/80 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Total Illicit Flow Tracked
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-950 tracking-tight">
              $1,018,573,922
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              115,116.91 Bitcoins analyzed
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/80 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Ransomware Wallets
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-950 tracking-tight">
              11,186 Wallets
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              Known criminal origin points
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/80 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Malware Families
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-950 tracking-tight">
              136 Strains
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              LockBit, WannaCry, Conti & more
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/80 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              System Security
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-800 flex items-center gap-1.5 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              100% Offline
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              Zero internet leaks guaranteed
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: The 5-Stage Autonomous Pipeline */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-[10px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(37,99,235,0.3)] flex-shrink-0">
            02
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                PIPELINE ARCHITECTURE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1">
              How the Data Flows: The 5-Step Journey
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
              From raw uploaded spreadsheets to a court-ready criminal dossier in 5 simple steps
            </p>
          </div>
        </div>

        {/* Interactive 5-Stage Stepper Component */}
        <PipelineStepper />
      </section>

      {/* SECTION 3: The Dual Transformer AI Engine in Plain English */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-[10px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(37,99,235,0.3)] flex-shrink-0">
            03
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                DUAL TRANSFORMER NEURAL CORE
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1">
              How the AI Brain Works: The 2-Detective Team
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
              Two specialized AI models collaborating like senior detectives to uncover criminal syndicates
            </p>
          </div>
        </div>

        {/* Dual Detective Breakdown Card */}
        <div className="rounded-xl p-5 sm:p-6 bg-gradient-to-b from-white via-white to-slate-50/40 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.05)] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detective 1: FT-Transformer */}
            <div className="p-4.5 rounded-xl bg-gradient-to-b from-purple-50/70 via-purple-50/40 to-purple-100/30 border-t border-t-purple-100 border-x border-x-purple-200 border-b border-b-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(147,51,234,0.05)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-purple-500 to-purple-600 border-t border-t-purple-300/70 border-b border-b-purple-800 text-white flex items-center justify-center font-bold text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(147,51,234,0.25)]">
                    01
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Detective 1: FT-Transformer
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-purple-800 uppercase tracking-wider">
                      The Forensic Accountant
                    </span>
                  </div>
                </div>
                <BrainCircuit className="w-4.5 h-4.5 text-purple-700" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Scrutinizes 18 financial and behavioral features per transaction. Like an expert accountant checking the books, its cross-feature attention detects anomalies:
              </p>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                <li><strong>Unusual amounts:</strong> e.g., transferring 0.999 BTC repeatedly to peel away funds.</li>
                <li><strong>Rapid-fire bursts:</strong> Micro-timing spikes and high-frequency bot transaction velocity.</li>
                <li><strong>Overpaying fees:</strong> Paying abnormally high sat/vB fees to rush transactions before freezing.</li>
              </ul>
            </div>

            {/* Detective 2: Relational Graph Transformer */}
            <div className="p-4.5 rounded-xl bg-gradient-to-b from-blue-50/70 via-blue-50/40 to-blue-100/30 border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(37,99,235,0.05)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 border-t border-t-blue-300/70 border-b border-b-blue-800 text-white flex items-center justify-center font-bold text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(37,99,235,0.25)]">
                    02
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Detective 2: Graph Transformer
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-blue-800 uppercase tracking-wider">
                      The Network Sleuth
                    </span>
                  </div>
                </div>
                <Network className="w-4.5 h-4.5 text-blue-700" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Analyzes graph topology using 4-head relational attention across co-spending, transaction flows, and peeling edges:
              </p>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                <li><strong>Tracking origin proximity:</strong> Tracing hops to 11,186 known Ransomwhere criminal seed addresses.</li>
                <li><strong>Spotting mixers:</strong> Catching funnel patterns where 100 payments merge into one wallet to wash dirty money.</li>
                <li><strong>Co-spend syndicates:</strong> Grouping multi-input wallets to prove common wallet ownership.</li>
              </ul>
            </div>
          </div>

          {/* Unified Output Banner */}
          <div className="p-4.5 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 border-t border-t-emerald-300/70 border-b border-b-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_5px_rgba(5,150,105,0.25)]">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-950">
                  Combined Risk Score (0.00 Safe to 1.00 Severe Threat)
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                  Merges tabular anomaly + graph risk propagation + heuristic rules into one calibrated score with full SHAP explainability.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                Speed: 4.8ms CPU per entity (Zero GPU)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System Topology & Service Bus */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-[10px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(37,99,235,0.3)] flex-shrink-0">
            04
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                SYSTEM ARCHITECTURE & SERVICE BUS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1">
              Interactive System Map (Click Each Block to Learn)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
              Click on any component below to see what it does, what data goes into it, and what comes out
            </p>
          </div>
        </div>

        {/* Embedded Interactive Topology Component */}
        <TopologyDiagram />
      </section>

      {/* SECTION 5: Key Questions & Plain-English Answers */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-[10px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(37,99,235,0.3)] flex-shrink-0">
            05
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                FORENSIC CHEAT SHEET
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1">
              Frequently Asked Questions (Teammate Cheat Sheet)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-0.5">
              Quick, clear answers to the most common questions you will be asked during reviews or presentations
            </p>
          </div>
        </div>

        {/* Embedded FAQ Accordion */}
        <FaqAccordion />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH01
        </div>

        <Link
          href="/docs/ch2-ingest-geoip-security"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-3 rounded-xl flex items-center gap-3 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_8px_rgba(30,64,175,0.3)] active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 2: Ingest, GeoIP & Anti-Duplicate Armor</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white/15 border-t border-t-white/30 border-b border-b-blue-900 flex items-center justify-center ml-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </Link>
      </div>
    </article>
  );
}
