"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { ShapAttribution } from "@/lib/api";

interface ShapWaterfallProps {
  attributions: ShapAttribution[];
}

// ---------------------------------------------------------------------------
// Tooltip state
// ---------------------------------------------------------------------------

interface Tooltip {
  x: number;
  y: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Chart dimensions
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 24;
const LEFT_LABEL_W = 200;
const BAR_AREA_W = 220;
const PADDING_V = 12;
const PADDING_H = 16;

export default function ShapWaterfall({ attributions }: ShapWaterfallProps) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Sort by |value| descending, take top 14
  const sorted = useMemo(
    () =>
      [...attributions]
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 14),
    [attributions],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-slate-400 crypto-mono">
        No SHAP data available for this entity
      </div>
    );
  }

  const maxAbs = Math.max(...sorted.map((a) => Math.abs(a.value)), 0.0001);

  const chartH = sorted.length * ROW_HEIGHT + PADDING_V * 2;
  const totalW = LEFT_LABEL_W + BAR_AREA_W + PADDING_H;

  // Zero-line at center of BAR_AREA
  const zeroX = LEFT_LABEL_W + BAR_AREA_W / 2;

  return (
    <div className="relative overflow-x-auto">
      <svg
        width={totalW}
        height={chartH}
        viewBox={`0 0 ${totalW} ${chartH}`}
        className="w-full"
        aria-label="SHAP feature attribution waterfall chart"
      >
        {/* Zero reference line */}
        <line
          x1={zeroX}
          y1={PADDING_V}
          x2={zeroX}
          y2={chartH - PADDING_V}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="3,2"
        />

        {/* Axis labels */}
        <text
          x={LEFT_LABEL_W + 4}
          y={PADDING_V - 2}
          fontSize={10}
          fill="#64748b"
          fontFamily="monospace"
        >
          ← Benign
        </text>
        <text
          x={zeroX + 4}
          y={PADDING_V - 2}
          fontSize={10}
          fill="#64748b"
          fontFamily="monospace"
        >
          Illicit →
        </text>

        {sorted.map((attr, i) => {
          const y = PADDING_V + i * ROW_HEIGHT;
          const barW =
            (Math.abs(attr.value) / maxAbs) * (BAR_AREA_W / 2 - 4);
          const positive = attr.value > 0;

          const barX = positive ? zeroX : zeroX - barW;
          const barFill = positive ? "#dc2626" : "#16a34a";
          const labelFill = positive ? "#b91c1c" : "#15803d";

          return (
            <g key={attr.feature}>
              {/* Feature label */}
              <text
                x={LEFT_LABEL_W - 6}
                y={y + ROW_HEIGHT / 2 + 1}
                textAnchor="end"
                fontSize={12}
                fill="#334155"
                dominantBaseline="middle"
              >
                {attr.label.length > 26
                  ? attr.label.slice(0, 25) + "…"
                  : attr.label}
              </text>

              {/* Bar */}
              <rect
                x={barX}
                y={y + 4}
                width={Math.max(barW, 2)}
                height={ROW_HEIGHT - 8}
                fill={barFill}
                rx={2}
                className="transition-opacity hover:opacity-80 cursor-crosshair"
                onMouseEnter={(e) => {
                  const svgRect = (
                    e.currentTarget.closest("svg") as SVGSVGElement
                  ).getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - svgRect.left + 8,
                    y: e.clientY - svgRect.top - 28,
                    text: `${positive ? "+" : ""}${attr.value.toFixed(5)} towards Anomaly Verdict`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Value label */}
              <text
                x={positive ? barX + barW + 3 : barX - 3}
                y={y + ROW_HEIGHT / 2 + 1}
                textAnchor={positive ? "start" : "end"}
                fontSize={10.5}
                fill={labelFill}
                dominantBaseline="middle"
                fontFamily="monospace"
              >
                {positive ? "+" : ""}
                {attr.value.toFixed(4)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 px-2.5 py-1.5 rounded-md text-xs bg-slate-900 text-slate-100 pointer-events-none crypto-mono shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2.5 px-1">
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3.5 h-2 rounded bg-red-600 inline-block" />
          Illicit push (positive)
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3.5 h-2 rounded bg-emerald-600 inline-block" />
          Benign pull (negative)
        </span>
      </div>
    </div>
  );
}
