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
  Sparkles,
  Users,
  Layers,
  HelpCircle,
  FileCode,
  ShieldCheck,
  Check,
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
    title: "1. Raw Bitcoin Addresses (Strangers in a Room)",
    badge: "INITIAL STATE // 6 SEPARATE WALLETS",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    modularity: "0.00 (Unclustered)",
    deltaQ: "No Links Yet",
    clustersCount: 6,
    level: 0,
    syncStatus: "Postgres: NULL cluster_id",
    narrative:
      "Six Bitcoin wallets are observed on the blockchain. Without graph analysis, they look like six completely unrelated individuals. In our database, nobody knows who is connected to whom.",
    technicalDetails: [
      "Each wallet starts completely isolated in its own separate bubble.",
      "Zero connections (:CO_SPEND) exist yet; clustering score is 0.00.",
      "The PostgreSQL database holds NULL for the cluster ID column.",
    ],
  },
  {
    step: 2,
    title: "2. The 'Pizza Bill' Rule (:CO_SPEND Connections)",
    badge: "PIZZA BILL CO-SPEND DETECTED",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
    modularity: "0.00 (Edges Formed)",
    deltaQ: "3 Red Strings Tied",
    clustersCount: 6,
    level: 0,
    syncStatus: "Postgres: Ingested raw addrs",
    narrative:
      "We spot multi-input transactions! Wallets W1 and W2 were spent together in Tx_A. W2 and W3 were spent in Tx_B. W4 and W5 spent together in Tx_C. Just like paying for a single pizza with two cards, they must belong to the same person!",
    technicalDetails: [
      "Red strings (:CO_SPEND edges) are drawn between wallets that spent coins together.",
      "The 'Friendship Bracelet' rule (addr1 < addr2) prevents duplicate lines and cuts database clutter by 50%.",
      "Wallet W6 made single-input payments only, so it stays isolated (safe cold-storage wallet).",
    ],
  },
  {
    step: 3,
    title: "3. Spotting the Friend Circles (Louvain Round 1)",
    badge: "SYNDICATE MERGE // ROUND 1",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-300",
    modularity: "0.34 (Clustering Boost)",
    deltaQ: "+0.34 Jump",
    clustersCount: 3,
    level: 1,
    syncStatus: "GDS In-Memory: Active Sweep",
    narrative:
      "Like spotting tight-knit friend groups whispering at a crowded party, Louvain checks which wallets hang out together. W1, W2, and W3 merge into Syndicate #9451. W4 and W5 merge into Syndicate #516.",
    technicalDetails: [
      "Wallets check their direct neighbors and ask: 'Do we belong in the same group?'",
      "W1 and W2 merge immediately, and W2 invites W3 into the syndicate circle.",
      "The number of separate entities drops from 6 down to 3 in a fraction of a millisecond.",
    ],
  },
  {
    step: 4,
    title: "4. Confirming the Crime Syndicates (Convergence)",
    badge: "FINAL COMMUNITIES // STABLE MAP",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
    modularity: "0.46 (Optimal Grouping)",
    deltaQ: "Algorithm Converged",
    clustersCount: 3,
    level: 5,
    syncStatus: "GDS: writeProperty ready",
    narrative:
      "The algorithm tests if moving any wallet to another group would make sense. None do! The syndicate boundaries are locked in. Across all 24,673 wallets in the entire system, 9,794 real-world organizations were discovered in under 7 seconds.",
    technicalDetails: [
      "Scanned 24,673 wallets and 79,240 connections across the full network in 6.95s.",
      "Discovered 9,794 real-world criminal gangs, merchant hubs, and private users.",
      "Each wallet is officially stamped with its permanent 'cluster_id'.",
    ],
  },
  {
    step: 5,
    title: "5. Syncing to the Rapid-Response Vault (PostgreSQL)",
    badge: "READY FOR 10MS INVESTIGATOR SEARCHES",
    badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-300",
    modularity: "0.46 (Fully Synced)",
    deltaQ: "100k Rows Updated",
    clustersCount: 3,
    level: 5,
    syncStatus: "Postgres: 100k rows updated",
    narrative:
      "The identified syndicate labels are sent from Neo4j back to PostgreSQL in 3.43 seconds. Now, when an NTRO investigator searches for any wallet or transaction, the system returns the full criminal syndicate in less than 10 milliseconds!",
    technicalDetails: [
      "Fast bulk COPY streams all cluster tags into PostgreSQL in 3.43 seconds.",
      "Transactions are indexed so investigators never wait for slow graph traversals.",
      "Alert dashboards can filter and sort by criminal syndicate in real time.",
    ],
  },
];

export function ClusteringSimulator() {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(2); // default to Step 3: Round 1 Merge
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
  // W1, W2, W3 (form Ransomware Syndicate 9451)
  // W4, W5 (form Peeling Syndicate 516)
  // W6 (Isolated, Whale Cold Storage 182)
  const nodes = [
    {
      id: "W1",
      addr: "1BoatSLRHt...",
      label: "Ransomware Ingress",
      x: 80,
      y: 70,
      cluster: currentStepIndex >= 2 ? "9451" : "1",
      color: currentStepIndex >= 2 ? "#f59e0b" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #9451 (Ransomware)" : "Wallet 1",
    },
    {
      id: "W2",
      addr: "3J98t1WpEZ...",
      label: "Payout Hub",
      x: 180,
      y: 60,
      cluster: currentStepIndex >= 2 ? "9451" : "2",
      color: currentStepIndex >= 2 ? "#f59e0b" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #9451 (Ransomware)" : "Wallet 2",
    },
    {
      id: "W3",
      addr: "bc1qar0srrr...",
      label: "Cash-Out Exit",
      x: 130,
      y: 140,
      cluster: currentStepIndex >= 2 ? "9451" : "3",
      color: currentStepIndex >= 2 ? "#f59e0b" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #9451 (Ransomware)" : "Wallet 3",
    },
    {
      id: "W4",
      addr: "1dice8EMZ...",
      label: "Peeling Feeder",
      x: 290,
      y: 65,
      cluster: currentStepIndex >= 2 ? "516" : "4",
      color: currentStepIndex >= 2 ? "#10b981" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #516 (Peeling Ring)" : "Wallet 4",
    },
    {
      id: "W5",
      addr: "34xp4vRoCG...",
      label: "Peeling Change",
      x: 350,
      y: 130,
      cluster: currentStepIndex >= 2 ? "516" : "5",
      color: currentStepIndex >= 2 ? "#10b981" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #516 (Peeling Ring)" : "Wallet 5",
    },
    {
      id: "W6",
      addr: "1FeexV6bAH...",
      label: "Independent Whale",
      x: 240,
      y: 165,
      cluster: currentStepIndex >= 2 ? "182" : "6",
      color: currentStepIndex >= 2 ? "#6366f1" : "#64748b",
      clusterName: currentStepIndex >= 2 ? "Cluster #182 (Independent)" : "Wallet 6",
    },
  ];

  return (
    <div className="rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_rgba(15,23,42,0.06)]">
      {/* Tactical Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-slate-100/70 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-sky-600" />
            <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              INTERACTIVE SYNDICATE SIMULATOR
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Spotting Criminal Rings in Real-Time (Louvain Clustering)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step through the simulation to watch isolated Bitcoin addresses merge into unmasked crime syndicates.
          </p>
        </div>

        {/* Playback Controls (No Hover Effects, Elevated Tactile Default) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0}
            className="p-2 rounded-lg border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-400 bg-gradient-to-b from-white to-slate-100 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.08)] active:translate-y-[0.5px] active:shadow-[inset_0_1px_2px_rgba(15,23,42,0.15)]"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-tactical-primary text-white text-xs font-mono font-bold px-3.5 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_6px_rgba(30,64,175,0.3)] active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-300" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-300" />
                <span>Auto-Play</span>
              </>
            )}
          </button>
          <button
            onClick={() => setCurrentStepIndex((prev) => Math.min(SIMULATION_STEPS.length - 1, prev + 1))}
            disabled={currentStepIndex === SIMULATION_STEPS.length - 1}
            className="p-2 rounded-lg border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-400 bg-gradient-to-b from-white to-slate-100 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.08)] active:translate-y-[0.5px] active:shadow-[inset_0_1px_2px_rgba(15,23,42,0.15)]"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            className="p-2 rounded-lg border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-400 bg-gradient-to-b from-white to-slate-100 text-slate-700 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.08)] active:translate-y-[0.5px] active:shadow-[inset_0_1px_2px_rgba(15,23,42,0.15)]"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Progress Tracker (Hover Removed, Tactile Default) */}
      <div className="bg-slate-100/90 border-b border-slate-200 p-2 sm:px-4 flex items-center justify-between overflow-x-auto gap-2.5">
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
              className={`flex-1 min-w-[130px] p-2.5 rounded-lg text-left transition-none border cursor-pointer ${
                isCurrent
                  ? "bg-white border-t border-t-white border-x border-x-sky-200 border-b border-b-sky-400 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(2,132,199,0.15)] ring-1 ring-sky-300/60"
                  : isDone
                  ? "bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.04)]"
                  : "bg-slate-200/50 border border-slate-300/60 text-slate-600 font-medium"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={`font-bold ${isCurrent ? "text-sky-700" : isDone ? "text-slate-700" : "text-slate-500"}`}>
                  STEP 0{s.step}
                </span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                {isCurrent && <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />}
              </div>
              <div
                className={`text-xs font-bold truncate mt-1 ${
                  isCurrent ? "text-slate-950" : isDone ? "text-slate-800" : "text-slate-600"
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
          <div className="relative rounded-xl border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-slate-950 bg-slate-950 p-4 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.5)]">
            {/* Header Overlay */}
            <div className="flex items-center justify-between font-mono text-xs text-slate-400 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-200 font-bold tracking-wide">DIGITAL PINBOARD // LIVE SYNDICATE MAP</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 font-bold border border-slate-700 shadow-xs">
                {currentStep.badge}
              </span>
            </div>

            {/* SVG Visual Canvas */}
            <svg viewBox="0 0 440 230" className="w-full h-auto">
              <defs>
                <pattern id="sim-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="440" height="230" fill="url(#sim-grid)" />

              {/* Cluster Hull Highlights when merged (Step >= 3) */}
              {currentStepIndex >= 2 && (
                <>
                  {/* Cluster #9451 Hull (Amber - Ransomware) */}
                  <polygon
                    points="65,45 195,40 155,165 60,95"
                    fill="rgba(245, 158, 11, 0.16)"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <text x="70" y="34" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                    Syndicate #9451 (Ransomware Gang)
                  </text>

                  {/* Cluster #516 Hull (Emerald - Peeling Syndicate) */}
                  <polygon
                    points="270,45 375,45 375,150 270,95"
                    fill="rgba(16, 185, 129, 0.16)"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <text x="280" y="38" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                    Syndicate #516 (Peeling Ring)
                  </text>
                </>
              )}

              {/* CO_SPEND Edges (Step >= 2) */}
              {currentStepIndex >= 1 && (
                <>
                  {/* W1 <-> W2 */}
                  <line x1="80" y1="70" x2="180" y2="60" stroke="#f59e0b" strokeWidth="2.5" />
                  {/* W2 <-> W3 */}
                  <line x1="180" y1="60" x2="130" y2="140" stroke="#f59e0b" strokeWidth="2.5" />
                  {/* W4 <-> W5 */}
                  <line x1="290" y1="65" x2="350" y2="130" stroke="#10b981" strokeWidth="2.5" />

                  {/* Edge Labels */}
                  <rect x="115" y="55" width="30" height="12" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                  <text x="130" y="64" fill="#fbbf24" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Tx_A
                  </text>

                  <rect x="142" y="94" width="30" height="12" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                  <text x="157" y="103" fill="#fbbf24" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Tx_B
                  </text>

                  <rect x="306" y="90" width="30" height="12" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                  <text x="321" y="99" fill="#6ee7b7" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Tx_C
                  </text>
                </>
              )}

              {/* Render Nodes */}
              {nodes.map((node) => (
                <g key={node.id} className="transition-all duration-300">
                  {/* Outer Pulsing Aura when clustered */}
                  {currentStepIndex >= 2 && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="22"
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1"
                      strokeOpacity="0.45"
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
                    fill="#cbd5e1"
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
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>{currentStep.syncStatus}</span>
              </span>
              <span className="text-emerald-400 font-semibold">
                Status: {currentStep.deltaQ}
              </span>
            </div>
          </div>

          {/* Node Legend Bar */}
          <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.04)]">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              MAP LEGEND:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
              <span className="text-slate-800 font-semibold">Syndicate #9451 (Ransomware)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
              <span className="text-slate-800 font-semibold">Syndicate #516 (Peeling Ring)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
              <span className="text-slate-800 font-semibold">Cluster #182 (Isolated Whale)</span>
            </div>
          </div>

          {/* Step Narrative & Bulletins */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/80 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.04)]">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-600" />
              {currentStep.title}
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {currentStep.narrative}
            </p>

            <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                WHAT IS HAPPENING UNDER THE HOOD:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4 font-sans">
                {currentStep.technicalDetails.map((detail, idx) => (
                  <li key={idx} className="leading-normal">{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Intuitive Syndicate Detection Explainer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-time Metric Cards (4 Cards with 3D Light-From-Above Depth) */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3.5 bg-gradient-to-b from-white to-slate-50/70 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)]">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clustering Quality</div>
              <div className="text-lg font-extrabold text-slate-950 mt-0.5">
                {currentStep.modularity}
              </div>
              <div className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">
                Higher = Tighter Syndicates
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-b from-white to-slate-50/70 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)]">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Distinct Entities</div>
              <div className="text-lg font-extrabold text-slate-950 mt-0.5">
                {currentStep.clustersCount} {currentStep.clustersCount === 6 ? "Wallets" : "Syndicates"}
              </div>
              <div className="text-[10.5px] text-sky-700 font-semibold mt-0.5">
                Collapsed from 6 initial
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-b from-white to-slate-50/70 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)]">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Detection Rounds</div>
              <div className="text-lg font-extrabold text-slate-950 mt-0.5">
                Round {currentStep.level} / 10
              </div>
              <div className="text-[10.5px] text-slate-600 font-semibold mt-0.5">
                Finished in 5 passes
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-b from-white to-slate-50/70 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.05)]">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ledger Sync Time</div>
              <div className="text-lg font-extrabold text-slate-950 mt-0.5">
                3.43s
              </div>
              <div className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">
                100,000 txs updated
              </div>
            </div>
          </div>

          {/* Intuitive Analogy Card (Zero Math Dread!) */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-white space-y-3.5 border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_14px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2.5">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                The &quot;Friend Circles&quot; Intuition
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">NO MATH DREAD</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Instead of complex calculus, think of Louvain Community Detection like walking into a crowded room:
            </p>

            {/* 4 Intuitive Steps with Tactile Contrast */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-slate-950 flex items-start gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-slate-700">
                  1
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Strangers in a Room</div>
                  <div className="text-slate-400 text-[11px] leading-normal font-sans mt-0.5">
                    Everyone starts out alone. Nobody has been grouped with anyone yet.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border-t border-t-amber-900/60 border-x border-x-amber-950 border-b border-b-black flex items-start gap-3 shadow-[inset_0_1px_0_rgba(245,158,11,0.1)]">
                <div className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-amber-800/80">
                  2
                </div>
                <div>
                  <div className="font-bold text-amber-300 text-xs">Spotting Who Spends Together</div>
                  <div className="text-slate-400 text-[11px] leading-normal font-sans mt-0.5">
                    The algorithm looks at transaction receipts. If Wallet A and Wallet B paid for things together, they know each other!
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border-t border-t-sky-900/60 border-x border-x-sky-950 border-b border-b-black flex items-start gap-3 shadow-[inset_0_1px_0_rgba(14,165,233,0.1)]">
                <div className="w-5 h-5 rounded-full bg-sky-950 text-sky-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-sky-800/80">
                  3
                </div>
                <div>
                  <div className="font-bold text-sky-300 text-xs">Joining the Huddle</div>
                  <div className="text-slate-400 text-[11px] leading-normal font-sans mt-0.5">
                    Wallets join the friend group where they spend the most money. If joining a group makes sense, they pull up a chair.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border-t border-t-emerald-900/60 border-x border-x-emerald-950 border-b border-b-black flex items-start gap-3 shadow-[inset_0_1px_0_rgba(16,185,129,0.1)]">
                <div className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5 border border-emerald-800/80">
                  4
                </div>
                <div>
                  <div className="font-bold text-emerald-300 text-xs">The Crime Syndicate is Locked In</div>
                  <div className="text-slate-400 text-[11px] leading-normal font-sans mt-0.5">
                    Once nobody wants to switch groups, the circles are confirmed. Thousands of wallets are now neatly organized into clear syndicates.
                  </div>
                </div>
              </div>
            </div>

            {/* NTRO Superpower Callout */}
            <div className="pt-2.5 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-300 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Why this wins:</strong> Groups 24,673 wallets into syndicates in <strong>6.95s</strong> completely automatically without needing human labels!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
