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
    <header className="h-12 flex items-center gap-4 px-4 bg-white border-b border-slate-200 shadow-card z-30 shrink-0">
      {/* NTRO Emblem + Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded bg-slate-900">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-semibold tracking-widest text-slate-700 uppercase select-none">
          NTRO · Bitcoin AML Surveillance System
        </span>
      </div>

      {/* Live status badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-emerald-700 crypto-mono">
          AIR-GAPPED OPERATIONAL
        </span>
      </div>

      {/* Transaction count */}
      <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
        <Database className="w-3.5 h-3.5" />
        <span className="crypto-mono text-xs text-slate-700 font-medium">
          {totalIndexed > 0
            ? `${totalIndexed.toLocaleString()} WALLETS INDEXED`
            : "LOADING…"}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Live clock */}
      <span className="crypto-mono text-xs text-slate-400 hidden lg:block">{now}</span>

      {/* Search trigger */}
      <button
        id="topnav-search-btn"
        onClick={onSearchFocus}
        className="flex items-center gap-2 h-7 px-3 rounded border border-slate-200 bg-slate-50 text-slate-500 text-xs hover:border-slate-300 hover:bg-white transition-colors"
        aria-label="Focus search (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Search</span>
        <span className="hidden md:block crypto-mono text-[10px] text-slate-400 border border-slate-200 rounded px-1">
          Ctrl K
        </span>
      </button>

      {/* Ingest batch button */}
      <button
        id="topnav-ingest-btn"
        onClick={onIngestClick}
        className="flex items-center gap-1.5 h-7 px-3 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>Ingest Batch</span>
      </button>
    </header>
  );
}
