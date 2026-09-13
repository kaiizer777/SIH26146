"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  Database,
  GitFork,
  Cpu,
  FileCheck2,
  Zap,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Layers,
  ChevronRight,
} from "lucide-react";

interface PipelineStage {
  id: string;
  num: string;
  name: string;
  shortName: string;
  tagline: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  icon: React.ComponentType<{ className?: string }>;
  metric: string;
  metricLabel: string;
  input: string;
  process: string;
  output: string;
  whyItMatters: string;
}

const STAGES: PipelineStage[] = [
  {
    id: "ingest",
    num: "01",
    name: "Multi-Format Ingestion & GeoIP",
    shortName: "Ingest & GeoIP",
    tagline: "Absorbs bulk transaction dumps and maps geographic origins without internet access",
    accent: "emerald",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200",
    accentText: "text-emerald-700",
    icon: UploadCloud,
    metric: "11,938 rows/s",
    metricLabel: "Verified Throughput",
    input: "Raw CSV, JSON, XML dumps from surveillance feeds",
    process: "Pydantic normalization + local MaxMind MMDB Country & ASN resolution",
    output: "Sanitized transactions + quarantine log for malformed rows",
    whyItMatters: "Eliminates data corruption and enriches physical origin without external DNS or cloud leaks.",
  },
  {
    id: "storage",
    num: "02",
    name: "Dual-Storage Ledger & Graph Projection",
    shortName: "Dual Storage",
    tagline: "Stores immutable transaction ledger in SQL while projecting entity networks into Neo4j",
    accent: "blue",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentText: "text-blue-700",
    icon: Database,
    metric: "100% ACID",
    metricLabel: "Ledger Durability",
    input: "Normalized transaction batches from Celery workers",
    process: "PostgreSQL 16 writes ledger with native SQL arrays; Neo4j projects :CO_SPEND edges",
    output: "Unified multi-tier graph (:Wallet, :Transaction, :IP)",
    whyItMatters: "Decouples massive transaction writes from graph analysis, preventing database crashes.",
  },
  {
    id: "heuristics",
    num: "03",
    name: "Laundering Heuristics & Louvain Clustering",
    shortName: "Laundering Heuristics",
    tagline: "Detects peeling chains, CoinJoin mixers, and groups multi-input co-spending entities",
    accent: "amber",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    accentText: "text-amber-700",
    icon: GitFork,
    metric: "97.2% / 100%",
    metricLabel: "Peeling / CoinJoin Accuracy",
    input: "Projected wallet relationships in Neo4j GDS",
    process: "Cypher pattern traversal + Louvain modularity clustering + PageRank from ransomware seeds",
    output: "Flagged peeling sequences, identified mixing pools, and entity clusters",
    whyItMatters: "Unmasks obfuscated laundering structures that manual inspection would miss across hops.",
  },
  {
    id: "ml-engine",
    num: "04",
    name: "Dual Transformer & Deep Learning Engine",
    shortName: "Neural ML Engine",
    tagline: "Combines unsupervised anomaly detection with graph neural network classification on CPU",
    accent: "purple",
    accentBg: "bg-purple-50",
    accentBorder: "border-purple-200",
    accentText: "text-purple-700",
    icon: Cpu,
    metric: "25.4ms",
    metricLabel: "CPU Inference Latency",
    input: "18 transaction features + 8 topological graph node embeddings",
    process: "18-Feature Autoencoder (MSE anomaly) + 3-Layer GraphSAGE GNN with Focal Loss",
    output: "Composite risk score (0.00 - 1.00) with confidence interval",
    whyItMatters: "Detects zero-day laundering tactics with zero dependence on GPU drivers or cloud servers.",
  },
  {
    id: "evidence",
    num: "05",
    name: "Explainable AI & Legal Dossier",
    shortName: "Legal Dossier (§65B)",
    tagline: "Translates neural risk scores into court-admissible forensic evidence and visual explanations",
    accent: "sky",
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-200",
    accentText: "text-sky-700",
    icon: FileCheck2,
    metric: "Section 65B",
    metricLabel: "Evidence Act Certified",
    input: "Model predictions, cluster context, and raw cryptographic hashes",
    process: "SHAP waterfall feature attribution + GNNExplainer subgraph masks + narrative compiler",
    output: "Court-ready PDF dossier with timestamped cryptographic chain of custody",
    whyItMatters: "Ensures technical intelligence stands up in judicial scrutiny with explainable proof.",
  },
];

export function PipelineStepper() {
  const [activeStage, setActiveStage] = useState<number>(0);
  const current = STAGES[activeStage];
  const Icon = current.icon;

  return (
    <div className="space-y-5">
      {/* 5-Stage Stepper Header / Progress Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STAGES.map((stage, idx) => {
          const isSelected = activeStage === idx;
          const StageIcon = stage.icon;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              className={`text-left p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer relative ${
                isSelected
                  ? "bg-gradient-to-b from-blue-600 to-blue-700 border-t border-t-blue-400/80 border-x border-x-blue-700 border-b border-b-blue-900 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-600"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-blue-50 text-blue-700 border border-blue-200/60"
                  }`}
                >
                  STAGE {stage.num}
                </span>
                <StageIcon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? "text-white" : "text-blue-600"
                  }`}
                />
              </div>
              <div
                className={`text-xs font-bold truncate ${
                  isSelected ? "text-white" : "text-slate-900"
                }`}
              >
                {stage.shortName}
              </div>
              <div
                className={`text-[10.5px] font-mono truncate mt-0.5 ${
                  isSelected ? "text-blue-100" : "text-slate-500"
                }`}
              >
                {stage.metric}
              </div>

              {/* Bottom active indicator */}
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full shadow-xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Stage Detail Card */}
      <div className="card-tactical rounded-xl p-5 sm:p-6 bg-white border border-slate-200/90 shadow-xs space-y-5">
        {/* Stage Header & KPI Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-600 border-t border-t-blue-300/70 border-b border-b-blue-800 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">
                  Stage {current.num} of 05
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10.5px] font-mono font-semibold text-blue-600 uppercase">
                  Autonomous Pipeline
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-950 tracking-tight">
                {current.name}
              </h3>
            </div>
          </div>

          {/* Benchmark Metric Pill */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex-shrink-0 self-start sm:self-auto">
            <Zap className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">
                {current.metricLabel}
              </div>
              <div className="text-sm font-mono font-bold text-slate-900 leading-tight">
                {current.metric}
              </div>
            </div>
          </div>
        </div>

        {/* High-Level Punchline */}
        <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/70 flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
            {current.tagline}
          </p>
        </div>

        {/* 3-Part Progression Flow (Input -> Engine -> Output) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
            <div className="text-[10.5px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              1. Input Feed
            </div>
            <p className="text-xs text-slate-700 leading-normal">
              {current.input}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200/80 space-y-1">
            <div className="text-[10.5px] font-mono font-bold text-blue-700 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              2. Core Engine Execution
            </div>
            <p className="text-xs text-slate-700 leading-normal">
              {current.process}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-50/40 border border-emerald-200/80 space-y-1">
            <div className="text-[10.5px] font-mono font-bold text-emerald-700 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              3. Verified Output
            </div>
            <p className="text-xs text-slate-700 leading-normal">
              {current.output}
            </p>
          </div>
        </div>

        {/* Bottom Takeaway & Next Stage Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Operational Benefit:</strong> {current.whyItMatters}
            </span>
          </div>

          <button
            onClick={() => setActiveStage((activeStage + 1) % STAGES.length)}
            className="btn-tactical-secondary text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-md inline-flex items-center space-x-1 self-end sm:self-auto cursor-pointer"
          >
            <span>Next Stage</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
