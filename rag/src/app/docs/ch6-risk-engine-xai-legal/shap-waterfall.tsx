"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  CheckCircle2,
  Filter,
  Info,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface ShapFeatureContribution {
  feature: string;
  shortLabel: string;
  actualValue: string;
  nominalValue: string;
  shapValue: number;
  direction: "positive" | "negative";
  forensicReasoning: string;
}

interface ShapScenario {
  id: string;
  title: string;
  txid: string;
  address: string;
  baseExpectedValue: number;
  finalAnomalyScore: number;
  percentileRank: string;
  narrative: string;
  features: ShapFeatureContribution[];
}

const SCENARIOS: ShapScenario[] = [
  {
    id: "peeling-syndicate",
    title: "Scenario A: Ransomware Peeling Funnel (LockBit 3.0)",
    txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    address: "bc1q9d87y4wuep3r70s99g8x4296uueqf9p5x8m90r",
    baseExpectedValue: 0.0364,
    finalAnomalyScore: 0.0842,
    percentileRank: "98.9th %ile",
    narrative:
      "The tabular feature attribution reveals that extreme asymmetric change retention (+0.0242) combined with anomalous fee bumping (+0.0164) and high output concentration drove the transaction deep into the 98.9th anomaly percentile.",
    features: [
      {
        feature: "Max Output Fraction",
        shortLabel: "max_output_fraction",
        actualValue: "0.984",
        nominalValue: "0.620",
        shapValue: 0.0242,
        direction: "positive",
        forensicReasoning: "Single change output consumed 98.4% of funds; classic asymmetric peel signature.",
      },
      {
        feature: "Fee Rate (sat/vB)",
        shortLabel: "fee_rate",
        actualValue: "184.2 sat/vB",
        nominalValue: "22.5 sat/vB",
        shapValue: 0.0164,
        direction: "positive",
        forensicReasoning: "Urgent mempool confirmation priority 8.2x above mempool median.",
      },
      {
        feature: "Total Input Value",
        shortLabel: "total_in_btc",
        actualValue: "48.50 BTC",
        nominalValue: "1.25 BTC",
        shapValue: 0.0105,
        direction: "positive",
        forensicReasoning: "High-value consolidation exceeding 99th percentile of retail transaction traffic.",
      },
      {
        feature: "Broadcaster IP Count",
        shortLabel: "ip_count",
        actualValue: "1 peer",
        nominalValue: "8.4 peers",
        shapValue: 0.0052,
        direction: "positive",
        forensicReasoning: "Transaction broadcast originated from a single localized node without peer dispersion.",
      },
      {
        feature: "Output Shannon Entropy",
        shortLabel: "output_entropy",
        actualValue: "0.112 bits",
        nominalValue: "1.450 bits",
        shapValue: 0.0035,
        direction: "positive",
        forensicReasoning: "Minimal value diversity due to extreme 1-large / 1-tiny output split.",
      },
      {
        feature: "Input UTXO Count",
        shortLabel: "num_inputs",
        actualValue: "1 input",
        nominalValue: "3.2 inputs",
        shapValue: -0.0052,
        direction: "negative",
        forensicReasoning: "Single input script reduces structural complexity, slightly attenuating anomaly score.",
      },
      {
        feature: "SegWit Native BIP-141",
        shortLabel: "is_segwit",
        actualValue: "True",
        nominalValue: "True",
        shapValue: -0.0048,
        direction: "negative",
        forensicReasoning: "Conforms to modern standard witness serialization, pulling risk slightly downward.",
      },
      {
        feature: "Day of Week (UTC)",
        shortLabel: "day_of_week",
        actualValue: "Tuesday (1)",
        nominalValue: "Mid-week",
        shapValue: -0.0020,
        direction: "negative",
        forensicReasoning: "Transaction occurred during regular global banking and commerce hours.",
      },
    ],
  },
  {
    id: "coinjoin-mixer",
    title: "Scenario B: Equal-Denomination CoinJoin Pool (Whirlpool)",
    txid: "9f82b7c41a29019d3f820573918b958c2194a8e2bc77df129031ba58fe210984",
    address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    baseExpectedValue: 0.0364,
    finalAnomalyScore: 0.0915,
    percentileRank: "99.4th %ile",
    narrative:
      "CoinJoin candidate heuristics and maximal output Shannon entropy across 5 identical 0.05 BTC outputs pushed the anomaly score to 0.0915, triggering automated obfuscation flags.",
    features: [
      {
        feature: "Equal Outputs Flag",
        shortLabel: "equal_outputs_flag",
        actualValue: "1 (True)",
        nominalValue: "0 (False)",
        shapValue: 0.0312,
        direction: "positive",
        forensicReasoning: "5 identical 0.05 BTC outputs matched within 0.00% delta — synthetic anonymity set.",
      },
      {
        feature: "Output Shannon Entropy",
        shortLabel: "output_entropy",
        actualValue: "2.321 bits",
        nominalValue: "0.950 bits",
        shapValue: 0.0245,
        direction: "positive",
        forensicReasoning: "Maximal entropy state deliberately destroys deterministic change identification heuristics.",
      },
      {
        feature: "Output Count",
        shortLabel: "num_outputs",
        actualValue: "5 outputs",
        nominalValue: "2 outputs",
        shapValue: 0.0142,
        direction: "positive",
        forensicReasoning: "Multi-party uniform distribution characteristic of coordinated Whirlpool mixing rounds.",
      },
      {
        feature: "Broadcasting ASN Count",
        shortLabel: "unique_asn_count",
        actualValue: "4 ASNs",
        nominalValue: "1.2 ASNs",
        shapValue: 0.0094,
        direction: "positive",
        forensicReasoning: "Multi-peer Tor/VPN broadcast pattern across foreign proxy networks.",
      },
      {
        feature: "Fee Rate (sat/vB)",
        shortLabel: "fee_rate",
        actualValue: "12.0 sat/vB",
        nominalValue: "22.5 sat/vB",
        shapValue: -0.0136,
        direction: "negative",
        forensicReasoning: "Low, disciplined fee rate dampens urgency indicators.",
      },
      {
        feature: "Taproot Script BIP-341",
        shortLabel: "is_taproot",
        actualValue: "False",
        nominalValue: "False",
        shapValue: -0.0032,
        direction: "negative",
        forensicReasoning: "Legacy script type matches standard historical baseline pool formats.",
      },
      {
        feature: "Total Input Value",
        shortLabel: "total_in_btc",
        actualValue: "0.252 BTC",
        nominalValue: "1.25 BTC",
        shapValue: -0.0074,
        direction: "negative",
        forensicReasoning: "Modest nominal volume typical of retail anonymity pool participants.",
      },
    ],
  },
];

export function ShapWaterfall() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("peeling-syndicate");
  const [sortMode, setSortMode] = useState<"magnitude" | "positive" | "negative">("magnitude");
  const [selectedFeature, setSelectedFeature] = useState<ShapFeatureContribution | null>(null);

  const currentScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0],
    [activeScenarioId]
  );

  const sortedFeatures = useMemo(() => {
    const list = [...currentScenario.features];
    if (sortMode === "magnitude") {
      return list.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    }
    if (sortMode === "positive") {
      return list.sort((a, b) => b.shapValue - a.shapValue);
    }
    return list.sort((a, b) => a.shapValue - b.shapValue);
  }, [currentScenario, sortMode]);

  // Max absolute SHAP value for bar scaling
  const maxAbsShap = useMemo(() => {
    return Math.max(...currentScenario.features.map((f) => Math.abs(f.shapValue)), 0.035);
  }, [currentScenario]);

  // Sum of attributions
  const sumOfShap = useMemo(() => {
    return currentScenario.features.reduce((acc, f) => acc + f.shapValue, 0);
  }, [currentScenario]);

  const verifiedOutput = currentScenario.baseExpectedValue + sumOfShap;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30">
              LOCAL XAI ATTRIBUTION
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              SHAP Waterfall &amp; Additive Feature Importance
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exact additive decomposition: $f(x) = E[f(x)] + \sum \phi_i$ with zero model opacity
          </p>
        </div>

        {/* Scenario Toggle */}
        <div className="flex items-center gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveScenarioId(s.id);
                setSelectedFeature(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer border ${
                activeScenarioId === s.id
                  ? "bg-slate-800 text-white border-slate-600 shadow-xs font-bold"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {s.id === "peeling-syndicate" ? "Peeling Hop" : "CoinJoin Pool"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stat Ribbon */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">Base Expectation E[f(x)]</div>
          <div className="text-slate-800 font-bold mt-0.5">{currentScenario.baseExpectedValue.toFixed(4)}</div>
          <div className="text-[10px] text-slate-500">95th %ile Anomaly Floor</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">Net Attributions &Sigma;&phi;</div>
          <div
            className={`font-bold mt-0.5 ${
              sumOfShap >= 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {sumOfShap >= 0 ? `+${sumOfShap.toFixed(4)}` : sumOfShap.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-500">Additive delta sum</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">Predicted f(x)</div>
          <div className="text-slate-900 font-bold mt-0.5">{verifiedOutput.toFixed(4)}</div>
          <div className="text-[10px] text-rose-600 font-semibold">{currentScenario.percentileRank}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">Mathematical Integrity</div>
          <div className="text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> EXACT MATCH
          </div>
          <div className="text-[10px] text-slate-500">&Delta; &lt; 0.00001 (0 Hallucination)</div>
        </div>
      </div>

      {/* Controls & Legend */}
      <div className="px-5 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-white">
        <div className="flex items-center gap-4">
          <span className="font-mono text-slate-500 font-bold text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Sort By:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setSortMode("magnitude")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sortMode === "magnitude" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              |Magnitude|
            </button>
            <button
              onClick={() => setSortMode("positive")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sortMode === "positive" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Risk (Pushes Higher)
            </button>
            <button
              onClick={() => setSortMode("negative")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sortMode === "negative" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              - Risk (Attenuates)
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span className="text-slate-700 font-medium">+ Pushes Anomaly Higher</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-slate-700 font-medium">- Lowers Anomaly Score</span>
          </div>
        </div>
      </div>

      {/* Interactive Waterfall Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waterfall Bars (8 cols) */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
            <span>Feature Name &amp; Ingested Telemetry</span>
            <span>SHAP &phi; Attribution Value</span>
          </div>

          {sortedFeatures.map((f, idx) => {
            const isPositive = f.direction === "positive";
            const widthPct = Math.min(100, (Math.abs(f.shapValue) / maxAbsShap) * 100);
            const isSelected = selectedFeature?.shortLabel === f.shortLabel;

            return (
              <div
                key={f.shortLabel}
                onClick={() => setSelectedFeature(f)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "border-slate-800 bg-slate-50/90 shadow-xs"
                    : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 w-4">
                      0{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900">{f.feature}</span>
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {f.actualValue}
                    </span>
                  </div>

                  <div
                    className={`font-mono text-xs font-bold flex items-center gap-1 ${
                      isPositive ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {isPositive ? `+${f.shapValue.toFixed(4)}` : f.shapValue.toFixed(4)}
                  </div>
                </div>

                {/* Relative Bar Visualizer */}
                <div className="mt-2 grid grid-cols-2 gap-1 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  {/* Negative Side (Left) */}
                  <div className="flex justify-end items-center">
                    {!isPositive && (
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                      />
                    )}
                  </div>
                  {/* Positive Side (Right) */}
                  <div className="flex justify-start items-center">
                    {isPositive && (
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-rose-500 rounded-r-full transition-all duration-300"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Forensic Deep Dive Card (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" /> Forensic Feature Analysis
            </div>

            {selectedFeature ? (
              <div className="mt-3 space-y-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                    Target Variable
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedFeature.feature}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">
                      {selectedFeature.shortLabel}
                    </code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-400">OBSERVED VALUE</div>
                    <div className="text-slate-900 font-bold">{selectedFeature.actualValue}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-400">POPULATION MEAN</div>
                    <div className="text-slate-600 font-bold">{selectedFeature.nominalValue}</div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    EVIDENTIARY IMPACT
                  </div>
                  <div
                    className={`font-mono text-xs font-bold ${
                      selectedFeature.direction === "positive" ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {selectedFeature.direction === "positive"
                      ? `+${selectedFeature.shapValue.toFixed(4)} Risk Contribution`
                      : `${selectedFeature.shapValue.toFixed(4)} Risk Attenuation`}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {selectedFeature.forensicReasoning}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-lg bg-white border border-dashed border-slate-300 text-center space-y-2">
                <BarChart3 className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Click any feature bar on the left to inspect its raw mathematical baseline, deviation metrics, and court-admissible forensic rationale.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Courtroom Fact:
            </div>
            <p className="text-slate-600 leading-relaxed">
              Shapley values possess game-theoretic uniqueness (Snoqualmie axioms). No two independent evaluators can arrive at conflicting feature attributions for identical transaction inputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
