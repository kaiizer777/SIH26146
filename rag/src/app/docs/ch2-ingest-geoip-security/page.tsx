import React from "react";
import Link from "next/link";
import {
  Server,
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Globe,
  FileCheck2,
  Cpu,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";
import { BenchmarkCard } from "./benchmark-card";
import { DupFlowVisualizer } from "./dup-flow-visualizer";

export const metadata = {
  title: "Chapter 2: High-Throughput Ingestion, GeoIP & Anti-Duplicate Armor — NTRO KB",
  description:
    "Production specification for multi-format streaming, PostgreSQL bulk COPY at 11,938 rows/s, offline MaxMind GeoIP enrichment, Ransomwhere seeds, and DUP-1/DUP-2 idempotency armor.",
};

export default function Chapter2Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* Tactical Document Header */}
      <div className="border-b border-slate-200 pb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold tracking-wider uppercase">
            CHAPTER 02
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            PIPELINE TIER 1
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100K TXS IN 8.38s
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80 font-bold font-mono">
            REDIS SHA-256 IDEMPOTENCY
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Chapter 2: High-Throughput Ingestion, GeoIP & Anti-Duplicate Armor
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          Deep technical breakdown of the Tier 1 ingestion pipeline engineered for NTRO cyber-surveillance:
          streaming multi-format normalization (CSV, JSON, XML), wire-protocol PostgreSQL bulk{" "}
          <code className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded font-mono text-sm font-semibold">COPY</code> exceeding{" "}
          <strong className="text-slate-900">11,938 rows/sec</strong>, sovereign offline MaxMind GeoIP/ASN resolution with zero external DNS,
          ingestion of 11,186 Ransomwhere intelligence seeds ($1.018B), and two-tier duplicate upload hardening (DUP-1 &amp; DUP-2).
        </p>

        {/* Quick Benchmark & Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Throughput Verified</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">11,938 rows/s</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">100k rows in 8.38s</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">GeoIP Air-Gap</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">0 External DNS</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">Local .mmdb &lt;0.05ms</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Ransomwhere Seeds</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">11,186 Addresses</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">136 Families ($1.018B)</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200/80 font-mono">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">Idempotency Guard</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">Redis SHA-256</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">HTTP 409 • 24h TTL</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Multi-Format Streaming & Normalization */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Multi-Format Streaming &amp; Normalization Engine
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Autonomous content-sniffing parser for CSV, JSON, and XML mempool &amp; network traffic dumps
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            In multi-agency forensic environments, transaction telemetry originates from heterogeneous network sensors,
            mempool collectors, and full-node packet dumps. These dumps arrive in three disparate formats:
            dense tabular <strong>CSV</strong> (often with PostgreSQL array literal formatting), nested <strong>JSON</strong> object streams,
            and legacy XML packet traces (frequently exceeding 100 MB per capture file).
          </p>

          <p>
            To prevent memory starvation and avoid trusting spoofable file extensions, FastAPI utilizes an autonomous{" "}
            <strong>content-sniffing engine</strong> (<a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/parser.py" className="font-mono text-sky-600 hover:underline"><code>parser.detect_format</code></a>).
            The gateway inspects only the first <strong>512 bytes</strong> of the byte stream:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                XML Detection
              </div>
              <p className="text-slate-600 text-[11px] font-sans">
                Matches byte prefix <code className="bg-white px-1 rounded border border-slate-200 text-slate-800">&lt;?xml</code> or initial <code className="bg-white px-1 rounded border border-slate-200 text-slate-800">&lt;</code>. Parsed via incremental <code className="bg-white px-1 rounded border border-slate-200 text-slate-800">iterparse</code> generators.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                JSON Array Detection
              </div>
              <p className="text-slate-600 text-[11px] font-sans">
                Matches first non-whitespace bytes <code className="bg-white px-1 rounded border border-slate-200 text-slate-800">[</code> or <code className="bg-white px-1 rounded border border-slate-200 text-slate-800">&#123;</code>. Normalized directly into memory-efficient dict generators.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                CSV Delimited Fallback
              </div>
              <p className="text-slate-600 text-[11px] font-sans">
                Evaluates comma-delimited headers. Unrolls PostgreSQL <code className="bg-white px-1 rounded border border-slate-200 text-slate-800">&#123;addr1,addr2&#125;</code> notation into Python native arrays.
              </p>
            </div>
          </div>
        </div>

        {/* Unified Schema Normalization & Pydantic Specification */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase font-mono flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-sky-600" />
            Unified 14-Field Pydantic Validation Schema (TransactionRecord)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every transaction is strictly validated against the <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/schemas/ingest.py" className="font-mono text-sky-600 hover:underline"><code>TransactionRecord</code></a> Pydantic v2 model before staging. All 14 fields map deterministically to the PostgreSQL relational ledger:
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg w-full max-w-full overscroll-x-contain">
            <table className="w-full text-left text-xs min-w-[580px]">
              <thead className="bg-slate-50 font-mono text-[11px] text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Field Name</th>
                  <th className="py-2.5 px-3">Pydantic Type</th>
                  <th className="py-2.5 px-3">Validation Rule / Constraint</th>
                  <th className="py-2.5 px-3">Relational DB Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">txid</td>
                  <td className="py-2.5 px-3 text-indigo-700">str</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Strict 64 lowercase hex characters (<code className="font-mono">^[0-9a-fA-F]&#123;64&#125;$</code>)</td>
                  <td className="py-2.5 px-3 text-slate-800 font-bold">VARCHAR(64) UNIQUE</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">ts</td>
                  <td className="py-2.5 px-3 text-indigo-700">str</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">ISO-8601 UTC timestamp or Unix epoch second parsing</td>
                  <td className="py-2.5 px-3 text-slate-800">TIMESTAMPTZ INDEXED</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">src_ip / dst_ip</td>
                  <td className="py-2.5 px-3 text-indigo-700">str</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Validated via Python <code className="font-mono">ipaddress.ip_address()</code> (IPv4 / IPv6)</td>
                  <td className="py-2.5 px-3 text-slate-800">INET / VARCHAR(45)</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">src_port / dst_port</td>
                  <td className="py-2.5 px-3 text-indigo-700">int</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Bounded integer range: <code className="font-mono">0 &le; port &le; 65535</code> (coerced defensively)</td>
                  <td className="py-2.5 px-3 text-slate-800">INTEGER</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">input_addresses</td>
                  <td className="py-2.5 px-3 text-indigo-700">list[str]</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Base58 (1... / 3...) or Bech32 (bc1q... / bc1p...) Bitcoin addresses</td>
                  <td className="py-2.5 px-3 text-slate-800">TEXT[] (SQL Array)</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">output_addresses</td>
                  <td className="py-2.5 px-3 text-indigo-700">list[str]</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Destination and change addresses parsed into native array</td>
                  <td className="py-2.5 px-3 text-slate-800">TEXT[] (SQL Array)</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">input / output_amounts</td>
                  <td className="py-2.5 px-3 text-indigo-700">list[Decimal]</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Precision decimal BTC values; satoshis converted via <code className="font-mono">sats / 1e8</code></td>
                  <td className="py-2.5 px-3 text-slate-800">NUMERIC(20,8)[]</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">fee</td>
                  <td className="py-2.5 px-3 text-indigo-700">Decimal</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Transaction mining fee in BTC (<code className="font-mono">&Sigma;inputs - &Sigma;outputs</code>); must be &ge; 0</td>
                  <td className="py-2.5 px-3 text-slate-800">NUMERIC(20,8)</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">script_type</td>
                  <td className="py-2.5 px-3 text-indigo-700">str</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Must match enum: <code className="font-mono">P2PK</code>, <code className="font-mono">P2PKH</code>, <code className="font-mono">P2SH</code>, <code className="font-mono">P2WPKH</code>, <code className="font-mono">P2TR</code></td>
                  <td className="py-2.5 px-3 text-slate-800">VARCHAR(10)</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">geo_country / asn</td>
                  <td className="py-2.5 px-3 text-indigo-700">str | None, int | None</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">Enriched offline via MaxMind GeoLite2; falls back to input if unresolved</td>
                  <td className="py-2.5 px-3 text-slate-800">VARCHAR(2), INTEGER</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: Bulk COPY vs INSERT Performance Architecture */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Bulk <code className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded font-mono">COPY</code> vs <code className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded font-mono">INSERT</code> Performance Architecture
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why standard ORMs choked at ~450 rows/sec and how psycopg2 COPY streaming hit 11,938 rows/sec
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            During initial Phase 2 stress-testing on 100,000 synthetic transaction records, standard ORM mechanisms
            (SQLAlchemy <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">session.add_all()</code> and even batched <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">bulk_insert_mappings</code>)
            failed to meet operational requirements. The ORM choked at approximately <strong>450 rows/sec</strong>, taking over <strong>222 seconds (3.7 minutes)</strong> to ingest a single 100k dump, while inflating Celery worker memory to <strong>482 MB RAM</strong>.
          </p>

          <p>
            The root cause was architectural: ORMs construct Python objects for every entity, maintain identity maps,
            generate individual parameterized SQL statements, and execute synchronous round-trips over the connection pool.
            Under continuous data ingestion, this caused <strong>PostgreSQL connection pool starvation</strong>, heavy CPU overhead serializing AST trees,
            and severe lock contention across index trees.
          </p>

          <div className="p-4 bg-slate-900 text-slate-100 rounded-lg space-y-2 font-mono text-xs">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              POSTGRESQL WIRE-PROTOCOL STREAMING SQL (psycopg2.copy_expert)
            </div>
            <pre className="text-slate-300 text-[11px] leading-relaxed overflow-x-auto">
{`COPY transactions (
  ts, src_ip, dst_ip, src_port, dst_port, txid,
  input_addresses, output_addresses, input_amounts, output_amounts,
  fee, script_type, geo_country, asn
) FROM STDIN WITH (FORMAT csv, NULL '\\N', QUOTE '"', ESCAPE '"')`}
            </pre>
            <div className="text-slate-400 text-[10px] pt-1">
              Executed via <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/bulk_insert.py" className="text-sky-300 hover:underline"><code>backend/app/services/bulk_insert.py</code></a> using <code className="text-slate-200">io.StringIO</code> batch buffer.
            </div>
          </div>

          <p>
            To resolve this bottleneck, the engine was refactored to use <strong>PostgreSQL COPY FROM STDIN</strong> via{" "}
            <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/bulk_insert.py" className="font-mono text-sky-600 hover:underline"><code>bulk_copy_insert</code></a>.
            Validated rows are converted directly into CSV-formatted string buffers and streamed over raw psycopg2 connections.
            PostgreSQL ingests this stream directly into table storage pages without query parsing or AST synthesis.
          </p>
        </div>

        {/* EMBEDDED BENCHMARK INTERACTIVE CARD */}
        <BenchmarkCard />
      </section>

      {/* SECTION 3: Network Layer Correlation (Offline GeoIP & ASN) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Network Layer Correlation (Offline GeoIP &amp; ASN Enrichment)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Strict sovereign air-gap compliance: zero external DNS, HTTP, or WHOIS lookups
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Standard commercial blockchain surveillance platforms rely on external REST APIs (e.g. ipinfo.io or WHOIS registries)
            to attribute IP addresses. In a classified NTRO operational environment, making outbound HTTP/DNS requests is strictly prohibited
            as it leaks operational targeting intelligence to foreign telecommunications providers.
          </p>

          <p>
            The pipeline enforces a <strong>100% offline geospatial enrichment architecture</strong> powered by local binary MaxMind databases:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900">
                <Globe className="w-4 h-4 text-sky-600" />
                <span>MaxMind GeoLite2-City (.mmdb)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Packaged locally at <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">data/geoip/GeoLite2-City.mmdb</code>.
                Maps IPv4 and IPv6 network telemetry to ISO-2 country codes (<code className="font-mono text-[11px]">US</code>, <code className="font-mono text-[11px]">RU</code>, <code className="font-mono text-[11px]">CN</code>, <code className="font-mono text-[11px]">IR</code>, <code className="font-mono text-[11px]">IN</code>) and metropolitan city coordinates.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>MaxMind GeoLite2-ASN (.mmdb)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Packaged locally at <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px]">data/geoip/GeoLite2-ASN.mmdb</code>.
                Extracts Autonomous System Numbers (<code className="font-mono text-[11px]">AS13335 Cloudflare</code>, <code className="font-mono text-[11px]">AS16509 Amazon</code>, <code className="font-mono text-[11px]">AS9009 M247</code> bulletproof hosting) for network-layer anomaly scoring.
              </p>
            </div>
          </div>

          {/* Dual-Hop Resolution Logic & Code Inspection */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              Dual-Hop IP Resolution &amp; Fallback Hierarchy (<a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/enrichment.py" className="text-sky-600 hover:underline"><code>enrichment.py</code></a>)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a transaction packet traverses internal relay hops (e.g. source IP is <code className="font-mono text-[11px]">192.168.1.104</code> or <code className="font-mono text-[11px]">10.0.4.12</code>), evaluating <code className="font-mono text-[11px]">src_ip</code> alone would yield an empty country code.
              The singleton <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/enrichment.py" className="font-mono text-sky-600 hover:underline"><code>GeoIPEnricher</code></a> implements a dual-hop fallback strategy:
            </p>

            <div className="p-3 bg-slate-950 text-slate-200 rounded font-mono text-xs overflow-x-auto space-y-1">
              <div className="text-slate-400 text-[10px]"># Dual-hop resolution with RFC-1918 fallback</div>
              <div>geo_country = self._lookup_country(src_ip) or self._lookup_country(dst_ip)</div>
              <div>asn = self._lookup_asn(src_ip) or self._lookup_asn(dst_ip)</div>
              <div className="text-emerald-400 text-[10px] pt-1"># GeoIP lookup wins over CSV value when found; falls back to CSV when None</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              All lookups are wrapped in safe exception barriers: if an IP address is invalid or unlisted, the enricher returns <code className="font-mono text-[11px]">(None, None)</code> instead of raising exceptions, ensuring the batch pipeline never aborts on network anomalies.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: Intelligence Seeds (Ransomwhere Dataset) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Intelligence Seeds (Ransomwhere Corpus Ingestion)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Ground-truth graph anchors: 11,186 addresses across 136 ransomware cartels ($1.018 Billion tracked)
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            An offline forensic graph cannot discover money laundering in a vacuum without ground-truth illicit anchors.
            The pipeline bootstraps its surveillance topology by ingesting the globally curated <strong>Ransomwhere</strong> open intelligence dataset.
          </p>

          <p>
            During Phase 1 initialization, <strong>11,186 verified ransomware payment addresses</strong> spanning <strong>136 distinct ransomware cartels</strong> were normalized and linked to graph nodes.
            These addresses account for <strong>$1,018,573,922.46 USD</strong> (and <strong>115,116.91 BTC</strong>) in confirmed extortion payments.
          </p>

          {/* Seed Distribution Grid */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 p-3 border-b border-slate-200 font-mono text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>MAJOR RANSOMWARE CARTELS ANCHORED IN SURVEILLANCE TOPOLOGY</span>
              <span className="text-[10px] text-slate-500">11,186 TOTAL SEED ADDRESSES</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs font-mono">
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
                <div className="font-bold text-slate-900">LockBit (v2 / v3)</div>
                <div className="text-slate-600">3,420 Addresses</div>
                <div className="text-emerald-700 font-semibold">$345.2M Tracked</div>
                <div className="text-slate-500 text-[11px] font-sans">Automated peeling chains; high-frequency mixing</div>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
                <div className="font-bold text-slate-900">Conti Syndicate</div>
                <div className="text-slate-600">1,842 Addresses</div>
                <div className="text-emerald-700 font-semibold">$192.8M Tracked</div>
                <div className="text-slate-500 text-[11px] font-sans">Multi-signature consolidation wallets</div>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
                <div className="font-bold text-slate-900">BlackCat / ALPHV</div>
                <div className="text-slate-600">915 Addresses</div>
                <div className="text-emerald-700 font-semibold">$118.4M Tracked</div>
                <div className="text-slate-500 text-[11px] font-sans">CoinJoin equal-output mixing pools</div>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
                <div className="font-bold text-slate-900">REvil / Sodinokibi</div>
                <div className="text-slate-600">780 Addresses</div>
                <div className="text-emerald-700 font-semibold">$96.1M Tracked</div>
                <div className="text-slate-500 text-[11px] font-sans">Cross-chain bridge egress &amp; cashout hubs</div>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
                <div className="font-bold text-slate-900">DarkSide / BlackMatter</div>
                <div className="text-slate-600">620 Addresses</div>
                <div className="text-emerald-700 font-semibold">$82.5M Tracked</div>
                <div className="text-slate-500 text-[11px] font-sans">Colonial Pipeline extortion cluster</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 space-y-3 leading-relaxed">
            <div>
              <strong>Role in Graph Intelligence:</strong> Seed addresses receive an initial flag (<code className="font-mono text-[11px]">seed_proximity = 1.0</code>).
              During Phase 4 Louvain modularity clustering and Phase 7 SOTA Relational Graph Transformer inference (PyG <code className="font-mono text-[11px]">TransformerConv</code>, F1=0.9209, peeling recall = 94.8%; legacy GraphSAGE strictly designated as baseline), Personalized PageRank proximity radiates outward from these 11,186 anchors across <code className="font-mono text-[11px]">CO_SPEND</code>, <code className="font-mono text-[11px]">TX_FLOW</code>, and <code className="font-mono text-[11px]">PEELING_FLOW</code> relational edges, assigning elevated risk scores to multi-hop intermediary nodes that attempt to peel off funds.
            </div>

            <div className="p-3 bg-white/95 rounded-lg border border-emerald-300 font-mono text-[11px] text-slate-900 space-y-1.5 shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider flex items-center justify-between">
                <span>Personalized PageRank (PPR) Formulation</span>
                <span className="text-[10px] text-slate-500 font-normal">Neo4j GDS Seed Biasing</span>
              </div>
              <div className="text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded border border-slate-200">
                <code>{"p = (1 - \u03B3)s + \u03B3 P\u1D40 p"}</code>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                Where damping factor <strong>&gamma; = 0.85</strong>, power iteration limit = <strong>20 iterations</strong>, transition probability matrix <strong>P</strong> is column-stochastic across <code className="font-mono text-[10px]">CO_SPEND</code>, <code className="font-mono text-[10px]">TX_FLOW</code>, and <code className="font-mono text-[10px]">PEELING_FLOW</code> edges, and restart vector <strong>s</strong> is non-uniformly biased exclusively on the <strong>11,186 Ransomwhere seeds</strong> (<code className="font-mono text-[10px]">s_i = 1/|S|</code> for <em>i</em> &in; <em>S</em>, 0 otherwise).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Duplicate Upload Hardening (Stage 1: DUP-1 & DUP-2) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Duplicate Upload Hardening (Stage 1: DUP-1 &amp; DUP-2)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Defensive operational stability: Redis SHA-256 idempotency locks and two-tier UI conflict alerts
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            During real-world surveillance operations and high-stakes courtroom demonstrations, analysts frequently re-upload
            data files or accidental duplicate batches. Without defensive idempotency armor, re-uploading a 100k transaction dataset
            triggers duplicate background worker storms, wastes server IOPS, and creates ambiguous user interface states (e.g. silent 0-row insertions).
          </p>

          <p>
            To eliminate this failure mode, the system implements <strong>two-tier duplicate hardening</strong> (<a href="file:///c:/Users/bari2/Desktop/SIH26146/WORK-3.md" className="font-mono text-sky-600 hover:underline"><code>WORK-3.md Stage 1</code></a>):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-rose-800 uppercase">
                  DUP-1: Backend Idempotency Lock
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                  HTTP 409 CONFLICT
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Implemented in <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/routers/ingest.py" className="font-mono text-sky-600 hover:underline"><code>backend/app/routers/ingest.py</code></a>.
                As multipart chunks stream to disk, an inline SHA-256 hash is computed.
                FastAPI probes Redis for <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">file_hash:{"{sha256}"}</code>.
                If found, the temp file is instantly deleted and an immediate <strong>HTTP 409 Conflict</strong> is returned with the <code className="font-mono text-[11px]">original_task_id</code>. Zero Celery jobs are queued.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-amber-800 uppercase">
                  DUP-2: Frontend Alert Differentiation
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  RED VS AMBER BANNERS
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Implemented in <a href="file:///c:/Users/bari2/Desktop/SIH26146/frontend/src/components/IngestModal.tsx" className="font-mono text-sky-600 hover:underline"><code>frontend/src/components/IngestModal.tsx</code></a>.
                Differentiates between:
                (1) <strong>Red Rejection Banner (DUP-2a)</strong> for HTTP 409 exact file duplicates, and
                (2) <strong>Amber Warning Banner (DUP-2b)</strong> when an altered file is accepted by Redis but PostgreSQL rejects rows because transaction IDs already exist.
              </p>
            </div>
          </div>
        </div>

        {/* EMBEDDED DUP FLOW SIMULATOR */}
        <DupFlowVisualizer />
      </section>

      {/* SECTION 6: Post-Ingest Online Inference & REST Lifecycle (POST /ingest/sync) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Post-Ingest Online Inference &amp; REST Lifecycle (POST /ingest/sync)
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              FastAPI &harr; Celery two-step polling sync handshake, Redis sync_done idempotency locks, and sub-15ms FT-Transformer inline scoring
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            When transaction batches are ingested into PostgreSQL via bulk <code className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded font-mono text-xs font-semibold">COPY</code>,
            they reside in the relational database but remain absent from the in-memory Explainable AI (XAI) store held in FastAPI&apos;s virtual memory heap.
            Because background Celery workers run in separate OS processes from the FastAPI/Uvicorn server, worker execution cannot directly mutate FastAPI&apos;s private memory heap.
            To eliminate operator-facing 404 errors on analytical endpoints (e.g. <code className="font-mono text-xs text-indigo-700">/api/v1/entity/&#123;address&#125;/explain</code>),
            the platform orchestrates a robust <strong>2-Step Polling &amp; Sync Handshake</strong> backed by Redis idempotency locks and lightweight PyTorch FT-Transformer CPU inference.
          </p>

          {/* 3 REST Endpoints Grid */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-600" />
              The 3-Tier Ingest REST API Lifecycle
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Endpoint 1 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      POST /ingest
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      HTTP 202 ACCEPTED
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 font-mono">
                    Async File Streaming &amp; Dispatch
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Accepts multipart upload (CSV, JSON, XML). The gateway sniffs the first 512 bytes via <code className="font-mono text-[11px]">parser.detect_format</code>,
                    computes an inline SHA-256 hash to enforce <strong>DUP-1 Redis rejection</strong> (<code className="font-mono text-[11px]">file_hash:&#123;sha256&#125;</code>, 24h TTL),
                    and enqueues <code className="font-mono text-[11px]">process_ingest_file.delay(...)</code> into Celery. Returns immediately with <code className="font-mono text-[11px]">task_id</code>.
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                  <span className="text-slate-400">Response:</span> {`{"task_id": "9b1deb4d...", "status": "PENDING"}`}
                </div>
              </div>

              {/* Endpoint 2 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                      GET /ingest/status/&#123;id&#125;
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      POLLING LIFECYCLE
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 font-mono">
                    Worker State Machine Tracking
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Probes Celery <code className="font-mono text-[11px]">AsyncResult(task_id)</code> through 5 deterministic states:
                    <span className="block mt-1 font-mono text-[10px] text-slate-700">
                      &bull; <strong>PENDING</strong>: Task queued in Redis broker.<br />
                      &bull; <strong>STARTED</strong>: Worker initialized file read.<br />
                      &bull; <strong>PROGRESS</strong>: Streaming COPY (<code className="text-indigo-600 font-semibold">inserted_rows</code> count).<br />
                      &bull; <strong>SUCCESS</strong>: Completed; yields <code className="text-emerald-600 font-semibold">txids</code> array.<br />
                      &bull; <strong>FAILURE</strong>: Worker exception caught.
                    </span>
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                  <span className="text-slate-400">Payload:</span> {`{"status": "SUCCESS", "result": {"total_inserted": 100000}}`}
                </div>
              </div>

              {/* Endpoint 3 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                      POST /ingest/sync/&#123;id&#125;
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      HTTP 200 OK • 409 GUARD
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 font-mono">
                    Online Inference &amp; Dossier Sync
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Triggered once the client receives <code className="font-mono text-[11px]">SUCCESS</code>.
                    Verifies status, enforces atomic Redis idempotency lock <code className="font-mono text-[11px]">sync_done:&#123;id&#125;</code> (TTL=3600s; HTTP 409 if locked),
                    retrieves task-scoped rows from PostgreSQL (<code className="font-mono text-[11px]">txid = ANY(:txids)</code>), executes FT-Transformer CPU scoring, and atomically registers dossiers in RAM.
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                  <span className="text-slate-400">Response:</span> {`{"scored": 240, "upserted": 240, "skipped_existing": 0}`}
                </div>
              </div>
            </div>
          </div>

          {/* FT-Transformer Inline Scoring Formula Card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="text-xs font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-600" />
                FT-Transformer Inline Reconstruction &amp; Provisional Scoring Formulation
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                18,930 PARAMS • 85.54 KB • 0.0222 MS/SAMPLE
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When <code className="font-mono text-[11px]">POST /ingest/sync/&#123;id&#125;</code> executes,
              FastAPI calls <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/inline_scorer.py" className="font-mono text-sky-600 hover:underline"><code>inline_scorer.score_batch(rows)</code></a>.
              The pipeline extracts 18 continuous tabular features (<code className="font-mono text-[11px]">FEATURE_DIM = 18</code>) normalized with <code className="font-mono text-[11px]">StandardScaler</code>,
              and feeds them through the SOTA Feature Tokenizer Transformer (<code className="font-mono text-[11px]">FTTransformerAnomaly</code>; legacy Autoencoder threshold &theta;=0.034618 designated as fallback).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula 1: Reconstruction MSE */}
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-900 font-mono">
                  1. Tabular Reconstruction MSE &amp; Normalization
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-900">
                  <code>{"MSE = (1 / 18) * \u2211(x_i - \u0177_i)\u00B2"}</code>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-900">
                  <code>{"norm_anomaly = min(MSE / \u03B8, 1.0)   (\u03B8 = 0.036354)"}</code>
                </div>
                <p className="text-[11px] text-slate-500">
                  Reconstruction error is normalized by the empirical 95th-percentile threshold <strong>&theta; = 0.036354</strong>, calibrated on benign mempool baselines.
                </p>
              </div>

              {/* Formula 2: Provisional Composite Scoring */}
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-900 font-mono">
                  2. Provisional Composite Risk Scoring
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-900">
                  <code>{"raw_prov = 0.35 * norm_anomaly + 0.15 * rule_factor"}</code>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-900">
                  <code>{"provisional_score = min(max(raw_prov / 0.50, 0.0), 1.0)"}</code>
                </div>
                <p className="text-[11px] text-slate-500">
                  Where <code className="font-mono text-[10px]">rule_factor = 1.0</code> if the address triggers heuristic rules (<code className="font-mono text-[10px]">RANSOMWHERE_SEED_INPUT/OUTPUT</code>, <code className="font-mono text-[10px]">RANSOMWHERE_SEED_RECIPIENT</code>, or <code className="font-mono text-[10px]">PEELING_CHAIN_CANDIDATE</code>), and 0.0 otherwise.
                </p>
              </div>
            </div>

            {/* Verdict thresholds comparison table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white w-full max-w-full overscroll-x-contain">
              <table className="w-full text-left text-xs font-mono min-w-[580px]">
                <thead className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Verdict Classification</th>
                    <th className="py-2 px-3">Online Provisional Verdict (Phase 11.2)</th>
                    <th className="py-2 px-3">Full Offline Batch Verdict (Phase 8 Production)</th>
                    <th className="py-2 px-3 font-sans">Operational Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-rose-700">CRITICAL</td>
                    <td className="py-2 px-3 font-bold text-slate-900">&ge; 0.70</td>
                    <td className="py-2 px-3 text-slate-600">&ge; 0.80</td>
                    <td className="py-2 px-3 font-sans text-rose-800">Immediate FIU/NTRO freeze order; live graph peel tracking</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-amber-700">HIGH</td>
                    <td className="py-2 px-3 font-bold text-slate-900">&ge; 0.50</td>
                    <td className="py-2 px-3 text-slate-600">&ge; 0.60</td>
                    <td className="py-2 px-3 font-sans text-amber-800">Automated sub-graph expansion; seed proximity hop analysis</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-sky-700">MEDIUM</td>
                    <td className="py-2 px-3 font-bold text-slate-900">&ge; 0.30</td>
                    <td className="py-2 px-3 text-slate-600">&ge; 0.40</td>
                    <td className="py-2 px-3 font-sans text-sky-800">Flagged for next offline Graph Transformer retraining batch</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-slate-600">LOW</td>
                    <td className="py-2 px-3 font-bold text-slate-900">&lt; 0.30</td>
                    <td className="py-2 px-3 text-slate-600">&lt; 0.40</td>
                    <td className="py-2 px-3 font-sans text-slate-500">Nominal peer-to-peer / exchange settlement</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Atomic Registration into xai_store.py */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                Atomic In-Memory Registration in <a href="file:///c:/Users/bari2/Desktop/SIH26146/backend/app/services/xai_store.py" className="text-indigo-600 hover:underline"><code>xai_store.py</code></a>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                threading.RLock Protected
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Once online scoring completes, <code className="font-mono text-[11px]">xai_store.upsert_batch(scored_records)</code> atomically commits the provisional records to FastAPI&apos;s live heap.
              To guarantee data consistency without compromising concurrent read throughput on <code className="font-mono text-[11px]">/api/v1/entity/&#123;address&#125;/explain</code>,
              the store applies strict concurrency and overwrite guards:
            </p>

            <div className="p-3.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
              <div className="text-slate-400 text-[10px]"># backend/app/services/xai_store.py — upsert_batch()</div>
              <div>with _store_lock:</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;for item in scored_items:</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;addr = item[&quot;address&quot;]</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;existing = _composite.get(addr)</div>
              <div className="text-amber-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Never overwrite deep-indexed offline dossiers with provisional scores</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if existing is not None and not existing.get(&quot;provisional&quot;, False):</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;skipped += 1</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;else:</div>
              <div className="text-emerald-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_composite[addr] = item[&quot;composite_record&quot;]</div>
              <div className="text-emerald-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_evidence[addr] = item[&quot;evidence_record&quot;]</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;upserted += 1</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Zero 404 Analytical Availability
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Immediately following sync, any newly ingested address resolves in <strong className="text-slate-900">&lt;15ms</strong> via <code className="font-mono text-[10px]">/api/v1/entity/&#123;address&#125;/explain</code> with <code className="font-mono text-[10px]">provisional: true</code>, returning complete anomaly MSE and heuristic rule flags.
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 font-mono text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-sky-600" />
                  Deep-Index Sovereign Protection
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Pre-indexed addresses backed by full Dual Transformer inference (PyG <code className="font-mono text-[10px]">TransformerConv</code> F1=0.9209 + FT-Transformer F1=0.6972) are strictly protected from overwrite by transient provisional updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Link
          href="/docs/ch1-mission-architecture"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between sm:justify-start gap-2 group cursor-pointer transition-colors shadow-xs w-full sm:w-auto"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
              <div className="font-semibold text-slate-900">Ch 1: Mission &amp; Architecture</div>
            </div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH02
        </div>

        <Link
          href="/docs/ch3-graph-entity-clustering"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center justify-between sm:justify-start gap-2 group cursor-pointer shadow-xs w-full sm:w-auto"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 3: Graph Topology &amp; Entity Clustering</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2 shrink-0" />
        </Link>
      </div>
    </article>
  );
}
