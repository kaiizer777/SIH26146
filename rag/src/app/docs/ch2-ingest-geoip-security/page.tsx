import React from "react";
import Link from "next/link";
import {
  HardDrive, Clock, Lock, Zap, ShieldCheck,
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Database,
} from "lucide-react";
import { BenchmarkCard } from "./benchmark-card";

export const metadata = {
  title: "Chapter 2: High-Speed Ingest, GeoIP & Anti-Duplicate Armor — NTRO KB",
  description: "How NTRO transforms messy seized drives into clean, geolocated forensic intelligence in seconds — 100% offline.",
};

export default function Chapter2Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Core Mission & Problem (Plain English) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">01</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">High-Speed Ingestion &amp; Offline GeoIP Armor</h2>
            <p className="text-xs text-slate-600 font-mono font-medium">Transforming messy seized hard drives into verified, geolocated forensic intelligence in seconds</p>
          </div>
        </div>

        {/* Relatable Analogies Spotlight Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-tactical rounded-xl p-5 bg-gradient-to-b from-white via-white to-amber-50/30 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.05)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border-t border-t-amber-100 border-x border-x-amber-200 border-b border-b-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(217,119,6,0.12)] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider bg-amber-100/70 border border-amber-200/80 px-1.5 py-0.5 rounded">The Analogy</span>
                <h3 className="text-sm font-bold text-slate-950 mt-0.5">Airport Luggage Scanner (Quarantine)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Corrupted rows and malicious payloads are shunted into an isolated quarantine tray for review, letting valid records stream through with zero downtime.
            </p>
            <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-[11px] font-medium text-amber-950 bg-amber-50/90 border border-amber-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] p-2.5 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>Fault isolation guarantees zero pipeline crashes and 100% evidence preservation.</span>
            </div>
          </div>

          <div className="card-tactical rounded-xl p-5 bg-gradient-to-b from-white via-white to-emerald-50/30 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.05)] space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border-t border-t-emerald-100 border-x border-x-emerald-200 border-b border-b-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(5,150,105,0.12)] flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/70 border border-emerald-200/80 px-1.5 py-0.5 rounded">Speed Superpower</span>
                <h3 className="text-sm font-bold text-slate-950 mt-0.5">Sealed Freight Train (Bulk Streaming)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              Instead of dispatching 100,000 separate couriers (slow ORMs), our engine packs records into a single direct binary stream, finishing in just 8.38 seconds.
            </p>
            <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-[11px] font-medium text-emerald-950 bg-emerald-50/90 border border-emerald-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] p-2.5 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
              <span>26x faster ingestion • Ingests 11,938 transactions/sec using only 18 MB RAM.</span>
            </div>
          </div>
        </div>

        {/* 3 Threat / Challenge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="card-tactical rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.04)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase shadow-xs">1. Seizure Chaos</span>
              <HardDrive className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Messy Mixed Formats</h3>
            <p className="text-xs text-slate-700 leading-relaxed">Raids yield corrupted CSVs, JSON, and XML with poisoned rows and missing fields that crash generic tools.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.04)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase shadow-xs">2. Time Pressure</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">48-Hour Freezing Clock</h3>
            <p className="text-xs text-slate-700 leading-relaxed">Investigators race against rapid tumbler peel-chains before stolen crypto is cashed out through rogue exchanges.</p>
          </div>

          <div className="card-tactical rounded-xl p-4 bg-gradient-to-b from-white to-slate-50/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_5px_rgba(15,23,42,0.04)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase shadow-xs">3. OPSEC Mandate</span>
              <Lock className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Zero Cloud Leaks</h3>
            <p className="text-xs text-slate-700 leading-relaxed">External IP lookups tip off targets; our MaxMind GeoIP engine runs 100% offline in RAM with zero cloud calls.</p>
          </div>
        </div>

        {/* 4-Column Grounded KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Ingestion Throughput", val: "11,938 Rows/sec", sub: "100,000 rows in 8.38 seconds", color: "text-slate-950" },
            { label: "Memory Footprint", val: "18 MB RAM", sub: "26x leaner than ORMs (482 MB)", color: "text-emerald-700" },
            { label: "Offline GeoIP Lookup", val: "<0.05ms / IP", sub: "100% offline in-memory MaxMind", color: "text-slate-950" },
            { label: "Duplicate Shield", val: "0.01s Rejection", sub: "Instant SHA-256 idempotency check", color: "text-blue-700" },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50/80 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.04)] space-y-1"
            >
              <div className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">{kpi.label}</div>
              <div className={`text-lg font-mono font-extrabold tracking-tight ${kpi.color}`}>{kpi.val}</div>
              <div className="text-[11px] text-slate-600 font-medium">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: Plain-English Concept Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">02</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Architecture: Conventional vs. Sovereign Ingest</h2>
            <p className="text-xs text-slate-600 font-mono font-medium">Decoupling validation, binary streaming, and in-memory GeoIP eliminates latency and cloud leaks</p>
          </div>
        </div>

        <div className="card-tactical rounded-xl p-5 bg-gradient-to-b from-white to-slate-50/50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(15,23,42,0.04)] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-b from-slate-50/90 to-slate-100/60 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.03)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-md bg-slate-700 text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs">01</span>
                  <h3 className="text-sm font-bold text-slate-900">Conventional Ingest Systems</h3>
                </div>
                <Database className="w-4 h-4 text-slate-500" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-slate-900">Individual inserts:</strong> ~450 rows/sec, taking nearly 4 minutes per 100K records.</li>
                <li><strong className="text-slate-900">Cloud leaks:</strong> Sends target IP addresses to external web APIs across open internet.</li>
                <li><strong className="text-slate-900">Brittle:</strong> A single malformed CSV row halts the entire batch upload.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-b from-blue-50/90 to-blue-50/40 border-t border-t-blue-100 border-x border-x-blue-200 border-b border-b-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_4px_rgba(37,99,235,0.06)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs">02</span>
                  <h3 className="text-sm font-bold text-slate-900">NTRO Sovereign Pipeline</h3>
                </div>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-slate-900">Direct binary COPY:</strong> Ingests 11,938 rows/sec (100K rows in 8.38 seconds).</li>
                <li><strong className="text-slate-900">Offline MaxMind RAM:</strong> Resolves city, country, and ISP in &lt;0.05ms with 0 web calls.</li>
                <li><strong className="text-slate-900">Auto quarantine:</strong> Corrupted rows isolate to audit logs while valid data streams.</li>
              </ul>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50 border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Unified 14-Field Forensic Intelligence Record</div>
                <p className="text-[11px] text-slate-600">Every transaction is validated, SHA-256 fingerprinted, and enriched offline.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 text-slate-900 shadow-xs self-start sm:self-auto">
              Speed: 8.38s / 100K Rows • 0 Cloud Calls
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 3: Interactive System / Feature Inspector */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">03</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Performance Benchmark &amp; Engine Inspector</h2>
            <p className="text-xs text-slate-600 font-mono font-medium">Measured throughput, RAM consumption, and latency benchmarks across transaction volumes</p>
          </div>
        </div>
        <BenchmarkCard />
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch1-mission-architecture"
          className="p-2.5 px-4 rounded-lg border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 bg-gradient-to-b from-white to-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(15,23,42,0.05)]"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 1: The NTRO Mission &amp; Architecture</div>
          </div>
        </Link>
        <div className="text-xs font-mono text-slate-500">NTRO FORENSIC INTELLIGENCE • SEC-DOC-26146-CH02</div>
        <Link
          href="/docs/ch3-graph-entity-clustering"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 3: Graph Topology &amp; Entity Clustering</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white ml-2 flex-shrink-0" />
        </Link>
      </div>
    </article>
  );
}
