"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Info,
  Layers,
  Crosshair,
  Sliders,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Maximize2,
  RefreshCw,
  BarChart3,
  Flame,
  HelpCircle,
} from "lucide-react";

interface FeatureMeta {
  key: string;
  index: number;
  label: string;
  shortLabel: string;
  category: "transaction" | "structural" | "network" | "temporal";
  description: string;
  nominalRange: string;
}

const ORDERED_FEATURES: FeatureMeta[] = [
  { key: "fee_rate", index: 0, label: "Fee Rate (sat/vB)", shortLabel: "fee_rate", category: "transaction", description: "Ratio of transaction fee to total input value in satoshis", nominalRange: "1–250 sat/vB" },
  { key: "total_in_btc", index: 1, label: "Total In (BTC)", shortLabel: "tot_in", category: "transaction", description: "Sum of all incoming UTXO values consumed in transaction", nominalRange: "0.0001–500 BTC" },
  { key: "total_out_btc", index: 2, label: "Total Out (BTC)", shortLabel: "tot_out", category: "transaction", description: "Sum of all generated outputs excluding mining fee", nominalRange: "0.0001–500 BTC" },
  { key: "num_inputs", index: 3, label: "Input Count", shortLabel: "num_in", category: "structural", description: "Total number of consumed UTXO input script vectors", nominalRange: "1–50 inputs" },
  { key: "num_outputs", index: 4, label: "Output Count", shortLabel: "num_out", category: "structural", description: "Total number of created recipient/change output scripts", nominalRange: "1–100 outputs" },
  { key: "max_output_fraction", index: 5, label: "Max Out Fraction", shortLabel: "max_frac", category: "structural", description: "Dominance ratio of largest single output to total output value", nominalRange: "0.10–0.99" },
  { key: "output_entropy", index: 6, label: "Output Shannon Entropy", shortLabel: "entropy", category: "structural", description: "Shannon information entropy computed across output value distribution", nominalRange: "0.0–4.5 bits" },
  { key: "equal_outputs_flag", index: 7, label: "Equal Outputs Flag", shortLabel: "eq_out", category: "structural", description: "Binary indicator: ≥2 outputs matched within ±1% value delta", nominalRange: "{0, 1}" },
  { key: "coinjoin_candidate_flag", index: 8, label: "CoinJoin Candidate Flag", shortLabel: "coinjoin", category: "structural", description: "Multi-party mixer signature: ≥3 in, ≥3 out with equal-value splits", nominalRange: "{0, 1}" },
  { key: "ip_count", index: 9, label: "IP Observation Count", shortLabel: "ip_cnt", category: "network", description: "Physical IP addresses broadcasting this transaction hash", nominalRange: "1–16 peers" },
  { key: "unique_country_count", index: 10, label: "Country Jurisdiction Count", shortLabel: "country", category: "network", description: "Unique sovereign country codes resolving from peer broadcaster IPs", nominalRange: "1–8 countries" },
  { key: "unique_asn_count", index: 11, label: "ASN Routing Count", shortLabel: "asn_cnt", category: "network", description: "Distinct Autonomous System Numbers routing the peer broadcast", nominalRange: "1–12 ASNs" },
  { key: "hour_of_day", index: 12, label: "Hour of Day (UTC)", shortLabel: "hour", category: "temporal", description: "Coordinated Universal Time hour (00–23) of mempool first-seen", nominalRange: "0–23 UTC" },
  { key: "day_of_week", index: 13, label: "Day of Week (UTC)", shortLabel: "dow", category: "temporal", description: "Day index (0=Monday through 6=Sunday) of block inclusion", nominalRange: "0–6" },
  { key: "is_taproot", index: 14, label: "Taproot Script (P2TR)", shortLabel: "taproot", category: "structural", description: "BIP-341 Taproot Schnorr witness script flag", nominalRange: "{0, 1}" },
  { key: "is_segwit", index: 15, label: "SegWit Script (P2WPKH/WSH)", shortLabel: "segwit", category: "structural", description: "BIP-141 Segregated Witness script standard flag", nominalRange: "{0, 1}" },
  { key: "amt_log", index: 16, label: "Log1p(Total Amount)", shortLabel: "amt_log", category: "transaction", description: "Natural log transformation log(1 + total_in_btc) for scale stabilization", nominalRange: "0.0–12.5" },
  { key: "fee_log", index: 17, label: "Log1p(Fee Value)", shortLabel: "fee_log", category: "transaction", description: "Natural log transformation log(1 + fee_btc) for scale stabilization", nominalRange: "0.0–8.0" },
];

const SCENARIOS = [
  {
    id: "peeling",
    name: "Scenario A: Ransomware Peeling Funnel (LockBit 3.0)",
    badge: "1-IN-2-OUT ASYMMETRY",
    badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
    description: "Syndicate peeling hop: 48.5 BTC input is split into 1.5 BTC peeled cash-out and 47.0 BTC forward change. Strong self-attention cross-links max_output_fraction, total_in_btc, and fee_rate.",
    primaryFeatures: ["max_output_fraction", "total_in_btc", "total_out_btc", "amt_log", "fee_rate"],
    anomalyScore: 0.0842,
    percentile: "98.9th %ile",
    clsAttributions: [
      0.082, 0.124, 0.118, 0.035, 0.042, 0.165, 0.038, 0.012, 0.009, 0.011, 0.015, 0.021, 0.024, 0.018, 0.012, 0.025, 0.142, 0.108,
    ],
  },
  {
    id: "coinjoin",
    name: "Scenario B: Whirlpool Equal-Denomination CoinJoin",
    badge: "ENTROPY EXPLOSION",
    badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    description: "Wasabi/Whirlpool 5-party mixing round: Equal 0.05 BTC outputs create maximal output entropy. Attention spikes across equal_outputs_flag, coinjoin_candidate_flag, and output_entropy.",
    primaryFeatures: ["equal_outputs_flag", "coinjoin_candidate_flag", "output_entropy", "num_inputs", "num_outputs"],
    anomalyScore: 0.1129,
    percentile: "99.7th %ile",
    clsAttributions: [
      0.025, 0.045, 0.048, 0.115, 0.128, 0.032, 0.158, 0.174, 0.182, 0.012, 0.014, 0.016, 0.012, 0.009, 0.010, 0.014, 0.022, 0.014,
    ],
  },
  {
    id: "botnet",
    name: "Scenario C: Multi-ASN Rapid Dispersal Botnet",
    badge: "NETWORK DE-SYNCHRONIZATION",
    badgeColor: "text-sky-700 bg-sky-50 border-sky-200",
    description: "Automated off-peak dispersal across 7 autonomous systems and 5 sovereign jurisdictions. High cross-attention between unique_asn_count, unique_country_count, and hour_of_day.",
    primaryFeatures: ["unique_asn_count", "unique_country_count", "hour_of_day", "fee_rate", "is_segwit"],
    anomalyScore: 0.0631,
    percentile: "96.4th %ile",
    clsAttributions: [
      0.088, 0.032, 0.034, 0.041, 0.045, 0.028, 0.035, 0.011, 0.008, 0.095, 0.145, 0.172, 0.125, 0.042, 0.015, 0.052, 0.032, 0.040,
    ],
  },
];

// Generate deterministic realistic 18x18 attention matrix based on scenario
function buildScenarioMatrix(scenarioId: string): number[][] {
  const n = 18;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  // Baseline diagonal weight (self-attention)
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 0.14 + Math.sin(i * 3.7) * 0.02;
  }

  // Populate realistic baseline correlations
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const baseCorr = 0.02 + 0.015 * Math.sin(i * 1.5 + j * 2.3);
      matrix[i][j] = Math.max(0.005, baseCorr);
    }
  }

  if (scenarioId === "peeling") {
    // Highly correlate max_output_fraction (5), total_in_btc (1), total_out_btc (2), amt_log (16), fee_rate (0)
    const hot = [5, 1, 2, 16, 0];
    for (const a of hot) {
      for (const b of hot) {
        if (a !== b) {
          matrix[a][b] = 0.16 + ((a + b) % 4) * 0.025;
        }
      }
    }
    matrix[5][1] = 0.245;
    matrix[1][5] = 0.238;
    matrix[5][16] = 0.210;
    matrix[16][5] = 0.205;
    matrix[0][5] = 0.175;
  } else if (scenarioId === "coinjoin") {
    // Highly correlate equal_outputs_flag (7), coinjoin_candidate_flag (8), output_entropy (6), num_inputs (3), num_outputs (4)
    const hot = [7, 8, 6, 3, 4];
    for (const a of hot) {
      for (const b of hot) {
        if (a !== b) {
          matrix[a][b] = 0.18 + ((a * b) % 5) * 0.02;
        }
      }
    }
    matrix[7][8] = 0.285;
    matrix[8][7] = 0.280;
    matrix[6][7] = 0.240;
    matrix[6][8] = 0.235;
    matrix[3][4] = 0.195;
  } else {
    // Botnet: unique_asn_count (11), unique_country_count (10), hour_of_day (12), ip_count (9), fee_rate (0)
    const hot = [11, 10, 12, 9, 0];
    for (const a of hot) {
      for (const b of hot) {
        if (a !== b) {
          matrix[a][b] = 0.17 + ((a + b) % 3) * 0.03;
        }
      }
    }
    matrix[11][10] = 0.275;
    matrix[10][11] = 0.270;
    matrix[12][11] = 0.215;
    matrix[9][11] = 0.185;
    matrix[0][12] = 0.160;
  }

  // Softmax normalize each row so rows sum to 1.0
  for (let i = 0; i < n; i++) {
    const sum = matrix[i].reduce((acc, v) => acc + v, 0);
    for (let j = 0; j < n; j++) {
      matrix[i][j] = matrix[i][j] / sum;
    }
  }

  return matrix;
}

export function AttentionMatrix() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("peeling");
  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState<number>(5); // default: max_output_fraction
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<"matrix" | "cls">("matrix");

  const currentScenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  }, [activeScenarioId]);

  const matrix = useMemo(() => {
    return buildScenarioMatrix(activeScenarioId);
  }, [activeScenarioId]);

  const selectedFeature = ORDERED_FEATURES[selectedFeatureIdx];

  // Top cross-attended features for the selected feature row
  const topCrossFeatures = useMemo(() => {
    const row = matrix[selectedFeatureIdx];
    const items = row
      .map((weight, idx) => ({
        feature: ORDERED_FEATURES[idx],
        weight,
        isSelf: idx === selectedFeatureIdx,
      }))
      .sort((a, b) => b.weight - a.weight);

    return items;
  }, [matrix, selectedFeatureIdx]);

  // Color generator for attention weights [0.0, 0.30+]
  const getCellColor = (weight: number, isSelectedRow: boolean, isSelectedCol: boolean) => {
    if (weight < 0.025) return "bg-slate-50 text-slate-400";
    if (weight < 0.055) return "bg-sky-50 text-sky-700";
    if (weight < 0.095) return "bg-sky-100 text-sky-800 font-medium";
    if (weight < 0.14) return "bg-sky-200 text-sky-900 font-semibold";
    if (weight < 0.20) return "bg-indigo-300 text-indigo-950 font-bold";
    return "bg-indigo-600 text-white font-bold shadow-xs";
  };

  return (
    <div className="card-tactical rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      {/* Top Header & Scenario Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-white">
                FT-TRANSFORMER INTERACTION
              </span>
              <span className="text-xs font-mono text-slate-500">
                18 &times; 18 CROSS-FEATURE SELF-ATTENTION
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Tabular Feature Attention Heatmap &amp; Attribution Simulator
            </h3>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Explore how the multi-head self-attention encoder dynamically redistributes weights between
              heterogeneous transaction features without requiring computationally expensive SHAP perturbation passes.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs self-start flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setDisplayMode("matrix")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                displayMode === "matrix"
                  ? "tab-tactical-active text-slate-900 font-bold border border-slate-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              18 &times; 18 Self-Attention
            </button>
            <button
              onClick={() => setDisplayMode("cls")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                displayMode === "cls"
                  ? "tab-tactical-active text-slate-900 font-bold border border-slate-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              [CLS] Attribution
            </button>
          </div>
        </div>

        {/* Tactical Scenario Selector Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-200/80">
          <div className="text-[11px] font-mono uppercase font-bold text-slate-500 mb-2">
            Select Live Forensic Synthesis Scenario:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SCENARIOS.map((sc) => {
              const isSelected = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    setActiveScenarioId(sc.id);
                    if (sc.id === "peeling") setSelectedFeatureIdx(5);
                    else if (sc.id === "coinjoin") setSelectedFeatureIdx(7);
                    else setSelectedFeatureIdx(11);
                  }}
                  className={`text-left p-2.5 rounded-lg border transition-all relative ${
                    isSelected
                      ? "bg-white border-slate-900 shadow-xs ring-1 ring-slate-900/10"
                      : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {sc.name.split(":")[1]?.trim() || sc.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    MSE Loss: <strong className="text-slate-800">{sc.anomalyScore}</strong> ({sc.percentile})
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Work Area */}
      <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT / CENTER: The Heatmap Matrix or CLS Attribution Bar */}
        <div className="xl:col-span-8 space-y-4">
          {displayMode === "matrix" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-600 pb-1">
                <span>
                  ATTENTION HEADS: <strong>N=4</strong> &bull; D_MODEL: <strong>32</strong> &bull; LAYER: <strong>2 (Final Pre-LN)</strong>
                </span>
                <span className="text-[11px] text-slate-400">
                  Click row to isolate cross-attention profile
                </span>
              </div>

              {/* Mobile Scroll Hint */}
              <div className="sm:hidden flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 pb-1">
                <span>Swipe horizontally to view all 18 features &harr;</span>
                <span>18 &times; 18 Heatmap</span>
              </div>

              {/* Scrollable Matrix Container */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 overflow-x-auto">
                <div className="min-w-[620px]">
                  {/* Top Column Labels */}
                  <div className="flex items-end pl-24 mb-1">
                    {ORDERED_FEATURES.map((feat, cIdx) => {
                      const isHovered = hoveredCell?.col === cIdx;
                      const isSelected = selectedFeatureIdx === cIdx;
                      return (
                        <div
                          key={feat.key}
                          className={`flex-1 text-center text-[9px] font-mono truncate px-0.5 transition-colors ${
                            isSelected
                              ? "font-bold text-slate-900"
                              : isHovered
                              ? "text-sky-600 font-bold"
                              : "text-slate-400"
                          }`}
                          title={feat.label}
                        >
                          {feat.shortLabel}
                        </div>
                      );
                    })}
                  </div>

                  {/* Matrix Rows */}
                  <div className="space-y-1">
                    {matrix.map((row, rIdx) => {
                      const rowFeat = ORDERED_FEATURES[rIdx];
                      const isRowSelected = selectedFeatureIdx === rIdx;
                      return (
                        <div key={rowFeat.key} className="flex items-center">
                          {/* Row Header Label */}
                          <button
                            onClick={() => setSelectedFeatureIdx(rIdx)}
                            className={`w-24 text-right pr-2 text-[10px] font-mono truncate transition-colors flex items-center justify-end gap-1 ${
                              isRowSelected
                                ? "font-bold text-slate-950 underline decoration-slate-900 decoration-2"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title={`${rowFeat.label} (Click to inspect)`}
                          >
                            {isRowSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 flex-shrink-0" />
                            )}
                            <span className="truncate">{rowFeat.shortLabel}</span>
                          </button>

                          {/* Row Cells */}
                          <div className="flex-1 flex gap-1">
                            {row.map((val, cIdx) => {
                              const isHovered =
                                hoveredCell?.row === rIdx && hoveredCell?.col === cIdx;
                              const isColSelected = selectedFeatureIdx === cIdx;
                              const colorClass = getCellColor(
                                val,
                                isRowSelected,
                                isColSelected
                              );

                              return (
                                <button
                                  key={`${rIdx}-${cIdx}`}
                                  onMouseEnter={() =>
                                    setHoveredCell({ row: rIdx, col: cIdx })
                                  }
                                  onMouseLeave={() => setHoveredCell(null)}
                                  onClick={() => setSelectedFeatureIdx(rIdx)}
                                  className={`flex-1 h-6 rounded text-[9px] font-mono flex items-center justify-center transition-all relative ${colorClass} ${
                                    isHovered
                                      ? "ring-2 ring-slate-900 z-10 scale-110"
                                      : isRowSelected
                                      ? "ring-1 ring-slate-400"
                                      : ""
                                  }`}
                                  title={`${rowFeat.label} → ${ORDERED_FEATURES[cIdx].label}: α = ${val.toFixed(4)}`}
                                >
                                  {val >= 0.12 ? (val * 100).toFixed(0) : ""}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Color Gradient Scale Legend */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span>Weight Scale:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" title="< 0.025" />
                    <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-200" title="0.05" />
                    <span className="w-3.5 h-3.5 rounded bg-sky-200 border border-sky-300" title="0.10" />
                    <span className="w-3.5 h-3.5 rounded bg-indigo-300 border border-indigo-400" title="0.15" />
                    <span className="w-3.5 h-3.5 rounded bg-indigo-600 text-white" title=">= 0.20" />
                  </div>
                  <span className="text-[10px] text-slate-400">(0.00 &rarr; 0.28+)</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Values displayed on cells &ge; 12% weight
                </div>
              </div>
            </div>
          ) : (
            /* CLS Attribution Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-600 pb-1">
                <span>
                  NATIVE [CLS] ATTRIBUTION VECTOR &bull; <strong>&alpha;_cls &in; &Ropf;^18</strong>
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Zero Compute Overhead (0.0ms)
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Because the reconstruction head strictly projects the final <strong>[CLS]</strong> token output back into
                the 18 feature dimensions, the attention weights from the [CLS] query to each feature key (row 0 of the full 19&times;19 matrix)
                provide <em>instantaneous native feature attribution</em> without running GradientExplainer or perturbing inputs.
              </p>

              <div className="space-y-2 border border-slate-200 rounded-lg p-4 bg-slate-50/60">
                {ORDERED_FEATURES.map((feat, idx) => {
                  const val = currentScenario.clsAttributions[idx] || 0.02;
                  const isTop = currentScenario.primaryFeatures.includes(feat.key);
                  const widthPct = Math.min(100, Math.round((val / 0.20) * 100));

                  return (
                    <div
                      key={feat.key}
                      onClick={() => setSelectedFeatureIdx(idx)}
                      className={`p-2 rounded-md transition-all cursor-pointer ${
                        selectedFeatureIdx === idx
                          ? "bg-white border border-slate-900 shadow-xs"
                          : "hover:bg-white/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="flex items-center gap-1.5 font-medium text-slate-900">
                          {feat.index}. {feat.label}
                          {isTop && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              TRIGGER PEAK
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-slate-800">
                          &alpha; = {(val * 100).toFixed(1)}% ({val.toFixed(3)})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isTop ? "bg-indigo-600" : "bg-sky-500"
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Explanatory Banner */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-slate-900">Engineering Fact:</strong> In Gorishniy et al. (NeurIPS 2021),
              each feature token interacts pairwise with all other feature tokens. Unlike tree-based models or standard dense MLPs,
              if an adversary attempts to conceal a peeling chain by altering the fee, the multi-head attention mechanism maintains high
              attribution via joint correlation with <code className="text-slate-800 font-mono">max_output_fraction</code> and <code className="text-slate-800 font-mono">total_in_btc</code>.
            </div>
          </div>
        </div>

        {/* RIGHT: Selected Feature Inspector Card */}
        <div className="xl:col-span-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4 xl:sticky xl:top-20">
            {/* Header of Inspector */}
            <div className="border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500">
                <span>INSPECTING TOKEN #{selectedFeature.index}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedFeature.category}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                {selectedFeature.label}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {selectedFeature.description}
              </p>
            </div>

            {/* Quick Metrics of this feature */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Nominal Range</div>
                <div className="font-semibold text-slate-800 mt-0.5">{selectedFeature.nominalRange}</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">[CLS] Saliency</div>
                <div className="font-semibold text-indigo-700 mt-0.5">
                  {(currentScenario.clsAttributions[selectedFeatureIdx] * 100).toFixed(1)}% weight
                </div>
              </div>
            </div>

            {/* Top Cross-Attention Partners */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-600 flex items-center justify-between">
                <span>Top Cross-Attended Tokens:</span>
                <span className="text-[10px] text-slate-400 font-normal">Layer 2 MHSA</span>
              </div>

              <div className="space-y-1.5">
                {topCrossFeatures.slice(0, 4).map((item, rank) => {
                  const pct = (item.weight * 100).toFixed(1);
                  return (
                    <div
                      key={item.feature.key}
                      onClick={() => setSelectedFeatureIdx(item.feature.index)}
                      className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                        item.isSelf
                          ? "bg-slate-50/80 border-slate-200 text-slate-700"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="text-slate-400 font-normal">#{rank + 1}</span>
                          {item.feature.label}
                          {item.isSelf && (
                            <span className="text-[9px] px-1 rounded bg-slate-200 text-slate-600 font-normal">
                              SELF
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-slate-900">&alpha; = {pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.isSelf ? "bg-slate-400" : "bg-sky-600"
                          }`}
                          style={{ width: `${Math.min(100, item.weight * 300)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Forensic Context Interpretation Box */}
            <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-lg text-xs space-y-1.5">
              <div className="font-bold text-sky-950 flex items-center gap-1.5 font-mono text-[11px] uppercase">
                <Crosshair className="w-3.5 h-3.5 text-sky-700" />
                Forensic Saliency Deduction:
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                {selectedFeature.key === "max_output_fraction"
                  ? "Dominant output fraction cross-attending with Total In (BTC) indicates a peeling chain: >90% of value is redirected to a single change address while <10% is peeled off."
                  : selectedFeature.key === "equal_outputs_flag" || selectedFeature.key === "coinjoin_candidate_flag"
                  ? "Equal-output flags strongly co-attend with Output Entropy, confirming multi-party CoinJoin mixing coordination (Wasabi/Whirlpool fingerprint)."
                  : selectedFeature.key === "unique_asn_count" || selectedFeature.key === "unique_country_count"
                  ? "Multi-jurisdiction IP/ASN entropy cross-attends with Hour of Day, signalling automated script syndication across disparate autonomous systems."
                  : `High bidirectional self-attention between ${selectedFeature.label} and companion tokens captures non-linear tabular co-variance directly in continuous latent space.`}
              </p>
            </div>

            {/* Reset / Action CTA */}
            <button
              onClick={() => {
                const sc = SCENARIOS.find((s) => s.id === activeScenarioId);
                const leadKey = sc?.primaryFeatures[0];
                const leadFeat = ORDERED_FEATURES.find((f) => f.key === leadKey);
                setSelectedFeatureIdx(leadFeat ? leadFeat.index : 0);
              }}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              Focus Dominant Anomaly Anchor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
