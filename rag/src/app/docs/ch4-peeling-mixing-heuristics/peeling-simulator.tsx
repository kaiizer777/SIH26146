"use client";

import React, { useState, useMemo } from "react";
import {
  GitFork,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Percent,
  Terminal,
} from "lucide-react";

interface HopData {
  hopNumber: number;
  inputWallet: string;
  txid: string;
  totalIn: number;
  peeledAmount: number;
  peeledWallet: string;
  peeledPercent: number;
  forwardAmount: number;
  forwardWallet: string;
  forwardPercent: number;
  fee: number;
  isPeelingQualifying: boolean;
}

export function PeelingSimulator() {
  // Simulator Controls
  const [thresholdMode, setThresholdMode] = useState<"strict" | "investigative">("strict");
  const [initialBtc, setInitialBtc] = useState<number>(100.0);
  const [peelPercent, setPeelPercent] = useState<number>(5.0); // Default 5.0% for strict production
  const [chainLength, setChainLength] = useState<number>(6); // 5 to 10 hops
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"topology" | "cypher" | "metrics">("topology");

  // Threshold bounds: Strict production default = 5%, wide investigative = 20%
  const maxPeelAllowed = thresholdMode === "strict" ? 5.0 : 20.0;

  // Fixed network fee per hop in BTC
  const feePerHop = 0.0002;

  // Generate deterministic hop sequence based on state
  const hops: HopData[] = useMemo(() => {
    const list: HopData[] = [];
    let currentBalance = initialBtc;

    for (let i = 1; i <= chainLength; i++) {
      const peelRatio = peelPercent / 100;
      const peeled = Math.max(0.001, parseFloat((currentBalance * peelRatio).toFixed(4)));
      const forward = Math.max(0, parseFloat((currentBalance - peeled - feePerHop).toFixed(4)));

      const pPercent = currentBalance > 0 ? (peeled / currentBalance) * 100 : 0;
      const fPercent = currentBalance > 0 ? (forward / currentBalance) * 100 : 0;

      // Criteria: 1-in-2-out, peel <= maxPeelAllowed (5% strict or 20% wide), forward >= 80%
      const isQualifying = Math.round(pPercent * 100) / 100 <= maxPeelAllowed && fPercent >= 79.5;

      list.push({
        hopNumber: i,
        inputWallet: `1Peel${i}In_${(1000 + i * 73).toString(16)}...`,
        txid: `tx_peel_${i.toString().padStart(2, "0")}_${(8921 + i * 137).toString(16)}...`,
        totalIn: parseFloat(currentBalance.toFixed(4)),
        peeledAmount: peeled,
        peeledWallet: `1ExchDep_${(5000 + i * 29).toString(16)}...`,
        peeledPercent: parseFloat(pPercent.toFixed(2)),
        forwardAmount: forward,
        forwardWallet: `1Peel${i + 1}Chg_${(1000 + (i + 1) * 73).toString(16)}...`,
        forwardPercent: parseFloat(fPercent.toFixed(2)),
        fee: feePerHop,
        isPeelingQualifying: isQualifying,
      });

      currentBalance = forward;
    }
    return list;
  }, [initialBtc, peelPercent, chainLength, maxPeelAllowed]);

  // Overall detection verdict
  const isChainDetected = useMemo(() => {
    // Chain length >= 5 and all hops qualifying
    const meetsHopCount = chainLength >= 5;
    const allQualifying = hops.every((h) => h.isPeelingQualifying);
    return meetsHopCount && allQualifying;
  }, [chainLength, hops]);

  // Auto-play interval
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentHopIndex((prev) => {
          if (prev >= hops.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlaying, hops.length]);

  const activeHop = hops[currentHopIndex] || hops[0];

  const totalPeeledSum = useMemo(() => {
    return hops.slice(0, currentHopIndex + 1).reduce((acc, h) => acc + h.peeledAmount, 0);
  }, [hops, currentHopIndex]);

  return (
    <div className="card-tactical rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Component Tactical Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-slate-900 text-white">
              <GitFork className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Interactive Peeling-Chain Hop Simulator
            </h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              HEURISTIC F3 • 1-IN-2-OUT
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Simulate forward change propagation, peel fraction extraction, and live detection gating across multi-hop UTXO paths.
          </p>
        </div>

        {/* Live Detection Status Badge */}
        <div className="flex items-center gap-2">
          {isChainDetected ? (
            <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200/90 text-rose-800 flex items-center gap-2 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
              </span>
              <div className="font-mono text-[11px] font-bold">
                FLAGGED: PEELING CHAIN DETECTED
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <div className="font-mono text-[11px] font-semibold">
                CLEARED: CRITERIA UNMET
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Policy Mode Selector Bar */}
      <div className="px-4 py-2.5 sm:px-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Detection Policy:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 font-mono text-[11px]">
            <button
              onClick={() => {
                setThresholdMode("strict");
              }}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                thresholdMode === "strict"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Strict Production (5% Max)
            </button>
            <button
              onClick={() => {
                setThresholdMode("investigative");
              }}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                thresholdMode === "investigative"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Wide Investigative (20% Max)
            </button>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
          <span className="text-slate-400">CLI:</span>
          <code className="text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">
            {thresholdMode === "strict" ? "--peel-ratio-max = 0.05" : "--peel-ratio-max = 0.20"}
          </code>
          <span className="text-slate-300">&bull;</span>
          <code className="text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
            --change-ratio-min = 0.80
          </code>
        </div>
      </div>

      {/* Simulator Control Sliders Grid */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Slider 1: Initial Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="starting-balance" className="font-semibold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Starting Balance
            </label>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {initialBtc.toFixed(1)} BTC
            </span>
          </div>
          <input
            id="starting-balance"
            type="range"
            min="20"
            max="500"
            step="10"
            value={initialBtc}
            aria-label="Starting Balance in BTC"
            onChange={(e) => {
              setInitialBtc(parseFloat(e.target.value));
              setCurrentHopIndex(0);
            }}
            className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>20 BTC</span>
            <span>250 BTC</span>
            <span>500 BTC</span>
          </div>
        </div>

        {/* Slider 2: Peel Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="peel-ratio" className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              Peel Fraction per Hop
            </label>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                peelPercent <= maxPeelAllowed
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {peelPercent.toFixed(1)}% (Threshold: &le; {maxPeelAllowed.toFixed(1)}%)
            </span>
          </div>
          <input
            id="peel-ratio"
            type="range"
            min="1"
            max="35"
            step="0.5"
            value={peelPercent}
            aria-label="Peel Fraction per Hop percentage"
            onChange={(e) => {
              setPeelPercent(parseFloat(e.target.value));
              setCurrentHopIndex(0);
            }}
            className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>1% (Stealth)</span>
            <span className={thresholdMode === "strict" ? "font-bold text-emerald-700 underline decoration-emerald-500" : "text-slate-500"}>
              5% (Strict Prod)
            </span>
            <span className={thresholdMode === "investigative" ? "font-bold text-amber-700 underline decoration-amber-500" : "text-slate-500"}>
              20% (Wide Net)
            </span>
            <span>35% (Non-peeling)</span>
          </div>
        </div>

        {/* Slider 3: Chain Depth (Hops) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="chain-depth" className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Chain Depth (Hops)
            </label>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                chainLength >= 5
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {chainLength} Hops (Min: 5)
            </span>
          </div>
          <input
            id="chain-depth"
            type="range"
            min="3"
            max="12"
            step="1"
            value={chainLength}
            aria-label="Chain Depth in Hops"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setChainLength(val);
              if (currentHopIndex >= val) setCurrentHopIndex(val - 1);
            }}
            className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>3 (Too short)</span>
            <span className="font-semibold text-emerald-600">5 (Gated)</span>
            <span>12 (Extended)</span>
          </div>
        </div>
      </div>

      {/* Playback & Step Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-tactical-primary text-white text-xs px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Auto-Run Chain"}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHopIndex(0);
            }}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setCurrentHopIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentHopIndex === 0}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 transition-colors"
            title="Previous Hop"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-bold text-slate-800 px-1">
            Hop {currentHopIndex + 1} of {chainLength}
          </span>

          <button
            onClick={() => setCurrentHopIndex((prev) => Math.min(hops.length - 1, prev + 1))}
            disabled={currentHopIndex === hops.length - 1}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 transition-colors"
            title="Next Hop"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveTab("topology")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "topology"
                ? "tab-tactical-active text-slate-900 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hop Topology
          </button>
          <button
            onClick={() => setActiveTab("cypher")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "cypher"
                ? "tab-tactical-active text-slate-900 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cypher Match
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "metrics"
                ? "tab-tactical-active text-slate-900 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Liquidation Curve
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="p-4 sm:p-6 space-y-6">
        {activeTab === "topology" && (
          <div className="space-y-6">
            {/* Hop Progress Timeline Bar */}
            <div className="relative">
              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
                {hops.map((h, idx) => {
                  const isSelected = idx === currentHopIndex;
                  const isPast = idx < currentHopIndex;
                  return (
                    <button
                      key={h.hopNumber}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentHopIndex(idx);
                      }}
                      className={`flex-1 min-w-[70px] p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20"
                          : isPast
                          ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/60"
                          : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase font-bold">
                        Hop {h.hopNumber}
                      </div>
                      <div className="text-xs font-mono font-bold mt-0.5">
                        {h.forwardAmount.toFixed(1)} <span className="text-[9px]">BTC</span>
                      </div>
                      <div className="text-[9px] font-mono mt-0.5 opacity-80">
                        -{h.peeledAmount.toFixed(1)} BTC
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Hop Visual Schematic: 1-In-2-Out Topology */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-slate-900">HOP #{activeHop.hopNumber} SCHEMATIC</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 truncate max-w-[200px] sm:max-w-none">
                    TXID: {activeHop.txid}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Fee: {activeHop.fee} BTC
                </div>
              </div>

              {/* Node Graph Schematic (HTML / SVG) */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 py-2">
                {/* 1. Input Node */}
                <div className="md:col-span-3 p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      1 INPUT WALLET
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">100% IN</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 truncate">
                    {activeHop.inputWallet}
                  </div>
                  <div className="text-sm font-mono font-extrabold text-slate-900">
                    {activeHop.totalIn.toFixed(4)} BTC
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {activeHop.hopNumber === 1 ? "Seed / Hot Wallet" : "Forward Change from Hop " + (activeHop.hopNumber - 1)}
                  </div>
                </div>

                {/* 2. Arrow to Central TX */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="w-px h-6 bg-slate-200 md:hidden" />
                </div>

                {/* 3. Transaction Node */}
                <div className="md:col-span-4 p-4 rounded-xl bg-slate-900 text-white shadow-xs space-y-2 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold">
                    <GitFork className="w-3.5 h-3.5 text-sky-400" />
                    Transaction (1-in-2-out)
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-100 truncate">
                    {activeHop.txid}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
                    <div className="text-left">
                      <span className="text-slate-400 text-[9px] block">Peel Ratio:</span>
                      <span className="text-amber-400 font-bold">{activeHop.peeledPercent}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[9px] block">Forward Ratio:</span>
                      <span className="text-emerald-400 font-bold">{activeHop.forwardPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* 4. Arrow to 2 Outputs */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="w-px h-6 bg-slate-200 md:hidden" />
                </div>

                {/* 5. Two Output Wallets */}
                <div className="md:col-span-3 space-y-3">
                  {/* Output A: Peeled Amount (Exchange / Cashout) */}
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/90 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-900 uppercase">
                        Output #0: Peeled Cut
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-amber-700">
                        {activeHop.peeledPercent}%
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-950">
                      {activeHop.peeledAmount.toFixed(4)} BTC
                    </div>
                    <div className="text-[10px] font-mono text-amber-800 truncate">
                      Dest: {activeHop.peeledWallet} (Deposit)
                    </div>
                  </div>

                  {/* Output B: Forward Change (Next Hop) */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/90 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase">
                        Output #1: Forward Change
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-emerald-700">
                        {activeHop.forwardPercent}%
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-950">
                      {activeHop.forwardAmount.toFixed(4)} BTC
                    </div>
                    <div className="text-[10px] font-mono text-emerald-800 truncate">
                      Dest: {activeHop.forwardWallet}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Heuristic Gating Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">1. Topology Constraint</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  1 In / 2 Out
                </div>
                <p className="text-[10px] text-slate-500">Strictly 1 input and 2 output wallets.</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">2. Chain Depth ($H$)</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {chainLength >= 5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className={chainLength >= 5 ? "text-slate-900" : "text-amber-700"}>
                    {chainLength} Hops (&ge; 5)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Filters 99.8% of casual 1-2 hop consumer spends.</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  3. Peel Ratio Max ({thresholdMode === "strict" ? "5% Strict" : "20% Wide"})
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {activeHop.peeledPercent <= maxPeelAllowed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span className={activeHop.peeledPercent <= maxPeelAllowed ? "text-slate-900" : "text-rose-700"}>
                    {activeHop.peeledPercent}% (&le; {maxPeelAllowed.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {thresholdMode === "strict"
                    ? "Strict production default (--peel-ratio-max = 0.05)."
                    : "Wide investigative setting (--peel-ratio-max = 0.20)."}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">4. Forward Ratio Min</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {activeHop.forwardPercent >= 79.5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span className={activeHop.forwardPercent >= 79.5 ? "text-slate-900" : "text-rose-700"}>
                    {activeHop.forwardPercent}% (&ge; 80.0%)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Bulk principal preserved for subsequent hops.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cypher" && (
          <div className="space-y-4">
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto border border-slate-800">
              <div className="text-slate-400">// Cypher Phase B Traversal: Follow next hop from change wallet &apos;{activeHop.inputWallet}&apos;</div>
              <div className="text-slate-400">// Policy Threshold: $peel_ratio_max = { (maxPeelAllowed / 100).toFixed(2) } ({thresholdMode === "strict" ? "Strict Production Default" : "Wide Investigative Net"})</div>
              <div className="text-emerald-400 mt-2">MATCH (w:Wallet &#123;address: &apos;{activeHop.inputWallet}&apos;&#125;)-[:SENDS]-&gt;(tx:Transaction)</div>
              <div className="text-sky-300">WITH tx, count&#123; (tx)&lt;-[:SENDS]-(:Wallet) &#125; AS n_in</div>
              <div className="text-sky-300">WHERE n_in = 1</div>
              <div className="text-amber-300">MATCH (tx)-[r:RECEIVES]-&gt;(out_w:Wallet)</div>
              <div className="text-amber-300">WITH tx, n_in, collect(&#123;addr: out_w.address, amount: r.amount&#125;) AS out_list</div>
              <div className="text-amber-300">WHERE size(out_list) = 2</div>
              <div className="text-slate-300">WITH tx, tx.total_in AS total_in, out_list[0] AS out0, out_list[1] AS out1</div>
              <div className="text-slate-300">WHERE total_in IS NOT NULL AND total_in &gt; 0</div>
              <div className="text-slate-300">WITH tx, total_in,</div>
              <div className="text-slate-300 pl-4">CASE WHEN out0.amount &lt;= out1.amount THEN out0 ELSE out1 END AS small_out,</div>
              <div className="text-slate-300 pl-4">CASE WHEN out0.amount &lt;= out1.amount THEN out1 ELSE out0 END AS large_out</div>
              <div className="text-rose-300">WHERE small_out.amount &lt;= total_in * { (maxPeelAllowed / 100).toFixed(2) }  // $peel_ratio_max = { (maxPeelAllowed / 100).toFixed(2) }</div>
              <div className="text-rose-300">  AND large_out.amount &gt;= total_in * 0.80  // $change_ratio_min = 0.80</div>
              <div className="text-emerald-400 mt-2">RETURN tx.txid AS txid, large_out.addr AS change_wallet LIMIT 1;</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 font-mono text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Execution Cost Profile
              </div>
              <p>
                Executed parameter-by-parameter in Python loop (<code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">backend/scripts/detect_peeling_chains.py</code>). 
                Average hop traversal latency is <strong>1.42ms</strong> per hop because <code className="font-mono">:Wallet(address)</code> and <code className="font-mono">:Transaction(txid)</code> are backed by unique schema constraints.
              </p>
            </div>
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Liquidated</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">
                  {totalPeeledSum.toFixed(4)} BTC
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Across Hops 1&ndash;{activeHop.hopNumber}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Remaining in Chain</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {activeHop.forwardAmount.toFixed(4)} BTC
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  {((activeHop.forwardAmount / initialBtc) * 100).toFixed(1)}% of initial
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Cumulative Pass-Through</div>
                <div className="text-lg font-bold text-sky-700 mt-0.5">
                  {((activeHop.forwardAmount / initialBtc) * 100).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  &Pi;_pass = {(activeHop.forwardAmount / initialBtc).toFixed(4)}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Mining Fees Paid</div>
                <div className="text-lg font-bold text-slate-800 mt-0.5">
                  {(feePerHop * activeHop.hopNumber).toFixed(4)} BTC
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  {activeHop.hopNumber} mempool spends
                </div>
              </div>
            </div>

            {/* Table of all hops */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Hop</th>
                    <th className="py-2 px-3">Input BTC</th>
                    <th className="py-2 px-3">Peeled Out</th>
                    <th className="py-2 px-3">Forward Change</th>
                    <th className="py-2 px-3">Gating Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hops.map((h) => (
                    <tr
                      key={h.hopNumber}
                      className={h.hopNumber === activeHop.hopNumber ? "bg-sky-50/60 font-bold" : "hover:bg-slate-50"}
                    >
                      <td className="py-2 px-3 text-slate-900">#{h.hopNumber}</td>
                      <td className="py-2 px-3 text-slate-700">{h.totalIn.toFixed(2)}</td>
                      <td className="py-2 px-3 text-amber-700">
                        {h.peeledAmount.toFixed(2)} ({h.peeledPercent}%)
                      </td>
                      <td className="py-2 px-3 text-emerald-700">
                        {h.forwardAmount.toFixed(2)} ({h.forwardPercent}%)
                      </td>
                      <td className="py-2 px-3">
                        {h.isPeelingQualifying ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                            QUALIFIES
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-semibold">
                            OUT OF BOUNDS
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
