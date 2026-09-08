"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { clsx } from "clsx";
import { ZoomIn, ZoomOut, RotateCcw, Pause, Play } from "lucide-react";
import type { GraphNode, GraphLink } from "@/lib/api";

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  highlightMode: boolean; // true when an entity with GNN data is selected
  isLoading: boolean;
  clusterId: number | null;
}

// ---------------------------------------------------------------------------
// Risk tier → fill color
// ---------------------------------------------------------------------------

function riskColor(score: number | null, isSeed: boolean): string {
  if (isSeed) return "#dc2626";
  const s = score ?? 0;
  if (s >= 0.8) return "#fca5a5"; // red-300
  if (s >= 0.6) return "#fdba74"; // orange-300
  if (s >= 0.4) return "#fde047"; // yellow-300
  return "#86efac"; // green-300
}

function riskStroke(score: number | null, isSeed: boolean): string {
  if (isSeed) return "#b91c1c";
  const s = score ?? 0;
  if (s >= 0.8) return "#ef4444";
  if (s >= 0.6) return "#f97316";
  if (s >= 0.4) return "#eab308";
  return "#22c55e";
}

// ---------------------------------------------------------------------------
// Types for D3 simulation
// ---------------------------------------------------------------------------

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  risk_score: number | null;
  anomaly_score: number | null;
  is_seed: boolean;
  country: string | null;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  linkType: string;
  amount: number | null;
  is_explanatory: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GraphCanvas({
  nodes,
  links,
  highlightMode,
  isLoading,
  clusterId,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const [frozen, setFrozen] = useState(false);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, factor);
  }, []);

  const toggleFreeze = useCallback(() => {
    if (!simRef.current) return;
    if (frozen) {
      simRef.current.alphaTarget(0.1).restart();
      setFrozen(false);
    } else {
      simRef.current.stop();
      setFrozen(true);
    }
  }, [frozen]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 400;

    // Defs: arrowheads
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 16)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#cbd5e1");

    defs
      .append("marker")
      .attr("id", "arrowhead-explanatory")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 16)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#0284c7");

    const g = svg.append("g").attr("class", "graph-root");

    // Zoom & pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    if (nodes.length === 0) return;

    // Prepare simulation data
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = links
      .filter((l) => nodeById.has(l.source as string) && nodeById.has(l.target as string))
      .map((l) => ({
        source: nodeById.get(l.source as string)!,
        target: nodeById.get(l.target as string)!,
        linkType: l.type,
        amount: l.amount,
        is_explanatory: l.is_explanatory,
      }));

    // Explanatory node set
    const explanatoryNodeIds = new Set<string>();
    simLinks.forEach((l) => {
      if (l.is_explanatory) {
        explanatoryNodeIds.add((l.source as SimNode).id);
        explanatoryNodeIds.add((l.target as SimNode).id);
      }
    });

    // Links
    const linkSel = g
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => (d.is_explanatory ? "#0284c7" : "#cbd5e1"))
      .attr("stroke-width", (d) => {
        const base = d.is_explanatory ? 3 : 1;
        const amtFactor = d.amount ? Math.max(1, Math.log10(d.amount + 1) * 0.5) : 1;
        return base * amtFactor;
      })
      .attr("stroke-opacity", (d) =>
        highlightMode ? (d.is_explanatory ? 1 : 0.12) : 0.7,
      )
      .attr("marker-end", (d) =>
        d.is_explanatory ? "url(#arrowhead-explanatory)" : "url(#arrowhead)",
      );

    // Node groups
    const nodeSel = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("class", "node")
      .attr("opacity", (d) =>
        highlightMode && !explanatoryNodeIds.has(d.id) ? 0.12 : 1,
      )
      .style("cursor", "pointer");

    // Wallet nodes — circles
    const walletNodes = nodeSel.filter((d) => d.type === "wallet");
    walletNodes
      .append("circle")
      .attr("r", (d) => {
        const base = 8;
        const riskBoost = (d.risk_score ?? 0) * 6;
        return base + riskBoost;
      })
      .attr("fill", (d) => riskColor(d.risk_score, d.is_seed))
      .attr("stroke", (d) => riskStroke(d.risk_score, d.is_seed))
      .attr("stroke-width", 1.5);

    // Seed double-ring
    walletNodes
      .filter((d) => d.is_seed)
      .append("circle")
      .attr("r", (d) => 8 + (d.risk_score ?? 0) * 6 + 5)
      .attr("fill", "none")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,2")
      .attr("opacity", 0.7);

    // Transaction nodes — squares
    nodeSel
      .filter((d) => d.type === "transaction")
      .append("rect")
      .attr("x", -7)
      .attr("y", -7)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", "#f1f5f9")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1.5)
      .attr("rx", 2);

    // IP nodes — diamonds
    const ipNodes = nodeSel.filter((d) => d.type === "ip");
    ipNodes
      .append("polygon")
      .attr("points", "0,-9 9,0 0,9 -9,0")
      .attr("fill", "#e0f2fe")
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 1.5);
    ipNodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "7px")
      .attr("fill", "#0369a1")
      .text((d) => d.country?.slice(0, 2) ?? "?");

    // Hover tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("background", "#0f172a")
      .style("color", "#f1f5f9")
      .style("font-size", "11px")
      .style("font-family", "monospace")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("z-index", "9999")
      .style("max-width", "280px")
      .style("word-break", "break-all");

    nodeSel
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", "1").html(
          `<strong>${d.type.toUpperCase()}</strong><br/>${d.id}<br/>` +
            (d.risk_score != null ? `Risk: ${d.risk_score.toFixed(3)}` : ""),
        );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 8}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      });

    // Drag
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSel.call(drag as never);

    // Simulation
    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .alphaDecay(0.05)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(80),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(20))
      .on("tick", () => {
        linkSel
          .attr("x1", (d) => (d.source as SimNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimNode).y ?? 0);

        nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simRef.current = sim;

    return () => {
      sim.stop();
      tooltip.remove();
    };
  }, [nodes, links, highlightMode]);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Floating controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <ToolButton
          id="graph-zoom-in"
          icon={<ZoomIn className="w-3.5 h-3.5" />}
          label="Zoom in"
          onClick={() => zoomBy(1.4)}
        />
        <ToolButton
          id="graph-zoom-out"
          icon={<ZoomOut className="w-3.5 h-3.5" />}
          label="Zoom out"
          onClick={() => zoomBy(0.7)}
        />
        <ToolButton
          id="graph-reset"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          label="Reset view"
          onClick={resetView}
        />
        <ToolButton
          id="graph-freeze"
          icon={frozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          label={frozen ? "Resume physics" : "Freeze physics"}
          onClick={toggleFreeze}
          active={frozen}
        />
      </div>

      {/* Cluster label */}
      {clusterId != null && (
        <div className="absolute top-3 left-3 z-10 crypto-mono text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded shadow-card">
          Cluster #{clusterId}
          {highlightMode && (
            <span className="ml-2 text-sky-600 font-semibold">GNN Highlight</span>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-20">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Loading graph…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && nodes.length === 0 && clusterId != null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-slate-400 crypto-mono">
            No graph data for cluster #{clusterId}
          </p>
        </div>
      )}

      {!isLoading && clusterId == null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-slate-400">
            Select an alert to render its cluster graph
          </p>
        </div>
      )}

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        className="w-full flex-1 dot-matrix-bg"
        aria-label="Force-directed transaction graph"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

interface ToolButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ToolButton({ id, icon, label, onClick, active }: ToolButtonProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "w-7 h-7 flex items-center justify-center rounded border shadow-card text-slate-600 transition-colors",
        active
          ? "bg-sky-50 border-sky-300 text-sky-700"
          : "bg-white border-slate-200 hover:bg-slate-50",
      )}
    >
      {icon}
    </button>
  );
}
