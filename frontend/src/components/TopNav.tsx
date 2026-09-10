"use client";

import { useState, useEffect } from "react";
import { Shield, Database, Upload, Zap, ChevronDown } from "lucide-react";
import ModelProvenanceModal from "./ModelProvenanceModal";

interface TopNavProps {
  totalIndexed: number;
  onSearchFocus?: () => void;
  onIngestClick: () => void;
  onProvenanceClick?: () => void;
}

export default function TopNav({
  totalIndexed,
  onSearchFocus,
  onIngestClick,
  onProvenanceClick,
}: TopNavProps) {
  const [internalProvenanceOpen, setInternalProvenanceOpen] = useState(false);

  const handleProvenanceClick = () => {
    if (onProvenanceClick) {
      onProvenanceClick();
    } else {
      setInternalProvenanceOpen(true);
    }
  };

  // Keyboard shortcut: Ctrl+K or /
  useEffect(() => {
    if (!onSearchFocus) return;
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
    <>
      <header className="h-12 flex items-center gap-3 px-4 bg-white border-b border-slate-200/90 shadow-subtle z-30 shrink-0">
      {/* NTRO Emblem + Agency Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-900 text-white shadow-xs border border-slate-800">
          <Shield className="w-3.5 h-3.5 text-sky-400 stroke-[2.4]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-[0.16em] text-slate-950 uppercase select-none">
            NTRO
          </span>
          <span className="text-slate-300 select-none text-xs">/</span>
          <span className="text-[11.5px] font-semibold tracking-wide text-slate-600 uppercase select-none hidden sm:inline">
            Bitcoin AML Surveillance
          </span>
        </div>
      </div>

      {/* Vertical separator */}
      <div className="h-4 w-px bg-slate-200 hidden md:block" />

      {/* Operational telemetry badge */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-emerald-200/80 bg-emerald-50/80 text-emerald-800 shadow-2xs shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-200" />
        </span>
        <span className="text-[10.5px] font-bold crypto-mono tracking-tight uppercase">
          Air-Gapped Operational
        </span>
      </div>

      {/* Indexed wallet ledger telemetry */}
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200/80 bg-slate-50/80 text-slate-600 shrink-0 hidden md:flex">
        <Database className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
        <span className="crypto-mono text-[11px] font-semibold text-slate-700">
          {totalIndexed > 0
            ? `${totalIndexed.toLocaleString()} WALLETS INDEXED`
            : "INDEXING REPO…"}
        </span>
      </div>

      {/* Model Architecture Provenance & Telemetry Chip */}
      <button
        id="topnav-model-provenance-btn"
        onClick={handleProvenanceClick}
        aria-haspopup="dialog"
        aria-label="Dual Transformer model provenance and benchmark audit"
        className="flex items-center gap-1.5 border border-sky-200/80 bg-sky-50/70 hover:bg-sky-100/90 text-sky-800 transition-all rounded-md px-2.5 py-1 text-[11px] font-semibold crypto-mono shrink-0 cursor-pointer shadow-2xs active:scale-[0.99]"
      >
        <Zap className="w-3.5 h-3.5 text-sky-600 fill-sky-500/20 shrink-0 stroke-[2.2]" />
        <span className="hidden xl:inline">
          DUAL TRANSFORMER (FT-TRANS + RGT 4-HEAD) • 4.8ms CPU
        </span>
        <span className="xl:hidden hidden sm:inline">
          DUAL TRANSFORMER • 4.8ms
        </span>
        <span className="sm:hidden">
          DUAL-TF • 4.8ms
        </span>
        <ChevronDown className="w-3 h-3 text-sky-600/70 shrink-0" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Ingest batch button */}
      <button
        id="topnav-ingest-btn"
        onClick={onIngestClick}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg tactile-btn-primary text-white text-xs font-semibold cursor-pointer select-none"
      >
        <Upload className="w-3.5 h-3.5 text-sky-300 stroke-[2.2]" />
        <span>Ingest Batch</span>
      </button>
    </header>

    {!onProvenanceClick && (
      <ModelProvenanceModal
        isOpen={internalProvenanceOpen}
        onClose={() => setInternalProvenanceOpen(false)}
      />
    )}
  </>
  );
}
