import React from "react";
import Link from "next/link";
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Lock,
  FileCheck2,
  FileCode,
  Layers,
  Cpu,
  Globe,
  Binary,
  Gavel,
  CheckCircle2,
  Fingerprint,
  HardDrive,
  Clock,
  Sparkles,
  Zap,
  BarChart3,
  Sliders,
  AlertOctagon,
  Download,
  Printer,
  HelpCircle,
  Award,
  AlertTriangle,
  Flame,
  MessageSquare,
  Building,
  Check,
} from "lucide-react";
import { RiskCalculator } from "./risk-calculator";
import { ShapWaterfall } from "./shap-waterfall";
import { LegalCertificateViewer } from "./legal-certificate-viewer";
import { RiskFaq } from "./risk-faq";

export const metadata = {
  title: "Chapter 6: Risk Engine, Explainable AI (XAI) & Section 65B Legal Dossier — NTRO KB",
  description:
    "Plain-English guide to the NTRO Bitcoin forensic intelligence risk engine: 40/40/20 composite risk scoring, zero-black-box explainable AI, and tamper-proof Section 65B Indian Evidence Act digital dossiers.",
};

export default function Chapter6Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* CHAPTER HERO TITLE & EXECUTIVE SUMMARY */}
      <div className="border-b border-slate-200 pb-8 space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold tracking-wide uppercase bg-slate-900 text-white shadow-xs">
            CHAPTER 06 &bull; LEGAL-TECH &amp; AI
          </span>
          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
            COURT-ADMISSIBLE IN INDIA
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          The Risk Engine, Explainable AI &amp; Section 65B Legal Dossier
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          How our sovereign forensic intelligence system turns millions of raw Bitcoin transactions into a single, unmistakable danger score (0–100%), explains every flag in plain human English with zero &ldquo;black box&rdquo; guessing, and stamps evidence with a tamper-proof Section 65B certificate that Indian judges and police can trust in trial.
        </p>

        {/* 3 Quick Takeaway Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 font-sans">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
            <Sliders className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 block">40 / 40 / 20 Risk Formula</strong>
              <span className="text-slate-500">Heuristics (40%) + Dual AI (40%) + GeoIP (20%) = One Score.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
            <BarChart3 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 block">Zero &ldquo;Black Box&rdquo; AI</strong>
              <span className="text-slate-500">Itemized SHAP receipts explain every percentage point of risk.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
            <Award className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 block">Section 65B Stamped</strong>
              <span className="text-slate-500">Tamper-proof digital certificates ready for Indian court trials.</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: The Composite Risk Engine */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Composite Risk Engine: 3 Ingredients, 1 Danger Score
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Combining structural heuristics, artificial intelligence, and network geography into a 0 to 100% rating
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            In high-stakes counter-terror finance and police investigations, an officer doesn&rsquo;t have time to sift through twenty confusing charts. They need one clear, uncorrupted answer: <strong>&ldquo;Is this wallet criminal, and should we freeze the money?&rdquo;</strong>
          </p>

          <p>
            To answer that with absolute reliability, the NTRO surveillance engine combines three distinct layers of intelligence into a single <strong>Composite Danger Score (0% to 100%)</strong>:
          </p>

          {/* Visual Formula Card */}
          <div className="p-5 rounded-xl bg-slate-900 text-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                Official Composite Danger Formula
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                PROVABLY BOUNDED: 0% (CLEAN) &rarr; 100% (CRITICAL)
              </span>
            </div>

            <div className="text-base sm:text-lg font-mono font-bold text-white tracking-wide py-1">
              {"Total Danger = [ Heuristics × 40% ] + [ Dual AI Models × 40% ] + [ GeoIP & Blacklists × 20% ]"}
            </div>

            {/* 3 Ingredient Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <Binary className="w-3.5 h-3.5" />
                  <span>40% &bull; Heuristics &amp; Rules</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Catches deliberate laundering signatures like 5+ hop peeling chains, sudden panic fee surging, and equal-amount CoinJoin tumbling.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>40% &bull; Dual Transformer AI</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Deep neural networks trace hidden multi-hop money flow, structural anomalies, and proximity to known Ransomwhere extortion seeds.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
                  <Globe className="w-3.5 h-3.5" />
                  <span>20% &bull; GeoIP &amp; Blacklists</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Cross-references broadcasts against known darknet Tor relays, bulletproof offshore servers, and sanctioned hostile territory ASNs.
                </p>
              </div>
            </div>
          </div>

          {/* Why 40/40/20 Strategy Callout */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Why combine 3 layers instead of relying purely on AI?
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Criminal syndicates can easily disguise individual transaction amounts or tweak transfer times to trick a single machine learning model. However, moving Bitcoin value fundamentally requires spending unspent transaction outputs (UTXOs). That creates an inescapable digital trail. By requiring structural rules (40%) + neural graph patterns (40%) + physical network geography (20%), <strong>a criminal cannot defeat all three systems simultaneously</strong>.
            </p>
          </div>

          {/* 4 Actionable Verdict Tiers */}
          <div className="pt-2 space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              The 4 Operational Verdict Tiers (What Happens in Real Life)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Critical */}
              <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/60 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-600 text-white">
                    CRITICAL
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-950">85% – 100%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Immediate Freeze &amp; Seizure</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Direct connection to confirmed ransomware syndicates or active peeling cascades. Immediate Section 91/102 CrPC asset freeze issued to Indian crypto exchanges.
                </p>
              </div>

              {/* High */}
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-600 text-white">
                    HIGH
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-950">65% – 84%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Active Investigation</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Strong laundering markers or coin mixing. System begins live mempool transaction sniffing, subpoenas KYC on domestic on-ramps, and drafts court affidavits.
                </p>
              </div>

              {/* Medium */}
              <div className="p-4 rounded-xl border border-sky-300 bg-sky-50/60 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">
                    MEDIUM
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-950">35% – 64%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Passive Watchlist</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Moderate anomalies or offshore OTC liquidity pooling without confirmed criminal taint. Cataloged into persistent intelligence index for automated re-clustering.
                </p>
              </div>

              {/* Low */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-600 text-white">
                    LOW
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-950">0% – 34%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Clean / Routine Commerce</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Standard consumer payments, institutional vault transfers, or regular exchange withdrawals. Automatically logged to audit trails with zero police intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Explainable AI (XAI) - No Black Boxes */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Explainable AI (XAI): No &ldquo;Black Boxes&rdquo; Allowed in Court
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Itemized feature attributions, graph subgraphs, and deterministic human narratives
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Under Section 45 of the Indian Evidence Act (expert testimony), a prosecutor cannot simply walk into court and say: <em>&ldquo;The AI model flagged this wallet, so the suspect is guilty.&rdquo;</em> A judge will immediately dismiss the case as an unverified &ldquo;black box.&rdquo;
          </p>

          <p>
            Our architecture replaces black-box guessing with an <strong>Itemized Forensic Receipt</strong> that explains every flagged transaction in plain human English:
          </p>

          {/* 3 Pillars of Explainable AI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Pillar 1 */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                1. Itemized SHAP Receipts
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Like an itemized grocery bill, SHAP breaks down the exact positive pushes (+28% Peeling Ratio, +19% Urgent Fee Bumping) and negative dampeners (-3% Standard Format) that add up to the final score.
              </p>
              <div className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 p-1.5 rounded border border-indigo-200">
                Axiomatically Proven &bull; Lloyd Shapley Nobel Formula
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                2. Concise Graph Evidence
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instead of overwhelming judges with 50,000 messy blockchain nodes, GNNExplainer extracts only the 6 to 10 critical money-mule hops that directly prove where the stolen funds went.
              </p>
              <div className="text-[10px] font-mono text-sky-700 font-bold bg-sky-50 p-1.5 rounded border border-sky-200">
                Minimal 2-Hop Subgraph &bull; Zero Cognitive Overload
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                <FileCode className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                3. Plain-English Human Statements
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Converts raw numbers into crystal-clear sentences: <em>&ldquo;Flagged because 85% of funds peeled in 12 seconds to a known high-risk ASN.&rdquo;</em> Zero hallucinations, 100% reproducible.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded border border-emerald-200">
                Deterministic Templates &bull; Zero LLM Hallucinations
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Section 65B Legal Dossier */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Section 65B Legal Dossier: The Digital Evidence Stamp for Indian Courts
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Compliance under Section 65B Indian Evidence Act 1872 &amp; Section 63 Bharatiya Sakshya Adhiniyam 2023
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          {/* Plain-English Analogy Callout */}
          <div className="p-5 rounded-xl bg-amber-50/70 border-2 border-amber-300/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
              The Simple Analogy for Teammates and Judges:
            </div>
            <p className="text-amber-950 font-medium text-sm leading-relaxed">
              &ldquo;Think of Section 65B as a tamper-proof digital certificate stamped onto evidence so police and judges can legally accept it in an Indian court without fear that anyone edited the file.&rdquo;
            </p>
            <p className="text-xs text-amber-800 leading-relaxed pt-1">
              Following the landmark Supreme Court ruling in <em>Arjun Panditrao Khotkar (2020)</em>, Indian courts strictly forbid electronic records unless accompanied by an official statutory certificate proving the computer operated continuously without unauthorized tampering.
            </p>
          </div>

          {/* 4 Pillars of Courtroom Proof */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  SHA-256 Cryptographic Tamper Seal
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every transaction log, AI tensor, and risk score is sealed with a 64-character SHA-256 cryptographic hash. If a corrupt insider or hacker changes even 1 byte (such as modifying a score from 94% to 12%), the seal breaks instantly and alerts the court.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  100% Offline Air-Gapped Custody
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The certificate proves that the analysis executed on a pure-CPU sovereign server disconnected from the public internet. Zero cloud leaks, zero external telemetry, zero dependency on foreign API servers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  Algorithmic Reproducibility Manifest
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The dossier locks the exact checksum of the neural network weights. If a court-appointed defense expert re-runs the data on their own computer, they will generate the exact same danger score down to the tenth of a percent.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  4
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  Statutory Police &amp; Officer Affidavits
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates dual statutory signature blocks ready for the Investigating Officer and the Technical Systems Custodian, complete with badge IDs, NTP timestamps, and mandatory legal affirmations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Dual Export Formats */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Dual Export Formats: For Police Cyber Cells &amp; Court Trial Benches
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Machine-parsable JSON evidence bundles and print-ready judicial PDF affidavits
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Real law enforcement workflows require two distinct formats: cyber forensic units need machine-readable raw data, while magistrates and judges need printed physical affidavits. The NTRO engine exports both simultaneously:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5" /> FORMAT A: CYBER CELL
                </span>
                <span className="font-mono text-[11px] text-slate-400 font-bold">DIGITAL EVIDENCE LOCKER</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Cryptographically Sealed JSON Bundle</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contains complete transaction arrays, UTXO inputs, raw AI weight hashes, and the SHA-256 digital signature. Ready for direct ingestion into CBI, ED, or state cyber cell evidence archives.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> FORMAT B: TRIAL COURT
                </span>
                <span className="font-mono text-[11px] text-slate-400 font-bold">TRIAL-READY AFFIDAVIT</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Print-Ready Forensic Dossier PDF</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Formatted for A4 portrait printing with Government of India headers, official watermarks (&ldquo;COURT ADMISSIBLE • SEC 65B BSA 2023&rdquo;), composite risk gauges, flow diagrams, and statutory signature lines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Interactive Toolkits */}
      <section className="space-y-8 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Forensic Toolkits
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Test the risk formula, inspect plain-English SHAP receipts, and verify Section 65B certificates in real-time
            </p>
          </div>
        </div>

        {/* Module 1: Risk Calculator */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Toolkit 1: Live Multi-Factor Risk Score Calculator
          </div>
          <RiskCalculator />
        </div>

        {/* Module 2: SHAP Waterfall */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Toolkit 2: Explainable AI (SHAP) — Itemized Evidence Receipt
          </div>
          <ShapWaterfall />
        </div>

        {/* Module 3: Legal Certificate Inspector */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-amber-600" />
            Toolkit 3: Mock Section 65B / Section 63 BSA Court Certificate Inspector
          </div>
          <LegalCertificateViewer />
        </div>
      </section>

      {/* SECTION 6: FAQ & Judge Defense */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Courtroom Defense &amp; Hackathon FAQ
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Clear answers for non-technical teammates and hackathon judges on why LLMs fail and how to defend the AI in trial
            </p>
          </div>
        </div>

        {/* FAQ Component */}
        <RiskFaq />
      </section>

      {/* SECTION 7: PITCH-READY CHEAT SHEET */}
      <section className="pt-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white border-2 border-indigo-500/40 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold block">
                  PITCH-READY CHEAT SHEET &bull; HACKATHON WINNER REFERENCE
                </span>
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  How to Explain This to a Judge or Juror in 30 Seconds
                </h3>
              </div>
            </div>

            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              30-SECOND ELEVATOR PITCH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">The 3-Signal Formula</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                &ldquo;We take known laundering patterns (40%), deep learning neural nets (40%), and high-risk foreign hosters (20%) to create one clear 0–100% danger score. Criminals can disguise amounts, but they cannot hide from all 3 layers at once.&rdquo;
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">The Itemized Receipt</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                &ldquo;Judges reject black-box AI. Our system prints an itemized receipt showing exactly why the wallet was flagged: e.g. +28% because 98% of funds peeled in 12 seconds, and +18% because it broadcast from a darknet bulletproof server.&rdquo;
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">The Section 65B Seal</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                &ldquo;Under Indian law, electronic evidence needs a Section 65B stamp. We generate a tamper-proof digital certificate with an immutable SHA-256 hash. If anyone edits even one byte, the seal breaks immediately, guaranteeing courtroom integrity.&rdquo;
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span><strong>Final Takeaway:</strong> High mathematical rigor inside the code &bull; Crystal-clear plain English inside the courtroom.</span>
            </span>
            <span className="font-mono text-[11px] text-indigo-400 font-semibold">
              NTRO FORENSIC BENCHMARK 2026
            </span>
          </div>
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch5-dual-transformer-ml"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 5: Dual Transformer ML Engine</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION &bull; SEC-DOC-26146-CH06
        </div>

        <Link
          href="/docs/ch7-online-inference-sync"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 7: Live Post-Ingest Sync</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
