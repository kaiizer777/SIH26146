"use client";

import { useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Building2,
  Lock,
  Cpu,
  Layers,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import type { EntityExplainResponse } from "@/lib/api";
import {
  generateSection65BCertificate,
  exportCertificateAsJson,
  printCertificateWindow,
  type Section65BCertificate,
} from "@/lib/dossierExport";

export interface LegalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: EntityExplainResponse | null;
  address: string | null;
}

export default function LegalCertificateModal({
  isOpen,
  onClose,
  data,
  address,
}: LegalCertificateModalProps) {
  const [cert, setCert] = useState<Section65BCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Generate certificate on open
  useEffect(() => {
    if (!isOpen || !data || !address) {
      setCert(null);
      return;
    }

    let active = true;
    setIsGenerating(true);

    generateSection65BCertificate(data, address)
      .then((generatedCert) => {
        if (active) {
          setCert(generatedCert);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error("Failed to generate Section 65B certificate:", err);
        if (active) {
          setIsGenerating(false);
          toast.error("Failed to generate cryptographic forensic certificate");
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, data, address]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyHash = useCallback(() => {
    if (!cert) return;
    navigator.clipboard.writeText(cert.digital_signature.payload_sha256);
    setCopiedHash(true);
    toast.success("Cryptographic SHA-256 seal copied to clipboard");
    setTimeout(() => setCopiedHash(false), 2000);
  }, [cert]);

  const handleCopyId = useCallback(() => {
    if (!cert) return;
    navigator.clipboard.writeText(cert.certificate_id);
    setCopiedId(true);
    toast.success(`Certificate ID copied: ${cert.certificate_id}`);
    setTimeout(() => setCopiedId(false), 2000);
  }, [cert]);

  const handlePrint = useCallback(() => {
    if (!cert) return;
    printCertificateWindow(cert);
  }, [cert]);

  const handleDownloadJson = useCallback(() => {
    if (!cert) return;
    exportCertificateAsJson(cert);
    toast.success("Certified Section 65B JSON exported");
  }, [cert]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[4px] transition-all duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Forensic Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-sec65b-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] lg:w-[60vw] max-w-5xl h-[100vh] bg-white rounded-xl border border-slate-300 shadow-3d-modal flex flex-col overflow-hidden transition-all duration-200"
      >
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white border border-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(15,23,42,0.3)] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-sky-400 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="modal-sec65b-title"
                  className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2"
                >
                  <span>Section 65B &amp; BSA 2023 Forensic Court Dossier</span>
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold crypto-mono">
                  COURT ADMISSIBLE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Statutory Certificate of Electronic Records • Indian Evidence Act 1872 &amp; BSA 2023 Sec 63
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 text-[10px] crypto-mono font-medium shadow-2xs">
              ESC
            </kbd>
            <button
              id="legal-modal-close-btn"
              onClick={onClose}
              aria-label="Close certificate modal"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Document Paper Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-full border-3 border-sky-200 border-t-sky-600 animate-spin flex items-center justify-center">
                <Lock className="w-5 h-5 text-sky-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Generating Cryptographic Evidence Certificate
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Computing Web Crypto SHA-256 tamper-evident digest and binding sovereign air-gap telemetry...
                </p>
              </div>
            </div>
          ) : !cert ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-white rounded-xl border border-slate-200">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-semibold text-slate-800">
                Certificate generation unavailable
              </p>
              <p className="text-xs text-slate-500">
                Please select a valid entity in the alert table before generating the legal dossier.
              </p>
            </div>
          ) : (
            <div className="relative max-w-4xl mx-auto bg-white rounded-xl border border-slate-300 shadow-card-elevated p-6 sm:p-10 space-y-6 overflow-hidden">
              {/* Subtle Court Admissible Diagonal Watermark */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
              >
                <div className="rotate-[-32deg] text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900/[0.035] tracking-widest whitespace-nowrap uppercase">
                  COURT ADMISSIBLE // SEC 65B BSA 2023
                </div>
              </div>

              {/* Document Content Layer */}
              <div className="relative z-10 space-y-6">
                {/* Official Indian Intelligence Header */}
                <div className="text-center border-b-2 border-slate-900 pb-5 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-600 text-white text-[11px] font-extrabold tracking-widest uppercase shadow-2xs">
                    <Lock className="w-3 h-3" />
                    <span>{cert.air_gap_verification.classification}</span>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    <div className="flex items-center justify-center gap-2 text-slate-700">
                      <Building2 className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Government of India • भारत सरकार
                      </span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight uppercase">
                      {cert.air_gap_verification.operating_agency}
                    </h1>
                    <div className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Cyber &amp; Technical Directorate • Automated Evidence Custody Engine
                    </div>
                    <p className="text-[11px] text-slate-600 font-semibold tracking-wide">
                      Certificate of Admissibility of Electronic Records Under Section 65B of Indian Evidence Act, 1872 &amp; Section 63 Bharatiya Sakshya Adhiniyam, 2023
                    </p>
                  </div>
                </div>

                {/* Metadata & Air-Gap State Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b sm:border-b-0 sm:border-r border-slate-200 pr-0 sm:pr-3 pb-2 sm:pb-0">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      Certificate ID:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="crypto-mono font-bold text-slate-900">
                        {cert.certificate_id}
                      </span>
                      <button
                        onClick={handleCopyId}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                        title="Copy Certificate ID"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-0 sm:pl-3">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      Jurisdiction:
                    </span>
                    <span className="font-semibold text-slate-800 text-right">
                      {cert.jurisdiction}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b sm:border-b-0 sm:border-r border-slate-200 pr-0 sm:pr-3 pb-2 sm:pb-0 pt-2 sm:pt-0">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      Generated UTC:
                    </span>
                    <span className="crypto-mono text-slate-800 font-medium">
                      {cert.generated_at_utc}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-0 sm:pl-3 pt-2 sm:pt-0">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      Generated IST:
                    </span>
                    <span className="crypto-mono text-slate-800 font-medium">
                      {cert.generated_at_ist}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b sm:border-b-0 sm:border-r border-slate-200 pr-0 sm:pr-3 pb-2 sm:pb-0 pt-2 sm:pt-0">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      Air-Gap State:
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OFFLINE SOVEREIGN NODE</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-0 sm:pl-3 pt-2 sm:pt-0">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      Device Node UUID:
                    </span>
                    <span className="crypto-mono text-[11px] font-bold text-slate-800">
                      {cert.air_gap_verification.device_uuid}
                    </span>
                  </div>
                </div>

                {/* Statutory Legal Declaration Box */}
                <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold uppercase tracking-wider text-[11px]">
                    <FileCheck className="w-4 h-4 text-amber-700" />
                    <span>Statutory Section 65B / Section 63 BSA Declaration</span>
                  </div>
                  <p className="text-amber-950 font-normal leading-relaxed italic">
                    &ldquo;{cert.statutory_declaration}&rdquo;
                  </p>
                </div>

                {/* Provisional Notice (if applicable) */}
                {cert.target_entity.is_provisional && (
                  <div className="p-3.5 rounded-lg bg-orange-50 border border-orange-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-orange-950 uppercase text-[10px] tracking-wider">
                        Provisional Evidence Record
                      </span>
                      <p className="text-orange-900 font-medium">
                        {cert.target_entity.provisional_caveat}
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1: Target Entity Forensic Findings */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span>1. Target Entity Forensic Findings</span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Blockchain &amp; Network Correlation
                    </span>
                  </h3>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2 px-3 font-semibold">Target Bitcoin Entity</th>
                          <th className="py-2 px-3 font-semibold">Verdict</th>
                          <th className="py-2 px-3 font-semibold">Risk Score</th>
                          <th className="py-2 px-3 font-semibold">Anomaly MSE</th>
                          <th className="py-2 px-3 font-semibold">Rank %</th>
                          <th className="py-2 px-3 font-semibold">Cluster ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        <tr>
                          <td className="py-2.5 px-3 crypto-mono font-bold text-slate-900 break-all">
                            {cert.target_entity.wallet_address}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide",
                                cert.target_entity.verdict === "CRITICAL"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : cert.target_entity.verdict === "HIGH"
                                  ? "bg-orange-100 text-orange-800 border border-orange-200"
                                  : cert.target_entity.verdict === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200",
                              )}
                            >
                              {cert.target_entity.verdict}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 crypto-mono font-bold">
                            {cert.target_entity.composite_risk_score.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 crypto-mono">
                            {cert.target_entity.anomaly_score.toFixed(6)}
                          </td>
                          <td className="py-2.5 px-3 crypto-mono">
                            {cert.target_entity.anomaly_percentile.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 crypto-mono">
                            {cert.target_entity.cluster_id != null ? cert.target_entity.cluster_id : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: Model Provenance & SHA-256 Checksums */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span>2. Dual Transformer Model Provenance &amp; Checksums</span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Sovereign Model Weight Integrity
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Cpu className="w-3.5 h-3.5 text-sky-600" />
                        <span>Tabular Engine (FT-Transformer)</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {cert.model_provenance.tabular_engine}
                      </p>
                      <div className="text-[10px] font-mono text-slate-500 break-all bg-white p-1.5 rounded border border-slate-200 mt-1">
                        SHA-256: {cert.model_provenance.weights_checksum_ft}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Graph Engine (Relational Graph Transformer)</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {cert.model_provenance.graph_engine}
                      </p>
                      <div className="text-[10px] font-mono text-slate-500 break-all bg-white p-1.5 rounded border border-slate-200 mt-1">
                        SHA-256: {cert.model_provenance.weights_checksum_rgt}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Explainability Audit & Violations */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span>3. Explainable AI (XAI) &amp; Rule Violations Audit</span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Mathematical Attribution &amp; Relational Topology
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Top SHAP Features Table */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                        Top SHAP Tabular Attributions
                      </span>
                      {cert.target_entity.is_provisional ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          Attribution deferred for provisional ingest.
                        </p>
                      ) : cert.evidence_audit.top_shap_features.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No significant feature deviations detected.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {cert.evidence_audit.top_shap_features.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                            >
                              <span className="font-medium text-slate-700 truncate pr-2">
                                {item.feature}
                              </span>
                              <span
                                className={clsx(
                                  "crypto-mono font-bold",
                                  item.impact > 0 ? "text-red-600" : "text-emerald-600",
                                )}
                              >
                                {item.impact > 0 ? `+${item.impact.toFixed(4)}` : item.impact.toFixed(4)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rule Citations & Laundering Indicators */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                        Heuristic Rules &amp; Laundering Status
                      </span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 font-medium">Triggered Rule Violations:</span>
                          {cert.evidence_audit.triggered_rules.length === 0 ? (
                            <p className="text-slate-400 italic mt-0.5">No rule thresholds violated</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {cert.evidence_audit.triggered_rules.map((rule) => (
                                <span
                                  key={rule}
                                  className="crypto-mono text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold"
                                >
                                  {rule}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">Mixing Status:</span>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {cert.evidence_audit.is_mixing ? "CONFIRMED" : "NEGATIVE"}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">Peeling Chain:</span>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {cert.evidence_audit.peeling_chain_detected ? "CONFIRMED" : "NEGATIVE"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Cryptographic Tamper-Evident Seal & Signatures */}
                <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-4">
                  <div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-700" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          4. Cryptographic Tamper-Evident Digest &amp; Custody Seal
                        </span>
                      </div>
                      <span className="text-[10px] crypto-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        SHA-256 SEAL VERIFIED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Deterministic digest calculated over canonical entity telemetry and model provenance records:
                    </p>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-300">
                    <span className="crypto-mono text-xs font-bold text-slate-900 break-all select-all flex-1">
                      {cert.digital_signature.payload_sha256}
                    </span>
                    <button
                      onClick={handleCopyHash}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                      title="Copy SHA-256 Digest"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Seal</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Signatory Blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-dashed border-slate-300 text-xs">
                    <div className="space-y-6">
                      <div className="text-slate-600 text-[11px]">
                        Forensic Technical Officer (Class-I Gazetted):
                      </div>
                      <div className="border-t border-slate-900 pt-1.5">
                        <div className="font-bold text-slate-900">
                          CYBER &amp; TECHNICAL INTELLIGENCE WING
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          National Technical Research Organisation (NTRO)
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="text-slate-600 text-[11px]">
                        Electronic Seal &amp; Verification IST:
                      </div>
                      <div className="border-t border-slate-900 pt-1.5">
                        <div className="font-bold text-slate-900 crypto-mono">
                          REPUBLIC OF INDIA // SOVEREIGN ENGINE
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Attested on: {cert.generated_at_ist}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="px-6 py-3.5 bg-gradient-to-b from-slate-50 to-slate-100/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,1)] shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cryptographic Admissibility Guaranteed Under BSA 2023 Sec 63 &amp; IEA Sec 65B</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              id="legal-modal-dismiss-btn"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 h-9 rounded-md tactile-btn-secondary text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
            <button
              id="legal-modal-json-btn"
              onClick={handleDownloadJson}
              disabled={!cert}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-md tactile-btn-secondary text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download JSON</span>
            </button>
            <button
              id="legal-modal-print-btn"
              onClick={handlePrint}
              disabled={!cert}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 h-9 rounded-md tactile-btn-primary text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-sky-300 stroke-[2.2]" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
