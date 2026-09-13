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
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Search,
} from "lucide-react";

interface PipelineStage {
  id: string;
  num: string;
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  metric: string;
  metricLabel: string;
  analogy: string;
  input: string;
  process: string;
  output: string;
  whyItMatters: string;
}

const STAGES: PipelineStage[] = [
  {
    id: "ingest",
    num: "01",
    name: "Step 1: Read Files & Find Country Origins (Offline)",
    shortName: "1. Ingest & GeoIP",
    tagline: "Takes thousands of messy transaction records and maps where they came from in the physical world without using the internet.",
    badge: "100% Offline Processing",
    icon: UploadCloud,
    metric: "11,938 rows/sec",
    metricLabel: "Ingest Speed",
    analogy: "Like airport customs scanning passports at lightning speed and stamping country names without needing to call headquarters.",
    input: "Raw multi-format files (CSV, JSON, or XML dumps up to 500 MB)",
    process: "Auto-sniffs format from first 512 bytes, validates rows via Pydantic, resolves country/ASN via local MaxMind MMDB files, and bulk-inserts via PostgreSQL COPY in 5,000-row chunks.",
    output: "Clean, verified transactions stamped with country and ASN provider details without any external cloud calls.",
    whyItMatters: "Fixes corrupt records and finds the physical location of suspects without alerting anyone on the internet.",
  },
  {
    id: "storage",
    num: "02",
    name: "Step 2: Save in Vault & Draw the Crime Web",
    shortName: "2. Vault & Web",
    tagline: "Locks every record into a tamper-proof database and connects wallets and IPs into an interactive crime spiderweb.",
    badge: "Dual Storage Engine",
    icon: Database,
    metric: "100% Tamper-Proof",
    metricLabel: "Durability",
    analogy: "PostgreSQL is our bank vault holding permanent receipts; Neo4j is the detective's corkboard connecting suspects with red string.",
    input: "Clean transactions from Step 1",
    process: "Saves unalterable receipts in PostgreSQL 16 (ACID durability, B-tree indexes) while projecting 24,673 wallets and 100k transactions into Neo4j 5.26 with GDS.",
    output: "Dual-storage sync: permanent SQL financial audit trails + interactive Neo4j crime graph with co-spend clusters.",
    whyItMatters: "Separates heavy storage from fast graph searching so the app stays fast and never crashes during an investigation.",
  },
  {
    id: "heuristics",
    num: "03",
    name: "Step 3: Catch Money Laundering Tricks Automatically",
    shortName: "3. Catch Tricks",
    tagline: "Automated tripwires that spot money 'peeling' (splitting cash across 20 wallets) and mixers (tumblers).",
    badge: "Instant Rule Radar",
    icon: GitFork,
    metric: "97.2% Catch Rate",
    metricLabel: "Peeling Recall",
    analogy: "Like automated toll cameras flagging a getaway car changing license plates and taking 10 consecutive side exits.",
    input: "The connected web of transactions, wallets, and IP links",
    process: "Traverses graph paths >=5 hops deep to spot linear peeling flows (<=5% change, >=80% forward) and equal-output CoinJoin pools (>=3 inputs/outputs within +-1%).",
    output: "Red-flag alerts isolating peeling chains (97.2% recall), CoinJoin mixing pools (100% recall), and syndicate clusters.",
    whyItMatters: "Instantly uncovers complex money-splitting tricks that would take a human analyst weeks to trace manually.",
  },
  {
    id: "ml-engine",
    num: "04",
    name: "Step 4: AI Detective Scan (Dual Transformers)",
    shortName: "4. AI Detectives",
    tagline: "Two specialized Transformer models team up: FT-Transformer audits 18 financial traits, Relational Graph Transformer traces syndicate links.",
    badge: "Dual Transformers (CPU)",
    icon: Cpu,
    metric: "4.8 milliseconds",
    metricLabel: "CPU Latency",
    analogy: "Detective 1 (FT-Transformer) audits unusual payment traits; Detective 2 (Graph Transformer) traces multi-hop syndicate relationships via 4-head attention.",
    input: "18 tabular features (velocity, amount, fee rate, output entropy) + multi-relation graph topology",
    process: "Both Transformer models evaluate data simultaneously on pure laptop CPU (<250 KB total weights) without requiring any GPUs.",
    output: "A calibrated Risk Score from 0.00 (Safe) to 1.00 (Severe Threat) with composite breakdown (0.35 anomaly + 0.45 risk + 0.15 rules + 0.05 mixing).",
    whyItMatters: "Detects brand new, sneaky money-laundering patterns that simple rules might miss, in just 4.8ms per entity.",
  },
  {
    id: "evidence",
    num: "05",
    name: "Step 5: Generate Court-Ready Evidence Dossier",
    shortName: "5. Court Dossier",
    tagline: "Turns AI predictions and transaction history into a certified, plain-English legal report ready for court.",
    badge: "Section 65B Certified",
    icon: FileCheck2,
    metric: "Section 65B / 63 BSA",
    metricLabel: "Legal Standard",
    analogy: "Translates high-tech AI analysis into a clean police dossier with digital signatures that a judge can easily understand and trust.",
    input: "Composite risk scores, 18-feature SHAP attributions, relational attention weights, and raw telemetry",
    process: "Computes deterministic SHA-256 cryptographic digest, logs ISO 8601 UTC & IST timestamps, and attaches statutory legal declaration.",
    output: "Complete certified Section 65B (IEA) / Section 63 (BSA 2023) digital dossier (1-click JSON and printable PDF).",
    whyItMatters: "Intelligence is useless if thrown out of court. This makes sure our evidence is 100% legally solid and admissible.",
  },
];

export function PipelineStepper() {
  const [activeStage, setActiveStage] = useState<number>(0);
  const current = STAGES[activeStage];
  const Icon = current.icon;

  return (
    <div className="space-y-5">
      {/* 5-Stage Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STAGES.map((stage, idx) => {
          const isSelected = activeStage === idx;
          const StageIcon = stage.icon;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
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
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-white rounded-full shadow-xs" />
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
            <div className="w-11 h-11 rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-600 border-t border-t-blue-300/70 border-b border-b-blue-800 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">
                  Stage {current.num} of 05
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10.5px] font-mono font-semibold text-blue-600 uppercase">
                  {current.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-950 tracking-tight">
                {current.name}
              </h3>
            </div>
          </div>

          {/* Benchmark Metric Pill */}
          <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg flex-shrink-0 self-start sm:self-auto">
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
        <div className="bg-slate-50/90 rounded-lg p-3.5 border border-slate-200/80 flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
            {current.tagline}
          </p>
        </div>

        {/* Real-World Analogy Pill */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold text-amber-950">Simple Analogy: </strong>
            {current.analogy}
          </div>
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
              <strong className="text-slate-900">Why It Matters:</strong> {current.whyItMatters}
            </span>
          </div>

          <button
            onClick={() => setActiveStage((activeStage + 1) % STAGES.length)}
            className="btn-tactical-secondary text-slate-800 text-xs font-semibold px-3.5 py-1.5 rounded-md inline-flex items-center space-x-1.5 self-end sm:self-auto cursor-pointer"
          >
            <span>Next Stage</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
