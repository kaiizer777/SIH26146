"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  X,
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Shield,
  Activity,
  Layers,
  Network,
  FileText,
} from "lucide-react";
import type { EntityExplainResponse } from "@/lib/api";
import ShapWaterfall from "./ShapWaterfall";

type Verdict = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface EntityDrawerProps {
  address: string | null;
  data: EntityExplainResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Severity styles
// ---------------------------------------------------------------------------

const VERDICT_CLASSES: Record<Verdict, { pill: string; gauge: string }> = {
  CRITICAL: {
    pill: "bg-red-50 text-red-700 border border-red-200",
    gauge: "#dc2626",
  },
  HIGH: {
    pill: "bg-orange-50 text-orange-700 border border-orange-200",
    gauge: "#ea580c",
  },
  MEDIUM: {
    pill: "bg-yellow-50 text-yellow-800 border border-yellow-200",
    gauge: "#ca8a04",
  },
  LOW: {
    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    gauge: "#16a34a",
  },
};

// ---------------------------------------------------------------------------
// Composite gauge (SVG arc)
// ---------------------------------------------------------------------------

function RiskGauge({ score, verdict }: { score: number; verdict: string }) {
  const v = verdict as Verdict;
  const r = 36;
  const cx = 45;
  const cy = 44;
  const startAngle = -Math.PI * 0.75;
  const endAngle = Math.PI * 0.75;
  const range = endAngle - startAngle;
  const angle = startAngle + range * Math.min(score, 1);

  const arcPath = (from: number, to: number, radius: number) => {
    const x1 = cx + radius * Math.cos(from);
    const y1 = cy + radius * Math.sin(from);
    const x2 = cx + radius * Math.cos(to);
    const y2 = cy + radius * Math.sin(to);
    const largeArc = to - from > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const fillColor = VERDICT_CLASSES[v]?.gauge ?? "#94a3b8";

  return (
    <svg width={90} height={66} viewBox="0 0 90 66" aria-label={`Risk gauge: ${score.toFixed(3)}`}>
      {/* Track */}
      <path
        d={arcPath(startAngle, endAngle, r)}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={arcPath(startAngle, angle, r)}
        fill="none"
        stroke={fillColor}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fontSize={13}
        fontWeight="700"
        fill="#0f172a"
        fontFamily="monospace"
      >
        {score.toFixed(3)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Collapsible accordion section
// ---------------------------------------------------------------------------

function Accordion({
  title,
  icon,
  defaultOpen = false,
  isOpen,
  onToggle,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const handleToggle = onToggle ?? (() => setInternalOpen((o) => !o));

  return (
    <div className={clsx("border border-slate-200 rounded-lg overflow-hidden flex flex-col", className)}>
      <button
        className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left shrink-0"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {icon}
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3.5 bg-white text-sm text-slate-700 space-y-2.5 flex-1 flex flex-col justify-between">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EntityDrawer({
  address,
  data,
  isLoading,
  error,
  onClose,
}: EntityDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [mlRowOpen, setMlRowOpen] = useState(true);

  const isOpen = address !== null;

  // Escape key closes drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const downloadDossier = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ntro_dossier_${address?.slice(0, 8)}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verdict = (data?.verdict ?? "LOW") as Verdict;

  return (
    <>
      {/* Ambient backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Centered Forensic Dossier Card */}
      <aside
        className={clsx(
          "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] lg:w-[60vw] h-[98vh] max-w-5xl",
          "flex flex-col bg-white rounded-md border border-slate-200 shadow-2xl overflow-hidden",
          "transition-all duration-200 ease-out",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
        )}
        aria-label="Entity forensic dossier"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-800">
              Forensic Dossier
            </span>
          </div>
          <button
            id="drawer-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200/60"
            aria-label="Close dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="p-4 space-y-4">
              {[80, 120, 200, 160].map((h, i) => (
                <div
                  key={i}
                  className="rounded bg-slate-100 animate-pulse"
                  style={{ height: h }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="p-4 flex flex-col items-center gap-2 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-semibold text-slate-700">
                Failed to load dossier
              </p>
              <p className="crypto-mono text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* No selection */}
          {!isLoading && !error && !data && !address && (
            <div className="p-8 text-center text-xs text-slate-400">
              Select an alert to open the forensic dossier
            </div>
          )}

          {/* Data */}
          {!isLoading && !error && data && (
            <div className="flex flex-col gap-4 p-5">
              {/* Identity block */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Wallet Address
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="crypto-mono text-sm sm:text-base text-slate-900 font-semibold break-all"
                      title={address ?? ""}
                    >
                      {address}
                    </span>
                    <button
                      id="drawer-copy-address-btn"
                      onClick={copyAddress}
                      className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-200"
                      aria-label="Copy address"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0 pl-2">
                  <RiskGauge
                    score={data.composite_score}
                    verdict={data.verdict}
                  />
                  <span
                    className={clsx(
                      "mt-1 px-3 py-0.5 rounded text-xs font-bold tracking-wide",
                      VERDICT_CLASSES[verdict].pill,
                    )}
                  >
                    {data.verdict}
                  </span>
                </div>
              </div>

              {/* Seed badge */}
              {data.evidence_trail.seed_family && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-sm font-semibold text-red-700 crypto-mono">
                    {data.evidence_trail.seed_family}
                  </span>
                </div>
              )}

              {/* Automated Forensic Narrative */}
              <div className="px-4 py-3.5 rounded-lg bg-sky-50 border border-sky-200">
                <p className="text-xs uppercase tracking-wider text-sky-700 font-semibold mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Automated Forensic Summary
                </p>
                <p className="text-sm text-slate-800 leading-relaxed font-normal">
                  {data.summary_narrative}
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Anomaly Component",
                    val: data.score_breakdown.anomaly_component,
                  },
                  {
                    label: "Risk Component",
                    val: data.score_breakdown.risk_component,
                  },
                  {
                    label: "Rule Bonus",
                    val: data.score_breakdown.rule_bonus,
                  },
                  {
                    label: "Mixing Indicator",
                    val: data.score_breakdown.mixing_indicator,
                  },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className="crypto-mono text-sm font-bold text-slate-900 mt-1">
                      {val.toFixed(5)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Evidence Accordions */}
              <div className="flex flex-col gap-2.5">
                {/* Co-Spending & Autoencoder (side-by-side 50% width row with synchronized open/close) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
                  {/* Cluster Co-Spending */}
                  <Accordion
                    title="Cluster Co-Spending Analysis"
                    icon={<Network className="w-4 h-4" />}
                    isOpen={mlRowOpen}
                    onToggle={() => setMlRowOpen((o) => !o)}
                    className="h-full"
                  >
                    <Row label="Cluster ID" value={data.evidence_trail.cluster_id ?? "—"} mono />
                    <Row label="Cluster Size" value={data.evidence_trail.cluster_size?.toLocaleString() ?? "—"} mono />
                    <Row
                      label="Anomaly Rank"
                      value={
                        data.evidence_trail.anomaly_rank_percentile != null
                          ? `${data.evidence_trail.anomaly_rank_percentile.toFixed(2)}th percentile`
                          : "—"
                      }
                      mono
                    />
                  </Accordion>

                  {/* Autoencoder Reconstruction */}
                  <Accordion
                    title="Autoencoder Reconstruction"
                    icon={<Activity className="w-4 h-4" />}
                    isOpen={mlRowOpen}
                    onToggle={() => setMlRowOpen((o) => !o)}
                    className="h-full"
                  >
                    <Row
                      label="Anomaly Score (MSE)"
                      value={
                        data.evidence_trail.anomaly_score != null
                          ? data.evidence_trail.anomaly_score.toFixed(6)
                          : "—"
                      }
                      mono
                    />
                    <Row
                      label="Percentile Rank"
                      value={
                        data.evidence_trail.anomaly_rank_percentile != null
                          ? `${data.evidence_trail.anomaly_rank_percentile.toFixed(1)}%`
                          : "—"
                      }
                      mono
                    />
                    <Row
                      label="Threshold Status"
                      value={
                        data.evidence_trail.anomaly_score != null
                          ? data.evidence_trail.anomaly_score >= 0.0346
                            ? "Exceeded (≥ 0.0346)"
                            : "Normal (< 0.0346)"
                          : "—"
                      }
                      highlight={
                        data.evidence_trail.anomaly_score != null &&
                        data.evidence_trail.anomaly_score >= 0.0346
                      }
                      mono
                    />
                  </Accordion>
                </div>

                {/* Mixing & Laundering */}
                <Accordion
                  title="Mixing & Laundering Heuristics"
                  icon={<Layers className="w-4 h-4" />}
                >
                  <Row
                    label="Peeling Chain"
                    value={data.evidence_trail.is_peeling_chain ? "Detected" : "Not detected"}
                    highlight={data.evidence_trail.is_peeling_chain}
                  />
                  {data.evidence_trail.chain_hops != null && (
                    <Row label="Chain Hops" value={data.evidence_trail.chain_hops} mono />
                  )}
                  {data.evidence_trail.pass_through_ratio != null && (
                    <Row
                      label="Pass-Through Ratio"
                      value={`${(data.evidence_trail.pass_through_ratio * 100).toFixed(1)}%`}
                      mono
                    />
                  )}
                  {data.evidence_trail.mixing_patterns.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5 font-medium">Mixing Patterns</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.evidence_trail.mixing_patterns.map((p) => (
                          <span
                            key={p}
                            className="crypto-mono text-xs px-2.5 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200 font-medium"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Accordion>

                {/* Triggered Rules */}
                <Accordion
                  title="Triggered Rules Audit"
                  icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
                  defaultOpen={data.evidence_trail.triggered_rules.length > 0}
                >
                  {data.evidence_trail.triggered_rules.length === 0 ? (
                    <p className="text-slate-400 italic text-xs">No rules triggered</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {data.evidence_trail.triggered_rules.map((rule) => (
                        <span
                          key={rule}
                          className="crypto-mono text-xs px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-medium"
                        >
                          {rule}
                        </span>
                      ))}
                    </div>
                  )}
                </Accordion>

                {/* SHAP Waterfall */}
                <Accordion
                  title="SHAP Feature Attributions"
                  icon={<Activity className="w-4 h-4 text-sky-600" />}
                  defaultOpen={data.shap_attributions.length > 0}
                >
                  <ShapWaterfall attributions={data.shap_attributions} />
                </Accordion>
              </div>
            </div>
          )}
        </div>

        {/* Footer: export */}
        {data && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-end">
            <button
              id="drawer-download-dossier-btn"
              onClick={downloadDossier}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 h-9 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download Forensic Dossier (JSON)
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500 text-xs sm:text-sm font-medium">{label}</span>
      <span
        className={clsx(
          "text-xs sm:text-sm font-semibold",
          mono && "crypto-mono",
          highlight ? "text-red-600 font-bold" : "text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}
