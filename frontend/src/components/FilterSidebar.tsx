"use client";

import React from "react";
import { clsx } from "clsx";
import { Filter, RotateCcw, X, Layers, Zap, Hash, Check } from "lucide-react";

export type Verdict = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface VerdictCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface Filters {
  verdicts: Set<Verdict>;
  minAnomaly: number;
  isPeelingChain: boolean;
  isCoinJoin: boolean;
  clusterId: string;
}

export interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  filteredCount: number;
  totalCount: number;
  verdictCounts: VerdictCounts;
}

interface VerdictVisualConfig {
  activeCard: string;
  unselectedCard: string;
  unselectedDot: string;
  activeDot: string;
  isPulsing?: boolean;
}

const VERDICT_CONFIG: Record<Verdict, VerdictVisualConfig> = {
  CRITICAL: {
    activeCard: "bg-red-50/90 border-red-200 text-red-900 font-bold shadow-2xs ring-1 ring-red-300",
    unselectedCard:
      "bg-white border-slate-200/90 text-slate-700 hover:border-red-200 hover:bg-red-50/30 shadow-2xs",
    unselectedDot: "bg-red-500/80 ring-1.5 ring-red-200/60",
    activeDot: "bg-red-600 ring-1.5 ring-red-300",
    isPulsing: true,
  },
  HIGH: {
    activeCard: "bg-orange-50/90 border-orange-200 text-orange-900 font-bold shadow-2xs ring-1 ring-orange-300",
    unselectedCard:
      "bg-white border-slate-200/90 text-slate-700 hover:border-orange-200 hover:bg-orange-50/30 shadow-2xs",
    unselectedDot: "bg-orange-500/80 ring-1.5 ring-orange-200/60",
    activeDot: "bg-orange-600 ring-1.5 ring-orange-300",
  },
  MEDIUM: {
    activeCard: "bg-amber-50/90 border-amber-200 text-amber-900 font-bold shadow-2xs ring-1 ring-amber-300",
    unselectedCard:
      "bg-white border-slate-200/90 text-slate-700 hover:border-amber-200 hover:bg-amber-50/30 shadow-2xs",
    unselectedDot: "bg-amber-500/80 ring-1.5 ring-amber-200/60",
    activeDot: "bg-amber-500 ring-1.5 ring-amber-300",
  },
  LOW: {
    activeCard: "bg-emerald-50/90 border-emerald-200 text-emerald-900 font-bold shadow-2xs ring-1 ring-emerald-300",
    unselectedCard:
      "bg-white border-slate-200/90 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30 shadow-2xs",
    unselectedDot: "bg-emerald-500/80 ring-1.5 ring-emerald-200/60",
    activeDot: "bg-emerald-600 ring-1.5 ring-emerald-300",
  },
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
    <aside className="w-[272px] shrink-0 flex flex-col bg-white border-r border-slate-200/90 overflow-y-auto select-none">
      {/* Sidebar Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-slate-200/90 bg-slate-50/90 sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs shrink-0">
            <Filter className="w-2.5 h-2.5 text-sky-700 stroke-[2.4]" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-900 truncate">
            Surveillance Filters
          </span>
          {hasActiveFilters && (
            <span className="flex items-center justify-center px-1.5 h-4 rounded-full bg-sky-600 text-white text-[9px] font-extrabold shadow-xs crypto-mono shrink-0">
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAll}
            className="tactile-btn-secondary flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 transition-all py-0.5 px-2 rounded border border-slate-200 shadow-2xs active:scale-95 group cursor-pointer shrink-0"
            aria-label="Reset all filters"
          >
            <RotateCcw className="w-2.5 h-2.5 text-slate-500 group-hover:text-slate-800 group-hover:-rotate-90 transition-transform duration-200" />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3.5 p-3 pb-12">
        {/* Coverage Gauge / Stream Telemetry Card */}
        <div className="p-3 rounded-lg border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={clsx(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    hasActiveFilters ? "bg-sky-400" : "bg-emerald-400",
                  )}
                />
                <span
                  className={clsx(
                    "relative inline-flex rounded-full h-2 w-2 ring-1.5",
                    hasActiveFilters
                      ? "bg-sky-500 ring-sky-200"
                      : "bg-emerald-500 ring-emerald-200",
                  )}
                />
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-[0.14em] text-slate-600">
                Stream Telemetry
              </span>
            </div>
            <span
              className={clsx(
                "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border crypto-mono",
                hasActiveFilters
                  ? "bg-sky-50 text-sky-700 border-sky-200 shadow-2xs"
                  : "bg-slate-100 text-slate-500 border-slate-200/90",
              )}
            >
              {hasActiveFilters ? `${activeFilterCount} Active` : "Unfiltered"}
            </span>
          </div>

          {/* Dual-tone gradient progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-200/80 p-0.5 border border-slate-300/40 overflow-hidden shadow-inner mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 transition-all duration-300 shadow-xs"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] crypto-mono">
            <div className="text-slate-500 text-[10.5px]">
              Scope:{" "}
              <span className="font-bold text-slate-900 tabular-nums">
                {filteredCount.toLocaleString()}
              </span>{" "}
              /{" "}
              <span className="text-slate-600 tabular-nums">
                {totalCount.toLocaleString()}
              </span>
            </div>
            <span className="font-extrabold text-slate-800 bg-white border border-slate-200/90 rounded px-1.5 py-0.5 shadow-2xs tabular-nums text-[11px]">
              {coveragePercent}%
            </span>
          </div>
        </div>

        {/* Risk Verdict Filter Matrix */}
        <div>
          <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            <span>Risk Verdict</span>
            {filters.verdicts.size > 0 && (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.2 rounded crypto-mono">
                {filters.verdicts.size} selected
              </span>
            )}
          </label>
          <div className="flex flex-col gap-1.5">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Verdict[]).map((v) => {
              const active = filters.verdicts.has(v);
              const cfg = VERDICT_CONFIG[v];
              return (
                <button
                  key={v}
                  id={`filter-verdict-${v.toLowerCase()}`}
                  onClick={() => toggleVerdict(v)}
                  className={clsx(
                    "flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border",
                    active ? cfg.activeCard : cfg.unselectedCard,
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {active && cfg.isPulsing ? (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 ring-2 ring-red-200" />
                      </span>
                    ) : (
                      <span
                        className={clsx(
                          "w-2 h-2 rounded-full shrink-0 transition-all",
                          active ? cfg.activeDot : cfg.unselectedDot,
                        )}
                      />
                    )}
                    <span
                      className={clsx(
                        "font-semibold tracking-tight",
                        active ? "text-current" : "text-slate-800",
                      )}
                    >
                      {v}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "crypto-mono text-[11px] px-1.5 py-0.5 rounded tabular-nums transition-colors",
                        active
                          ? "bg-white text-slate-900 border border-current/20 font-bold shadow-2xs"
                          : "bg-slate-100 text-slate-600 border border-slate-200/70 font-medium",
                      )}
                    >
                      {verdictCounts[v].toLocaleString()}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-current stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Min Anomaly Score Range Slider & Presets */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            <span>Min Anomaly Score</span>
            <span className="crypto-mono text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200/90 rounded px-1.5 py-0.5 shadow-2xs">
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
              style={
                {
                  "--slider-track-bg": `linear-gradient(to right, #0284c7 0%, #0284c7 ${filters.minAnomaly * 100}%, #e2e8f0 ${filters.minAnomaly * 100}%, #e2e8f0 100%)`,
                } as React.CSSProperties
              }
              className="w-full custom-slider cursor-pointer"
              aria-label="Minimum anomaly score threshold"
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 crypto-mono mt-1.5 px-1 font-medium">
            <span>0.00</span>
            <span>0.25</span>
            <span>0.50</span>
            <span>0.75</span>
            <span>1.00</span>
          </div>

          {/* Quick Presets Segmented Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200/80 mt-2.5">
            {[
              { label: "All", val: 0 },
              { label: "0.25", val: 0.25 },
              { label: "0.50", val: 0.5 },
              { label: "0.75", val: 0.75 },
            ].map(({ label, val }) => {
              const isSelected = filters.minAnomaly === val;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...filters, minAnomaly: val })}
                  className={clsx(
                    "py-1 rounded text-[10.5px] crypto-mono transition-all cursor-pointer text-center flex items-center justify-center gap-1",
                    isSelected
                      ? "bg-sky-600 text-white font-bold shadow-xs border border-sky-600"
                      : "bg-white text-slate-600 font-medium border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-2xs",
                  )}
                >
                  {isSelected && (
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Laundering Heuristics */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5">
            Laundering Heuristics
          </label>
          <div className="flex flex-col gap-2">
            <HeuristicToggle
              id="filter-peeling-chain"
              icon={<Layers className="w-4 h-4" />}
              iconVariant="orange"
              label="Peeling Chains"
              subtitle="Linear multi-hop peel transfers"
              checked={filters.isPeelingChain}
              onChange={(v) => onChange({ ...filters, isPeelingChain: v })}
            />
            <HeuristicToggle
              id="filter-coinjoin"
              icon={<Zap className="w-4 h-4" />}
              iconVariant="amber"
              label="CoinJoin Mixing"
              subtitle="Equal-output mixing rounds"
              checked={filters.isCoinJoin}
              onChange={(v) => onChange({ ...filters, isCoinJoin: v })}
            />
          </div>
        </div>

        {/* Cluster Partition Input & Quick Seed Chips */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            <span>Cluster Partition</span>
            {filters.clusterId && (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/90 rounded px-1.5 py-0.2 crypto-mono">
                #{filters.clusterId}
              </span>
            )}
          </div>
          <div className="relative group">
            <div
              className={clsx(
                "absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none",
                filters.clusterId
                  ? "text-sky-600"
                  : "text-slate-400 group-focus-within:text-sky-600",
              )}
            >
              <Hash className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <input
              id="filter-cluster-id"
              type="text"
              placeholder="e.g. 516 or 38"
              value={filters.clusterId}
              onChange={(e) =>
                onChange({ ...filters, clusterId: e.target.value.trim() })
              }
              className="tactile-input w-full h-8.5 pl-8 pr-7 text-xs rounded-md text-slate-900 crypto-mono font-semibold placeholder:font-normal placeholder:text-slate-400"
            />
            {filters.clusterId && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, clusterId: "" })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                aria-label="Clear cluster ID"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick-select seed partition chips */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Seeds:
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  clusterId: filters.clusterId === "516" ? "" : "516",
                })
              }
              className={clsx(
                "px-2 py-0.5 rounded text-[10.5px] crypto-mono border transition-all cursor-pointer",
                filters.clusterId === "516"
                  ? "bg-sky-50 text-sky-700 border-sky-300 font-bold shadow-2xs"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300 font-medium",
              )}
            >
              #516 Prime
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  clusterId: filters.clusterId === "38" ? "" : "38",
                })
              }
              className={clsx(
                "px-2 py-0.5 rounded text-[10.5px] crypto-mono border transition-all cursor-pointer",
                filters.clusterId === "38"
                  ? "bg-sky-50 text-sky-700 border-sky-300 font-bold shadow-2xs"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300 font-medium",
              )}
            >
              #38 Core
            </button>
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
  iconVariant: "orange" | "amber";
  label: string;
  subtitle: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

function HeuristicToggle({
  id,
  icon,
  iconVariant,
  label,
  subtitle,
  checked,
  onChange,
}: HeuristicToggleProps) {
  const isOrange = iconVariant === "orange";

  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none",
        checked
          ? isOrange
            ? "bg-orange-50/70 border-orange-300 shadow-2xs ring-1 ring-orange-200/60"
            : "bg-amber-50/70 border-amber-300 shadow-2xs ring-1 ring-amber-200/60"
          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
        <div
          className={clsx(
            "w-6.5 h-6.5 rounded-md flex items-center justify-center shrink-0 transition-colors",
            checked
              ? isOrange
                ? "bg-orange-500 text-white shadow-xs"
                : "bg-amber-500 text-white shadow-xs"
              : isOrange
                ? "bg-orange-50 text-orange-600 border border-orange-200/70"
                : "bg-amber-50 text-amber-600 border border-amber-200/70",
          )}
        >
          {icon}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-800 leading-tight">
            {label}
          </span>
          <span className="text-[10px] text-slate-400 leading-normal">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="relative shrink-0">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={clsx(
            "w-7.5 h-4 rounded-full transition-colors",
            checked
              ? isOrange
                ? "bg-orange-500 shadow-xs"
                : "bg-amber-500 shadow-xs"
              : "bg-slate-200",
          )}
        />
        <div
          className={clsx(
            "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-xs transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0",
          )}
        />
      </div>
    </label>
  );
}
