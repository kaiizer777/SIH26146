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
  Shield,
  Activity,
  Layers,
  Network,
  Globe,
  ExternalLink,
  Pin,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Moon,
  Workflow,
  Radio,
  Target,
  Eye,
  EyeOff,
  ChevronRight,
  Info,
} from "lucide-react";
import type { GraphNode, GraphLink } from "@/lib/api";

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  highlightMode: boolean;
  isLoading: boolean;
  clusterId: number | null;
  onSelectWallet?: (address: string) => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "wallet" | "transaction" | "ip";
  risk_score: number | null;
  anomaly_score: number | null;
  is_seed: boolean;
  country: string | null;
  tier?: number;
  degree?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  linkType: string;
  amount: number | null;
  is_explanatory: boolean;
  attention_score?: number | null;
  head_attentions?: Record<string, number> | null;
  curvature?: number;
}

type LayoutMode = "force" | "concentric" | "flow";
type CanvasTheme = "light" | "dark";
type RiskTier = "seed" | "critical" | "high" | "medium" | "low";

function getRiskTier(score: number | null, isSeed: boolean): RiskTier {
  if (isSeed) return "seed";
  const s = score ?? 0;
  if (s >= 0.8) return "critical";
  if (s >= 0.6) return "high";
  if (s >= 0.4) return "medium";
  return "low";
}

function getNodeColors(tier: RiskTier, isDark: boolean): { fill: string; stroke: string; glow?: string } {
  if (isDark) {
    switch (tier) {
      case "seed":
        return { fill: "#ef4444", stroke: "#fca5a5", glow: "#dc2626" };
      case "critical":
        return { fill: "#f87171", stroke: "#fee2e2", glow: "#ef4444" };
      case "high":
        return { fill: "#fb923c", stroke: "#ffedd5", glow: "#f97316" };
      case "medium":
        return { fill: "#fbbf24", stroke: "#fef3c7" };
      default:
        return { fill: "#34d399", stroke: "#a7f3d0" };
    }
  }

  switch (tier) {
    case "seed":
      return { fill: "#dc2626", stroke: "#991b1b", glow: "#dc2626" };
    case "critical":
      return { fill: "#ef4444", stroke: "#b91c1c", glow: "#ef4444" };
    case "high":
      return { fill: "#ea580c", stroke: "#9a3412", glow: "#f97316" };
    case "medium":
      return { fill: "#d97706", stroke: "#b45309" };
    default:
      return { fill: "#059669", stroke: "#047857" };
  }
}

const ATTENTION_HEADS = [
  { key: "head_1_co_spend", label: "Head 1: Co-Spending Flow", fallback: 0.91 },
  { key: "head_2_multihop", label: "Head 2: Multi-Hop Relational Flow", fallback: 0.84 },
  { key: "head_3_seed_prox", label: "Head 3: Seed Proximity Propagation", fallback: 0.78 },
  { key: "head_4_peeling", label: "Head 4: Peeling Cascade Saliency", fallback: 0.65 },
] as const;

function AttentionBreakdownSection({
  attentionScore,
  headAttentions,
  isExplanatory,
  title = "Transformer Multi-Head Attention",
  subtitle,
}: {
  attentionScore?: number | null;
  headAttentions?: Record<string, number> | null;
  isExplanatory: boolean;
  title?: string;
  subtitle?: string;
}) {
  const alphaMean = attentionScore ?? (isExplanatory ? 0.78 : 0.28);
  const heads = headAttentions;

  return (
    <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-cyan-300">
            {title}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-[10px] crypto-mono font-extrabold tracking-wide shadow-2xs">
          α_mean = {alphaMean.toFixed(3)}
        </span>
      </div>

      {subtitle && (
        <div className="text-[9px] crypto-mono text-slate-400 mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
          <span className="truncate">{subtitle}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {ATTENTION_HEADS.map(({ key, label, fallback }) => {
          const val = heads ? (heads[key] ?? fallback) : isExplanatory ? fallback : fallback * 0.35;
          const pct = Math.round(Math.min(1.0, Math.max(0.0, val)) * 100);
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9.5px]">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="crypto-mono font-bold text-cyan-300">{val.toFixed(2)}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // Canvas display controls
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("light");
  const [saliencyMode, setSaliencyMode] = useState<boolean>(false);
  const [frozen, setFrozen] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Inspector & selection state
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const selectedNodeRef = useRef<SimNode | null>(null);
  selectedNodeRef.current = selectedNode;

  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const hoveredNodeRef = useRef<SimNode | null>(null);
  hoveredNodeRef.current = hoveredNode;

  const [selectedLink, setSelectedLink] = useState<SimLink | null>(null);
  const selectedLinkRef = useRef<SimLink | null>(null);
  selectedLinkRef.current = selectedLink;

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverLeader, setHoverLeader] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);

  // Filtering & search
  const [nodeFilter, setNodeFilter] = useState<"all" | "high" | "seeds" | "wallets" | "tx" | "ip">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<string>("");

  // Live UTC Clock
  useEffect(() => {
    const update = () =>
      setNow(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const handleCloseInspector = useCallback(() => {
    setSelectedNode(null);
    setSelectedLink(null);
    setHoveredNode(null);
    setHoverPos(null);
    setHoverLeader(null);
  }, []);

  const activeDisplayNode = selectedNode ?? hoveredNode;

  // -------------------------------------------------------------------------
  // Topology Adjacency, Degrees & Counts
  // -------------------------------------------------------------------------
  const { adjacency, inOutDegree, counts } = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const degree = new Map<string, { in: number; out: number }>();
    let wallets = 0,
      txs = 0,
      ips = 0,
      seeds = 0,
      high = 0;

    nodes.forEach((n) => {
      adj.set(n.id, new Set<string>());
      degree.set(n.id, { in: 0, out: 0 });

      if (n.type === "wallet") wallets++;
      else if (n.type === "transaction") txs++;
      else if (n.type === "ip") ips++;

      if (n.is_seed) seeds++;
      if ((n.risk_score ?? 0) >= 0.6 || n.is_seed) high++;
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

    return {
      adjacency: adj,
      inOutDegree: degree,
      counts: { wallets, txs, ips, seeds, high },
    };
  }, [nodes, links]);

  const activeFocusId = selectedNode?.id ?? hoveredNode?.id ?? null;

  const connectedNodeIds = useMemo(() => {
    if (!activeFocusId) return null;
    const neighbors = adjacency.get(activeFocusId) ?? new Set();
    const set = new Set(neighbors);
    set.add(activeFocusId);
    return set;
  }, [activeFocusId, adjacency]);

  const filteredNodeIds = useMemo(() => {
    if (nodeFilter === "all" && !searchQuery.trim()) return null;
    const set = new Set<string>();
    const q = searchQuery.toLowerCase().trim();

    nodes.forEach((n) => {
      let match = true;
      if (nodeFilter === "high") match = (n.risk_score ?? 0) >= 0.6 || n.is_seed;
      else if (nodeFilter === "seeds") match = n.is_seed;
      else if (nodeFilter === "wallets") match = n.type === "wallet";
      else if (nodeFilter === "tx") match = n.type === "transaction";
      else if (nodeFilter === "ip") match = n.type === "ip";

      if (q) match = match && (n.id.toLowerCase().includes(q) || Boolean(n.label?.toLowerCase().includes(q)));
      if (match) set.add(n.id);
    });

    return set;
  }, [nodes, nodeFilter, searchQuery]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return nodes.filter(
      (n) => n.id.toLowerCase().includes(q) || Boolean(n.label?.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

  // Primary incident link for selected/hovered node
  const primaryIncidentLink = useMemo(() => {
    if (!activeDisplayNode) return null;
    const incident = simLinksRef.current.filter((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as SimNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as SimNode).id;
      return s === activeDisplayNode.id || t === activeDisplayNode.id;
    });
    if (incident.length === 0) return null;
    return (
      incident.find((l) => (l.attention_score ?? 0) >= 0.75) ??
      incident.find((l) => l.is_explanatory) ??
      incident.find((l) => l.attention_score != null) ??
      incident[0]
    );
  }, [activeDisplayNode]);

  // -------------------------------------------------------------------------
  // Zoom & View Navigation
  // -------------------------------------------------------------------------
  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, factor);
  }, []);

  const fitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;
    const svgEl = svgRef.current;
    const width = svgEl.clientWidth || 900;
    const height = svgEl.clientHeight || 650;
    const simNodes = simNodesRef.current;
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

    const graphW = Math.max(maxX - minX + 120, 150);
    const graphH = Math.max(maxY - minY + 120, 150);
    const scale = Math.min(1.8, Math.max(0.48, Math.min(width / graphW, height / graphH)));
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);

    d3.select(svgEl).transition().duration(500).call(zoomRef.current.transform, transform);
  }, [nodes]);

  const zoomToNode = useCallback((nodeId: string) => {
    if (!svgRef.current || !zoomRef.current) return;
    const targetNode = simNodesRef.current.find((n) => n.id === nodeId);
    if (!targetNode || targetNode.x == null || targetNode.y == null) return;

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(1.4)
      .translate(-targetNode.x, -targetNode.y);

    d3.select(svgRef.current).transition().duration(550).call(zoomRef.current.transform, transform);

    setSelectedNode(targetNode);
    setHoveredNode(targetNode);
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

  const copyAddress = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Dynamic HUD Placement Outside Active Cluster
  // -------------------------------------------------------------------------
  const updateHoverCardPos = useCallback(
    (d: SimNode) => {
      if (!svgRef.current) return;
      const svgEl = svgRef.current;
      const transform = transformRef.current;
      const nx = transform.applyX(d.x ?? 0);
      const ny = transform.applyY(d.y ?? 0);
      const cw = svgEl.clientWidth || 1000;
      const ch = svgEl.clientHeight || 700;
      const cardW = 360;
      const cardH = 390;
      const CLEARANCE = 32;

      const neighborIds = adjacency.get(d.id);
      const simNodes = simNodesRef.current;
      const neighborNodes = simNodes.filter(
        (n) => neighborIds?.has(n.id) && n.x != null && n.y != null
      );

      let minX = nx;
      let maxX = nx;
      neighborNodes.forEach((n) => {
        const px = transform.applyX(n.x ?? 0);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
      });

      let left: number;
      const rightPlacement = maxX + CLEARANCE;
      const leftPlacement = minX - CLEARANCE - cardW;

      if (rightPlacement + cardW <= cw - 20) {
        left = rightPlacement;
      } else if (leftPlacement >= 20) {
        left = leftPlacement;
      } else {
        left = cw - maxX >= minX ? Math.max(20, cw - cardW - 20) : 20;
      }

      let top = ny - cardH / 2;
      top = Math.max(64, Math.min(ch - cardH - 54, top));

      setHoverPos({ x: left, y: top });

      const attachX = left > nx ? left : left + cardW;
      const attachY = Math.max(top + 20, Math.min(top + cardH - 20, ny));

      setHoverLeader({
        x1: nx,
        y1: ny,
        x2: attachX,
        y2: attachY,
      });
    },
    [adjacency]
  );

  const updateLinkCardPos = useCallback((link: SimLink) => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const transform = transformRef.current;
    const src = link.source as SimNode;
    const tgt = link.target as SimNode;
    const mx = ((src.x ?? 0) + (tgt.x ?? 0)) / 2;
    const my = ((src.y ?? 0) + (tgt.y ?? 0)) / 2;
    const nx = transform.applyX(mx);
    const ny = transform.applyY(my);
    const cw = svgEl.clientWidth || 1000;
    const ch = svgEl.clientHeight || 700;
    const cardW = 360;
    const cardH = 390;
    const CLEARANCE = 32;

    let left = nx + CLEARANCE;
    if (left + cardW > cw - 20) {
      left = nx - CLEARANCE - cardW;
      if (left < 20) {
        left = Math.max(20, (cw - cardW) / 2);
      }
    }

    let top = ny - cardH / 2;
    top = Math.max(64, Math.min(ch - cardH - 54, top));

    setHoverPos({ x: left, y: top });

    const attachX = left > nx ? left : left + cardW;
    const attachY = Math.max(top + 20, Math.min(top + cardH - 20, ny));

    setHoverLeader({
      x1: nx,
      y1: ny,
      x2: attachX,
      y2: attachY,
    });
  }, []);

  // -------------------------------------------------------------------------
  // Path Geometry Builder (Curved & Truncated at Node Radii)
  // -------------------------------------------------------------------------
  const buildLinkPath = useCallback((d: SimLink): string => {
    const src = d.source as SimNode;
    const tgt = d.target as SimNode;
    const sx = src.x ?? 0;
    const sy = src.y ?? 0;
    const tx = tgt.x ?? 0;
    const ty = tgt.y ?? 0;

    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return `M ${sx},${sy} L ${tx},${ty}`;

    const rSrc = src.is_seed ? 22 : src.type === "wallet" ? 15 : 13;
    const rTgt = tgt.is_seed ? 22 : tgt.type === "wallet" ? 15 : 13;

    const ux = dx / dist;
    const uy = dy / dist;

    // Truncate cleanly at node outer boundary so arrowheads sit flush
    const startX = sx + ux * (rSrc + 2);
    const startY = sy + uy * (rSrc + 2);
    const endX = tx - ux * (rTgt + 5);
    const endY = ty - uy * (rTgt + 5);

    const curve = d.curvature ?? 0;
    if (Math.abs(curve) < 0.01) {
      return `M ${startX},${startY} L ${endX},${endY}`;
    }

    // Quadratic Bezier curve offset
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const normX = -uy * curve * dist;
    const normY = ux * curve * dist;
    const ctrlX = midX + normX;
    const ctrlY = midY + normY;

    return `M ${startX},${startY} Q ${ctrlX},${ctrlY} ${endX},${endY}`;
  }, []);

  // -------------------------------------------------------------------------
  // Primary D3 Graph Simulation & Rendering
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;
    const isDark = canvasTheme === "dark";

    // -----------------------------------------------------------------------
    // Defs: Gradients, Filters & Substantial Forensics Markers
    // -----------------------------------------------------------------------
    const defs = svg.append("defs");

    // Standard arrowhead - enlarged and authoritative
    defs
      .append("marker")
      .attr("id", "arrow-standard")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 7)
      .attr("refY", 0)
      .attr("markerWidth", 6.5)
      .attr("markerHeight", 6.5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L6.5,0L0,3")
      .attr("fill", isDark ? "#94a3b8" : "#334155");

    // Saliency cyber cyan arrowhead - prominent
    defs
      .append("marker")
      .attr("id", "arrow-saliency")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 7)
      .attr("refY", 0)
      .attr("markerWidth", 7.5)
      .attr("markerHeight", 7.5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3.5L7,0L0,3.5")
      .attr("fill", "#06b6d4");

    // Critical Red Arrowhead
    defs
      .append("marker")
      .attr("id", "arrow-critical")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 7)
      .attr("refY", 0)
      .attr("markerWidth", 6.5)
      .attr("markerHeight", 6.5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L6.5,0L0,3")
      .attr("fill", "#ef4444");

    // Glow Seed Filter
    const filterSeed = defs
      .append("filter")
      .attr("id", "glow-seed")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filterSeed
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("stdDeviation", 4.5)
      .attr("flood-color", "#dc2626")
      .attr("flood-opacity", 0.75);

    // Glow Critical Filter
    const filterCrit = defs
      .append("filter")
      .attr("id", "glow-critical")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filterCrit
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("stdDeviation", 3.5)
      .attr("flood-color", "#ef4444")
      .attr("flood-opacity", 0.65);

    // Attention Glow Filter (Refined Cyber Cyan)
    const filterAttn = defs
      .append("filter")
      .attr("id", "attention-glow-filter")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filterAttn
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("stdDeviation", 2.8)
      .attr("flood-color", "#06b6d4")
      .attr("flood-opacity", 0.85);

    // Background Canvas Grid Pattern (Light & Dark Blueprint Modes)
    const gridPattern = defs
      .append("pattern")
      .attr("id", "canvas-blueprint-grid")
      .attr("width", 40)
      .attr("height", 40)
      .attr("patternUnits", "userSpaceOnUse");

    gridPattern
      .append("path")
      .attr("d", "M 40 0 L 0 0 0 40")
      .attr("fill", "none")
      .attr("stroke", isDark ? "rgba(56, 189, 248, 0.07)" : "rgba(148, 163, 184, 0.16)")
      .attr("stroke-width", 0.8);

    gridPattern
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1.2)
      .attr("fill", isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(100, 116, 139, 0.35)");

    // Root Group
    const g = svg.append("g").attr("class", "graph-root");

    // Draw infinite blueprint grid backing
    g.append("rect")
      .attr("class", "grid-canvas-plane")
      .attr("x", -10000)
      .attr("y", -10000)
      .attr("width", 20000)
      .attr("height", 20000)
      .attr("fill", "url(#canvas-blueprint-grid)")
      .style("pointer-events", "all");

    // Deselect when clicking empty canvas
    svg.on("click", (e) => {
      if (
        e.target === svgRef.current ||
        (e.target as HTMLElement).tagName === "svg" ||
        (e.target as HTMLElement).classList.contains("grid-canvas-plane")
      ) {
        handleCloseInspector();
      }
    });

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 7])
      .on("zoom", (ev) => {
        transformRef.current = ev.transform;
        g.attr("transform", ev.transform);
        const activeNode = selectedNodeRef.current ?? hoveredNodeRef.current;
        if (activeNode) {
          updateHoverCardPos(activeNode);
        } else if (selectedLinkRef.current) {
          updateLinkCardPos(selectedLinkRef.current);
        }
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    if (nodes.length === 0) return;

    // Simulation Data Prep
    const simNodes: SimNode[] = nodes.map((n) => {
      const deg = (inOutDegree.get(n.id)?.in ?? 0) + (inOutDegree.get(n.id)?.out ?? 0);
      let tier = 3;
      if (n.is_seed || (n.risk_score ?? 0) >= 0.85) tier = 0;
      else if (n.type === "wallet" && (n.risk_score ?? 0) >= 0.5) tier = 1;
      else if (n.type === "transaction") tier = 2;
      else if (n.type === "ip") tier = 4;

      return {
        ...n,
        degree: deg,
        tier,
      };
    });
    simNodesRef.current = simNodes;
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    // Multi-edge curvature assignment to prevent overlaps
    const edgePairCounts = new Map<string, number>();
    const simLinks: SimLink[] = links
      .filter((l) => nodeById.has(l.source as string) && nodeById.has(l.target as string))
      .map((l) => {
        const s = l.source as string;
        const t = l.target as string;
        const key = s < t ? `${s}__${t}` : `${t}__${s}`;
        const count = edgePairCounts.get(key) ?? 0;
        edgePairCounts.set(key, count + 1);

        // Alternate subtle curves for parallel edges
        const curvature = count === 0 ? 0 : (count % 2 === 1 ? 0.12 * Math.ceil(count / 2) : -0.12 * (count / 2));

        return {
          source: nodeById.get(s)!,
          target: nodeById.get(t)!,
          linkType: l.type,
          amount: l.amount ?? null,
          is_explanatory: l.is_explanatory,
          attention_score: l.attention_score ?? null,
          head_attentions: l.head_attentions ?? null,
          curvature,
        };
      });
    simLinksRef.current = simLinks;

    // -----------------------------------------------------------------------
    // Links Layer (Smooth Paths)
    // -----------------------------------------------------------------------
    const linksGroup = g.append("g").attr("class", "links-layer");

    const linkPaths = linksGroup
      .selectAll<SVGPathElement, SimLink>("path")
      .data(simLinks)
      .join("path")
      .attr("class", "graph-edge")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const isAttn = (d.attention_score ?? 0) >= 0.8 || d.is_explanatory;
        if (saliencyMode && isAttn) return "#06b6d4";
        if (d.linkType === "CO_SPEND") return isDark ? "#64748b" : "#64748b";
        if (d.linkType === "OBSERVED") return isDark ? "#38bdf8" : "#0284c7";
        return isDark ? "#94a3b8" : "#334155";
      })
      .attr("stroke-width", (d) => {
        const isAttn = (d.attention_score ?? 0) >= 0.8 || d.is_explanatory;
        if (saliencyMode && isAttn) return 3.5;
        return 2.4;
      })
      .attr("stroke-opacity", (d) => {
        const isAttn = (d.attention_score ?? 0) >= 0.8 || d.is_explanatory;
        if (saliencyMode && isAttn) return 1.0;
        if (d.linkType === "CO_SPEND") return 0.75;
        if (d.linkType === "OBSERVED") return 0.75;
        return 0.8;
      })
      .attr("stroke-dasharray", (d) => (d.linkType === "CO_SPEND" ? "4,3" : d.linkType === "OBSERVED" ? "3,3" : null))
      .attr("marker-end", (d) => {
        const isAttn = (d.attention_score ?? 0) >= 0.8 || d.is_explanatory;
        if (saliencyMode && isAttn) return "url(#arrow-saliency)";
        return "url(#arrow-standard)";
      })
      .style("cursor", "pointer")
      .on("click", (ev, d) => {
        ev.stopPropagation();
        setSelectedNode(null);
        setHoveredNode(null);
        setSelectedLink(d);
        updateLinkCardPos(d);
      });

    // -----------------------------------------------------------------------
    // Nodes Layer
    // -----------------------------------------------------------------------
    const nodesGroup = g.append("g").attr("class", "nodes-layer");

    const nodeGroups = nodesGroup
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("class", "node-group")
      .attr("data-node-id", (d) => d.id)
      .attr("opacity", 1)
      .style("cursor", "pointer");

    const getHubBoost = (id: string) => {
      const deg = (inOutDegree.get(id)?.in ?? 0) + (inOutDegree.get(id)?.out ?? 0);
      return Math.min(deg * 0.45, 8);
    };

    // A. Wallets (Substantial, High-Contrast Nodes)
    const wallets = nodeGroups.filter((d) => d.type === "wallet");

    // Seed Outer Radar Beacon
    wallets
      .filter((d) => d.is_seed)
      .append("circle")
      .attr("class", "animate-radar-reticle")
      .attr("r", (d) => 22 + getHubBoost(d.id))
      .attr("fill", "none")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2.2)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.95);

    // Wallet Solid Core
    wallets
      .append("circle")
      .attr("class", "node-core")
      .attr("r", (d) => {
        const base = d.is_seed ? 17 : (d.risk_score ?? 0) >= 0.8 ? 14 : (d.risk_score ?? 0) >= 0.5 ? 12.5 : 11;
        return base + getHubBoost(d.id) * 0.6;
      })
      .attr("fill", (d) => getNodeColors(getRiskTier(d.risk_score, d.is_seed), isDark).fill)
      .attr("stroke", (d) => (isDark ? "#ffffff" : getNodeColors(getRiskTier(d.risk_score, d.is_seed), isDark).stroke))
      .attr("stroke-width", (d) => (d.is_seed ? 2.8 : 2.2))
      .attr("filter", (d) =>
        d.is_seed ? "url(#glow-seed)" : (d.risk_score ?? 0) >= 0.8 ? "url(#glow-critical)" : null
      );

    // Specular 3D Highlight Ring
    wallets
      .append("circle")
      .attr("r", (d) => {
        const base = d.is_seed ? 11 : (d.risk_score ?? 0) >= 0.8 ? 9 : 7;
        return base + getHubBoost(d.id) * 0.4;
      })
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.55)")
      .attr("stroke-width", 1.2);

    // Micro-badge Pill for Seed Entities
    wallets
      .filter((d) => d.is_seed)
      .append("g")
      .attr("transform", (d) => `translate(0, ${22 + getHubBoost(d.id)})`)
      .call((gBadge) => {
        gBadge
          .append("rect")
          .attr("x", -16)
          .attr("y", -7)
          .attr("width", 32)
          .attr("height", 14)
          .attr("rx", 4)
          .attr("fill", "#dc2626")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.2)
          .attr("filter", "url(#glow-seed)");

        gBadge
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("font-size", "8px")
          .attr("font-family", "var(--font-jetbrains-mono, monospace)")
          .attr("font-weight", "800")
          .attr("fill", "#ffffff")
          .text("SEED");
      });

    // B. Transactions (Sleek Geometric Micro-Hexagon Vertices)
    const txs = nodeGroups.filter((d) => d.type === "transaction");
    txs
      .append("polygon")
      .attr("class", "node-core")
      .attr("points", "-9,-12 9,-12 14,0 9,12 -9,12 -14,0")
      .attr("fill", isDark ? "#1e293b" : "#ffffff")
      .attr("stroke", isDark ? "#94a3b8" : "#334155")
      .attr("stroke-width", 2.2);

    txs
      .append("circle")
      .attr("r", 3.5)
      .attr("fill", isDark ? "#38bdf8" : "#0284c7");

    // C. IPs (Cyber Sky Diamond)
    const ips = nodeGroups.filter((d) => d.type === "ip");
    ips
      .append("polygon")
      .attr("class", "node-core")
      .attr("points", "0,-14 14,0 0,14 -14,0")
      .attr("fill", isDark ? "#0c4a6e" : "#e0f2fe")
      .attr("stroke", "#0284c7")
      .attr("stroke-width", 2.2);

    ips
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "8.5px")
      .attr("font-family", "var(--font-jetbrains-mono, monospace)")
      .attr("font-weight", "bold")
      .attr("fill", isDark ? "#7dd3fc" : "#0369a1")
      .text((d) => d.country?.slice(0, 2).toUpperCase() ?? "IP");

    // D. Selection Halo
    nodeGroups
      .append("circle")
      .attr("class", "selection-halo")
      .attr("r", (d) => (d.type === "wallet" ? 22 + getHubBoost(d.id) : 19))
      .attr("fill", "none")
      .attr("stroke", "#0284c7")
      .attr("stroke-width", 2.8)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0);

    // Event Handlers
    nodeGroups
      .on("mouseenter", (_, d) => {
        if (!selectedNodeRef.current) {
          setHoveredNode(d);
          updateHoverCardPos(d);
        }
      })
      .on("mouseleave", () => {
        if (!selectedNodeRef.current) {
          setHoveredNode(null);
          setHoverPos(null);
          setHoverLeader(null);
        }
      })
      .on("click", (ev, d) => {
        ev.stopPropagation();
        setSelectedLink(null);
        setSelectedNode(d);
        setHoveredNode(d);
        updateHoverCardPos(d);
      });

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (ev, d) => {
        if (!ev.active && layoutMode === "force") simRef.current?.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (ev, d) => {
        d.fx = ev.x;
        d.fy = ev.y;
        if (selectedNodeRef.current?.id === d.id || hoveredNodeRef.current?.id === d.id) {
          updateHoverCardPos(d);
        }
      })
      .on("end", (ev, d) => {
        if (!ev.active && layoutMode === "force") simRef.current?.alphaTarget(0);
        if (layoutMode === "force") {
          d.fx = null;
          d.fy = null;
        }
      });
    nodeGroups.call(drag as never);

    // -----------------------------------------------------------------------
    // Layout Calculation Functions
    // -----------------------------------------------------------------------
    const applyLayout = (mode: LayoutMode) => {
      const cx = width / 2;
      const cy = height / 2;

      if (mode === "concentric") {
        // Stop physics simulation
        simRef.current?.stop();

        // 4 Concentric Tiers:
        // Tier 0: Seed / Critical Targets at Center (r = 30)
        // Tier 1: Wallets directly related (r = 160)
        // Tier 2: Transactions (r = 280)
        // Tier 3: Secondary Wallets (r = 390)
        // Tier 4: IP Hosts (r = 490)
        const tiers: SimNode[][] = [[], [], [], [], []];
        simNodes.forEach((n) => {
          const t = n.tier ?? 3;
          tiers[Math.min(4, Math.max(0, t))].push(n);
        });

        const radii = [45, 165, 285, 395, 495];

        tiers.forEach((tierNodes, tIdx) => {
          const r = radii[tIdx];
          const count = tierNodes.length;
          tierNodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / Math.max(1, count) - Math.PI / 2;
            const targetX = cx + (count === 1 && tIdx === 0 ? 0 : r * Math.cos(angle));
            const targetY = cy + (count === 1 && tIdx === 0 ? 0 : r * Math.sin(angle));

            node.fx = targetX;
            node.fy = targetY;
          });
        });

        // Animate nodes to concentric positions
        nodeGroups
          .transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .attr("transform", (d) => `translate(${d.fx ?? 0},${d.fy ?? 0})`)
          .on("end", function (d) {
            d.x = d.fx ?? d.x;
            d.y = d.fy ?? d.y;
          });

        linkPaths
          .transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .attr("d", (d) => {
            const src = d.source as SimNode;
            const tgt = d.target as SimNode;
            const savedSrc = { ...src, x: src.fx ?? src.x, y: src.fy ?? src.y };
            const savedTgt = { ...tgt, x: tgt.fx ?? tgt.x, y: tgt.fy ?? tgt.y };
            return buildLinkPath({ ...d, source: savedSrc, target: savedTgt });
          });
      } else if (mode === "flow") {
        // Directed Inflow-Outflow DAG columns
        simRef.current?.stop();

        const colSeeds = simNodes.filter((n) => n.is_seed || (n.risk_score ?? 0) >= 0.7);
        const colWallets = simNodes.filter((n) => !n.is_seed && (n.risk_score ?? 0) < 0.7 && n.type === "wallet");
        const colTxs = simNodes.filter((n) => n.type === "transaction");
        const colIps = simNodes.filter((n) => n.type === "ip");

        const columns = [
          { x: cx - 440, nodes: colSeeds },
          { x: cx - 150, nodes: colTxs },
          { x: cx + 160, nodes: colWallets },
          { x: cx + 440, nodes: colIps },
        ];

        columns.forEach(({ x, nodes: colNodes }) => {
          const count = colNodes.length;
          const spacing = Math.min(36, Math.max(20, 600 / Math.max(1, count)));
          const startY = cy - ((count - 1) * spacing) / 2;

          colNodes.forEach((node, idx) => {
            node.fx = x;
            node.fy = startY + idx * spacing;
          });
        });

        nodeGroups
          .transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .attr("transform", (d) => `translate(${d.fx ?? 0},${d.fy ?? 0})`)
          .on("end", function (d) {
            d.x = d.fx ?? d.x;
            d.y = d.fy ?? d.y;
          });

        linkPaths
          .transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .attr("d", (d) => {
            const src = d.source as SimNode;
            const tgt = d.target as SimNode;
            const savedSrc = { ...src, x: src.fx ?? src.x, y: src.fy ?? src.y };
            const savedTgt = { ...tgt, x: tgt.fx ?? tgt.x, y: tgt.fy ?? tgt.y };
            return buildLinkPath({ ...d, source: savedSrc, target: savedTgt });
          });
      } else {
        // Mode === 'force'
        // Clear fixed anchors and let dynamic degree-adaptive physics breathe
        simNodes.forEach((n) => {
          n.fx = null;
          n.fy = null;
        });

        simRef.current?.alpha(0.6).restart();
      }
    };

    // -----------------------------------------------------------------------
    // Force Simulation Setup (Mathematically Balanced for 150+ Nodes)
    // -----------------------------------------------------------------------
    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .alphaDecay(0.028)
      // Degree-adaptive link distance to let large hubs spread out naturally
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => {
            const sDeg = (l.source as SimNode).degree ?? 1;
            const tDeg = (l.target as SimNode).degree ?? 1;
            return Math.max(70, Math.min(135, 65 + (sDeg + tDeg) * 1.8));
          })
      )
      // Degree-adaptive repulsion to eliminate hairballs
      .force(
        "charge",
        d3.forceManyBody<SimNode>().strength((d) => {
          const deg = d.degree ?? 1;
          return -280 - Math.min(deg * 18, 380);
        })
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      // Generous collision detection preventing any node overlap with larger nodes
      .force(
        "collision",
        d3.forceCollide<SimNode>((d) => {
          if (d.is_seed) return 38;
          if (d.type === "wallet") return 28;
          if (d.type === "transaction") return 24;
          return 22;
        })
      )
      // Gentle radial centering to keep disconnected nodes from drifting away
      .force("radial", d3.forceRadial(260, width / 2, height / 2).strength(0.05))
      .on("tick", () => {
        if (layoutMode === "force") {
          linkPaths.attr("d", buildLinkPath);
          nodeGroups.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
        }
      });

    simRef.current = sim;

    // Trigger initial layout
    if (layoutMode !== "force") {
      applyLayout(layoutMode);
    }

    // Auto-fit to viewport after initial stabilization
    const timer = setTimeout(() => {
      fitToScreen();
    }, 550);

    return () => {
      clearTimeout(timer);
      sim.stop();
    };
  }, [nodes, links, inOutDegree, canvasTheme, layoutMode, saliencyMode, buildLinkPath, handleCloseInspector, fitToScreen]);

  // -------------------------------------------------------------------------
  // Dynamic 1-Hop Neighborhood Highlighting & Filtering
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isFiltered = filteredNodeIds !== null;
    const hasFocus = connectedNodeIds !== null;
    const isDark = canvasTheme === "dark";

    svg.selectAll<SVGGElement, SimNode>(".node-group").each(function (d) {
      let isVisible = true;
      if (selectedLink) {
        isVisible = d.id === (selectedLink.source as SimNode).id || d.id === (selectedLink.target as SimNode).id;
      } else if (hasFocus) {
        isVisible = connectedNodeIds.has(d.id);
      } else if (isFiltered) {
        isVisible = filteredNodeIds.has(d.id);
      }
      const isTarget = selectedLink ? isVisible : d.id === activeFocusId;

      d3.select(this)
        .transition()
        .duration(120)
        .attr("opacity", isVisible ? 1 : 0.12);

      d3.select(this)
        .select(".selection-halo")
        .transition()
        .duration(120)
        .attr("opacity", isTarget ? 1 : 0);
    });

    svg.selectAll<SVGPathElement, SimLink>(".links-layer path").each(function (d) {
      const sId = (d.source as SimNode).id;
      const tId = (d.target as SimNode).id;
      let isConn = true;
      if (selectedLink) {
        isConn =
          d === selectedLink ||
          (sId === (selectedLink.source as SimNode).id && tId === (selectedLink.target as SimNode).id) ||
          (sId === (selectedLink.target as SimNode).id && tId === (selectedLink.source as SimNode).id);
      } else if (hasFocus) {
        isConn = sId === activeFocusId || tId === activeFocusId;
      } else if (isFiltered) {
        isConn = filteredNodeIds.has(sId) && filteredNodeIds.has(tId);
      }

      const isEmphasized = (Boolean(selectedLink) && isConn) || (hasFocus && isConn);
      const isHighSaliency = (d.attention_score ?? 0) >= 0.8 || d.is_explanatory;

      let baseColor = isDark ? "#94a3b8" : "#334155";
      if (isEmphasized || (saliencyMode && isHighSaliency)) {
        baseColor = "#06b6d4";
      } else if (d.linkType === "CO_SPEND") {
        baseColor = isDark ? "#64748b" : "#64748b";
      } else if (d.linkType === "OBSERVED") {
        baseColor = isDark ? "#38bdf8" : "#0284c7";
      }

      const baseWidth = isEmphasized ? 3.5 : saliencyMode && isHighSaliency ? 3.5 : 2.4;
      const baseOpacity = isConn ? (isEmphasized ? 1.0 : saliencyMode && isHighSaliency ? 1.0 : 0.8) : 0.08;
      const marker =
        isEmphasized || (saliencyMode && isHighSaliency) ? "url(#arrow-saliency)" : "url(#arrow-standard)";

      d3.select(this)
        .transition()
        .duration(120)
        .attr("stroke-opacity", baseOpacity)
        .attr("stroke-width", baseWidth)
        .attr("stroke", baseColor)
        .attr("marker-end", marker)
        .attr("filter", isEmphasized || (saliencyMode && isHighSaliency) ? "url(#attention-glow-filter)" : null);
    });
  }, [activeFocusId, connectedNodeIds, filteredNodeIds, selectedLink, canvasTheme, saliencyMode]);

  return (
    <div
      className={clsx(
        "relative flex-1 flex flex-col overflow-hidden select-none transition-colors duration-200",
        canvasTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* ------------------------------------------------------------------- */}
      {/* Studio Forensic Command Toolbar (Clean Spacing, Unclipped Controls) */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left Cluster Stats & Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap max-w-[65vw]">
          {clusterId != null && (
            <div
              className={clsx(
                "flex items-center gap-2 crypto-mono text-xs px-3 py-1.5 rounded-lg shadow-card border backdrop-blur-md transition-colors",
                canvasTheme === "dark"
                  ? "bg-slate-900/90 border-slate-800 text-slate-200"
                  : "bg-white/95 border-slate-200/90 text-slate-800"
              )}
            >
              <Network className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="font-extrabold tracking-tight">Cluster #{clusterId}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-medium">
                {nodes.length} Nodes • {links.length} Edges
              </span>
              {highlightMode && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/15 text-sky-500 border border-sky-500/30 tracking-wider">
                  GNN ACTIVE
                </span>
              )}
            </div>
          )}

          {/* Tactical Entity Filters */}
          <div
            className={clsx(
              "hidden sm:flex items-center gap-1 p-1 rounded-lg border backdrop-blur-md shadow-card transition-colors",
              canvasTheme === "dark" ? "bg-slate-900/90 border-slate-800" : "bg-white/95 border-slate-200/90"
            )}
          >
            {[
              { id: "all", label: "All", count: nodes.length },
              { id: "high", label: "High Risk", count: counts.high },
              { id: "seeds", label: "Seeds", count: counts.seeds },
              { id: "wallets", label: "Wallets", count: counts.wallets },
              { id: "tx", label: "Txs", count: counts.txs },
              { id: "ip", label: "IPs", count: counts.ips },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setNodeFilter(id as typeof nodeFilter)}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  nodeFilter === id
                    ? "bg-slate-900 text-white shadow-2xs font-bold dark:bg-sky-600 dark:text-white"
                    : canvasTheme === "dark"
                    ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <span>{label}</span>
                {count > 0 && id !== "all" && (
                  <span
                    className={clsx(
                      "text-[9.5px] crypto-mono font-bold px-1 rounded",
                      nodeFilter === id
                        ? "bg-slate-800 text-slate-200 dark:bg-sky-700"
                        : canvasTheme === "dark"
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Navigation & Layout Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center group">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search address / node ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchMatches.length > 0) {
                  zoomToNode(searchMatches[0].id);
                }
              }}
              className={clsx(
                "h-8 pl-8 pr-7 text-[11px] crypto-mono rounded-lg border transition-all shadow-2xs outline-none",
                "w-48 sm:w-56 focus:w-64",
                canvasTheme === "dark"
                  ? "bg-slate-900/90 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-sky-500"
                  : "bg-white/95 border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:border-sky-600"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {searchQuery && searchMatches.length > 0 && (
              <div
                className={clsx(
                  "absolute top-9 left-0 right-0 max-h-48 overflow-y-auto rounded-lg border p-1 shadow-card-elevated z-40 text-[10px] crypto-mono",
                  canvasTheme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                )}
              >
                {searchMatches.slice(0, 5).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => zoomToNode(m.id)}
                    className={clsx(
                      "w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-sky-500/15 cursor-pointer truncate",
                      canvasTheme === "dark" ? "hover:text-sky-300" : "hover:text-sky-700"
                    )}
                  >
                    <span className="truncate">{m.label || m.id}</span>
                    <span className="text-[9px] uppercase px-1 rounded bg-slate-800/20">{m.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layout Mode Switcher */}
          <div
            className={clsx(
              "flex items-center gap-1 p-1 rounded-lg border backdrop-blur-md shadow-card",
              canvasTheme === "dark" ? "bg-slate-900/90 border-slate-800" : "bg-white/95 border-slate-200/90"
            )}
          >
            <ToolBtn
              id="layout-force"
              icon={<Network className="w-3.5 h-3.5" />}
              label="Force Physics Layout"
              onClick={() => {
                setLayoutMode("force");
                setTimeout(fitToScreen, 700);
              }}
              active={layoutMode === "force"}
              isDark={canvasTheme === "dark"}
            />
            <ToolBtn
              id="layout-concentric"
              icon={<Target className="w-3.5 h-3.5" />}
              label="Concentric Radar View"
              onClick={() => {
                setLayoutMode("concentric");
                setTimeout(fitToScreen, 750);
              }}
              active={layoutMode === "concentric"}
              isDark={canvasTheme === "dark"}
            />
            <ToolBtn
              id="layout-flow"
              icon={<Workflow className="w-3.5 h-3.5" />}
              label="Directed Flow DAG"
              onClick={() => {
                setLayoutMode("flow");
                setTimeout(fitToScreen, 750);
              }}
              active={layoutMode === "flow"}
              isDark={canvasTheme === "dark"}
            />
          </div>

          {/* Saliency & Theme Controls */}
          <div
            className={clsx(
              "flex items-center gap-1 p-1 rounded-lg border backdrop-blur-md shadow-card",
              canvasTheme === "dark" ? "bg-slate-900/90 border-slate-800" : "bg-white/95 border-slate-200/90"
            )}
          >
            <ToolBtn
              id="toggle-saliency"
              icon={<Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
              label={saliencyMode ? "GNN Saliency: ON" : "GNN Saliency: OFF"}
              onClick={() => setSaliencyMode(!saliencyMode)}
              active={saliencyMode}
              isDark={canvasTheme === "dark"}
            />
            <ToolBtn
              id="toggle-theme"
              icon={canvasTheme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
              label={canvasTheme === "dark" ? "Switch to Light Blueprint" : "Switch to Surveillance Dark"}
              onClick={() => setCanvasTheme(canvasTheme === "dark" ? "light" : "dark")}
              isDark={canvasTheme === "dark"}
            />
          </div>

          {/* Navigation Zoom Tools */}
          <div
            className={clsx(
              "flex items-center gap-1 p-1 rounded-lg border backdrop-blur-md shadow-card",
              canvasTheme === "dark" ? "bg-slate-900/90 border-slate-800" : "bg-white/95 border-slate-200/90"
            )}
          >
            <ToolBtn id="graph-zoom-in" icon={<ZoomIn className="w-3.5 h-3.5" />} label="Zoom In (+)" onClick={() => zoomBy(1.3)} isDark={canvasTheme === "dark"} />
            <ToolBtn id="graph-zoom-out" icon={<ZoomOut className="w-3.5 h-3.5" />} label="Zoom Out (-)" onClick={() => zoomBy(0.75)} isDark={canvasTheme === "dark"} />
            <ToolBtn id="graph-fit" icon={<Maximize2 className="w-3.5 h-3.5" />} label="Fit Graph to Viewport" onClick={fitToScreen} isDark={canvasTheme === "dark"} />
            <ToolBtn id="graph-reset" icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset View" onClick={resetView} isDark={canvasTheme === "dark"} />
            {layoutMode === "force" && (
              <ToolBtn
                id="graph-freeze"
                icon={frozen ? <Play className="w-3.5 h-3.5 text-sky-500" /> : <Pause className="w-3.5 h-3.5" />}
                label={frozen ? "Resume Physics" : "Pause Physics"}
                onClick={toggleFreeze}
                active={frozen}
                isDark={canvasTheme === "dark"}
              />
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Bottom Left: Defense Tactical Legend */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={clsx(
          "absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-3.5 px-3.5 py-2 rounded-lg border backdrop-blur-md shadow-card text-[11px]",
          canvasTheme === "dark" ? "bg-slate-900/90 border-slate-800 text-slate-300" : "bg-white/95 border-slate-200/90 text-slate-600"
        )}
      >
        <button
          onClick={() => setNodeFilter(nodeFilter === "wallets" ? "all" : "wallets")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "wallets" ? "font-bold text-emerald-500" : "hover:text-emerald-400"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-2xs" />
          <span>Wallet ({counts.wallets})</span>
        </button>

        <button
          onClick={() => setNodeFilter(nodeFilter === "tx" ? "all" : "tx")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "tx" ? "font-bold text-sky-400" : "hover:text-sky-300"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 border border-slate-600 shadow-2xs" />
          <span>Tx ({counts.txs})</span>
        </button>

        <button
          onClick={() => setNodeFilter(nodeFilter === "ip" ? "all" : "ip")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "ip" ? "font-bold text-sky-400" : "hover:text-sky-300"
          )}
        >
          <span className="w-2.5 h-2.5 rotate-45 bg-sky-100 border border-sky-600 shadow-2xs" />
          <span>IP Host ({counts.ips})</span>
        </button>

        <button
          onClick={() => setNodeFilter(nodeFilter === "seeds" ? "all" : "seeds")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "seeds" ? "font-bold text-red-500" : "hover:text-red-400"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-red-600 bg-red-500 shadow-2xs animate-pulse" />
          <span className="font-bold text-red-500">Seed Entity ({counts.seeds})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SVG Leader Beam (Connects Node or Edge to Forensic Card) */}
      {/* ------------------------------------------------------------------- */}
      {(activeDisplayNode || selectedLink) && hoverLeader && (
        <svg className="absolute inset-0 pointer-events-none z-25 w-full h-full">
          <circle cx={hoverLeader.x1} cy={hoverLeader.y1} r="4.5" fill="#06b6d4" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx={hoverLeader.x1} cy={hoverLeader.y1} r="10" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3,3" opacity="0.8" />
          <line
            x1={hoverLeader.x1}
            y1={hoverLeader.y1}
            x2={hoverLeader.x2}
            y2={hoverLeader.y2}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="4,3"
            opacity="0.85"
          />
          <circle cx={hoverLeader.x2} cy={hoverLeader.y2} r="3" fill="#38bdf8" />
        </svg>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Forensic Inspector HUD (Glass Dark Card for Focused Node) */}
      {/* ------------------------------------------------------------------- */}
      {activeDisplayNode && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={
            hoverPos
              ? { left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }
              : { right: "20px", top: "70px" }
          }
          className={clsx(
            "absolute z-30 w-[360px] rounded-2xl bg-slate-950/95 text-white backdrop-blur-xl border border-slate-700/80 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[left,top] duration-150 ease-out",
            selectedNode ? "pointer-events-auto ring-1 ring-sky-500/50" : "pointer-events-none"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
                {activeDisplayNode.type === "wallet" ? (
                  <Activity className="w-3 h-3 text-sky-400" />
                ) : activeDisplayNode.type === "ip" ? (
                  <Globe className="w-3 h-3 text-sky-400" />
                ) : (
                  <Layers className="w-3 h-3 text-sky-400" />
                )}
                <span>{activeDisplayNode.type}</span>
              </div>
              {activeDisplayNode.country && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 text-[9.5px] crypto-mono font-bold">
                  {activeDisplayNode.country}
                </span>
              )}

              {/* Severity Pill */}
              {activeDisplayNode.is_seed ? (
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold tracking-wider animate-pulse shadow-xs">
                  ILLICIT SEED
                </span>
              ) : (activeDisplayNode.risk_score ?? 0) >= 0.8 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-950/90 border border-red-500/80 text-red-200 text-[10px] font-extrabold tracking-wider">
                  CRITICAL
                </span>
              ) : (activeDisplayNode.risk_score ?? 0) >= 0.6 ? (
                <span className="px-2 py-0.5 rounded-full bg-orange-950/90 border border-orange-500/80 text-orange-200 text-[10px] font-bold tracking-wider">
                  HIGH RISK
                </span>
              ) : (activeDisplayNode.risk_score ?? 0) >= 0.4 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/80 text-amber-200 text-[10px] font-bold tracking-wider">
                  MED RISK
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[10px] font-bold tracking-wider">
                  LOW RISK
                </span>
              )}
            </div>

            {selectedNode && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/50 text-sky-300 text-[9px] crypto-mono font-bold">
                  <Pin className="w-2.5 h-2.5 rotate-45 text-sky-400" />
                  PINNED
                </span>
                <button
                  onClick={handleCloseInspector}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                  aria-label="Close inspector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Identifier + Copy Action */}
          <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-400 mb-1">
              <span className="tracking-widest">Target Identifier</span>
              <button
                onClick={() => copyAddress(activeDisplayNode.id)}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 cursor-pointer font-semibold transition-colors pointer-events-auto"
                title="Copy identifier"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="crypto-mono text-xs font-bold text-slate-100 break-all select-all leading-relaxed">
              {activeDisplayNode.id}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-1">Risk Score</span>
              <div className="flex items-baseline gap-2">
                <span
                  className={clsx(
                    "crypto-mono text-base font-extrabold",
                    (activeDisplayNode.risk_score ?? 0) >= 0.8
                      ? "text-red-400"
                      : (activeDisplayNode.risk_score ?? 0) >= 0.5
                      ? "text-amber-400"
                      : "text-emerald-400"
                  )}
                >
                  {activeDisplayNode.risk_score != null ? activeDisplayNode.risk_score.toFixed(3) : "0.000"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">/ 1.0</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1.5">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all",
                    (activeDisplayNode.risk_score ?? 0) >= 0.8
                      ? "bg-red-500"
                      : (activeDisplayNode.risk_score ?? 0) >= 0.5
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.round((activeDisplayNode.risk_score ?? 0) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-1">Cluster Degree</span>
              <span className="crypto-mono text-base font-extrabold text-slate-100 block">
                {(inOutDegree.get(activeDisplayNode.id)?.in ?? 0) + (inOutDegree.get(activeDisplayNode.id)?.out ?? 0)} Edges
              </span>
              <span className="text-[9.5px] text-slate-400 crypto-mono block mt-1">
                ↓ {inOutDegree.get(activeDisplayNode.id)?.in ?? 0} in • ↑ {inOutDegree.get(activeDisplayNode.id)?.out ?? 0} out
              </span>
            </div>
          </div>

          {/* Transformer Relational Attention Breakdown */}
          {primaryIncidentLink && (
            <AttentionBreakdownSection
              attentionScore={primaryIncidentLink.attention_score}
              headAttentions={primaryIncidentLink.head_attentions}
              isExplanatory={primaryIncidentLink.is_explanatory}
              title="Transformer Relational Attention"
              subtitle={`Incident ${primaryIncidentLink.linkType}: ${
                (typeof primaryIncidentLink.source === "object"
                  ? (primaryIncidentLink.source as SimNode).id
                  : primaryIncidentLink.source) === activeDisplayNode.id
                  ? typeof primaryIncidentLink.target === "object"
                    ? (primaryIncidentLink.target as SimNode).label
                    : primaryIncidentLink.target
                  : typeof primaryIncidentLink.source === "object"
                  ? (primaryIncidentLink.source as SimNode).label
                  : primaryIncidentLink.source
              }`}
            />
          )}

          {/* Action: Open Forensic Dossier */}
          {activeDisplayNode.type === "wallet" && onSelectWallet && (
            <button
              onClick={() => onSelectWallet(activeDisplayNode.id)}
              className="w-full mb-2.5 h-8.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(2,132,199,0.35)] transition-colors cursor-pointer pointer-events-auto"
            >
              <Shield className="w-3.5 h-3.5 text-sky-200 stroke-[2.2]" />
              <span>Inspect Full Forensic Dossier</span>
              <ExternalLink className="w-3 h-3 text-sky-200 ml-0.5" />
            </button>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            {selectedNode ? (
              <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Pin className="w-3 h-3 rotate-45" />
                <span>Pinned • Click canvas to unpin</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Shield className="w-3 h-3 stroke-[2.2]" />
                <span>Click node to pin forensic inspector</span>
              </span>
            )}
            <span className="crypto-mono text-slate-400">Cluster #{clusterId}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Forensic Inspector HUD (Glass Dark Card for Focused Edge) */}
      {/* ------------------------------------------------------------------- */}
      {selectedLink && !selectedNode && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={
            hoverPos
              ? { left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }
              : { right: "20px", top: "70px" }
          }
          className="absolute z-30 w-[360px] rounded-2xl bg-slate-950/95 text-white backdrop-blur-xl border border-slate-700/80 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[left,top] duration-150 ease-out pointer-events-auto ring-1 ring-cyan-500/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                <Network className="w-3 h-3 text-cyan-400" />
                <span>{selectedLink.linkType} EDGE</span>
              </div>
              {(selectedLink.attention_score ?? 0) >= 0.75 || selectedLink.is_explanatory ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 text-[10px] font-extrabold tracking-wider animate-pulse">
                  HIGH SALIENCY FLOW
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold tracking-wider">
                  STANDARD FLOW
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[9px] crypto-mono font-bold">
                <Pin className="w-2.5 h-2.5 rotate-45 text-cyan-400" />
                PINNED
              </span>
              <button
                onClick={handleCloseInspector}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                aria-label="Close inspector"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Relational Trajectory */}
          <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-400 mb-1.5">
              <span className="tracking-widest">Relational Trajectory</span>
              {selectedLink.amount != null && (
                <span className="text-cyan-400 crypto-mono font-semibold">
                  {selectedLink.amount.toFixed(4)} BTC
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs crypto-mono">
              <span
                className="font-bold text-slate-100 bg-slate-800/80 px-2 py-1 rounded truncate max-w-[130px]"
                title={(selectedLink.source as SimNode).id}
              >
                {(selectedLink.source as SimNode).label}
              </span>
              <span className="text-cyan-400 font-extrabold">→</span>
              <span
                className="font-bold text-slate-100 bg-slate-800/80 px-2 py-1 rounded truncate max-w-[130px]"
                title={(selectedLink.target as SimNode).id}
              >
                {(selectedLink.target as SimNode).label}
              </span>
            </div>
          </div>

          {/* Attention Breakdown */}
          <AttentionBreakdownSection
            attentionScore={selectedLink.attention_score}
            headAttentions={selectedLink.head_attentions}
            isExplanatory={selectedLink.is_explanatory}
            title="Relational Graph Transformer (4 Heads)"
            subtitle={`${selectedLink.linkType} Relation Attention`}
          />

          {/* Quick Inspect Buttons */}
          <div className="flex items-center gap-2 mb-2.5">
            {(selectedLink.source as SimNode).type === "wallet" && onSelectWallet && (
              <button
                onClick={() => onSelectWallet((selectedLink.source as SimNode).id)}
                className="flex-1 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Source Wallet</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {(selectedLink.target as SimNode).type === "wallet" && onSelectWallet && (
              <button
                onClick={() => onSelectWallet((selectedLink.target as SimNode).id)}
                className="flex-1 h-8 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Target Wallet</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Pin className="w-3 h-3 rotate-45" />
              <span>Edge Pinned • Click canvas to unpin</span>
            </span>
            <span className="crypto-mono text-slate-400">Cluster #{clusterId}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Loading Overlay */}
      {/* ------------------------------------------------------------------- */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs z-30">
          <div
            className={clsx(
              "flex flex-col items-center gap-3 p-6 rounded-2xl border shadow-card-elevated",
              canvasTheme === "dark" ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="w-9 h-9 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <span className="text-xs font-bold crypto-mono block">Optimizing Graph Topology…</span>
              <span className="text-[10px] text-slate-400 crypto-mono">Applying layout constraints</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nodes.length === 0 && clusterId != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={clsx(
              "p-6 rounded-2xl border shadow-card text-center max-w-sm",
              canvasTheme === "dark" ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"
            )}
          >
            <Network className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold crypto-mono mb-1">No Topology Data</p>
            <p className="text-[11px] text-slate-500">
              No graph partition found for cluster #{clusterId}. Select an alert row from the stream.
            </p>
          </div>
        </div>
      )}

      {/* SVG Canvas with Blueprint Matrix Pattern */}
      <svg
        ref={svgRef}
        className="w-full flex-1 cursor-grab active:cursor-grabbing"
        aria-label="Force-directed transaction graph"
      />

      {/* ------------------------------------------------------------------- */}
      {/* Canvas Operator Status Footer */}
      {/* ------------------------------------------------------------------- */}
      <div
        className={clsx(
          "h-9 px-4 border-t flex items-center justify-between shrink-0 select-none text-[11px] z-10 transition-colors",
          canvasTheme === "dark" ? "border-slate-800/90 bg-slate-950 text-slate-400" : "border-slate-200/90 bg-slate-50 text-slate-600"
        )}
      >
        <div className="flex items-center gap-2 crypto-mono">
          <span className={clsx("font-semibold", canvasTheme === "dark" ? "text-slate-200" : "text-slate-900")}>
            Cluster #{clusterId ?? "—"}
          </span>
          <span>•</span>
          <span>
            {nodes.length} nodes, {links.length} links
          </span>
          <span>•</span>
          <span className="capitalize font-medium text-sky-500">Layout: {layoutMode}</span>
        </div>

        <div className="hidden lg:flex items-center gap-3 crypto-mono text-[10px]">
          <span>Click node or edge to inspect</span>
          <span>•</span>
          <span>Scroll to zoom</span>
          <span>•</span>
          <span>Drag to pan</span>
        </div>

        {/* Live Military SYS UTC Clock */}
        <div
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-0.5 rounded border shadow-2xs",
            canvasTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-300" : "border-slate-200/90 bg-white text-slate-600"
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SYS UTC</span>
          <span className="crypto-mono text-xs font-semibold">{now}</span>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  id,
  icon,
  label,
  onClick,
  active,
  isDark,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  isDark?: boolean;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "w-7.5 h-7.5 flex items-center justify-center rounded-md border transition-all cursor-pointer shadow-2xs",
        active
          ? isDark
            ? "bg-sky-950/90 border-sky-500 text-sky-400 shadow-inner"
            : "bg-sky-50 border-sky-300 text-sky-700 shadow-inner"
          : isDark
          ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-700"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
      )}
    >
      {icon}
    </button>
  );
}
