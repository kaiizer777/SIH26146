"use client";

import { clsx } from "clsx";
import { Filter, RotateCcw, X, Layers, Zap, Hash, Check } from "lucide-react";

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
  CRITICAL: "pill-critical ring-1 ring-red-400/50 font-bold",
  HIGH: "pill-high ring-1 ring-orange-400/50 font-bold",
  MEDIUM: "pill-medium ring-1 ring-yellow-400/50 font-bold",
  LOW: "pill-low ring-1 ring-emerald-400/50 font-bold",
};

const VERDICT_INDICATOR: Record<Verdict, string> = {
  CRITICAL: "bg-red-600 ring-2 ring-red-200",
  HIGH: "bg-orange-600 ring-2 ring-orange-200",
  MEDIUM: "bg-amber-500 ring-2 ring-amber-200",
  LOW: "bg-emerald-600 ring-2 ring-emerald-200",
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

  const activeFilterCount =
    filters.verdicts.size +
    (filters.minAnomaly > 0 ? 1 : 0) +
    (filters.isPeelingChain ? 1 : 0) +
    (filters.isCoinJoin ? 1 : 0) +
    (filters.clusterId !== "" ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;
  const coveragePercent =
    totalCount > 0 ? Math.min(100, Math.round((filteredCount / totalCount) * 100)) : 100;

  return (
    <aside className="w-[270px] shrink-0 flex flex-col bg-white border-r border-slate-200/90 overflow-y-auto select-none">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 bg-slate-50/80 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Surveillance Filters
          </span>
          {hasActiveFilters && (
            <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-sky-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800 transition-colors py-0.5 px-1.5 rounded hover:bg-sky-50"
            aria-label="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Coverage Gauge Card */}
        <div className="p-3 rounded-lg border border-slate-200/90 bg-slate-50/60 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="text-[10.5px] uppercase font-semibold tracking-wider text-slate-400">
              Matched Scope
            </span>
            <span className="crypto-mono text-xs font-bold text-slate-800">
              {coveragePercent}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
            <div
              className="h-full bg-sky-600 rounded-full transition-all duration-300"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <div className="text-[11.5px] text-slate-600 crypto-mono">
            Showing <span className="font-bold text-slate-900">{filteredCount.toLocaleString()}</span> of{" "}
            <span className="text-slate-500">{totalCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Risk Verdict Filter */}
        <div>
          <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            <span>Risk Verdict</span>
            {filters.verdicts.size > 0 && (
              <span className="text-[10px] font-semibold text-sky-600 normal-case tracking-normal">
                {filters.verdicts.size} selected
              </span>
            )}
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
                    "flex items-center justify-between w-full px-3 py-2 rounded-md text-xs font-medium border transition-all cursor-pointer",
                    active
                      ? VERDICT_STYLES[v]
                      : "bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "w-2 h-2 rounded-full shrink-0 transition-all",
                        active ? VERDICT_INDICATOR[v] : "bg-slate-300",
                      )}
                    />
                    <span className="font-semibold">{v}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        "crypto-mono text-[11px] px-1.5 py-0.5 rounded",
                        active
                          ? "bg-white/80 font-bold"
                          : "bg-slate-100 text-slate-500 border border-slate-200/60 font-medium",
                      )}
                    >
                      {verdictCounts[v].toLocaleString()}
                    </span>
                    {active && <Check className="w-3 h-3 text-current stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Min Anomaly Score Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            <span>Min Anomaly Score</span>
            <span className="crypto-mono text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
              ≥ {filters.minAnomaly.toFixed(2)}
            </span>
          </div>

          <div className="px-1">
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
              className="w-full custom-slider"
              aria-label="Minimum anomaly score threshold"
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 crypto-mono mt-1.5 px-1">
            <span>0.00</span>
            <span>0.25</span>
            <span>0.50</span>
            <span>0.75</span>
            <span>1.00</span>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-1 mt-2.5">
            {[
              { label: "All", val: 0 },
              { label: "0.25", val: 0.25 },
              { label: "0.50", val: 0.5 },
              { label: "0.75", val: 0.75 },
            ].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => onChange({ ...filters, minAnomaly: val })}
                className={clsx(
                  "py-1 rounded text-[10px] crypto-mono font-medium border transition-colors cursor-pointer text-center",
                  filters.minAnomaly === val
                    ? "bg-sky-600 text-white border-sky-600 shadow-2xs font-semibold"
                    : "bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-white hover:border-slate-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Heuristic Toggles */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5">
            Laundering Heuristics
          </label>
          <div className="flex flex-col gap-2">
            <HeuristicToggle
              id="filter-peeling-chain"
              icon={<Layers className="w-3.5 h-3.5 text-orange-600" />}
              label="Peeling Chains Only"
              subtitle="Linear multi-hop peel transfers"
              checked={filters.isPeelingChain}
              onChange={(v) => onChange({ ...filters, isPeelingChain: v })}
            />
            <HeuristicToggle
              id="filter-coinjoin"
              icon={<Zap className="w-3.5 h-3.5 text-amber-600" />}
              label="CoinJoin Mixing Only"
              subtitle="Equal-output mixing rounds"
              checked={filters.isCoinJoin}
              onChange={(v) => onChange({ ...filters, isCoinJoin: v })}
            />
          </div>
        </div>

        {/* Cluster ID Search */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            Cluster Partition
          </label>
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <input
              id="filter-cluster-id"
              type="text"
              placeholder="e.g. 14 or 9"
              value={filters.clusterId}
              onChange={(e) => onChange({ ...filters, clusterId: e.target.value })}
              className="w-full h-8 pl-8 pr-7 text-xs border border-slate-200/90 rounded-md bg-white text-slate-800 crypto-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 shadow-2xs"
            />
            {filters.clusterId && (
              <button
                onClick={() => onChange({ ...filters, clusterId: "" })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
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
// Enhanced Heuristic Toggle Sub-component
// ---------------------------------------------------------------------------

interface HeuristicToggleProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

function HeuristicToggle({
  id,
  icon,
  label,
  subtitle,
  checked,
  onChange,
}: HeuristicToggleProps) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex items-start justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none",
        checked
          ? "bg-sky-50/60 border-sky-200 shadow-2xs"
          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50",
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 pr-2">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-800 leading-tight">
            {label}
          </span>
          <span className="text-[10.5px] text-slate-400 leading-normal mt-0.5">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="relative shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={clsx(
            "w-8 h-4.5 rounded-full transition-colors",
            checked ? "bg-sky-600" : "bg-slate-200",
          )}
        />
        <div
          className={clsx(
            "absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0",
          )}
        />
      </div>
    </label>
  );
}
