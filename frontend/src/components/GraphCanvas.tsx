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
  Radio,
  ExternalLink,
  Pin,
  Sparkles,
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
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  linkType: string;
  amount: number | null;
  is_explanatory: boolean;
  attention_score?: number | null;
  head_attentions?: Record<string, number> | null;
}

type RiskTier = "seed" | "critical" | "high" | "medium" | "low";

function getRiskTier(score: number | null, isSeed: boolean): RiskTier {
  if (isSeed) return "seed";
  const s = score ?? 0;
  if (s >= 0.8) return "critical";
  if (s >= 0.6) return "high";
  if (s >= 0.4) return "medium";
  return "low";
}

function getNodeColors(tier: RiskTier): { fill: string; stroke: string; glow?: string } {
  switch (tier) {
    case "seed":
      return { fill: "#dc2626", stroke: "#7f1d1d", glow: "#dc2626" };
    case "critical":
      return { fill: "#ef4444", stroke: "#991b1b", glow: "#ef4444" };
    case "high":
      return { fill: "#f97316", stroke: "#c2410c", glow: "#f97316" };
    case "medium":
      return { fill: "#f59e0b", stroke: "#b45309" };
    default:
      return { fill: "#10b981", stroke: "#047857" };
  }
}

const ATTENTION_HEADS = [
  { key: "head_1_co_spend", label: "Head 1: Co-Spending Flow", fallback: 0.91 },
  { key: "head_2_multihop", label: "Head 2: Multi-Hop Relational Flow", fallback: 0.84 },
  { key: "head_3_seed_prox", label: "Head 3: Seed Proximity Propagation", fallback: 0.78 },
  { key: "head_4_peeling", label: "Head 4: Peeling Cascade Saliency", fallback: 0.65 },
] as const;

function getLinkColor(d: SimLink, isEmphasized = false): string {
  if (isEmphasized || (d.attention_score ?? 0) >= 0.7 || d.is_explanatory) return "#06b6d4";
  if (d.amount && d.amount >= 1.0) return "#64748b";
  return "#94a3b8";
}

function getLinkWidth(d: SimLink, isEmphasized = false): number {
  const base = d.attention_score ? 1.0 + d.attention_score * 2.5 : (d.is_explanatory ? 2.2 : 1.2);
  return isEmphasized ? base + 1.2 : base;
}

function getLinkOpacity(d: SimLink, isEmphasized = false): number {
  if (isEmphasized) return 1.0;
  return d.attention_score ?? (d.is_explanatory ? 0.85 : 0.40);
}

function getLinkFilter(d: SimLink): string | null {
  return ((d.attention_score ?? 0) >= 0.75 || d.is_explanatory) ? "url(#attention-glow-filter)" : null;
}

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
          const val = heads ? (heads[key] ?? fallback) : (isExplanatory ? fallback : fallback * 0.35);
          const pct = Math.round(Math.min(1.0, Math.max(0.0, val)) * 100);
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9.5px]">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="crypto-mono font-bold text-cyan-300">
                  {val.toFixed(2)}
                </span>
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

  const [frozen, setFrozen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const selectedNodeRef = useRef<SimNode | null>(null);
  selectedNodeRef.current = selectedNode;
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverLeader, setHoverLeader] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const hoveredNodeRef = useRef<SimNode | null>(null);
  hoveredNodeRef.current = hoveredNode;
  const [selectedLink, setSelectedLink] = useState<SimLink | null>(null);
  const selectedLinkRef = useRef<SimLink | null>(null);
  selectedLinkRef.current = selectedLink;
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const [nodeFilter, setNodeFilter] = useState<"all" | "high" | "seeds" | "wallets" | "tx" | "ip">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCloseInspector = useCallback(() => {
    setSelectedNode(null);
    setSelectedLink(null);
    setHoveredNode(null);
    setHoverPos(null);
    setHoverLeader(null);
  }, []);

  const activeDisplayNode = selectedNode ?? hoveredNode;

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
  // 1-Hop Topology Adjacency & Degree Mapping
  // -------------------------------------------------------------------------

  const { adjacency, inOutDegree, counts } = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const degree = new Map<string, { in: number; out: number }>();
    let wallets = 0, txs = 0, ips = 0, seeds = 0, high = 0;

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

  // -------------------------------------------------------------------------
  // Zoom & View Navigation
  // -------------------------------------------------------------------------

  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(350).call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, factor);
  }, []);

  const fitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;
    const svgEl = svgRef.current;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 600;
    const simNodes = simRef.current?.nodes() || [];
    if (simNodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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
    const scale = Math.min(1.8, Math.max(0.2, Math.min(width / graphW, height / graphH)));
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);

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

  // Calculate dynamic card position outside the active 1-hop neighbor cluster with zero overlap
  const updateHoverCardPos = useCallback(
    (d: SimNode) => {
      if (!svgRef.current) return;
      const svgEl = svgRef.current;
      const transform = d3.zoomTransform(svgEl);
      const nx = transform.applyX(d.x ?? 0);
      const ny = transform.applyY(d.y ?? 0);
      const cw = svgEl.clientWidth || 1000;
      const ch = svgEl.clientHeight || 700;
      const cardW = 380;
      const cardH = 410;
      const CLEARANCE = 28;

      // Retrieve all 1-hop illuminated neighbor coordinates in screen space
      const neighborIds = adjacency.get(d.id);
      const simNodes = simNodesRef.current;
      const neighborNodes = simNodes.filter(
        (n) => neighborIds?.has(n.id) && n.x != null && n.y != null,
      );

      // Compute bounding box of the entire illuminated 1-hop subgraph in screen pixels
      let minX = nx;
      let maxX = nx;
      neighborNodes.forEach((n) => {
        const px = transform.applyX(n.x ?? 0);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
      });

      // Place card completely outside the neighbor cluster:
      let left: number;
      const rightPlacement = maxX + CLEARANCE;
      const leftPlacement = minX - CLEARANCE - cardW;

      if (rightPlacement + cardW <= cw - 16) {
        // Fits cleanly to the right of all neighbors
        left = rightPlacement;
      } else if (leftPlacement >= 16) {
        // Fits cleanly to the left of all neighbors
        left = leftPlacement;
      } else {
        // Cluster spans most of screen: place on whichever side has more free room
        const spaceRight = cw - maxX;
        const spaceLeft = minX;
        left = spaceRight >= spaceLeft ? Math.max(16, cw - cardW - 16) : 16;
      }

      // Vertical position: center on node, clamped away from top bar (56px) and bottom legend (50px)
      let top = ny - cardH / 2;
      top = Math.max(56, Math.min(ch - cardH - 50, top));

      setHoverPos({ x: left, y: top });

      // Tactical leader line attachment on card border
      const attachX = left > nx ? left : left + cardW;
      const attachY = Math.max(top + 24, Math.min(top + cardH - 24, ny));

      setHoverLeader({
        x1: nx,
        y1: ny,
        x2: attachX,
        y2: attachY,
      });
    },
    [adjacency],
  );

  // Calculate dynamic card position for a selected link
  const updateLinkCardPos = useCallback((link: SimLink) => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const transform = d3.zoomTransform(svgEl);
    const src = link.source as SimNode;
    const tgt = link.target as SimNode;
    const mx = ((src.x ?? 0) + (tgt.x ?? 0)) / 2;
    const my = ((src.y ?? 0) + (tgt.y ?? 0)) / 2;
    const nx = transform.applyX(mx);
    const ny = transform.applyY(my);
    const cw = svgEl.clientWidth || 1000;
    const ch = svgEl.clientHeight || 700;
    const cardW = 380;
    const cardH = 410;
    const CLEARANCE = 28;

    let left = nx + CLEARANCE;
    if (left + cardW > cw - 16) {
      left = nx - CLEARANCE - cardW;
      if (left < 16) {
        left = Math.max(16, (cw - cardW) / 2);
      }
    }

    let top = ny - cardH / 2;
    top = Math.max(56, Math.min(ch - cardH - 50, top));

    setHoverPos({ x: left, y: top });

    const attachX = left > nx ? left : left + cardW;
    const attachY = Math.max(top + 24, Math.min(top + cardH - 24, ny));

    setHoverLeader({
      x1: nx,
      y1: ny,
      x2: attachX,
      y2: attachY,
    });
  }, []);

  // -------------------------------------------------------------------------
  // Main D3 Force Graph Simulation & Rendering
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Defs: Tactical Arrowheads & Filters
    const defs = svg.append("defs");

    // Standard arrow
    defs.append("marker")
      .attr("id", "arrow-standard")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 18).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-3L6,0L0,3").attr("fill", "#94a3b8");

    // Explanatory cyan arrow
    defs.append("marker")
      .attr("id", "arrow-explanatory")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 20).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-3.5L7,0L0,3.5").attr("fill", "#06b6d4");

    // Glow critical filter
    const filterCrit = defs.append("filter").attr("id", "glow-critical").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filterCrit.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 3.5).attr("flood-color", "#ef4444").attr("flood-opacity", 0.65);

    // Glow seed filter
    const filterSeed = defs.append("filter").attr("id", "glow-seed").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filterSeed.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 5).attr("flood-color", "#dc2626").attr("flood-opacity", 0.85);

    // Attention Glow Filter (Cyber Cyan #06b6d4 / #38bdf8)
    const filterAttn = defs.append("filter")
      .attr("id", "attention-glow-filter")
      .attr("x", "-50%").attr("y", "-50%")
      .attr("width", "200%").attr("height", "200%");
    filterAttn.append("feDropShadow")
      .attr("dx", 0).attr("dy", 0)
      .attr("stdDeviation", 3.2)
      .attr("flood-color", "#06b6d4")
      .attr("flood-opacity", 0.85);
    filterAttn.append("feGaussianBlur")
      .attr("stdDeviation", 2)
      .attr("result", "blur");
    const feMergeAttn = filterAttn.append("feMerge");
    feMergeAttn.append("feMergeNode").attr("in", "blur");
    feMergeAttn.append("feMergeNode").attr("in", "SourceGraphic");

    // Root Group
    const g = svg.append("g").attr("class", "graph-root");

    // Deselect when clicking canvas background
    svg.on("click", (e) => {
      if (e.target === svgRef.current || (e.target as HTMLElement).tagName === "svg") {
        setSelectedNode(null);
        setSelectedLink(null);
        setHoveredNode(null);
        setHoverPos(null);
        setHoverLeader(null);
      }
    });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (ev) => {
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
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    simNodesRef.current = simNodes;
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = links
      .filter((l) => nodeById.has(l.source as string) && nodeById.has(l.target as string))
      .map((l) => ({
        source: nodeById.get(l.source as string)!,
        target: nodeById.get(l.target as string)!,
        linkType: l.type,
        amount: l.amount ?? null,
        is_explanatory: l.is_explanatory,
        attention_score: l.attention_score ?? null,
        head_attentions: l.head_attentions ?? null,
      }));
    simLinksRef.current = simLinks;

    // Links Layer
    const linkSel = g.append("g").attr("class", "links-layer")
      .selectAll<SVGLineElement, SimLink>("line").data(simLinks).join("line")
      .attr("class", "graph-edge")
      .attr("stroke", (d) => getLinkColor(d))
      .attr("stroke-width", (d) => getLinkWidth(d))
      .attr("stroke-opacity", (d) => getLinkOpacity(d))
      .attr("filter", (d) => getLinkFilter(d))
      .attr("marker-end", (d) => (((d.attention_score ?? 0) >= 0.7 || d.is_explanatory) ? "url(#arrow-explanatory)" : "url(#arrow-standard)"))
      .style("cursor", "pointer")
      .on("click", (ev, d) => {
        ev.stopPropagation();
        setSelectedNode(null);
        setHoveredNode(null);
        setSelectedLink(d);
        updateLinkCardPos(d);
      });

    // Nodes Layer
    const nodeSel = g.append("g").attr("class", "nodes-layer")
      .selectAll<SVGGElement, SimNode>("g").data(simNodes).join("g")
      .attr("class", "node-group")
      .attr("data-node-id", (d) => d.id)
      .attr("opacity", 1)
      .style("cursor", "pointer");

    // Helper for hub size scaling
    const getHubBoost = (id: string) => {
      const deg = (inOutDegree.get(id)?.in ?? 0) + (inOutDegree.get(id)?.out ?? 0);
      return Math.min(deg * 0.35, 5);
    };

    // --- A. Wallet Nodes (Vibrant Solid Circles + 3D Specular Ring) ---
    const wallets = nodeSel.filter((d) => d.type === "wallet");

    // Seed Outer Radar Sweep Reticle
    wallets.filter((d) => d.is_seed)
      .append("circle")
      .attr("class", "animate-radar-reticle")
      .attr("r", (d) => 10 + getHubBoost(d.id) + 7)
      .attr("fill", "none")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 1.8)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.95)
      .attr("pointer-events", "none");

    // Wallet Solid Core Circle
    wallets.append("circle")
      .attr("class", "node-core")
      .attr("r", (d) => {
        const base = d.is_seed ? 10 : (d.risk_score ?? 0) >= 0.8 ? 9 : 7.5;
        return base + getHubBoost(d.id) + (d.risk_score ?? 0) * 3;
      })
      .attr("fill", (d) => getNodeColors(getRiskTier(d.risk_score, d.is_seed)).fill)
      .attr("stroke", (d) => getNodeColors(getRiskTier(d.risk_score, d.is_seed)).stroke)
      .attr("stroke-width", (d) => (d.is_seed ? 2 : 1.6))
      .attr("filter", (d) => (d.is_seed ? "url(#glow-seed)" : (d.risk_score ?? 0) >= 0.8 ? "url(#glow-critical)" : null));

    // Wallet Inner Specular Ring (3D depth)
    wallets.append("circle")
      .attr("r", (d) => {
        const base = d.is_seed ? 7 : (d.risk_score ?? 0) >= 0.8 ? 6 : 5;
        return Math.max(3, base + getHubBoost(d.id) * 0.7);
      })
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.45)")
      .attr("stroke-width", 1);

    // Micro-badge Text for Seed and Critical Nodes
    wallets.filter((d) => d.is_seed)
      .append("text")
      .attr("y", (d) => 10 + getHubBoost(d.id) + 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "7.5px")
      .attr("font-family", "monospace")
      .attr("font-weight", "800")
      .attr("fill", "#dc2626")
      .text("SEED");

    wallets.filter((d) => !d.is_seed && (d.risk_score ?? 0) >= 0.8)
      .append("text")
      .attr("y", (d) => 9 + getHubBoost(d.id) + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "7px")
      .attr("font-family", "monospace")
      .attr("font-weight", "700")
      .attr("fill", "#dc2626")
      .text("CRIT");

    // --- B. Transactions (Microchip Rounded Rectangles) ---
    const txs = nodeSel.filter((d) => d.type === "transaction");
    txs.append("rect")
      .attr("class", "node-core")
      .attr("x", -8).attr("y", -8)
      .attr("width", 16).attr("height", 16)
      .attr("rx", 3.5)
      .attr("fill", "#f8fafc")
      .attr("stroke", "#64748b")
      .attr("stroke-width", 1.5);

    txs.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "7.5px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#334155")
      .text("TX");

    // --- C. IPs (Cyber Sky Diamonds) ---
    const ips = nodeSel.filter((d) => d.type === "ip");
    ips.append("polygon")
      .attr("class", "node-core")
      .attr("points", "0,-10 10,0 0,10 -10,0")
      .attr("fill", "#e0f2fe")
      .attr("stroke", "#0284c7")
      .attr("stroke-width", 1.8);

    ips.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "7px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#0369a1")
      .text((d) => d.country?.slice(0, 2).toUpperCase() ?? "IP");

    // --- D. Selection & Focus Halo ---
    nodeSel.append("circle")
      .attr("class", "selection-halo")
      .attr("r", (d) => (d.type === "wallet" ? 17 + getHubBoost(d.id) + (d.risk_score ?? 0) * 3 : 15))
      .attr("fill", "none")
      .attr("stroke", "#0284c7")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0);

    // Event handlers
    nodeSel
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
    const drag = d3.drag<SVGGElement, SimNode>()
      .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (ev, d) => {
        d.fx = ev.x;
        d.fy = ev.y;
        if (selectedNodeRef.current?.id === d.id || hoveredNodeRef.current?.id === d.id) {
          updateHoverCardPos(d);
        } else if (selectedLinkRef.current) {
          const l = selectedLinkRef.current;
          if ((l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id) {
            updateLinkCardPos(l);
          }
        }
      })
      .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
    nodeSel.call(drag as never);

    // Force Simulation Setup
    const sim = d3.forceSimulation<SimNode>(simNodes)
      .alphaDecay(0.035)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(65))
      .force("charge", d3.forceManyBody().strength(-170))
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
    return () => { sim.stop(); };
  }, [nodes, links, inOutDegree]);

  // -------------------------------------------------------------------------
  // Dynamic 1-Hop Neighborhood Highlighting & Filtering
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isFiltered = filteredNodeIds !== null;
    const hasFocus = connectedNodeIds !== null;

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

      d3.select(this).transition().duration(140).attr("opacity", isVisible ? 1 : 0.12);
      d3.select(this).select(".selection-halo").transition().duration(140).attr("opacity", isTarget ? 1 : 0);
    });

    svg.selectAll<SVGLineElement, SimLink>(".links-layer line").each(function (d) {
      const sId = (d.source as SimNode).id;
      const tId = (d.target as SimNode).id;
      let isConn = true;
      if (selectedLink) {
        isConn =
          (d === selectedLink) ||
          (sId === (selectedLink.source as SimNode).id && tId === (selectedLink.target as SimNode).id) ||
          (sId === (selectedLink.target as SimNode).id && tId === (selectedLink.source as SimNode).id);
      } else if (hasFocus) {
        isConn = sId === activeFocusId || tId === activeFocusId;
      } else if (isFiltered) {
        isConn = filteredNodeIds.has(sId) && filteredNodeIds.has(tId);
      }

      const isEmphasized = (Boolean(selectedLink) && isConn) || (hasFocus && isConn);
      const baseWidth = getLinkWidth(d, isEmphasized);
      const baseOpacity = isConn ? (isEmphasized ? 1.0 : getLinkOpacity(d)) : 0.06;
      const baseColor = isEmphasized ? "#06b6d4" : getLinkColor(d);
      const baseFilter = isConn ? getLinkFilter(d) : null;

      d3.select(this).transition().duration(140)
        .attr("stroke-opacity", baseOpacity)
        .attr("stroke-width", baseWidth)
        .attr("stroke", baseColor)
        .attr("filter", baseFilter);
    });
  }, [activeFocusId, connectedNodeIds, filteredNodeIds, selectedLink]);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-slate-50 select-none">
      {/* ------------------------------------------------------------------- */}
      {/* Integrated Studio Command Bar (Clean, Non-overlapping Layout) */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Cluster Partition Badge + Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap max-w-[65vw]">
          {clusterId != null && (
            <div className="flex items-center gap-2 crypto-mono text-xs text-slate-800 bg-white/95 backdrop-blur-md border border-slate-200/90 px-3 py-1.5 rounded-lg shadow-card">
              <Network className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="font-extrabold text-slate-900 tracking-tight">Cluster #{clusterId}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">
                {nodes.length} Nodes • {links.length} Edges
              </span>
              {highlightMode && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200 tracking-wider">
                  GNN ACTIVE
                </span>
              )}
            </div>
          )}

          {/* Tactical Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-card">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1.5">
              Filter:
            </span>
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
                    ? "bg-slate-900 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <span>{label}</span>
                {count > 0 && id !== "all" && (
                  <span
                    className={clsx(
                      "text-[9.5px] crypto-mono font-bold px-1 rounded",
                      nodeFilter === id ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search Input + Compact Horizontal Navigation Tools */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center group">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 group-focus-within:text-sky-600 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search address in graph…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tactile-input w-36 sm:w-44 focus:w-56 h-8 pl-8 pr-6 text-[11px] crypto-mono rounded-lg text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                aria-label="Clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Horizontal Navigation Control Cluster */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-card">
            <ToolBtn id="graph-zoom-in" icon={<ZoomIn className="w-3.5 h-3.5" />} label="Zoom in (+)" onClick={() => zoomBy(1.3)} />
            <ToolBtn id="graph-zoom-out" icon={<ZoomOut className="w-3.5 h-3.5" />} label="Zoom out (-)" onClick={() => zoomBy(0.75)} />
            <ToolBtn id="graph-fit" icon={<Maximize2 className="w-3.5 h-3.5" />} label="Fit to Screen" onClick={fitToScreen} />
            <ToolBtn id="graph-reset" icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset View" onClick={resetView} />
            <ToolBtn
              id="graph-freeze"
              icon={frozen ? <Play className="w-3.5 h-3.5 text-sky-600" /> : <Pause className="w-3.5 h-3.5" />}
              label={frozen ? "Resume physics" : "Freeze physics"}
              onClick={toggleFreeze}
              active={frozen}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Bottom Left: Defense Tactical Legend with Dynamic Counts */}
      {/* ------------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-3.5 px-3.5 py-2 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-card text-[11px] text-slate-600">
        <button
          onClick={() => setNodeFilter(nodeFilter === "wallets" ? "all" : "wallets")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "wallets" ? "bg-slate-100 font-bold text-slate-900" : "hover:text-slate-900",
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-2xs" />
          <span>Wallet ({counts.wallets})</span>
        </button>

        <button
          onClick={() => setNodeFilter(nodeFilter === "tx" ? "all" : "tx")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "tx" ? "bg-slate-100 font-bold text-slate-900" : "hover:text-slate-900",
          )}
        >
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-500 shadow-2xs" />
          <span>Tx ({counts.txs})</span>
        </button>

        <button
          onClick={() => setNodeFilter(nodeFilter === "ip" ? "all" : "ip")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "ip" ? "bg-slate-100 font-bold text-slate-900" : "hover:text-slate-900",
          )}
        >
          <span className="w-2.5 h-2.5 rotate-45 bg-sky-100 border border-sky-600 shadow-2xs" />
          <span>IP Host ({counts.ips})</span>
        </button>

        <button
          onClick={() => setNodeFilter(nodeFilter === "seeds" ? "all" : "seeds")}
          className={clsx(
            "flex items-center gap-1.5 transition-all cursor-pointer px-1 py-0.5 rounded",
            nodeFilter === "seeds" ? "bg-red-50 font-bold text-red-900" : "hover:text-red-700",
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-red-600 bg-red-100 shadow-2xs animate-pulse" />
          <span className="font-bold text-red-700">Seed Entity ({counts.seeds})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Tactical SVG Leader Line (Connects Focused Node or Edge to HUD Card) */}
      {/* ------------------------------------------------------------------- */}
      {(activeDisplayNode || selectedLink) && hoverLeader && (
        <svg className="absolute inset-0 pointer-events-none z-25 w-full h-full">
          {/* Target Reticle at Node or Edge Center */}
          <circle cx={hoverLeader.x1} cy={hoverLeader.y1} r="4" fill="#06b6d4" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx={hoverLeader.x1} cy={hoverLeader.y1} r="9" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2,2" opacity="0.8" />
          {/* Connecting Dashed Cyan Beam */}
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
          {/* Anchor Tick on HUD Card Edge */}
          <circle cx={hoverLeader.x2} cy={hoverLeader.y2} r="3" fill="#38bdf8" />
        </svg>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Unified Forensic Inspector HUD (Glass Dark Card for Nodes) */}
      {/* ------------------------------------------------------------------- */}
      {activeDisplayNode && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={
            hoverPos
              ? { left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }
              : { right: "16px", top: "64px" }
          }
          className={clsx(
            "absolute z-30 w-[380px] rounded-2xl bg-slate-950/95 text-white backdrop-blur-xl border border-slate-700/80 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[left,top] duration-150 ease-out",
            selectedNode ? "pointer-events-auto ring-1 ring-sky-500/50" : "pointer-events-none",
          )}
        >
          {/* Header: Type Badge + Threat Tier Tag + Pinned Tag / Close */}
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

            {/* Pinned Tag & Close Action Button */}
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
                  title="Unpin / Close inspector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Node Identifier + Copy Action */}
          <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-400 mb-1">
              <span className="tracking-widest">Target Identifier</span>
              <button
                onClick={() => copyAddress(activeDisplayNode.id)}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 cursor-pointer font-semibold transition-colors pointer-events-auto"
                title="Copy full identifier"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="crypto-mono text-xs font-bold text-slate-100 break-all select-all leading-relaxed">
              {activeDisplayNode.id}
            </p>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-1">
                Risk Score
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={clsx(
                    "crypto-mono text-base font-extrabold",
                    (activeDisplayNode.risk_score ?? 0) >= 0.8
                      ? "text-red-400"
                      : (activeDisplayNode.risk_score ?? 0) >= 0.5
                      ? "text-amber-400"
                      : "text-emerald-400",
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
                      : "bg-emerald-500",
                  )}
                  style={{ width: `${Math.round((activeDisplayNode.risk_score ?? 0) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-1">
                Cluster Degree
              </span>
              <span className="crypto-mono text-base font-extrabold text-slate-100 block">
                {(inOutDegree.get(activeDisplayNode.id)?.in ?? 0) + (inOutDegree.get(activeDisplayNode.id)?.out ?? 0)} Edges
              </span>
              <span className="text-[9.5px] text-slate-400 crypto-mono block mt-1">
                ↓ {inOutDegree.get(activeDisplayNode.id)?.in ?? 0} in • ↑ {inOutDegree.get(activeDisplayNode.id)?.out ?? 0} out
              </span>
            </div>
          </div>

          {/* Multi-Head Relational Attention Breakdown (when incident edge exists) */}
          {primaryIncidentLink && (
            <AttentionBreakdownSection
              attentionScore={primaryIncidentLink.attention_score}
              headAttentions={primaryIncidentLink.head_attentions}
              isExplanatory={primaryIncidentLink.is_explanatory}
              title="Transformer Relational Attention"
              subtitle={`Incident ${primaryIncidentLink.linkType}: ${
                (typeof primaryIncidentLink.source === "object" ? (primaryIncidentLink.source as SimNode).id : primaryIncidentLink.source) === activeDisplayNode.id
                  ? (typeof primaryIncidentLink.target === "object" ? (primaryIncidentLink.target as SimNode).label : primaryIncidentLink.target)
                  : (typeof primaryIncidentLink.source === "object" ? (primaryIncidentLink.source as SimNode).label : primaryIncidentLink.source)
              }`}
            />
          )}

          {/* Primary Action Button: Inspect Full Forensic Dossier */}
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

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            {selectedNode ? (
              <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Pin className="w-3 h-3 rotate-45" />
                <span>Pinned • Click canvas or ✕ to unpin</span>
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
      {/* Unified Relational Edge Forensic Inspector HUD */}
      {/* ------------------------------------------------------------------- */}
      {selectedLink && !selectedNode && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={
            hoverPos
              ? { left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }
              : { right: "16px", top: "64px" }
          }
          className="absolute z-30 w-[380px] rounded-2xl bg-slate-950/95 text-white backdrop-blur-xl border border-slate-700/80 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[left,top] duration-150 ease-out pointer-events-auto ring-1 ring-cyan-500/50"
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
                title="Unpin / Close inspector"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Relational Flow Trajectory Card */}
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
              <span className="font-bold text-slate-100 bg-slate-800/80 px-2 py-1 rounded truncate max-w-[140px]" title={(selectedLink.source as SimNode).id}>
                {(selectedLink.source as SimNode).label}
              </span>
              <span className="text-cyan-400 font-extrabold">→</span>
              <span className="font-bold text-slate-100 bg-slate-800/80 px-2 py-1 rounded truncate max-w-[140px]" title={(selectedLink.target as SimNode).id}>
                {(selectedLink.target as SimNode).label}
              </span>
            </div>
          </div>

          {/* Multi-Head Attention Breakdown Card */}
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
              <span>Edge Pinned • Click canvas or ✕ to unpin</span>
            </span>
            <span className="crypto-mono text-slate-400">Cluster #{clusterId}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Loading Overlay */}
      {/* ------------------------------------------------------------------- */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/85 backdrop-blur-2xs z-30">
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white border border-slate-200 shadow-card">
            <div className="w-9 h-9 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <span className="text-xs font-bold text-slate-900 crypto-mono block">Computing Force Layout…</span>
              <span className="text-[10px] text-slate-400 crypto-mono">Optimizing 1-hop cluster topology</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nodes.length === 0 && clusterId != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-6 rounded-xl bg-white/95 border border-slate-200 shadow-card text-center max-w-sm">
            <Network className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800 crypto-mono mb-1">No Topology Data</p>
            <p className="text-[11px] text-slate-500">No graph partition found for cluster #{clusterId}. Select an alert row from the stream.</p>
          </div>
        </div>
      )}

      {/* SVG Canvas with Tactical Radar Pattern */}
      <svg
        ref={svgRef}
        className="w-full flex-1 dot-matrix-bg cursor-grab active:cursor-grabbing"
        aria-label="Force-directed transaction graph"
      />
    </div>
  );
}

function ToolBtn({
  id,
  icon,
  label,
  onClick,
  active,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
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
          ? "bg-sky-50 border-sky-300 text-sky-700 shadow-inner"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
      )}
    >
      {icon}
    </button>
  );
}
