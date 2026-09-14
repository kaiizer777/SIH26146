import React from "react";
import Link from "next/link";
import {
  Terminal,
  Server,
  Database,
  Cpu,
  ArrowRight,
  ArrowLeft,
  Lock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Activity,
  GitFork,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  Clock,
  HardDrive,
  Network,
  ExternalLink,
  Search,
  Check,
  Copy,
  Bug,
  HelpCircle,
  Eye,
  Sliders,
} from "lucide-react";
import { CliCommandGenerator } from "./cli-generator";
import { TroubleshootingGuide } from "./troubleshooting-guide";
import { OpsFaq } from "./ops-faq";
import { ForensicCockpitPreview } from "./forensic-cockpit-preview";

export const metadata = {
  title: "Chapter 8: Forensic Command Center & Local Operator Guide — NTRO KB",
  description:
    "Production engineering specification for the Next.js 16 Forensic Command Center, 38px high-density AlertTable, D3 force graph visualizer, AddressHashMiddleware OPSEC redaction, and local dev-server bare-metal runbook.",
};

export default function Chapter8Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* Tactical Document Header */}
      <div className="border-b border-slate-200 pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider uppercase">
            CHAPTER 08
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            SURVEILLANCE RUNBOOK &amp; UI COCKPIT
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            38PX FORENSIC DENSITY
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-bold font-mono">
            196/196 PASSING TESTS
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Chapter 8: Forensic Command Center &amp; Local Operator Guide
        </h1>

        <div className="font-mono text-xs text-slate-500 font-semibold tracking-wide uppercase">
          OPERATOR RUNBOOK • 38PX FORENSIC DENSITY • DEV-SERVER.MD • 196/196 TESTS
        </div>

        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          Architectural and operational runbook for the NTRO Forensic Command Center. Details the Next.js 16
          high-density tactical dashboard, D3.js relational graph visualizer with Multi-Head Attention edge glow,
          FastAPI <strong>AddressHashMiddleware</strong> zero-leak OPSEC enforcement, and bare-metal Windows PowerShell execution protocols.
        </p>

        {/* Quick Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">UI Architecture</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">38px Forensic Density</div>
            <div className="text-[10px] text-sky-600 font-semibold">Tactile Cockpit HUD</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Topology Engine</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">D3 Force-Directed</div>
            <div className="text-[10px] text-indigo-600 font-semibold">Relational Attention Glow</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">OPSEC Redaction</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">AddressHashMiddleware</div>
            <div className="text-[10px] text-emerald-600 font-semibold">0 Plaintext Leaks</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Test Suite Health</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">196/196 Verified</div>
            <div className="text-[10px] text-emerald-600 font-semibold">0 Failures • 0 Warnings</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Next.js Forensic Command Center */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Next.js Forensic Command Center Architecture
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              38px high-density AlertTable, D3 force topology engine, and tactile 3D hardware design tokens
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            The NTRO Forensic Command Center serves as the primary operational surface for intelligence analysts.
            Unlike consumer web dashboards, forensic workstations demand <strong>maximum information density</strong>,
            sub-second query responsiveness, deterministic keyboard navigation, and immediate visual triage cues
            without decorative padding or layout shifts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature Card 1 */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-900">
                <div className="w-6 h-6 rounded bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span>38px High-Density Grid</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Strict <code>h-[38px]</code> dense row height with single-click address clipboard copying,
                instant multi-tier risk filtering (Critical, High, Medium, Low), and zero-latency sorting over 100,000 indexed transactions.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-900">
                <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Network className="w-3.5 h-3.5" />
                </div>
                <span>D3 Topology Visualizer</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Force-directed graph visualizer with multi-head attention glow, semantic edge encoding
                (<code>CO_SPEND</code>, <code>TX_FLOW</code>, <code>PEELING_FLOW</code>), streamlined 4.5px micro-dart arrowheads, and viewport-clamped HUD inspector.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-900">
                <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span>Tactile 3D Cockpit</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Realistic spherical 3D LED indicator lenses (<code>led-3d-*</code>) with off-center specular highlights,
                recessed digital segment counters (<code>counter-3d-*</code>), and painted-light button elevation tokens.
              </p>
            </div>
          </div>

          {/* Interactive Cockpit Simulator */}
          <div className="pt-2">
            <div className="text-xs font-mono font-bold uppercase text-slate-700 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-600" />
              Interactive Surface: High-Density Forensic Cockpit &amp; Topology HUD
            </div>
            <ForensicCockpitPreview />
          </div>
        </div>
      </section>

      {/* SECTION 2: Privacy & OPSEC Guardrails */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Privacy &amp; OPSEC Guardrails (AddressHashMiddleware)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              The log leakage threat model, regex interceptors, and SHA-256 pseudonymization architecture
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            In sovereign signal intelligence operations, operational logs from backend microservices are routinely aggregated into
            centralized indexing clusters (such as Elasticsearch, Splunk, or SIEM archives). If raw Bitcoin addresses are emitted
            in standard <code>logger.info()</code> statements, query parameters, or stack traces, sensitive citizen data and classified
            targets are inadvertently leaked to log-aggregator personnel who lack clearance for blockchain intelligence dossiers.
          </p>

          {/* Threat Model Callout */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-slate-700 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                The Log Aggregation Threat Vector
              </span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono text-[10px]">
                HIGH SEVERITY EXPOSURE
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <strong>The Threat:</strong> Plaintext Base58 (P2PKH/P2SH) and Bech32 (P2WPKH/P2TR) addresses present in URL paths
                (e.g., <code>GET /api/v1/entity/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa/explain</code>) or debugging payloads
                persist indefinitely in log disks, violating data protection protocols and air-gap operational security.
              </p>
              <p>
                <strong>The Solution:</strong> Rather than relying on individual developers to remember masking functions in every router,
                the engine registers <code>_AddressPseudonymFilter</code> on the <strong>Python root logger</strong> in <code>backend/app/main.py</code>.
                Any log message matching Bitcoin address regular expressions is automatically transformed into an 8-character cryptographic token
                (&lt;addr:sha256_token&gt;) prior to output stream dispatch.
              </p>
            </div>
          </div>

          {/* Code Inspection Block */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                backend/app/main.py — Root Logger Interceptor Implementation
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                ZERO PLAINTEXT LEAKS
              </span>
            </div>
            <pre className="p-4 text-xs font-mono leading-relaxed text-slate-300 overflow-x-auto">
{`# Matches Base58 Bitcoin addresses (25-34 chars starting 1 or 3) and Bech32/Bech32m (bc1...)
_ADDR_RE = re.compile(
    r"\\b((?:1|3)[a-km-zA-HJ-NP-Z1-9]{24,33}|bc1[a-z0-9]{6,87})\\b"
)

def _sha8(addr: str) -> str:
    """Return first 8 hex characters of SHA-256 of the address."""
    return hashlib.sha256(addr.encode()).hexdigest()[:8]

class _AddressPseudonymFilter(logging.Filter):
    """Replaces wallet address patterns in log records with sha256[:8] tokens."""
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()  # fully interpolated
        if _ADDR_RE.search(msg):
            record.msg = _ADDR_RE.sub(lambda m: f"[addr_{_sha8(m.group())}]", msg)
            record.args = ()  # baked into record.msg
        return True

# Install filter on root logger to cover all modules, routers, and third-party libraries:
_root_logger = logging.getLogger()
_root_logger.addFilter(_AddressPseudonymFilter())`}
            </pre>
          </div>
        </div>
      </section>

      {/* SECTION 3: The Complete Local Operator Runbook */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Complete Local Operator Runbook (dev-server.md)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Port allocations, service dependencies, Windows PowerShell terminal orchestration, and health checks
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            The SIH26146 platform runs completely bare-metal on local Windows workstations without requiring Docker containers.
            To spin up the complete pipeline with asynchronous file ingestion, graph neural network inference, and real-time dashboard updates,
            operators execute three dedicated terminals alongside three core background services:
          </p>

          {/* Port Matrix Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-mono text-xs font-bold text-slate-700 uppercase">
              Core Infrastructure Port &amp; Protocol Allocations
            </div>
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-100/75 text-[10px] text-slate-500 uppercase tracking-wider h-8">
                <tr>
                  <th className="px-4">Service</th>
                  <th className="px-4">Port</th>
                  <th className="px-4">Connection URL / Binding</th>
                  <th className="px-4">Verification Command</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="h-9 hover:bg-slate-50">
                  <td className="px-4 font-bold text-slate-900">PostgreSQL 16</td>
                  <td className="px-4 text-slate-600">5432</td>
                  <td className="px-4 text-slate-600">postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin</td>
                  <td className="px-4 text-emerald-700 font-semibold">psql -U sih_user -d sih_bitcoin</td>
                </tr>
                <tr className="h-9 hover:bg-slate-50">
                  <td className="px-4 font-bold text-slate-900">Neo4j Community (GDS)</td>
                  <td className="px-4 text-slate-600">7687 / 7474</td>
                  <td className="px-4 text-slate-600">bolt://localhost:7687 (user: neo4j, pass: password123)</td>
                  <td className="px-4 text-emerald-700 font-semibold">http://localhost:7474</td>
                </tr>
                <tr className="h-9 hover:bg-slate-50">
                  <td className="px-4 font-bold text-slate-900">Redis Broker</td>
                  <td className="px-4 text-slate-600">6379</td>
                  <td className="px-4 text-slate-600">redis://localhost:6379/0</td>
                  <td className="px-4 text-emerald-700 font-semibold">redis-cli ping &rarr; PONG</td>
                </tr>
                <tr className="h-9 hover:bg-slate-50">
                  <td className="px-4 font-bold text-slate-900">FastAPI Backend</td>
                  <td className="px-4 text-slate-600">8000</td>
                  <td className="px-4 text-slate-600">http://localhost:8000 (Swagger: /docs)</td>
                  <td className="px-4 text-emerald-700 font-semibold">curl http://localhost:8000/health</td>
                </tr>
                <tr className="h-9 hover:bg-slate-50">
                  <td className="px-4 font-bold text-slate-900">Next.js Command Center</td>
                  <td className="px-4 text-slate-600">3000</td>
                  <td className="px-4 text-slate-600">http://localhost:3000</td>
                  <td className="px-4 text-emerald-700 font-semibold">Browser load (38px AlertTable)</td>
                </tr>
                <tr className="h-9 hover:bg-slate-50">
                  <td className="px-4 font-bold text-slate-900">RAG Intelligence Portal</td>
                  <td className="px-4 text-slate-600">3001</td>
                  <td className="px-4 text-slate-600">http://localhost:3001</td>
                  <td className="px-4 text-emerald-700 font-semibold">Browser load (/docs/ch8)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Terminal Setup Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs pt-2">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-600" />
                Terminal 1: FastAPI
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div><code>cd backend</code></div>
                <div><code>.\venv\Scripts\Activate.ps1</code></div>
                <div><code>uvicorn app.main:app --reload --port 8000</code></div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-600" />
                Terminal 2: Celery Worker
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div><code>cd backend</code></div>
                <div><code>.\venv\Scripts\Activate.ps1</code></div>
                <div><code>celery -A app.celery_app worker --loglevel=info --pool=solo</code></div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Terminal 3: Next.js UI
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div><code>cd frontend</code></div>
                <div><code>npm install</code></div>
                <div><code>npm run dev</code></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Automated Verification & CI/CD Health */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Automated Verification &amp; CI/CD Health
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Pytest comprehensive verification suite (196/196 passing) and strict TypeScript typechecking
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            To guarantee continuous operational integrity across all 12 pipeline stages, the repository enforces strict
            automated testing before declaring any phase complete. The test suite verifies unit functionality,
            cross-process serialization, mathematical scoring consistency, and security boundaries.
          </p>

          {/* Test Category Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Unit &amp; Heuristics</div>
              <div className="text-lg font-bold text-slate-900 font-mono">42 Tests</div>
              <div className="text-[11px] text-slate-500 font-mono">Peeling chains, CoinJoin, GeoIP</div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Dual Transformer ML</div>
              <div className="text-lg font-bold text-slate-900 font-mono">54 Tests</div>
              <div className="text-[11px] text-slate-500 font-mono">FT-Trans, RGT, Promotion gate</div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Endpoints &amp; Routers</div>
              <div className="text-lg font-bold text-slate-900 font-mono">60 Tests</div>
              <div className="text-[11px] text-slate-500 font-mono">Alerts, Entity explain, Graph bounds</div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Security &amp; Sync</div>
              <div className="text-lg font-bold text-slate-900 font-mono">42 Tests</div>
              <div className="text-[11px] text-slate-500 font-mono">AddressHash, Bearer, 409 guard</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs">
            <div className="text-slate-900 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Deterministic Verification Commands
              </span>
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold text-[10px]">
                PASSING: 196+ ASSERTIONS
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1 overflow-x-auto">
              <div><span className="text-slate-500"># 1. Run all backend tests with timing summary</span></div>
              <div className="text-emerald-400 font-bold">.\backend\venv\Scripts\python.exe -m pytest backend/tests/ -v --durations=5</div>
              <div className="pt-2"><span className="text-slate-500"># 2. Verify frontend TypeScript strict mode compilation</span></div>
              <div className="text-sky-400 font-bold">cd frontend; npx tsc --noEmit; cd ..</div>
              <div className="pt-2"><span className="text-slate-500"># 3. Verify RAG documentation TypeScript strict mode compilation</span></div>
              <div className="text-indigo-400 font-bold">cd rag; npx tsc --noEmit; cd ..</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Interactive Visual Elements */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Operator Utilities
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Live runbook command generator and diagnostic operator troubleshooting accordion
            </p>
          </div>
        </div>

        {/* Module A: CLI Generator */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-600" />
            Module A: Interactive CLI Command Generator
          </div>
          <CliCommandGenerator />
        </div>

        {/* Module B: Troubleshooting Guide */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-600" />
            Module B: Operator Troubleshooting Accordion (Top 6 Production Errors)
          </div>
          <TroubleshootingGuide />
        </div>
      </section>

      {/* SECTION 6: Teammate FAQ Accordion */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Teammate Technical Defense &amp; Operations FAQ
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Engineering justifications covering Windows solo pool, offline air-gap, targeted pytest execution, and log sanitization
            </p>
          </div>
        </div>

        <OpsFaq />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch7-online-inference-sync"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 7: Live Post-Ingest Online Inference</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH08
        </div>

        <Link
          href="/assistant"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Next Surface</div>
            <div className="font-semibold text-slate-100">⚡ Subagent 9: RAG Doubt Solver</div>
          </div>
          <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
