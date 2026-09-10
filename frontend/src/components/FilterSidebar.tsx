"use client";

import React from "react";
import { clsx } from "clsx";
import { X, Layers, Zap, Hash, Check } from "lucide-react";

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
    activeCard: "verdict-tile-3d-critical font-bold text-red-950",
    unselectedCard: "verdict-tile-3d-unselected text-slate-800",
    unselectedDot: "led-3d-critical",
    activeDot: "led-3d-critical ring-2 ring-red-300",
    isPulsing: true,
  },
  HIGH: {
    activeCard: "verdict-tile-3d-high font-bold text-orange-950",
    unselectedCard: "verdict-tile-3d-unselected text-slate-800",
    unselectedDot: "led-3d-high",
    activeDot: "led-3d-high ring-2 ring-orange-300",
  },
  MEDIUM: {
    activeCard: "verdict-tile-3d-medium font-bold text-amber-950",
    unselectedCard: "verdict-tile-3d-unselected text-slate-800",
    unselectedDot: "led-3d-medium",
    activeDot: "led-3d-medium ring-2 ring-amber-300",
  },
  LOW: {
    activeCard: "verdict-tile-3d-low font-bold text-emerald-950",
    unselectedCard: "verdict-tile-3d-unselected text-slate-800",
    unselectedDot: "led-3d-low",
    activeDot: "led-3d-low ring-2 ring-emerald-300",
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
    <aside className="w-[280px] shrink-0 flex flex-col bg-white border-r border-slate-200/90 overflow-y-auto select-none">
      <div className="flex flex-col gap-4.5 p-3.5 pb-24">
        {/* Coverage Gauge / Stream Telemetry Card with 3D Enclosure */}
        <div className="card-3d p-3.5 rounded-xl">
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              <span
                className={clsx(
                  "inline-flex rounded-full h-2.5 w-2.5 shrink-0 ring-1",
                  hasActiveFilters
                    ? "led-3d-high ring-sky-200"
                    : "led-3d-low ring-emerald-200",
                )}
              />
              <span className="text-[10px] uppercase font-extrabold tracking-[0.1em] text-slate-700 whitespace-nowrap">
                Stream Telemetry
              </span>
            </div>
            <span
              className={clsx(
                "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md crypto-mono shrink-0",
                hasActiveFilters
                  ? "badge-3d-active font-bold"
                  : "badge-3d text-slate-600",
              )}
            >
              {hasActiveFilters ? `${activeFilterCount} Active` : "Unfiltered"}
            </span>
          </div>

          {/* 3D Recessed Dual-tone gradient progress bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-200/90 p-0.5 border border-slate-300/80 shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.9)] overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.7)]"
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
            <span
              className={clsx(
                "font-extrabold rounded-md px-2 py-0.5 tabular-nums text-[11px]",
                coveragePercent === 100
                  ? "badge-3d text-emerald-800 border-emerald-300"
                  : "badge-3d-active",
              )}
            >
              {coveragePercent}%
            </span>
          </div>
        </div>

        {/* Risk Verdict Filter Matrix */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
            <span>Risk Verdict</span>
            {filters.verdicts.size > 0 && (
              <span className="badge-3d-active text-[10px] font-bold px-2 py-0.5 rounded-md crypto-mono">
                {filters.verdicts.size} selected
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Verdict[]).map((v) => {
              const active = filters.verdicts.has(v);
              const cfg = VERDICT_CONFIG[v];
              return (
                <button
                  key={v}
                  id={`filter-verdict-${v.toLowerCase()}`}
                  onClick={() => toggleVerdict(v)}
                  className={clsx(
                    "flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer border select-none",
                    active ? cfg.activeCard : cfg.unselectedCard,
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {active && cfg.isPulsing ? (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 led-3d-critical ring-2 ring-red-200" />
                      </span>
                    ) : (
                      <span
                        className={clsx(
                          "w-2.5 h-2.5 rounded-full shrink-0 transition-all",
                          active ? cfg.activeDot : cfg.unselectedDot,
                        )}
                      />
                    )}
                    <span
                      className={clsx(
                        "font-bold tracking-tight text-xs",
                        active ? "text-current" : "text-slate-800",
                      )}
                    >
                      {v}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "crypto-mono text-[11px] px-2.5 py-0.5 rounded-md tabular-nums transition-all font-semibold",
                        active
                          ? v === "CRITICAL"
                            ? "counter-3d-critical font-bold"
                            : v === "HIGH"
                              ? "counter-3d-high font-bold"
                              : v === "MEDIUM"
                                ? "counter-3d-medium font-bold"
                                : "counter-3d-low font-bold"
                          : "counter-3d-unselected",
                      )}
                    >
                      {verdictCounts[v].toLocaleString()}
                    </span>
                    {active && <Check className="w-4 h-4 text-current stroke-[2.8]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Min Anomaly Score Range Slider & Presets */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
            <span>Min Anomaly Score</span>
            <span className="crypto-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200/90 rounded px-1.5 py-0.5 shadow-2xs">
              ≥ {filters.minAnomaly.toFixed(2)}
            </span>
          </div>

          <div className="px-1 py-1">
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
                  "--slider-track-bg": `linear-gradient(to right, #2563eb 0%, #2563eb ${filters.minAnomaly * 100}%, #e2e8f0 ${filters.minAnomaly * 100}%, #e2e8f0 100%)`,
                } as React.CSSProperties
              }
              className="w-full custom-slider cursor-pointer"
              aria-label="Minimum anomaly score threshold"
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 crypto-mono mt-1 px-1 font-medium select-none">
            <span>0.00</span>
            <span>0.25</span>
            <span>0.50</span>
            <span>0.75</span>
            <span>1.00</span>
          </div>

          {/* Quick Presets Segmented Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-100/90 border border-slate-200/90 mt-2.5 shadow-inner">
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
                    "py-1 rounded text-[10.5px] crypto-mono transition-all cursor-pointer text-center flex items-center justify-center gap-1 active:scale-95",
                    isSelected
                      ? "bg-gradient-to-b from-blue-600 to-indigo-700 text-white font-bold shadow-xs border border-blue-500/40"
                      : "bg-white text-slate-600 font-medium border border-slate-200/70 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-2xs",
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
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2.5">
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
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
            <span>Cluster Partition</span>
            {filters.clusterId && (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/90 rounded px-1.5 py-0.5 crypto-mono">
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
                "px-2 py-0.5 rounded text-[10.5px] crypto-mono border transition-all cursor-pointer active:scale-95",
                filters.clusterId === "516"
                  ? "bg-sky-600 text-white border-sky-600 font-bold shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:text-slate-900 font-semibold shadow-2xs",
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
                "px-2 py-0.5 rounded text-[10.5px] crypto-mono border transition-all cursor-pointer active:scale-95",
                filters.clusterId === "38"
                  ? "bg-sky-600 text-white border-sky-600 font-bold shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:text-slate-900 font-semibold shadow-2xs",
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
        "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
        checked
          ? isOrange
            ? "verdict-tile-3d-high"
            : "verdict-tile-3d-medium"
          : "verdict-tile-3d-unselected",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
        <div
          className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-xs",
            checked
              ? isOrange
                ? "bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-xs border border-orange-600"
                : "bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-xs border border-amber-600"
              : isOrange
                ? "bg-gradient-to-b from-white to-orange-50/80 text-orange-600 border border-orange-200"
                : "bg-gradient-to-b from-white to-amber-50/80 text-amber-600 border border-amber-200",
          )}
        >
          {icon}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {label}
          </span>
          <span className="text-[10.5px] text-slate-500 leading-normal mt-0.5">
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
            "w-9 h-5 rounded-full transition-colors shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.18),0_1px_0_rgba(255,255,255,0.9)] border",
            checked
              ? isOrange
                ? "bg-gradient-to-b from-orange-500 to-orange-600 border-orange-600"
                : "bg-gradient-to-b from-amber-500 to-amber-600 border-amber-600"
              : "bg-slate-200/90 border-slate-300",
          )}
        />
        <div
          className={clsx(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(15,23,42,0.25),inset_0_1px_0_#ffffff] transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </div>
    </label>
  );
}
