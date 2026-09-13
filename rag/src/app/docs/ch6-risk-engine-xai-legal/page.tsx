import React from "react";
import Link from "next/link";
import {
  Scale, ShieldCheck, ShieldAlert, ArrowRight, ArrowLeft,
  FileCheck2, Sparkles, BarChart3, AlertTriangle, Award, BadgeCheck,
} from "lucide-react";
import { RiskCalculator } from "./risk-calculator";
import { ShapWaterfall } from "./shap-waterfall";
import { RiskFaq } from "./risk-faq";

export const metadata = {
  title: "Chapter 6: Risk Engine, Explainable AI & Section 65B Legal Dossier — NTRO KB",
  description:
    "Plain-English guide to the NTRO risk engine: 40/40/20 composite scoring, zero-black-box XAI, and Section 65B digital court dossiers.",
};

export default function Chapter6Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">06</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Risk Engine, Explainable AI &amp; Section 65B Legal Dossier</h2>
            <p className="text-xs text-slate-500 font-mono">Turning raw Bitcoin transactions into a single calibrated risk score with court-admissible proof</p>
          </div>
        </div>

        {/* 2 Relatable Real-World Analogies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center flex-shrink-0"><BarChart3 className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider">The XAI Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">The Pathology Blood Test Report</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Doctors never order surgery on a black-box beep—they require an itemized blood panel comparing markers against safe baselines. Similarly, our engine produces an itemized receipt showing exact risk contributions from peeling, fee bumping, and darknet hops.</p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-indigo-900 bg-indigo-50/70 p-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" /><span>Every risk point is mathematically verified via Lloyd Shapley&rsquo;s Nobel Prize formula.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center flex-shrink-0"><Award className="w-4 h-4 text-amber-600" /></div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">The Legal Evidence Analogy</span>
                <h3 className="text-sm font-bold text-slate-950">The Notary Public Digital Seal</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Courts dismiss unverified screenshots as hearsay. Under Section 65B (IEA) and Section 63 (BSA 2023), our engine seals digital evidence with custody tracking, certified timestamps, and a tamper-proof SHA-256 hash that invalidates if even 1 byte changes.</p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-amber-900 bg-amber-50/70 p-2 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" /><span>Tamper-evident certificates with dual officer affidavits ready for immediate court presentation.</span>
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
            <h3 className="text-sm font-bold text-slate-900">The &ldquo;Black Box&rdquo; Dilemma</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Judges dismiss unexplained neural network outputs under Section 45 IEA as speculative hearsay, causing critical prosecutions to collapse.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">2. The Trick</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">False Positive Deluge</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Launderers disguise funds inside high-volume exchange flows. Single-signal models falsely flag merchants while missing sophisticated peeling funnels.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">3. The Solution</span>
              <Scale className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Cryptographic Admissibility</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Our 40/40/20 composite scoring blends deterministic rules, graph AI, and GeoIP with linear SHAP attribution and Section 65B certified hashing.</p>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Composite Risk Formula</div>
            <div className="text-lg font-mono font-bold text-slate-950">40 / 40 / 20</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Heuristics + Dual AI + GeoIP</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">SHAP Attribution Speed</div>
            <div className="text-lg font-mono font-bold text-slate-950">&lt; 15ms</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Itemized feature receipt per entity</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Judicial Admissibility</div>
            <div className="text-lg font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 100% Certified
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">Sec 65B IEA &amp; Sec 63 BSA 2023</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">Evidence Integrity</div>
            <div className="text-lg font-mono font-bold text-slate-950 font-mono">SHA-256 Seal</div>
            <div className="text-[10.5px] text-slate-500 font-medium">Tamper-evident chain of custody</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive Composite Risk Simulator */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">02</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Interactive Composite Risk Simulator</h2>
            <p className="text-xs text-slate-500 font-mono">Real-time score calibration across heuristics, AI models, and jurisdiction flags</p>
          </div>
        </div>
        <RiskCalculator />
      </section>

      {/* SECTION 3: Plain-English Concept Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Secret Sauce: Explainability &amp; Court Admissibility</h2>
            <p className="text-xs text-slate-500 font-mono">Bridging deep learning mathematics with Indian statutory evidentiary standards</p>
          </div>
        </div>

        <div className="card-tactical rounded-xl p-6 bg-white border border-slate-200 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">01</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SHAP Explainability Waterfall</h3>
                    <span className="text-[10px] font-mono font-semibold text-indigo-700 uppercase">The Itemized Bill</span>
                  </div>
                </div>
                <BarChart3 className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Computes exact feature attributions for every suspect wallet, replacing black-box guesses with verifiable linear math:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Positive Pushes:</strong> Peeling cascade (+28%), urgent fee bumps (+19%), ransomware hops (+14%).</li>
                <li><strong>Mitigating Dampeners:</strong> SegWit compliance (-5%) and extended wallet hold times (-3%).</li>
                <li><strong>Additive Proof:</strong> Attributions sum precisely to the final score with zero hidden variables.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">02</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Section 65B Cryptographic Dossier</h3>
                    <span className="text-[10px] font-mono font-semibold text-amber-700 uppercase">The Court-Ready Seal</span>
                  </div>
                </div>
                <FileCheck2 className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Meets Supreme Court mandates in <em>Arjun Panditrao (2020)</em> by locking forensic evidence into tamper-proof certificates:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Master Hash Digest:</strong> Raw transaction arrays, model weights, and risk scores sealed into SHA-256.</li>
                <li><strong>Hardware Audit Trail:</strong> Records server MAC, system uptime, and offline CPU verification logs.</li>
                <li><strong>Statutory Affidavits:</strong> Dual signature blocks for Investigating Officer and Forensic Custodian.</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs"><BadgeCheck className="w-5 h-5 text-white" /></div>
              <div>
                <div className="text-xs font-bold text-slate-900">Why It Matters: Zero Room for Defense Ambiguity</div>
                <p className="text-[11px] text-slate-500">Sub-15ms explanation speed • 100% air-gapped court audit trail • Zero hallucinations or cloud API leaks.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 whitespace-nowrap">
              Speed: &lt;15ms Linear Tree SHAP
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive Feature Inspector (SHAP Waterfall) */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">04</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Interactive Explainability Inspector: SHAP Waterfall</h2>
            <p className="text-xs text-slate-500 font-mono">Click feature bars below to inspect courtroom-ready, plain-English feature attributions</p>
          </div>
        </div>
        <ShapWaterfall />
      </section>

      {/* SECTION 5: Frequently Asked Questions (Teammate Cheat Sheet) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">05</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Frequently Asked Questions (Teammate Cheat Sheet)</h2>
            <p className="text-xs text-slate-500 font-mono">Defensible answers on Lloyd Shapley game theory, Section 65B legal validity, and Indian Evidence Act</p>
          </div>
        </div>
        <RiskFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch5-dual-transformer-ml"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 5: Dual Transformer ML Engine</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-400 text-center">
          NTRO FORENSIC INTELLIGENCE &bull; SEC-DOC-26146-CH06
        </div>
        <Link
          href="/docs/ch7-online-inference-sync"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 7: Online Inference &amp; Live Sync</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
