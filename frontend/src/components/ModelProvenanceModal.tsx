"use client";

import { useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import {
  X,
  Zap,
  ShieldCheck,
  Check,
  Copy,
  Activity,
  Clock,
  CheckCircle2,
  FileCode,
  Cpu,
  Layers,
  HardDrive,
  GitBranch,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export interface ModelProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BenchmarkRow {
  dimension: string;
  categoryTag: string;
  active: {
    title: string;
    badge: string;
    detail: string;
    chips: string[];
  };
  baseline: {
    title: string;
    detail: string;
  };
  impact: {
    tag: string;
    detail: string;
  };
}

const BENCHMARK_METRICS: BenchmarkRow[] = [
  {
    dimension: "Tabular Anomaly Engine",
    categoryTag: "Feature Space",
    active: {
      title: "FT-Transformer",
      badge: "SOTA Tabular",
      detail: "Feature Tokenizer (18x32d) + Multi-Head Self-Attention + [CLS] head",
      chips: ["18×32d Tokens", "Self-Attention", "[CLS] Head"],
    },
    baseline: {
      title: "Deep MLP Autoencoder",
      detail: "Feed-forward linear bottleneck (18-12-6-12-18)",
    },
    impact: {
      tag: "Attention Matrix",
      detail: "Native 18×18 cross-feature attention matrix detailing inter-variable correlations and non-linear risk factors.",
    },
  },
  {
    dimension: "Graph Proximity Engine",
    categoryTag: "Network Topology",
    active: {
      title: "Relational Graph Transformer",
      badge: "Multi-Head Conv",
      detail: "TransformerConv with 4 attention heads over heterogeneous multi-relational edges",
      chips: ["4 Attention Heads", "TransformerConv", "Dynamic Weighting"],
    },
    baseline: {
      title: "2-Layer GraphSAGE",
      detail: "Mean-pooling neighborhood aggregation",
    },
    impact: {
      tag: "Path Propagation",
      detail: "4-head relational attention weights propagate risk along Co-Spend & Peeling links without over-smoothing.",
    },
  },
  {
    dimension: "Edge Relations Modeled",
    categoryTag: "Edge Semantics",
    active: {
      title: "3 Heterogeneous Edge Types",
      badge: "Full Graph",
      detail: "CO_SPEND (input clustering), TX_FLOW (transfer), PEELING_FLOW (mixing splits)",
      chips: ["CO_SPEND", "TX_FLOW", "PEELING_FLOW"],
    },
    baseline: {
      title: "1 Static Relation",
      detail: "CO_SPEND adjacency only",
    },
    impact: {
      tag: "Mixing Detection",
      detail: "Detects rapid mixing hops, UTXO peel chains, and structural laundering paths through automated split tracking.",
    },
  },
  {
    dimension: "Explainability (XAI)",
    categoryTag: "Court Admissibility",
    active: {
      title: "Dual Attribution Engine",
      badge: "Court Admissible",
      detail: "Multi-Head Relational Attention Saliency + Tabular SHAP Waterfall decomposition",
      chips: ["Relational Saliency", "SHAP Waterfall", "Sub-graph Glow"],
    },
    baseline: {
      title: "SHAP Only",
      detail: "Global background Tree/Kernel SHAP attribution",
    },
    impact: {
      tag: "Section 65B Ready",
      detail: "Direct visual edge glow on laundering paths and pairwise feature correlation heatmaps compliant with legal standards.",
    },
  },
  {
    dimension: "Air-Gap Sovereign Footprint",
    categoryTag: "Deployment",
    active: {
      title: "231 KB Total Weights (.pt)",
      badge: "Zero GPU",
      detail: "Pure CPU PyTorch execution · Zero external CDN · Zero GPU dependency · <120ms cold boot",
      chips: ["Pure CPU", "Zero CDN", "<120ms Cold Boot"],
    },
    baseline: {
      title: "65 KB Weights",
      detail: "Legacy MLP + SAGE checkpoints",
    },
    impact: {
      tag: "Field Laptop Ready",
      detail: "Instant deterministic execution on low-spec edge field laptops (Acer Aspire Lite) with no network access.",
    },
  },
];

const MODEL_WEIGHTS_CHECKSUMS = [
  {
    filename: "ft_transformer_20260909.pt",
    model: "FT-Transformer Tabular Anomaly Engine",
    type: "Tabular Checkpoint",
    size: "85.5 KB",
    hash: "fe1108481979eb0261fb686f08a990687ace2b9cd4a180a27118209e1b14a163",
  },
  {
    filename: "graph_transformer_20260909.pt",
    model: "Multi-Head Relational Graph Transformer",
    type: "Graph Conv Checkpoint",
    size: "145.4 KB",
    hash: "0ada0cda7c3b9f3b50409a5f36063f455bab149f2a27191cd1fb9d0912ef203d",
  },
];

export default function ModelProvenanceModal({
  isOpen,
  onClose,
}: ModelProvenanceModalProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedDossier, setCopiedDossier] = useState(false);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const copyHash = useCallback((hash: string, filename: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success(`SHA-256 checksum copied for ${filename}`);
    setTimeout(() => setCopiedHash(null), 2200);
  }, []);

  const copyAuditSummary = useCallback(() => {
    const summary = [
      "=== NTRO SOVEREIGN MODEL PROVENANCE & BENCHMARK AUDIT ===",
      "Status: ACTIVE SOTA PRODUCTION ENGINE",
      "Standard: Sovereign Air-Gapped CPU Execution • Section 65B Audit Admissible",
      "Benchmark Telemetry:",
      "  - Graph F1 Score: 0.921 (Baseline GraphSAGE: 0.870 | Gate: >=0.880 | Delta: +5.9%)",
      "  - Peeling Recall: 94.8% (Baseline GraphSAGE: 81.2% | Delta: +13.6%)",
      "  - Inference Latency: 4.8ms CPU (Baseline MLP/SAGE: 8.6ms | Delta: -44%)",
      "  - Memory Footprint: 231 KB on disk (Pure CPU execution)",
      "Model Checksums (SHA-256):",
      "  - ft_transformer_20260909.pt (85.5 KB): fe1108481979eb0261fb686f08a990687ace2b9cd4a180a27118209e1b14a163",
      "  - graph_transformer_20260909.pt (145.4 KB): 0ada0cda7c3b9f3b50409a5f36063f455bab149f2a27191cd1fb9d0912ef203d",
      "Promoted: 2026-09-09 22:45 UTC",
    ].join("\n");

    navigator.clipboard.writeText(summary);
    setCopiedDossier(true);
    toast.success("Benchmark audit summary copied to clipboard");
    setTimeout(() => setCopiedDossier(false), 2200);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with subtle ambient blur */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[5px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Forensic Popover Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-provenance-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-slate-300/90 shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_1px_0_rgba(255,255,255,1)_inset,0_20px_50px_-12px_rgba(15,23,42,0.22),0_40px_80px_-24px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden transition-all duration-200"
      >
        {/* Header Strip with 3D Light-from-Above */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-gradient-to-b from-white via-slate-50/90 to-slate-100/90 shadow-[inset_0_1px_0_#ffffff] shrink-0">
          <div className="flex items-center gap-3.5">
            {/* Medallion Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 text-white border-t border-t-sky-300/70 border-x border-x-sky-500/60 border-b border-b-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_rgba(2,132,199,0.32)] flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-white stroke-[2.2]" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  id="modal-provenance-title"
                  className="text-sm sm:text-base font-bold text-slate-900 tracking-tight"
                >
                  Dual Transformer Model Provenance & Benchmark Audit
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300/90 text-emerald-800 text-[10px] font-bold tracking-wide crypto-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  <span>ACTIVE SOTA PRODUCTION ENGINE</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Sovereign Air-Gapped CPU Execution</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Promoted Gate Pass (F1 &ge; 0.880)
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 font-mono text-[11px]">NTRO Spec §4.2</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 text-[10px] crypto-mono font-medium shadow-[inset_0_1px_0_#ffffff,0_1px_1px_rgba(15,23,42,0.05)]">
              ESC
            </kbd>
            <button
              id="model-provenance-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-b from-white to-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900 shadow-[inset_0_1px_0_#ffffff,0_1px_2px_rgba(15,23,42,0.08)] active:shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.18)] active:translate-y-[0.5px] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Summary Cards (4 Core Benchmark Metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Metric 1: Graph F1 Score */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-slate-200 border-x border-x-slate-200/90 border-b border-b-slate-300/80 shadow-[inset_0_1px_0_#ffffff,0_1px_3px_rgba(15,23,42,0.05),0_4px_6px_-2px_rgba(15,23,42,0.02)] relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    <span>Graph F1 Score</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 crypto-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    +5.9% delta
                  </span>
                </div>
                <div className="text-3xl font-bold crypto-mono text-slate-900 tracking-tight">
                  0.921
                </div>
              </div>

              {/* Benchmark Visual Progress Meter */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] crypto-mono text-slate-500">
                  <span>Base: 0.870</span>
                  <span className="text-emerald-700 font-semibold">Gate: 0.880 ✓</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden relative">
                  {/* Gate marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                    style={{ left: "70%" }}
                    title="Gate pass threshold: 0.880"
                  />
                  {/* Active fill */}
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full"
                    style={{ width: "92%" }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Baseline GraphSAGE:</span>
                  <span className="crypto-mono font-medium text-slate-700">0.870</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Peeling Recall */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-slate-200 border-x border-x-slate-200/90 border-b border-b-slate-300/80 shadow-[inset_0_1px_0_#ffffff,0_1px_3px_rgba(15,23,42,0.05),0_4px_6px_-2px_rgba(15,23,42,0.02)] relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Peeling Recall</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 crypto-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    +13.6% delta
                  </span>
                </div>
                <div className="text-3xl font-bold crypto-mono text-slate-900 tracking-tight">
                  94.8%
                </div>
              </div>

              {/* Benchmark Visual Progress Meter */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] crypto-mono text-slate-500">
                  <span>Base: 81.2%</span>
                  <span className="text-emerald-700 font-semibold">Recall: 94.8%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                    style={{ width: "94.8%" }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Baseline GraphSAGE:</span>
                  <span className="crypto-mono font-medium text-slate-700">81.2%</span>
                </div>
              </div>
            </div>

            {/* Metric 3: Combined Latency */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-slate-200 border-x border-x-slate-200/90 border-b border-b-slate-300/80 shadow-[inset_0_1px_0_#ffffff,0_1px_3px_rgba(15,23,42,0.05),0_4px_6px_-2px_rgba(15,23,42,0.02)] relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>Combined Latency</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100/90 text-sky-800 border border-sky-300/80 crypto-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    -44% latency
                  </span>
                </div>
                <div className="text-3xl font-bold crypto-mono text-slate-900 tracking-tight flex items-baseline gap-1.5">
                  <span>4.8ms</span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200/80">
                    CPU
                  </span>
                </div>
              </div>

              {/* Benchmark Visual Progress Meter */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] crypto-mono text-slate-500">
                  <span>Base: 8.6ms</span>
                  <span className="text-sky-700 font-semibold">Speedup: 1.79×</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full"
                    style={{ width: "55.8%" }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Baseline MLP/SAGE:</span>
                  <span className="crypto-mono font-medium text-slate-700">8.6ms</span>
                </div>
              </div>
            </div>

            {/* Metric 4: Memory Footprint */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-slate-200 border-x border-x-slate-200/90 border-b border-b-slate-300/80 shadow-[inset_0_1px_0_#ffffff,0_1px_3px_rgba(15,23,42,0.05),0_4px_6px_-2px_rgba(15,23,42,0.02)] relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                    <span>Memory Footprint</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300/80 crypto-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    Pure CPU
                  </span>
                </div>
                <div className="text-3xl font-bold crypto-mono text-slate-900 tracking-tight flex items-baseline gap-1.5">
                  <span>231 KB</span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Total
                  </span>
                </div>
              </div>

              {/* Capacity Subtitle */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] crypto-mono text-slate-500">
                  <span>Disk: .pt + scalers</span>
                  <span className="text-emerald-700 font-semibold">Cold Boot &lt;120ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-400 to-slate-600 rounded-full"
                    style={{ width: "23.1%" }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Target Budget:</span>
                  <span className="crypto-mono font-medium text-slate-700">&lt; 500 MB RAM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Forensic Head-to-Head Benchmark Table */}
          <div className="rounded-xl border border-slate-300/90 overflow-hidden bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_12px_-2px_rgba(15,23,42,0.03)]">
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 via-slate-100/90 to-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Head-to-Head Forensic Architecture Comparison
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700 border border-slate-300/70 crypto-mono">
                  5 DIMENSIONS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] crypto-mono text-slate-500">
                  Gate Threshold: Test F1 &ge; 0.880
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold crypto-mono">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  PASSED: 0.921
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-[20%] text-slate-700 font-bold">
                      Metric / Dimension
                    </th>
                    <th className="py-3 px-4 w-[32%] text-sky-950 font-bold bg-sky-50/50 border-x border-sky-200/70">
                      <div className="flex items-center justify-between">
                        <span>Dual Transformer Architecture</span>
                        <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-sky-600 text-white shadow-2xs">
                          ACTIVE
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[24%] text-slate-600 font-medium">
                      Baseline Architecture (Legacy Reference)
                    </th>
                    <th className="py-3 px-4 w-[24%] text-slate-800 font-semibold">
                      Impact on NTRO Forensics
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-slate-700">
                  {BENCHMARK_METRICS.map((row, idx) => (
                    <tr
                      key={row.dimension}
                      className={clsx(
                        "transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                        "hover:bg-slate-50/80"
                      )}
                    >
                      {/* Dimension Name */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-900 text-xs">
                          {row.dimension}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {row.categoryTag}
                        </span>
                      </td>

                      {/* Active Dual Transformer (Champion Column) */}
                      <td className="py-3.5 px-4 bg-sky-50/30 border-x border-sky-200/60 align-top">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="font-bold text-slate-950 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{row.active.title}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded border border-sky-200/80 crypto-mono shrink-0">
                            {row.active.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {row.active.detail}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {row.active.chips.map((chip) => (
                            <span
                              key={chip}
                              className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Baseline Legacy Architecture */}
                      <td className="py-3.5 px-4 align-top text-slate-500">
                        <div className="font-medium text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>{row.baseline.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {row.baseline.detail}
                        </p>
                      </td>

                      {/* Forensic Impact */}
                      <td className="py-3.5 px-4 align-top text-slate-800">
                        <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 mb-1">
                          {row.impact.tag}
                        </span>
                        <p className="text-[11px] leading-relaxed text-slate-700">
                          {row.impact.detail}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cryptographic Provenance & File Integrity Block */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-300/80 shadow-[inset_0_1px_0_#ffffff,0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Model Weights Cryptographic Provenance (SHA-256 Checksums)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Promoted:</span>
                <span className="crypto-mono font-semibold text-slate-800">
                  2026-09-09 22:45 UTC
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold crypto-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  VERIFIED
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {MODEL_WEIGHTS_CHECKSUMS.map((item) => (
                <div
                  key={item.filename}
                  className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-[inset_0_1px_0_#ffffff,0_1px_2px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 crypto-mono">
                        {item.filename}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.size}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        ({item.model})
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        SHA-256:
                      </span>
                      <div
                        className="bg-slate-50 border border-slate-200/80 rounded px-2 py-0.5 text-[11px] crypto-mono text-slate-700 font-medium truncate flex-1 select-all"
                        title={item.hash}
                      >
                        {item.hash}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyHash(item.hash, item.filename)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md tactile-btn-secondary text-slate-700 hover:text-slate-900 text-xs font-medium cursor-pointer"
                    title="Copy SHA-256 checksum to clipboard"
                  >
                    {copiedHash === item.hash ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Strip with Tactile Controls */}
        <div className="px-6 py-3.5 bg-gradient-to-b from-slate-50 to-slate-100/90 border-t border-slate-200/90 flex items-center justify-between text-[11px] text-slate-500 shadow-[inset_0_1px_0_#ffffff] shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-slate-700">
              Sovereign Air-Gapped Verification • Section 65B Audit Admissible Standard (IEA 1872 / BSA 2023)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAuditSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md tactile-btn-secondary text-slate-700 text-xs font-medium cursor-pointer"
              title="Copy complete audit summary to clipboard"
            >
              {copiedDossier ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span className="text-emerald-700 font-semibold">Audit Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Audit Telemetry</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md tactile-btn-primary text-white text-xs font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
