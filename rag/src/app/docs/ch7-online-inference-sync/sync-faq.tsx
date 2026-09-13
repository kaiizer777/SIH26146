"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Lock,
  Search,
  CheckCircle2,
  Server,
  Database,
  Cpu,
  AlertTriangle,
  FileCode,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  category: "ARCHITECTURE_IPC" | "HANDSHAKE_SAFETY" | "CONCURRENCY_LOCKS" | "STATUTORY_PROVISIONAL";
  badgeText: string;
  technicalNote?: string;
  answer: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: "why-not-redis-for-xai-store",
    question: "Why didn't we just store xai_store in Redis instead of FastAPI process memory?",
    category: "ARCHITECTURE_IPC",
    badgeText: "SUB-MILLISECOND RAM LATENCY",
    technicalNote: "RAM Pointer: ~400ns vs Redis Socket + JSON SerDe: 12–25ms",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          While Redis is an exceptional distributed cache and message broker, relying entirely on Redis for the primary XAI artifact store creates fatal latency and serialization bottlenecks for high-throughput forensic investigations:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>JSON Serialization / Deserialization Penalty:</strong> The XAI store houses over 17,020 composite risk records, 17,020 evidence trails, 4,839 18-feature SHAP waterfall vectors, and 500 topological GNN subgraphs. Storing these in Redis requires continual JSON stringification and parsing (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">json.loads</code>/<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">json.dumps</code>) on every API request, consuming 12ms to 25ms of CPU time per query.
          </li>
          <li>
            <strong>Sub-Microsecond Memory Pointers:</strong> By storing Python dictionaries (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">dict[str, Any]</code>) directly inside FastAPI&rsquo;s virtual address space, dictionary lookups (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">_composite[address]</code>) resolve in <strong>~400 nanoseconds</strong> via hash table pointer dereferencing with zero TCP socket overhead.
          </li>
          <li>
            <strong>Hybrid Division of Responsibilities:</strong> Redis is preserved for what it does best: distributed task brokering, temporary idempotency locks (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">file_hash:*</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">sync_done:*</code>), and task status tracking. FastAPI RAM holds the hot analytical graph artifacts.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "why-frontend-triggers-sync",
    question: "Why does the frontend trigger the sync instead of Celery calling FastAPI directly?",
    category: "ARCHITECTURE_IPC",
    badgeText: "AIR-GAPPED NETWORK TOPOLOGY",
    technicalNote: "Decoupled Unidirectional Ingress // Zero Circular HTTP Dependencies",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          Having the Next.js client initiate <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">POST /ingest/sync/{'{task_id}'}</code> upon detecting task success is an intentional architectural design for tactical defense networks:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>Network Topology &amp; Firewall Isolation:</strong> In air-gapped sovereign military enclaves, background worker nodes often operate on isolated backend compute subnets with outbound database access to PostgreSQL and Redis, but <em>zero inbound HTTP routes</em> back to the reverse-proxy or FastAPI ingress. Requiring Celery to initiate HTTP calls back to FastAPI would fail in partitioned container networks.
          </li>
          <li>
            <strong>Elimination of Circular Dependencies:</strong> Making Celery depend on FastAPI&rsquo;s HTTP port introduces an operational loop: FastAPI calls Celery, and Celery calls FastAPI. If FastAPI is under heavy analyst query load, worker tasks could timeout waiting for FastAPI HTTP responses, blocking the worker pool.
          </li>
          <li>
            <strong>Client-Side Orchestration:</strong> The Next.js frontend is already polling <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">/ingest/status/{'{task_id}'}</code> to manage the upload progress modal. Making the frontend the coordinator guarantees that the alert grid refresh is perfectly sequenced with the memory synchronization.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "user-closes-tab-during-sync",
    question: "What happens if an operator closes the browser tab before the sync request completes?",
    category: "HANDSHAKE_SAFETY",
    badgeText: "FAULT RECOVERY & IDEMPOTENCY",
    technicalNote: "Zero Data Loss // PostgreSQL Committed // Lazy Reconciliation",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          The system architecture guarantees zero data loss and clean self-healing even if an operator forcibly terminates the browser mid-sync:
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>PostgreSQL Ground Truth is Immutable:</strong> Celery&rsquo;s bulk <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">COPY</code> transaction commits directly to PostgreSQL <em>before</em> the task state is marked <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">SUCCESS</code>. All ledger transactions and foreign keys are safely persisted on disk.
          </li>
          <li>
            <strong>Idempotent Sync Recovery:</strong> If the sync HTTP request never fired, the Redis key <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">sync_done:{'{task_id}'}</code> was never locked. When any operator re-opens the alert dashboard or calls the sync endpoint, the sync executes cleanly without conflict.
          </li>
          <li>
            <strong>Scheduled Re-conciliation:</strong> In production deployments, a lightweight Celery beat cron task or the periodic GDS retraining pipeline inspects PostgreSQL for any un-indexed rows (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">ingested_at &gt; last_sync</code>) and converges the store automatically.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "provisional-vs-fully-converged",
    question: "What is the technical and legal difference between a Provisional Dossier and a Fully Converged Dossier?",
    category: "STATUTORY_PROVISIONAL",
    badgeText: "DUAL PIPELINE MATURITY",
    technicalNote: "Provisional: <15ms Inline FT-Transformer vs Fully Converged: Neo4j GDS + SHAP",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] p-2 bg-slate-50 border border-slate-200 rounded">
          <div className="p-2 bg-white rounded border border-amber-200">
            <div className="text-amber-800 font-bold uppercase text-[10px]">Provisional Dossier (Phase 11)</div>
            <div className="text-slate-600 mt-1">&bull; Latency: &lt;15ms online</div>
            <div className="text-slate-600">&bull; FT-Transformer Tabular MSE: LIVE</div>
            <div className="text-slate-600">&bull; Heuristic Rules: LIVE (Peeling/Seeds)</div>
            <div className="text-slate-600">&bull; GNN Risk / Louvain: DEFERRED (—)</div>
            <div className="text-amber-700 font-semibold mt-1">&bull; Statutory Caveat Attached</div>
          </div>
          <div className="p-2 bg-white rounded border border-emerald-200">
            <div className="text-emerald-800 font-bold uppercase text-[10px]">Fully Converged Dossier (Phases 0–9)</div>
            <div className="text-slate-600 mt-1">&bull; Latency: Offline batch cycle</div>
            <div className="text-slate-600">&bull; FT-Transformer Tabular MSE: Indexed</div>
            <div className="text-slate-600">&bull; Relational Graph Transformer: CONVERGED</div>
            <div className="text-slate-600">&bull; Neo4j Louvain Modularity: Complete</div>
            <div className="text-emerald-700 font-semibold mt-1">&bull; Full 18-Feature SHAP Waterfall</div>
          </div>
        </div>
        <p>
          <strong>Evidentiary Rationale:</strong> Under the Indian Evidence Act Section 65B and Bharatiya Sakshya Adhiniyam (BSA 2023) Section 63, electronic evidence must never misrepresent its computational origin. Labeling fresh entities with <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">"provisional": true</code> guarantees that investigating officers understand the graph metrics are awaiting periodic topological convergence, preventing misleading assertions in court.
        </p>
      </div>
    ),
  },
  {
    id: "how-rlock-prevents-race-conditions",
    question: "How does threading.RLock prevent race conditions during high-volume analyst queries?",
    category: "CONCURRENCY_LOCKS",
    badgeText: "THREAD-SAFE RE-ENTRANT MUTEX",
    technicalNote: "Non-blocking Re-entrancy // Atomic Batch Dictionary Writes",
    answer: (
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>
          FastAPI executes synchronous service functions inside an AnyIO thread pool (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">ThreadPoolExecutor</code>) to prevent blocking the asynchronous event loop. This means multiple worker threads concurrently access the module-level dictionaries <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">_composite</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">_evidence</code>.
        </p>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
          <li>
            <strong>Dictionary Size Mutation Hazard:</strong> In CPython, writing to a dictionary while another thread iterates over it (e.g. during <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">verdict_counts()</code> or full-index scans) raises an unhandled <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">RuntimeError: dictionary changed size during iteration</code>, crashing the query.
          </li>
          <li>
            <strong>Why RLock over Standard Lock:</strong> A standard <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">threading.Lock</code> cannot be acquired multiple times by the same thread without causing an immediate self-deadlock. With <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">threading.RLock()</code> (Re-entrant Lock), a thread that already holds the lock can call nested helper methods without deadlocking, while external reader threads wait for the atomic batch upsert to release.
          </li>
          <li>
            <strong>Preservation of Pre-Indexed Baseline:</strong> Inside <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">upsert_batch()</code>, the lock guarantees that if an address already exists in the 17,020 pre-indexed verified set, it is never overwritten by a provisional stub:
            <pre className="p-2 bg-slate-900 text-slate-200 rounded font-mono text-[10px] mt-1 overflow-x-auto">
{`with _store_lock:
    for item in scored_items:
        addr = item["address"]
        existing = _composite.get(addr)
        if existing is not None and not existing.get("provisional", False):
            skipped += 1
        else:
            _composite[addr] = item["composite_record"]
            _evidence[addr] = item["evidence_record"]
            upserted += 1`}
            </pre>
          </li>
        </ul>
      </div>
    ),
  },
];

export function SyncFaq() {
  const [openId, setOpenId] = useState<string | null>("why-not-redis-for-xai-store");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory === "ALL" || faq.category === activeCategory;
      const matchesQuery =
        searchQuery.trim() === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.badgeText.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {["ALL", "ARCHITECTURE_IPC", "HANDSHAKE_SAFETY", "CONCURRENCY_LOCKS", "STATUTORY_PROVISIONAL"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            )
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sync & IPC defense..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-xs"
          />
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-2.5">
        {filteredFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={`rounded-xl border transition-all ${
                isOpen
                  ? "bg-white border-slate-300 shadow-xs ring-1 ring-slate-900/5"
                  : "bg-white/80 border-slate-200 hover:border-slate-300"
              }`}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="w-full p-4 text-left flex items-start justify-between gap-4 cursor-pointer select-none"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {faq.badgeText}
                    </span>
                    {faq.technicalNote && (
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        {faq.technicalNote}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {faq.question}
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-transform ${
                    isOpen
                      ? "bg-slate-900 text-white border-slate-900 rotate-180"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-200 rounded-xl bg-slate-50">
            No technical FAQ entries match your search query.
          </div>
        )}
      </div>
    </div>
  );
}
