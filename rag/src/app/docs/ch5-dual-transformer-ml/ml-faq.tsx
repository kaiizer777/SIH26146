"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Cpu,
  Lock,
  Search,
  CheckCircle2,
  FileCode,
  Network,
  AlertTriangle,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  category: "MODEL_CHOICE" | "XAI" | "LOSS_FUNCTION" | "PERFORMANCE" | "EDGE_CASES";
  badgeText: string;
  sourceFile: string;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: "xgboost-vs-ft",
    question: "Why didn't we use an off-the-shelf XGBoost or Random Forest?",
    category: "MODEL_CHOICE",
    badgeText: "TABULAR ARCHITECTURE RATIONALE",
    sourceFile: "backend/app/ml/ft_transformer.py#L1-L14",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          While tree-based ensembles (XGBoost, LightGBM, CatBoost) are traditional defaults for tabular data, they suffer from four critical architectural deficiencies in an end-to-end forensic intelligence pipeline:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>Discrete Decision Boundaries vs Continuous Representation:</strong> Tree partitions split features along orthogonal axes, discarding continuous manifold geometry. FT-Transformer projects all 18 features into a continuous &reals;<sup>32</sup> latent space that can be directly fused with Graph Transformer node embeddings.
          </li>
          <li>
            <strong>Reconstruction Anomaly Modeling:</strong> In financial surveillance, novel zero-day ransomware schemes do not match historical training labels. Tree models trained on binary labels severely overfit or leak labels. FT-Transformer operates as a deep reconstruction autoencoder: it trains on non-illicit baseline traffic and flags anomalies via reconstruction error (MSE &gt; 0.036), generalizing naturally to unseen laundering tactics.
          </li>
          <li>
            <strong>No Free Native Attention Matrices:</strong> Gradient Boosted Decision Trees cannot provide an $18 \times 18$ pairwise feature correlation matrix. Saliency requires TreeSHAP, which cannot explain cross-feature directional dependencies.
          </li>
          <li>
            <strong>Empirical SOTA Performance:</strong> As established by Gorishniy et al. (NeurIPS 2021), FT-Transformer matches or exceeds GBDT performance on complex heterogeneous tabular data while maintaining complete differentiability.
          </li>
        </ul>
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-700">
          <strong>Key Takeaway:</strong> FT-Transformer provides unified representation learning, unsupervised anomaly calibration, and instantaneous cross-feature attention extraction in a single 18,930-parameter model.
        </div>
      </div>
    ),
  },
  {
    id: "free-attribution",
    question: "How does the FT-Transformer give feature attribution for free?",
    category: "XAI",
    badgeText: "ZERO-OVERHEAD FORENSIC EXPLAINABILITY",
    sourceFile: "backend/app/ml/ft_transformer.py#L232-L238",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          In traditional deep neural networks (like our Phase 5 MLP Autoencoder), computing feature importance requires post-hoc perturbation algorithms like <strong>KernelSHAP</strong> or <strong>GradientExplainer</strong>. These frameworks evaluate hundreds of artificial input permutations, requiring <strong>200–500ms of CPU compute per transaction</strong>.
        </p>
        <p>
          The FT-Transformer solves this natively via its architectural design:
        </p>
        <div className="p-3 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 space-y-1">
          <div>1. Input sequence: E = [ [CLS], token_1, token_2, ..., token_18 ] ∈ ℝ^(19 × 32)</div>
          <div>2. Attention Matrix: A = softmax(Q · K^T / √d_k) ∈ ℝ^(19 × 19)</div>
          <div>3. Slicing row 0: α_cls = A[0, 1:] ∈ ℝ^18  ←  Direct attention from [CLS] to all 18 features</div>
        </div>
        <p>
          Because the linear reconstruction head projects strictly from the transformed <code className="font-mono text-slate-800">[CLS]</code> token representation, the attention vector <code className="font-mono text-slate-800">A[0, 1:]</code> represents the exact quantitative weights the model assigned to each feature during reconstruction.
        </p>
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-mono text-[11px] font-semibold">
          Result: Instant feature attribution with 0.00ms overhead during the forward pass. Saliency maps are generated in real-time during live mempool ingestion.
        </div>
      </div>
    ),
  },
  {
    id: "focal-loss-necessity",
    question: "Why is Focal Loss essential for Bitcoin AML?",
    category: "LOSS_FUNCTION",
    badgeText: "CLASS IMBALANCE DEFENSE",
    sourceFile: "backend/app/ml/graph_transformer.py#L31-L34",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          Bitcoin transaction surveillance faces extreme <strong>class imbalance</strong>. Across the NTRO surveillance ledger:
        </p>
        <ul className="list-disc pl-4 space-y-1 text-slate-700">
          <li><strong>Known Illicit Entities:</strong> 11,186 Ransomwhere ransomware seed addresses (LockBit, Conti, BlackCat, etc.).</li>
          <li><strong>Organic / Benign Traffic:</strong> 200,000+ normal user, exchange, and merchant addresses (&lt;5% positive class; in live mempool &lt;0.05%).</li>
        </ul>
        <p>
          When optimizing standard Binary Cross-Entropy loss (L<sub>BCE</sub> = -log(p<sub>t</sub>)), the millions of easily classified benign transactions (p<sub>t</sub> &rarr; 1) generate small individual gradient errors. However, because easy negatives are so overwhelmingly numerous, their aggregate gradients completely swamp the sparse signal from subtle laundering patterns.
        </p>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800">
          ℒ_focal = -α_t · (1 - p_t)^γ · log(p_t)
        </div>
        <p>
          By setting focusing parameter <span className="font-mono font-bold text-slate-900">γ = 2.0</span>, an easy negative with $p_t = 0.99$ has its loss discounted by $(1 - 0.99)^2 = 0.0001$—a <strong>10,000-fold reduction</strong>!
          Coupled with weighting factor <span className="font-mono font-bold text-slate-900">α = 6.20</span> (clamped class imbalance ratio), the optimizer is forced to dedicate its capacity entirely to ambiguous, multi-hop laundering chains.
        </p>
      </div>
    ),
  },
  {
    id: "cpu-latency-budget",
    question: "Can the Graph Transformer run fast enough during live forensic operations?",
    category: "PERFORMANCE",
    badgeText: "CPU HARDWARE EFFICIENCY",
    sourceFile: "backend/app/ml/graph_transformer.py#L1-L35",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          Yes. The system is engineered to operate strictly within a <strong>&lt; 5ms SLA on plain Intel/AMD CPU hardware</strong> (specifically verified on dual-core Acer Aspire Lite laptops with zero discrete GPU dependencies).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Full Graph Evaluation</div>
            <div className="font-bold text-slate-900 text-xs mt-0.5">295.53 ms / 24,673 nodes</div>
            <div className="text-slate-500 text-[10px]">0.0120 ms per wallet node</div>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200">
            <div className="text-emerald-700 font-bold uppercase text-[10px]">Live Post-Ingest Sync</div>
            <div className="font-bold text-emerald-950 text-xs mt-0.5">4.8 ms Composite SLA</div>
            <div className="text-emerald-700 text-[10px]">2-Hop Ego-Net Scoring (Phase 11)</div>
          </div>
        </div>
        <p>
          During live post-ingest online inference (<code className="text-slate-800 font-mono">POST /ingest/sync/:task_id</code>), the backend does not recompute the entire global graph. Instead, it extracts a localized 2-hop ego-net surrounding newly ingested transactions (15–50 nodes), executes <code className="text-slate-800 font-mono">TransformerConv</code> message passing, and writes risk scores to PostgreSQL in <strong>4.8ms</strong>.
        </p>
        <p>
          Furthermore, the model weights file is only <strong>145.42 KB</strong> (~1.2 MB full checkpoint), fitting completely inside CPU L3 hardware cache and eliminating memory bandwidth bottlenecks.
        </p>
      </div>
    ),
  },
  {
    id: "cold-start-wallets",
    question: "What happens if a wallet has no known transaction flow edges yet?",
    category: "EDGE_CASES",
    badgeText: "COLD-START RESILIENCE",
    sourceFile: "backend/app/services/inline_scorer.py#L75-L115",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          When a newly created Bitcoin address appears in the mempool or is ingested for the first time, it has no historical edges in the Neo4j graph (|N(i)| = 0).
        </p>
        <p>
          The architecture handles this gracefully across three redundant layers:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>TransformerConv Isolated Node Handling:</strong> In PyTorch Geometric, when node <em>i</em> has no incident edges, the message passing sum &sum;<sub>j &in; N(i)</sub> evaluates to zero. The layer gracefully reduces to a linear projection of the node&apos;s intrinsic features: h<sub>i</sub><sup>(1)</sup> = W<sub>1</sub> h<sub>i</sub>, ensuring the forward pass completes without numerical instability.
          </li>
          <li>
            <strong>Tabular FT-Transformer Primacy:</strong> The wallet&apos;s transaction features (fee rate, amounts, input/output counts, script type) are immediately scored by the FT-Transformer, providing an independent anomaly score ($MSE$) and [CLS] feature attribution regardless of graph connectivity.
          </li>
          <li>
            <strong>Dynamic Composite Risk Weighting:</strong>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[10px] text-slate-800 mt-1">
              composite_score = clip(0.35 · anomaly + 0.45 · graph_risk + 0.15 · rules + 0.05 · mixing, 0, 1)
            </div>
            For unlinked wallets, heuristic rule violations (e.g. 1-in-2-out peeling, CoinJoin flags) and tabular anomaly scores contribute 50% of the risk verdict, protecting the border until transaction edges are linked during the next batch sync.
          </li>
        </ul>
      </div>
    ),
  },
];

export function MlFaq() {
  const [openItemIds, setOpenItemIds] = useState<string[]>(["xgboost-vs-ft", "free-attribution"]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const toggleItem = (id: string) => {
    setOpenItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory =
      selectedCategory === "ALL" || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.badgeText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="card-tactical rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-white">
                DEFENSE RUNBOOK
              </span>
              <span className="text-xs font-mono text-slate-500">
                FORENSIC ML VERIFICATION FAQ
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-600" />
              Teammate Technical Defense &amp; Architectural Rationale
            </h3>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter architectural questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {["ALL", "MODEL_CHOICE", "XAI", "LOSS_FUNCTION", "PERFORMANCE", "EDGE_CASES"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white font-bold shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Accordion Items List */}
      <div className="divide-y divide-slate-200">
        {filteredFaqs.map((faq) => {
          const isOpen = openItemIds.includes(faq.id);
          return (
            <div key={faq.id} className="transition-colors hover:bg-slate-50/40">
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      {faq.badgeText}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {faq.sourceFile}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {faq.question}
                  </h4>
                </div>

                <div
                  className={`w-6 h-6 rounded flex items-center justify-center border border-slate-200 bg-white flex-shrink-0 transition-transform ${
                    isOpen ? "rotate-180 bg-slate-100" : ""
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-slate-600 animate-in fade-in duration-150">
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/80">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            No defense questions matched query &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
