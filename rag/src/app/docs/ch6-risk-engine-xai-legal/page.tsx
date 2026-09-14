import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  FileCheck2,
  FileCode,
  Network,
  Printer,
  Sliders,
} from "lucide-react";
import { RiskCalculator } from "./risk-calculator";
import { ShapWaterfall } from "./shap-waterfall";
import { LegalCertificateViewer } from "./legal-certificate-viewer";

export const metadata = {
  title: "Chapter 6: Multi-Factor Risk Scoring, XAI & Section 65B Legal Dossier — NTRO KB",
  description:
    "Production engineering specification for Pipeline Tier 5: Multi-Factor 4-Factor Weighted Risk Scoring, Tri-Partite XAI (SHAP, GNNExplainer, Deterministic NLG), and Court-Admissible Section 65B IEA / Section 63 BSA 2023 Digital Dossier Certification.",
};

export default function Chapter6Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* Tactical Document Header */}
      <div className="border-b border-slate-200 pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider uppercase">
            CHAPTER 06
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            PIPELINE TIER 5
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/80 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            SECTION 65B EVIDENCE ACT • BSA 2023
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-bold font-mono">
            SHAP + GNNEXPLAINER + SHA-256 SEAL
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Chapter 6: Multi-Factor Risk Scoring, XAI &amp; Section 65B Legal Dossier
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          Production engineering specification for Pipeline Tier 5: the decision and judicial evidentiary core.
          Fuses continuous tabular anomaly reconstruction, multi-head relational graph transformer attention, and graph-traversal
          heuristics into a single calibrated <strong>Composite Risk Score</strong>. Couples the mathematical output with a
          <strong> Tri-Partite Explainable AI (XAI) Arsenal</strong> and an automated <strong>Court-Admissible Section 65B / Section 63 BSA Dossier Engine</strong> sealed
          via immutable SHA-256 manifests for zero-tamper prosecution admissibility.
        </p>

        {/* Quick Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Composite Scoring Formula</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">4-Factor Weighted Matrix</div>
            <div className="text-[10px] text-indigo-600 font-semibold">0.45 GNN + 0.35 Anom + 0.15 R + 0.05 M</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Verdict Classification Bands</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">CRITICAL &ge; 0.80</div>
            <div className="text-[10px] text-rose-600 font-semibold">Immediate Section 91/102 Freeze</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Legal Admissibility Standard</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">Sec 65B IEA / Sec 63 BSA</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Supreme Court Arjun Panditrao Benchmark</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Evidence Integrity Seal</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">SHA-256 Digest</div>
            <div className="text-[10px] text-sky-600 font-semibold">Zero Probabilistic LLM Drift</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: The Composite Risk Engine */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Composite Risk Engine
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Calibrated multi-factor risk formulation, mathematical weighting matrix, and actionable operational verdict tiers
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Raw machine learning inferences cannot be directly acted upon in sovereign counter-terror finance operations.
            A high tabular anomaly score could indicate a benign institutional cold storage re-allocation, while an unflagged
            transaction might participate in a complex multi-hop peeling funnel. To achieve robust operational discrimination,
            the NTRO surveillance architecture synthesizes multi-modal signals into a single scalar metric:
          </p>

          {/* Mathematical Formulation Display Card */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Canonical Mathematical Formulation (Phase 8 Specification)</span>
              <span className="self-start sm:self-auto text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                PROVABLY BOUNDED [0.0, 1.0]
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 overflow-x-auto py-2">
              {"Risk = clip(0.35 · S_anomaly + 0.45 · P_gnn + 0.15 · R_rules + 0.05 · M_mixing, 0.0, 1.0)"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-200/80">
              <div>
                <span className="text-indigo-700 font-bold">0.35 &bull; S_anomaly</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  FT-Transformer 18-feature continuous reconstruction error normalized against the 95th percentile validation threshold.
                </div>
              </div>
              <div>
                <span className="text-sky-700 font-bold">0.45 &bull; P_gnn</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Multi-Head Relational Graph Transformer proximity probability propagated from Ransomwhere illicit seed wallets.
                </div>
              </div>
              <div>
                <span className="text-amber-700 font-bold">0.15 &bull; R_rules</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Rule bonus formula: <code className="font-mono text-[10px] bg-slate-200/80 px-1 py-0.5 rounded font-semibold">R_rules = min(|Rules|, 5) / 5</code> (0.20 per rule, capped at 1.0) for discrete policy infractions (darknet ASN hops, mempool fee surging, burst velocity).
                </div>
              </div>
              <div>
                <span className="text-purple-700 font-bold">0.05 &bull; M_mixing</span>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Binary structural indicator triggered if Cypher graph traversal confirms &ge;5-hop peeling chains or CoinJoin pools.
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-900 pt-2">
            Engineering Rationale Behind the Modality Weights
          </h3>
          <p>
            The weighting distribution prioritizes <strong>Topological Relational Context (45%)</strong> above single-transaction tabular metrics (35%).
            Laundering syndicates can manipulate amounts, delay broadcast hours, or pad transaction sizes to masquerade as ordinary retail transfers.
            However, transferring Bitcoin value necessitates spending UTXOs, creating immutable directed graph structures that cannot be camouflaged.
            The Relational Graph Transformer traces this inescapable topological lineage across multiple hops, making it the most resilient detection vector.
          </p>

          {/* 4 Verdict Tiers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-600 text-white">
                  CRITICAL
                </span>
                <span className="font-mono text-xs font-bold text-rose-900">&ge; 0.80</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Immediate Warrant &amp; Seizure</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct illicit seed affiliation combined with extreme anomaly scores. Mandatory dispatch of Section 91/102 CrPC asset freeze orders to registered exchanges and FIU-IND escalation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-600 text-white">
                  HIGH
                </span>
                <span className="font-mono text-xs font-bold text-amber-900">&ge; 0.60</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Enhanced Due Diligence (EDD)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strong topological proximity to flagged clusters or active peeling chain change retention. Target marked for automated mempool sniffing and subpoena preparation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-sky-300 bg-sky-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-600 text-white">
                  MEDIUM
                </span>
                <span className="font-mono text-xs font-bold text-sky-900">&ge; 0.40</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Passive Surveillance Watchlist</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Moderate anomaly scores or ambiguous OTC liquidity flow without confirmed illicit taint. Added to persistent surveillance index for periodic re-clustering.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-600 text-white">
                  LOW
                </span>
                <span className="font-mono text-xs font-bold text-emerald-900">&lt; 0.40</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Nominal Commerce Flow</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standard retail, miner, or cold storage traffic. Conforms to historical baselines with zero mixer interactions; archived to standard audit logs without active alerting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: The Tri-Partite Explainability (XAI) Arsenal */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Tri-Partite Explainability (XAI) Arsenal
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Local feature attributions, graph neighborhood masks, and deterministic statutory narrative synthesis
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Under Section 45 of the Indian Evidence Act, expert witness testimony based on automated systems is subject
            to rigorous judicial scrutiny. A black-box classification (&ldquo;the AI model flagged this wallet&rdquo;) is legally
            inadmissible as conclusive proof. The NTRO architecture implements a <strong>Tri-Partite XAI Arsenal</strong> that
            transforms neural tensor activations into courtroom-admissible mathematical proofs:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Pillar 1: SHAP */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">1. SHAP Waterfall Attributions</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Computes exact Shapley feature attributions ($\phi_i$) over the 18 continuous tabular features of the FT-Transformer.
                Breaks down the prediction into positive pushes (+0.028 Peel Ratio, +0.019 Fee Rate) and negative attenuations (-0.005 Tx Count),
                proving exactly how each parameter deflected the anomaly score above the 95th percentile baseline.
              </p>
              <div className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 p-1.5 rounded border border-indigo-200">
                Axiomatically Unique &bull; Zero Heuristic Guesswork
              </div>
            </div>

            {/* Pillar 2: GNNExplainer & Native Transformer Attention */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                <Network className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">2. Graph Attention &amp; GNNExplainer</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Relational Graph Transformer natively produces multi-head attention weights (<code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">top_attention_links</code>) directly from TransformerConv layers (0.0120 ms/node). For baseline comparison, post-hoc GNNExplainer was evaluated on legacy baseline GraphSAGE (12.2s baseline) to isolate minimal 2-hop computational subgraphs $G_s \subseteq G$ maximizing mutual information $MI(Y, G_s)$ across 6 to 10 key transaction edges.
              </p>
              <div className="text-[10px] font-mono text-sky-700 font-bold bg-sky-50 p-1.5 rounded border border-sky-200">
                Native Multi-Head Attention &bull; GraphSAGE Benchmark
              </div>
            </div>

            {/* Pillar 3: Deterministic NLG */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <FileCode className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">3. Deterministic Narrative Engine</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Converts mathematical weights into concise, court-ready English prose using rigid deterministic template interpolation
                (<code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">_build_narrative()</code>).
                Completely eliminates generative LLM hallucination risks, ensuring identical, reproducible testimony across independent reruns.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded border border-emerald-200">
                Zero LLM Drift &bull; 100% Deterministic Reproducibility
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Court-Admissible Section 65B Legal Certification */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Court-Admissible Section 65B Legal Certification
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Statutory compliance under Section 65B Indian Evidence Act 1872 &amp; Section 63 Bharatiya Sakshya Adhiniyam 2023
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            In Indian criminal jurisprudence, secondary electronic evidence is strictly inadmissible unless accompanied by a
            statutory certificate under <strong>Section 65B(4) of the Indian Evidence Act, 1872</strong> (re-enacted as <strong>Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023</strong>).
            Following the binding precedent of the Hon&rsquo;ble Supreme Court in <em>Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1</em>,
            compliance cannot be waived or cured retrospectively.
          </p>

          <p>
            The NTRO forensic export subsystem (<code className="font-mono text-slate-800 text-xs">dossierExport.ts</code>) enforces the <strong>Four Pillars of Admissibility</strong>:
          </p>

          {/* 4 Pillars of Admissibility Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-900">Immutable SHA-256 Checksum Sealing</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every raw transaction batch and model output tensor is digested via native Web Crypto SHA-256 into a canonical 64-hex manifest.
                Any subsequent tampering with a single byte in the database or report invalidates the cryptographic seal instantly.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="text-xs font-bold text-slate-900">Air-Gapped Chain of Custody Stamp</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Certifies that the software operated on an isolated, sovereign pure-CPU server node (<code className="font-mono text-[10px] text-slate-800">NTRO-NODE-IND-DEL-*-SOV-01</code>) with zero outbound network connectivity (air-gap attestation), NTP-synchronized UTC/IST timestamps, and operator identification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h4 className="text-xs font-bold text-slate-900">Algorithmic Reproducibility Manifest</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Binds the certified report to immutable PyTorch checkpoint hashes (<code className="font-mono text-[10px] text-slate-800">fe110848...</code> for FT-Transformer and <code className="font-mono text-[10px] text-slate-800">0ada0cda...</code> for Graph Transformer), ensuring independent judicial experts can reproduce identical tensors on commodity hardware.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <h4 className="text-xs font-bold text-slate-900">Dual Statutory Signature Blocks</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates statutory declaration blocks signed jointly by the Chief Cryptographic Systems Custodian (attesting to hardware/software continuity) and the Investigating Officer (attesting to operational chain of custody).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Dual Export Formats */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Dual Export Formats: JSON Manifest &amp; Court-Ready PDF
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Machine-parsable JSON evidence bundles and print-formatted judicial affidavits
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            To accommodate both automated judicial registry ingestion (e-Courts India) and physical courtroom proceedings, the system exports dossiers in two synchronized formats:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5" /> FORMAT A
                </span>
                <span className="font-mono text-xs text-slate-500 font-bold">MACHINE-VERIFIABLE</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Cryptographically Sealed JSON Dossier</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contains complete normalized telemetry, raw transaction arrays, topological subgraphs, model weight checksums, and the canonical SHA-256 digital signature. Optimized for ingestion into CBI/ED digital evidence lockers and hash-chain audits.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> FORMAT B
                </span>
                <span className="font-mono text-xs text-slate-500 font-bold">TRIAL-READY AFFIDAVIT</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Print-Ready Forensic Dossier PDF</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Formatted for A4 portrait printing with official Government of India headers, official watermarks (&ldquo;COURT ADMISSIBLE • SEC 65B BSA 2023&rdquo;), dynamic composite risk dials, transaction flow diagrams, and statutory signature lines for immediate submission to the bench.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Interactive Visual Elements */}
      <section className="space-y-8 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Visual Elements &amp; Verification Toolkits
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Live composite risk scoring calculator, interactive SHAP waterfall breakdown, and mock Section 65B certificate inspector
            </p>
          </div>
        </div>

        {/* Module A: Live Risk Calculator */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Module A: Interactive Multi-Factor Risk Score Calculator
          </div>
          <RiskCalculator />
        </div>

        {/* Module B: SHAP Waterfall */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Module B: Interactive SHAP Waterfall Feature Attribution
          </div>
          <ShapWaterfall />
        </div>

        {/* Module C: Section 65B Certificate Inspector */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-sky-600" />
            Module C: Mock Section 65B / Section 63 BSA Certificate Inspector
          </div>
          <LegalCertificateViewer />
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Link
          href="/docs/ch5-dual-transformer-ml"
          className="w-full sm:w-auto p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between sm:justify-start gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
              <div className="font-semibold text-slate-900">Ch 5: Dual Transformer ML Engine</div>
            </div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center order-last sm:order-none">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH06
        </div>

        <Link
          href="/docs/ch7-online-inference-sync"
          className="w-full sm:w-auto btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center justify-between sm:justify-start gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 7: Live Post-Ingest Sync</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2 shrink-0" />
        </Link>
      </div>
    </article>
  );
}
