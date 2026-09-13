"use client";

import React, { useState, useMemo } from "react";
import {
  Sliders,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  RefreshCw,
  Zap,
  Globe,
  Cpu,
  Binary,
  Layers,
  Info,
  CheckCircle2,
  Scale,
  ArrowRight,
} from "lucide-react";

interface PresetConfig {
  name: string;
  badge: string;
  heuristics: number; // 0 to 100%
  aiModel: number;    // 0 to 100%
  geoip: number;      // 0 to 100%
  desc: string;
  realWorldContext: string;
}

const PRESETS: PresetConfig[] = [
  {
    name: "Ransomware Cash-Out",
    badge: "CRITICAL SYNDICATE",
    heuristics: 92,
    aiModel: 96,
    geoip: 85,
    desc: "Active LockBit 3.0 laundering funnel: 14-hop peeling chain, extreme fee bumping, and direct ties to sanctioned wallet clusters.",
    realWorldContext: "Traced to an offshore bulletproof server routing stolen hospital ransom funds.",
  },
  {
    name: "Fast Peeling Cascade",
    badge: "HIGH RISK FLOW",
    heuristics: 84,
    aiModel: 72,
    geoip: 65,
    desc: "Rapid automated split transferring 90% of funds to one wallet while peeling tiny crumbs every 15 seconds.",
    realWorldContext: "Commonly used by darknet vendors to slowly cash out without raising bank red flags.",
  },
  {
    name: "Unregulated P2P OTC Desk",
    badge: "MEDIUM WATCHLIST",
    heuristics: 48,
    aiModel: 52,
    geoip: 55,
    desc: "High-volume peer-to-peer crypto broker pooling dozens of unrelated transfers through foreign proxy nodes.",
    realWorldContext: "Not directly malicious yet, but flagged for passive surveillance and tax reporting audits.",
  },
  {
    name: "Institutional Cold Storage",
    badge: "LOW / NOMINAL",
    heuristics: 5,
    aiModel: 8,
    geoip: 10,
    desc: "Routine multi-signature treasury transfer between verified institutional vaults during regular working hours.",
    realWorldContext: "Standard corporate treasury rebalancing with zero mixing or suspicious routing.",
  },
];

export function RiskCalculator() {
  const [heuristicsScore, setHeuristicsScore] = useState<number>(92);
  const [aiModelScore, setAiModelScore] = useState<number>(96);
  const [geoipScore, setGeoipScore] = useState<number>(85);
  const [activePreset, setActivePreset] = useState<string | null>("Ransomware Cash-Out");

  // Official hackathon 3-pillar formula:
  // Heuristics (40%) + Dual Transformer AI (40%) + GeoIP & Blacklists (20%)
  const W_HEURISTICS = 0.40;
  const W_AI = 0.40;
  const W_GEOIP = 0.20;

  const heuristicsContribution = (heuristicsScore * W_HEURISTICS);
  const aiContribution = (aiModelScore * W_AI);
  const geoipContribution = (geoipScore * W_GEOIP);

  const totalDangerScore = Math.min(100, Math.max(0, Math.round(heuristicsContribution + aiContribution + geoipContribution)));

  const verdict = useMemo(() => {
    if (totalDangerScore >= 85) {
      return {
        tier: "CRITICAL",
        rangeText: "85% – 100%",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
        barClass: "bg-rose-600",
        dialColor: "#e11d48",
        statusText: "Immediate Threat & Seizure",
        courtAction: "Issue urgent Section 91/102 CrPC asset freeze order to registered Indian crypto exchanges and notify FIU-IND.",
        summaryExplanation: "Direct connection to criminal syndicate wallets, automated peeling scripts, and high-risk foreign bulletproof hosting.",
        icon: Flame,
      };
    }
    if (totalDangerScore >= 65) {
      return {
        tier: "HIGH",
        rangeText: "65% – 84%",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
        barClass: "bg-amber-500",
        dialColor: "#f59e0b",
        statusText: "Active Laundering Investigation",
        courtAction: "Flag wallet for live mempool monitoring, subpoena KYC records from domestic on-ramps, and prepare Section 65B dossier.",
        summaryExplanation: "Heavy peeling chain behavior and suspicious neural network patterns suggest active funds obfuscation.",
        icon: AlertTriangle,
      };
    }
    if (totalDangerScore >= 35) {
      return {
        tier: "MEDIUM",
        rangeText: "35% – 64%",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-300",
        barClass: "bg-sky-500",
        dialColor: "#0284c7",
        statusText: "Passive Surveillance Watchlist",
        courtAction: "Log transaction into national cyber-intelligence index; periodically re-cluster as new blocks arrive.",
        summaryExplanation: "Unusual transaction volume or offshore IP broadcast, but without confirmed criminal seed connections.",
        icon: ShieldAlert,
      };
    }
    return {
      tier: "LOW",
      rangeText: "0% – 34%",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      barClass: "bg-emerald-600",
      dialColor: "#059669",
      statusText: "Clean / Nominal Traffic",
      courtAction: "Standard audit trail retention; no intervention or court orders needed.",
      summaryExplanation: "Routine personal, miner, or corporate transfer conforming to normal legal transaction behavior.",
      icon: ShieldCheck,
    };
  }, [totalDangerScore]);

  const handlePresetSelect = (preset: PresetConfig) => {
    setActivePreset(preset.name);
    setHeuristicsScore(preset.heuristics);
    setAiModelScore(preset.aiModel);
    setGeoipScore(preset.geoip);
  };

  const resetToDefault = () => {
    handlePresetSelect(PRESETS[0]);
  };

  // Radial semi-circle gauge math
  const radius = 64;
  const circumference = Math.PI * radius; // 180-degree half-circle
  const strokeDashoffset = circumference - (totalDangerScore / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Top Banner with Clear Non-Technical Heading */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-sky-400/30">
              LIVE SIMULATION
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Composite Risk Score Calculator (0 to 100%)
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            See how the system merges 3 core ingredients into one unmistakable danger rating
          </p>
        </div>

        <button
          onClick={resetToDefault}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset to Sample Syndicate
        </button>
      </div>

      {/* Preset Scenario Selector */}
      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1 mr-1">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Choose a Real-Life Scenario:
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

      {/* Active Scenario Description */}
      {activePreset && (
        <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 text-xs text-slate-700 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-blue-950">Scenario Context: </span>
            {PRESETS.find((p) => p.name === activePreset)?.desc}
            <span className="text-slate-500 block mt-0.5 italic">
              &ldquo;{PRESETS.find((p) => p.name === activePreset)?.realWorldContext}&rdquo;
            </span>
          </div>
        </div>
      )}

      {/* Main Interactive Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 3 Plain-English Sliders (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
              Adjust the 3 Evidence Ingredients:
            </h4>
            <p className="text-xs text-slate-600">
              Drag each slider to see how transaction behavior, artificial intelligence, and network location add up to the final score.
            </p>
          </div>

          {/* Ingredient 1: Heuristics & Rules (40%) */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                  <Binary className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    1. Heuristics &amp; Rule Violations
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                      40% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hard rules: peeling chains &gt;5 hops, sudden fee surging, or equal-output mixing
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-bold text-amber-950">
                {heuristicsScore}%
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={heuristicsScore}
              onChange={(e) => {
                setHeuristicsScore(parseInt(e.target.value, 10));
                setActivePreset(null);
              }}
              className="w-full accent-amber-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>0% (Clean transaction)</span>
              <span className="text-slate-700 font-medium">Contributes: +{heuristicsContribution.toFixed(1)}% to score</span>
              <span>100% (Obvious laundering trick)</span>
            </div>
          </div>

          {/* Ingredient 2: Dual Transformer AI (40%) */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    2. Dual Transformer AI Models
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                      40% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Deep neural nets detecting hidden multi-hop money flow &amp; ransomware seed links
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-bold text-indigo-950">
                {aiModelScore}%
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={aiModelScore}
              onChange={(e) => {
                setAiModelScore(parseInt(e.target.value, 10));
                setActivePreset(null);
              }}
              className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>0% (Standard wallet flow)</span>
              <span className="text-slate-700 font-medium">Contributes: +{aiContribution.toFixed(1)}% to score</span>
              <span>100% (High neural anomaly)</span>
            </div>
          </div>

          {/* Ingredient 3: GeoIP & Blacklists (20%) */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    3. GeoIP &amp; Blacklist Intelligence
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                      20% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Broadcast from known criminal hosters, sanctioned nations, or darknet Tor gateways
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-bold text-sky-950">
                {geoipScore}%
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={geoipScore}
              onChange={(e) => {
                setGeoipScore(parseInt(e.target.value, 10));
                setActivePreset(null);
              }}
              className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>0% (Legitimate domestic IP)</span>
              <span className="text-slate-700 font-medium">Contributes: +{geoipContribution.toFixed(1)}% to score</span>
              <span>100% (Sanctioned / Bulletproof host)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Dial Gauge & Verdict Badge (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Composite Danger Dial
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                SCALE: 0 – 100%
              </span>
            </div>

            {/* Semicircular Danger Gauge */}
            <div className="flex flex-col items-center justify-center pt-4 pb-1">
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
                  {/* Active Dynamic Danger Arc */}
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

                {/* Score Number in Center */}
                <div className="absolute bottom-0 text-center flex flex-col items-center">
                  <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900">
                    {totalDangerScore}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Total Danger Score
                  </div>
                </div>
              </div>

              {/* Prominent Verdict Badge */}
              <div className="mt-4 flex items-center justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 shadow-xs ${verdict.badgeClass}`}
                >
                  <verdict.icon className="w-4 h-4" />
                  VERDICT: {verdict.tier} ({verdict.rangeText})
                </span>
              </div>
            </div>

            {/* Stacked Percentage Breakdown Bar */}
            <div className="space-y-1.5 pt-4">
              <div className="flex justify-between text-[11px] font-mono text-slate-600 font-medium">
                <span>Score Breakdown:</span>
                <span className="text-slate-900 font-bold">{totalDangerScore}% / 100%</span>
              </div>

              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${heuristicsContribution}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Heuristics: +${heuristicsContribution.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${aiContribution}%` }}
                  className="bg-indigo-600 transition-all duration-300"
                  title={`AI Models: +${aiContribution.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${geoipContribution}%` }}
                  className="bg-sky-500 transition-all duration-300"
                  title={`GeoIP/Blacklists: +${geoipContribution.toFixed(1)}%`}
                />
              </div>

              <div className="grid grid-cols-3 text-[10px] font-mono pt-1 text-slate-500 text-center">
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Rules ({heuristicsContribution.toFixed(0)}%)
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" /> AI ({aiContribution.toFixed(0)}%)
                </span>
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> GeoIP ({geoipContribution.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Plain-English Action Guidance */}
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Scale className="w-3.5 h-3.5 text-slate-700" />
              <span>What Police &amp; Judges Do Next:</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              {verdict.courtAction}
            </p>
            <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 mt-1">
              <strong>Why it triggered:</strong> {verdict.summaryExplanation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
