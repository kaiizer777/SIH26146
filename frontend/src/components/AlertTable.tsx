"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { clsx } from "clsx";
import { Copy, Check, AlertTriangle, Layers, Zap } from "lucide-react";
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
// Severity styles
// ---------------------------------------------------------------------------

const VERDICT_PILL: Record<Verdict, string> = {
  CRITICAL: "pill-critical",
  HIGH: "pill-high",
  MEDIUM: "pill-medium",
  LOW: "pill-low",
};

const VERDICT_DOT: Record<Verdict, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-600",
  MEDIUM: "bg-yellow-600",
  LOW: "bg-emerald-600",
};

// ---------------------------------------------------------------------------
// Address helpers
// ---------------------------------------------------------------------------

function truncateAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
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
    <span className="inline-flex items-center gap-1 group/addr">
      <span
        className="crypto-mono text-xs text-slate-800"
        title={address}
      >
        {truncateAddr(address)}
      </span>
      <button
        onClick={copy}
        className="opacity-0 group-hover/addr:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
        aria-label="Copy full address"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[40, 120, 60, 50, 60, 60, 90].map((w, i) => (
        <td key={i} className="py-2 px-3">
          <div
            className="h-3.5 rounded bg-slate-100 animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
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
  const tableRef = useRef<HTMLTableElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const activeEl = document.activeElement;
        // Only intercept if focus is on table or its children
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

  // Error banner
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <p className="text-sm font-semibold text-slate-800 mb-1">Failed to load alerts</p>
        <p className="text-xs text-slate-500 mb-4 crypto-mono">{error}</p>
        <button
          onClick={onResetFilters}
          className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
        >
          Retry Request
        </button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {/* Search bar still visible */}
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          inputRef={searchRef}
        />
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-8 text-center bg-slate-100 rounded-lg">
          <p className="text-sm font-semibold text-slate-700 mb-1">
            No matching alerts found
          </p>
          <p className="text-xs text-slate-500 mb-4">
            No wallets match the active filters.
          </p>
          <button
            onClick={onResetFilters}
            id="alerts-reset-filters-btn"
            className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search bar */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          inputRef={searchRef}
        />
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table
          ref={tableRef}
          className="w-full text-xs border-collapse"
          aria-label="Alert table"
          tabIndex={0}
        >
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b border-slate-200">
              {[
                "Risk Verdict",
                "Entity Address",
                "Anomaly Score",
                "Cluster",
                "Mixing",
                "Seed",
                "Observed",
              ].map((col) => (
                <th
                  key={col}
                  className="py-2 px-3 text-left font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Skeleton rows on initial load */}
            {isLoading && items.length === 0
              ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
              : items.map((item, idx) => {
                  const isSelected = item.address === selectedAddress;
                  const verdict = item.verdict as Verdict;

                  return (
                    <tr
                      key={item.address}
                      id={`alert-row-${idx}`}
                      onClick={() => {
                        setFocusIdx(idx);
                        onSelect(item);
                      }}
                      className={clsx(
                        "border-b border-slate-100 cursor-pointer transition-colors",
                        isSelected
                          ? "bg-sky-50/70 border-l-4 border-l-sky-600"
                          : "hover:bg-slate-50/80 border-l-4 border-l-transparent",
                      )}
                    >
                      {/* Risk Verdict */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold",
                            VERDICT_PILL[verdict],
                          )}
                        >
                          <span
                            className={clsx(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              VERDICT_DOT[verdict],
                            )}
                          />
                          {verdict}
                          <span className="opacity-80">
                            {item.composite_score.toFixed(3)}
                          </span>
                        </span>
                      </td>

                      {/* Address */}
                      <td className="py-2 px-3">
                        <CopyableAddress address={item.address} />
                      </td>

                      {/* Anomaly Score */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="crypto-mono text-xs text-slate-800">
                          {item.anomaly_score != null
                            ? item.anomaly_score.toFixed(4)
                            : "—"}
                        </span>
                        {item.anomaly_rank_percentile != null && (
                          <span className="ml-1 crypto-mono text-[10px] text-slate-600">
                            {item.anomaly_rank_percentile.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Cluster ID */}
                      <td className="py-2 px-3">
                        {item.cluster_id != null ? (
                          <span className="crypto-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 font-medium">
                            #{item.cluster_id}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Mixing Flag */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {item.is_peeling_chain ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-orange-100/70 text-orange-900 border border-orange-300">
                            <Layers className="w-3 h-3 text-orange-800" />
                            {item.chain_hops ?? "?"}‑hop
                          </span>
                        ) : item.is_mixing ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100/70 text-amber-900 border border-amber-300">
                            <Zap className="w-3 h-3 text-amber-800" />
                            CoinJoin
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Seed */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {item.is_seed ? (
                          <span className="crypto-mono text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 font-semibold">
                            {item.seed_family
                              ? item.seed_family.slice(0, 18)
                              : "SEED"}
                          </span>
                        ) : (
                          <span className="crypto-mono text-xs text-slate-800">Clean</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="crypto-mono text-xs text-slate-800">
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
                <td colSpan={7} className="py-2 px-3 text-center">
                  {isLoading ? (
                    <span className="text-xs text-slate-400">Loading more…</span>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 shrink-0">
        <span className="crypto-mono text-[11px] text-slate-500">
          {items.length.toLocaleString()} of {total.toLocaleString()} entities
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search bar sub-component
// ---------------------------------------------------------------------------

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function SearchBar({ value, onChange, inputRef }: SearchBarProps) {
  return (
    <input
      ref={inputRef}
      id="alerts-search-input"
      type="text"
      placeholder="Search by address prefix… (/ or Ctrl+K)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 px-3 text-xs border border-slate-200 rounded bg-slate-50 text-slate-800 crypto-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
    />
  );
}
