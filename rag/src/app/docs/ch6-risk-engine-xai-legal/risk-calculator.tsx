"use client";

import React, { useState, useMemo } from "react";
import {
  Sliders,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Zap,
  TrendingUp,
  Cpu,
  Network,
  Scale,
  Sparkles,
  Info,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface PresetConfig {
  name: string;
  badge: string;
  anomaly: number;
  gnn: number;
  rules: number;
  mixing: boolean;
  desc: string;
}

const PRESETS: PresetConfig[] = [
  {
    name: "Ransomware Syndicate Hub",
    badge: "CRITICAL SYNDICATE",
    anomaly: 0.94,
    gnn: 0.98,
    rules: 0.85,
    mixing: true,
    desc: "Active LockBit/BlackCat ransomware affiliate laundering through high-hop peeling chain and coinjoin clusters with direct seed proximity.",
  },
  {
    name: "Stealth Peeling Cascade",
    badge: "HIGH RISK FLOW",
    anomaly: 0.82,
    gnn: 0.62,
    rules: 0.45,
    mixing: true,
    desc: "Automated peel chain peeling off <0.1 BTC per hop with high change-address retention and irregular fee spikes.",
  },
  {
    name: "Unregulated P2P OTC Desk",
    badge: "MEDIUM WATCHLIST",
    anomaly: 0.54,
    gnn: 0.35,
    rules: 0.20,
    mixing: false,
    desc: "Over-the-counter liquidity provider exhibiting unusual broadcast ASN count and multi-input aggregation without illicit seed adjacency.",
  },
  {
    name: "Compliant Cold Storage",
    badge: "LOW NOMINAL",
    anomaly: 0.06,
    gnn: 0.04,
    rules: 0.00,
    mixing: false,
    desc: "Institutional multi-signature vault with periodic consolidated UTXO sweeps, standard fee rates, and zero mixer interactions.",
  },
];

export function RiskCalculator() {
  const [anomalyScore, setAnomalyScore] = useState<number>(0.84);
  const [gnnRisk, setGnnRisk] = useState<number>(0.92);
  const [rulesBonus, setRulesBonus] = useState<number>(0.65);
  const [isMixing, setIsMixing] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string | null>("Ransomware Syndicate Hub");

  // Weights specified by NTRO Master Spec & Phase 8
  const W_ANOMALY = 0.35;
  const W_GNN = 0.45;
  const W_RULES = 0.15;
  const W_MIXING = 0.05;

  const anomalyComponent = anomalyScore * W_ANOMALY;
  const gnnComponent = gnnRisk * W_GNN;
  const rulesComponent = rulesBonus * W_RULES;
  const mixingComponent = (isMixing ? 1.0 : 0.0) * W_MIXING;

  const rawScore = anomalyComponent + gnnComponent + rulesComponent + mixingComponent;
  const compositeScore = Math.min(1.0, Math.max(0.0, rawScore));

  const verdict = useMemo(() => {
    if (compositeScore >= 0.85) {
      return {
        tier: "CRITICAL",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
        barClass: "bg-rose-600",
        dialColor: "#e11d48",
        statusText: "CRITICAL THREAT (≥ 0.85)",
        action: "Immediate Section 91/102 CrPC asset freeze warrant, FIU-IND STR transmission, and sovereign exchange seizure alert.",
        icon: Flame,
      };
    }
    if (compositeScore >= 0.65) {
      return {
        tier: "HIGH",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
        barClass: "bg-amber-500",
        dialColor: "#f59e0b",
        statusText: "HIGH RISK (≥ 0.65)",
        action: "Enhanced CDD monitoring, live mempool intercept trigger, and 2-hop entity cluster subpoena preparation.",
        icon: AlertTriangle,
      };
    }
    if (compositeScore >= 0.35) {
      return {
        tier: "MEDIUM",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-300",
        barClass: "bg-sky-500",
        dialColor: "#0284c7",
        statusText: "MEDIUM SUSPICION (≥ 0.35)",
        action: "Watchlist cataloging, passive topological surveillance, and periodic batch re-clustering.",
        icon: ShieldAlert,
      };
    }
    return {
      tier: "LOW",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      barClass: "bg-emerald-600",
      dialColor: "#059669",
      statusText: "LOW / NOMINAL (< 0.35)",
      action: "Standard audit log retention; no investigative intervention warranted under current telemetry.",
      icon: ShieldCheck,
    };
  }, [compositeScore]);

  const handlePresetSelect = (preset: PresetConfig) => {
    setActivePreset(preset.name);
    setAnomalyScore(preset.anomaly);
    setGnnRisk(preset.gnn);
    setRulesBonus(preset.rules);
    setIsMixing(preset.mixing);
  };

  const resetToDefault = () => {
    handlePresetSelect(PRESETS[0]);
  };

  // SVG Gauge calculations
  // Gauge arc spanning 180 degrees (from 180deg to 360deg / Math.PI to 2*Math.PI)
  const radius = 64;
  const circumference = Math.PI * radius; // Half-circle
  const strokeDashoffset = circumference - compositeScore * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-sky-400/30">
              INTERACTIVE TOOLKIT
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Live Multi-Factor Composite Risk Calculator
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate dynamic risk evaluation across the four official NTRO Phase 8 weighting matrices
          </p>
        </div>

        <button
          onClick={resetToDefault}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Preset
        </button>
      </div>

      {/* Presets Ribbon */}
      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1 mr-1">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Presets:
        </span>
        {PRESETS.map((preset) => {
          const isSelected = activePreset === preset.name;
          return (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sliders & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-5">
            {/* Factor 1: FT-Transformer Anomaly */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-mono text-xs font-bold">
                    S
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      FT-Transformer Tabular Anomaly (S_anomaly)
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Weight: 35%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      18-feature continuous reconstruction MSE normalized against 95th percentile
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-indigo-950">
                  {anomalyScore.toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={anomalyScore}
                  onChange={(e) => {
                    setAnomalyScore(parseFloat(e.target.value));
                    setActivePreset(null);
                  }}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.00 (Nominal Traffic)</span>
                <span>Weighted Contribution: +{anomalyComponent.toFixed(3)}</span>
                <span>1.00 (Extreme Outlier)</span>
              </div>
            </div>

            {/* Factor 2: Graph Transformer / GNN Risk */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-mono text-xs font-bold">
                    P
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Relational Graph Transformer Risk (P_gnn)
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        Weight: 45%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Multi-head attention propagation seeded from known Ransomwhere clusters
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-sky-950">
                  {gnnRisk.toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={gnnRisk}
                  onChange={(e) => {
                    setGnnRisk(parseFloat(e.target.value));
                    setActivePreset(null);
                  }}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.00 (Unrelated Node)</span>
                <span>Weighted Contribution: +{gnnComponent.toFixed(3)}</span>
                <span>1.00 (Direct Seed Adjacency)</span>
              </div>
            </div>

            {/* Factor 3: Heuristic Rules Bonus */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-mono text-xs font-bold">
                    R
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Deterministic Rule Violations (R_rules)
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Weight: 15%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sum of discrete violations (high velocity, darknet ASN, round-amount peeling)
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-amber-950">
                  {rulesBonus.toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={rulesBonus}
                  onChange={(e) => {
                    setRulesBonus(parseFloat(e.target.value));
                    setActivePreset(null);
                  }}
                  className="w-full accent-amber-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.00 (Zero Violations)</span>
                <span>Weighted Contribution: +{rulesComponent.toFixed(3)}</span>
                <span>1.00 (Max Heuristics Triggered)</span>
              </div>
            </div>

            {/* Factor 4: Mixing / Peeling Flag Toggle */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-mono text-xs font-bold">
                  M
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Structural Peeling / CoinJoin Flag (M_mixing)
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      Weight: 5% (Flat 0.05)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cypher graph traversal identified &ge;5-hop peeling chain or equal-denomination pool
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMixing(!isMixing);
                  setActivePreset(null);
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isMixing ? "bg-purple-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isMixing ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Gauge & Verdict Tier (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Composite Risk Gauge
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                FORMULA: TIER 5 MATRIX
              </span>
            </div>

            {/* Radial Arc Gauge */}
            <div className="flex flex-col items-center justify-center pt-5 pb-2">
              <div className="relative w-48 h-28 flex items-end justify-center">
                <svg className="w-48 h-28 overflow-visible" viewBox="0 0 160 90">
                  {/* Background Arc */}
                  <path
                    d="M 16 80 A 64 64 0 0 1 144 80"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Active Value Arc */}
                  <path
                    d="M 16 80 A 64 64 0 0 1 144 80"
                    fill="none"
                    stroke={verdict.dialColor}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>

                {/* Center Value */}
                <div className="absolute bottom-0 text-center flex flex-col items-center">
                  <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900">
                    {compositeScore.toFixed(3)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Score / 1.000
                  </div>
                </div>
              </div>

              {/* Dynamic Verdict Badge */}
              <div className="mt-4 flex items-center justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 shadow-xs ${verdict.badgeClass}`}
                >
                  <verdict.icon className="w-3.5 h-3.5" />
                  VERDICT: {verdict.tier} ({verdict.statusText})
                </span>
              </div>
            </div>

            {/* Factor Weight Contribution Breakdown Bar */}
            <div className="space-y-2 pt-3">
              <div className="flex justify-between text-[11px] font-mono font-medium text-slate-600">
                <span>Weighted Factor Shares</span>
                <span className="text-slate-900 font-bold">{compositeScore.toFixed(3)} Total</span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${(anomalyComponent / (compositeScore || 0.001)) * 100}%` }}
                  className="bg-indigo-600 transition-all duration-200"
                  title={`Anomaly: +${anomalyComponent.toFixed(3)}`}
                />
                <div
                  style={{ width: `${(gnnComponent / (compositeScore || 0.001)) * 100}%` }}
                  className="bg-sky-500 transition-all duration-200"
                  title={`Graph Risk: +${gnnComponent.toFixed(3)}`}
                />
                <div
                  style={{ width: `${(rulesComponent / (compositeScore || 0.001)) * 100}%` }}
                  className="bg-amber-500 transition-all duration-200"
                  title={`Rules: +${rulesComponent.toFixed(3)}`}
                />
                <div
                  style={{ width: `${(mixingComponent / (compositeScore || 0.001)) * 100}%` }}
                  className="bg-purple-500 transition-all duration-200"
                  title={`Mixing: +${mixingComponent.toFixed(3)}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] font-mono text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>FT-Trans: {(anomalyComponent).toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>RGT Risk: {(gnnComponent).toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Rules: {(rulesComponent).toFixed(3)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Mixer: {(mixingComponent).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Action Box */}
          <div className="p-3.5 rounded-lg bg-white border border-slate-200/90 shadow-xs space-y-1.5">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-slate-600" /> Recommended Statutory Action:
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {verdict.action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
