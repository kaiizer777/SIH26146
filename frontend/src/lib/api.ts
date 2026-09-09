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
}

export interface AlertsParams {
  limit?: number;
  offset?: number;
  sort?: "risk_desc" | "risk_asc" | "anomaly_desc" | "ts_desc";
  verdict?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  min_risk?: number | null;
  min_anomaly?: number | null;
  is_mixing?: boolean | null;
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
  extra: Record<string, unknown>;
}

export interface EntityExplainResponse {
  address: string;
  composite_score: number;
  verdict: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  score_breakdown: ScoreBreakdown;
  evidence_trail: EvidenceTrail;
  shap_attributions: ShapAttribution[];
  gnn_subgraph: GnnSubgraph | null;
  summary_narrative: string;
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
  type: string;
  amount: number | null;
  is_explanatory: boolean;
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
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (body.detail && typeof body.detail === "object") {
        detail = body.detail.detail || JSON.stringify(body.detail);
      } else if (body.message) {
        detail = body.message;
      }
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
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (body.detail && typeof body.detail === "object") {
        detail = body.detail.detail || JSON.stringify(body.detail);
      } else if (body.message) {
        detail = body.message;
      }
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<IngestResponse>;
}

export async function fetchIngestStatus(taskId: string): Promise<TaskStatusResponse> {
  return apiFetch<TaskStatusResponse>(`/ingest/status/${taskId}`);
}
