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
} from "lucide-react";

interface AlertRow {
  txid: string;
  address: string;
  verdict: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  riskScore: number;
  anomalyScore: number;
  flowType: "PEELING_FLOW" | "CO_SPEND" | "TX_FLOW";
  attentionScore: number;
  country: string;
  asn: string;
}

const SAMPLE_ALERTS: AlertRow[] = [
  {
    txid: "9b3c4f7a...1d8e",
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    verdict: "CRITICAL",
    riskScore: 0.942,
    anomalyScore: 0.887,
    flowType: "PEELING_FLOW",
    attentionScore: 0.96,
    country: "RU",
    asn: "AS13335",
  },
  {
    txid: "4e2a8b1c...9f0d",
    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    verdict: "CRITICAL",
    riskScore: 0.915,
    anomalyScore: 0.841,
    flowType: "CO_SPEND",
    attentionScore: 0.91,
    country: "IR",
    asn: "AS4837",
  },
  {
    txid: "7f1e9c2a...3b4d",
    address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    verdict: "HIGH",
    riskScore: 0.784,
    anomalyScore: 0.692,
    flowType: "PEELING_FLOW",
    attentionScore: 0.84,
    country: "KP",
    asn: "AS17552",
  },
  {
    txid: "2a8b9c4e...5d1f",
    address: "1FzWLWfa आपस 5w5Lg1VzR7q2mP4",
    verdict: "HIGH",
    riskScore: 0.729,
    anomalyScore: 0.655,
    flowType: "TX_FLOW",
    attentionScore: 0.79,
    country: "CN",
    asn: "AS4134",
  },
  {
    txid: "6d4e2a8b...1f9c",
    address: "bc1q5v8h3r2g9w6x4p7z1m0k8t5y2u9l4n6q8s",
    verdict: "MEDIUM",
    riskScore: 0.541,
    anomalyScore: 0.498,
    flowType: "CO_SPEND",
    attentionScore: 0.62,
    country: "SC",
    asn: "AS20001",
  },
  {
    txid: "1c9f4e2a...8b7d",
    address: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
    verdict: "LOW",
    riskScore: 0.218,
    anomalyScore: 0.185,
    flowType: "TX_FLOW",
    attentionScore: 0.35,
    country: "US",
    asn: "AS15169",
  },
];

export function ForensicCockpitPreview() {
  const [filterVerdict, setFilterVerdict] = useState<string>("ALL");
  const [selectedTxid, setSelectedTxid] = useState<string>(SAMPLE_ALERTS[0].txid);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cockpit" | "opsec">("cockpit");
  const [testAddressInput, setTestAddressInput] = useState<string>(
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
  );

  const selectedAlert = SAMPLE_ALERTS.find((a) => a.txid === selectedTxid) || SAMPLE_ALERTS[0];

  const filteredAlerts = SAMPLE_ALERTS.filter(
    (a) => filterVerdict === "ALL" || a.verdict === filterVerdict
  );

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1800);
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
      {/* Cockpit Mode Toggle Header */}
      <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider uppercase">
            FORENSIC COCKPIT HUD // 38PX DENSITY
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            D3 RELATIONAL GRAPH
          </span>
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab("cockpit")}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "cockpit"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tactile Cockpit
          </button>
          <button
            onClick={() => setActiveTab("opsec")}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "opsec"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            OPSEC Redaction Sandbox
          </button>
        </div>
      </div>

      {activeTab === "cockpit" ? (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Tactical 3D Segmented Counter Bar */}
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
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-critical inline-block" />
                  CRITICAL
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-critical">
                  2
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">Risk &gt; 0.90</div>
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
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-high inline-block" />
                  HIGH
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-high">
                  2
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">0.70 &le; Risk &lt; 0.90</div>
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
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-medium inline-block" />
                  MEDIUM
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-medium">
                  1
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">0.40 &le; Risk &lt; 0.70</div>
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
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full led-3d-low inline-block" />
                  LOW
                </span>
                <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold counter-3d-low">
                  1
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono">Risk &lt; 0.40</div>
            </button>
          </div>

          {/* High-Density 38px Alert Table & Topology HUD Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 38px Table (7 Cols) */}
            <div className="lg:col-span-7 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-700 uppercase">Alert Stream (38px Dense Rows)</span>
                <span className="text-[10px] text-slate-500">
                  Showing {filteredAlerts.length} records
                </span>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-slate-100/75 text-[10px] text-slate-500 uppercase tracking-wider h-8">
                      <th className="px-3">Verdict</th>
                      <th className="px-3">Entity Address</th>
                      <th className="px-3 text-right">Risk</th>
                      <th className="px-3 text-right">Anomaly</th>
                      <th className="px-3">GeoIP</th>
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
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[130px] sm:max-w-[160px] text-slate-900">
                                {row.address}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(row.address);
                                }}
                                className="text-slate-400 hover:text-slate-800 p-0.5"
                                title="Copy Address"
                              >
                                {copiedAddr === row.address ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 text-right font-bold text-slate-900">
                            {row.riskScore.toFixed(3)}
                          </td>
                          <td className="px-3 text-right text-slate-600">
                            {row.anomalyScore.toFixed(3)}
                          </td>
                          <td className="px-3 whitespace-nowrap text-slate-500 text-[11px]">
                            {row.country} &bull; {row.asn}
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
                    <span>HUD Inspector Dossier</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    PINNED TARGET
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Target Address</div>
                    <div className="text-sky-300 font-bold truncate text-[11px] mt-0.5">
                      {selectedAlert.address}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">Flow Classification</div>
                      <div className="text-amber-400 font-bold mt-0.5 truncate">
                        {selectedAlert.flowType}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase">Attention Glow (α)</div>
                      <div className="text-emerald-400 font-bold mt-0.5">
                        {selectedAlert.attentionScore.toFixed(2)} (High)
                      </div>
                    </div>
                  </div>

                  {/* Relational Multi-Head Breakdown */}
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5 text-[10px]">
                    <div className="text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>Multi-Head Attention Weights</span>
                      <span className="text-slate-500">4-Head RGT</span>
                    </div>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between items-center">
                        <span>Head 1 (Co-Spending):</span>
                        <span className="font-bold text-sky-400">α = 0.94</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-sky-400 h-full rounded-full" style={{ width: "94%" }} />
                      </div>

                      <div className="flex justify-between items-center pt-0.5">
                        <span>Head 2 (Multi-Hop Flow):</span>
                        <span className="font-bold text-amber-400">α = 0.88</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: "88%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>D3 Force Engine: Locked 60 FPS</span>
                <span className="text-emerald-400 font-bold">4.5px Precision Darts</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* OPSEC AddressHashMiddleware Sandbox */
        <div className="p-5 space-y-5">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Interactive AddressHashMiddleware Tokenizer Simulator
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Test how FastAPI&apos;s <code>_AddressPseudonymFilter</code> intercepts Bitcoin addresses
              (Base58 P2PKH/P2SH and Bech32/Bech32m) before they hit standard output, ELK, or SIEM log streams.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Input Raw Log Message (Simulating Incoming Request / Trace):
            </label>
            <input
              type="text"
              value={testAddressInput}
              onChange={(e) => setTestAddressInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-400"
              placeholder="Paste Base58 or Bech32 Bitcoin address here…"
            />
          </div>

          {/* Transformation Pipeline Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Raw Insecure Stream */}
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-between">
                <span>Insecure Unfiltered Log (Threat Model)</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                  PLAINTEXT LEAK
                </span>
              </div>
              <div className="p-2.5 rounded bg-white border border-rose-200 text-rose-900 break-all text-[11px]">
                {`2026-09-13 20:15:00 [INFO] router.entity: Fetching dossier for ${testAddressInput || "<empty>"}`}
              </div>
              <div className="text-[10px] text-rose-600">
                &times; Vulnerable to operator log exposure and third-party SIEM indexing violations.
              </div>
            </div>

            {/* AddressHashMiddleware Stream */}
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-between">
                <span>AddressHashMiddleware Output (Production)</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  0 LEAKS VERIFIED
                </span>
              </div>
              <div className="p-2.5 rounded bg-white border border-emerald-200 text-emerald-900 break-all text-[11px] font-bold">
                {`2026-09-13 20:15:00 [INFO] router.entity: Fetching dossier for [addr_${computeHash8(
                  testAddressInput || "0"
                )}]`}
              </div>
              <div className="text-[10px] text-emerald-700">
                &check; Deterministic 8-char SHA-256 token preserves cross-service traceability with 0 plaintext leak.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
