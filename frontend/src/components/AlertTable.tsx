"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { clsx } from "clsx";
import { Copy, Check, AlertTriangle, Layers, Zap, Search, X, ShieldAlert, Sparkles, Brain, Network, Users } from "lucide-react";
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
// Severity pill styles (tactile defense grade)
// ---------------------------------------------------------------------------

const VERDICT_PILL: Record<Verdict, string> = {
  CRITICAL: "bg-red-50 text-red-700 border border-red-200/90 shadow-2xs",
  HIGH: "bg-orange-50 text-orange-700 border border-orange-200/90 shadow-2xs",
  MEDIUM: "bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs",
  LOW: "bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs",
};

const VERDICT_DOT: Record<Verdict, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-600",
  MEDIUM: "bg-amber-500",
  LOW: "bg-emerald-600",
};

// ---------------------------------------------------------------------------
// Address helper with copy feedback
// ---------------------------------------------------------------------------

function truncateAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function CopyableAddress({ address }: { address: string }) {
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
    <span className="inline-flex items-center gap-1.5 group/addr">
      <span
        className="crypto-mono text-xs font-semibold text-slate-800 tracking-tight select-all"
        title={address}
      >
        {truncateAddr(address)}
      </span>
      <button
        onClick={copy}
        className={clsx(
          "p-1 rounded transition-all",
          copied
            ? "bg-emerald-50 text-emerald-600 opacity-100"
            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-60 group-hover/addr:opacity-100",
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
}

// ---------------------------------------------------------------------------
// Skeleton row loader
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2.5 px-3.5"><div className="h-4.5 w-24 rounded bg-slate-100 animate-pulse" /></td>
      <td className="py-2.5 px-3.5"><div className="h-4 w-32 rounded bg-slate-100 animate-pulse" /></td>
      <td className="py-2.5 px-3.5"><div className="h-4 w-20 rounded bg-slate-100 animate-pulse" /></td>
      <td className="py-2.5 px-3.5"><div className="h-4 w-12 rounded bg-slate-100 animate-pulse" /></td>
      <td className="py-2.5 px-3.5"><div className="h-4 w-18 rounded bg-slate-100 animate-pulse" /></td>
      <td className="py-2.5 px-3.5"><div className="h-4 w-14 rounded bg-slate-100 animate-pulse" /></td>
      <td className="py-2.5 px-3.5"><div className="h-4 w-28 rounded bg-slate-100 animate-pulse" /></td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Laundering Pattern Badge Component
// ---------------------------------------------------------------------------

function LaunderingPatternBadge({ item }: { item: AlertItem }) {
  if (item.is_peeling_chain) {
    return (
      <span
        title="Cascade peeling chain transaction sequence"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200/90 shadow-2xs"
      >
        <Layers className="w-3 h-3 text-orange-600 stroke-[2.2]" />
        <span>{item.chain_hops ?? "?"}‑hop peel</span>
      </span>
    );
  }

  if (item.is_mixing) {
    return (
      <span
        title="Equal-output mixing transaction (CoinJoin)"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs"
      >
        <Zap className="w-3 h-3 text-amber-600 stroke-[2.2]" />
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/90 shadow-2xs"
      >
        <Users className="w-3 h-3 text-indigo-600 stroke-[2.2]" />
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/90 shadow-2xs"
      >
        <Brain className="w-3 h-3 text-purple-600 stroke-[2.2]" />
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200/90 shadow-2xs"
      >
        <Network className="w-3 h-3 text-sky-600 stroke-[2.2]" />
        <span>Graph Contagion</span>
      </span>
    );
  }

  return <span className="text-slate-400 text-xs">—</span>;
}

// ---------------------------------------------------------------------------
// Main Component
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
  const [, setFocusIdx] = useState<number>(-1);
  const [now, setNow] = useState<string>("");
  const tableRef = useRef<HTMLTableElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  // Live Military UTC Clock
  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard navigation (Arrow keys + Enter)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const activeEl = document.activeElement;
        if (!tableRef.current?.contains(activeEl) && activeEl?.tagName !== "BODY") return;
        e.preventDefault();
        setFocusIdx((prev) => {
          const next =
            e.key === "ArrowDown"
              ? Math.min(prev + 1, items.length - 1)
              : Math.max(prev - 1, 0);
          if (items[next]) onSelect(items[next]);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, onSelect]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) onLoadMore();
      },
      { threshold: 0.1 },
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  // Error State Banner
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-slate-50/50">
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mb-3 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-red-600 stroke-[2.2]" />
        </div>
        <p className="text-sm font-bold text-slate-900 mb-1">Surveillance Stream Error</p>
        <p className="text-xs text-slate-500 mb-4 max-w-md crypto-mono bg-white border border-slate-200 rounded p-2">
          {error}
        </p>
        <button
          onClick={onResetFilters}
          className="text-xs px-4 py-2 tactile-btn-primary text-white font-semibold rounded-md shadow-xs cursor-pointer"
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
        <div className="flex flex-col items-center justify-center flex-1 py-20 px-8 text-center bg-white border border-slate-200 rounded-xl shadow-2xs mt-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 mb-1">
            No Matching Alerts in Stream
          </p>
          <p className="text-xs text-slate-500 mb-5 max-w-sm">
            No monitored wallet entities match your active filters or search criteria.
          </p>
          <button
            onClick={onResetFilters}
            id="alerts-reset-filters-btn"
            className="text-xs px-4 py-2 tactile-btn-primary text-white font-semibold rounded-md shadow-xs cursor-pointer"
          >
            Clear All Active Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      {/* Search Bar strip */}
      <div className="px-4 py-2 border-b border-slate-200/90 bg-white">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          inputRef={searchRef}
        />
      </div>

      {/* Main Alert Data Grid */}
      <div className="overflow-auto flex-1">
        <table
          ref={tableRef}
          className="w-full text-xs border-collapse"
          aria-label="Bitcoin Alert Surveillance Table"
          tabIndex={0}
        >
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200/90 shadow-2xs">
              {[
                { name: "Risk Verdict", width: "w-36" },
                { name: "Entity Address", width: "w-52" },
                { name: "Anomaly Score", width: "w-36" },
                { name: "Cluster Partition", width: "w-24" },
                { name: "Laundering Pattern", width: "w-32" },
                { name: "Intelligence Seed", width: "w-28" },
                { name: "Telemetry Timestamp", width: "w-40" },
              ].map(({ name, width }) => (
                <th
                  key={name}
                  className={clsx(
                    "py-2 px-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap select-none",
                    width,
                  )}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Skeleton rows during initial fetch */}
            {isLoading && items.length === 0
              ? Array.from({ length: 14 }).map((_, i) => <SkeletonRow key={i} />)
              : items.map((item, idx) => {
                  const isSelected = item.address === selectedAddress;
                  const verdict = item.verdict as Verdict;
                  const anomalyScore = item.anomaly_score ?? 0;
                  // Non-linear proportional scale (preserves visual discrimination from 0.1 to 50+)
                  const anomalyIntensity = Math.min(100, Math.max(6, Math.round((Math.log10(anomalyScore + 1) / 1.7) * 100)));

                  return (
                    <tr
                      key={item.address}
                      id={`alert-row-${idx}`}
                      onClick={() => {
                        setFocusIdx(idx);
                        onSelect(item);
                      }}
                      className={clsx(
                        "group cursor-pointer transition-colors duration-75",
                        isSelected
                          ? "bg-sky-50/80 border-l-2 border-l-sky-600 font-medium"
                          : "hover:bg-slate-50/80 border-l-2 border-l-transparent",
                      )}
                    >
                      {/* Risk Verdict */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-bold tracking-tight shadow-2xs",
                            VERDICT_PILL[verdict],
                          )}
                        >
                          <span
                            className={clsx(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              VERDICT_DOT[verdict],
                            )}
                          />
                          <span>{verdict}</span>
                          <span className="crypto-mono font-black text-[10.5px] opacity-90 ml-0.5">
                            {item.composite_score.toFixed(3)}
                          </span>
                        </span>
                      </td>

                      {/* Address */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <CopyableAddress address={item.address} />
                      </td>

                      {/* Anomaly Score with inline spark indicator */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Micro severity spark bar */}
                          <div
                            className="w-12 h-1.5 rounded-full bg-slate-200/70 overflow-hidden shrink-0"
                            title={`Anomaly score: ${anomalyScore.toFixed(4)}`}
                          >
                            <div
                              className={clsx(
                                "h-full rounded-full transition-all",
                                anomalyScore >= 10.0
                                  ? "bg-red-600"
                                  : anomalyScore >= 3.0
                                  ? "bg-orange-500"
                                  : anomalyScore >= 1.0
                                  ? "bg-amber-500"
                                  : "bg-sky-500",
                              )}
                              style={{ width: `${anomalyIntensity}%` }}
                            />
                          </div>
                          <span className="crypto-mono text-xs font-semibold text-slate-800">
                            {item.anomaly_score != null
                              ? item.anomaly_score.toFixed(4)
                              : "—"}
                          </span>
                          {item.anomaly_rank_percentile != null && (
                            <span className="crypto-mono text-[10px] text-slate-400 font-medium">
                              {item.anomaly_rank_percentile.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cluster Partition */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        {item.cluster_id != null ? (
                          <span className="crypto-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold shadow-2xs">
                            #{item.cluster_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Mixing / Pattern Flag */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <LaunderingPatternBadge item={item} />
                      </td>

                      {/* Seed status */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        {item.is_seed ? (
                          <span className="inline-flex items-center gap-1 crypto-mono text-[10.5px] px-1.5 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {item.seed_family
                              ? item.seed_family.slice(0, 16)
                              : "SEED"}
                          </span>
                        ) : (
                          <span className="crypto-mono text-[11px] text-slate-400 font-medium">
                            Clean
                          </span>
                        )}
                      </td>

                      {/* Telemetry timestamp */}
                      <td className="py-2 px-3.5 whitespace-nowrap">
                        <span className="crypto-mono text-[11px] text-slate-600 font-medium">
                          {item.ts
                            ? item.ts.replace("T", " ").slice(0, 16) + " UTC"
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <tr ref={sentinelRef}>
                <td colSpan={7} className="py-3 px-4 text-center bg-slate-50/50">
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 crypto-mono">
                      <span className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      Streaming next telemetry partition…
                    </span>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Operator Status Footer */}
      <div className="h-9 px-4 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between shrink-0 select-none text-[11px]">
        <div className="flex items-center gap-2 text-slate-600 crypto-mono">
          <span className="font-semibold text-slate-900">
            {items.length.toLocaleString()}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900">
            {total.toLocaleString()}
          </span>{" "}
          entities loaded
        </div>

        {/* Live Military SYS UTC Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-slate-200/90 bg-white text-slate-600 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            SYS UTC
          </span>
          <span className="crypto-mono text-xs text-slate-700 font-semibold">{now}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search Bar Sub-component
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
        placeholder="Search by Bitcoin address prefix… (/ or Ctrl+K)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tactile-input w-full h-8 pl-8.5 pr-14 text-xs rounded-md crypto-mono font-medium placeholder:font-normal placeholder:text-slate-400"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded hover:bg-slate-100 cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="absolute right-2.5 pointer-events-none hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] text-slate-400 crypto-mono">
          <span>Ctrl K</span>
        </div>
      )}
    </div>
  );
}
