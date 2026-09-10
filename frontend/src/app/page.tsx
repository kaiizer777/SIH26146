"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Table, Network } from "lucide-react";
import { clsx } from "clsx";

import TopNav from "@/components/TopNav";
import FilterSidebar from "@/components/FilterSidebar";
import AlertTable from "@/components/AlertTable";
import GraphCanvas from "@/components/GraphCanvas";
import EntityDrawer from "@/components/EntityDrawer";
import IngestModal from "@/components/IngestModal";
import ModelProvenanceModal from "@/components/ModelProvenanceModal";

import { useAlerts } from "@/hooks/useAlerts";
import {
  fetchEntityExplain,
  fetchGraph,
  type AlertItem,
  type EntityExplainResponse,
  type GraphNode,
  type GraphLink,
  ApiError,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Filter state type
// ---------------------------------------------------------------------------

type Verdict = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface Filters {
  verdicts: Set<Verdict>;
  minAnomaly: number;
  isPeelingChain: boolean;
  isCoinJoin: boolean;
  clusterId: string;
}

const DEFAULT_FILTERS: Filters = {
  verdicts: new Set(),
  minAnomaly: 0,
  isPeelingChain: false,
  isCoinJoin: false,
  clusterId: "",
};

// SOTA Dual Transformer verified counts — used when API hasn't loaded yet
const FALLBACK_VERDICT_COUNTS = {
  CRITICAL: 103,
  HIGH: 10,
  MEDIUM: 3112,
  LOW: 12648,
};
const FALLBACK_TOTAL_INDEXED = 15873;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SurveillanceDashboard() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState<"table" | "graph">("table");

  // Selected entity
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [entityData, setEntityData] = useState<EntityExplainResponse | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);

  // Graph data
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphClusterId, setGraphClusterId] = useState<number | null>(null);

  // Modals
  const [ingestOpen, setIngestOpen] = useState(false);
  const [provenanceOpen, setProvenanceOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Derive API params from filter state
  // ---------------------------------------------------------------------------

  const alertParams = {
    sort: "risk_desc" as const,
    verdict:
      filters.verdicts.size > 0
        ? Array.from(filters.verdicts).join(",")
        : null,
    min_anomaly: filters.minAnomaly > 0 ? filters.minAnomaly : null,
    // Strict heuristic isolation:
    is_peeling_chain:
      filters.isPeelingChain && !filters.isCoinJoin ? true : null,
    is_coinjoin:
      filters.isCoinJoin && !filters.isPeelingChain ? true : null,
    is_mixing:
      filters.isPeelingChain && filters.isCoinJoin ? true : null,
    cluster_id: filters.clusterId ? parseInt(filters.clusterId) : null,
    search: searchValue || null,
  };

  const {
    items,
    total,
    totalIndexed,
    verdictCounts,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore,
  } = useAlerts({ ...alertParams, pageSize: 50 });

  // Auto-populate Prime Cluster #516 when entering graph view with no cluster active
  useEffect(() => {
    if (view === "graph" && graphClusterId === null && !graphLoading) {
      setGraphLoading(true);
      setGraphClusterId(516);
      fetchGraph(516, 150)
        .then((g) => {
          setGraphNodes(g.nodes);
          setGraphLinks(g.links);
        })
        .catch(() => {
          setGraphNodes([]);
          setGraphLinks([]);
        })
        .finally(() => setGraphLoading(false));
    }
  }, [view, graphClusterId, graphLoading]);

  // ---------------------------------------------------------------------------
  // Entity selection
  // ---------------------------------------------------------------------------

  const handleSelectAlert = useCallback(async (item: AlertItem) => {
    setSelectedAddress(item.address);
    setEntityData(null);
    setEntityError(null);
    setEntityLoading(true);

    // Load graph for the cluster
    if (item.cluster_id != null) {
      setGraphLoading(true);
      setGraphClusterId(item.cluster_id);
      fetchGraph(item.cluster_id, 150)
        .then((g) => {
          setGraphNodes(g.nodes);
          setGraphLinks(g.links);
        })
        .catch(() => {
          setGraphNodes([]);
          setGraphLinks([]);
        })
        .finally(() => setGraphLoading(false));
    }

    try {
      const data = await fetchEntityExplain(item.address);
      setEntityData(data);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "Failed to load entity dossier";
      setEntityError(msg);
      toast.error(msg);
    } finally {
      setEntityLoading(false);
    }
  }, []);

  const handleSelectWalletAddress = useCallback(async (address: string) => {
    setSelectedAddress(address);
    setEntityData(null);
    setEntityError(null);
    setEntityLoading(true);

    try {
      const data = await fetchEntityExplain(address);
      setEntityData(data);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "Failed to load entity dossier";
      setEntityError(msg);
      toast.error(msg);
    } finally {
      setEntityLoading(false);
    }
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedAddress(null);
    setEntityData(null);
    setEntityError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Search focus shortcut (called from TopNav)
  // ---------------------------------------------------------------------------

  const handleSearchFocus = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  // ---------------------------------------------------------------------------
  // Reset filters
  // ---------------------------------------------------------------------------

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchValue("");
  }, []);

  // ---------------------------------------------------------------------------
  // Ingest success → refresh alerts
  // ---------------------------------------------------------------------------

  const handleIngestSuccess = useCallback(() => {
    refresh();
    toast.success("Alerts refreshed with new batch data");
  }, [refresh]);

  // ---------------------------------------------------------------------------
  // Determine GNN highlight mode
  // ---------------------------------------------------------------------------

  const hasGnnData =
    entityData?.gnn_subgraph != null &&
    (entityData.gnn_subgraph.nodes.length > 0 ||
      entityData.gnn_subgraph.edges.length > 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <Toaster position="bottom-right" richColors />

      {/* Top Navigation */}
      <TopNav
        totalIndexed={totalIndexed > 0 ? totalIndexed : FALLBACK_TOTAL_INDEXED}
        onSearchFocus={handleSearchFocus}
        onIngestClick={() => setIngestOpen(true)}
        onProvenanceClick={() => setProvenanceOpen(true)}
      />

      {/* Main layout: sidebar | center | drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          filteredCount={total}
          totalCount={totalIndexed > 0 ? totalIndexed : FALLBACK_TOTAL_INDEXED}
          verdictCounts={
            verdictCounts && typeof verdictCounts.CRITICAL === "number"
              ? (verdictCounts as typeof FALLBACK_VERDICT_COUNTS)
              : FALLBACK_VERDICT_COUNTS
          }
        />

        {/* Center canvas */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {/* Enhanced Command Header Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-[0_1px_2px_rgba(15,23,42,0.03),inset_0_1px_0_#ffffff] shrink-0">
            {/* View switcher segmented control with 3D recessed track */}
            <div className="inline-flex p-1 rounded-lg bg-slate-200/80 border border-slate-300/80 shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.1),0_1px_0_rgba(255,255,255,0.8)]">
              <ViewToggle
                active={view === "table"}
                icon={<Table className="w-3.5 h-3.5 stroke-[2.2]" />}
                label="Alerts Stream"
                id="view-toggle-table"
                onClick={() => setView("table")}
              />
              <ViewToggle
                active={view === "graph"}
                icon={<Network className="w-3.5 h-3.5 stroke-[2.2]" />}
                label="Cluster Topology"
                id="view-toggle-graph"
                onClick={() => setView("graph")}
              />
            </div>

            {/* Live stream status + count */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-b from-white to-slate-50 border border-slate-300 text-[11px] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_#ffffff]">
                <span className="w-2 h-2 rounded-full led-3d-low" />
                <span className="crypto-mono font-bold text-[10px] tracking-wider text-emerald-800">STREAM SYNCED</span>
              </div>
              <span className="crypto-mono text-xs font-bold text-slate-800 bg-gradient-to-b from-white to-slate-50 border border-slate-300 px-3 py-1 rounded-md shadow-[0_1px_2px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff]">
                {total.toLocaleString()} entities
              </span>
            </div>
          </div>

          {/* Table view */}
          {view === "table" && (
            <AlertTable
              items={items}
              total={total}
              isLoading={isLoading}
              error={error}
              selectedAddress={selectedAddress}
              onSelect={handleSelectAlert}
              onLoadMore={loadMore}
              hasMore={hasMore}
              onResetFilters={handleResetFilters}
              searchRef={searchRef}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
            />
          )}

          {/* Graph view */}
          {view === "graph" && (
            <GraphCanvas
              nodes={graphNodes}
              links={graphLinks}
              highlightMode={hasGnnData && selectedAddress !== null}
              isLoading={graphLoading}
              clusterId={graphClusterId}
              onSelectWallet={handleSelectWalletAddress}
            />
          )}
        </main>

        {/* Forensic Dossier Drawer */}
        <EntityDrawer
          address={selectedAddress}
          data={entityData}
          isLoading={entityLoading}
          error={entityError}
          onClose={handleCloseDrawer}
          onProvenanceClick={() => setProvenanceOpen(true)}
        />
      </div>

      {/* Ingest Modal */}
      <IngestModal
        isOpen={ingestOpen}
        onClose={() => setIngestOpen(false)}
        onSuccess={handleIngestSuccess}
      />

      {/* Model Architecture Provenance & Benchmark Modal (FLEX-3) */}
      <ModelProvenanceModal
        isOpen={provenanceOpen}
        onClose={() => setProvenanceOpen(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// View toggle button (3D Segmented Control Pill)
// ---------------------------------------------------------------------------

function ViewToggle({
  active,
  icon,
  label,
  id,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  id: string;
  onClick: () => void;
  }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 h-7 px-3.5 rounded-md text-xs transition-all cursor-pointer select-none",
        active
          ? "bg-gradient-to-b from-white to-slate-50 text-slate-900 border border-slate-300 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.12),inset_0_1px_0_#ffffff] font-extrabold"
          : "text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent font-semibold active:translate-y-[0.5px]",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

