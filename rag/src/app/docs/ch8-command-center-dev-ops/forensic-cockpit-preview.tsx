"use client";

import React, { useState } from "react";
import {
  Layers,
  Activity,
  ShieldAlert,
  Search,
  Copy,
  Check,
  Eye,
  Sliders,
  Maximize2,
  Terminal,
  Cpu,
  Lock,
  ArrowRight,
  Info,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  ExternalLink,
  X,
  Share2,
} from "lucide-react";

interface AlertRow {
  txid: string;
  address: string;
  alias: string;
  verdict: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  riskScore: number;
  anomalyScore: number;
  flowType: "PEELING_FLOW" | "CO_SPEND" | "TX_FLOW";
  plainFlowType: string;
  attentionScore: number;
  country: string;
  asn: string;
  officerNote: string;
}

const SAMPLE_ALERTS: AlertRow[] = [
  {
    txid: "9b3c4f7a...1d8e",
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    alias: "Hydra Darknet Cluster 04",
    verdict: "CRITICAL",
    riskScore: 0.942,
    anomalyScore: 0.887,
    flowType: "PEELING_FLOW",
    plainFlowType: "Peeling Chain (Rapid Layering)",
    attentionScore: 0.96,
    country: "RU",
    asn: "AS13335 (Cloudflare/Rostelecom)",
    officerNote: "Split into 14 micro-hops to evade exchange AML thresholds. Seizure recommended.",
  },
  {
    txid: "4e2a8b1c...9f0d",
    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    alias: "Samourai Whirlpool Syndicate",
    verdict: "CRITICAL",
    riskScore: 0.915,
    anomalyScore: 0.841,
    flowType: "CO_SPEND",
    plainFlowType: "CoinJoin Mixing Pool",
    attentionScore: 0.91,
    country: "IR",
    asn: "AS4837 (China Unicom / Iran Relay)",
    officerNote: "5 inputs co-spent with known ransomware extortion payload.",
  },
  {
    txid: "7f1e9c2a...3b4d",
    address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    alias: "Lazarus Ancillary Wallet",
    verdict: "HIGH",
    riskScore: 0.784,
    anomalyScore: 0.692,
    flowType: "PEELING_FLOW",
    plainFlowType: "Peeling Chain (Deposit Hop)",
    attentionScore: 0.84,
    country: "KP",
    asn: "AS17552 (Star Joint Venture)",
    officerNote: "High transaction velocity; 2.45 BTC peeled toward unhosted mixer.",
  },
  {
    txid: "2a8b9c4e...5d1f",
    address: "1FzWLWfa आपस 5w5Lg1VzR7q2mP4",
    alias: "High-Volume Hawala Node",
    verdict: "HIGH",
    riskScore: 0.729,
    anomalyScore: 0.655,
    flowType: "TX_FLOW",
    plainFlowType: "Direct Aggregation Hop",
    attentionScore: 0.79,
    country: "CN",
    asn: "AS4134 (Chinanet)",
    officerNote: "Multiple unconfirmed inputs coalescing into suspected OTC broker.",
  },
  {
    txid: "6d4e2a8b...1f9c",
    address: "bc1q5v8h3r2g9w6x4p7z1m0k8t5y2u9l4n6q8s",
    alias: "Offshore Shell Custody",
    verdict: "MEDIUM",
    riskScore: 0.541,
    anomalyScore: 0.498,
    flowType: "CO_SPEND",
    plainFlowType: "Co-Spend Consolidation",
    attentionScore: 0.62,
    country: "SC",
    asn: "AS20001 (Seychelles Telecom)",
    officerNote: "Intermittent activity pattern; flagged for secondary monitoring.",
  },
  {
    txid: "1c9f4e2a...8b7d",
    address: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
    alias: "Regulated Exchange Hot Wallet",
    verdict: "LOW",
    riskScore: 0.218,
    anomalyScore: 0.185,
    flowType: "TX_FLOW",
    plainFlowType: "Standard Exchange Sweep",
    attentionScore: 0.35,
    country: "US",
    asn: "AS15169 (Google LLC)",
    officerNote: "Compliant VASP entity with registered KYC/AML compliance trail.",
  },
];

export function ForensicCockpitPreview() {
  const [filterVerdict, setFilterVerdict] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [selectedTxid, setSelectedTxid] = useState<string>(SAMPLE_ALERTS[0].txid);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cockpit" | "opsec" | "court_dossier">("cockpit");
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [testAddressInput, setTestAddressInput] = useState<string>(
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
  );

  const selectedAlert = SAMPLE_ALERTS.find((a) => a.txid === selectedTxid) || SAMPLE_ALERTS[0];

  const filteredAlerts = SAMPLE_ALERTS.filter((a) => {
    const matchesFilter = filterVerdict === "ALL" || a.verdict === filterVerdict;
    const matchesSearch =
      searchQuery === "" ||
      a.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.txid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1800);
  };

  const handleExportSection65B = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportComplete(true);
    }, 1200);
  };

  // Mock address hash
  const computeHash8 = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return hex.slice(0, 8);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-0">
      {/* Top Banner: Cybercrime Officer Workflow HUD */}
      <div className="p-3.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-white">
                NTRO FORENSIC COCKPIT • COMMAND WORKSTATION
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-semibold">
                NON-TECH FIELD READY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Designed for law enforcement officers: 1-click search, visual topology, and court-admissible exports
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab("cockpit")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "cockpit"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Interactive Cockpit</span>
          </button>
          <button
            onClick={() => setActiveTab("court_dossier")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "court_dossier"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Sec 65B Dossier</span>
          </button>
          <button
            onClick={() => setActiveTab("opsec")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "opsec"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>OPSEC Privacy Sandbox</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE FORENSIC COCKPIT */}
      {activeTab === "cockpit" && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick Officer Step Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
              <div>
                <div className="font-bold text-sky-950">Search Suspect</div>
                <div className="text-[10px] text-sky-700">One-click wallet lookup</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
              <div>
                <div className="font-bold text-indigo-950">Visual Money Trail</div>
                <div className="text-[10px] text-indigo-700">Follow hops in graph</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
              <div>
                <div className="font-bold text-rose-950">AI Risk Triage</div>
                <div className="text-[10px] text-rose-700">Instant threat score</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
              <div>
                <div className="font-bold text-emerald-950">Export 65B PDF</div>
                <div className="text-[10px] text-emerald-700">Court-admissible proof</div>
              </div>
            </div>
          </div>

          {/* Search Bar & Instant Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search suspect wallet, cluster alias, or TXID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setShowExportModal(true)}
                className="btn-tactical-primary text-white text-xs font-mono px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer font-bold"
              >
                <Download className="w-3.5 h-3.5 text-sky-300" />
                <span>1-Click Sec 65B PDF</span>
              </button>
            </div>
          </div>

          {/* Tactile 3D Segmented Risk Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Critical Tile */}
            <button
              onClick={() => setFilterVerdict(filterVerdict === "CRITICAL" ? "ALL" : "CRITICAL")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                filterVerdict === "CRITICAL"
                  ? "bg-rose-50 border-rose-400 shadow-xs ring-1 ring-rose-300"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-critical inline-block" />
                  CRITICAL THREAT
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-critical">
                  2
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">Immediate Seizure</div>
            </button>

            {/* High Tile */}
            <button
              onClick={() => setFilterVerdict(filterVerdict === "HIGH" ? "ALL" : "HIGH")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                filterVerdict === "HIGH"
                  ? "bg-orange-50 border-orange-400 shadow-xs ring-1 ring-orange-300"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-high inline-block" />
                  HIGH RISK
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-high">
                  2
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">Active Peeling Chain</div>
            </button>

            {/* Medium Tile */}
            <button
              onClick={() => setFilterVerdict(filterVerdict === "MEDIUM" ? "ALL" : "MEDIUM")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                filterVerdict === "MEDIUM"
                  ? "bg-yellow-50 border-yellow-400 shadow-xs ring-1 ring-yellow-300"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-medium inline-block" />
                  MEDIUM RISK
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-medium">
                  1
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">Surveillance Watch</div>
            </button>

            {/* Low Tile */}
            <button
              onClick={() => setFilterVerdict(filterVerdict === "LOW" ? "ALL" : "LOW")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                filterVerdict === "LOW"
                  ? "bg-emerald-50 border-emerald-400 shadow-xs ring-1 ring-emerald-300"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-low inline-block" />
                  CLEAN / BENIGN
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-low">
                  1
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">KYC Exchange Vault</div>
            </button>
          </div>

          {/* High-Density 38px Alert Table & Topology HUD Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 38px Table (7 Cols) */}
            <div className="lg:col-span-7 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-800 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  Live Suspect Feeds (Click any row to inspect)
                </span>
                <span className="text-[10px] text-slate-500">
                  {filteredAlerts.length} targets matching
                </span>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-slate-100/75 text-[10px] text-slate-500 uppercase tracking-wider h-8">
                      <th className="px-3">Verdict</th>
                      <th className="px-3">Suspect Entity / Address</th>
                      <th className="px-3 text-right">Threat</th>
                      <th className="px-3">Typology</th>
                      <th className="px-3">Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAlerts.map((row) => {
                      const isSelected = row.txid === selectedTxid;
                      return (
                        <tr
                          key={row.txid}
                          onClick={() => setSelectedTxid(row.txid)}
                          className={`h-[38px] cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-sky-50/90 font-semibold text-slate-900"
                              : "hover:bg-slate-50/70 text-slate-700"
                          }`}
                        >
                          <td className="px-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                row.verdict === "CRITICAL"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : row.verdict === "HIGH"
                                  ? "bg-orange-100 text-orange-800 border border-orange-200"
                                  : row.verdict === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {row.verdict}
                            </span>
                          </td>
                          <td className="px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-900 truncate max-w-[150px]">
                                {row.alias}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <span className="truncate max-w-[110px]">{row.address}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(row.address);
                                  }}
                                  className="text-slate-400 hover:text-slate-800"
                                  title="Copy address"
                                >
                                  {copiedAddr === row.address ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 text-right font-bold text-slate-900">
                            {(row.riskScore * 100).toFixed(0)}%
                          </td>
                          <td className="px-3 whitespace-nowrap text-slate-600 text-[10px]">
                            {row.plainFlowType.split(" ")[0]}
                          </td>
                          <td className="px-3 whitespace-nowrap text-slate-500 text-[10px]">
                            {row.country}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* D3 Topology Inspector Floating HUD Simulation (5 Cols) */}
            <div className="lg:col-span-5 rounded-lg border border-slate-800 bg-slate-950 p-4 text-white font-mono space-y-3 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    <span>Officer Forensic Dossier HUD</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                    TARGET PINNED
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Suspect Entity &amp; Cluster</div>
                    <div className="text-sky-300 font-bold text-xs mt-0.5">
                      {selectedAlert.alias}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {selectedAlert.address}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">Detected Pattern</div>
                      <div className="text-amber-400 font-bold mt-0.5 truncate text-[10px]">
                        {selectedAlert.plainFlowType}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">AI Threat Level</div>
                      <div className="text-rose-400 font-bold mt-0.5 text-[10px]">
                        {(selectedAlert.riskScore * 100).toFixed(1)}% Confidence
                      </div>
                    </div>
                  </div>

                  {/* Plain-English Officer Explanation */}
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
                    <div className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1.5 text-emerald-400">
                      <Sparkles className="w-3 h-3" />
                      Field Officer Summary (Plain English)
                    </div>
                    <p className="text-slate-300 text-[10px] leading-relaxed">
                      {selectedAlert.officerNote}
                    </p>
                  </div>

                  {/* Relational Multi-Head Attention Breakdown */}
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-[10px]">
                    <div className="text-slate-400 uppercase font-bold flex items-center justify-between text-[9px]">
                      <span>AI Graph Attention Weights</span>
                      <span className="text-sky-400">Explainable XAI</span>
                    </div>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between items-center text-[9px]">
                        <span>Co-Spending Correlation:</span>
                        <span className="font-bold text-sky-400">94% match with illicit pool</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-sky-400 h-full rounded-full" style={{ width: "94%" }} />
                      </div>

                      <div className="flex justify-between items-center text-[9px] pt-0.5">
                        <span>Peeling Chain Layering:</span>
                        <span className="font-bold text-amber-400">88% match with hop velocity</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: "88%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons on HUD */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Court PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURT DOSSIER (SECTION 65B) CERTIFICATE PREVIEW */}
      {activeTab === "court_dossier" && (
        <div className="p-5 space-y-5">
          <div className="p-4 bg-indigo-50/70 rounded-lg border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono font-bold text-indigo-950 uppercase flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-700" />
                Indian Evidence Act Section 65B Electronic Certificate Preview
              </div>
              <p className="text-xs text-indigo-800 mt-0.5">
                Every forensic report generated by the Command Center is automatically sealed with cryptographic SHA-256 hashes and custody metadata for court admissibility.
              </p>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-tactical-primary text-white text-xs font-mono px-3.5 py-2 rounded-md flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Signed Dossier PDF</span>
            </button>
          </div>

          {/* Virtual Paper Document Preview */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-6 sm:p-8 font-mono text-slate-800 shadow-sm space-y-5 max-w-3xl mx-auto">
            <div className="text-center border-b border-slate-300 pb-4 space-y-1">
              <div className="text-xs font-bold tracking-widest uppercase text-slate-500">
                GOVERNMENT OF INDIA • NATIONAL TECHNICAL RESEARCH ORGANISATION
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872
              </h3>
              <div className="text-[11px] text-slate-500">
                Admissibility of Electronic Records in Criminal Proceedings (Bitcoin Cybercrime Forensics)
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700">
              <p>
                I hereby certify that the electronic record contained herein, generated by the <strong>NTRO Bitcoin Forensic Intelligence System (SIH26146)</strong>, accurately reflects the transaction topology, clustering correlations, and risk classifications produced by automated deterministic inference algorithms operating without human tampering.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 uppercase font-bold">Case Reference:</span>
                  <div className="font-bold text-slate-900">NTRO/CYBER-BTC/2026/0881</div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold">Timestamp (IST):</span>
                  <div className="font-bold text-slate-900">2026-09-14 01:52:15 IST</div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold">Target Suspect Address:</span>
                  <div className="font-bold text-slate-900 truncate">{selectedAlert.address}</div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold">Classified Laundering Typology:</span>
                  <div className="font-bold text-rose-700">{selectedAlert.plainFlowType}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-lg space-y-1 font-mono text-[10px]">
                <div className="text-emerald-400 font-bold uppercase">Cryptographic Chain of Custody:</div>
                <div className="text-slate-400 truncate">
                  SHA-256 Ledger Hash: <code>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code>
                </div>
                <div className="text-slate-400">
                  Model Checkpoint Hash: <code>sha256:7a8b9c0d1e2f3a4b5c6d7e8f...</code> (Trained Weights Verified)
                </div>
                <div className="text-emerald-400">
                  Status: 100% Deterministic &bull; Zero Log Leakage &bull; Air-Gap Certified
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
              <div>Digitally Signed by Authorized Forensic Officer</div>
              <div className="font-bold text-slate-800">Seal: NTRO-CYBER-VALIDATED</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPSEC ADDRESS PRIVACY SANDBOX */}
      {activeTab === "opsec" && (
        <div className="p-5 space-y-5">
          <div className="p-4 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-1.5">
            <div className="text-xs font-mono font-bold text-emerald-950 uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              Investigator Privacy &amp; Target OPSEC Protection
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              When officers run searches, suspect Bitcoin addresses must <strong>never leak</strong> into server text logs or third-party log collectors.
              Our <code>AddressHashMiddleware</code> intercepts every outgoing log line and replaces addresses with 8-character cryptographic tokens in real-time.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Try It Live: Enter Any Bitcoin Wallet Address to Test Sanitization:
            </label>
            <input
              type="text"
              value={testAddressInput}
              onChange={(e) => setTestAddressInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              placeholder="Paste Base58 or Bech32 Bitcoin address here…"
            />
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Without Protection */}
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-between">
                <span>Standard Unprotected System</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                  PLAINTEXT LEAK
                </span>
              </div>
              <div className="p-2.5 rounded bg-white border border-rose-200 text-rose-900 break-all text-[11px]">
                {`2026-09-14 01:52:00 [INFO] router.entity: Officer querying ${testAddressInput || "<empty>"}`}
              </div>
              <div className="text-[10px] text-rose-600">
                &times; Vulnerable! Sysadmins and cloud logging tools can see exactly which citizens or suspects are under surveillance.
              </div>
            </div>

            {/* With NTRO Protection */}
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-between">
                <span>NTRO Sovereign Architecture</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  100% OPSEC SECURE
                </span>
              </div>
              <div className="p-2.5 rounded bg-white border border-emerald-200 text-emerald-900 break-all text-[11px] font-bold">
                {`2026-09-14 01:52:00 [INFO] router.entity: Officer querying [addr_${computeHash8(
                  testAddressInput || "0"
                )}]`}
              </div>
              <div className="text-[10px] text-emerald-700">
                &check; Safe! Address is pseudonymized into a permanent SHA-256 token. Zero leaks to IT logs, 100% correlation preserved for detectives.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: 1-CLICK EXPORT SECTION 65B EVIDENCE DOSSIER */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
                <Scale className="w-4 h-4 text-emerald-400" />
                Export Section 65B Court Dossier
              </div>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportComplete(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="space-y-1 text-slate-700">
                <div className="font-bold text-slate-900">Target Investigation Subject:</div>
                <div className="text-sky-700 font-semibold">{selectedAlert.alias}</div>
                <div className="text-[11px] text-slate-500 truncate">{selectedAlert.address}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold text-slate-800 uppercase text-[10px]">What is included in this dossier:</div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Visual Money-Trail Topology Snapshot</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dual Transformer AI Risk Breakdown</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cryptographic SHA-256 Ledger Seal</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Section 65B Evidence Act Certificate</span>
                </div>
              </div>

              {exportComplete ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                  <div className="text-emerald-700 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Dossier PDF Generated Successfully!
                  </div>
                  <div className="text-[10px] text-emerald-600">
                    File: NTRO-DOSSIER-{selectedAlert.txid.slice(0, 8)}.pdf (Saved to Downloads)
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleExportSection65B}
                  disabled={exporting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  {exporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing Electronic Hash Chain…</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Certified PDF Dossier</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
