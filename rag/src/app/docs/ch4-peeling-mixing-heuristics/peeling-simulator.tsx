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
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Clock,
  Coins,
  Radio,
  FileSpreadsheet,
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
  const [activeTab, setActiveTab] = useState<"topology" | "analogy" | "rules" | "metrics">("topology");

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
        inputWallet: `1Burner_Node_${i.toString().padStart(2, "0")}`,
        txid: `tx_${i.toString().padStart(2, "0")}_split_${Math.round(currentBalance)}`,
        totalIn: parseFloat(currentBalance.toFixed(4)),
        peeledAmount: peeled,
        peeledWallet: `1Accomplice_Payout_${i}`,
        peeledPercent: parseFloat(pPercent.toFixed(1)),
        forwardAmount: forward,
        forwardWallet: `1Burner_Node_${(i + 1).toString().padStart(2, "0")}`,
        forwardPercent: parseFloat(fPercent.toFixed(1)),
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

  const totalPeeledSum = useMemo(() => {
    return hops
      .slice(0, currentHopIndex + 1)
      .reduce((sum, h) => sum + h.peeledAmount, 0);
  }, [hops, currentHopIndex]);

  return (
    <div className="rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.06)]">
      {/* Top Banner & Tactical Status HUD */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-slate-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 text-white flex items-center justify-center font-bold text-xs border-t border-t-slate-700 border-b border-b-black shadow-xs flex-shrink-0">
              <GitFork className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-950 tracking-tight">
                Peeling Chain Radar Simulator
              </h3>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs">
                PACK OF GUM TRICK
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Simulate how ransomware bots peel small cuts (&le;20%) while sweeping the remaining change (&ge;80%) forward across burner wallets.
          </p>
        </div>

        {/* Live Detection Status Badge */}
        <div className="flex-shrink-0">
          {isChainDetected ? (
            <div className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-rose-50 to-rose-100/70 border-t border-t-rose-100 border-x border-x-rose-200 border-b border-b-rose-300 text-rose-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(225,29,72,0.1)] flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <div>
                <div className="font-mono text-xs font-bold flex items-center gap-1.5 text-rose-900">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  ALERT: PEELING CHAIN FLAGGED
                </div>
                <div className="text-[10px] font-mono text-rose-700 font-medium">
                  {chainLength} consecutive hops &bull; &le;{peelPercent}% peel ratio
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-gradient-to-b from-emerald-50 to-emerald-100/70 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(5,150,105,0.1)] flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-mono text-xs font-bold flex items-center gap-1.5 text-emerald-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  CLEARED: ORDINARY SPENDING
                </div>
                <div className="text-[10px] font-mono text-emerald-700 font-medium">
                  {chainLength < 5 ? "Fails ≥5 hop depth gate" : "Fails ≤20% peel threshold"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="p-3 bg-gradient-to-b from-white to-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[10.5px] font-bold text-slate-500 uppercase flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Test Presets:
        </span>
        <button
          onClick={() => applyPreset("classic")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs cursor-pointer active:translate-y-[0.5px] transition-all flex items-center gap-1.5 ${
            initialBtc === 100 && peelPercent === 5 && chainLength === 6
              ? "bg-slate-900 text-white border-t border-t-slate-700 border-x border-x-slate-900 border-b border-b-black shadow-xs font-bold"
              : "bg-gradient-to-b from-white to-slate-50 text-slate-800 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs hover:bg-slate-100"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Ransomware Bot (100 BTC &bull; 5% Peel &bull; 6 Hops)</span>
        </button>
        <button
          onClick={() => applyPreset("stealth")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs cursor-pointer active:translate-y-[0.5px] transition-all flex items-center gap-1.5 ${
            initialBtc === 50 && peelPercent === 2 && chainLength === 8
              ? "bg-slate-900 text-white border-t border-t-slate-700 border-x border-x-slate-900 border-b border-b-black shadow-xs font-bold"
              : "bg-gradient-to-b from-white to-slate-50 text-slate-800 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Stealth Micro-Peel (50 BTC &bull; 2% Peel &bull; 8 Hops)</span>
        </button>
        <button
          onClick={() => applyPreset("shopper")}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs cursor-pointer active:translate-y-[0.5px] transition-all flex items-center gap-1.5 ${
            initialBtc === 5 && peelPercent === 40 && chainLength === 3
              ? "bg-slate-900 text-white border-t border-t-slate-700 border-x border-x-slate-900 border-b border-b-black shadow-xs font-bold"
              : "bg-gradient-to-b from-white to-slate-50 text-slate-800 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs hover:bg-slate-100"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
          <span>Normal Shopper (5 BTC &bull; 40% Spend &bull; 3 Hops &bull; Safe)</span>
        </button>
      </div>

      {/* Simulator Control Sliders */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Slider 1: Starting Stash */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="starting-balance" className="font-semibold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              Initial Stash (Dirty BTC)
            </label>
            <span className="font-mono font-bold text-slate-950 bg-white border border-slate-300 px-2.5 py-0.5 rounded-md text-[11px] shadow-2xs">
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
            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
            <span>2 BTC</span>
            <span>250 BTC</span>
            <span>500 BTC</span>
          </div>
        </div>

        {/* Slider 2: Peel Fraction (Gum) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="peel-ratio" className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-amber-600" />
              Peel Cut per Step (&quot;Gum&quot;)
            </label>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] shadow-2xs ${
                peelPercent <= 20
                  ? "bg-amber-50 text-amber-900 border border-amber-300"
                  : "bg-emerald-50 text-emerald-900 border border-emerald-300"
              }`}
            >
              {peelPercent.toFixed(1)}% {peelPercent <= 20 ? "(Suspicious: &le;20%)" : "(Normal: &gt;20%)"}
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
            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
            <span>1% (Micro)</span>
            <span className="font-semibold text-amber-700">20% (Cutoff Gate)</span>
            <span>50% (Shopping)</span>
          </div>
        </div>

        {/* Slider 3: Chain Depth (Hops) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/70 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="chain-depth" className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-600" />
              Chain Depth (Consecutive Hops)
            </label>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] shadow-2xs ${
                chainLength >= 5
                  ? "bg-rose-50 text-rose-900 border border-rose-300"
                  : "bg-emerald-50 text-emerald-900 border border-emerald-300"
              }`}
            >
              {chainLength} Hops {chainLength >= 5 ? "(Flagged: ≥5)" : "(Safe: <5)"}
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
              const val = parseInt(e.target.value, 10);
              setChainLength(val);
              setCurrentHopIndex(0);
            }}
            className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
            <span>2 Hops (Normal)</span>
            <span className="font-semibold text-rose-700">5 Hops (Gate)</span>
            <span>12 Hops (Deep Tunnel)</span>
          </div>
        </div>
      </div>

      {/* Simulator Playback & Sub-Navigation */}
      <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-tactical-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer active:translate-y-[0.5px]"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Play Sequence"}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHopIndex(0);
            }}
            className="btn-tactical-secondary text-slate-700 p-1.5 rounded-lg cursor-pointer shadow-2xs active:translate-y-[0.5px]"
            title="Reset to Hop 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            onClick={() => setCurrentHopIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentHopIndex === 0}
            className="btn-tactical-secondary text-slate-800 p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:translate-y-[0.5px]"
            title="Previous Hop"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs font-bold text-slate-900 px-1">
            Viewing Hop #{currentHopIndex + 1} of {chainLength}
          </span>

          <button
            onClick={() => setCurrentHopIndex((prev) => Math.min(hops.length - 1, prev + 1))}
            disabled={currentHopIndex === hops.length - 1}
            className="btn-tactical-secondary text-slate-800 p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:translate-y-[0.5px]"
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
                : "text-slate-700 font-semibold hover:text-slate-900"
            }`}
          >
            Visual Money Trail
          </button>
          <button
            onClick={() => setActiveTab("analogy")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "analogy"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold hover:text-slate-900"
            }`}
          >
            The $100 Bill Story
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "rules"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold hover:text-slate-900"
            }`}
          >
            Detection Rules
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-3 py-1.5 rounded-md cursor-pointer active:translate-y-[0.5px] transition-colors ${
              activeTab === "metrics"
                ? "bg-white text-slate-950 font-bold border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs"
                : "text-slate-700 font-semibold hover:text-slate-900"
            }`}
          >
            Hop Ledger
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="p-4 sm:p-6 space-y-6">
        {activeTab === "topology" && (
          <div className="space-y-6">
            {/* Hop Progress Stepper */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-500">
                <span>CHAIN HOPS (CLICK TO JUMP)</span>
                <span>STEP {currentHopIndex + 1} / {hops.length}</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
                      className={`flex-1 min-w-[90px] p-2.5 rounded-xl text-center cursor-pointer transition-all active:translate-y-[0.5px] ${
                        isSelected
                          ? "bg-gradient-to-b from-slate-900 to-slate-950 text-white border-t border-t-sky-400 border-x border-x-slate-800 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-sky-500/40"
                          : isPast
                          ? "bg-gradient-to-b from-slate-50 to-slate-100/90 text-slate-800 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs hover:bg-slate-100"
                          : "bg-gradient-to-b from-white to-slate-50 text-slate-500 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300/80 shadow-2xs hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono font-bold uppercase">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                        Hop #{h.hopNumber}
                      </div>
                      <div className="text-xs font-mono font-extrabold mt-0.5">
                        {h.forwardAmount.toFixed(1)} <span className="text-[9px] font-normal">BTC</span>
                      </div>
                      <div className={`text-[9.5px] font-mono mt-0.5 font-semibold ${isSelected ? "text-amber-300" : "text-amber-700"}`}>
                        -{h.peeledAmount.toFixed(1)} peel
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Schematic: The 1-In-2-Out Anatomy */}
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-white via-slate-50/40 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.05)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-bold text-slate-900">HOP #{activeHop.hopNumber} MONEY FLOW BREAKDOWN</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 truncate max-w-[200px] sm:max-w-none font-sans">
                    {activeHop.hopNumber === 1 ? "Initial Extortion Stash Split" : `Step ${activeHop.hopNumber} Automated Split`}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                  Network Fee: ~{activeHop.fee} BTC
                </div>
              </div>

              {/* Node Graph Schematic */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 py-2">
                {/* 1. Input Node */}
                <div className="md:col-span-3 p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                      1 WALLET IN
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">100% BALANCE</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 truncate">
                    {activeHop.inputWallet}
                  </div>
                  <div className="text-base font-mono font-extrabold text-slate-950">
                    {activeHop.totalIn.toFixed(2)} BTC
                  </div>
                  <div className="text-[10.5px] text-slate-600 leading-tight">
                    {activeHop.hopNumber === 1
                      ? "Stolen extortion funds ready to be laundered"
                      : `Swept remainder from Hop #${activeHop.hopNumber - 1}`}
                  </div>
                </div>

                {/* Arrow */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="w-px h-6 bg-slate-200 md:hidden" />
                </div>

                {/* 2. Central Transaction Node */}
                <div className="md:col-span-4 p-4 rounded-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-t border-t-slate-700 border-x border-x-slate-900 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.25)] space-y-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-mono tracking-wider uppercase text-slate-300 font-bold">
                    <GitFork className="w-3.5 h-3.5 text-sky-400" />
                    Transaction Split (1-in, 2-out)
                  </div>
                  <div className="font-mono text-xs font-semibold text-slate-200 truncate bg-slate-800/80 p-1.5 rounded border border-slate-700">
                    {activeHop.txid}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
                    <div className="text-left bg-amber-950/40 border border-amber-800/50 p-2 rounded-lg">
                      <span className="text-amber-300/80 text-[9.5px] block font-sans font-medium">Tiny Cut (&le;20%):</span>
                      <span className="text-amber-300 font-extrabold text-xs">{activeHop.peeledPercent}%</span>
                    </div>
                    <div className="text-right bg-emerald-950/40 border border-emerald-800/50 p-2 rounded-lg">
                      <span className="text-emerald-300/80 text-[9.5px] block font-sans font-medium">Big Change (&ge;80%):</span>
                      <span className="text-emerald-300 font-extrabold text-xs">{activeHop.forwardPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="w-px h-6 bg-slate-200 md:hidden" />
                </div>

                {/* 3. Two Outputs */}
                <div className="md:col-span-3 space-y-2.5">
                  {/* Output A: Peeled Amount */}
                  <div className="p-3 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100/70 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-900 uppercase">
                        Output 1: Tiny Peel
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded border border-amber-300">
                        {activeHop.peeledPercent}%
                      </span>
                    </div>
                    <div className="text-sm font-mono font-bold text-amber-950">
                      {activeHop.peeledAmount.toFixed(2)} BTC
                    </div>
                    <div className="text-[10px] text-amber-800 leading-tight">
                      Siphoned off to gift card or accomplice
                    </div>
                  </div>

                  {/* Output B: Forward Change */}
                  <div className="p-3 rounded-xl bg-gradient-to-b from-emerald-50 to-emerald-100/70 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase">
                        Output 2: Forward Change
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-emerald-900 bg-emerald-200/70 px-1.5 py-0.5 rounded border border-emerald-300">
                        {activeHop.forwardPercent}%
                      </span>
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-950">
                      {activeHop.forwardAmount.toFixed(2)} BTC
                    </div>
                    <div className="text-[10px] text-emerald-800 leading-tight">
                      Swept forward into Hop #{activeHop.hopNumber + 1}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Gating Checklist Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">1. Flow Shape Gate</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  1 In / 2 Out
                </div>
                <p className="text-[10.5px] text-slate-600">1 wallet funds exactly 2 output addresses.</p>
              </div>

              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">2. Chain Depth Gate</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {chainLength >= 5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  )}
                  <span className={chainLength >= 5 ? "text-rose-700" : "text-slate-900"}>
                    {chainLength} Hops {chainLength >= 5 ? "(Flagged: ≥5)" : "(Safe: <5)"}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600">Shoppers almost never exceed 1&ndash;2 hops.</p>
              </div>

              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">3. Tiny Peel Ratio</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {activeHop.peeledPercent <= 20.0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  )}
                  <span className={activeHop.peeledPercent <= 20.0 ? "text-amber-800" : "text-slate-900"}>
                    {activeHop.peeledPercent}% {activeHop.peeledPercent <= 20.0 ? "(≤20% suspicious)" : "(>20% safe)"}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600">Tiny spend to bypass bank reporting thresholds.</p>
              </div>

              <div className="p-3.5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">4. Big Change Gate</div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {activeHop.forwardPercent >= 79.5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={activeHop.forwardPercent >= 79.5 ? "text-slate-900" : "text-slate-700"}>
                    {activeHop.forwardPercent}% (&ge;80%)
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600">Bulk balance pushed forward into next hop.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analogy" && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-gradient-to-b from-amber-50/90 to-amber-50/40 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300/80 text-xs text-amber-950 space-y-3 shadow-2xs">
              <div className="font-bold flex items-center gap-2 font-mono text-sm text-amber-900">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                The $100 Bill &amp; The Pack of Gum: Explained in Plain English
              </div>
              <p className="leading-relaxed text-slate-700">
                Imagine a thief robs a bank and steals a crisp <strong>$100 bill</strong>. Because the bank recorded the serial number, the thief cannot deposit it into their personal bank account without getting caught. So what do they do?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-white rounded-xl border-t border-t-white border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                    Step 1: Convenience Store
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    The thief buys a $1 pack of gum with the $100 bill. The cashier gives back <strong>$99 in clean change</strong>.
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border-t border-t-white border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    Step 2: Coffee Shop
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    They take the $99 bill to a café next door, buy another $1 coffee, and walk out with <strong>$98 in clean change</strong>.
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border-t border-t-white border-x border-x-amber-200 border-b border-b-amber-300/70 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Step 3: Repeat 20 Times
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    By doing this 20 times in a row, they convert 1 dirty bill into dozens of untraceable clean coins. <strong>That is a Peeling Chain.</strong>
                  </p>
                </div>
              </div>
              <div className="p-3 bg-white/90 rounded-lg border border-amber-200/90 text-slate-800 leading-relaxed text-[11.5px]">
                <strong>Why innocent people never get caught:</strong> No normal human being walks into 15 stores in a row buying 1 stick of gum just to collect change. Everyday citizens spend 30% to 100% of their balance and stop after 1 or 2 purchases. That is why our sovereign radar requires <strong>5 or more rapid hops</strong> of tiny spends (&le; 20%) and massive change (&ge; 80%).
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs font-mono">1</span>
                  <h4 className="text-sm font-bold text-slate-900">Rule 1: Strict 1-In-2-Out Shape</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every step must have exactly 1 input wallet funding 2 output addresses. One address receives a tiny payment (the peel), and the other address receives the big remainder (the change).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs font-mono">2</span>
                  <h4 className="text-sm font-bold text-slate-900">Rule 2: Asymmetric Split (&le; 20% / &ge; 80%)</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The small spend must be 20% or less of the total balance, and the forwarded change must be 80% or more. Criminals make small spends to stay under anti-money-laundering reporting limits.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs font-mono">3</span>
                  <h4 className="text-sm font-bold text-slate-900">Rule 3: Minimum 5 Consecutive Hops</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The sequence must continue for at least 5 unbroken hops. This is the magic threshold that protects innocent shoppers (who almost never do more than 1 or 2 hops).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs font-mono">4</span>
                  <h4 className="text-sm font-bold text-slate-900">Rule 4: Unbroken Chain of Custody</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The big change output from Hop 1 must become the direct input wallet for Hop 2, and so on. No outside deposits can interrupt the chain.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-b from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-3 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <strong>Teammate Tip for Judges:</strong> When evaluators ask <em>&quot;How do you avoid arresting people who buy electronics?&quot;</em>, you can say: <em>&quot;Because buyers spend 40% to 100% of their money in 1 or 2 hops, while our engine requires at least 5 rapid hops of under-20% peels.&quot;</em>
              </div>
            </div>
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-bold font-mono">Total Peeled Off So Far</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5 font-mono">
                  {totalPeeledSum.toFixed(2)} BTC
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Siphoned across Hops 1 to {activeHop.hopNumber}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-bold font-mono">Remaining Stash</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5 font-mono">
                  {activeHop.forwardAmount.toFixed(2)} BTC
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {((activeHop.forwardAmount / initialBtc) * 100).toFixed(1)}% of original stash left
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-2xs">
                <div className="text-[10px] text-slate-500 uppercase font-bold font-mono">Mining Fees Paid</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                  {(feePerHop * activeHop.hopNumber).toFixed(4)} BTC
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  ~{feePerHop} BTC network fee per hop
                </div>
              </div>
            </div>

            {/* Table of Hops */}
            <div className="border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 text-[10px] uppercase font-mono border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Hop Step</th>
                    <th className="py-2.5 px-3">Wallet In</th>
                    <th className="py-2.5 px-3">Peeled Off (&quot;Gum&quot;)</th>
                    <th className="py-2.5 px-3">Forwarded Change</th>
                    <th className="py-2.5 px-3">System Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {hops.map((h) => (
                    <tr
                      key={h.hopNumber}
                      className={h.hopNumber === activeHop.hopNumber ? "bg-sky-50/80 font-bold border-l-2 border-l-blue-600" : "even:bg-slate-50/50 odd:bg-white"}
                    >
                      <td className="py-2.5 px-3 text-slate-900 font-bold">Hop #{h.hopNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{h.totalIn.toFixed(2)} BTC</td>
                      <td className="py-2.5 px-3 text-amber-700">
                        {h.peeledAmount.toFixed(2)} BTC ({h.peeledPercent}%)
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700">
                        {h.forwardAmount.toFixed(2)} BTC ({h.forwardPercent}%)
                      </td>
                      <td className="py-2.5 px-3">
                        {h.isPeelingQualifying ? (
                          <span className="text-[10px] text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
                            PEELING PATTERN
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            CLEARED (NORMAL)
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
