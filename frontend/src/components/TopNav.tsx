"use client";

import { useState, useEffect } from "react";
import { Shield, Database, Upload, Search } from "lucide-react";

interface TopNavProps {
  totalIndexed: number;
  onSearchFocus: () => void;
  onIngestClick: () => void;
}

export default function TopNav({
  totalIndexed,
  onSearchFocus,
  onIngestClick,
}: TopNavProps) {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard shortcut: Ctrl+K or /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "k") || e.key === "/") {
        e.preventDefault();
        onSearchFocus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchFocus]);

  return (
    <header className="h-13 flex items-center gap-3.5 px-4 bg-white border-b border-slate-200/90 shadow-subtle z-30 shrink-0">
      {/* NTRO Emblem + Agency Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center justify-center w-7.5 h-7.5 rounded-md bg-gradient-to-b from-slate-800 to-slate-950 text-white shadow-xs border border-slate-700/60">
          <Shield className="w-4 h-4 text-sky-400 stroke-[2.2]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold tracking-[0.18em] text-slate-900 uppercase select-none">
            NTRO
          </span>
          <span className="text-slate-300 select-none">|</span>
          <span className="text-xs font-semibold tracking-wider text-slate-600 uppercase select-none hidden sm:inline">
            Bitcoin AML Surveillance
          </span>
        </div>
      </div>

      {/* Vertical separator */}
      <div className="h-4 w-px bg-slate-200 hidden md:block" />

      {/* Operational telemetry badge */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-emerald-200/90 bg-emerald-50/70 shadow-2xs shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-200/60" />
        </span>
        <span className="text-[11px] font-semibold text-emerald-800 crypto-mono tracking-tight">
          AIR-GAPPED OPERATIONAL
        </span>
      </div>

      {/* Indexed wallet ledger telemetry */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200/80 bg-slate-50/80 text-slate-600 shrink-0 hidden md:flex">
        <Database className="w-3.5 h-3.5 text-slate-400" />
        <span className="crypto-mono text-xs font-medium text-slate-700">
          {totalIndexed > 0
            ? `${totalIndexed.toLocaleString()} WALLETS INDEXED`
            : "INDEXING REPO…"}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live Military UTC Clock */}
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-100 bg-slate-50/50 text-slate-500 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          SYS UTC
        </span>
        <span className="crypto-mono text-xs text-slate-700 font-semibold">{now}</span>
      </div>

      {/* Search trigger shortcut button */}
      <button
        id="topnav-search-btn"
        onClick={onSearchFocus}
        className="flex items-center gap-2 h-7.5 px-2.5 sm:px-3 rounded-md border border-slate-200 tactile-btn-secondary text-slate-600 text-xs transition-all"
        aria-label="Focus search (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span className="hidden sm:inline font-medium">Search</span>
        <span className="crypto-mono text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/90 rounded px-1.5 py-0.5 shadow-2xs">
          Ctrl K
        </span>
      </button>

      {/* Ingest batch button */}
      <button
        id="topnav-ingest-btn"
        onClick={onIngestClick}
        className="flex items-center gap-1.5 h-7.5 px-3.5 rounded-md tactile-btn-primary text-white text-xs font-semibold cursor-pointer select-none"
      >
        <Upload className="w-3.5 h-3.5 text-sky-300 stroke-[2.2]" />
        <span>Ingest Batch</span>
      </button>
    </header>
  );
}
