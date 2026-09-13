"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  Search,
} from "lucide-react";

interface ShapFeatureContribution {
  featureName: string;
  technicalKey: string;
  actualObserved: string;
  normalBaseline: string;
  impactPercentage: number; // e.g. +28 or -5
  impactType: "danger" | "safe";
  plainEnglishReason: string;
}

interface XaiScenario {
  id: string;
  title: string;
  badge: string;
  txid: string;
  wallet: string;
  baseRiskFloor: number; // e.g. 15%
  finalCalculatedRisk: number; // e.g. 91%
  riskVerdict: "CRITICAL" | "HIGH" | "LOW";
  plainEnglishVerdict: string;
  executiveSummary: string;
  features: ShapFeatureContribution[];
}

const SCENARIOS: XaiScenario[] = [
  {
    id: "peeling-syndicate",
    title: "Scenario 1: LockBit Ransomware Peeling Funnel",
    badge: "CRITICAL ALERT (91% DANGER)",
    txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    wallet: "bc1q9d87y4wuep3r70s99g8x4296uueqf9p5x8m90r",
    baseRiskFloor: 15,
    finalCalculatedRisk: 91,
    riskVerdict: "CRITICAL",
    plainEnglishVerdict:
      "Flagged because 85% of funds peeled in 12 seconds to a known high-risk ASN, accompanied by an urgent 8x mempool fee surge.",
    executiveSummary:
      "The AI model does not hide behind a black box. It produces an itemized receipt of guilt: 98.4% of funds were swept into a single change wallet, and the sender paid 8.2x higher fees to speed up the transaction before law enforcement could react.",
    features: [
      {
        featureName: "Peeling Ratio (Asymmetric Change)",
        technicalKey: "max_output_fraction",
        actualObserved: "98.4% of total funds",
        normalBaseline: "62.0% (Retail avg)",
        impactPercentage: 28,
        impactType: "danger",
        plainEnglishReason: "98.4% of funds funneled into 1 stealth change address; textbook peeling chain maneuver.",
      },
      {
        featureName: "Urgent Fee Bumping (Mempool Priority)",
        technicalKey: "fee_rate_sat_vb",
        actualObserved: "184 sat/vB",
        normalBaseline: "22 sat/vB",
        impactPercentage: 19,
        impactType: "danger",
        plainEnglishReason: "Payer offered 8.2x higher fee than normal users to force immediate block inclusion.",
      },
      {
        featureName: "High Transaction Volume Consolidation",
        technicalKey: "total_in_btc",
        actualObserved: "48.50 BTC ($3.1M)",
        normalBaseline: "0.25 BTC ($16K)",
        impactPercentage: 14,
        impactType: "danger",
        plainEnglishReason: "Massive corporate ransom consolidation far above normal individual consumer spending.",
      },
      {
        featureName: "Broadcast from High-Risk Bulletproof Host",
        technicalKey: "peer_asn_reputation",
        actualObserved: "ASN 49870 (Offshore Relay)",
        normalBaseline: "Standard Domestic ISP",
        impactPercentage: 18,
        impactType: "danger",
        plainEnglishReason: "Transaction was relayed via known bulletproof servers that ignore court subpoenas.",
      },
      {
        featureName: "Standard SegWit Address Serialization",
        technicalKey: "is_native_segwit",
        actualObserved: "Native Bech32 SegWit",
        normalBaseline: "Native Bech32 SegWit",
        impactPercentage: -3,
        impactType: "safe",
        plainEnglishReason: "Conforms to standard modern Bitcoin address formatting, slightly reducing risk.",
      },
    ],
  },
  {
    id: "coinjoin-mixer",
    title: "Scenario 2: Whirlpool Equal-Output Privacy Pool",
    badge: "HIGH ANONYMIZATION (79% DANGER)",
    txid: "9f82b7c41a29019d3f820573918b958c2194a8e2bc77df129031ba58fe210984",
    wallet: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    baseRiskFloor: 15,
    finalCalculatedRisk: 79,
    riskVerdict: "HIGH",
    plainEnglishVerdict:
      "Flagged because funds were shattered into 5 mathematically identical 0.05 BTC outputs via 4 Tor proxy nodes to scramble ownership.",
    executiveSummary:
      "The system detected deliberate synthetic anonymity: all outputs have the exact same Satoshi value and maximal entropy, meaning no human buyer or seller can be distinguished without graph de-anonymization.",
    features: [
      {
        featureName: "Equal-Denomination Splitting",
        technicalKey: "equal_outputs_flag",
        actualObserved: "5 identical 0.05 BTC cuts",
        normalBaseline: "Unique variable amounts",
        impactPercentage: 32,
        impactType: "danger",
        plainEnglishReason: "Every recipient received the exact same amount to mathematically destroy coin tracking.",
      },
      {
        featureName: "Maximal Output Value Entropy",
        technicalKey: "output_shannon_entropy",
        actualObserved: "2.32 bits (100% flat)",
        normalBaseline: "0.85 bits",
        impactPercentage: 24,
        impactType: "danger",
        plainEnglishReason: "Mathematical entropy confirms intentional scrambling to conceal the true recipient.",
      },
      {
        featureName: "Distributed Foreign Tor Broadcasts",
        technicalKey: "broadcast_relay_spread",
        actualObserved: "4 Foreign Proxy ASNs",
        normalBaseline: "1 Direct Provider",
        impactPercentage: 11,
        impactType: "danger",
        plainEnglishReason: "Broadcast simultaneously routed across multiple darknet relays to conceal physical location.",
      },
      {
        featureName: "Patient Non-Urgent Miner Fee",
        technicalKey: "fee_rate_sat_vb",
        actualObserved: "12 sat/vB (Slow)",
        normalBaseline: "25 sat/vB",
        impactPercentage: -3,
        impactType: "safe",
        plainEnglishReason: "Sender waited patiently for cheap network fees rather than panic-bumping.",
      },
    ],
  },
  {
    id: "cold-storage-sweep",
    title: "Scenario 3: Routine Corporate Treasury Rebalance",
    badge: "LOW RISK (8% DANGER)",
    txid: "0e3e2357e12f6842f4fca4954453e0174cbc8bc3ac511ac470ab4a6c67c5702f",
    wallet: "bc1qv892019xk93lzkspqw892ks029slks920ks90",
    baseRiskFloor: 15,
    finalCalculatedRisk: 8,
    riskVerdict: "LOW",
    plainEnglishVerdict:
      "Cleared as safe: standard multi-signature vault transfer conducted during Indian business hours with zero mixer hops.",
    executiveSummary:
      "The explainability engine confirms that despite a large balance, the transaction displays clean institutional indicators: predictable fee rates, multi-signature authentication, and zero links to flagged ASNs or illicit seeds.",
    features: [
      {
        featureName: "Multi-Signature Institutional Script",
        technicalKey: "is_multisig_p2wsh",
        actualObserved: "3-of-5 Hardware Vault",
        normalBaseline: "1-of-1 Single Key",
        impactPercentage: -8,
        impactType: "safe",
        plainEnglishReason: "Requires multiple enterprise security keys, characteristic of licensed financial custodians.",
      },
      {
        featureName: "Standard Domestic Telecom ASN",
        technicalKey: "peer_asn_reputation",
        actualObserved: "AS55836 (Airtel India)",
        normalBaseline: "Standard Domestic ISP",
        impactPercentage: -4,
        impactType: "safe",
        plainEnglishReason: "Originates from a reputable domestic commercial network without VPN/proxy obfuscation.",
      },
      {
        featureName: "Standard Business Hour Broadcast",
        technicalKey: "broadcast_hour_utc",
        actualObserved: "14:20 IST (Workday)",
        normalBaseline: "Workday schedule",
        impactPercentage: -2,
        impactType: "safe",
        plainEnglishReason: "Broadcast occurred during normal corporate accounting operating hours.",
      },
      {
        featureName: "High Value Balance Sweep",
        technicalKey: "total_in_btc",
        actualObserved: "15.00 BTC",
        normalBaseline: "0.25 BTC",
        impactPercentage: 7,
        impactType: "danger",
        plainEnglishReason: "Elevated volume creates minor baseline friction, but cleanly offset by safety factors.",
      },
    ],
  },
];

export function ShapWaterfall() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("peeling-syndicate");
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number | null>(0);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0],
    [activeScenarioId]
  );

  const selectedFeature = selectedFeatureIndex !== null ? scenario.features[selectedFeatureIndex] : null;

  return (
    <div className="bg-white rounded-xl border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
              NO BLACK BOX AI
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Explainable AI (SHAP) — Itemized Evidence Receipt
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Every percentage point of danger is itemized in plain English for judges and police
          </p>
        </div>

        {/* Scenario Switcher Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveScenarioId(s.id);
                setSelectedFeatureIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                activeScenarioId === s.id
                  ? "bg-gradient-to-b from-slate-700 to-slate-800 text-white border-t border-t-slate-500 border-x border-x-slate-600 border-b border-b-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_3px_rgba(0,0,0,0.3)] font-semibold"
                  : "bg-slate-800/90 text-slate-200 border-t border-t-slate-700 border-x border-x-slate-700 border-b border-b-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-medium"
              }`}
            >
              {s.id === "peeling-syndicate" ? "LockBit Peeling" : s.id === "coinjoin-mixer" ? "Whirlpool Mixing" : "Clean Cold Storage"}
            </button>
          ))}
        </div>
      </div>

      {/* Human Headline Card (Why it was flagged) */}
      <div className="bg-slate-50 border-b border-slate-200 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border shadow-2xs ${
                scenario.riskVerdict === "CRITICAL"
                  ? "bg-rose-100 text-rose-900 border-rose-300"
                  : scenario.riskVerdict === "HIGH"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
              }`}
            >
              {scenario.badge}
            </span>
            <span className="text-xs font-mono text-slate-600 truncate max-w-[280px]">
              TXID: {scenario.txid.slice(0, 10)}...{scenario.txid.slice(-6)}
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-slate-700 flex items-center gap-2">
            <span>Base Baseline: {scenario.baseRiskFloor}%</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              className={`px-2 py-0.5 rounded shadow-2xs ${
                scenario.riskVerdict === "CRITICAL"
                  ? "bg-rose-600 text-white"
                  : scenario.riskVerdict === "HIGH"
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              Final Risk: {scenario.finalCalculatedRisk}%
            </span>
          </div>
        </div>

        {/* Highlighted Plain-English Verdict Quote */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-white to-slate-50/90 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
            <FileCheck2 className="w-3.5 h-3.5" /> Plain-English Court Statement
          </div>
          <p className="text-sm font-bold text-slate-950 leading-snug">
            &ldquo;{scenario.plainEnglishVerdict}&rdquo;
          </p>
          <p className="text-xs text-slate-700 pt-0.5 leading-relaxed font-normal">
            {scenario.executiveSummary}
          </p>
        </div>
      </div>

      {/* Interactive Feature Waterfall Breakdown */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: The Visual Waterfall Bars (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Itemized Feature Receipt (Click a factor to inspect):
            </h4>
            <span className="text-[11px] font-mono text-slate-500 font-medium">
              Red = Pushes Risk UP &bull; Green = Pulls Risk DOWN
            </span>
          </div>

          <div className="space-y-2.5">
            {scenario.features.map((feature, idx) => {
              const isSelected = selectedFeatureIndex === idx;
              const isDanger = feature.impactType === "danger";
              const barWidth = Math.min(100, Math.abs(feature.impactPercentage) * 3); // Scaled visually

              return (
                <div
                  key={feature.technicalKey}
                  onClick={() => setSelectedFeatureIndex(idx)}
                  className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-b from-slate-50 to-slate-100/90 border-t border-t-slate-300 border-x border-x-slate-300 border-b border-b-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_5px_rgba(15,23,42,0.08)] ring-1 ring-slate-400/40"
                      : "bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      {isDanger ? (
                        <TrendingUp className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      )}
                      {feature.featureName}
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-2xs ${
                        isDanger
                          ? "bg-rose-100 text-rose-900 border border-rose-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {feature.impactPercentage > 0 ? `+${feature.impactPercentage}%` : `${feature.impactPercentage}%`}
                    </span>
                  </div>

                  {/* Horizontal Waterfall Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isDanger ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1.5 font-mono">
                    <span>Observed: <strong className="text-slate-900">{feature.actualObserved}</strong></span>
                    <span>Normal: {feature.normalBaseline}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Feature Deep-Dive Card (5 Cols) */}
        <div className="lg:col-span-5">
          {selectedFeature ? (
            <div className="p-5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.05)] space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                  Judicial Feature Explainer
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border shadow-2xs ${
                    selectedFeature.impactType === "danger"
                      ? "bg-rose-100 text-rose-900 border-rose-300"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300"
                  }`}
                >
                  {selectedFeature.impactType === "danger" ? "Incriminating Factor" : "Exculpatory Factor"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-950 leading-snug">
                  {selectedFeature.featureName}
                </h3>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                  Telemetry Key: <code className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-800 font-semibold">{selectedFeature.technicalKey}</code>
                </div>
              </div>

              <div className="space-y-2 p-3.5 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)] text-xs">
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  How to explain this to a Magistrate:
                </div>
                <p className="text-slate-800 leading-relaxed font-normal">
                  {selectedFeature.plainEnglishReason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Observed in Tx</div>
                  <div className="font-bold text-slate-950 mt-0.5 truncate">
                    {selectedFeature.actualObserved}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Standard Baseline</div>
                  <div className="font-bold text-slate-700 mt-0.5 truncate">
                    {selectedFeature.normalBaseline}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 leading-normal border-t border-slate-200 pt-3">
                <strong className="text-slate-900">Why this is bulletproof:</strong> Lloyd Shapley&rsquo;s Nobel Prize formula guarantees that each feature attribution sums mathematically to the final output score with zero hidden variables.
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
              Select any feature bar on the left to see its courtroom-ready explanation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
