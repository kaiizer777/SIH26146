"use client";

import React, { useState } from "react";
import {
  Zap,
  Clock,
  HardDrive,
  Database,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Sliders,
  Layers,
  Cpu,
} from "lucide-react";

type BenchmarkMetric = "throughput" | "latency" | "memory" | "wal";

export function BenchmarkCard() {
  const [activeTab, setActiveTab] = useState<BenchmarkMetric>("throughput");
  const [txVolume, setTxVolume] = useState<number>(100000);

  // Calculated metrics based on active transaction volume
  const copyRate = 11938; // rows per second (measured maximum)
  const ormRate = 450; // rows per second (measured ORM baseline)

  const copyTimeSeconds = Number((txVolume / copyRate).toFixed(2));
  const ormTimeSeconds = Number((txVolume / ormRate).toFixed(1));
  const timeSavedSeconds = Number((ormTimeSeconds - copyTimeSeconds).toFixed(1));
  const speedupMultiple = Number((copyRate / ormRate).toFixed(1));

  return (
    <div className="card-tactical rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      {/* Header Banner */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            <Gauge className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>MEASURED FORENSIC INGEST BENCHMARK • POSTGRESQL 16-ALPINE</span>
          </div>
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 mt-1 leading-snug">
            Bulk <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-xs sm:text-sm font-mono">COPY FROM STDIN</code> vs Standard ORM <code className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-xs sm:text-sm font-mono">INSERT</code>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs font-medium shrink-0 self-start sm:self-auto">
          <span className="px-2 sm:px-2.5 py-1 rounded bg-emerald-100/70 text-emerald-800 font-mono font-bold flex items-center gap-1 text-[11px] sm:text-xs">
            <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600 shrink-0" />
            {speedupMultiple}x FASTER
          </span>
          <span className="px-2 sm:px-2.5 py-1 text-slate-500 font-mono text-[10px] sm:text-[11px]">
            100k rows in 8.38s
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 sm:p-6 space-y-6">
        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("throughput")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "throughput"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Throughput (Rows/Sec)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("latency")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "latency"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Batch Latency
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("memory")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "memory"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Process Memory (RAM)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wal")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "wal"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            WAL & Disk Amplification
          </button>
        </div>

        {/* Tab Detail Views */}
        {activeTab === "throughput" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bulk COPY Card */}
              <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-mono font-bold text-emerald-950 uppercase tracking-wide">
                      Bulk COPY FROM STDIN (Engine Pipeline)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Production Standard
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-emerald-900">
                    11,938
                  </span>
                  <span className="text-xs font-mono text-emerald-700">rows / second</span>
                </div>
                <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-600 h-2.5 rounded-full w-full" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Uses raw <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-emerald-200">psycopg2.copy_expert()</code> streaming CSV byte buffers directly over the PostgreSQL wire protocol. Completely bypasses SQL query planning, statement parsing, and ORM object instantiations.
                </p>
              </div>

              {/* Standard ORM Card */}
              <div className="p-4 rounded-lg bg-rose-50/40 border border-rose-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-mono font-bold text-rose-950 uppercase tracking-wide">
                      Standard ORM INSERT (SQLAlchemy / Raw)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    Bottleneck Choke
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-rose-900">
                    450
                  </span>
                  <span className="text-xs font-mono text-rose-700">rows / second</span>
                </div>
                <div className="w-full bg-rose-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-rose-500 h-2.5 rounded-full w-[3.8%]" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Choked by connection pool starvation, individual statement round-trips, per-row SQL syntax validation, and heavy Python dictionary-to-model reflection overhead.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "latency" && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Per-Batch Processing Latency (1,000 Row Micro-Batch)
              </span>
              <span className="text-xs font-mono text-slate-500">psycopg2 vs session.add_all()</span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-semibold text-emerald-700">Bulk COPY Micro-Batch (1,000 rows):</span>
                  <span className="font-bold">83.7 ms</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-2 rounded-full w-[4%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-semibold text-rose-700">ORM Batch INSERT (1,000 rows):</span>
                  <span className="font-bold">2,222.0 ms (2.22s)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full w-full" />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Bulk COPY writes all 1,000 rows in a single network round-trip packet sequence directly into the table storage engine without intermediate query AST building.
            </p>
          </div>
        )}

        {activeTab === "memory" && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Worker Resident Set Size (RSS) Memory Footprint
              </span>
              <span className="text-xs font-mono text-slate-500">Tested on 100k row ingestion batch</span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-semibold text-emerald-700">StringIO Stream Buffer (COPY):</span>
                  <span className="font-bold">18 MB RAM</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-2 rounded-full w-[5%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-700 mb-1">
                  <span className="font-semibold text-rose-700">ORM Model Object Identity Map:</span>
                  <span className="font-bold">482 MB RAM</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full w-full" />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              By reusing an <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-slate-200">io.StringIO</code> buffer flushed every 1,000 rows, Celery workers maintain an ultra-lean footprint, preventing OOM kills on memory-constrained sovereign servers.
            </p>
          </div>
        )}

        {activeTab === "wal" && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                Write-Ahead Logging (WAL) & Lock Overhead
              </span>
              <span className="text-xs font-mono text-slate-500">Postgres Transaction Engine</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded border border-slate-200 space-y-1.5">
                <div className="font-mono font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  COPY Staging Pipeline
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Sequential append blocks directly written to data pages. Generates compact sequential WAL records without per-row statement transaction lock tables.
                </p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 space-y-1.5">
                <div className="font-mono font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ORM Row Insertion
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Causes massive WAL inflation. Each insert generates lock acquisitions, query parse events, and individual index maintenance operations causing table lock churn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Transaction Scaling Calculator */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                Interactive Volume Scaling Simulator
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select or drag batch transaction volumes to project ingestion execution times:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
              {[10000, 50000, 100000, 250000, 500000].map((vol) => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => setTxVolume(vol)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                    txVolume === vol
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {(vol / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min="10000"
              max="500000"
              step="10000"
              value={txVolume}
              onChange={(e) => setTxVolume(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>10,000 txs</span>
              <span className="text-slate-700 font-bold">{txVolume.toLocaleString()} transactions</span>
              <span>500,000 txs</span>
            </div>
          </div>

          {/* Calculated Output Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
              <div className="text-[10px] font-mono font-bold text-emerald-800 uppercase">
                Bulk COPY Pipeline
              </div>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-emerald-950 mt-1">
                {copyTimeSeconds}s
              </div>
              <div className="text-[10px] text-emerald-700 font-mono">
                {(txVolume / copyTimeSeconds).toFixed(0)} txs/sec sustained
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3">
              <div className="text-[10px] font-mono font-bold text-rose-800 uppercase">
                Standard ORM Baseline
              </div>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-rose-950 mt-1">
                {ormTimeSeconds > 60
                  ? `${(ormTimeSeconds / 60).toFixed(1)} min`
                  : `${ormTimeSeconds}s`}
              </div>
              <div className="text-[10px] text-rose-700 font-mono">
                ~450 txs/sec (starvation)
              </div>
            </div>

            <div className="bg-sky-50/70 border border-sky-200 rounded-lg p-3">
              <div className="text-[10px] font-mono font-bold text-sky-800 uppercase">
                Time Saved (Wall Clock)
              </div>
              <div className="text-lg sm:text-xl font-mono font-extrabold text-sky-950 mt-1">
                {timeSavedSeconds > 60
                  ? `${(timeSavedSeconds / 60).toFixed(1)} min`
                  : `${timeSavedSeconds}s`}
              </div>
              <div className="text-[10px] text-sky-700 font-mono font-bold">
                {speedupMultiple}x acceleration
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
