/**
 * Typed API client for the SIH26146 NTRO Bitcoin AML backend.
 *
 * All requests include the dev bearer token from the env variable
 * NEXT_PUBLIC_API_TOKEN (falls back to the default dev token).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const API_TOKEN =
  process.env.NEXT_PUBLIC_API_TOKEN ?? "dev-token-ntro-2026";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertItem {
  address: string;
  txid: string | null;
  cluster_id: number | null;
  anomaly_score: number | null;
  anomaly_rank_percentile: number | null;
  risk_score: number | null;
  composite_score: number;
  verdict: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  is_mixing: boolean;
  is_peeling_chain: boolean;
  chain_hops: number | null;
  is_seed: boolean;
  seed_family: string | null;
  triggered_rules: string[];
  ts: string | null;
  src_ip: string | null;
  geo_country: string | null;
}

export interface AlertsResponse {
  total: number;
  offset: number;
  limit: number;
  items: AlertItem[];
  total_indexed?: number;
  verdict_counts?: Record<string, number>;
}

export interface AlertsParams {
  limit?: number;
  offset?: number;
  sort?: "risk_desc" | "risk_asc" | "anomaly_desc" | "ts_desc";
  verdict?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string | null;
  min_risk?: number | null;
  min_anomaly?: number | null;
  is_mixing?: boolean | null;
  is_peeling_chain?: boolean | null;
  is_coinjoin?: boolean | null;
  cluster_id?: number | null;
  search?: string | null;
}

export interface ScoreBreakdown {
  anomaly_component: number;
  risk_component: number;
  rule_bonus: number;
  mixing_indicator: number;
}

export interface ShapAttribution {
  feature: string;
  label: string;
  value: number;
}

export interface GnnSubgraphNode {
  id: string;
  label: string;
  node_type: string;
  risk_score: number | null;
  importance: number | null;
}

export interface GnnSubgraphEdge {
  source: string;
  target: string;
  edge_type: string | null;
  importance: number | null;
}

export interface GnnSubgraph {
  nodes: GnnSubgraphNode[];
  edges: GnnSubgraphEdge[];
}

export interface EvidenceTrail {
  cluster_id: number | null;
  cluster_size: number | null;
  anomaly_score: number | null;
  anomaly_rank_percentile: number | null;
  is_mixing: boolean;
  is_peeling_chain: boolean;
  chain_hops: number | null;
  pass_through_ratio: number | null;
  triggered_rules: string[];
  mixing_patterns: string[];
  seed_family: string | null;
  seed_wallet_proximity?: number | null;
  provisional?: boolean;
  extra: Record<string, unknown>;
}

export interface EntityExplainResponse {
  address: string;
  composite_score: number;
  /**
   * Verdict vocabulary. The four risk tiers come from
   * `app/services/risk_thresholds.py::map_verdict`; "UNKNOWN" is
   * `routers/entity.py::UNKNOWN_VERDICT`, the explicit state for an address
   * that has telemetry but was never scored. It is reported on
   * `evidence_trail.extra.verdict_stored` and flagged by
   * `evidence_trail.extra.scored === false`.
   */
  verdict: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  score_breakdown: ScoreBreakdown;
  evidence_trail: EvidenceTrail;
  shap_attributions: ShapAttribution[];
  attention_matrix?: number[][] | null;
  gnn_subgraph: GnnSubgraph | null;
  summary_narrative: string;
  provisional?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "wallet" | "transaction" | "ip";
  risk_score: number | null;
  anomaly_score: number | null;
  is_seed: boolean;
  country: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  type: "SENDS" | "RECEIVES" | "CO_SPEND" | "OBSERVED";
  amount?: number | null;
  is_explanatory: boolean;
  attention_score?: number | null;
  head_attentions?: Record<string, number> | null;
}

export interface GraphResponse {
  cluster_id: number;
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface IngestResponse {
  task_id: string;
  status: "PENDING";
}

export interface TaskStatusResponse {
  task_id: string;
  status: string;
  progress?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "ApiError";
  }
}

function extractErrorDetail(
  body: Record<string, unknown> | null | undefined,
  fallback: string,
): string {
  if (typeof body?.detail === "string") {
    return body.detail;
  }
  if (Array.isArray(body?.detail)) {
    const msgs = (body.detail as Array<{ msg?: string }>)
      .map((d) => d?.msg)
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join("; ");
    return JSON.stringify(body.detail);
  }
  if (body?.detail && typeof body.detail === "object") {
    const detailObj = body.detail as Record<string, unknown>;
    return (
      (typeof detailObj.detail === "string" ? detailObj.detail : null) ||
      JSON.stringify(body.detail)
    );
  }
  if (typeof body?.message === "string") {
    return body.message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = extractErrorDetail(body, detail);
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export async function fetchAlerts(params: AlertsParams = {}): Promise<AlertsResponse> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  if (params.sort) qs.set("sort", params.sort);
  if (params.verdict) qs.set("verdict", params.verdict);
  if (params.min_risk != null) qs.set("min_risk", String(params.min_risk));
  if (params.min_anomaly != null) qs.set("min_anomaly", String(params.min_anomaly));
  if (params.is_mixing != null) qs.set("is_mixing", String(params.is_mixing));
  if (params.is_peeling_chain != null) qs.set("is_peeling_chain", String(params.is_peeling_chain));
  if (params.is_coinjoin != null) qs.set("is_coinjoin", String(params.is_coinjoin));
  if (params.cluster_id != null) qs.set("cluster_id", String(params.cluster_id));
  if (params.search) qs.set("search", params.search);

  const queryStr = qs.toString();
  return apiFetch<AlertsResponse>(`/api/v1/alerts${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchEntityExplain(address: string): Promise<EntityExplainResponse> {
  return apiFetch<EntityExplainResponse>(`/api/v1/entity/${encodeURIComponent(address)}/explain`);
}

export async function fetchGraph(clusterId: number, maxNodes = 150): Promise<GraphResponse> {
  return apiFetch<GraphResponse>(`/api/v1/graph/${clusterId}?max_nodes=${maxNodes}`);
}

export async function uploadIngestFile(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      // Do NOT set Content-Type — browser sets it with boundary for multipart
    },
    body: formData,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = extractErrorDetail(body, detail);
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<IngestResponse>;
}

export async function fetchIngestStatus(taskId: string): Promise<TaskStatusResponse> {
  return apiFetch<TaskStatusResponse>(`/ingest/status/${taskId}`);
}

export interface IngestSyncResult {
  scored: number;
  upserted: number;
  skipped_existing: number;
}

export async function syncIngestTask(
  taskId: string,
): Promise<IngestSyncResult> {
  const res = await fetch(`${API_BASE}/ingest/sync/${encodeURIComponent(taskId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 409) {
    return { scored: 0, upserted: 0, skipped_existing: 0 };
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = extractErrorDetail(body, detail);
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<IngestSyncResult>;
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

export interface EnrichmentProgressPayload {
  stage: string;
  status: "running" | "ok" | "failed";
  elapsed_total: number;
  stage_elapsed: number;
  stages_completed: string[];
  stages_total: number;
  counts: Record<string, number>;
  current?: number;
  total?: number;
  unit?: string;
}

export interface EnrichmentStatusResponse {
  status: string; // "not_dispatched" | "PROGRESS" | "SUCCESS" | "FAILURE"
  progress?: EnrichmentProgressPayload;
  result?: Record<string, unknown>;
  error?: string;
}

export interface EnrichmentReloadResult {
  status: string;
  composite_count: number;
}

export async function fetchEnrichmentStatus(
  taskId: string,
): Promise<EnrichmentStatusResponse> {
  return apiFetch<EnrichmentStatusResponse>(
    `/ingest/enrichment/${encodeURIComponent(taskId)}`,
  );
}

export async function reloadXaiStore(
  taskId: string,
): Promise<EnrichmentReloadResult> {
  return apiFetch<EnrichmentReloadResult>(
    `/ingest/enrichment/${encodeURIComponent(taskId)}/reload`,
    { method: "POST" },
  );
}

export async function purgeIngestedData(): Promise<{
  status: string;
  pg_deleted: number;
  wallets_deleted: number;
  composite_count: number;
}> {
  return apiFetch("/ingest/purge", { method: "POST" });
}

