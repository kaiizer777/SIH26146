import React from "react";
import Link from "next/link";
import {
  ShoppingBag, Waves, ShieldAlert, GitFork, ShieldCheck,
  GitMerge, Sparkles, BadgeCheck, ArrowRight, ArrowLeft,
} from "lucide-react";
import { PeelingSimulator } from "./peeling-simulator";
import { CoinjoinVisualizer } from "./coinjoin-visualizer";
import { HeuristicsFaq } from "./heuristics-faq";

export const metadata = {
  title: "Chapter 4: Catching Bitcoin Launderers — NTRO KB",
  description: "Plain-English forensic guide to peeling chains, CoinJoin mixers, 97.2% verified recall, and teammate cheat sheet.",
};

export default function Chapter4Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-blue-500 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.15)] flex-shrink-0">01</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The Mission: Unmasking Peeling Chains &amp; Mixers</h2>
            <p className="text-xs text-slate-500 font-mono">Why criminals peel and tumble stolen Bitcoin, and how sovereign heuristics catch them</p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_4px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-amber-50 to-amber-100 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300/80 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.04)]">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">The Peeling Trick</span>
                <h3 className="text-sm font-bold text-slate-950">Buying Gum with a $100 Bill (Peeling Chains)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Buying a $1 pack of gum with a $100 bill yields $99 in clean change. Criminals peel tiny spends (&le;20%) while sweeping bulk change forward to stay under reporting thresholds.</p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-medium text-amber-950 bg-amber-50/80 border border-amber-200/60 p-2.5 rounded-lg shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>Automatically traces asymmetric sweeps across 5+ rapid hops.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_4px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-emerald-50 to-emerald-100 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300/80 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.04)]">
                <Waves className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">The Mixing Trick</span>
                <h3 className="text-sm font-bold text-slate-950">The Digital Laundromat (CoinJoin Mixers)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Fifty people toss clothes into one washer and withdraw identical shirts, masking ownership. CoinJoin pools funds from dozens of wallets into identical outputs to sever audit trails.</p>
            <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-[11px] font-medium text-emerald-950 bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-lg shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Flags equal-output clusters with 100% recall without falsely linking strangers.</span>
            </div>
          </div>
        </div>

        {/* 3 Executive Threat Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="card-tactical rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_4px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/90 shadow-2xs uppercase">1. Threat</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Extortion Laundering</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Ransomware syndicates extort millions but face exchange KYC freezes, turning to automated laundering scripts to disperse funds.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_4px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/90 shadow-2xs uppercase">2. Velocity</span>
              <GitFork className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Automated Bot Speed</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Laundering bots execute dozens of peeling hops and mixing pools across hundreds of addresses in seconds, blinding manual investigators.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_4px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/90 shadow-2xs uppercase">3. Shield</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Shopper Immunity</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Ordinary buyers spend 30%&ndash;100% of funds in 1&ndash;2 hops; strict multi-hop rules keep organic false positives below 1.8%.</p>
          </div>
        </div>

        {/* 4-Column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Peeling Chain Recall</div>
            <div className="text-lg font-mono font-bold text-slate-950">97.2% Verified</div>
            <div className="text-[10.5px] text-slate-500 font-medium">451 of 464 test chains caught</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Rule Evaluation</div>
            <div className="text-lg font-mono font-bold text-slate-950">&lt;12ms Engine</div>
            <div className="text-[10.5px] text-slate-500 font-medium">1.42ms average Cypher traversal</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">CoinJoin Catch</div>
            <div className="text-lg font-mono font-bold text-slate-950">100% Mixing Catch</div>
            <div className="text-[10.5px] text-slate-500 font-medium">50 of 50 test mixing pools caught</div>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">False Alarm Rate</div>
            <div className="text-lg font-mono font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />&lt;1.8% False Positive
            </div>
            <div className="text-[10.5px] text-slate-500 font-medium">Protects innocent everyday shoppers</div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive or Visual Core */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-blue-500 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.15)] flex-shrink-0">02</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Interactive Peeling Chain Simulator</h2>
            <p className="text-xs text-slate-500 font-mono">Step-by-step interactive simulator showing UTXO liquidation and asymmetric change sweeps</p>
          </div>
        </div>
        <PeelingSimulator />
      </section>

      {/* SECTION 3: Plain-English Concept Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-blue-500 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.15)] flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">How the Forensic Radar Catches Both Tricks</h2>
            <p className="text-xs text-slate-500 font-mono">Comparing asymmetric peeling sweeps versus multi-party equal-output pools</p>
          </div>
        </div>

        <div className="card-tactical rounded-xl p-6 bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-amber-50/80 to-amber-50/40 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-[0_2px_4px_rgba(180,83,9,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-xs border-t border-t-amber-300/60 border-b border-b-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.2)]">01</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Peeling Chain Radar (F3)</h3>
                    <span className="text-[10px] font-mono font-semibold text-amber-700 uppercase">Asymmetric Sweeps</span>
                  </div>
                </div>
                <GitFork className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Flags sequences where a large balance is incrementally whittled down across contiguous hops:</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>1-in-2-out pattern:</strong> Exactly 1 input funding 2 outputs per step.</li>
                <li><strong>Asymmetric split:</strong> &le;20% peeled off, &ge;80% swept forward as change.</li>
                <li><strong>Rapid depth:</strong> &ge;5 contiguous hops unbroken by external deposits.</li>
              </ul>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-emerald-50/80 to-emerald-50/40 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300/70 shadow-[0_2px_4px_rgba(5,150,105,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold text-xs border-t border-t-emerald-300/60 border-b border-b-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.2)]">02</div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">CoinJoin Equal-Output Decomposition</h3>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 uppercase">Multi-Party Mixing</span>
                  </div>
                </div>
                <GitMerge className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Identifies collaborative mixing rounds (Wasabi, Samourai Whirlpool, JoinMarket):</p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Multi-party pool:</strong> &ge;3 distinct inputs and outputs in one transaction.</li>
                <li><strong>Equal outputs (&plusmn;1%):</strong> Multiple recipients getting identical BTC amounts.</li>
                <li><strong>Anti-supercluster:</strong> Disables common-input merging to avoid falsely linking strangers.</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 border-t border-t-emerald-300/60 border-b border-b-emerald-800 text-white flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.1)]">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Platform Ripple: Dual-DB Sync &amp; Graph AI</div>
                <p className="text-[11px] text-slate-500">Mixing flags sync to PostgreSQL in &lt;10ms for instant triage and emit :PEELING_FLOW edges to the Graph Transformer.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300/90 text-slate-800 whitespace-nowrap shadow-2xs">
              Speed: &lt;12ms Rules &bull; 1.42ms Cypher
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-blue-500 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.15)] flex-shrink-0">04</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">CoinJoin Matrix &amp; Equal-Output Inspector</h2>
            <p className="text-xs text-slate-500 font-mono">Explore Wasabi, Samourai Whirlpool, and JoinMarket mixing presets</p>
          </div>
        </div>
        <CoinjoinVisualizer />
      </section>

      {/* SECTION 5: Frequently Asked Questions (Teammate Cheat Sheet) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-b from-blue-500 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,0,0,0.15)] flex-shrink-0">05</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Frequently Asked Questions (Teammate Cheat Sheet)</h2>
            <p className="text-xs text-slate-500 font-mono">Quick, clear answers to common questions judges and evaluators ask about peeling chains and mixers</p>
          </div>
        </div>
        <HeuristicsFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/docs/ch3-graph-entity-clustering" className="p-3 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/90 text-slate-800 text-xs font-medium flex items-center gap-3 cursor-pointer shadow-[0_2px_4px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-[0.5px]">
          <ArrowLeft className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 3: Graph Topology &amp; Entity Clustering</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-500 font-medium text-center">
          NTRO FORENSIC INTELLIGENCE &bull; SEC-DOC-26146-CH04
        </div>

        <Link href="/docs/ch5-dual-transformer-ml" className="bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.2)] active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] text-white text-xs font-medium px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer">
          <div className="text-left">
            <div className="text-[10px] text-blue-100 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 5: Dual Transformer ML Engine</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white ml-2 flex-shrink-0" />
        </Link>
      </div>
    </article>
  );
}
