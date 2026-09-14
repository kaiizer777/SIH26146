"use client";

import React, { useState, useEffect } from "react";
import {
  GitMerge,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Database,
  Network,
  Zap,
  ShieldAlert,
  ArrowRight,
  Binary,
  Layers,
  HelpCircle,
  FileCode,
} from "lucide-react";

interface StepData {
  step: number;
  title: string;
  badge: string;
  badgeColor: string;
  modularity: string;
  deltaQ: string;
  clustersCount: number;
  level: number;
  syncStatus: string;
  narrative: string;
  technicalDetails: string[];
}

const SIMULATION_STEPS: StepData[] = [
  {
    step: 1,
    title: "1. Raw Ingestion & Unclustered UTXO State",
    badge: "INITIAL STATE // Q = 0.0000",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    modularity: "0.0000",
    deltaQ: "+0.0000",
    clustersCount: 6,
    level: 0,
    syncStatus: "Postgres: NULL cluster_id",
    narrative:
      "Six independent Bitcoin wallet addresses are observed across disparate mempool transactions. Each address is treated as an isolated entity with its own trivial community assignment ($C_i = i$).",
    technicalDetails: [
      "Every wallet exists in its own singleton community of size 1.",
      "No :CO_SPEND edges are projected yet; modularity Q is zero.",
      "PostgreSQL transactions ledger holds NULL in cluster_id column.",
    ],
  },
  {
    step: 2,
    title: "2. Common-Input Ownership Projection (:CO_SPEND)",
    badge: "CIOH MULTI-INPUT LINKAGE",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    modularity: "0.0000",
    deltaQ: "Edge Formation",
    clustersCount: 6,
    level: 0,
    syncStatus: "Postgres: Ingested raw addrs",
    narrative:
      "Three multi-input transactions are parsed. Tx_A is signed by [W1, W2], Tx_B by [W2, W3], and Tx_C by [W4, W5]. Applying the Satoshi heuristic with addr1 < addr2 generates pairwise :CO_SPEND relationships.",
    technicalDetails: [
      "Pairwise combinations: W1-W2, W2-W3, and W4-W5.",
      "Strict constraint: WHERE w1.address < w2.address prevents 2x edge explosion.",
      "W6 remains completely isolated (single-input transaction only).",
    ],
  },
  {
    step: 3,
    title: "3. Louvain Phase 1: Local Modularity Optimization (ΔQ)",
    badge: "LOCAL COMMUNITY MERGE",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    modularity: "0.3412",
    deltaQ: "+0.3412 (Max Gain)",
    clustersCount: 3,
    level: 1,
    syncStatus: "GDS RAM: Active Sweep",
    narrative:
      "Louvain sweeps each node and calculates modularity delta ΔQ for moving it into its neighbors' communities. Nodes W1, W2, and W3 merge into Super-Cluster #9451; W4 and W5 merge into Cluster #516.",
    technicalDetails: [
      "ΔQ(W1 → C(W2)) = +0.1842 > 0; greedy reassignment triggers immediate merge.",
      "W3 evaluates ΔQ to join {W1, W2}, yielding another +0.1570 modularity gain.",
      "Total communities collapse from 6 to 3 in a single pass through GDS RAM.",
    ],
  },
  {
    step: 4,
    title: "4. Multi-Level Hierarchy Aggregation (Levels 2–5 Convergence)",
    badge: "GLOBAL MAXIMA // Q = 0.4613",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    modularity: "0.4613",
    deltaQ: "ΔQ < 10⁻⁴ (Converged)",
    clustersCount: 3,
    level: 5,
    syncStatus: "GDS: writeProperty ready",
    narrative:
      "GDS builds meta-nodes for each community and iterates up to 5 hierarchy levels until ΔQ < tolerance (0.0001). The global modularity plateau stabilizes at Q = 0.4613 across the entire 24,673 wallet graph.",
    technicalDetails: [
      "Ran 5 hierarchy levels in 6.95 seconds across 24,673 wallets.",
      "9,794 distinct real-world criminal or organizational entities identified.",
      "Final writeProperty 'cluster_id' stamped directly onto all :Wallet nodes.",
    ],
  },
  {
    step: 5,
    title: "5. Relational Bulk Sync to PostgreSQL (3.43 Seconds)",
    badge: "DUAL-DB SYNCHRONIZED",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    modularity: "0.4613",
    deltaQ: "Sync Complete",
    clustersCount: 3,
    level: 5,
    syncStatus: "Postgres: 100k rows updated",
    narrative:
      "A temporary table _wallet_clusters is populated in PostgreSQL via binary COPY, followed by a deterministic UPDATE matching transactions on input_addresses[1]. All 100,000 transactions are indexed in 3.43s.",
    technicalDetails: [
      "Temp table bulk copy via psycopg2.copy_expert executes in O(N) time.",
      "Deterministic anchor: input_addresses[1] guarantees unambiguous entity attribution.",
      "FastAPI alert feeds and filter queries can now query cluster_id via B-Tree index in <10ms.",
    ],
  },
];

export function ClusteringSimulator() {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(2); // default to Step 3: Phase 1 Merge
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= SIMULATION_STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentStep = SIMULATION_STEPS[currentStepIndex];

  // Visual layout for 6 nodes
  // W1, W2, W3 (will form Cluster 9451)
  // W4, W5 (will form Cluster 516)
  // W6 (Isolated, Cluster 182)
  const nodes = [
    {
      id: "W1",
      addr: "1BoatSLRHt...",
      x: 80,
      y: 70,
      cluster: currentStepIndex >= 2 ? "9451" : "1",
      color: currentStepIndex >= 2 ? "#d97706" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #9451 (Ransomware)" : "C1",
    },
    {
      id: "W2",
      addr: "3J98t1WpEZ...",
      x: 180,
      y: 60,
      cluster: currentStepIndex >= 2 ? "9451" : "2",
      color: currentStepIndex >= 2 ? "#d97706" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #9451 (Ransomware)" : "C2",
    },
    {
      id: "W3",
      addr: "bc1qar0srrr...",
      x: 130,
      y: 140,
      cluster: currentStepIndex >= 2 ? "9451" : "3",
      color: currentStepIndex >= 2 ? "#d97706" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #9451 (Ransomware)" : "C3",
    },
    {
      id: "W4",
      addr: "1dice8EMZ...",
      x: 290,
      y: 65,
      cluster: currentStepIndex >= 2 ? "516" : "4",
      color: currentStepIndex >= 2 ? "#059669" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #516 (Peeling Syndicate)" : "C4",
    },
    {
      id: "W5",
      addr: "34xp4vRoCG...",
      x: 350,
      y: 130,
      cluster: currentStepIndex >= 2 ? "516" : "5",
      color: currentStepIndex >= 2 ? "#059669" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #516 (Peeling Syndicate)" : "C5",
    },
    {
      id: "W6",
      addr: "1FeexV6bAH...",
      x: 240,
      y: 165,
      cluster: currentStepIndex >= 2 ? "182" : "6",
      color: currentStepIndex >= 2 ? "#6366f1" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #182 (Whale Cold)" : "C6",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Tactical Header */}
      <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-sky-600" />
            <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              INTERACTIVE GDS ALGORITHM SIMULATOR
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Louvain Modularity &amp; Entity Clustering Explorer
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step through Satoshi&apos;s Common-Input Ownership Heuristic (CIOH) to witness how raw multi-input addresses coalesce into sovereign clusters.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-tactical-primary text-white text-xs font-mono font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Play</span>
              </>
            )}
          </button>
          <button
            onClick={() => setCurrentStepIndex((prev) => Math.min(SIMULATION_STEPS.length - 1, prev + 1))}
            disabled={currentStepIndex === SIMULATION_STEPS.length - 1}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors shadow-xs"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Progress Tracker */}
      <div className="bg-slate-100/70 border-b border-slate-200 p-2 sm:px-4 flex items-center justify-between overflow-x-auto gap-2">
        {SIMULATION_STEPS.map((s, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isDone = idx < currentStepIndex;
          return (
            <button
              key={s.step}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(idx);
              }}
              className={`flex-1 min-w-[130px] p-2 rounded-md text-left transition-all border cursor-pointer ${
                isCurrent
                  ? "bg-white border-slate-300 shadow-xs"
                  : isDone
                  ? "bg-slate-50/70 border-transparent text-slate-600 hover:bg-white"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold">STEP 0{s.step}</span>
                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />}
              </div>
              <div
                className={`text-xs font-semibold truncate mt-0.5 ${
                  isCurrent ? "text-slate-900" : "text-slate-600"
                }`}
              >
                {s.title.split(". ")[1]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Simulation Canvas + Metrics */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic SVG Graph Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 overflow-hidden shadow-inner">
            {/* Header Overlay */}
            <div className="flex items-center justify-between font-mono text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-bold">GDS IN-MEMORY GRAPH CANVAS</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                {currentStep.badge}
              </span>
            </div>

            {/* SVG Visual Canvas */}
            <svg viewBox="0 0 440 230" className="w-full h-auto">
              <defs>
                <pattern id="sim-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="440" height="230" fill="url(#sim-grid)" />

              {/* Cluster Hull Highlights when merged (Step >= 3) */}
              {currentStepIndex >= 2 && (
                <>
                  {/* Cluster #9451 Hull */}
                  <polygon
                    points="70,50 190,45 150,165 65,95"
                    fill="rgba(217, 119, 6, 0.12)"
                    stroke="#d97706"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    rx="12"
                  />
                  <text x="75" y="38" fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    Cluster #9451 (Modularity Target)
                  </text>

                  {/* Cluster #516 Hull */}
                  <polygon
                    points="275,50 375,50 375,150 275,95"
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <text x="285" y="42" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    Cluster #516
                  </text>
                </>
              )}

              {/* CO_SPEND Edges (Step >= 2) */}
              {currentStepIndex >= 1 && (
                <>
                  {/* W1 <-> W2 */}
                  <line x1="80" y1="70" x2="180" y2="60" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="none" />
                  {/* W2 <-> W3 */}
                  <line x1="180" y1="60" x2="130" y2="140" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="none" />
                  {/* W4 <-> W5 */}
                  <line x1="290" y1="65" x2="350" y2="130" stroke="#10b981" strokeWidth="2.5" strokeDasharray="none" />

                  {/* Edge Labels */}
                  <rect x="115" y="55" width="30" height="12" rx="2" fill="#0f172a" />
                  <text x="130" y="64" fill="#fbbf24" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Tx_A
                  </text>

                  <rect x="142" y="94" width="30" height="12" rx="2" fill="#0f172a" />
                  <text x="157" y="103" fill="#fbbf24" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Tx_B
                  </text>

                  <rect x="306" y="90" width="30" height="12" rx="2" fill="#0f172a" />
                  <text x="321" y="99" fill="#6ee7b7" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Tx_C
                  </text>
                </>
              )}

              {/* Render Nodes */}
              {nodes.map((node) => (
                <g key={node.id} className="transition-all duration-500">
                  {/* Outer Pulsing Aura when clustered */}
                  {currentStepIndex >= 2 && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="22"
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1"
                      strokeOpacity="0.4"
                    />
                  )}
                  {/* Main Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="16"
                    fill="#1e293b"
                    stroke={node.color}
                    strokeWidth={currentStepIndex >= 2 ? "2.5" : "1.5"}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.id}
                  </text>
                  {/* Address Snippet Label */}
                  <text
                    x={node.x}
                    y={node.y + 25}
                    fill="#94a3b8"
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.addr}
                  </text>
                </g>
              ))}
            </svg>

            {/* Bottom Status Ribbon */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>{currentStep.syncStatus}</span>
              </span>
              <span className="text-emerald-400 font-semibold">
                Modularity Gain: {currentStep.deltaQ}
              </span>
            </div>
          </div>

          {/* Step Narrative & Technical Bulletins */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-600" />
              {currentStep.title}
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {currentStep.narrative}
            </p>

            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                EXECUTION MECHANICS:
              </span>
              <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4 font-sans">
                {currentStep.technicalDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Modularity Metrics & Mathematics Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-time Metric Cards */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Modularity Score (Q)</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {currentStep.modularity}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                Target: Q &gt; 0.45 (Optimal)
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Distinct Entities</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {currentStep.clustersCount} {currentStep.clustersCount === 6 ? "Wallets" : "Clusters"}
              </div>
              <div className="text-[10px] text-sky-600 font-semibold mt-0.5">
                Collapsed from 6 initial
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">GDS Hierarchy Level</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                Level {currentStep.level} / 10
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Converged at 5 levels
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Postgres Sync Time</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                3.43s
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                24,673 rows via COPY
              </div>
            </div>
          </div>

          {/* Mathematical Rationale Card */}
          <div className="p-4 rounded-lg bg-slate-900 text-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-amber-400" />
                Newman-Girvan Modularity (Q)
              </span>
              <span className="text-[10px] text-slate-400">OBJECTIVE FUNCTION</span>
            </div>

            {/* LaTeX-style formula block */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
              <div>Q = (1 / 2m) * Σ [ A_ij - (k_i * k_j) / (2m) ] * δ(c_i, c_j)</div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Where <code className="text-amber-300 font-mono">A_ij</code> is the adjacency weight between wallets <code className="text-amber-300 font-mono">i</code> and <code className="text-amber-300 font-mono">j</code>, <code className="text-amber-300 font-mono">k_i</code> is node degree, <code className="text-amber-300 font-mono">m</code> is total graph volume, and <code className="text-amber-300 font-mono">δ(c_i, c_j) = 1</code> if both wallets reside in identical community <code className="text-amber-300 font-mono">C</code>.
            </p>

            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="text-slate-200 font-bold flex items-center gap-1 font-mono text-xs">
                <Layers className="w-3 h-3 text-emerald-400" />
                Greedy Phase 1 Gain Formula (ΔQ):
              </div>
              <div className="bg-slate-950 p-2 rounded font-mono text-[10px] text-emerald-300 overflow-x-auto">
                ΔQ = [ (Σ_in + 2k_i,in) / 2m - ((Σ_tot + k_i)/2m)² ] - [ Σ_in / 2m - (Σ_tot/2m)² - (k_i/2m)² ]
              </div>
              <p className="text-[10.5px]">
                Nodes are shifted into neighboring communities if and only if <strong className="text-emerald-300 font-mono">ΔQ &gt; 0</strong>, guaranteeing monotonic global modularity growth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
