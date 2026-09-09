"use client";

import { useCallback, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Table, Network } from "lucide-react";
import { clsx } from "clsx";

import TopNav from "@/components/TopNav";
import FilterSidebar from "@/components/FilterSidebar";
import AlertTable from "@/components/AlertTable";
import GraphCanvas from "@/components/GraphCanvas";
import EntityDrawer from "@/components/EntityDrawer";
import IngestModal from "@/components/IngestModal";

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

// Hardcoded from Phase 8 verification — used when API hasn't loaded yet
const FALLBACK_VERDICT_COUNTS = {
  CRITICAL: 103,
  HIGH: 78,
  MEDIUM: 3377,
  LOW: 13462,
};

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

  // Modal
  const [ingestOpen, setIngestOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Derive API params from filter state
  // ---------------------------------------------------------------------------

  const alertParams = {
    sort: "risk_desc" as const,
    verdict:
      filters.verdicts.size === 1
        ? ([...filters.verdicts][0] as Verdict)
        : null,
    min_anomaly: filters.minAnomaly > 0 ? filters.minAnomaly : null,
    is_mixing:
      filters.isCoinJoin || filters.isPeelingChain ? true : null,
    cluster_id: filters.clusterId ? parseInt(filters.clusterId) : null,
    search: searchValue || null,
  };

  const { items, total, isLoading, error, refresh, loadMore, hasMore } =
    useAlerts({ ...alertParams, pageSize: 50 });

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
        totalIndexed={total}
        onSearchFocus={handleSearchFocus}
        onIngestClick={() => setIngestOpen(true)}
      />

      {/* Main layout: sidebar | center | drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          filteredCount={total}
          totalCount={
            FALLBACK_VERDICT_COUNTS.CRITICAL +
            FALLBACK_VERDICT_COUNTS.HIGH +
            FALLBACK_VERDICT_COUNTS.MEDIUM +
            FALLBACK_VERDICT_COUNTS.LOW
          }
          verdictCounts={FALLBACK_VERDICT_COUNTS}
        />

        {/* Center canvas */}
        <main className="flex flex-col flex-1 overflow-hidden">
          {/* View toggle */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white shrink-0">
            <ViewToggle
              active={view === "table"}
              icon={<Table className="w-3.5 h-3.5" />}
              label="Table"
              id="view-toggle-table"
              onClick={() => setView("table")}
            />
            <ViewToggle
              active={view === "graph"}
              icon={<Network className="w-3.5 h-3.5" />}
              label="Graph"
              id="view-toggle-graph"
              onClick={() => setView("graph")}
            />
            <span className="ml-auto crypto-mono text-[11px] text-slate-400">
              {total.toLocaleString()} entities
            </span>
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
        />
      </div>

      {/* Ingest Modal */}
      <IngestModal
        isOpen={ingestOpen}
        onClose={() => setIngestOpen(false)}
        onSuccess={handleIngestSuccess}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// View toggle button
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
        "flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
