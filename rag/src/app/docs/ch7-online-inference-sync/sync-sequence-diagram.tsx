"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Activity,
  Layers,
  Sparkles,
  Search,
  Radio,
  Share2,
  Lock,
} from "lucide-react";

interface StepDetail {
  step: number;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  actor: string;
  target: string;
  latency: string;
  analogy: string;
  whatHappens: string;
  detectiveStatus: string;
  technicalDetails: {
    event: string;
    protocol: string;
    dataPoint: string;
  };
}

const WATCHTOWER_STEPS: StepDetail[] = [
  {
    step: 1,
    title: "The Transaction Lands in the Waiting Room",
    subtitle: "Criminal broadcasts transaction to the Bitcoin P2P network",
    badge: "STAGE 1: BROADCAST",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    actor: "Criminal / Sender Wallet",
    target: "Bitcoin Mempool (Waiting Room)",
    latency: "T + 0.0s",
    analogy:
      "Think of a bank robber stepping into a bank lobby before reaching the teller window. The robbery is initiated, but not yet locked in the vault.",
    whatHappens:
      "A 2.50 BTC transfer is broadcast into the decentralized network. It enters the 'Mempool' — the public queue where transactions wait to be picked up by Bitcoin miners. It is unconfirmed and completely vulnerable to interception.",
    detectiveStatus: "Waiting Room populated. Transaction is public but invisible to traditional block explorers.",
    technicalDetails: {
      event: "inv / tx broadcast over Bitcoin P2P gossip protocol",
      protocol: "Bitcoin P2P (Port 8333) -> ZeroMQ rawtx stream",
      dataPoint: "TXID: 8f4e2b9c... • 1 Input (2.50 BTC) -> 2 Outputs (0.15 BTC + 2.35 BTC change)",
    },
  },
  {
    step: 2,
    title: "The Watchtower Sniffs the Packet",
    subtitle: "NTRO listeners intercept the transaction before it settles",
    badge: "STAGE 2: SNIFF & CAPTURE",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
    actor: "NTRO Watchtower Daemon",
    target: "FastAPI Ingestion Pipeline",
    latency: "T + 0.03s (30ms)",
    analogy:
      "An automated airport security scanner reading the ticket the exact second the traveler walks into the queue — no waiting in line required.",
    whatHappens:
      "Our lightweight Watchtower listener captures the raw transaction packet directly from memory. It extracts the sender wallet, receiver addresses, fee rate, and UTXO lineage without waiting for block miners.",
    detectiveStatus: "Target packet acquired! ZeroMQ listener forwards raw payload into AI pipeline.",
    technicalDetails: {
      event: "ZeroMQ rawtx message deserialized in 1.2ms",
      protocol: "Async WebSocket / IPC pipe",
      dataPoint: "Wallet sender: bc1q98xk... • Detected peeling split structure",
    },
  },
  {
    step: 3,
    title: "Under-5ms AI Risk Scoring",
    subtitle: "Neural network & peel heuristics evaluate illicit threat in real-time",
    badge: "STAGE 3: INSTANT AI VERDICT",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    actor: "Inline Inference Scorer",
    target: "Threat Scoring Matrix",
    latency: "T + 0.035s (<5ms)",
    analogy:
      "Facial recognition flagging a wanted fugitive in 4 milliseconds flat while they are still reaching for their wallet.",
    whatHappens:
      "Our FT-Transformer and peeling-chain heuristic rules inspect the transaction. In under 5 milliseconds, the model spots a classic 5-hop peeling chain signature and matches the destination to known Ransomware extortion wallets.",
    detectiveStatus: "CRITICAL ALERT (Risk: 0.88)! Flagged as active Ransomware funnel.",
    technicalDetails: {
      event: "FT-Transformer CPU inference (3.8ms) + Heuristic rule check (0.4ms)",
      protocol: "PyTorch CPU inline model + Redis risk cache",
      dataPoint: "Score: 0.88 • High Anomaly MSE (0.048) • Rule: PEELING_CHAIN_CANDIDATE",
    },
  },
  {
    step: 4,
    title: "Detective Pinboard Updates Live",
    subtitle: "Neo4j graph and analyst dashboard link new nodes smoothly",
    badge: "STAGE 4: LIVE PINBOARD SYNC",
    badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
    actor: "FastAPI Graph Sync Handler",
    target: "Neo4j Detective Pinboard & Frontend",
    latency: "T + 0.08s (80ms)",
    analogy:
      "Like a detective's corkboard where a new polaroid photo and red string pin themselves to the board automatically in real time without dropping any existing pins.",
    whatHappens:
      "The suspicious wallet and its unconfirmed flow are drawn onto the analyst's investigation board with an amber 'Provisional' badge. Enforcement teams receive an alert before the money can move another step.",
    detectiveStatus: "Live alert active on Command Center! Warrant preparation can begin immediately.",
    technicalDetails: {
      event: "Non-blocking Neo4j Cypher merge + SWR cache revalidation",
      protocol: "WebSocket / SSE event push to Command Center UI",
      dataPoint: "Node created: bc1q98xk... • Tag: PROVISIONAL_UNCONFIRMED",
    },
  },
  {
    step: 5,
    title: "Miners Confirm & Seal in Stone",
    subtitle: "Block is mined 10 minutes later; pinboard turns permanent",
    badge: "STAGE 5: FINAL CONFIRMATION",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    actor: "Bitcoin Miners & Blockchain",
    target: "Permanent Sovereign Dossier",
    latency: "T + 10 Minutes (~600s)",
    analogy:
      "The bank finally stamps the ledger in ink 10 minutes later — but the police were already positioned at the exit 9 minutes and 50 seconds ago.",
    whatHappens:
      "A Bitcoin mining pool mines Block #892,104 containing the transaction. The pinboard seamlessly updates the status from 'Provisional' to 'Confirmed & Sealed'. If the transaction had been canceled or replaced (RBF), the pinboard would flag the diversion instantly.",
    detectiveStatus: "Transaction confirmed on-chain! Court-admissible Section 65B dossier sealed.",
    technicalDetails: {
      event: "Block #892,104 mined • Depth = 1 confirmation",
      protocol: "PostgreSQL status update: PROVISIONAL -> PERMANENT",
      dataPoint: "Block height: 892,104 • Confirmed in 582s • Section 65B hash verified",
    },
  },
];

export function SyncSequenceDiagram() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => (prev < WATCHTOWER_STEPS.length ? prev + 1 : 1));
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const step = WATCHTOWER_STEPS[currentStep - 1];

  return (
    <div className="rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-white p-5 sm:p-6 space-y-6 shadow-[0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
      {/* Top Header & Interactive Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
              WATCHTOWER INTERCEPT SEQUENCE
            </span>
            <span className="text-xs text-slate-500 font-mono font-semibold">STEP-BY-STEP WORKFLOW</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">
            How NTRO Catches the Criminal in 5 Milliseconds
          </h3>
          <p className="text-xs text-slate-600 font-normal mt-0.5">
            Follow the transaction from the moment it enters the waiting room to when it is written in stone.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer active:translate-y-[0.5px] transition-all ${
              isPlaying
                ? "bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950 border-t border-t-amber-200 border-x border-x-amber-400 border-b border-b-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(217,119,6,0.15)]"
                : "btn-tactical-primary text-white"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Auto-Play Flow</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(1);
            }}
            className="p-2 rounded-lg bg-gradient-to-b from-white to-slate-100 border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)] text-slate-700 cursor-pointer active:translate-y-[0.5px]"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Step Tracker Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {WATCHTOWER_STEPS.map((s) => {
          const isActive = s.step === currentStep;
          const isPassed = s.step < currentStep;
          return (
            <button
              key={s.step}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStep(s.step);
              }}
              className={`text-left p-2.5 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-b from-indigo-50 via-indigo-50 to-indigo-100/70 border-t border-t-indigo-200 border-x border-x-indigo-400 border-b border-b-indigo-500 shadow-[0_2px_6px_rgba(99,102,241,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-indigo-400/60"
                  : isPassed
                  ? "bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-400 text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]"
                  : "bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-300 border-b border-b-slate-300 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="font-bold">0{s.step}</span>
                {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                {isActive && <Activity className="w-3 h-3 text-indigo-600 animate-pulse" />}
              </div>
              <div
                className={`text-xs mt-1 truncate ${
                  isActive ? "text-indigo-950 font-bold" : isPassed ? "text-slate-900 font-semibold" : "text-slate-700 font-medium"
                }`}
              >
                {s.step === 1 && "1. Waiting Room"}
                {s.step === 2 && "2. Watchtower"}
                {s.step === 3 && "3. AI Verdict"}
                {s.step === 4 && "4. Pinboard Sync"}
                {s.step === 5 && "5. Mined in Stone"}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5 font-medium">{s.latency}</div>
            </button>
          );
        })}
      </div>

      {/* Main Visual Stage Card */}
      <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_3px_10px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] space-y-5">
        {/* Stage Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border shadow-2xs ${step.badgeColor}`}>
              {step.badge}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-indigo-600" />
              Elapsed Time: {step.latency}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-700 flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Actor:</span>
            <span className="font-bold text-slate-950 bg-white px-2.5 py-1 rounded-md border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]">
              {step.actor}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-slate-950 bg-white px-2.5 py-1 rounded-md border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]">
              {step.target}
            </span>
          </div>
        </div>

        {/* Step Title & Plain English Explanation */}
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-slate-950 tracking-tight">{step.title}</h4>
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
            {step.whatHappens}
          </p>
        </div>

        {/* Real-World Analogy Box */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100/40 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-[0_2px_6px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-start gap-3">
          <div className="p-1.5 rounded bg-amber-100 text-amber-800 shrink-0 mt-0.5 border border-amber-200 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900">
              Real-World Analogy (Judge-Friendly)
            </div>
            <p className="text-xs text-amber-950 mt-1 leading-relaxed font-medium">{step.analogy}</p>
          </div>
        </div>

        {/* Live Detective Status Pill */}
        <div className="p-3.5 rounded-xl bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong className="text-slate-950 font-bold">Detective Pinboard State: </strong>
              {step.detectiveStatus}
            </span>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs">
            STEP {currentStep} OF 5
          </span>
        </div>

        {/* Technical Deep Dive (Expandable) */}
        <div className="pt-2 border-t border-slate-200/80">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-xs text-indigo-950 font-bold flex items-center gap-1.5 cursor-pointer bg-gradient-to-b from-indigo-50 to-indigo-100/60 border-t border-t-indigo-200 border-x border-x-indigo-300 border-b border-b-indigo-400 px-3.5 py-1.5 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(99,102,241,0.08)] active:translate-y-[0.5px]"
          >
            <span>{showTechnical ? "Hide Technical Data Trace" : "Show Technical Data Trace (For Engineers / Technical Judges)"}</span>
            <ArrowRight className={`w-3 h-3 transition-transform ${showTechnical ? "rotate-90" : ""}`} />
          </button>

          {showTechnical && (
            <div className="mt-3 p-4 rounded-xl bg-slate-950 border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-black shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.3)] text-slate-200 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5 font-bold">
                <span>SYSTEM EVENT LOG</span>
                <span className="text-emerald-400">STATUS: VERIFIED</span>
              </div>
              <div className="text-[11px] text-sky-400">Event: {step.technicalDetails.event}</div>
              <div className="text-[11px] text-slate-300">Protocol: {step.technicalDetails.protocol}</div>
              <div className="text-[11px] text-emerald-400">Data: {step.technicalDetails.dataPoint}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Prev / Next Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            setIsPlaying(false);
            setCurrentStep((prev) => Math.max(prev - 1, 1));
          }}
          disabled={currentStep === 1}
          className="btn-tactical-secondary text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[0.5px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        <div className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
          Step {currentStep} of {WATCHTOWER_STEPS.length}
        </div>

        <button
          onClick={() => {
            setIsPlaying(false);
            setCurrentStep((prev) => Math.min(prev + 1, WATCHTOWER_STEPS.length));
          }}
          disabled={currentStep === WATCHTOWER_STEPS.length}
          className="btn-tactical-primary text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[0.5px]"
        >
          <span>Next Step</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
