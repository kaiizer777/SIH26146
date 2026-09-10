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
} from "lucide-react";
import { toast } from "sonner";

export interface ModelProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BenchmarkRow {
  dimension: string;
  active: {
    title: string;
    detail: string;
  };
  baseline: {
    title: string;
    detail: string;
  };
  impact: string;
}

const BENCHMARK_METRICS: BenchmarkRow[] = [
  {
    dimension: "Tabular Anomaly Engine",
    active: {
      title: "FT-Transformer",
      detail: "Feature Tokenizer (18x32d) + Multi-Head Self-Attention + [CLS] head",
    },
    baseline: {
      title: "Deep MLP Autoencoder",
      detail: "Feed-forward linear bottleneck (18-12-6-12-18)",
    },
    impact: "Native 18x18 cross-feature attention matrix detailing inter-variable correlations",
  },
  {
    dimension: "Graph Proximity Engine",
    active: {
      title: "Relational Graph Transformer",
      detail: "Multi-Head TransformerConv with 4 attention heads over heterogeneous edges",
    },
    baseline: {
      title: "2-Layer GraphSAGE",
      detail: "Mean-pooling neighborhood aggregation",
    },
    impact: "4-head relational attention weights propagate risk along Co-Spend & Peeling links",
  },
  {
    dimension: "Edge Relations Modeled",
    active: {
      title: "3 Heterogeneous Types",
      detail: "CO_SPEND (input clustering), TX_FLOW (transfer), PEELING_FLOW (mixing splits)",
    },
    baseline: {
      title: "1 Static Relation",
      detail: "CO_SPEND adjacency only",
    },
    impact: "Detects rapid mixing hops and structural laundering paths through split UTXOs",
  },
  {
    dimension: "Explainability (XAI)",
    active: {
      title: "Dual Attribution",
      detail: "Multi-Head Relational Attention Saliency + Tabular SHAP Waterfall",
    },
    baseline: {
      title: "SHAP Only",
      detail: "Global background Tree/Kernel SHAP attribution",
    },
    impact: "Direct visual edge glow on laundering paths and pairwise feature correlation heatmap",
  },
  {
    dimension: "Air-Gap Sovereign Footprint",
    active: {
      title: "231 KB Total (.pt)",
      detail: "Pure CPU PyTorch execution · Zero external CDN · Zero GPU dependency",
    },
    baseline: {
      title: "65 KB Weights",
      detail: "Legacy MLP + SAGE checkpoints",
    },
    impact: "Instant cold boot (<120ms) on low-spec edge field laptops (Acer Aspire Lite)",
  },
];

const MODEL_WEIGHTS_CHECKSUMS = [
  {
    filename: "ft_transformer_20260909.pt",
    model: "FT-Transformer Tabular Anomaly Engine",
    size: "85.5 KB",
    hash: "fe1108481979eb0261fb686f08a990687ace2b9cd4a180a27118209e1b14a163",
  },
  {
    filename: "graph_transformer_20260909.pt",
    model: "Multi-Head Relational Graph Transformer",
    size: "145.4 KB",
    hash: "0ada0cda7c3b9f3b50409a5f36063f455bab149f2a27191cd1fb9d0912ef203d",
  },
];

export default function ModelProvenanceModal({
  isOpen,
  onClose,
}: ModelProvenanceModalProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

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
    setTimeout(() => setCopiedHash(null), 2500);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[5px] transition-all duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Forensic Popover Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-provenance-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-slate-200/90 shadow-3d-modal flex flex-col overflow-hidden transition-all duration-200"
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-sky-500 to-sky-600 text-white border border-sky-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(2,132,199,0.3)] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 fill-sky-200/30" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  id="modal-provenance-title"
                  className="text-sm font-bold text-slate-900 uppercase tracking-wide"
                >
                  Dual Transformer Model Provenance & Benchmark Audit
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold tracking-wide crypto-mono shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>ACTIVE SOTA PRODUCTION ENGINE</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sovereign Air-Gapped CPU Execution • Promoted Gate Pass (F1 &ge; 0.88)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 text-[10px] crypto-mono font-medium shadow-2xs">
              ESC
            </kbd>
            <button
              id="model-provenance-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-white to-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.08)] active:shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.2)] active:translate-y-[0.5px] transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Summary Cards (Core Metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Metric 1: Graph F1 Score */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.04)] relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Graph F1 Score
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 crypto-mono">
                  +5.9% delta
                </span>
              </div>
              <div className="text-2xl font-bold crypto-mono text-slate-900 tracking-tight">
                0.921
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>Baseline GraphSAGE:</span>
                <span className="crypto-mono font-medium text-slate-700">0.870</span>
              </div>
            </div>

            {/* Metric 2: Peeling Recall */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.04)] relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Peeling Recall
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 crypto-mono">
                  +13.6% delta
                </span>
              </div>
              <div className="text-2xl font-bold crypto-mono text-slate-900 tracking-tight">
                94.8%
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>Baseline GraphSAGE:</span>
                <span className="crypto-mono font-medium text-slate-700">81.2%</span>
              </div>
            </div>

            {/* Metric 3: Combined CPU Latency */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.04)] relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Combined Latency
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 crypto-mono">
                  -44% latency
                </span>
              </div>
              <div className="text-2xl font-bold crypto-mono text-sky-900 tracking-tight flex items-baseline gap-1">
                <span>4.8ms</span>
                <span className="text-xs font-medium text-slate-400">CPU</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>Baseline MLP/SAGE:</span>
                <span className="crypto-mono font-medium text-slate-700">8.6ms</span>
              </div>
            </div>

            {/* Metric 4: Memory Footprint */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.04)] relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  Memory Footprint
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 crypto-mono">
                  Pure CPU
                </span>
              </div>
              <div className="text-2xl font-bold crypto-mono text-slate-900 tracking-tight">
                231 KB
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Weights + Scalers on disk
              </div>
            </div>
          </div>

          {/* Forensic Head-to-Head Benchmark Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Head-to-Head Forensic Architecture Comparison
                </span>
              </div>
              <span className="text-[11px] crypto-mono font-medium text-slate-500">
                Gate Requirement: Test F1 &ge; 0.880
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 w-[20%]">Metric / Dimension</th>
                    <th className="py-2.5 px-4 w-[30%] text-sky-900 bg-sky-50/40">
                      Dual Transformer Architecture (Active)
                    </th>
                    <th className="py-2.5 px-4 w-[25%] text-slate-600">
                      Baseline Architecture (Legacy Reference)
                    </th>
                    <th className="py-2.5 px-4 w-[25%] text-slate-800">
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
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                        "hover:bg-sky-50/30"
                      )}
                    >
                      {/* Dimension Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900 align-top">
                        {row.dimension}
                      </td>

                      {/* Active Dual Transformer */}
                      <td className="py-3 px-4 bg-sky-50/20 align-top">
                        <div className="font-bold text-sky-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{row.active.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {row.active.detail}
                        </p>
                      </td>

                      {/* Baseline Legacy Architecture */}
                      <td className="py-3 px-4 align-top text-slate-500">
                        <div className="font-medium text-slate-700">
                          {row.baseline.title}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {row.baseline.detail}
                        </p>
                      </td>

                      {/* Forensic Impact */}
                      <td className="py-3 px-4 align-top font-medium text-slate-800">
                        <p className="text-[11px] leading-relaxed">
                          {row.impact}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cryptographic Provenance & File Integrity Block */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Model Weights Cryptographic Provenance (SHA-256 Checksums)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Promoted:</span>
                <span className="crypto-mono font-semibold text-slate-700">
                  2026-09-09 22:45 UTC
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {MODEL_WEIGHTS_CHECKSUMS.map((item) => (
                <div
                  key={item.filename}
                  className="p-3 rounded-lg bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {item.filename}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {item.size}
                      </span>
                    </div>
                    <p className="crypto-mono text-[11px] text-slate-500 truncate mt-0.5" title={item.hash}>
                      SHA-256: {item.hash}
                    </p>
                  </div>

                  <button
                    onClick={() => copyHash(item.hash, item.filename)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer border border-slate-200"
                    title="Copy SHA-256 checksum to clipboard"
                  >
                    {copiedHash === item.hash ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied</span>
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

        {/* Modal Footer Strip */}
        <div className="px-6 py-3 bg-gradient-to-b from-slate-50 to-slate-100/90 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,1)] shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700">
              Sovereign Air-Gapped Verification • Section 65B Audit Admissible Standard
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-md tactile-btn-secondary text-slate-700 text-xs font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}
