"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { clsx } from "clsx";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Pause,
  Play,
  Maximize2,
  Search,
  X,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  Network,
  Globe,
  Radio,
  Filter,
} from "lucide-react";
import type { GraphNode, GraphLink } from "@/lib/api";

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  highlightMode: boolean; // true when an entity with GNN data is selected
  isLoading: boolean;
  clusterId: number | null;
  onSelectWallet?: (address: string) => void;
}

// ---------------------------------------------------------------------------
// Types for D3 simulation
// ---------------------------------------------------------------------------

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "wallet" | "transaction" | "ip";
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
// Risk color tokens & gradients
// ---------------------------------------------------------------------------

function getRiskTier(score: number | null, isSeed: boolean): "seed" | "critical" | "high" | "medium" | "low" {
  if (isSeed) return "seed";
  const s = score ?? 0;
  if (s >= 0.8) return "critical";
  if (s >= 0.6) return "high";
  if (s >= 0.4) return "medium";
  return "low";
}

function riskFill(tier: string): string {
  switch (tier) {
    case "seed":
      return "url(#grad-seed)";
    case "critical":
      return "url(#grad-critical)";
    case "high":
      return "url(#grad-high)";
    case "medium":
      return "url(#grad-medium)";
    default:
      return "url(#grad-low)";
  }
}

function riskStrokeColor(tier: string): string {
  switch (tier) {
    case "seed":
      return "#dc2626";
    case "critical":
      return "#b91c1c";
    case "high":
      return "#c2410c";
    case "medium":
      return "#ca8a04";
    default:
      return "#059669";
  }
}

// ---------------------------------------------------------------------------
// Main Top-Tier Graph Component
// ---------------------------------------------------------------------------

export default function GraphCanvas({
  nodes,
  links,
  highlightMode,
  isLoading,
  clusterId,
  onSelectWallet,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // States
  const [frozen, setFrozen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [nodeFilter, setNodeFilter] = useState<"all" | "high" | "seeds" | "wallets" | "tx" | "ip">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // -------------------------------------------------------------------------
  // Graph Navigation Callbacks
  // -------------------------------------------------------------------------

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

  const fitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;
    const svgEl = svgRef.current;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 600;

    // Compute bounding box from simulation node positions
    const sim = simRef.current;
    if (!sim) return;
    const simNodes = sim.nodes();
    if (simNodes.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    simNodes.forEach((n) => {
      if (n.x != null && n.y != null) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
    });

    if (minX === Infinity) return;

    const graphW = Math.max(maxX - minX + 80, 100);
    const graphH = Math.max(maxY - minY + 80, 100);
    const scale = Math.min(0.9, Math.max(0.2, Math.min(width / graphW, height / graphH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    d3.select(svgEl).transition().duration(500).call(zoomRef.current.transform, transform);
  }, [nodes]);

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

  const copyAddress = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Adjacency for 1-hop highlighting
  // -------------------------------------------------------------------------

  const { adjacency, inOutDegree } = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const degree = new Map<string, { in: number; out: number }>();

    nodes.forEach((n) => {
      adj.set(n.id, new Set<string>());
      degree.set(n.id, { in: 0, out: 0 });
    });

    links.forEach((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as SimNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as SimNode).id;

      if (!adj.has(s)) adj.set(s, new Set());
      if (!adj.has(t)) adj.set(t, new Set());
      adj.get(s)?.add(t);
      adj.get(t)?.add(s);

      const dS = degree.get(s) ?? { in: 0, out: 0 };
      dS.out += 1;
      degree.set(s, dS);

      const dT = degree.get(t) ?? { in: 0, out: 0 };
      dT.in += 1;
      degree.set(t, dT);
    });

    return { adjacency: adj, inOutDegree: degree };
  }, [nodes, links]);

  // -------------------------------------------------------------------------
  // Active focus IDs (hover or click)
  // -------------------------------------------------------------------------

  const activeFocusId = selectedNode?.id ?? hoveredNode?.id ?? null;

  const connectedNodeIds = useMemo(() => {
    if (!activeFocusId) return null;
    const neighbors = adjacency.get(activeFocusId) ?? new Set();
    const set = new Set(neighbors);
    set.add(activeFocusId);
    return set;
  }, [activeFocusId, adjacency]);

  // Filter match set
  const filteredNodeIds = useMemo(() => {
    if (nodeFilter === "all" && !searchQuery.trim()) return null;
    const set = new Set<string>();
    const q = searchQuery.toLowerCase().trim();

    nodes.forEach((n) => {
      let matchesFilter = true;
      if (nodeFilter === "high") matchesFilter = (n.risk_score ?? 0) >= 0.6 || n.is_seed;
      else if (nodeFilter === "seeds") matchesFilter = n.is_seed;
      else if (nodeFilter === "wallets") matchesFilter = n.type === "wallet";
      else if (nodeFilter === "tx") matchesFilter = n.type === "transaction";
      else if (nodeFilter === "ip") matchesFilter = n.type === "ip";

      let matchesSearch = true;
      if (q) matchesSearch = n.id.toLowerCase().includes(q) || Boolean(n.label?.toLowerCase().includes(q));

      if (matchesFilter && matchesSearch) set.add(n.id);
    });

    return set;
  }, [nodes, nodeFilter, searchQuery]);

  // -------------------------------------------------------------------------
  // D3 Rendering & Simulation
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // 1. Defs: Arrowheads, Glow Filters & High-Tech Gradients
    const defs = svg.append("defs");

    // Standard arrow
    defs
      .append("marker")
      .attr("id", "arrow-standard")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3.5L7,0L0,3.5")
      .attr("fill", "#94a3b8");

    // Explanatory cyan arrow
    defs
      .append("marker")
      .attr("id", "arrow-explanatory")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#0284c7");

    // Drop shadow glow filters
    const filterCritical = defs.append("filter").attr("id", "glow-critical").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filterCritical.append("feDropShadow").attr("dx", "0").attr("dy", "0").attr("stdDeviation", "4").attr("flood-color", "#ef4444").attr("flood-opacity", "0.75");

    const filterGnn = defs.append("filter").attr("id", "glow-gnn").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filterGnn.append("feDropShadow").attr("dx", "0").attr("dy", "0").attr("stdDeviation", "5").attr("flood-color", "#0284c7").attr("flood-opacity", "0.9");

    // Radial gradients for dimensional node rendering
    const createRadial = (id: string, c1: string, c2: string) => {
      const g = defs.append("radialGradient").attr("id", id).attr("cx", "35%").attr("cy", "35%").attr("r", "65%");
      g.append("stop").attr("offset", "0%").attr("stop-color", c1);
      g.append("stop").attr("offset", "100%").attr("stop-color", c2);
    };

    createRadial("grad-seed", "#f87171", "#b91c1c");
    createRadial("grad-critical", "#fca5a5", "#dc2626");
    createRadial("grad-high", "#fdba74", "#ea580c");
    createRadial("grad-medium", "#fef08a", "#ca8a04");
    createRadial("grad-low", "#86efac", "#15803d");

    // Root container
    const g = svg.append("g").attr("class", "graph-root");

    // Click background to deselect
    svg.on("click", (e) => {
      if (e.target.tagName === "svg" || e.target.classList.contains("dot-matrix-bg")) {
        setSelectedNode(null);
      }
    });

    // Zoom & Pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    if (nodes.length === 0) return;

    // Simulation Data Prep
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

    // Links Layer
    const linkSel = g
      .append("g")
      .attr("class", "links-layer")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => (d.is_explanatory ? "#0284c7" : "#cbd5e1"))
      .attr("stroke-width", (d) => {
        const base = d.is_explanatory ? 2.5 : 1.2;
        const amtFactor = d.amount ? Math.max(1, Math.log10(d.amount + 1) * 0.4) : 1;
        return base * amtFactor;
      })
      .attr("stroke-opacity", 0.65)
      .attr("marker-end", (d) => (d.is_explanatory ? "url(#arrow-explanatory)" : "url(#arrow-standard)"));

    // Nodes Layer
    const nodeSel = g
      .append("g")
      .attr("class", "nodes-layer")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("class", "node-group")
      .style("cursor", "pointer");

    // -----------------------------------------------------------------------
    // Wallet Nodes (Dimensional Circles with Highlight Halo)
    // -----------------------------------------------------------------------
    const walletNodes = nodeSel.filter((d) => d.type === "wallet");

    // Seed Outer Radar Reticle
    walletNodes
      .filter((d) => d.is_seed)
      .append("circle")
      .attr("r", (d) => 10 + (d.risk_score ?? 0) * 6 + 6)
      .attr("fill", "none")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.85);

    // Wallet core circle
    walletNodes
      .append("circle")
      .attr("r", (d) => {
        const base = 8;
        const riskBoost = (d.risk_score ?? 0) * 6;
        return base + riskBoost;
      })
      .attr("fill", (d) => riskFill(getRiskTier(d.risk_score, d.is_seed)))
      .attr("stroke", (d) => riskStrokeColor(getRiskTier(d.risk_score, d.is_seed)))
      .attr("stroke-width", 1.8)
      .attr("filter", (d) => ((d.risk_score ?? 0) >= 0.8 || d.is_seed ? "url(#glow-critical)" : null));

    // Inner highlight ring for 3D look
    walletNodes
      .append("circle")
      .attr("r", (d) => {
        const base = 6;
        const riskBoost = (d.risk_score ?? 0) * 5;
        return Math.max(3, base + riskBoost);
      })
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.45)")
      .attr("stroke-width", 1);

    // -----------------------------------------------------------------------
    // Transaction Nodes (Modern Microchips)
    // -----------------------------------------------------------------------
    const txNodes = nodeSel.filter((d) => d.type === "transaction");
    txNodes
      .append("rect")
      .attr("x", -8)
      .attr("y", -8)
      .attr("width", 16)
      .attr("height", 16)
      .attr("rx", 3.5)
      .attr("fill", "#f8fafc")
      .attr("stroke", "#64748b")
      .attr("stroke-width", 1.5)
      .attr("box-shadow", "0 1px 2px rgba(0,0,0,0.1)");

    txNodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "7.5px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#475569")
      .text("tx");

    // -----------------------------------------------------------------------
    // IP Nodes (Cyber Diamonds)
    // -----------------------------------------------------------------------
    const ipNodes = nodeSel.filter((d) => d.type === "ip");
    ipNodes
      .append("polygon")
      .attr("points", "0,-10 10,0 0,10 -10,0")
      .attr("fill", "#f0f9ff")
      .attr("stroke", "#0284c7")
      .attr("stroke-width", 1.8);

    ipNodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "7px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#0369a1")
      .text((d) => d.country?.slice(0, 2).toUpperCase() ?? "IP");

    // -----------------------------------------------------------------------
    // Node Interaction: Hover, Click, Drag
    // -----------------------------------------------------------------------
    nodeSel
      .on("mouseenter", (_, d) => {
        setHoveredNode(d);
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    // Drag behavior
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

    // -----------------------------------------------------------------------
    // Simulation Setup
    // -----------------------------------------------------------------------
    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .alphaDecay(0.04)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(70),
      )
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(22))
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
    };
  }, [nodes, links]);

  // -------------------------------------------------------------------------
  // Dynamic Node & Edge Opacity Updating (Neighborhood & Search Highlighting)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const isFiltered = filteredNodeIds !== null;
    const hasFocus = connectedNodeIds !== null;

    // Update Nodes
    svg.selectAll<SVGGElement, SimNode>(".node-group").each(function (d) {
      let isVisible = true;

      if (isFiltered && !filteredNodeIds.has(d.id)) {
        isVisible = false;
      }
      if (hasFocus && !connectedNodeIds.has(d.id)) {
        isVisible = false;
      }

      d3.select(this)
        .transition()
        .duration(120)
        .attr("opacity", isVisible ? 1 : 0.12)
        .style("transform", d.id === activeFocusId ? "scale(1.2)" : "scale(1)");
    });

    // Update Links
    svg.selectAll<SVGLineElement, SimLink>(".links-layer line").each(function (d) {
      const sId = (d.source as SimNode).id;
      const tId = (d.target as SimNode).id;

      let isConnected = true;
      if (hasFocus) {
        isConnected = sId === activeFocusId || tId === activeFocusId;
      } else if (isFiltered) {
        isConnected = filteredNodeIds.has(sId) && filteredNodeIds.has(tId);
      }

      d3.select(this)
        .transition()
        .duration(120)
        .attr("stroke-opacity", isConnected ? (hasFocus ? 1 : 0.7) : 0.08)
        .attr("stroke-width", isConnected && hasFocus ? (d.is_explanatory ? 4 : 2.5) : (d.is_explanatory ? 2.5 : 1.2))
        .attr("stroke", isConnected && hasFocus ? "#0284c7" : d.is_explanatory ? "#0284c7" : "#cbd5e1");
    });
  }, [activeFocusId, connectedNodeIds, filteredNodeIds]);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-slate-50 select-none">
      {/* ------------------------------------------------------------------- */}
      {/* Top Floating Command Bar: Cluster Partition Info + Quick Filters */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 max-w-[80vw]">
        {/* Cluster Badge */}
        {clusterId != null && (
          <div className="flex items-center gap-2 crypto-mono text-xs text-slate-700 bg-white/95 backdrop-blur-sm border border-slate-200/90 px-3 py-1.5 rounded-lg shadow-card">
            <Network className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-extrabold text-slate-900">Cluster #{clusterId}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">
              {nodes.length} Nodes • {links.length} Edges
            </span>
            {highlightMode && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                GNN HIGHLIGHT
              </span>
            )}
          </div>
        )}

        {/* Quick Node Filter Chips */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5">
            Filter:
          </span>
          {[
            { id: "all", label: "All" },
            { id: "high", label: "High Risk" },
            { id: "seeds", label: "Seeds" },
            { id: "wallets", label: "Wallets" },
            { id: "tx", label: "Txs" },
            { id: "ip", label: "IPs" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setNodeFilter(id as typeof nodeFilter)}
              className={clsx(
                "px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer",
                nodeFilter === id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* In-Graph Address Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search address in graph…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-44 h-7.5 pl-8 pr-6 text-[11px] crypto-mono rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:w-60 focus:ring-1 focus:ring-sky-500 shadow-card transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              aria-label="Clear graph search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Floating Canvas Navigation Toolbar (Top Right) */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 p-1 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-card">
        <ToolButton
          id="graph-zoom-in"
          icon={<ZoomIn className="w-3.5 h-3.5" />}
          label="Zoom in (+)"
          onClick={() => zoomBy(1.4)}
        />
        <ToolButton
          id="graph-zoom-out"
          icon={<ZoomOut className="w-3.5 h-3.5" />}
          label="Zoom out (-)"
          onClick={() => zoomBy(0.7)}
        />
        <ToolButton
          id="graph-fit"
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          label="Fit to Screen"
          onClick={fitToScreen}
        />
        <ToolButton
          id="graph-reset"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          label="Reset View"
          onClick={resetView}
        />
        <ToolButton
          id="graph-freeze"
          icon={frozen ? <Play className="w-3.5 h-3.5 text-sky-600" /> : <Pause className="w-3.5 h-3.5" />}
          label={frozen ? "Resume physics" : "Freeze physics"}
          onClick={toggleFreeze}
          active={frozen}
        />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Bottom Left: Interactive Tactical Legend */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-3 px-3.5 py-2 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-card text-[11px] text-slate-600">
        <button
          onClick={() => setNodeFilter(nodeFilter === "wallets" ? "all" : "wallets")}
          className="flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 inline-block shadow-2xs" />
          <span className="font-semibold text-slate-700">Wallet</span>
        </button>
        <button
          onClick={() => setNodeFilter(nodeFilter === "tx" ? "all" : "tx")}
          className="flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-500 inline-block shadow-2xs" />
          <span className="font-semibold text-slate-700">Tx</span>
        </button>
        <button
          onClick={() => setNodeFilter(nodeFilter === "ip" ? "all" : "ip")}
          className="flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rotate-45 bg-sky-100 border border-sky-600 inline-block shadow-2xs" />
          <span className="font-semibold text-slate-700">IP Host</span>
        </button>
        <button
          onClick={() => setNodeFilter(nodeFilter === "seeds" ? "all" : "seeds")}
          className="flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-red-600 bg-red-100 inline-block shadow-2xs" />
          <span className="font-bold text-red-700">Seed Entity</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Hover Glass HUD Tooltip */}
      {/* ------------------------------------------------------------------- */}
      {hoveredNode && !selectedNode && (
        <div className="absolute top-16 right-3 z-30 pointer-events-none w-72 rounded-xl bg-slate-950/90 text-white backdrop-blur-md border border-slate-700/80 p-3 shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
              {hoveredNode.type.toUpperCase()}
            </span>
            {hoveredNode.is_seed && (
              <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold">
                ILLICIT SEED
              </span>
            )}
          </div>
          <p className="crypto-mono text-xs font-bold text-slate-100 truncate mb-2">
            {hoveredNode.id}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] crypto-mono pt-1.5 border-t border-slate-800">
            <div>
              <span className="text-slate-400">Risk Score:</span>{" "}
              <span className={clsx("font-bold", (hoveredNode.risk_score ?? 0) >= 0.8 ? "text-red-400" : "text-emerald-400")}>
                {hoveredNode.risk_score != null ? hoveredNode.risk_score.toFixed(3) : "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Connections:</span>{" "}
              <span className="font-bold text-slate-200">
                {(inOutDegree.get(hoveredNode.id)?.in ?? 0) + (inOutDegree.get(hoveredNode.id)?.out ?? 0)}
              </span>
            </div>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-2 italic text-right">
            Click node to pin forensic inspector
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Pinned Node Forensic Inspector HUD (Interactive Panel) */}
      {/* ------------------------------------------------------------------- */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 z-30 w-84 rounded-xl bg-white border border-slate-200/90 shadow-drawer p-4 transition-all">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center">
                {selectedNode.type === "wallet" ? (
                  <Activity className="w-3 h-3 text-sky-400" />
                ) : selectedNode.type === "ip" ? (
                  <Globe className="w-3 h-3 text-sky-400" />
                ) : (
                  <Layers className="w-3 h-3 text-sky-400" />
                )}
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                {selectedNode.type} Inspector
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
              aria-label="Close inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Identity & Copy */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 mb-3">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
              <span>Node Identifier</span>
              <button
                onClick={() => copyAddress(selectedNode.id)}
                className="flex items-center gap-1 text-sky-600 hover:text-sky-800"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="crypto-mono text-xs font-bold text-slate-900 break-all select-all">
              {selectedNode.id}
            </p>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Risk Score</span>
              <span
                className={clsx(
                  "crypto-mono text-sm font-extrabold",
                  (selectedNode.risk_score ?? 0) >= 0.8
                    ? "text-red-600"
                    : (selectedNode.risk_score ?? 0) >= 0.5
                    ? "text-amber-600"
                    : "text-emerald-600",
                )}
              >
                {selectedNode.risk_score != null ? selectedNode.risk_score.toFixed(3) : "—"}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cluster Edges</span>
              <span className="crypto-mono text-sm font-extrabold text-slate-800">
                {(inOutDegree.get(selectedNode.id)?.in ?? 0) + (inOutDegree.get(selectedNode.id)?.out ?? 0)}
              </span>
            </div>
          </div>

          {/* Action: Open Forensic Dossier if Wallet */}
          {selectedNode.type === "wallet" && onSelectWallet && (
            <button
              onClick={() => onSelectWallet(selectedNode.id)}
              className="w-full h-8.5 rounded-md tactile-btn-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400 stroke-[2.2]" />
              <span>Inspect Full Forensic Dossier</span>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Loading Overlay */}
      {/* ------------------------------------------------------------------- */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-2xs z-30">
          <div className="flex flex-col items-center gap-2.5 p-5 rounded-xl bg-white border border-slate-200 shadow-card">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-800 crypto-mono">Computing Force Layout…</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nodes.length === 0 && clusterId != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-5 rounded-xl bg-white/95 border border-slate-200 shadow-card text-center">
            <p className="text-xs text-slate-500 crypto-mono">No topology data for cluster #{clusterId}</p>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full flex-1 dot-matrix-bg cursor-grab active:cursor-grabbing"
        aria-label="Force-directed transaction graph"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Button Sub-component
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
        "w-7.5 h-7.5 flex items-center justify-center rounded-md border transition-all cursor-pointer shadow-2xs",
        active
          ? "bg-sky-50 border-sky-300 text-sky-700 shadow-inner"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
      )}
    >
      {icon}
    </button>
  );
}
