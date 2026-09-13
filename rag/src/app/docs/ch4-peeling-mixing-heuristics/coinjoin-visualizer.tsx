"use client";

import React, { useState, useMemo } from "react";
import {
  GitMerge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Cpu,
  ArrowRight,
  Sparkles,
  Sliders,
  DollarSign,
  Info,
  Waves,
} from "lucide-react";

interface ParticipantInput {
  address: string;
  amount: number;
}

interface ParticipantOutput {
  address: string;
  amount: number;
  isEqualGroup: boolean;
  type: "equal" | "change";
}

interface PresetConfig {
  name: string;
  tag: string;
  denomination: number;
  inputAmounts: number[];
  equalOutputsCount: number;
  coordinatorFee: number;
  tolerance: number; // in %
  description: string;
}

const PRESETS: Record<string, PresetConfig> = {
  wasabi: {
    name: "Wasabi Wallet 2.0 (WabiSabi)",
    tag: "WASABI • 0.10 BTC POOL",
    denomination: 0.1,
    inputAmounts: [0.154, 0.221, 0.118, 0.31, 0.105],
    equalOutputsCount: 5,
    coordinatorFee: 0.003,
    tolerance: 1.0,
    description: "Wasabi 2.0 multi-party round with 5 participants depositing into 0.10 BTC equal-value outputs alongside variable change addresses.",
  },
  samourai: {
    name: "Samourai Whirlpool",
    tag: "SAMOURAI • 0.05 BTC POOL",
    denomination: 0.05,
    inputAmounts: [0.082, 0.061, 0.095, 0.054, 0.071],
    equalOutputsCount: 5,
    coordinatorFee: 0.0,
    tolerance: 1.0,
    description: "Samourai 5-in 5-out Whirlpool cycle where coordinator fee is paid upfront in Tx0, leaving clean equal-sized 0.05 BTC anonymity pool outputs.",
  },
  joinmarket: {
    name: "JoinMarket (Maker-Taker)",
    tag: "JOINMARKET • 0.25 BTC TAKER",
    denomination: 0.25,
    inputAmounts: [0.42, 0.35, 0.28, 0.61],
    equalOutputsCount: 4,
    coordinatorFee: 0.0004,
    tolerance: 1.0,
    description: "Decentralized maker-taker CoinJoin where 1 market taker coordinates with 3 makers paying micro-liquidity fees.",
  },
};

export function CoinjoinVisualizer() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("wasabi");
  const [activeTab, setActiveTab] = useState<"flow" | "analogy" | "algorithm" | "fp-guard">("flow");
  const [relativeTolPercent, setRelativeTolPercent] = useState<number>(1.0); // default 1.0% (0.01)
  const [injectedNoise, setInjectedNoise] = useState<number>(0.0); // allows testing tolerance failure

  const currentPreset = PRESETS[selectedPresetKey] || PRESETS.wasabi;

  // Build inputs & outputs dynamically
  const simulation = useMemo(() => {
    const denom = currentPreset.denomination;
    const inputs: ParticipantInput[] = currentPreset.inputAmounts.map((amt, idx) => ({
      address: `1InW${idx + 1}_${(4321 + idx * 89).toString(16)}...`,
      amount: parseFloat(amt.toFixed(4)),
    }));

    const totalIn = inputs.reduce((sum, i) => sum + i.amount, 0);

    const outputs: ParticipantOutput[] = [];
    const equalCount = currentPreset.equalOutputsCount;

    // Generate equal denomination outputs (with optional noise)
    for (let i = 0; i < equalCount; i++) {
      // Noise applies to output #2 when injected
      const noise = i === 1 ? injectedNoise : 0;
      const amt = parseFloat((denom + noise).toFixed(5));
      outputs.push({
        address: `bc1q_clean_${i + 1}_${(9812 + i * 41).toString(16)}...`,
        amount: amt,
        isEqualGroup: true,
        type: "equal",
      });
    }

    // Generate change outputs for participants whose input exceeds denom + fee
    const feePerHead = currentPreset.coordinatorFee / inputs.length;
    inputs.forEach((inp, idx) => {
      const changeAmt = inp.amount - denom - feePerHead - 0.0001;
      if (changeAmt > 0.002) {
        outputs.push({
          address: `1Chg${idx + 1}_${(7711 + idx * 63).toString(16)}...`,
          amount: parseFloat(changeAmt.toFixed(4)),
          isEqualGroup: false,
          type: "change",
        });
      }
    });

    const totalOut = outputs.reduce((sum, o) => sum + o.amount, 0);
    const minerFee = Math.max(0.0001, parseFloat((totalIn - totalOut).toFixed(5)));

    // Stage 1 Gates:
    const meetsMinInputs = inputs.length >= 3;
    const meetsMinOutputs = outputs.length >= 3;
    const meetsMinBtc = totalIn >= 0.05;

    // Stage 2 Equal-Output Detection with sliding-window tolerance:
    const tolDecimal = relativeTolPercent / 100.0;
    const eps = 1e-9;
    const sortedAmounts = outputs.map((o) => o.amount).sort((a, b) => a - b);

    let maxEqualGroup = 1;

    for (let i = 0; i < sortedAmounts.length; i++) {
      let currentGroupCount = 1;
      const a_i = sortedAmounts[i];
      for (let j = i + 1; j < sortedAmounts.length; j++) {
        const a_j = sortedAmounts[j];
        const denomMax = Math.max(a_i, a_j);
        if (denomMax > 0 && Math.abs(a_j - a_i) / denomMax <= tolDecimal + eps) {
          currentGroupCount += 1;
        }
      }
      if (currentGroupCount > maxEqualGroup) {
        maxEqualGroup = currentGroupCount;
      }
    }

    const isCoinJoinDetected =
      meetsMinInputs && meetsMinOutputs && meetsMinBtc && maxEqualGroup >= 2;

    return {
      inputs,
      outputs,
      totalIn: parseFloat(totalIn.toFixed(4)),
      totalOut: parseFloat(totalOut.toFixed(4)),
      minerFee,
      meetsMinInputs,
      meetsMinOutputs,
      meetsMinBtc,
      maxEqualGroup,
      isCoinJoinDetected,
    };
  }, [currentPreset, relativeTolPercent, injectedNoise]);

  return (
    <div className="card-tactical rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Component Header with Relatable Analogy */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-slate-900 text-white">
              <GitMerge className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              CoinJoin Equal-Output Matrix Visualizer
            </h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              THE &quot;DIGITAL LAUNDROMAT&quot; ANALOGY
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Deconstruct how multi-party tumblers pool coins and emit identical denomination outputs to break blockchain tracing.
          </p>
        </div>

        {/* Live Heuristic Status Badge */}
        <div>
          {simulation.isCoinJoinDetected ? (
            <div className="px-3.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <div className="font-mono text-xs font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                COINJOIN DETECTED (is_mixing = true)
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="font-mono text-xs font-semibold">
                CLEARED: ORDINARY MULTI-PAYMENT
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Protocol Fingerprint Selector Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 font-mono uppercase mr-1">
              Select Mixer Protocol:
            </span>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedPresetKey(key);
                  setInjectedNoise(0.0);
                }}
                className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all cursor-pointer ${
                  selectedPresetKey === key
                    ? "bg-slate-900 text-white font-bold shadow-xs ring-2 ring-slate-900/20"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                {p.name.split(" ")[0]} ({p.denomination} BTC Pool)
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-mono">
            <button
              onClick={() => setActiveTab("flow")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === "flow"
                  ? "tab-tactical-active text-slate-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Laundromat Matrix
            </button>
            <button
              onClick={() => setActiveTab("analogy")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === "analogy"
                  ? "tab-tactical-active text-slate-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Analogy Breakdown
            </button>
            <button
              onClick={() => setActiveTab("algorithm")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === "algorithm"
                  ? "tab-tactical-active text-slate-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Detection Logic
            </button>
            <button
              onClick={() => setActiveTab("fp-guard")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === "fp-guard"
                  ? "tab-tactical-active text-slate-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              IEEE Epsilon Guard
            </button>
          </div>
        </div>

        {/* Dynamic Preset Narrative */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">{currentPreset.name}:</span>{" "}
            {currentPreset.description} Each participant receives exactly{" "}
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {currentPreset.denomination} BTC
            </span>
            .
          </div>
        </div>

        {/* Sliders: Tolerance & Noise Injection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="relative-tolerance" className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                Matching Tolerance Window (&plusmn;%)
              </label>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                &plusmn;{relativeTolPercent.toFixed(2)}%
              </span>
            </div>
            <input
              id="relative-tolerance"
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={relativeTolPercent}
              aria-label="Relative Tolerance Window in percent"
              onChange={(e) => setRelativeTolPercent(parseFloat(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="text-[10px] text-slate-500">
              Allows catching mixers even if coordinator fees slightly alter output pennies.
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="noise-delta" className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                Simulate Adversarial Jitter (&Delta;)
              </label>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  injectedNoise === 0
                    ? "bg-slate-100 text-slate-700"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                &Delta; = {injectedNoise > 0 ? `+${injectedNoise.toFixed(4)}` : "0.0000"} BTC
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="noise-delta"
                type="range"
                min="0.0"
                max="0.008"
                step="0.0005"
                value={injectedNoise}
                aria-label="Simulate IEEE Jitter or Adversarial Output Delta in BTC"
                onChange={(e) => setInjectedNoise(parseFloat(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              {injectedNoise > 0 && (
                <button
                  onClick={() => setInjectedNoise(0.0)}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-900 underline shrink-0 cursor-pointer"
                >
                  Reset &Delta;
                </button>
              )}
            </div>
            <div className="text-[10px] text-slate-500">
              Test what happens when criminals intentionally jitter output amounts to evade detection.
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="p-4 sm:p-6 space-y-6">
        {activeTab === "flow" && (
          <div className="space-y-6">
            {/* Visual Multi-Party Transaction Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* Inputs Column: Dirty Clothes */}
              <div className="md:col-span-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold pb-1 border-b border-slate-200 text-slate-600">
                  <span className="flex items-center gap-1">
                    🧺 INPUTS ({simulation.inputs.length})
                  </span>
                  <span>TOTAL: {simulation.totalIn} BTC</span>
                </div>
                {simulation.inputs.map((inp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-0.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">Depositor #{idx + 1}</span>
                      <span className="font-extrabold text-slate-900">
                        {inp.amount.toFixed(4)} BTC
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{inp.address}</div>
                  </div>
                ))}
              </div>

              {/* Central Arrow */}
              <div className="md:col-span-1 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block" />
                <div className="w-px h-6 bg-slate-200 md:hidden" />
              </div>

              {/* Central Mixer Node: The Washing Machine */}
              <div className="md:col-span-3 p-4 rounded-xl bg-slate-900 text-white shadow-xs space-y-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  <Waves className="w-4 h-4 animate-spin" />
                  The Washing Machine (Mixer Tx)
                </div>
                <div className="font-mono text-xs font-bold text-slate-100 truncate">
                  tx_coinjoin_{selectedPresetKey}_92a7...
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Total Pooled:</span>
                    <span className="font-bold">{simulation.totalIn} BTC</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Target Denom:</span>
                    <span className="text-emerald-400 font-bold">
                      {currentPreset.denomination} BTC
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Miner Fee:</span>
                    <span>{simulation.minerFee} BTC</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Identical Outputs Group: {simulation.maxEqualGroup}
                  </span>
                </div>
              </div>

              {/* Central Arrow */}
              <div className="md:col-span-1 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block" />
                <div className="w-px h-6 bg-slate-200 md:hidden" />
              </div>

              {/* Outputs Column: Clean Shirts */}
              <div className="md:col-span-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold pb-1 border-b border-slate-200 text-slate-600">
                  <span className="flex items-center gap-1">
                    👕 OUTPUTS ({simulation.outputs.length})
                  </span>
                  <span>TOTAL: {simulation.totalOut} BTC</span>
                </div>
                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {simulation.outputs.map((out, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs font-mono space-y-0.5 transition-colors ${
                        out.type === "equal"
                          ? "bg-emerald-50/80 border-emerald-300"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            out.type === "equal" ? "text-emerald-900 font-extrabold" : "text-slate-500"
                          }`}
                        >
                          {out.type === "equal"
                            ? `✨ Clean Pool Output #${idx + 1}`
                            : `Change Output #${idx + 1}`}
                        </span>
                        <span
                          className={`font-extrabold ${
                            out.type === "equal" ? "text-emerald-950" : "text-slate-700"
                          }`}
                        >
                          {out.amount.toFixed(4)} BTC
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{out.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Heuristic Gate Checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Gate 1: Multi-Party Inputs</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {simulation.inputs.length} Inputs (&ge; 3)
                </div>
                <p className="text-[10px] text-slate-500">Filters 1-to-1 bilateral transfers.</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Gate 2: Multi-Party Outputs</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {simulation.outputs.length} Outputs (&ge; 3)
                </div>
                <p className="text-[10px] text-slate-500">Requires multi-participant payout.</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Gate 3: Meaningful Value</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {simulation.totalIn} BTC (&ge; 0.05)
                </div>
                <p className="text-[10px] text-slate-500">Eliminates dusting attacks and fee spam.</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Gate 4: Identical Outputs</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {simulation.maxEqualGroup >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span className={simulation.maxEqualGroup >= 2 ? "text-slate-900" : "text-rose-700"}>
                    {simulation.maxEqualGroup} Identical Denominations
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">The smoking gun signature of mixers.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analogy" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-3">
              <div className="font-bold flex items-center gap-2 font-mono text-sm text-emerald-900">
                <Info className="w-4 h-4 text-emerald-600" />
                The Digital Laundromat Analogy: Explained Simply
              </div>
              <p className="leading-relaxed">
                Imagine 50 people walk into a laundromat, each holding a dirty shirt with their name stitched inside. 
                If they all wash their shirts in separate machines, any detective waiting outside can see exactly who washed which shirt.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-1">
                  <div className="font-bold text-slate-900">1. All Clothes In One Tub</div>
                  <p className="text-slate-600">All 50 people cut out their name tags and throw their dirty shirts into <strong>one massive industrial washing machine</strong> (the CoinJoin transaction).</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-1">
                  <div className="font-bold text-slate-900">2. Identical White Shirts</div>
                  <p className="text-slate-600">The machine spins and washes them. When it finishes, 50 <strong>identical, unmarked white shirts (0.1 BTC each)</strong> are handed back to the participants.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-1">
                  <div className="font-bold text-slate-900">3. Mathematical De-Linking</div>
                  <p className="text-slate-600">A police officer standing outside sees 50 people walk out with clean shirts, but <strong>cannot mathematically prove</strong> which shirt belonged to the ransomware hacker.</p>
                </div>
              </div>
              <p className="text-slate-700 font-medium">
                <strong>How NTRO Catches It:</strong> While the mixer hides *which* individual got *which* specific shirt, it leaves an unmistakable fingerprint on the public ledger: <strong>multiple inputs emitting identical amounts simultaneously</strong>. Our system flags the entire transaction as <code className="font-mono text-emerald-900 bg-emerald-100 px-1 py-0.5 rounded font-bold">is_mixing = true</code> so criminals cannot hide behind the crowd.
              </p>
            </div>
          </div>
        )}

        {activeTab === "algorithm" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Stage 1 Cypher */}
              <div className="space-y-2">
                <div className="text-xs font-bold font-mono text-slate-800 flex items-center justify-between">
                  <span>STAGE 1: CYPHER STRUCTURAL GATE</span>
                  <span className="text-[10px] text-slate-500 font-mono">detect_coinjoin.py#L63</span>
                </div>
                <div className="bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800">
                  <div className="text-slate-500">// Filter candidate transactions with &gt;=3 inputs &amp; &gt;=3 outputs</div>
                  <div className="text-emerald-400">MATCH (in_w:Wallet)-[:SENDS]-&gt;(tx:Transaction)</div>
                  <div className="text-sky-300">WHERE tx.total_in &gt;= $min_btc</div>
                  <div className="text-sky-300">WITH tx, count(DISTINCT in_w) AS n_in</div>
                  <div className="text-sky-300">WHERE n_in &gt;= 3</div>
                  <div className="text-amber-300">MATCH (tx)-[r:RECEIVES]-&gt;(out_w:Wallet)</div>
                  <div className="text-amber-300">WITH tx, n_in, count(DISTINCT out_w) AS n_out,</div>
                  <div className="text-amber-300 pl-4">collect(r.amount) AS out_amounts</div>
                  <div className="text-rose-300">WHERE n_out &gt;= 3</div>
                  <div className="text-emerald-400">RETURN tx.txid, tx.total_in, out_amounts;</div>
                </div>
              </div>

              {/* Stage 2 Python */}
              <div className="space-y-2">
                <div className="text-xs font-bold font-mono text-slate-800 flex items-center justify-between">
                  <span>STAGE 2: PYTHON SLIDING WINDOW</span>
                  <span className="text-[10px] text-slate-500 font-mono">detect_coinjoin.py#L83</span>
                </div>
                <div className="bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800">
                  <div className="text-slate-500">def max_equal_group(amounts, tol=0.01):</div>
                  <div className="text-slate-400 pl-4">_EPS = 1e-9  # IEEE-754 epsilon guard</div>
                  <div className="text-sky-300 pl-4">sorted_amts = sorted(amounts)</div>
                  <div className="text-slate-300 pl-4">max_group = 1</div>
                  <div className="text-amber-300 pl-4">for i in range(len(sorted_amts)):</div>
                  <div className="text-amber-300 pl-8">a_i = sorted_amts[i]</div>
                  <div className="text-amber-300 pl-8">group = 1</div>
                  <div className="text-amber-300 pl-8">for j in range(i + 1, len(sorted_amts)):</div>
                  <div className="text-emerald-300 pl-12">denom = max(a_i, sorted_amts[j])</div>
                  <div className="text-rose-300 pl-12">if abs(sorted_amts[j] - a_i) / denom &lt;= tol + _EPS:</div>
                  <div className="text-rose-300 pl-16">group += 1</div>
                  <div className="text-emerald-400 pl-4">return max_group</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <strong>Why Two Stages?</strong> Stage 1 uses fast Neo4j indexed graph queries to filter out 99% of normal transactions. Stage 2 uses sub-millisecond Python math to check for equal denominations with floating-point safety.
            </div>
          </div>
        )}

        {activeTab === "fp-guard" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3 text-xs text-amber-900 leading-relaxed">
              <div className="font-bold flex items-center gap-2 text-amber-950 font-mono text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                The IEEE-754 Epsilon Boundary Hazard (Plain English)
              </div>
              <p>
                Computers store decimal numbers in binary (base-2), which means numbers like <strong>0.1</strong> cannot always be stored with 100% mathematical perfection.
              </p>
              <div className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-[11px] leading-relaxed">
                <div>// Without epsilon guard:</div>
                <div>a = 0.10000000000000000</div>
                <div>b = 0.09900000000000000</div>
                <div>abs(a - b) / max(a, b) = 0.010000000000000009  // &gt; 0.010000000000000000!</div>
                <div className="text-rose-400">// Fails strict check due to an invisible microscopic fraction!</div>
              </div>
              <p>
                If an algorithm naively compares <code className="font-mono text-amber-950 bg-amber-100 px-1 py-0.5 rounded">delta &lt;= 0.01</code>, a real mixer transaction might slip right through the cracks because of microscopic CPU rounding jitter. NTRO adds an explicit <code className="font-mono text-amber-950 bg-amber-100 px-1 py-0.5 rounded">+ 1e-9</code> epsilon guard so no criminal escapes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
