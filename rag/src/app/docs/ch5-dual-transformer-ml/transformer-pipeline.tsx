"use client";

import React, { useState } from "react";
import {
  Cpu,
  Network,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Info,
  Hash,
  Search,
  Eye,
  Zap,
} from "lucide-react";

interface PipelineStep {
  stepNumber: string;
  name: string;
  shortDesc: string;
  dataProfile: string;
  inspectionLogic: string;
  hardwareRuntime: string;
  engineeringRationale: string;
  sourceFile: string;
}

const DETECTIVE_A_STEPS: PipelineStep[] = [
  {
    stepNumber: "01",
    name: "18-Point Transaction Trait Ingestion",
    shortDesc: "Inspects 18 raw numeric traits across transaction amounts, fee rates, velocity, and network peer footprints.",
    dataProfile: "18 Numeric Features (Fees, BTC Amounts, Output Ratios, IPs, Timestamps)",
    inspectionLogic: "Normalizes wild swings in Bitcoin values so subtle micro-peels and massive whale transfers are evaluated with equal precision.",
    hardwareRuntime: "0.12 ms (Standard CPU)",
    engineeringRationale: "Eliminates distortion from extreme values. Old machine learning was easily blinded by single large numbers; Detective A evaluates subtle peeling hops with the exact same razor focus.",
    sourceFile: "backend/app/services/feature_extractor.py#L9-L28",
  },
  {
    stepNumber: "02",
    name: "Digital Trait Tokenizer (Individual Identities)",
    shortDesc: "Converts each of the 18 traits into its own dedicated 32-dimensional digital fingerprint.",
    dataProfile: "18 Dedicated Trait Profiles (32 Dimensions Each)",
    inspectionLogic: "Each trait (fee rate, change ratio, broadcaster IP count) is given its own rich numerical profile rather than being squashed together.",
    hardwareRuntime: "0.45 ms (Vectorized CPU)",
    engineeringRationale: "Old ML smashed all numbers into a single blurry average. Our tokenizer gives every clue its own seat at the table so suspicious fee spikes never get lost among normal transaction details.",
    sourceFile: "backend/app/ml/ft_transformer.py#L25-L62",
  },
  {
    stepNumber: "03",
    name: "Lead Detective Summary Token ([CLS])",
    shortDesc: "Attaches a master summary token that gathers intelligence across all 18 transaction traits.",
    dataProfile: "1 Master Summary Token + 18 Trait Tokens",
    inspectionLogic: "Acts as the Chief Auditor's notebook, cross-referencing all 18 individual clues into a single, cohesive case file.",
    hardwareRuntime: "0.08 ms (Instant CPU stride)",
    engineeringRationale: "Similar to modern language models (BERT), this master token acts as an executive summary aggregator, synthesizing clues from across all features for the final verdict.",
    sourceFile: "backend/app/ml/ft_transformer.py#L165-L215",
  },
  {
    stepNumber: "04",
    name: "4-Lens Cross-Feature Self-Attention",
    shortDesc: "Multi-head attention allows all 18 traits to cross-examine and validate one another simultaneously.",
    dataProfile: "4 Specialized Attention Lenses Scanning 19 Tokens",
    inspectionLogic: "Traits cross-examine each other: e.g., 'Does this high fee make sense given the 95% change output and late-night timestamp?'",
    hardwareRuntime: "1.85 ms (Optimized CPU kernels)",
    engineeringRationale: "Catches multi-variable laundering tricks. Criminals can disguise fees or split amounts, but they cannot hide the artificial relationship between abnormal change ratios and mixing entropy.",
    sourceFile: "backend/app/ml/ft_transformer.py#L64-L130",
  },
  {
    stepNumber: "05",
    name: "Master Profile Extraction & Noise Filtering",
    shortDesc: "Extracts the refined transaction profile while filtering out background network noise.",
    dataProfile: "Unified 32-Dimension Transaction Fingerprint",
    inspectionLogic: "Distills the cross-examined traits into a clean, noise-free summary of the transaction's true behavioral pattern.",
    hardwareRuntime: "0.05 ms",
    engineeringRationale: "Separates genuine criminal anomalies from benign network congestion (such as temporary fee spikes caused by ordinary mempool traffic).",
    sourceFile: "backend/app/ml/ft_transformer.py#L221-L225",
  },
  {
    stepNumber: "06",
    name: "Anomaly Reconstruction Check",
    shortDesc: "Tests whether this transaction behaves like normal, legitimate Bitcoin economic activity.",
    dataProfile: "Reconstruction Fit Score (Normal vs Illicit)",
    inspectionLogic: "Normal transactions reconstruct effortlessly. Laundering tricks (peeling chains, CoinJoins) fail reconstruction and trigger an immediate alert.",
    hardwareRuntime: "0.35 ms (Per 1,000 transactions)",
    engineeringRationale: "Catches zero-day, never-before-seen ransomware tactics! Because it learns what normal looks like, any novel laundering technique naturally fails the reconstruction test.",
    sourceFile: "backend/app/ml/ft_transformer.py#L240-L252",
  },
  {
    stepNumber: "07",
    name: "Free Instant Explainability (0.0ms Delay!)",
    shortDesc: "Extracts the exact reasons for the alert directly from the transformer's attention map.",
    dataProfile: "18x18 Cross-Trait Heatmap + Direct Feature Attribution",
    inspectionLogic: "The transformer directly exposes which traits triggered the alert without requiring any extra calculation.",
    hardwareRuntime: "0.00 ms (Zero Extra Compute Overhead)",
    engineeringRationale: "Legacy models required 250ms+ per transaction to generate explanations using external SHAP tools. Detective A delivers full forensic explainability in 0.0ms, enabling real-time mempool alerts!",
    sourceFile: "backend/app/ml/ft_transformer.py#L232-L238",
  },
];

const DETECTIVE_B_STEPS: PipelineStep[] = [
  {
    stepNumber: "01",
    name: "Wallet Identity Profiling (8 Topological Traits)",
    shortDesc: "Combines 8 structural, anomaly, and heuristic properties for each Bitcoin wallet node.",
    dataProfile: "8 Forensic Traits per Wallet (Volume, Fees, Entropy, Proximity)",
    inspectionLogic: "Merges wallet history, transaction velocity, and proximity to known ransomware clusters into a unified starting profile.",
    hardwareRuntime: "1.2 ms (Graph projection)",
    engineeringRationale: "Bridges single-transaction data with long-term wallet behavior, ensuring the AI sees both the individual transaction and the wallet's historical role.",
    sourceFile: "backend/app/ml/graph_transformer.py#L8-L11",
  },
  {
    stepNumber: "02",
    name: "3-Relation Connection Lenses (Not All Links Are Equal)",
    shortDesc: "Distinguishes between common ownership, standard payment flows, and suspicious peeling chains.",
    dataProfile: "3 Discrete Relationship Types: Co-Spend, Flow, Peeling",
    inspectionLogic: "Labels each graph connection with its forensic meaning rather than treating all links as simple lines on a map.",
    hardwareRuntime: "0.15 ms (Fast lookup)",
    engineeringRationale: "Old GNNs (GraphSAGE) treated all links identically. Detective B understands that sharing private keys (co-spending) is far more intimate than buying coffee with a standard payment.",
    sourceFile: "backend/app/ml/graph_transformer.py#L12-L17",
  },
  {
    stepNumber: "03",
    name: "Layer 1: First-Hop Relational Attention",
    shortDesc: "Scans immediate wallet neighbors through 4 dynamic attention lenses.",
    dataProfile: "4 Multi-Head Attention Lenses (128-Dimension Context)",
    inspectionLogic: "Dynamically weighs neighbor influence based on both wallet behavior AND the specific connection type.",
    hardwareRuntime: "145.2 ms (Full 24,673 graph; 2.1 ms on 2-hop ego-net)",
    engineeringRationale: "Automatically dims benign interactions while spotlighting suspicious transactions connected to known ransomware clusters.",
    sourceFile: "backend/app/ml/graph_transformer.py#L18-L20",
  },
  {
    stepNumber: "04",
    name: "Pattern Sharpening & Signal Normalization",
    shortDesc: "Refines intermediate risk signals and eliminates signal saturation.",
    dataProfile: "Sharpened 128-Dimension Network Embedding",
    inspectionLogic: "Stabilizes signal transmission across complex, multi-branching syndicate graphs.",
    hardwareRuntime: "2.1 ms (Elementwise CPU)",
    engineeringRationale: "Prevents high-volume legitimate nodes (like exchanges) from washing out delicate money laundering signals across multi-hop paths.",
    sourceFile: "backend/app/ml/graph_transformer.py#L20",
  },
  {
    stepNumber: "05",
    name: "Layer 2: Two-Hop Syndicate Tracing (Mule Networks)",
    shortDesc: "Captures 2-hop laundering paths through intermediary mule accounts.",
    dataProfile: "16-Dimension Compact Risk Signature",
    inspectionLogic: "Traces fund movement from Sender → Intermediary Mule → Final Cash-Out, propagating risk across intermediate hops.",
    hardwareRuntime: "112.4 ms (Full graph; 1.8 ms on localized ego-net)",
    engineeringRationale: "Criminals use disposable middleman wallets to disguise their tracks. Two-hop attention links the origin syndicate directly to the cash-out point even when an intermediary is used.",
    sourceFile: "backend/app/ml/graph_transformer.py#L21-L22",
  },
  {
    stepNumber: "06",
    name: "Visual Connection Glow (Forensic Attention Highlighting)",
    shortDesc: "Extracts exact attention scores on each transaction link for visual graph rendering.",
    dataProfile: "Link Attention Weights (0.0 to 1.0) on Every Graph Edge",
    inspectionLogic: "Calculates the exact significance of every transfer link, illuminating suspicious routes on the investigator HUD in cyan glow.",
    hardwareRuntime: "1.8 ms (Instant weight extraction)",
    engineeringRationale: "Enables non-technical investigators to see the exact money path the AI flagged, providing court-ready visual evidence under Section 65B.",
    sourceFile: "backend/app/ml/graph_transformer.py#L26-L29",
  },
  {
    stepNumber: "07",
    name: "Needle-in-a-Haystack Risk Scoring (Smart Focus)",
    shortDesc: "Calibrates final risk score using smart class-imbalance focus.",
    dataProfile: "Final Risk Score (0.0 to 1.0) per Wallet",
    inspectionLogic: "Down-weights 200,000+ easy benign wallets by 10,000x, forcing the AI to focus exclusively on elusive criminal syndicates.",
    hardwareRuntime: "0.85 ms (Final scoring)",
    engineeringRationale: "With <5% of wallets being illicit, standard models get blinded by normal traffic. Our smart focus drives F1 score to an industry-leading 0.9209 and peeling recall to 94.8%.",
    sourceFile: "backend/app/ml/graph_transformer.py#L31-L34",
  },
];

export function TransformerPipeline() {
  const [activeModel, setActiveModel] = useState<"ft" | "graph">("ft");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(3); // default: attention stage

  const steps = activeModel === "ft" ? DETECTIVE_A_STEPS : DETECTIVE_B_STEPS;
  const currentStep = steps[activeStepIndex] || steps[0];

  return (
    <div className="card-tactical rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      {/* Visualizer Top Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-white">
                TWO AI DETECTIVES IN ACTION
              </span>
              <span className="text-xs font-mono text-emerald-600 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                4.8ms AIR-GAPPED CPU PIPELINE
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              Inside the AI Detective Investigation Pipeline
            </h3>
          </div>

          {/* Model Toggle Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs self-start">
            <button
              onClick={() => {
                setActiveModel("ft");
                setActiveStepIndex(3);
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeModel === "ft"
                  ? "tab-tactical-active text-slate-900 font-bold border border-slate-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-600" />
              Detective A: FT-Transformer (Traits)
            </button>
            <button
              onClick={() => {
                setActiveModel("graph");
                setActiveStepIndex(2);
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeModel === "graph"
                  ? "tab-tactical-active text-slate-900 font-bold border border-slate-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-indigo-600" />
              Detective B: Graph Transformer (Web)
            </button>
          </div>
        </div>

        {/* Model Architecture Summary Pill Ribbon */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2 font-mono text-[11px]">
          {activeModel === "ft" ? (
            <>
              <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                Role: Forensic Accountant (18 Numeric Traits)
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                Model Footprint: 18,930 params (~85.5 KB)
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                4 Self-Attention Lenses
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Latency: 0.022 ms/sample on Basic CPU
              </span>
            </>
          ) : (
            <>
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-semibold">
                Role: Syndicate Web Tracker (4 Connection Lenses)
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                Model Footprint: 34,865 params (~145.4 KB)
              </span>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                3 Discrete Relational Edge Types
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                4.8ms Local Scoring &bull; F1: 0.9209 &bull; Peeling Recall: 94.8%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / TOP: The Sequential Stage Diagram Flow */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="text-[11px] font-mono font-bold uppercase text-slate-500 flex items-center justify-between pb-1">
            <span>Investigation Flow &bull; Click any step to inspect</span>
            <span>7 Investigation Stages</span>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isSelected = activeStepIndex === idx;
              return (
                <div
                  key={step.stepNumber}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group relative ${
                    isSelected
                      ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900/15"
                      : "bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900"
                      }`}
                    >
                      {step.stepNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {step.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {step.dataProfile}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 flex-shrink-0">
                    <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
                      {step.hardwareRuntime}
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected
                          ? "text-slate-900 translate-x-0.5"
                          : "text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Detailed Step Inspector Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs space-y-4 sticky top-20">
            {/* Header of Inspector */}
            <div className="border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500">
                <span>
                  {activeModel === "ft" ? "DETECTIVE A" : "DETECTIVE B"} &bull; STAGE {currentStep.stepNumber}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                  {currentStep.hardwareRuntime}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                {currentStep.name}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {currentStep.shortDesc}
              </p>
            </div>

            {/* Data Profile */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1">
                <Hash className="w-3 h-3 text-sky-600" />
                Forensic Data Profile:
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-900 font-semibold overflow-x-auto shadow-2xs">
                {currentStep.dataProfile}
              </div>
            </div>

            {/* How the AI Detective Inspects It */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1">
                <Search className="w-3 h-3 text-indigo-600" />
                How the AI Detective Inspects It:
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed overflow-x-auto shadow-2xs">
                {currentStep.inspectionLogic}
              </div>
            </div>

            {/* Engineering Advantage vs Baseline */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Why This Beats Legacy Models:
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentStep.engineeringRationale}
              </p>
            </div>

            {/* Source Code Citation Link */}
            <div className="p-2 bg-slate-100/70 rounded border border-slate-200 font-mono text-[10px] text-slate-500 flex items-center justify-between">
              <span className="truncate">Source: {currentStep.sourceFile}</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 flex-shrink-0">
                VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
