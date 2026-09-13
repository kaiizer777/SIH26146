import React from "react";
import Link from "next/link";
import {
  Cpu,
  Network,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  HardDrive,
  Clock,
  Fingerprint,
  Zap,
  Flame,
  FileCode,
  Sliders,
  Braces,
  Hash,
  Database,
  BarChart3,
  GitFork,
  HelpCircle,
} from "lucide-react";
import { AttentionMatrix } from "./attention-matrix";
import { TransformerPipeline } from "./transformer-pipeline";
import { MlBenchmarkMatrix } from "./ml-benchmark-matrix";
import { MlFaq } from "./ml-faq";

export const metadata = {
  title: "Chapter 5: Dual Transformer ML Engine (FT-Transformer & Graph Transformer) — NTRO KB",
  description:
    "Production engineering specification for Pipeline Tier 4: Tabular FT-Transformer anomaly detection, PyG Multi-Head Relational Graph Transformer risk scoring, Section 65B benchmark truth verification, and CPU sub-5ms execution.",
};

export default function Chapter5Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* Tactical Document Header */}
      <div className="border-b border-slate-200 pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider uppercase">
            CHAPTER 05
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            PIPELINE TIER 4
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/80 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            SOTA DUAL TRANSFORMERS
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-bold font-mono">
            F1 = 0.9209 // CPU INFERENCE &lt; 5ms
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Chapter 5: Dual Transformer ML Engine (FT-Transformer &amp; Graph Transformer)
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          Complete engineering specification for Pipeline Tier 4: the state-of-the-art deep learning surveillance core 
          replacing baseline autoencoders and homogeneous GNNs. Implements a <strong>Tabular Feature Tokenizer Transformer (FT-Transformer)</strong> for 
          18-feature continuous reconstruction anomaly detection with native $18 \times 18$ self-attention extraction, alongside a 
          <strong> Multi-Head Relational Graph Transformer (<code className="font-mono text-slate-800 text-sm">TransformerConv</code>)</strong> modeling 
          three discrete transaction flow relations with Lin et al. Focal Loss. Operates at <strong>$F_1 = 0.9209$</strong> on held-out test data with 
          sub-5ms CPU latency on consumer hardware.
        </p>

        {/* Quick Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Graph Transformer Test F1</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">0.9209</div>
            <div className="text-[10px] text-emerald-600 font-semibold">vs GraphSAGE baseline 0.8312</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">FT-Transformer Anomaly Latency</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">3.2 ms on CPU</div>
            <div className="text-[10px] text-emerald-600 font-semibold">&lt; 5ms Post-Ingest SLA</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Model Weight Footprint</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">~350 KB (FT) / ~1.2 MB (Graph)</div>
            <div className="text-[10px] text-sky-600 font-semibold">Fits in CPU L3 Cache</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Edge Relations Modeled</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">3 Discrete Types</div>
            <div className="text-[10px] text-indigo-600 font-semibold">CO_SPEND &bull; TX_FLOW &bull; PEEL</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: The Architectural Leap: Baseline to SOTA Transformers */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Architectural Leap: Baseline to SOTA Transformers
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why the baseline MLP Autoencoder and single-relation GraphSAGE were superseded in Stage 3
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            During Phases 5 and 7, the NTRO surveillance system relied on foundational machine learning baselines: a 
            <strong> 7-layer symmetric MLP Autoencoder</strong> (<code className="font-mono text-slate-800 text-xs">18 &rarr; 64 &rarr; 32 &rarr; 16 &rarr; 32 &rarr; 64 &rarr; 18</code>) for tabular reconstruction anomalies, 
            and a <strong> 3-layer GraphSAGE GNN</strong> for topological risk propagation across common-input co-spend clusters.
          </p>

          <p>
            While these baseline models validated the core data pipelines, real-world forensic deployment against sophisticated adversaries 
            exposed three critical architectural bottlenecks that constrained operational precision:
          </p>

          {/* 3 Bottlenecks Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Bottleneck A
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">EDGE HOMOGENEITY</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Inability to Model Relation Semantics</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                GraphSAGE aggregates neighbor embeddings via uniform mean pooling over an unweighted adjacency matrix. 
                It treated an intra-cluster <code className="font-mono text-slate-800">:CO_SPEND</code> link identically to a directional 
                <code className="font-mono text-slate-800">:TX_FLOW</code> transaction or an adversarial <code className="font-mono text-slate-800">:PEELING_FLOW</code>, 
                collapsing multi-hop laundering semantics.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Bottleneck B
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">LATENT BOTTLENECK</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Loss of Tabular Feature Interactions</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dense MLPs compress all 18 tabular features into a monolithic 16-dimensional continuous bottleneck. 
                Individual feature tokens lose their identity, preventing direct pairwise attention between suspicious fee spikes and output 
                entropy, which produced high false positive rates on complex retail transactions.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Bottleneck C
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">XAI OVERHEAD</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">250ms+ Perturbation Latency</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                In the MLP architecture, calculating SHAP values required running GradientExplainer or KernelSHAP across 
                hundreds of input perturbations per transaction. This 250ms+ compute cost made real-time mempool explanation impossible.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              The Stage 3 Dual Transformer Solution
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In Stage 3 (<code className="font-mono text-slate-800">WORK-3.md</code>), both legacy models were elevated to a unified 
              <strong> Dual Transformer architecture</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-600" />
                  Model 1: FT-Transformer (Feature Tokenizer)
                </div>
                <div className="text-slate-600 leading-relaxed">
                  Maps 18 tabular features into discrete 32-dim tokens, uses Pre-LN multi-head attention to model cross-feature dynamics, 
                  and extracts an $18 \times 18$ attention matrix natively in <strong>0.0ms overhead</strong>.
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-indigo-600" />
                  Model 2: Multi-Head Relational Graph Transformer
                </div>
                <div className="text-slate-600 leading-relaxed">
                  Replaces static aggregation with PyG <code className="font-mono text-slate-800 text-[11px]">TransformerConv</code>, embeds 
                  3 discrete relational edge categories, and applies Focal Loss ($\gamma=2.0$) to hit <strong>$F_1 = 0.9209$</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Model 1: Tabular FT-Transformer */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Model 1: Tabular FT-Transformer (Feature Tokenizer Transformer)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Vectorized feature tokenization, Pre-LayerNorm multi-head self-attention, and free native explainability
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            The tabular anomaly engine is built upon the architecture of Gorishniy et al. (NeurIPS 2021), adapted for unsupervised 
            reconstruction anomaly scoring in <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/ml/ft_transformer.py" className="font-mono text-sky-600 hover:underline"><code>backend/app/ml/ft_transformer.py</code></a>:
          </p>

          {/* Mathematical Formulation Accordion / Callouts */}
          <div className="space-y-3">
            {/* Tokenization */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-sky-600" />
                1. Vectorized Linear Feature Tokenization
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Given an input vector <em>x</em> &in; &reals;<sup>B &times; 18</sup> normalized via <code className="font-mono text-slate-800 text-[11px]">RobustScaler</code>, 
                each scalar feature <em>x<sub>i</sub></em> is mapped independently into continuous latent space &reals;<sup>32</sup> via dedicated weight vectors and biases:
              </p>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900">
                <code>{"X_tokens[i] = x_i · W_i + b_i,   W_i ∈ ℝ^(1 × 32),   b_i ∈ ℝ^32"}</code>
              </div>
              <p className="text-[11px] text-slate-500">
                Unlike simple linear layers, the FeatureTokenizer assigns dedicated weights and biases to each feature index, preserving 
                the distinct semantic character of transaction fees, output entropy, and IP counts.
              </p>
            </div>

            {/* Learnable CLS Token & MHSA */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                2. Learnable [CLS] Token &amp; 2-Layer Pre-LN Multi-Head Self-Attention
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                A learnable classification token <em>e</em><sub>cls</sub> &in; &reals;<sup>1 &times; 32</sup> initialized with truncated normal variance (&sigma; = 0.02) 
                is prepended to the feature sequence, yielding sequence length <em>L</em> = 1 + 18 = 19:
              </p>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900">
                <code>{"E = [e_cls, e_1, e_2, ..., e_18] ∈ ℝ^(B × 19 × 32)"}</code>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The token sequence passes through <strong>2 Pre-LayerNorm Transformer Encoder layers</strong> with 4 attention heads (<em>d<sub>k</sub></em> = 8, <em>d</em><sub>ff</sub> = 64, dropout = 0.1):
              </p>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
                <div>{"h^(l+1) = h^(l) + Dropout( MultiHeadAttention( LayerNorm(h^(l)) ) )"}</div>
                <div>{"h^(l+1) = h^(l+1) + Dropout( FeedForward( LayerNorm(h^(l+1)) ) )"}</div>
              </div>
            </div>

            {/* Reconstruction Head & Anomaly MSE */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                3. Reconstruction Anomaly Scoring &amp; Native Attention Extraction
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The final representation of the <code className="font-mono text-slate-800">[CLS]</code> token (<em>h</em><sub>cls</sub> = <em>h</em>[:, 0, :] &in; &reals;<sup>B &times; 32</sup>) 
                is projected via a linear reconstruction head to predict the original normalized input features <em>x&#770;</em> &in; &reals;<sup>B &times; 18</sup>. 
                The anomaly score is the Mean Squared Error:
              </p>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900">
                <code>{"MSE(x, x̂) = (1 / 18) · ∑_{i=1}^{18} (x_i - x̂_i)^2"}</code>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When <code className="font-mono text-slate-800 text-[11px]">return_attention=True</code> is passed, the model slices row 0 of the final layer&apos;s attention matrix:
                {" "}<strong>A</strong><sub>0, 1:</sub> &in; &reals;<sup>18</sup>. This yields the <strong>exact attribution weight</strong> each feature contributed to the reconstruction, 
                giving forensic explainability in <strong>0.0ms overhead</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Model 2: Multi-Head Relational Graph Transformer */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Model 2: Multi-Head Relational Graph Transformer
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              PyTorch Geometric TransformerConv, 3-relation multi-edge encoding, and class-imbalance calibrated Focal Loss
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Topological risk scoring is implemented in <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/ml/graph_transformer.py" className="font-mono text-sky-600 hover:underline"><code>backend/app/ml/graph_transformer.py</code></a> using 
            PyTorch Geometric&apos;s <code className="font-mono text-slate-800 text-xs">TransformerConv</code> operator (Shi et al., UniMP / NeurIPS 2020).
          </p>

          {/* Relational Edge Encoding Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-700">
              3-Relation Discrete Multi-Edge Encoding:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    RELATION 0
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">CO_SPEND</span>
                </div>
                <div className="text-xs font-bold text-slate-900">Louvain / CIOH Co-Spending</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Connects wallets that jointly signed multi-input transactions. High base attention weight (&alpha; &asymp; 0.91) reflecting common ownership.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-sky-900 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                    RELATION 1
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">TX_FLOW</span>
                </div>
                <div className="text-xs font-bold text-slate-900">2-Hop Transactional Flow</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Captures <code className="font-mono text-slate-800 text-[10px]">:SENDS_TO &rarr; :RECEIVES</code> flow across intermediary transactions, 
                  propagating risk across transfer hops.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-rose-900 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    RELATION 2
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">PEELING_FLOW</span>
                </div>
                <div className="text-xs font-bold text-slate-900">Flagged Peeling Chains</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  High-priority edges flagged with <code className="font-mono text-slate-800 text-[10px]">is_mixing=true</code> and 1-in-2-out asymmetry. 
                  Enables 94.8% peeling recall.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Each relation type <em>r</em> &in; &#123;0, 1, 2&#125; is embedded via <code className="font-mono text-slate-800">nn.Embedding(3, edge_dim=16)</code> into 
              vector <em>e<sub>i,j</sub></em> &in; &reals;<sup>16</sup>, which directly modulates attention calculation:
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-900 space-y-1">
              <div>{"α_{i,j} = softmax_j( ((W_3 h_i)^T (W_4 h_j + W_e e_{i,j})) / √d )"}</div>
              <div>{"h_i^(l+1) = W_1 h_i^(l) + ∑_{j ∈ N(i)} α_{i,j} W_2 h_j^(l)"}</div>
            </div>

            {/* Focal Loss Formulation */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Focal Loss Formulation for Severe Class Imbalance
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                With only 11,186 known ransomware seed addresses amidst 200,000+ organic wallets (&lt;5% positive class), standard binary cross-entropy 
                is saturated by easy benign examples. The Relational Graph Transformer applies Lin et al. (ICCV 2017) Focal Loss:
              </p>
              <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-xs text-slate-900">
                <code>{"ℒ_focal = -α_t · (1 - p_t)^γ · log(p_t),   γ = 2.0,   α_t = 6.20"}</code>
              </div>
              <p className="text-[11px] text-slate-500">
                The parameter &gamma; = 2.0 down-weights easy examples (<em>p<sub>t</sub></em> &asymp; 0.99) by (1 - 0.99)<sup>2</sup> = 0.0001 (a 10,000-fold reduction), 
                directing gradient updates exclusively toward subtle laundering chains.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: The Canonical Benchmark Truth Matrix */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Canonical Benchmark Truth Matrix
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Side-by-side empirical performance scorecard logged from data/models/BENCHMARK_TRUTH.json
            </p>
          </div>
        </div>

        {/* EMBEDDED BENCHMARK MATRIX COMPONENT */}
        <MlBenchmarkMatrix />
      </section>

      {/* SECTION 5: Interactive Visual Elements */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Visual Elements: Heatmap &amp; Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Interactive 18x18 self-attention simulation and dual-model tensor topology visualizer
            </p>
          </div>
        </div>

        {/* Module A: 18x18 Feature Attention Matrix Simulator */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Module A: 18 &times; 18 Feature Self-Attention Matrix Simulator
          </div>
          <AttentionMatrix />
        </div>

        {/* Module B: Dual-Model Topology Visualizer */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Module B: Dual-Model Topology &amp; Tensor Flow Visualizer
          </div>
          <TransformerPipeline />
        </div>
      </section>

      {/* SECTION 6: Teammate FAQ Accordion */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Teammate Technical Defense &amp; Architectural Rationale
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Engineering rationales defending model choice, zero-latency attribution, and cold-start resilience
            </p>
          </div>
        </div>

        {/* EMBEDDED FAQ COMPONENT */}
        <MlFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch4-peeling-mixing-heuristics"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 4: Laundering Heuristics &amp; Mixers</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION // SEC-DOC-26146-CH05
        </div>

        <Link
          href="/docs/ch6-risk-engine-xai-legal"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 6: Multi-Factor Risk &amp; &sect;65B Legal</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
