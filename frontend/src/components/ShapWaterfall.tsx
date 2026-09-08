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

const ROW_HEIGHT = 30;
const LEFT_LABEL_W = 260;
const BAR_AREA_W = 440;
const PADDING_V = 16;
const PADDING_H = 24;
const BAR_HEIGHT = 20;
const VALUE_LABEL_SPACE = 52;

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
  const maxBarW = BAR_AREA_W / 2 - VALUE_LABEL_SPACE;

  return (
    <div className="w-full overflow-x-auto flex flex-col items-center sm:items-start">
      <div className="relative inline-block">
        <svg
          width={totalW}
          height={chartH}
          viewBox={`0 0 ${totalW} ${chartH}`}
          className="block"
          aria-label="SHAP feature attribution waterfall chart"
        >
          {/* Zero reference line */}
          <line
            x1={zeroX}
            y1={PADDING_V - 2}
            x2={zeroX}
            y2={chartH - PADDING_V + 2}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="3,2"
          />

          {/* Axis labels */}
          <text
            x={LEFT_LABEL_W + 8}
            y={PADDING_V - 3}
            fontSize={11}
            fontWeight={500}
            fill="#64748b"
            fontFamily="monospace"
          >
            ← Benign
          </text>
          <text
            x={zeroX + 8}
            y={PADDING_V - 3}
            fontSize={11}
            fontWeight={500}
            fill="#64748b"
            fontFamily="monospace"
          >
            Illicit →
          </text>

          {sorted.map((attr, i) => {
            const y = PADDING_V + i * ROW_HEIGHT;
            const barW = (Math.abs(attr.value) / maxAbs) * maxBarW;
            const positive = attr.value > 0;

            const barX = positive ? zeroX : zeroX - barW;
            const barFill = positive ? "#dc2626" : "#16a34a";
            const labelFill = positive ? "#b91c1c" : "#15803d";

            return (
              <g key={attr.feature}>
                {/* Feature label */}
                <text
                  x={LEFT_LABEL_W - 8}
                  y={y + ROW_HEIGHT / 2}
                  textAnchor="end"
                  fontSize={13}
                  fontWeight={500}
                  fill="#334155"
                  dominantBaseline="middle"
                >
                  {attr.label.length > 34
                    ? attr.label.slice(0, 33) + "…"
                    : attr.label}
                </text>

                {/* Bar */}
                <rect
                  x={barX}
                  y={y + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                  width={Math.max(barW, 2)}
                  height={BAR_HEIGHT}
                  fill={barFill}
                  rx={3}
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
                  x={positive ? barX + barW + 5 : barX - 5}
                  y={y + ROW_HEIGHT / 2}
                  textAnchor={positive ? "start" : "end"}
                  fontSize={11.5}
                  fontWeight={600}
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
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 px-1">
        <span className="flex items-center gap-2 text-[12px] text-slate-700 font-medium">
          <span className="w-4 h-2.5 rounded bg-red-600 inline-block shrink-0" />
          Illicit push (positive)
        </span>
        <span className="flex items-center gap-2 text-[12px] text-slate-700 font-medium">
          <span className="w-4 h-2.5 rounded bg-emerald-600 inline-block shrink-0" />
          Benign pull (negative)
        </span>
      </div>
    </div>
  );
}
