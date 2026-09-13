"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Radio,
  FileCode,
  Layers,
  Database,
  Search,
  Sparkles,
  Lock,
} from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  type: string;
  amount: string;
  sender: string;
  receiver: string;
  riskScore: number;
  verdict: "CRITICAL" | "HIGH" | "LOW";
  verdictColor: string;
  peelPattern: string;
  analogy: string;
  lawEnforcementOutcome: {
    withoutWatchtower: string;
    withWatchtower: string;
  };
  jsonPayload: Record<string, unknown>;
}

const SCENARIOS: Scenario[] = [
  {
    id: "ransomware-peel",
    name: "Ransomware Peeling Funnel",
    type: "Peeling Chain & Tainted Seed",
    amount: "2.500 BTC ($237,500)",
    sender: "bc1q98xkz402flm5e80d9r3a7w19cv8q0x4ptg9z2j",
    receiver: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa (Change: 2.350 BTC)",
    riskScore: 0.88,
    verdict: "CRITICAL",
    verdictColor: "bg-rose-500 text-white",
    peelPattern: "1 Input -> 2 Outputs (0.15 BTC hop + 2.35 BTC change back to fresh address)",
    analogy:
      "A thief breaking a $100 bill to buy a 50-cent stick of gum, stuffing the $99.50 change into their pocket, and moving to the next store.",
    lawEnforcementOutcome: {
      withoutWatchtower:
        "Investigator waits 10 minutes for block #892,104. By the time it confirms, the thief has already hopped through 4 more wallets and converted funds via an instant non-KYC swap. Case goes cold.",
      withWatchtower:
        "Watchtower sniffs packet in 32ms, AI scores risk 0.88 in 3.8ms, and fires an exchange gateway freeze notice. Funds are quarantined before the first block even mines!",
    },
    jsonPayload: {
      status: "INTERCEPTED_PROVISIONAL",
      mempool_latency_ms: 32.4,
      inference_time_ms: 3.8,
      risk_score: 0.88,
      verdict: "CRITICAL",
      triggered_heuristics: ["PEELING_CHAIN_HOP_DETECTED", "RANSOMWHERE_SEED_MATCH"],
      neo4j_graph_sync: "PINNED_LIVE (Node ID #41829, Status: Provisional)",
      freeze_alert_dispatched: true,
    },
  },
  {
    id: "coinjoin-mixer",
    name: "CoinJoin Mixer Pool Deposit",
    type: "Anonymity Pool Coordinator",
    amount: "0.850 BTC ($80,750)",
    sender: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    receiver: "bc1qs6e0h920k9f2lcmf02mdf934kf9s0dfm2 (Wasabi Coordinator)",
    riskScore: 0.94,
    verdict: "CRITICAL",
    verdictColor: "bg-rose-600 text-white",
    peelPattern: "Uniform output amounts matching Whirlpool/Wasabi 0.05 BTC denominations",
    analogy:
      "Throwing marked ransom bills into a massive casino chip washing machine where 50 people exchange chips simultaneously.",
    lawEnforcementOutcome: {
      withoutWatchtower:
        "Once the block confirms, the transaction is mixed into 50 equal outputs. Taint tracing becomes mathematically diluted.",
      withWatchtower:
        "Watchtower flags the deposit while sitting unconfirmed in the Mempool waiting room. The originating KYC exchange is served a freeze order before mixer pooling completes.",
    },
    jsonPayload: {
      status: "INTERCEPTED_PROVISIONAL",
      mempool_latency_ms: 28.1,
      inference_time_ms: 4.1,
      risk_score: 0.94,
      verdict: "CRITICAL",
      triggered_heuristics: ["COINJOIN_DENOMINATION_EQUALIZER", "HIGH_RISK_POOL_COORDINATOR"],
      neo4j_graph_sync: "PINNED_LIVE (Node ID #41830, Status: Provisional)",
      freeze_alert_dispatched: true,
    },
  },
  {
    id: "merchant-clean",
    name: "Clean Merchant Retail Transfer",
    type: "Standard Payment",
    amount: "0.015 BTC ($1,425)",
    sender: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    receiver: "bc1q7w00k9fk20e9w0fk2mvd0wk2m4k0fk29ckdf92",
    riskScore: 0.06,
    verdict: "LOW",
    verdictColor: "bg-emerald-600 text-white",
    peelPattern: "Ordinary single-recipient invoice settlement with standard miner fee",
    analogy:
      "A customer tapping their debit card at a local supermarket checkout counter.",
    lawEnforcementOutcome: {
      withoutWatchtower:
        "Takes 10 minutes to verify. Zero forensic danger, but consumes manual investigator time if flagged by crude threshold tools.",
      withWatchtower:
        "Watchtower clears the transaction in 3.2ms with Low Risk (0.06). Zero false alarms, zero analyst fatigue.",
    },
    jsonPayload: {
      status: "INTERCEPTED_PROVISIONAL",
      mempool_latency_ms: 25.0,
      inference_time_ms: 3.2,
      risk_score: 0.06,
      verdict: "LOW",
      triggered_heuristics: ["CLEAN_MERCHANT_SIGNATURE"],
      neo4j_graph_sync: "PINNED_LIVE (Node ID #41831, Status: Provisional)",
      freeze_alert_dispatched: false,
    },
  },
];

export function SyncPlayground() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("ransomware-peel");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [hasSimulated, setHasSimulated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"visual" | "comparison" | "json">("comparison");

  const currentScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setHasSimulated(true);
    }, 450);
  };

  return (
    <div className="rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white p-5 sm:p-6 space-y-6 shadow-[0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
      {/* Header & Scenario Chooser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
              INTERACTIVE MEMPOOL SIMULATOR
            </span>
            <span className="text-xs text-slate-500 font-mono font-semibold">LIVE FORENSIC LAB</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Mempool Sniffer &amp; Graph Sync Playground
          </h3>
          <p className="text-xs text-slate-600 font-normal mt-0.5">
            Test how the Watchtower intercepts real Bitcoin transactions before miners write them to stone.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="btn-tactical-primary text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 active:translate-y-[0.5px]"
        >
          {isSimulating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sniffing Mempool...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Mempool Sniff</span>
            </>
          )}
        </button>
      </div>

      {/* Scenario Selection Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {SCENARIOS.map((scenario) => {
          const isSelected = scenario.id === selectedScenarioId;
          return (
            <button
              key={scenario.id}
              onClick={() => {
                setSelectedScenarioId(scenario.id);
                setHasSimulated(true);
              }}
              className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-b from-indigo-50 via-indigo-50 to-indigo-100/70 border-t border-t-indigo-200 border-x border-x-indigo-400 border-b border-b-indigo-500 shadow-[0_2px_6px_rgba(99,102,241,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-indigo-400/60"
                  : "bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-slate-900">{scenario.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    scenario.verdict === "CRITICAL"
                      ? "bg-rose-100 text-rose-800 border-rose-300 shadow-2xs"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs"
                  }`}
                >
                  {scenario.verdict}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-sans mt-1 truncate font-medium">
                {scenario.type}
              </div>
              <div className="text-[10px] font-mono text-indigo-700 font-bold mt-1">
                {scenario.amount}
              </div>
            </button>
          );
        })}
      </div>

      {/* Latency & Metrics Bar */}
      <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border-t border-t-slate-700/80 border-x border-x-slate-800 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.25)] text-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg shadow-2xs">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-slate-300">Watchtower Sniffer:</span>
          <span className="text-emerald-400 font-bold">28.4ms capture</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg shadow-2xs">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">Inline AI Model:</span>
          <span className="text-amber-400 font-bold">&lt;3.8ms inference</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg shadow-2xs">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300">Pinboard Sync:</span>
          <span className="text-sky-400 font-bold">Provisional (Zero Lag)</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-2.5 py-1.5 rounded-lg shadow-2xs">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="text-slate-300">Block Miners:</span>
          <span className="text-purple-300 font-bold">~10 min away</span>
        </div>
      </div>

      {/* Tabs for Explorer (Segmented Tactile Controls) */}
      <div className="p-1 bg-slate-100 rounded-lg border border-slate-200 flex flex-wrap gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab("comparison")}
          className={`px-3.5 py-1.5 font-semibold transition-all cursor-pointer rounded-md ${
            activeTab === "comparison"
              ? "bg-white text-indigo-950 font-bold border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
              : "bg-transparent text-slate-700 font-semibold"
          }`}
        >
          10-Min Heist vs. Sub-5ms Intercept
        </button>
        <button
          onClick={() => setActiveTab("visual")}
          className={`px-3.5 py-1.5 font-semibold transition-all cursor-pointer rounded-md ${
            activeTab === "visual"
              ? "bg-white text-indigo-950 font-bold border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
              : "bg-transparent text-slate-700 font-semibold"
          }`}
        >
          Detective Pinboard Card
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`px-3.5 py-1.5 font-semibold transition-all cursor-pointer rounded-md ${
            activeTab === "json"
              ? "bg-white text-indigo-950 font-bold border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]"
              : "bg-transparent text-slate-700 font-semibold"
          }`}
        >
          Raw Forensic JSON
        </button>
      </div>

      {/* Tab 1: Comparison Card */}
      {activeTab === "comparison" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Without Watchtower */}
          <div className="p-4 rounded-xl border-t border-t-rose-100 border-x border-x-rose-200 border-b border-b-rose-300 bg-gradient-to-b from-rose-50/60 to-rose-100/40 shadow-[0_2px_6px_rgba(244,63,94,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-950 font-mono">
                <Clock className="w-4 h-4 text-rose-600" />
                WITHOUT WATCHTOWER (TRADITIONAL)
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                10-MINUTE BLIND SPOT
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1.5">
              <div className="text-[11px] font-mono text-slate-500 font-semibold">Methodology:</div>
              <div className="text-xs text-slate-800 font-medium leading-relaxed">
                Waits for Bitcoin block confirmation (#892,104) to appear on the public ledger.
              </div>
              <div className="text-[11px] font-mono text-rose-700 font-bold">
                Elapsed Time: 10m 14s (614 seconds)
              </div>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed font-sans font-normal">
              <strong className="text-rose-950 font-bold">Criminal Outcome: </strong>
              {currentScenario.lawEnforcementOutcome.withoutWatchtower}
            </div>
          </div>

          {/* Right: With Watchtower */}
          <div className="p-4 rounded-xl border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 bg-gradient-to-b from-emerald-50/60 to-emerald-100/40 shadow-[0_2px_6px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950 font-mono">
                <Zap className="w-4 h-4 text-emerald-600" />
                WITH NTRO WATCHTOWER (REAL-TIME)
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                SUB-5MS INTERCEPT
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1.5">
              <div className="text-[11px] font-mono text-slate-500 font-semibold">Methodology:</div>
              <div className="text-xs text-slate-800 font-medium leading-relaxed">
                Sniffs transaction packet in Mempool waiting room; inline AI scores threat instantly.
              </div>
              <div className="text-[11px] font-mono text-emerald-700 font-bold">
                Elapsed Time: 0.038s (38 milliseconds)
              </div>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed font-sans font-normal">
              <strong className="text-emerald-950 font-bold">Law Enforcement Outcome: </strong>
              {currentScenario.lawEnforcementOutcome.withWatchtower}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Detective Card */}
      {activeTab === "visual" && (
        <div className="p-5 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                Active Mempool Surveillance Ticket
              </span>
              <h4 className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                {currentScenario.sender}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${currentScenario.verdictColor} shadow-2xs`}>
                VERDICT: {currentScenario.verdict} ({currentScenario.riskScore * 100}%)
              </span>
              <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                PROVISIONAL
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Transaction Value</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{currentScenario.amount}</div>
              <div className="text-[11px] text-slate-600 font-medium">Split into peel hop &amp; change</div>
            </div>

            <div className="p-3.5 bg-white rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Detected Pattern</div>
              <div className="text-xs font-bold text-slate-900">{currentScenario.peelPattern}</div>
              <div className="text-[11px] text-slate-600 font-medium">Evaluated in under 5ms</div>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-b from-amber-50 to-amber-100/50 rounded-lg border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-[0_1px_3px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950 font-bold">Analogy for Judges: </strong>
              <span className="text-amber-950 font-medium">{currentScenario.analogy}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: JSON Payload */}
      {activeTab === "json" && (
        <div className="rounded-xl bg-slate-950 border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)] p-4 font-mono text-xs overflow-x-auto text-slate-200">
          <pre className="text-[11px] leading-relaxed">
            {JSON.stringify(currentScenario.jsonPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
