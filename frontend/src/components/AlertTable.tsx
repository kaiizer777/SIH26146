"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { clsx } from "clsx";
import {
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Zap,
  Search,
  X,
  ShieldAlert,
  Brain,
  Network,
  Users,
  Clock,
  Radio,
} from "lucide-react";
import type { AlertItem } from "@/lib/api";

type Verdict = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface AlertTableProps {
  items: AlertItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  selectedAddress: string | null;
  onSelect: (item: AlertItem) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onResetFilters: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  searchValue: string;
  onSearchChange: (v: string) => void;
}

// ---------------------------------------------------------------------------
// 3D Severity pill styles (tactile defense grade with painted-light depth)
// ---------------------------------------------------------------------------

const VERDICT_PILL: Record<Verdict, string> = {
  CRITICAL:
    "bg-gradient-to-b from-white via-red-50 to-red-100/95 text-red-950 border border-red-300 shadow-[0_2px_5px_-1px_rgba(220,38,38,0.25),inset_0_1px_0_#ffffff,inset_0_-1px_0_rgba(220,38,38,0.15)]",
  HIGH:
    "bg-gradient-to-b from-white via-orange-50 to-orange-100/95 text-orange-950 border border-orange-300 shadow-[0_2px_5px_-1px_rgba(234,88,12,0.25),inset_0_1px_0_#ffffff,inset_0_-1px_0_rgba(234,88,12,0.15)]",
  MEDIUM:
    "bg-gradient-to-b from-white via-amber-50 to-amber-100/95 text-amber-950 border border-amber-300 shadow-[0_2px_5px_-1px_rgba(202,138,4,0.25),inset_0_1px_0_#ffffff,inset_0_-1px_0_rgba(202,138,4,0.15)]",
  LOW:
    "bg-gradient-to-b from-white via-emerald-50 to-emerald-100/95 text-emerald-950 border border-emerald-300 shadow-[0_2px_5px_-1px_rgba(22,163,74,0.25),inset_0_1px_0_#ffffff,inset_0_-1px_0_rgba(22,163,74,0.15)]",
};

const VERDICT_LED: Record<Verdict, string> = {
  CRITICAL: "led-3d-critical",
  HIGH: "led-3d-high",
  MEDIUM: "led-3d-medium",
  LOW: "led-3d-low",
};

// ---------------------------------------------------------------------------
// Address helper with 3D copy action button
// ---------------------------------------------------------------------------

function truncateAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

const CopyableAddress = memo(function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [address],
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="crypto-mono text-xs font-semibold text-slate-900 tracking-tight select-all px-1.5 py-0.5 rounded bg-slate-100/90 border border-slate-200/80 shadow-[inset_0_1px_1px_rgba(15,23,42,0.04)]"
        title={address}
      >
        {truncateAddr(address)}
      </span>
      <button
        onClick={copy}
        className={clsx(
          "p-1 rounded-md btn-action-3d cursor-pointer shrink-0",
          copied
            ? "bg-gradient-to-b from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-700 shadow-[inset_0_1px_0_#ffffff]"
            : "text-slate-600",
        )}
        aria-label="Copy full address"
        title={copied ? "Copied!" : "Copy address"}
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </span>
  );
});

// ---------------------------------------------------------------------------
// Skeleton row loader with 3D recessed placeholders
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-6 w-28 rounded-md bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 animate-pulse border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]" />
      </td>
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-5 w-32 rounded bg-slate-100 animate-pulse" />
      </td>
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-5 w-24 rounded bg-slate-100 animate-pulse" />
      </td>
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-5 w-14 rounded bg-slate-100 animate-pulse" />
      </td>
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-5 w-24 rounded bg-slate-100 animate-pulse" />
      </td>
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-5 w-16 rounded bg-slate-100 animate-pulse" />
      </td>
      <td className="py-2.5 px-3.5 border-b border-slate-100">
        <div className="h-5 w-32 rounded bg-slate-100 animate-pulse" />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// 3D Laundering Pattern Badge Component
// ---------------------------------------------------------------------------

const LaunderingPatternBadge = memo(function LaunderingPatternBadge({ item }: { item: AlertItem }) {
  if (item.is_peeling_chain) {
    return (
      <span
        title="Cascade peeling chain transaction sequence"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-b from-white via-orange-50 to-orange-100/90 text-orange-950 border border-orange-300 shadow-[0_1.5px_3px_-1px_rgba(234,88,12,0.2),inset_0_1px_0_#ffffff]"
      >
        <Layers className="w-3 h-3 text-orange-600 stroke-[2.3] shrink-0" />
        <span>{item.chain_hops ?? "?"}‑hop peel</span>
      </span>
    );
  }

  if (item.is_mixing) {
    return (
      <span
        title="Equal-output mixing transaction (CoinJoin)"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-b from-white via-amber-50 to-amber-100/90 text-amber-950 border border-amber-300 shadow-[0_1.5px_3px_-1px_rgba(202,138,4,0.2),inset_0_1px_0_#ffffff]"
      >
        <Zap className="w-3 h-3 text-amber-600 stroke-[2.3] shrink-0" />
        <span>CoinJoin</span>
      </span>
    );
  }

  const hasLargeCluster = item.triggered_rules?.some((r) =>
    r.toUpperCase().includes("LARGE_CLUSTER"),
  );
  if (hasLargeCluster) {
    return (
      <span
        title="Multi-entity Sybil clustering heuristic (large cluster size)"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-b from-white via-indigo-50 to-indigo-100/90 text-indigo-950 border border-indigo-300 shadow-[0_1.5px_3px_-1px_rgba(99,102,241,0.2),inset_0_1px_0_#ffffff]"
      >
        <Users className="w-3 h-3 text-indigo-600 stroke-[2.3] shrink-0" />
        <span>Sybil Cluster</span>
      </span>
    );
  }

  const hasHighAnomaly =
    (item.anomaly_score != null && item.anomaly_score >= 1.0) ||
    item.triggered_rules?.some((r) => r.toUpperCase().includes("ANOMALY"));
  if (hasHighAnomaly) {
    return (
      <span
        title="FT-Transformer extreme tabular feature anomaly (behavioral outlier)"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-b from-white via-purple-50 to-purple-100/90 text-purple-950 border border-purple-300 shadow-[0_1.5px_3px_-1px_rgba(168,85,247,0.2),inset_0_1px_0_#ffffff]"
      >
        <Brain className="w-3 h-3 text-purple-600 stroke-[2.3] shrink-0" />
        <span>Behavioral Anomaly</span>
      </span>
    );
  }

  const hasHighRisk =
    (item.risk_score != null && item.risk_score >= 0.7) ||
    item.triggered_rules?.some((r) =>
      r.toUpperCase().includes("HIGH_GRAPH_RISK"),
    );
  if (hasHighRisk) {
    return (
      <span
        title="Relational Graph Transformer high topological contagion"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-b from-white via-sky-50 to-sky-100/90 text-sky-950 border border-sky-300 shadow-[0_1.5px_3px_-1px_rgba(2,132,199,0.2),inset_0_1px_0_#ffffff]"
      >
        <Network className="w-3 h-3 text-sky-600 stroke-[2.3] shrink-0" />
        <span>Graph Contagion</span>
      </span>
    );
  }

  return <span className="text-slate-400 text-xs font-semibold select-none">—</span>;
});

// ---------------------------------------------------------------------------
// 3D Live Clock Component (Isolated state to eliminate 1000ms table re-renders)
// ---------------------------------------------------------------------------

const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-slate-300 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.08),inset_0_1px_0_#ffffff]">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
        SYS UTC
      </span>
      <span className="crypto-mono text-xs text-slate-800 font-bold">{now}</span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Memoized Table Row Component (Prevents 50-row full re-render on selection)
// ---------------------------------------------------------------------------

interface AlertTableRowProps {
  item: AlertItem;
  idx: number;
  isSelected: boolean;
  onSelect: (item: AlertItem) => void;
}

const AlertTableRow = memo(
  function AlertTableRow({
    item,
    idx,
    isSelected,
    onSelect,
  }: AlertTableRowProps) {
    const verdict = item.verdict as Verdict;
    const anomalyScore = item.anomaly_score ?? 0;
    // Anomaly intensity for micro-bar (normalized 0-1)
    const anomalyRatio = Math.min(1, Math.max(0, anomalyScore / 4));

    return (
      <tr
        id={`alert-row-${idx}`}
        onClick={() => onSelect(item)}
        className={clsx(
          "table-row-3d cursor-pointer relative",
          isSelected && "table-row-3d-selected",
        )}
      >
        {/* Risk Verdict with 3D Tactile Pill & LED Bulb */}
        <td className="py-2.5 px-3.5 whitespace-nowrap relative border-b border-slate-100/90">
          {/* Selected Row Left 3D Neon Indicator Light */}
          {isSelected && (
            <div className="absolute left-0 top-1 bottom-1 w-1 rounded-r-md bg-gradient-to-b from-sky-400 to-sky-600 shadow-[0_0_8px_rgba(2,132,199,0.6)]" />
          )}
          <span
            className={clsx(
              "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-tight",
              VERDICT_PILL[verdict],
            )}
          >
            {/* 3D LED Lens */}
            <span
              className={clsx(
                "w-2 h-2 rounded-full shrink-0",
                VERDICT_LED[verdict],
              )}
            />
            <span>{verdict}</span>
            {/* 3D Recessed Score Indicator */}
            <span className="crypto-mono font-extrabold text-[11px] ml-0.5 px-1.5 py-0.5 rounded bg-black/5 text-slate-900 border border-black/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_1px_0_rgba(255,255,255,0.8)]">
              {item.composite_score.toFixed(3)}
            </span>
          </span>
        </td>

        {/* Entity Address */}
        <td className="py-2.5 px-3.5 whitespace-nowrap border-b border-slate-100/90">
          <CopyableAddress address={item.address} />
        </td>

        {/* Anomaly Score with 3D recessed spark channel */}
        <td className="py-2.5 px-3.5 whitespace-nowrap border-b border-slate-100/90">
          <div className="flex items-center gap-2.5">
            {/* 3D Recessed Trench Bar */}
            <div
              className="w-12 h-2 rounded-full bg-slate-200/90 border border-slate-300/80 shadow-[inset_0_1.5px_2.5px_rgba(15,23,42,0.16),0_1px_0_rgba(255,255,255,0.9)] overflow-hidden shrink-0"
              title={`Anomaly score: ${anomalyScore.toFixed(4)}`}
            >
              <div
                className={clsx(
                  "h-full rounded-full transition-[width] duration-300",
                  anomalyScore >= 2.5
                    ? "bg-gradient-to-r from-red-400 to-red-600 shadow-[0_1px_2px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.6)]"
                    : anomalyScore >= 1.0
                    ? "bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_1px_2px_rgba(217,119,6,0.4),inset_0_1px_0_rgba(255,255,255,0.6)]"
                    : "bg-gradient-to-r from-sky-400 to-sky-600 shadow-[0_1px_2px_rgba(2,132,199,0.4),inset_0_1px_0_rgba(255,255,255,0.6)]",
                )}
                style={{ width: `${Math.max(10, anomalyRatio * 100)}%` }}
              />
            </div>
            <span className="crypto-mono text-xs font-bold text-slate-800">
              {item.anomaly_score != null
                ? item.anomaly_score.toFixed(4)
                : "—"}
            </span>
            {item.anomaly_rank_percentile != null && (
              <span className="crypto-mono text-[10px] text-slate-600 font-semibold px-1.5 py-0.5 rounded bg-gradient-to-b from-white to-slate-100 border border-slate-200 shadow-[inset_0_1px_0_#ffffff,0_1px_2px_rgba(15,23,42,0.04)]">
                {item.anomaly_rank_percentile.toFixed(1)}%
              </span>
            )}
          </div>
        </td>

        {/* Cluster Partition with 3D ID Pill */}
        <td className="py-2.5 px-3.5 whitespace-nowrap border-b border-slate-100/90">
          {item.cluster_id != null ? (
            <span className="crypto-mono text-xs px-2.5 py-1 rounded-md bg-gradient-to-b from-white via-slate-50 to-slate-100 border border-slate-300 text-slate-800 font-bold shadow-[0_1.5px_3px_-1px_rgba(15,23,42,0.1),inset_0_1px_0_#ffffff]">
              #{item.cluster_id}
            </span>
          ) : (
            <span className="text-slate-400 text-xs font-semibold select-none">—</span>
          )}
        </td>

        {/* Mixing / Laundering Pattern Flag */}
        <td className="py-2.5 px-3.5 whitespace-nowrap border-b border-slate-100/90">
          <LaunderingPatternBadge item={item} />
        </td>

        {/* Intelligence Seed Status */}
        <td className="py-2.5 px-3.5 whitespace-nowrap border-b border-slate-100/90">
          {item.is_seed ? (
            <span className="crypto-mono text-[11px] px-2.5 py-1 rounded-md bg-gradient-to-b from-white via-red-50 to-red-100/90 text-red-900 border border-red-300 font-extrabold shadow-[0_1.5px_3px_-1px_rgba(220,38,38,0.22),inset_0_1px_0_#ffffff] inline-flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-red-600 animate-pulse stroke-[2.5]" />
              <span>
                {item.seed_family
                  ? item.seed_family.slice(0, 16)
                  : "SEED"}
              </span>
            </span>
          ) : (
            <span className="crypto-mono text-xs px-2.5 py-0.5 rounded-md bg-gradient-to-b from-white to-slate-50 border border-slate-200 text-slate-600 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_#ffffff]">
              Clean
            </span>
          )}
        </td>

        {/* Telemetry Timestamp */}
        <td className="py-2.5 px-3.5 whitespace-nowrap border-b border-slate-100/90">
          <span className="inline-flex items-center gap-1.5 crypto-mono text-xs text-slate-700 font-semibold">
            <Clock className="w-3 h-3 text-slate-400 stroke-[2]" />
            <span>
              {item.ts
                ? item.ts.replace("T", " ").slice(0, 16) + " UTC"
                : "—"}
            </span>
          </span>
        </td>
      </tr>
    );
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.item.address === next.item.address &&
      prev.item.composite_score === next.item.composite_score &&
      prev.item.verdict === next.item.verdict &&
      prev.item.anomaly_score === next.item.anomaly_score &&
      prev.item.cluster_id === next.item.cluster_id &&
      prev.item.is_peeling_chain === next.item.is_peeling_chain &&
      prev.item.is_mixing === next.item.is_mixing &&
      prev.item.is_seed === next.item.is_seed
    );
  },
);

// ---------------------------------------------------------------------------
// Main AlertTable Component
// ---------------------------------------------------------------------------

export default function AlertTable({
  items,
  total,
  isLoading,
  error,
  selectedAddress,
  onSelect,
  onLoadMore,
  hasMore,
  onResetFilters,
  searchRef,
  searchValue,
  onSearchChange,
}: AlertTableProps) {
  const focusIdxRef = useRef<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // Keyboard navigation (Arrow keys + Enter)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const activeEl = document.activeElement;
        if (!tableRef.current?.contains(activeEl) && activeEl?.tagName !== "BODY") return;
        e.preventDefault();
        const prev = focusIdxRef.current;
        const next =
          e.key === "ArrowDown"
            ? Math.min(prev + 1, items.length - 1)
            : Math.max(prev - 1, 0);
        focusIdxRef.current = next;
        if (items[next]) onSelect(items[next]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, onSelect]);

  // Infinite scroll sentinel with rootMargin for seamless pre-fetching
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingRef.current) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: "300px", threshold: 0.01 },
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore]);

  // Error State Banner
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-slate-50/50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-red-50 border border-red-300 flex items-center justify-center mb-3 shadow-[0_4px_12px_-2px_rgba(220,38,38,0.2),inset_0_1px_0_#ffffff]">
          <AlertTriangle className="w-7 h-7 text-red-600 stroke-[2.2]" />
        </div>
        <p className="text-sm font-bold text-slate-900 mb-1">Surveillance Stream Error</p>
        <p className="text-xs text-slate-600 mb-4 max-w-md crypto-mono bg-white border border-slate-300 rounded-lg p-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]">
          {error}
        </p>
        <button
          onClick={onResetFilters}
          className="text-xs px-4 py-2 tactile-btn-primary text-white font-semibold rounded-lg shadow-sm cursor-pointer"
        >
          Reset Filters & Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col flex-1 p-4 bg-slate-50/50">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          inputRef={searchRef}
        />
        <div className="flex flex-col items-center justify-center flex-1 py-20 px-8 text-center bg-gradient-to-b from-white to-slate-50/80 border border-slate-300/80 rounded-2xl shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff] mt-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-slate-100 border border-slate-300 flex items-center justify-center mb-3 text-slate-400 shadow-[0_2px_6px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff]">
            <ShieldAlert className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 mb-1">
            No Matching Alerts in Stream
          </p>
          <p className="text-xs text-slate-500 mb-5 max-w-sm">
            No monitored wallet entities match your active filters or search criteria.
          </p>
          <button
            onClick={onResetFilters}
            id="alerts-reset-filters-btn"
            className="text-xs px-4 py-2 tactile-btn-primary text-white font-semibold rounded-lg shadow-sm cursor-pointer"
          >
            Clear All Active Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50/40">
      {/* 3D Search Bar Header Strip */}
      <div className="px-4 py-2.5 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-[0_1px_3px_rgba(15,23,42,0.04),inset_0_1px_0_#ffffff]">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          inputRef={searchRef}
        />
      </div>

      {/* Main Alert Data Grid Container with Hardware Accelerated Scrolling */}
      <div className="overflow-auto flex-1 relative table-scroll-container">
        <table
          ref={tableRef}
          className="w-full min-w-[1080px] text-xs border-separate border-spacing-0 table-fixed"
          aria-label="Bitcoin Alert Surveillance Table"
          tabIndex={0}
        >
          <thead className="sticky top-0 z-20">
            <tr className="table-header-3d select-none">
              {[
                { name: "Risk Verdict", width: "w-40" },
                { name: "Entity Address", width: "w-52" },
                { name: "Anomaly Score", width: "w-40" },
                { name: "Cluster Partition", width: "w-28" },
                { name: "Laundering Pattern", width: "w-36" },
                { name: "Intelligence Seed", width: "w-32" },
                { name: "Telemetry Timestamp", width: "w-44" },
              ].map(({ name, width }) => (
                <th
                  key={name}
                  className={clsx(
                    "py-3 px-4 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 whitespace-nowrap border-b border-slate-300/90 border-r border-slate-200/70 last:border-r-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                    width,
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {/* Skeleton rows during initial fetch */}
            {isLoading && items.length === 0
              ? Array.from({ length: 14 }).map((_, i) => <SkeletonRow key={i} />)
              : items.map((item, idx) => (
                  <AlertTableRow
                    key={item.address}
                    item={item}
                    idx={idx}
                    isSelected={item.address === selectedAddress}
                    onSelect={onSelect}
                  />
                ))}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <tr ref={sentinelRef}>
                <td colSpan={7} className="py-3 px-4 text-center bg-slate-50/50 border-b border-slate-100">
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 crypto-mono">
                      <span className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      Streaming next telemetry partition…
                    </span>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3D Operator Status Footer */}
      <div className="h-10 px-4 border-t border-slate-300/90 bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-200/90 shadow-[inset_0_1px_0_#ffffff] flex items-center justify-between shrink-0 select-none text-[11px]">
        <div className="flex items-center gap-2 text-slate-600 crypto-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_#ffffff]">
            <span className="font-extrabold text-slate-900">
              {items.length.toLocaleString()}
            </span>{" "}
            <span className="text-slate-400 font-normal">of</span>{" "}
            <span className="font-extrabold text-slate-900">
              {total.toLocaleString()}
            </span>{" "}
            <span className="text-slate-500 font-medium">entities loaded</span>
          </div>
        </div>

        {/* Live Military SYS UTC 3D Clock Box */}
        <LiveClock />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3D Search Bar Sub-component with Physical Keycaps
// ---------------------------------------------------------------------------

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function SearchBar({ value, onChange, inputRef }: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full group">
      <div className="absolute left-3 text-slate-400 group-focus-within:text-sky-600 pointer-events-none flex items-center transition-colors">
        <Search className="w-3.5 h-3.5 stroke-[2.2]" />
      </div>
      <input
        ref={inputRef}
        id="alerts-search-input"
        type="text"
        placeholder="Search by Bitcoin address prefix…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tactile-input w-full h-9 pl-9 pr-24 text-xs rounded-lg crypto-mono font-medium placeholder:font-normal placeholder:text-slate-400 border border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)]"
      />
      <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
        {value ? (
          <button
            onClick={() => onChange("")}
            className="pointer-events-auto text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="kbd-3d">/</span>
            <span className="kbd-3d">Ctrl+K</span>
          </div>
        )}
      </div>
    </div>
  );
}

