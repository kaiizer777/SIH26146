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
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
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
  const [initialBtc, setInitialBtc] = useState<number>(100.0);
  const [peelPercent, setPeelPercent] = useState<number>(5.0); // e.g. 5%
  const [chainLength, setChainLength] = useState<number>(6); // 5 to 10 hops
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"topology" | "analogy" | "cypher" | "metrics">("topology");

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

      // Criteria: 1-in-2-out, peel <= 20%, forward >= 80%
      const isQualifying = pPercent <= 20.0 && fPercent >= 79.5;

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
  }, [initialBtc, peelPercent, chainLength]);

  // Overall detection verdict
  const isChainDetected = useMemo(() => {
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

  // Presets
  const applyPreset = (preset: "classic" | "stealth" | "shopper") => {
    setIsPlaying(false);
    setCurrentHopIndex(0);
    if (preset === "classic") {
      setInitialBtc(100.0);
      setPeelPercent(5.0);
      setChainLength(6);
    } else if (preset === "stealth") {
      setInitialBtc(50.0);
      setPeelPercent(2.0);
      setChainLength(8);
    } else if (preset === "shopper") {
      setInitialBtc(5.0);
      setPeelPercent(40.0);
      setChainLength(3);
    }
  };

  return (
    <div className="card-tactical rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
      {/* Component Header with Relatable Analogy */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gradient-to-b from-slate-800 to-slate-950 text-white border-t border-t-slate-700 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.2)]">
              <GitFork className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Interactive Peeling-Chain Hop Simulator
            </h3>
            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
              THE &quot;PACK OF GUM&quot; ANALOGY
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Simulate how a criminal repeatedly peels off small payments (&le; 20%) while passing the bulk change (&ge; 80%) forward across multiple hops.
          </p>
        </div>

        {/* Live Detection Status Badge */}
        <div>
          {isChainDetected ? (
            <div className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-rose-50 to-rose-100/80 border-t border-t-rose-100 border-x border-x-rose-200 border-b border-b-rose-300 text-rose-900 flex items-center gap-2 shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <div className="font-mono text-xs font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                FLAGGED: PEELING LAUNDERING DETECTED
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-emerald-50 to-emerald-100/80 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 text-emerald-900 flex items-center gap-2 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="font-mono text-xs font-bold">
                CLEARED: NORMAL TRANSACTION PATTERN
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="p-3 bg-gradient-to-b from-slate-50 to-slate-100/80 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Test Presets:
        </span>
        <button
          onClick={() => applyPreset("classic")}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-white to-slate-100 text-slate-900 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 font-semibold text-xs cursor-pointer active:translate-y-[0.5px] transition-all shadow-2xs"
        >
          🚨 Ransomware Peel (100 BTC • 5% • 6 Hops)
        </button>
        <button
          onClick={() => applyPreset("stealth")}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-white to-slate-100 text-slate-900 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 font-semibold text-xs cursor-pointer active:translate-y-[0.5px] transition-all shadow-2xs"
        >
          🕵️ Stealth Micro-Peel (50 BTC • 2% • 8 Hops)
        </button>
        <button
          onClick={() => applyPreset("shopper")}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-white to-slate-100 text-slate-900 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 font-semibold text-xs cursor-pointer active:translate-y-[0.5px] transition-all shadow-2xs"
        >
          🛒 Normal Shopper (5 BTC • 40% • 3 Hops — Cleared!)
        </button>
      </div>

      {/* Simulator Control Sliders */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Slider 1: Starting Stash */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="starting-balance" className="font-semibold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Starting Stash (Dirty BTC)
            </label>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] shadow-2xs">
              {initialBtc.toFixed(1)} BTC
            </span>
          </div>
          <input
            id="starting-balance"
            type="range"
            min="2"
            max="500"
            step="5"
            value={initialBtc}
            aria-label="Starting Balance in BTC"
            onChange={(e) => {
              setInitialBtc(parseFloat(e.target.value));
              setCurrentHopIndex(0);
            }}
            className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
            <span>2 BTC</span>
            <span>250 BTC</span>
            <span>500 BTC</span>
          </div>
        </div>

        {/* Slider 2: Peel Fraction (Gum) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="peel-ratio" className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-slate-500" />
              Peel Fraction per Hop (&quot;Gum&quot;)
            </label>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-2xs ${
                peelPercent <= 20
                  ? "bg-amber-50 text-amber-900 border border-amber-300"
                  : "bg-rose-50 text-rose-900 border border-rose-300"
              }`}
            >
              {peelPercent.toFixed(1)}% (Threshold: &le; 20%)
            </span>
          </div>
          <input
            id="peel-ratio"
            type="range"
            min="1"
            max="50"
            step="1"
            value={peelPercent}
            aria-label="Peel Fraction per Hop percentage"
            onChange={(e) => {
              setPeelPercent(parseFloat(e.target.value));
              setCurrentHopIndex(0);
            }}
            className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
            <span>1% (Stealth)</span>
            <span className="font-semibold text-amber-700">20% (Cutoff Rule)</span>
            <span>50% (Normal Spend)</span>
          </div>
        </div>

        {/* Slider 3: Chain Depth (Hops) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="chain-depth" className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Chain Depth (Consecutive Hops)
            </label>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-2xs ${
                chainLength >= 5
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                  : "bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              {chainLength} Hops (Rule: &ge; 5)
            </span>
          </div>
          <input
            id="chain-depth"
            type="range"
            min="2"
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
          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
            <span>2 (Shopper)</span>
            <span className="font-semibold text-emerald-700">5 (Alarm Gate)</span>
            <span>12 (Deep Laundering)</span>
          </div>
        </div>
      </div>

      {/* Playback & Step Bar */}
      <div className="px-4 py-3 bg-gradient-to-b from-slate-50 to-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-t border-t-blue-300/70 border-x border-x-blue-600 border-b border-b-blue-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_5px_rgba(0,0,0,0.2)] active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Auto-Run Chain"}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHopIndex(0);
            }}
            className="bg-gradient-to-b from-white to-slate-100 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer active:translate-y-[0.5px] shadow-2xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            onClick={() => setCurrentHopIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentHopIndex === 0}
            className="p-1.5 rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 shadow-2xs active:translate-y-[0.5px] transition-all"
            title="Previous Hop"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-bold text-slate-900 px-1">
            Hop {currentHopIndex + 1} of {chainLength}
          </span>

          <button
            onClick={() => setCurrentHopIndex((prev) => Math.min(hops.length - 1, prev + 1))}
            disabled={currentHopIndex === hops.length - 1}
            className="p-1.5 rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-800 shadow-2xs active:translate-y-[0.5px] transition-all"
            title="Next Hop"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-lg text-xs font-mono border border-slate-300/80 shadow-2xs">
          <button
            onClick={() => setActiveTab("topology")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "topology"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold"
            }`}
          >
            Hop Topology
          </button>
          <button
            onClick={() => setActiveTab("analogy")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "analogy"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold"
            }`}
          >
            Analogy Breakdown
          </button>
          <button
            onClick={() => setActiveTab("cypher")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "cypher"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold"
            }`}
          >
            Cypher Query
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "metrics"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold"
            }`}
          >
            Liquidation Stats
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="p-4 sm:p-6 space-y-6">
        {activeTab === "topology" && (
          <div className="space-y-6">
            {/* Hop Progress Bar */}
            <div className="relative">
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-2">
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
                      className={`flex-1 min-w-[75px] p-2.5 rounded-xl border text-center transition-all cursor-pointer active:translate-y-[0.5px] ${
                        isSelected
                          ? "bg-gradient-to-b from-slate-900 to-slate-950 text-white border-t border-t-slate-700 border-x border-x-slate-900 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.25)] ring-2 ring-slate-900/20"
                          : isPast
                          ? "bg-gradient-to-b from-slate-100 to-slate-200/80 text-slate-900 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                          : "bg-gradient-to-b from-white to-slate-50 text-slate-600 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300/80 shadow-2xs"
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase font-bold">
                        Hop #{h.hopNumber}
                      </div>
                      <div className="text-xs font-mono font-bold mt-0.5">
                        {h.forwardAmount.toFixed(1)} <span className="text-[9px]">BTC</span>
                      </div>
                      <div className="text-[9px] font-mono mt-0.5 text-amber-600 font-semibold">
                        -{h.peeledAmount.toFixed(1)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Schematic: The 1-In-2-Out Anatomy */}
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-slate-900">HOP #{activeHop.hopNumber} VISUAL SCHEMATIC</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 truncate max-w-[200px] sm:max-w-none">
                    TXID: {activeHop.txid}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Network Fee: {activeHop.fee} BTC
                </div>
              </div>

              {/* Node Graph Schematic */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 py-2">
                {/* 1. Input Node */}
                <div className="md:col-span-3 p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      1 INPUT WALLET
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">100% IN</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 truncate">
                    {activeHop.inputWallet}
                  </div>
                  <div className="text-sm font-mono font-extrabold text-slate-900">
                    {activeHop.totalIn.toFixed(4)} BTC
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {activeHop.hopNumber === 1
                      ? "Dirty Extortion Stash (Seed)"
                      : `Cleaned Change from Hop #${activeHop.hopNumber - 1}`}
                  </div>
                </div>

                {/* Arrow */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="w-px h-6 bg-slate-200 md:hidden" />
                </div>

                {/* 2. Transaction Node */}
                <div className="md:col-span-4 p-4 rounded-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-t border-t-slate-700 border-x border-x-slate-900 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.3)] space-y-2 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold">
                    <GitFork className="w-3.5 h-3.5 text-sky-400" />
                    Transaction (1-in-2-out)
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-100 truncate">
                    {activeHop.txid}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                    <div className="text-left">
                      <span className="text-slate-400 text-[9px] block">Peel Cut (&le;20%):</span>
                      <span className="text-amber-400 font-bold">{activeHop.peeledPercent}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[9px] block">Forward (&ge;80%):</span>
                      <span className="text-emerald-400 font-bold">{activeHop.forwardPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="w-px h-6 bg-slate-200 md:hidden" />
                </div>

                {/* 3. Two Outputs */}
                <div className="md:col-span-3 space-y-3">
                  {/* Output A: Peeled Amount */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100/70 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-900 uppercase">
                        🍬 Output #0: Peeled Cut
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-amber-800">
                        {activeHop.peeledPercent}%
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-950">
                      {activeHop.peeledAmount.toFixed(4)} BTC
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Destination: Cashout / Accomplice
                    </div>
                  </div>

                  {/* Output B: Forward Change */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-b from-emerald-50 to-emerald-100/70 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase">
                        💵 Output #1: Big Change
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-emerald-800">
                        {activeHop.forwardPercent}%
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-950">
                      {activeHop.forwardAmount.toFixed(4)} BTC
                    </div>
                    <div className="text-[10px] text-emerald-800">
                      Feeds directly into Hop #{activeHop.hopNumber + 1}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Heuristic Gating Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">1. Single Flow Line</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  1 In / 2 Out
                </div>
                <p className="text-[10px] text-slate-500">1 wallet enters, exactly 2 addresses emerge.</p>
              </div>

              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">2. Chain Depth ($H$)</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {chainLength >= 5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className={chainLength >= 5 ? "text-slate-900" : "text-amber-700"}>
                    {chainLength} Hops (Min: 5)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Ordinary shoppers drop off after 1–2 hops.</p>
              </div>

              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">3. Tiny Peel Ratio</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {activeHop.peeledPercent <= 20.0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  )}
                  <span className={activeHop.peeledPercent <= 20.0 ? "text-slate-900" : "text-rose-700"}>
                    {activeHop.peeledPercent}% (&le; 20%)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Tiny bite taken out to avoid KYC thresholds.</p>
              </div>

              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">4. Big Change Preserved</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {activeHop.forwardPercent >= 79.5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  )}
                  <span className={activeHop.forwardPercent >= 79.5 ? "text-slate-900" : "text-rose-700"}>
                    {activeHop.forwardPercent}% (&ge; 80%)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Bulk principal rolls into next wallet.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analogy" && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-gradient-to-b from-amber-50/90 to-amber-50/40 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300/80 text-xs text-amber-950 space-y-3 shadow-2xs">
              <div className="font-bold flex items-center gap-2 font-mono text-sm text-amber-900">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                The $100 Bill &amp; The Pack of Gum: Explained Simply
              </div>
              <p className="leading-relaxed">
                Imagine a thief robs a bank and gets a crisp, serial-tracked <strong>$100 bill</strong>. If they try to deposit that $100 bill into a bank, the teller checks the serial number and calls the police.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-white rounded-xl border-t border-t-white border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-2xs space-y-1">
                  <div className="font-bold text-slate-900">Step 1: Convenience Store</div>
                  <p className="text-slate-600">The thief buys a $1 pack of gum with the $100 bill. The cashier gives back <strong>$99 in clean change</strong>.</p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border-t border-t-white border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-2xs space-y-1">
                  <div className="font-bold text-slate-900">Step 2: Coffee Shop</div>
                  <p className="text-slate-600">They take the $99 bill to a café next door, buy another $1 item, and walk away with <strong>$98 in clean change</strong>.</p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border-t border-t-white border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-2xs space-y-1">
                  <div className="font-bold text-slate-900">Step 3: Repeat 50 Times</div>
                  <p className="text-slate-600">By doing this 50 times in an hour, they convert 1 dirty bill into dozens of small untraceable coins. <strong>That is a Peeling Chain.</strong></p>
                </div>
              </div>
              <p className="text-slate-700 font-medium">
                <strong>Why normal people never do this:</strong> Nobody walks into 20 stores in a row buying 1 stick of gum just to get change. That is why our detector looks for <strong>5+ contiguous hops</strong> of tiny payments (&le;20%) and huge change (&ge;80%).
              </p>
            </div>
          </div>
        )}

        {activeTab === "cypher" && (
          <div className="space-y-4">
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto border-t border-t-slate-800 border-x border-x-slate-900 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.3)]">
              <div className="text-slate-400">// Neo4j Pure-Cypher Hop Traversal (APOC-Free)</div>
              <div className="text-emerald-400 mt-2">MATCH (w:Wallet &#123;address: &apos;{activeHop.inputWallet}&apos;&#125;)-[:SENDS]-&gt;(tx:Transaction)</div>
              <div className="text-sky-300">WITH tx, count&#123; (tx)&lt;-[:SENDS]-(:Wallet) &#125; AS n_in</div>
              <div className="text-sky-300">WHERE n_in = 1</div>
              <div className="text-amber-300">MATCH (tx)-[r:RECEIVES]-&gt;(out_w:Wallet)</div>
              <div className="text-amber-300">WITH tx, n_in, collect(&#123;addr: out_w.address, amount: r.amount&#125;) AS out_list</div>
              <div className="text-amber-300">WHERE size(out_list) = 2</div>
              <div className="text-slate-300">WITH tx, tx.total_in AS total_in, out_list[0] AS out0, out_list[1] AS out1</div>
              <div className="text-slate-300">WITH tx, total_in,</div>
              <div className="text-slate-300 pl-4">CASE WHEN out0.amount &lt;= out1.amount THEN out0 ELSE out1 END AS small_out,</div>
              <div className="text-slate-300 pl-4">CASE WHEN out0.amount &lt;= out1.amount THEN out1 ELSE out0 END AS large_out</div>
              <div className="text-rose-300">WHERE small_out.amount &lt;= total_in * { (peelPercent / 100).toFixed(2) }</div>
              <div className="text-rose-300">  AND large_out.amount &gt;= total_in * 0.80</div>
              <div className="text-emerald-400 mt-2">RETURN tx.txid AS txid, large_out.addr AS next_change_wallet LIMIT 1;</div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Executed hop-by-hop in <code className="font-mono text-slate-800 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded shadow-2xs">backend/scripts/detect_peeling_chains.py</code>. Runs at <strong>1.42ms per hop</strong> on air-gapped sovereign hardware.
            </p>
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Liquidated so far</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">
                  {totalPeeledSum.toFixed(4)} BTC
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Siphoned across Hops 1 to {activeHop.hopNumber}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Remaining Principal</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {activeHop.forwardAmount.toFixed(4)} BTC
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  {((activeHop.forwardAmount / initialBtc) * 100).toFixed(1)}% of original stash remaining
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Accumulated Miner Fees</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {(feePerHop * activeHop.hopNumber).toFixed(4)} BTC
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Cost paid to Bitcoin miners across {activeHop.hopNumber} hops
                </div>
              </div>
            </div>

            {/* Table of Hops */}
            <div className="border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Hop #</th>
                    <th className="py-2.5 px-3">Input BTC</th>
                    <th className="py-2.5 px-3">Peeled Out (&quot;Gum&quot;)</th>
                    <th className="py-2.5 px-3">Forward Change (&quot;$99&quot;)</th>
                    <th className="py-2.5 px-3">Radar Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hops.map((h) => (
                    <tr
                      key={h.hopNumber}
                      className={h.hopNumber === activeHop.hopNumber ? "bg-sky-100/70 font-bold border-l-2 border-l-sky-600" : "even:bg-slate-50/60 odd:bg-white"}
                    >
                      <td className="py-2.5 px-3 text-slate-900">Hop #{h.hopNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{h.totalIn.toFixed(2)} BTC</td>
                      <td className="py-2.5 px-3 text-amber-700">
                        {h.peeledAmount.toFixed(2)} ({h.peeledPercent}%)
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700">
                        {h.forwardAmount.toFixed(2)} ({h.forwardPercent}%)
                      </td>
                      <td className="py-2.5 px-3">
                        {h.isPeelingQualifying ? (
                          <span className="text-[10px] text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-bold shadow-2xs">
                            SUSPICIOUS PEEL
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold shadow-2xs">
                            NORMAL SPEND
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
