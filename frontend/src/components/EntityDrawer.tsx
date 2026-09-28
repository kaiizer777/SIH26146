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
  BarChart3,
  Brain,
  CircleDashed,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import type { EntityExplainResponse } from "@/lib/api";
import ShapWaterfall from "./ShapWaterfall";
import AttentionHeatmap from "./AttentionHeatmap";
import ModelProvenanceModal from "./ModelProvenanceModal";
import LegalCertificateModal from "./LegalCertificateModal";

// Mirrors the backend verdict vocabulary: the four risk tiers defined by
// `app/services/risk_thresholds.py::VERDICT_TIERS`, plus "UNKNOWN"
// (`app/routers/entity.py::UNKNOWN_VERDICT`). "UNKNOWN" is NOT a fifth risk
// tier — it is the explicit "has telemetry, was never scored" state, and it is
// deliberately kept out of the four-tier colour language so it can never be
// misread as a measured LOW.
type Verdict = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

const VERDICT_VALUES: readonly Verdict[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
];

interface EntityDrawerProps {
  address: string | null;
  data: EntityExplainResponse | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onProvenanceClick?: () => void;
}

// ---------------------------------------------------------------------------
// Severity styles
// ---------------------------------------------------------------------------

const VERDICT_CLASSES: Record<Verdict, { pill: string; gauge: string }> = {
  CRITICAL: {
    pill: "pill-critical text-red-800",
    gauge: "#dc2626",
  },
  HIGH: {
    pill: "pill-high text-orange-900",
    gauge: "#ea580c",
  },
  MEDIUM: {
    pill: "pill-medium text-yellow-900",
    gauge: "#ca8a04",
  },
  LOW: {
    pill: "pill-low text-emerald-800",
    gauge: "#16a34a",
  },
  UNKNOWN: {
    pill: "pill-unknown text-slate-600",
    gauge: "#94a3b8",
  },
};

/**
 * Narrow a wire verdict onto the known vocabulary.
 *
 * `verdict` crosses the wire as a string, so it is narrowed by lookup rather
 * than by assertion. An unrecognised value degrades to the neutral UNKNOWN
 * treatment instead of falling through to an unkeyed lookup. Because this
 * returns `Verdict` rather than a cast, `VERDICT_CLASSES[verdict]` stays total:
 * every union member has an entry, so no verdict can yield `undefined.pill`.
 */
function toVerdict(value: string | null | undefined): Verdict {
  return VERDICT_VALUES.find((v) => v === value) ?? "UNKNOWN";
}

// ---------------------------------------------------------------------------
// Composite gauge (SVG arc)
// ---------------------------------------------------------------------------

function RiskGauge({
  score,
  verdict,
  unscored,
}: {
  score: number;
  verdict: Verdict;
  unscored: boolean;
}) {
  const v = verdict;
  const r = 36;
  const cx = 45;
  const cy = 44;
  const startAngle = -Math.PI * 0.75;
  const endAngle = Math.PI * 0.75;
  const range = endAngle - startAngle;
  // An unscored entity carries composite_score 0.0 as a placeholder, not as a
  // measurement, so it is never plotted: a zero-length arc reads as a
  // confident "measured, and it came out zero".
  const plottedScore =
    unscored || !Number.isFinite(score)
      ? null
      : Math.min(Math.max(score, 0), 1);
  const angle = startAngle + range * (plottedScore ?? 0);

  const arcPath = (from: number, to: number, radius: number) => {
    const x1 = cx + radius * Math.cos(from);
    const y1 = cy + radius * Math.sin(from);
    const x2 = cx + radius * Math.cos(to);
    const y2 = cy + radius * Math.sin(to);
    const largeArc = to - from > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const fillColor = VERDICT_CLASSES[v].gauge;
  const gaugeLabel =
    plottedScore === null
      ? "Risk gauge: no score available"
      : `Risk gauge: ${plottedScore.toFixed(3)}`;

  return (
    <svg width={90} height={66} viewBox="0 0 90 66" aria-label={gaugeLabel}>
      {/* Track */}
      <path
        d={arcPath(startAngle, endAngle, r)}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Fill */}
      {plottedScore !== null && (
        <path
          d={arcPath(startAngle, angle, r)}
          fill="none"
          stroke={fillColor}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}
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
        {plottedScore === null ? "—" : plottedScore.toFixed(3)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Collapsible accordion section
// ---------------------------------------------------------------------------

function Accordion({
  title,
  subtitle,
  badge,
  icon,
  defaultOpen = false,
  isOpen,
  onToggle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
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
        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 flex-wrap">
            {icon}
            <span>{title}</span>
            {badge}
          </span>
          {subtitle && (
            <span className="text-[11px] text-slate-500 font-normal pl-6">
              {subtitle}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
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
  onProvenanceClick,
}: EntityDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [mlRowOpen, setMlRowOpen] = useState(true);
  const [explainView, setExplainView] = useState<"shap" | "attention">("shap");
  const [internalProvenanceOpen, setInternalProvenanceOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  const handleProvenanceOpen = () => {
    if (onProvenanceClick) {
      onProvenanceClick();
    } else {
      setInternalProvenanceOpen(true);
    }
  };

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

  // An address can have transaction telemetry in PostgreSQL and still never
  // have been scored. The backend reports that explicitly via
  // `extra.scored === false` (with `extra.verdict_stored === "UNKNOWN"`) rather
  // than fabricating a verdict — but it still emits composite_score 0.0, which
  // map_verdict() would tier as a real "LOW". Trust the explicit flag, not the
  // numeric placeholder, so the dossier can never present an unassessed wallet
  // as a confirmed low-risk one.
  const isUnscored = data?.evidence_trail.extra?.scored === false;
  const verdict: Verdict = isUnscored ? "UNKNOWN" : toVerdict(data?.verdict);
  const isProvisional = data?.provisional === true;

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
          "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] lg:w-[60vw] h-[100vh] max-w-5xl",
          "flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-drawer overflow-hidden",
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
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-b from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs border border-blue-500/40">
              <Shield className="w-3.5 h-3.5 text-white stroke-[2.2] fill-white/10" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                NTRO Forensic Dossier
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                Classified Investigation Ledger
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 text-[10px] crypto-mono font-medium shadow-2xs">
              ESC
            </kbd>
            <button
              id="drawer-close-btn"
              onClick={onClose}
              aria-label="Close dossier"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-white to-slate-100 border border-slate-300 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.08)] active:shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.2)] active:translate-y-[0.5px] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
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
              {/* Unscored Notice. Deliberately takes precedence over the
                  provisional banner below, whose claim that "anomaly score and
                  rule detections are live" is false for an entity that was
                  never assessed. */}
              {isUnscored && (
                <div
                  id="drawer-unscored-banner"
                  role="status"
                  className="bg-slate-50 border border-slate-300 text-slate-700 rounded-lg p-3.5 flex items-start gap-3"
                >
                  <CircleDashed className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Not Scored
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This address has transaction telemetry but no completed risk
                      assessment, so there is no composite score and no verdict. The
                      component values below are placeholders, not measurements —
                      run a post-ingest scoring pass before relying on any risk
                      conclusion for this wallet.
                    </p>
                  </div>
                </div>
              )}
              {/* Provisional Warning Banner */}
              {isProvisional && !isUnscored && (
                <div
                  id="drawer-provisional-banner"
                  role="status"
                  className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Provisional Analysis
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      This entity was ingested in the current session. SHAP waterfall and GNN
                      subgraph are available only for pre-indexed entities. Anomaly score and
                      rule detections are live.
                    </p>
                  </div>
                </div>
              )}
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

                  {/* Model Provenance Tag (FLEX-3) */}
                  <div className="mt-2 flex items-center">
                    <button
                      id="drawer-model-provenance-btn"
                      onClick={handleProvenanceOpen}
                      className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="View Dual Transformer Model Provenance & Live Benchmark Telemetry"
                    >
                      <Cpu className="w-3 h-3 text-sky-500" />
                      <span>Inference Engine: Dual Transformer (FT-Trans + RGT-4H)</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0 pl-2">
                  <RiskGauge
                    score={data.composite_score}
                    verdict={verdict}
                    unscored={isUnscored}
                  />
                  <span
                    id="drawer-verdict-pill"
                    title={
                      isUnscored
                        ? "No risk assessment was completed for this address"
                        : undefined
                    }
                    className={clsx(
                      "mt-1 px-3 py-0.5 rounded text-xs font-bold tracking-wide",
                      VERDICT_CLASSES[verdict].pill,
                    )}
                  >
                    {verdict}
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
                {/* Co-Spending & FT-Transformer Tabular Anomaly (side-by-side 50% width row with synchronized open/close) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
                  {/* Cluster Co-Spending */}
                  <Accordion
                    title="Cluster Co-Spending Analysis"
                    icon={<Network className="w-4 h-4" />}
                    isOpen={mlRowOpen}
                    onToggle={() => setMlRowOpen((o) => !o)}
                    className="h-full"
                  >
                    <Row
                      label="Cluster ID"
                      value={data.evidence_trail.cluster_id ?? "—"}
                      mono
                      subtitle={isProvisional && data.evidence_trail.cluster_id != null ? "Co-spend heuristic (provisional)" : undefined}
                    />
                    <Row
                      label="Cluster Size"
                      value={data.evidence_trail.cluster_size?.toLocaleString() ?? "—"}
                      mono
                    />
                    <Row
                      label="Seed Wallet Proximity"
                      value={
                        typeof data.evidence_trail.seed_wallet_proximity === "number"
                          ? data.evidence_trail.seed_wallet_proximity.toFixed(4)
                          : typeof data.evidence_trail.extra?.seed_wallet_proximity === "number"
                          ? Number(data.evidence_trail.extra.seed_wallet_proximity).toFixed(4)
                          : "—"
                      }
                      mono
                    />
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

                  {/* FT-Transformer Tabular Anomaly */}
                  <Accordion
                    title="FT-Transformer Tabular Anomaly"
                    subtitle="Multi-Head Self-Attention MSE Reconstruction"
                    badge={
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                        MSE Reconstruction
                      </span>
                    }
                    icon={<Activity className="w-4 h-4 text-sky-600" />}
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
                      tooltip="Tabular reconstruction MSE from FT-Transformer multi-head self-attention"
                    />
                    <Row
                      label="Percentile Rank"
                      value={
                        data.evidence_trail.anomaly_rank_percentile != null
                          ? `${data.evidence_trail.anomaly_rank_percentile.toFixed(1)}%`
                          : "—"
                      }
                      mono
                      tooltip="Empirical anomaly percentile across monitored entities"
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
                      tooltip="Calibrated decision boundary for tabular reconstruction anomaly"
                    />
                  </Accordion>
                </div>

                {/* Mixing & Laundering */}
                <Accordion
                  title="Mixing & Laundering Heuristics"
                  icon={<Layers className="w-4 h-4" />}
                >
                  <Row
                    label="Mixing Detected"
                    value={data.evidence_trail.is_mixing ? "Yes" : "No"}
                    highlight={data.evidence_trail.is_mixing}
                  />
                  <Row
                    label="Peeling Chain"
                    value={data.evidence_trail.is_peeling_chain ? "Detected" : "Not detected"}
                    highlight={data.evidence_trail.is_peeling_chain}
                  />
                  <Row
                    label="Mixing Hops"
                    value={
                      isProvisional
                        ? "—"
                        : (data.evidence_trail.chain_hops != null
                          ? data.evidence_trail.chain_hops
                          : "—")
                    }
                    mono
                    tooltip={isProvisional ? "Requires full Louvain/PageRank rerun" : undefined}
                    subtitle={isProvisional ? "Requires full Louvain/PageRank rerun" : undefined}
                  />
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

                {/* Feature Explainability & Attention */}
                <Accordion
                  title="Feature Explainability & Attention"
                  subtitle="Pairwise transformer cross-attention matrix & 1D SHAP attribution waterfall"
                  icon={<Activity className="w-4 h-4 text-sky-600" />}
                  defaultOpen={isProvisional || data.shap_attributions.length > 0}
                >
                  {data.shap_attributions.length === 0 ? (
                    <div
                      id="shap-provisional-placeholder"
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-200 bg-amber-50/40 rounded-lg text-center"
                    >
                      <p className="text-xs text-slate-600 font-medium max-w-md leading-relaxed">
                        {isProvisional
                          ? "SHAP attribution and attention weights are unavailable for newly ingested provisional entities — run full pipeline retraining to compute."
                          : "No SHAP attribution data available for this entity."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Segmented View Toggle Bar */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">
                          Explainability Mode:
                        </span>
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs shadow-inner">
                          <button
                            type="button"
                            onClick={() => setExplainView("shap")}
                            className={clsx(
                              "flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all duration-150",
                              explainView === "shap"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            )}
                            aria-pressed={explainView === "shap"}
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>SHAP Waterfall</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setExplainView("attention")}
                            className={clsx(
                              "flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all duration-150",
                              explainView === "attention"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            )}
                            aria-pressed={explainView === "attention"}
                          >
                            <Brain className="w-3.5 h-3.5" />
                            <span>Transformer Attention Matrix</span>
                          </button>
                        </div>
                      </div>

                      {/* Smooth View Rendering */}
                      {explainView === "shap" ? (
                        <ShapWaterfall attributions={data.shap_attributions} />
                      ) : (
                        <AttentionHeatmap
                          attentionMatrix={data.attention_matrix}
                          attributions={data.shap_attributions}
                        />
                      )}
                    </div>
                  )}
                </Accordion>

                {/* Topological Subgraph & GNN Explainer */}
                <Accordion
                  title="Topological Subgraph & GNN Explainer"
                  icon={<Network className="w-4 h-4 text-indigo-600" />}
                  defaultOpen={isProvisional || (data.gnn_subgraph != null && data.gnn_subgraph.nodes.length > 0)}
                >
                  {data.gnn_subgraph && data.gnn_subgraph.nodes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>
                          Sub-network Neighbors ({data.gnn_subgraph.nodes.length} nodes, {data.gnn_subgraph.edges.length} edges)
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {data.gnn_subgraph.nodes.map((node) => (
                          <div
                            key={node.id}
                            className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="crypto-mono font-medium text-slate-800 truncate"
                                title={node.id}
                              >
                                {node.label || node.id}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                                {node.node_type}
                              </span>
                            </div>
                            {node.risk_score != null && (
                              <span className="crypto-mono font-bold text-red-600">
                                {node.risk_score.toFixed(3)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-xs py-2">
                      No topological subgraph recorded for this entity
                    </p>
                  )}
                </Accordion>
              </div>
            </div>
          )}
        </div>

        {/* Footer: export actions */}
        {data && (
          <div className="px-5 py-3.5 border-t border-slate-200/90 bg-slate-50/90 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Court-Admissible Evidence Standard (IEA Sec 65B / BSA 2023 Sec 63)</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="drawer-download-dossier-btn"
                onClick={downloadDossier}
                className="flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-md tactile-btn-secondary text-slate-700 text-xs font-semibold cursor-pointer shrink-0"
                title="Download raw JSON telemetry payload"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download JSON</span>
              </button>
              <button
                id="drawer-export-legal-dossier-btn"
                onClick={() => setLegalModalOpen(true)}
                className="flex items-center justify-center gap-2 flex-1 sm:flex-initial px-4 h-9 rounded-md tactile-btn-primary text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-300 stroke-[2.2]" />
                <span>Export Certified Legal Dossier (Sec 65B)</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      <LegalCertificateModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        data={data}
        address={address}
      />

      {!onProvenanceClick && (
        <ModelProvenanceModal
          isOpen={internalProvenanceOpen}
          onClose={() => setInternalProvenanceOpen(false)}
        />
      )}
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
  tooltip,
  subtitle,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  highlight?: boolean;
  tooltip?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5" title={tooltip}>
      <div className="flex flex-col">
        <span className="text-slate-500 text-xs sm:text-sm font-medium">{label}</span>
        {subtitle && (
          <span className="text-[10px] text-amber-600 font-normal">{subtitle}</span>
        )}
      </div>
      <span
        title={tooltip}
        className={clsx(
          "text-xs sm:text-sm font-semibold",
          mono && "crypto-mono",
          highlight ? "text-red-600 font-bold" : "text-slate-800",
          tooltip && "cursor-help underline decoration-dotted decoration-slate-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}
