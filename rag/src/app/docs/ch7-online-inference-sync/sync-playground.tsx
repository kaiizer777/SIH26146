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
    <div className="card-tactical rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header & Scenario Chooser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              INTERACTIVE MEMPOOL SIMULATOR
            </span>
            <span className="text-xs text-slate-400 font-mono">LIVE FORENSIC LAB</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            Mempool Sniffer &amp; Graph Sync Playground
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test how the Watchtower intercepts real Bitcoin transactions before miners write them to stone.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="btn-tactical-primary text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
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
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-300"
                  : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-slate-900">{scenario.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    scenario.verdict === "CRITICAL"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {scenario.verdict}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-sans mt-1 truncate">
                {scenario.type}
              </div>
              <div className="text-[10px] font-mono text-indigo-700 font-semibold mt-1">
                {scenario.amount}
              </div>
            </button>
          );
        })}
      </div>

      {/* Latency & Metrics Bar */}
      <div className="p-3.5 rounded-lg bg-slate-900 text-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-slate-400">Watchtower Sniffer:</span>
          <span className="text-emerald-400 font-bold">28.4ms capture</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Inline AI Model:</span>
          <span className="text-amber-400 font-bold">&lt;3.8ms inference</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-slate-400">Pinboard Sync:</span>
          <span className="text-sky-400 font-bold">Provisional (Zero Lag)</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="text-slate-400">Block Miners:</span>
          <span className="text-purple-300 font-bold">~10 min away</span>
        </div>
      </div>

      {/* Tabs for Explorer */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-mono">
        <button
          onClick={() => setActiveTab("comparison")}
          className={`pb-2 px-3 font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === "comparison"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          10-Min Heist vs. Sub-5ms Intercept
        </button>
        <button
          onClick={() => setActiveTab("visual")}
          className={`pb-2 px-3 font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === "visual"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Detective Pinboard Card
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`pb-2 px-3 font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === "json"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Raw Forensic JSON
        </button>
      </div>

      {/* Tab 1: Comparison Card */}
      {activeTab === "comparison" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Without Watchtower */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900 font-mono">
                <Clock className="w-4 h-4 text-rose-600" />
                WITHOUT WATCHTOWER (TRADITIONAL)
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                10-MINUTE BLIND SPOT
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-rose-200/80 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-500">Methodology:</div>
              <div className="text-xs text-slate-800 font-medium">
                Waits for Bitcoin block confirmation (#892,104) to appear on the public ledger.
              </div>
              <div className="text-[11px] font-mono text-rose-700 font-bold">
                Elapsed Time: 10m 14s (614 seconds)
              </div>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed font-sans">
              <strong className="text-rose-950">Criminal Outcome: </strong>
              {currentScenario.lawEnforcementOutcome.withoutWatchtower}
            </div>
          </div>

          {/* Right: With Watchtower */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 font-mono">
                <Zap className="w-4 h-4 text-emerald-600" />
                WITH NTRO WATCHTOWER (REAL-TIME)
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                SUB-5MS INTERCEPT
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-emerald-200/80 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-500">Methodology:</div>
              <div className="text-xs text-slate-800 font-medium">
                Sniffs transaction packet in Mempool waiting room; inline AI scores threat instantly.
              </div>
              <div className="text-[11px] font-mono text-emerald-700 font-bold">
                Elapsed Time: 0.038s (38 milliseconds)
              </div>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed font-sans">
              <strong className="text-emerald-950">Law Enforcement Outcome: </strong>
              {currentScenario.lawEnforcementOutcome.withWatchtower}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Detective Card */}
      {activeTab === "visual" && (
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Active Mempool Surveillance Ticket
              </span>
              <h4 className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                {currentScenario.sender}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${currentScenario.verdictColor}`}>
                VERDICT: {currentScenario.verdict} ({currentScenario.riskScore * 100}%)
              </span>
              <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                PROVISIONAL
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Transaction Value</div>
              <div className="text-sm font-bold text-slate-900 font-mono">{currentScenario.amount}</div>
              <div className="text-[11px] text-slate-500">Split into peel hop &amp; change</div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Detected Pattern</div>
              <div className="text-xs font-bold text-slate-900">{currentScenario.peelPattern}</div>
              <div className="text-[11px] text-slate-500">Evaluated in under 5ms</div>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950 font-bold">Analogy for Judges: </strong>
              <span className="text-amber-900">{currentScenario.analogy}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: JSON Payload */}
      {activeTab === "json" && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-200">
          <pre className="text-[11px] leading-relaxed">
            {JSON.stringify(currentScenario.jsonPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
