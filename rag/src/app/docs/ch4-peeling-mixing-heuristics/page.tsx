import React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Waves,
  ShieldAlert,
  GitFork,
  ShieldCheck,
  GitMerge,
  Sparkles,
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { PeelingSimulator } from "./peeling-simulator";
import { CoinjoinVisualizer } from "./coinjoin-visualizer";

export const metadata = {
  title: "Chapter 4: Catching Bitcoin Launderers — NTRO KB",
  description:
    "Plain-English forensic guide to peeling chains, CoinJoin mixers, 97.2% catch rate, and sovereign offline heuristics.",
};

export default function Chapter4Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Criminal Playbook: How Illicit Bitcoin is Laundered
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why criminals peel and tumble stolen cryptocurrency — and how sovereign heuristics catch both techniques
            </p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Analogy 1: Peeling Chains */}
          <div className="rounded-xl p-5 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-amber-100 to-amber-50 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(180,83,9,0.12)]">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider">
                  Trick #1 • Peeling Chains
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  Buying Gum with a $100 Bill
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Criminals cash out stolen crypto without triggering exchange KYC alerts by making a tiny spend (&le; 20%) to buy prepaid items, while sweeping the remaining change (&ge; 80%) forward into a fresh burner wallet across 10 to 50 hops.
            </p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-semibold text-amber-950 bg-amber-50/90 border border-amber-200/90 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>Spots 1-in-2-out asymmetric sweep patterns across 5+ hops in &lt;12ms with 97.2% recall.</span>
            </div>
          </div>

          {/* Analogy 2: CoinJoin Mixers */}
          <div className="rounded-xl p-5 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-emerald-100 to-emerald-50 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(4,120,87,0.12)]">
                <GitMerge className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
                  Trick #2 • CoinJoin Mixers
                </span>
                <h3 className="text-sm font-bold text-slate-950">
                  The 50-Party Wasabi Pool
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In real-world heists like the 2020 Twitter VIP scam, hackers route illicit BTC through Wasabi or Whirlpool coordinators. Over 50 independent wallet owners pool inputs into one broadcast yielding identical 0.1 BTC UTXOs—severing 1-to-1 graph lineage before cashing out.
            </p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-semibold text-emerald-950 bg-emerald-50/90 border border-emerald-200/90 p-2.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
              <span>Detects equal-output coordinate pools with 100% recall while shielding innocent citizens.</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 uppercase tracking-wide">
                1. Ransomware Threat
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Extortion Stashes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hackers extort millions in Bitcoin, but know cashing out directly at regulated exchanges triggers instant blacklist freezes.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 uppercase tracking-wide">
                2. Automated Bot Speed
              </span>
              <GitFork className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">High-Speed Tumblers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Criminal scripts execute rapid multi-hop splits across hundreds of burner wallets in seconds, easily overwhelming manual investigative teams.
            </p>
          </div>

          <div className="rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                3. Citizen Immunity
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Zero False Accusations</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ordinary buyers spend 40% to 100% of their funds in 1–2 hops; our strict 5-hop gate ensures innocent citizens are never flagged (&lt;0.8% false alarm rate).
            </p>
          </div>
        </div>

        {/* 4-Column Grounded KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Peeling Catch Rate</div>
            <div className="text-xl font-mono font-extrabold text-blue-700">97.2% Verified</div>
            <div className="text-[11px] text-emerald-700 font-semibold">451 of 464 test chains caught</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Mixer Catch Rate</div>
            <div className="text-xl font-mono font-extrabold text-emerald-700">100% Mixing Catch</div>
            <div className="text-[11px] text-slate-600 font-medium">50 of 50 test pools caught</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">False Alarm Rate</div>
            <div className="text-xl font-mono font-extrabold text-emerald-700">&lt;0.8% False Positive</div>
            <div className="text-[11px] text-slate-600 font-medium">Shields everyday shoppers</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Evaluation Speed</div>
            <div className="text-xl font-mono font-extrabold text-sky-700">&lt;12ms / TX</div>
            <div className="text-[11px] text-slate-600 font-medium">100% sovereign offline engine</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive Peeling Chain Simulator */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Tool: Peeling Chain Explorer
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Simulate automated multi-hop laundering and observe sovereign radar gating in real time
            </p>
          </div>
        </div>
        <PeelingSimulator />
      </section>

      {/* SECTION 3: Plain-English Concept Deep-Dive */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Architecture Breakdown: Dual-Radar Forensic Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Comparing asymmetric peeling sweeps versus multi-person equal-output mixing pools
            </p>
          </div>
        </div>

        <div className="rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/40 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.05)] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Peeling Radar */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-blue-50/80 to-blue-50/30 border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(37,99,235,0.06)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-xs border-t border-t-blue-300 border-b border-b-blue-900 shadow-xs">
                    01
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Peeling Chain Radar</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-800 uppercase tracking-wider">
                      Asymmetric Sweeps
                    </span>
                  </div>
                </div>
                <GitFork className="w-4 h-4 text-blue-600" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-slate-900">1-in-2-out pattern:</strong> Exactly 1 input funding 2 outputs per step.</li>
                <li><strong className="text-slate-900">Asymmetric split:</strong> &le; 20% peeled off, &ge; 80% swept forward as change.</li>
                <li><strong className="text-slate-900">Rapid depth:</strong> At least 5 continuous hops unbroken by outside deposits.</li>
              </ul>
            </div>

            {/* CoinJoin Radar */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-50/80 to-emerald-50/30 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(5,150,105,0.06)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold text-xs border-t border-t-emerald-300 border-b border-b-emerald-900 shadow-xs">
                    02
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">CoinJoin Mixer Radar</h3>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
                      Multi-Person Mixing
                    </span>
                  </div>
                </div>
                <GitMerge className="w-4 h-4 text-emerald-600" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-slate-900">Multi-party pool:</strong> &ge; 3 distinct inputs and outputs in one transaction.</li>
                <li><strong className="text-slate-900">Equal outputs (&plusmn;1%):</strong> Multiple recipients getting identical BTC amounts.</li>
                <li><strong className="text-slate-900">Anti-supercluster:</strong> Disables common-input merging so strangers aren&apos;t falsely linked.</li>
              </ul>
            </div>
          </div>

          {/* Platform Ripple Effect */}
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_4px_rgba(15,23,42,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0 border-t border-t-blue-300 border-b border-b-blue-800 shadow-xs">
                <BadgeCheck className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-slate-700">
                <strong>Dual-DB Sync &amp; Graph AI:</strong> Mixer flags update PostgreSQL in &lt;10ms for instant alerts, while peeling paths emit spotlight edges into Neo4j Graph AI.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-300/80 text-slate-900 whitespace-nowrap shadow-xs">
              Speed: &lt;12ms Rules • 0 Cloud Calls
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive CoinJoin Visualizer */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.25)] flex-shrink-0">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Tool: The Digital Laundromat (CoinJoin) Explorer
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Explore how Wasabi and Whirlpool mixing pools work and how our prototype deconstructs them
            </p>
          </div>
        </div>
        <CoinjoinVisualizer />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch3-graph-entity-clustering"
          className="p-3 px-4 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50 text-slate-800 text-xs font-medium flex items-center gap-3 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.06)] active:translate-y-[0.5px] active:shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)]"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">
              Previous Chapter
            </div>
            <div className="font-semibold text-slate-900">
              Ch 3: Graph Topology &amp; Entity Clustering
            </div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 font-medium text-center">
          NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH04
        </div>

        <Link
          href="/docs/ch5-dual-transformer-ml"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-3 rounded-xl flex items-center gap-3 cursor-pointer active:translate-y-[0.5px]"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">
              Next Chapter
            </div>
            <div className="font-semibold text-white">
              Ch 5: Dual Transformer ML Engine
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white ml-1 flex-shrink-0" />
        </Link>
      </div>
    </article>
  );
}

