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
        badgeClass: "bg-rose-100 text-rose-900 border-t border-t-rose-200 border-x border-x-rose-300 border-b border-b-rose-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.05)]",
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
        badgeClass: "bg-amber-100 text-amber-900 border-t border-t-amber-200 border-x border-x-amber-300 border-b border-b-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.05)]",
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
        badgeClass: "bg-sky-100 text-sky-900 border-t border-t-sky-200 border-x border-x-sky-300 border-b border-b-sky-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.05)]",
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
      badgeClass: "bg-emerald-100 text-emerald-900 border-t border-t-emerald-200 border-x border-x-emerald-300 border-b border-b-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.05)]",
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
    <div className="bg-white rounded-xl border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Top Banner with Clear Non-Technical Heading */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
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
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-gradient-to-b from-slate-700 to-slate-800 text-white text-xs font-mono font-medium flex items-center gap-1.5 border-t border-t-slate-600 border-x border-x-slate-700 border-b border-b-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.3)] active:translate-y-[0.5px] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset to Sample Syndicate
        </button>
      </div>

      {/* Preset Scenario Selector */}
      <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1 mr-1">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Choose a Real-Life Scenario:
        </span>
        {PRESETS.map((preset) => {
          const isSelected = activePreset === preset.name;
          return (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white border-t border-t-slate-700 border-x border-x-slate-800 border-b border-b-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.3)] font-semibold"
                  : "bg-white text-slate-800 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] font-medium"
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* Active Scenario Description */}
      {activePreset && (
        <div className="px-5 py-2.5 bg-gradient-to-b from-blue-50 to-blue-100/40 border-b border-blue-200 text-xs text-slate-800 flex items-start gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-950">Scenario Context: </span>
            {PRESETS.find((p) => p.name === activePreset)?.desc}
            <span className="text-slate-600 block mt-0.5 italic font-medium">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1">
              Adjust the 3 Evidence Ingredients:
            </h4>
            <p className="text-xs text-slate-600">
              Drag each slider to see how transaction behavior, artificial intelligence, and network location add up to the final score.
            </p>
          </div>

          {/* Ingredient 1: Heuristics & Rules (40%) */}
          <div className="p-4 rounded-xl border-t border-t-amber-100 border-x border-x-amber-200/80 border-b border-b-amber-300/70 bg-gradient-to-b from-white to-amber-50/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.04)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-amber-50 to-amber-100 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 text-amber-800 flex items-center justify-center font-bold shadow-2xs">
                  <Binary className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    1. Heuristics &amp; Rule Violations
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs">
                      40% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Hard rules: peeling chains &gt;5 hops, sudden fee surging, or equal-output mixing
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-extrabold text-amber-950">
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
            <div className="flex justify-between text-[11px] font-mono text-slate-600">
              <span>0% (Clean transaction)</span>
              <span className="text-slate-900 font-bold">Contributes: +{heuristicsContribution.toFixed(1)}% to score</span>
              <span>100% (Obvious laundering trick)</span>
            </div>
          </div>

          {/* Ingredient 2: Dual Transformer AI (40%) */}
          <div className="p-4 rounded-xl border-t border-t-indigo-100 border-x border-x-indigo-200/80 border-b border-b-indigo-300/70 bg-gradient-to-b from-white to-indigo-50/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.04)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-indigo-50 to-indigo-100 border-t border-t-indigo-100 border-x border-x-indigo-200 border-b border-b-indigo-300 text-indigo-800 flex items-center justify-center font-bold shadow-2xs">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    2. Dual Transformer AI Models
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold shadow-2xs">
                      40% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Deep neural nets detecting hidden multi-hop money flow &amp; ransomware seed links
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-extrabold text-indigo-950">
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
            <div className="flex justify-between text-[11px] font-mono text-slate-600">
              <span>0% (Standard wallet flow)</span>
              <span className="text-slate-900 font-bold">Contributes: +{aiContribution.toFixed(1)}% to score</span>
              <span>100% (High neural anomaly)</span>
            </div>
          </div>

          {/* Ingredient 3: GeoIP & Blacklists (20%) */}
          <div className="p-4 rounded-xl border-t border-t-sky-100 border-x border-x-sky-200/80 border-b border-b-sky-300/70 bg-gradient-to-b from-white to-sky-50/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(15,23,42,0.04)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-sky-50 to-sky-100 border-t border-t-sky-100 border-x border-x-sky-200 border-b border-b-sky-300 text-sky-800 flex items-center justify-center font-bold shadow-2xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    3. GeoIP &amp; Blacklist Intelligence
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300 font-bold shadow-2xs">
                      20% Weight
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Broadcast from known criminal hosters, sanctioned nations, or darknet Tor gateways
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-extrabold text-sky-950">
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
            <div className="flex justify-between text-[11px] font-mono text-slate-600">
              <span>0% (Legitimate domestic IP)</span>
              <span className="text-slate-900 font-bold">Contributes: +{geoipContribution.toFixed(1)}% to score</span>
              <span>100% (Sanctioned / Bulletproof host)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Dial Gauge & Verdict Badge (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.05)] space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                Composite Danger Dial
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
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
                  <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider font-semibold">
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
              <div className="flex justify-between text-[11px] font-mono text-slate-700 font-medium">
                <span>Score Breakdown:</span>
                <span className="text-slate-950 font-extrabold">{totalDangerScore}% / 100%</span>
              </div>

              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
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

              <div className="grid grid-cols-3 text-[10px] font-mono pt-1 text-slate-600 font-medium text-center">
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
          <div className="p-3.5 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Scale className="w-3.5 h-3.5 text-slate-700" />
              <span>What Police &amp; Judges Do Next:</span>
            </div>
            <p className="text-slate-800 leading-relaxed font-normal">
              {verdict.courtAction}
            </p>
            <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-1.5 mt-1 font-medium">
              <strong className="text-slate-900">Why it triggered:</strong> {verdict.summaryExplanation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
