"use client";

import { clsx } from "clsx";
import { X, RotateCcw } from "lucide-react";

type Verdict = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface VerdictCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

interface Filters {
  verdicts: Set<Verdict>;
  minAnomaly: number;
  isPeelingChain: boolean;
  isCoinJoin: boolean;
  clusterId: string;
}

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  filteredCount: number;
  totalCount: number;
  verdictCounts: VerdictCounts;
}

const VERDICT_STYLES: Record<Verdict, string> = {
  CRITICAL: "pill-critical",
  HIGH: "pill-high",
  MEDIUM: "pill-medium",
  LOW: "pill-low",
};

const VERDICT_INDICATOR: Record<Verdict, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-600",
  MEDIUM: "bg-yellow-600",
  LOW: "bg-emerald-600",
};

export default function FilterSidebar({
  filters,
  onChange,
  filteredCount,
  totalCount,
  verdictCounts,
}: FilterSidebarProps) {
  const toggleVerdict = (v: Verdict) => {
    const next = new Set(filters.verdicts);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange({ ...filters, verdicts: next });
  };

  const resetAll = () =>
    onChange({
      verdicts: new Set(),
      minAnomaly: 0,
      isPeelingChain: false,
      isCoinJoin: false,
      clusterId: "",
    });

  const hasActiveFilters =
    filters.verdicts.size > 0 ||
    filters.minAnomaly > 0 ||
    filters.isPeelingChain ||
    filters.isCoinJoin ||
    filters.clusterId !== "";

  return (
    <aside className="w-[260px] shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-100 sticky top-0 z-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Filters
        </span>
        {hasActiveFilters && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 transition-colors"
            aria-label="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Counter */}
        <div className="text-xs text-slate-500 crypto-mono">
          Showing{" "}
          <span className="font-semibold text-slate-800">{filteredCount.toLocaleString()}</span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span>{" "}
          entities
        </div>

        {/* Risk Verdict */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Risk Verdict
          </label>
          <div className="flex flex-col gap-1.5">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Verdict[]).map((v) => {
              const active = filters.verdicts.has(v);
              return (
                <button
                  key={v}
                  id={`filter-verdict-${v.toLowerCase()}`}
                  onClick={() => toggleVerdict(v)}
                  className={clsx(
                    "flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs font-medium border transition-all",
                    active
                      ? VERDICT_STYLES[v]
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "w-2 h-2 rounded-full shrink-0",
                        active ? VERDICT_INDICATOR[v] : "bg-slate-300",
                      )}
                    />
                    {v}
                  </span>
                  <span className="crypto-mono text-[11px] opacity-70">
                    {verdictCounts[v].toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Anomaly Threshold Slider */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            <span>Min Anomaly Score</span>
            <span className="crypto-mono text-slate-700 normal-case tracking-normal">
              {filters.minAnomaly.toFixed(2)}
            </span>
          </label>
          <input
            id="filter-anomaly-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={filters.minAnomaly}
            onChange={(e) =>
              onChange({ ...filters, minAnomaly: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-sky-600 cursor-pointer"
            aria-label="Minimum anomaly score threshold"
          />
          <div className="flex justify-between text-[10px] text-slate-400 crypto-mono mt-1">
            <span>0.00</span>
            <span>0.50</span>
            <span>1.00</span>
          </div>
        </div>

        {/* Heuristic Toggles */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Heuristics
          </label>
          <div className="flex flex-col gap-2">
            <Toggle
              id="filter-peeling-chain"
              label="Peeling Chains Only"
              checked={filters.isPeelingChain}
              onChange={(v) => onChange({ ...filters, isPeelingChain: v })}
            />
            <Toggle
              id="filter-coinjoin"
              label="CoinJoin Mixing Only"
              checked={filters.isCoinJoin}
              onChange={(v) => onChange({ ...filters, isCoinJoin: v })}
            />
          </div>
        </div>

        {/* Cluster ID Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Cluster ID
          </label>
          <div className="relative">
            <input
              id="filter-cluster-id"
              type="text"
              placeholder="e.g. 14"
              value={filters.clusterId}
              onChange={(e) => onChange({ ...filters, clusterId: e.target.value })}
              className="w-full h-7 px-2.5 pr-7 text-xs border border-slate-200 rounded bg-slate-50 text-slate-800 crypto-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            />
            {filters.clusterId && (
              <button
                onClick={() => onChange({ ...filters, clusterId: "" })}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear cluster ID"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Toggle sub-component
// ---------------------------------------------------------------------------

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2.5 cursor-pointer select-none"
    >
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={clsx(
            "w-8 h-4 rounded-full transition-colors",
            checked ? "bg-sky-600" : "bg-slate-200",
          )}
        />
        <div
          className={clsx(
            "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </div>
      <span className="text-xs text-slate-600">{label}</span>
    </label>
  );
}
