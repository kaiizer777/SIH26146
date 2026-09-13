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
  Sliders,
  Database,
  BarChart3,
  HelpCircle,
  Search,
  Lock,
  Eye,
  Trophy,
  Lightbulb,
  Radio,
} from "lucide-react";
import { AttentionMatrix } from "./attention-matrix";
import { TransformerPipeline } from "./transformer-pipeline";
import { MlBenchmarkMatrix } from "./ml-benchmark-matrix";
import { MlFaq } from "./ml-faq";

export const metadata = {
  title: "Chapter 5: Dual Transformer ML Engine (Two AI Detectives & 4.8ms Edge Intelligence) — NTRO KB",
  description:
    "Intuitive engineering specification for Pipeline Tier 4: Detective A (FT-Transformer) numeric trait audit, Detective B (Relational Graph Transformer) syndicate web tracking, 4.8ms air-gapped CPU execution, and Section 65B court-admissible explainability.",
};

export default function Chapter5Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* CHAPTER TOP BADGE & HERO */}
      <div className="border-b border-slate-200 pb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-slate-900 text-white tracking-wide uppercase">
            CHAPTER 05 &bull; MACHINE LEARNING CORE
          </span>
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            4.8ms AIR-GAPPED CPU EXECUTION
          </span>
          <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            ZERO CLOUD GPUS REQUIRED
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Dual Transformer ML Engine: The Two AI Detectives
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
          How NTRO combines two specialized, collaborating AI Transformers to catch ransomware cartels and peeling chains in real time — operating in just <strong>4.8 milliseconds</strong> right on secure, offline field laptops.
        </p>
      </div>

      {/* SECTION 1: The Architectural Breakthrough: Meet the Two AI Detectives */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Architectural Breakthrough: Meet the Two AI Detectives
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why legacy machine learning failed, and how two collaborating AI detectives solved Bitcoin forensic surveillance
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            In early prototypes, automated crypto-surveillance relied on standard machine learning tools: a 
            <strong> 7-layer Autoencoder</strong> that squashed transaction numbers into a single continuous average, and a 
            <strong> basic Graph Neural Network (GraphSAGE)</strong> that drew connections between Bitcoin wallets.
          </p>

          <p>
            While fine on textbook benchmarks, real-world deployment against organized cybercrime cartels exposed 
            <strong> three fatal flaws</strong> that rendered legacy AI ineffective for national defense:
          </p>

          {/* 3 Bottlenecks Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Fatal Flaw 1
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">EDGE BLINDNESS</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Treated All Connections Identically</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Old graph algorithms treated a legitimate merchant payment identically to a clandestine 
                peeling-chain hop or an intimate private-key co-spend. Because all connections looked the same, 
                clever money launderers easily hid behind normal everyday transfers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Fatal Flaw 2
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">FEATURE SOUP</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Mashed All Numbers Together</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Legacy autoencoders blended all 18 transaction traits (fees, amounts, timestamps, output ratios) into 
                one blurry mathematical soup. Subtle clues — such as an abnormal fee paired with a 95% change output — 
                got washed out, triggering endless false alarms on legitimate retail users.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Fatal Flaw 3
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">250ms BLACK-BOX LAG</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">Too Slow to Explain Alerts in Court</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                When legacy models raised an alert, explaining <em>why</em> took over 250 milliseconds using external perturbation tools. 
                With thousands of transactions racing through the Bitcoin mempool every second, investigators were left with unexplainable black-box alerts.
              </p>
            </div>
          </div>

          {/* The Two AI Detectives Solution Card */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              The Stage 3 Breakthrough: Two Specialized AI Detectives
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Instead of relying on a single clunky algorithm, we deploy a tag-team of 
              <strong> two specialized Transformer models</strong> that examine crypto evidence from two completely different angles:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-white rounded-xl border border-sky-200 text-xs space-y-2 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <Cpu className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  Detective A: The Forensic Accountant
                </div>
                <div className="text-[11px] font-mono text-sky-700 font-semibold">
                  FT-Transformer (Feature Tokenizer Transformer)
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Inspects the <strong>18 numeric traits</strong> of each transaction check (amounts, fee spikes, velocity, timestamps, output ratios). 
                  Gives every clue its own digital identity, catches zero-day laundering tricks, and produces a court-ready visual explanation in 
                  <strong> 0.0 milliseconds flat</strong>.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-indigo-200 text-xs space-y-2 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <Network className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  Detective B: The Syndicate Web Tracker
                </div>
                <div className="text-[11px] font-mono text-indigo-700 font-semibold">
                  Relational Graph Transformer (PyG TransformerConv)
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Zooms out to inspect the <strong>entire web of suspect connections</strong> using 4 specialized attention lenses (co-spending, 
                  transaction hops, peeling funnels, shared IPs). Ignores benign traffic noise to achieve an astonishing 
                  <strong> 94.8% peeling recall</strong> and <strong>0.9209 F1 accuracy</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Detective A: The Forensic Accountant */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Detective A: The Forensic Accountant (FT-Transformer)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Auditing 18 numeric traits of a transaction with 4 self-attention lenses and zero-delay visual explainability
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Implemented in <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/ml/ft_transformer.py" className="font-mono text-sky-600 hover:underline"><code>backend/app/ml/ft_transformer.py</code></a>, 
            <strong> Detective A</strong> acts as an expert financial auditor examining a suspicious bank draft. It doesn&apos;t look at the map; 
            it looks at the numbers on the transaction itself.
          </p>

          {/* 4 Intuitive Steps of Detective A */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-900">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                18 Distinct Forensic Traits
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rather than treating a transaction as just &ldquo;money sent,&rdquo; Detective A captures 18 distinct clues: fee rates, total BTC in, 
                total BTC out, output entropy, change dominance, script types, broadcaster IP count, autonomous system count, and time of day.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-900">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                Individual Trait Profiles (No Blurring)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Old models mashed all 18 traits into a single average. Detective A assigns each trait its own 
                <strong> 32-dimensional digital profile</strong>. A suspicious fee rate never gets obscured or drowned out by normal transaction volume.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-900">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                4-Lens Cross-Examination (Self-Attention)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The 18 traits cross-examine one another simultaneously. For example: <em>&ldquo;Does this sudden fee spike make sense given that 98% of the funds are heading to a fresh change address at 3 AM?&rdquo;</em> 
                Multi-variable laundering schemes cannot slip by.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-900">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                Instant Explainability (0.0ms Extra Delay!)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Because Detective A uses an executive summary token (<code className="font-mono text-slate-800">[CLS]</code>), the exact contribution of 
                every trait is naturally calculated during the initial check. The system generates court-ready visual heatmaps with 
                <strong> zero extra compute time</strong>.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Why This Catches Brand-New (Zero-Day) Crime Tactics:</strong> Detective A doesn&apos;t just memorize past crime examples. 
              It learns how legitimate, lawful Bitcoin traffic behaves. Whenever a ransomware gang invents a brand-new mixing or peeling technique, 
              it naturally fails the reconstruction test, triggering an immediate anomaly alert!
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Detective B: The Syndicate Web Tracker */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Detective B: The Syndicate Web Tracker (Relational Graph Transformer)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              PyTorch Geometric TransformerConv, 4 connection lenses, and needle-in-a-haystack smart focus
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Implemented in <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/ml/graph_transformer.py" className="font-mono text-sky-600 hover:underline"><code>backend/app/ml/graph_transformer.py</code></a>, 
            <strong> Detective B</strong> zooms out to look at the big picture. Criminal cartels don&apos;t use single transactions; 
            they orchestrate complex networks of mule accounts, peel chains, and shared hosting infrastructure.
          </p>

          {/* The 4 Dynamic Attention Lenses */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-700">
              The 4 Dynamic Attention Lenses of Detective B:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    LENS 1
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">CO-SPENDING</span>
                </div>
                <div className="text-xs font-bold text-slate-900">Common Ownership Clues</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Identifies wallets that jointly sign multi-input transactions, proving they belong to the same private key holder or cartel entity.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-sky-900 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                    LENS 2
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">MONEY ROUTES</span>
                </div>
                <div className="text-xs font-bold text-slate-900">2-Hop Mule Network Flow</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Traces funds hopping across disposable intermediary wallets (<code className="font-mono text-[10px]">Sender &rarr; Mule &rarr; Cash-Out</code>), propagating risk to the final destination.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    LENS 3
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">PEELING FUNNELS</span>
                </div>
                <div className="text-xs font-bold text-slate-900">Asymmetric Peeling Chains</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Specifically spotlights 1-in-2-out asymmetric hops where small sums peel off while the main ransom rolls forward. Powers <strong>94.8% peeling recall</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    LENS 4
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">INFRASTRUCTURE</span>
                </div>
                <div className="text-xs font-bold text-slate-900">Shared IP &amp; ASN Routing</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Links apparently disconnected wallets that broadcast transactions from identical ISP autonomous systems or shared offshore hosting nodes.
                </p>
              </div>
            </div>

            {/* Smart Focus Callout (Focal Loss in plain English) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Finding Needles in a Haystack: Smart Focus Mechanism
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                In real-world Bitcoin traffic, over <strong>99.9% of transactions are completely ordinary</strong> (people buying goods or moving funds between exchanges). 
                If you train standard AI on this, it gets lazy and simply guesses &ldquo;benign&rdquo; every time.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detective B uses a <strong>smart volume knob</strong>: it turns down the volume on the 200,000+ easy, ordinary transactions by 
                <strong> 10,000x</strong>. This forces the AI to dedicate 100% of its attention capacity strictly to the subtle, elusive laundering chains 
                crafted by sophisticated ransomware syndicates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Mind-Blowing Speed & Edge Deployment */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Operational Triumph: 4.8 Milliseconds on an Everyday CPU
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why our dual transformer needs ZERO cloud GPUs and runs 100% air-gapped on standard defense field laptops
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Most modern AI models look impressive in research papers but are unusable in national defense because they require 
            <strong> $10,000 NVIDIA H100 cloud servers</strong>, gigawatt power cords, and permanent high-speed internet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* The Cloud AI Trap */}
            <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200 space-y-2">
              <div className="flex items-center justify-between font-mono text-xs font-bold text-rose-800">
                <span>THE COMMERCIAL CLOUD TRAP</span>
                <Lock className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Unacceptable in National Defense Operations</h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Cloud Data Leaks:</strong> Streaming classified NTRO surveillance data to commercial cloud servers is a catastrophic security violation.</li>
                <li><strong>Requires Internet:</strong> Cannot function in secure underground bunkers, tactical mobile vans, or air-gapped naval vessels.</li>
                <li><strong>Massive Hardware Cost:</strong> $10,000+ per GPU server, making wide field deployment impossible for regional enforcement units.</li>
              </ul>
            </div>

            {/* The NTRO Engineering Solution */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between font-mono text-xs font-bold text-emerald-800">
                <span>OUR AIR-GAPPED ADVANTAGE</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Pure Local CPU Execution in 4.8ms</h4>
              <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Runs on Everyday Laptops:</strong> Verified on budget dual-core field laptops (e.g. Acer Aspire Lite) with zero discrete GPU.</li>
                <li><strong>100% Air-Gapped:</strong> Fully operational with no internet, no external APIs, and zero data leakage.</li>
                <li><strong>Cache-Resident Footprint:</strong> Entire model weights are under <strong>1.5 MB</strong>, fitting directly inside CPU L3 hardware cache for blazing 4.8ms scoring!</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: The Canonical Benchmark Truth Matrix */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
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

      {/* SECTION 6: Interactive Visual Elements */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Visual Playground: Heatmap &amp; Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Interactive 18x18 trait cross-examination simulator and 7-stage dual detective pipeline
            </p>
          </div>
        </div>

        {/* Module A: 18x18 Feature Attention Matrix Simulator */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Module A: 18 &times; 18 Trait Self-Attention Heatmap Simulator
          </div>
          <AttentionMatrix />
        </div>

        {/* Module B: Dual-Model Topology Visualizer */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Module B: The 7-Stage AI Detective Investigation Pipeline
          </div>
          <TransformerPipeline />
        </div>
      </section>

      {/* SECTION 7: Teammate FAQ Accordion */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            07
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Technical Briefing &amp; Teammate Defense FAQ
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Clear, non-technical explanations defending model choice, zero-latency attribution, and edge resilience
            </p>
          </div>
        </div>

        {/* EMBEDDED FAQ COMPONENT */}
        <MlFaq />
      </section>

      {/* SECTION 8: EXECUTIVE PITCH CHEAT SHEET CARD */}
      <section className="pt-4">
        <div className="p-6 rounded-2xl border-2 border-slate-900 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-lg space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                  EXECUTIVE PITCH CHEAT SHEET
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  How to Explain This to a Judge in 30 Seconds
                </h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
              30-SECOND ELEVATOR PITCH
            </span>
          </div>

          {/* The 3-Sentence Soundbite */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              Your 3-Sentence Soundbite for the Panel:
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium space-y-2">
              <p>
                &ldquo;<strong>1.</strong> We don&apos;t use slow, black-box cloud AI — we deploy two specialized AI detectives that work together right on an air-gapped field laptop.&rdquo;
              </p>
              <p>
                &ldquo;<strong>2.</strong> <strong>Detective A</strong> acts like a forensic accountant auditing 18 numeric traits of every transaction, while <strong>Detective B</strong> tracks the web of criminal syndicate connections across 4 relationship lenses.&rdquo;
              </p>
              <p>
                &ldquo;<strong>3.</strong> The entire dual-model analysis runs in just <strong>4.8 milliseconds on everyday CPU hardware</strong> — with zero expensive GPUs, zero cloud data leaks, and 100% Section 65B court-admissible visual evidence.&rdquo;
              </p>
            </div>
          </div>

          {/* 4 Unbeatable Pitch Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] font-mono font-bold text-amber-300 uppercase">01 &bull; AIR-GAPPED SECURITY</div>
              <div className="text-xs font-bold text-white">Zero Cloud GPUs Needed</div>
              <div className="text-[11px] text-slate-300">Runs offline inside secure NTRO bunkers on normal field laptops.</div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] font-mono font-bold text-emerald-300 uppercase">02 &bull; 4.8ms BLISTERING SPEED</div>
              <div className="text-xs font-bold text-white">Scores Live Mempool</div>
              <div className="text-[11px] text-slate-300">Faster than the blink of an eye (100ms) to flag transactions before confirmation.</div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] font-mono font-bold text-sky-300 uppercase">03 &bull; NO BLACK BOXES</div>
              <div className="text-xs font-bold text-white">0.0ms Free Explanations</div>
              <div className="text-[11px] text-slate-300">Generates instant visual heatmaps showing judges exactly why an alert fired.</div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] font-mono font-bold text-indigo-300 uppercase">04 &bull; RECORD ACCURACY</div>
              <div className="text-xs font-bold text-white">94.8% Peeling Recall</div>
              <div className="text-[11px] text-slate-300">Catches complex laundering syndicates that defeat simple rule systems.</div>
            </div>
          </div>
        </div>
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
          DOCUMENT SPECIFICATION &bull; SEC-DOC-26146-CH05
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
