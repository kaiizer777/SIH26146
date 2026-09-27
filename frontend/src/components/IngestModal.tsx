"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Sliders,
  Database,
  Download,
  Zap,
  ArrowLeft,
  FileSpreadsheet,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { uploadIngestFile, fetchIngestStatus, syncIngestTask, ApiError } from "@/lib/api";

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // triggers alert table refresh
}

type Stage =
  | "idle"
  | "uploading"
  | "polling"
  | "success"
  | "warning"
  | "error"
  | "duplicate";

const ACCEPTED = ".csv,.json,.xml";

export default function IngestModal({
  isOpen,
  onClose,
  onSuccess,
}: IngestModalProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [isDraggingSample, setIsDraggingSample] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setStage("idle");
    setProgress(0);
    setSelectedFile(null);
    setStatusText("");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "uploading" && stage !== "polling") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, stage]);

  const pollStatus = useCallback(
    function poll(taskId: string, attempts: number) {
      if (attempts > 120) {
        setErrorMsg("Task timed out after 4 minutes");
        setStage("error");
        return;
      }

      pollTimerRef.current = setTimeout(async () => {
        try {
          const status = await fetchIngestStatus(taskId);

          if (status.status === "PROGRESS" && status.progress) {
            const p = status.progress as Record<string, number>;
            const pct = p.total
              ? Math.round((p.processed / p.total) * 70) + 20
              : 50;
            setProgress(pct);
            setStatusText(
              `Processing… ${p.processed?.toLocaleString() ?? "?"} / ${p.total?.toLocaleString() ?? "?"} rows`,
            );
            poll(taskId, attempts + 1);
          } else if (status.status === "SUCCESS") {
            setProgress(100);
            const result = status.result as Record<string, number> | undefined;
            const inserted = Number(
              result?.total_inserted ?? result?.inserted ?? result?.rows_inserted ?? 0
            );
            const rejected = Number(
              result?.total_rejected ?? result?.rejected ?? result?.rows_rejected ?? 0
            );
            const received = Number(
              result?.total_received ?? result?.received ?? (inserted + rejected)
            );

            if (inserted === 0 && (rejected > 0 || received > 0)) {
              // DUP-2b: All rows rejected as duplicates (txid already exists in Postgres)
              setStage("warning");
              const count = rejected > 0 ? rejected : received;
              const warnMsg = `No new transactions inserted — all ${count.toLocaleString()} rows were rejected as duplicates (txid already exists). The alert table reflects existing data.`;
              setStatusText(warnMsg);
              toast.warning(warnMsg);
              onSuccess();
            } else if (inserted === 0 && rejected === 0 && received === 0) {
              setStage("error");
              const emptyMsg = "No transaction records found in uploaded file.";
              setErrorMsg(emptyMsg);
              toast.error(emptyMsg);
            } else {
              setStage("success");
              setStatusText(`Successfully ingested ${inserted.toLocaleString()} rows`);
              toast.success(`Batch ingested: ${inserted} rows processed`);

              // Sub-task 11.4: Post-ingest online inference sync (fail-open)
              try {
                await syncIngestTask(taskId);
              } catch (syncErr) {
                console.warn(
                  "[IngestModal] post-ingest sync request failed:",
                  syncErr,
                  "— proceeding anyway",
                );
              }

              pollTimerRef.current = setTimeout(() => {
                onSuccess();
                handleClose();
              }, 1500);
            }
          } else if (status.status === "FAILURE") {
            setErrorMsg(status.error ?? "Celery task failed");
            setStage("error");
            toast.error(`Ingest task failed: ${status.error}`);
          } else {
            // PENDING or STARTED
            setProgress((p) => Math.min(p + 2, 45));
            poll(taskId, attempts + 1);
          }
        } catch {
          setErrorMsg("Failed to poll task status");
          setStage("error");
        }
      }, 2000);
    },
    [onSuccess, handleClose],
  );

  const startUpload = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setStage("uploading");
      setProgress(5);
      setStatusText(`Uploading ${file.name}…`);

      try {
        const { task_id } = await uploadIngestFile(file);
        setProgress(20);
        setStage("polling");
        setStatusText("Processing…");
        pollStatus(task_id, 0);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // DUP-2a: 409 Duplicate file detected — do NOT poll, do NOT call onSuccess()
          const dupMsg =
            "This file has already been uploaded. Use a different file or wait 24 hours to re-upload.";
          setErrorMsg(dupMsg);
          setStage("duplicate");
          toast.error(dupMsg);
          return;
        }
        const msg =
          err instanceof ApiError ? err.detail : "Upload failed. Check file format.";
        setErrorMsg(msg);
        setStage("error");
        toast.error(`Ingest failed: ${msg}`);
      }
    },
    [pollStatus],
  );

  const SAMPLE_DATASETS = [
    {
      name: "test_2000.csv",
      title: "Sample 2,000 TXs",
      tagline: "High-volume stress test dataset with multi-hop laundering chains",
      size: "718 KB",
      rows: "2,000 Rows",
      badge: "2,000 Rows",
      badgeStyle: "bg-sky-50 text-sky-700 border-sky-200/80",
      url: "/sample_data/test_2000.csv",
    },
  ];

  const loadSampleDataset = useCallback(
    async (url: string, filename: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "text/csv" });
        startUpload(file);
      } catch (err) {
        toast.error(`Failed to load sample dataset: ${filename}`);
      }
    },
    [startUpload],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const sampleUrl = e.dataTransfer.getData("application/sample-dataset");
      const sampleName = e.dataTransfer.getData("text/plain");
      if (sampleUrl) {
        await loadSampleDataset(sampleUrl, sampleName || "test_2000.csv");
        return;
      }
      const file = e.dataTransfer.files[0];
      if (file) startUpload(file);
    },
    [startUpload, loadSampleDataset],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startUpload(file);
  };

  if (!isOpen) return null;

  const isWorking = stage === "uploading" || stage === "polling";

  return (
    <>
      {/* Backdrop with frosted atmospheric depth */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[5px] transition-all duration-200"
        onClick={handleClose}
      />

      {/* 3D Elevated Modal Card Container in the Center */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ingest batch file"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-3d-modal overflow-hidden transition-all duration-200"
      >
        {/* Tactile 3D Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-sky-50 to-sky-100/90 border border-sky-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.06)] flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-sky-700" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 tracking-tight">
                Ingest Batch File
              </span>
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                ETL Pipeline
              </span>
            </div>
          </div>
          <button
            id="ingest-modal-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-white to-slate-100 border border-slate-300 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.08)] active:shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.2)] active:translate-y-[0.5px] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 bg-white">
          {/* 3D Recessed Dropzone Chamber — only show when idle */}
          {stage === "idle" && (
            <div
              id="ingest-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "relative flex flex-col items-center justify-center gap-4 py-9 px-6 rounded-xl cursor-pointer select-none transition-all duration-150",
                dragOver ? "tactile-dropzone-3d-active" : "tactile-dropzone-3d"
              )}
            >
              {/* 3D Floating Icon Medallion */}
              <div
                className={clsx(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150",
                  dragOver
                    ? "bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_16px_rgba(2,132,199,0.35)] scale-105"
                    : "tactile-medallion-3d"
                )}
              >
                <Upload
                  className={clsx(
                    "w-6 h-6",
                    dragOver ? "text-white" : "text-sky-600"
                  )}
                />
              </div>

              {/* Title & 3D Interactive Browse CTA */}
              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 tracking-tight">
                    Drop batch file here
                  </p>
                  <span className="text-xs text-slate-400 font-medium">or</span>
                  <span className="px-3.5 py-1 rounded-md text-xs font-semibold text-sky-700 bg-sky-50/90 border border-sky-300 inline-flex items-center gap-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(2,132,199,0.08)]">
                    Browse Files
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Ingest raw blockchain & network logs for offline forensic analysis
                </p>
              </div>

              {/* 3D Format Token Chips */}
              <div className="flex items-center gap-2 pt-0.5">
                {[".CSV", ".JSON", ".XML"].map((fmt) => (
                  <span
                    key={fmt}
                    className="crypto-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-gradient-to-b from-white to-slate-100 border border-slate-200/90 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    {fmt}
                  </span>
                ))}
                <span className="text-slate-300">•</span>
                <span className="crypto-mono text-[11px] font-medium text-slate-500">
                  Max 500 MB
                </span>
              </div>

              {/* Security & Integrity Badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>SHA-256 duplicate validation & air-gapped parsing</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={onFileChange}
                id="ingest-file-input"
              />
            </div>
          )}

          {/* 3D Elevated File Info Card */}
          {selectedFile && stage !== "idle" && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_4px_rgba(15,23,42,0.04)]">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-sky-50 to-sky-100 border border-sky-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-sky-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {selectedFile.name}
                </p>
                <p className="crypto-mono text-[11px] text-slate-500">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-sky-50 border border-sky-200 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {stage === "uploading" ? "Uploading" : "Processing"}
              </span>
            </div>
          )}

          {/* 3D Grooved Progress Gauge */}
          {isWorking && (
            <div className="space-y-2 p-4 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                  </span>
                  {statusText}
                </span>
                <span className="crypto-mono font-bold text-sky-700 px-2.5 py-0.5 rounded bg-white border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.05)]">
                  {progress}%
                </span>
              </div>
              {/* 3D Inset Track */}
              <div className="h-3 w-full rounded-full bg-gradient-to-b from-slate-200 to-slate-100 p-0.5 border border-slate-200/90 shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.14),0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_3px_rgba(2,132,199,0.35)] transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          )}

          {/* 3D Success Card */}
          {stage === "success" && (
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-gradient-to-b from-emerald-50/90 via-emerald-50/60 to-emerald-100/50 border border-emerald-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(16,185,129,0.08)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-white to-emerald-100 border border-emerald-300 shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_2px_4px_rgba(16,185,129,0.2)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Ingestion Complete
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">{statusText}</p>
              </div>
            </div>
          )}

          {/* 3D All-Rejected Warning Banner (DUP-2b) */}
          {stage === "warning" && (
            <div className="flex flex-col gap-3">
              <div
                id="ingest-duplicate-warning-banner"
                role="alert"
                className="flex items-start gap-3.5 p-4 rounded-xl bg-gradient-to-b from-amber-50/90 via-amber-50/60 to-amber-100/50 border border-amber-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(217,119,6,0.08)] text-amber-900"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-white to-amber-100 border border-amber-300 shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_2px_4px_rgba(217,119,6,0.2)] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-bold text-amber-900">
                    Duplicate Transactions Detected
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {statusText}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={reset}
                  className="tactile-btn-secondary text-xs px-3.5 py-1.5 rounded-lg text-slate-700 font-medium cursor-pointer"
                >
                  Upload Another File
                </button>
                <button
                  id="ingest-warning-dismiss-btn"
                  onClick={handleClose}
                  className="text-xs px-4 py-1.5 bg-gradient-to-b from-amber-500 to-amber-600 text-white rounded-lg font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_4px_rgba(217,119,6,0.25)] hover:from-amber-600 hover:to-amber-700 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[0.5px] transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* 3D Duplicate Upload Detected Banner (DUP-2a) */}
          {stage === "duplicate" && (
            <div className="flex flex-col gap-3">
              <div
                id="ingest-duplicate-error-banner"
                role="alert"
                className="flex items-start gap-3.5 p-4 rounded-xl bg-gradient-to-b from-red-50/90 via-red-50/60 to-red-100/50 border border-red-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(220,38,38,0.08)] text-red-900"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-white to-red-100 border border-red-300 shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_2px_4px_rgba(220,38,38,0.2)] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-bold text-red-900">
                    Duplicate File Detected
                  </p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
              </div>
              <button
                id="ingest-try-another-file-btn"
                onClick={reset}
                className="tactile-btn-primary text-xs px-4 py-2 rounded-lg text-white font-medium self-start cursor-pointer"
              >
                Select Another File
              </button>
            </div>
          )}

          {/* 3D Generic Error Card */}
          {stage === "error" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-gradient-to-b from-red-50/90 via-red-50/60 to-red-100/50 border border-red-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(220,38,38,0.08)]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-white to-red-100 border border-red-300 shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_2px_4px_rgba(220,38,38,0.2)] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-900">
                    Ingestion Failed
                  </p>
                  <p className="crypto-mono text-xs text-red-700 break-all mt-0.5">
                    {errorMsg}
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="tactile-btn-primary text-xs px-4 py-2 rounded-lg text-white font-medium self-start cursor-pointer"
              >
                Try Another File
              </button>
            </div>
          )}
        </div>

        {/* 3D Tactile Footer Strip */}
        <div className="px-6 py-3 bg-gradient-to-b from-slate-50 to-slate-100/90 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">NTRO Air-Gapped Surveillance</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <kbd className="crypto-mono px-1.5 py-0.5 text-[10px] font-semibold bg-white rounded border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_1px_rgba(15,23,42,0.06)] text-slate-600">
              ESC
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>

      {/* Distinct Sample Dataset Dock — Anchored on the Far Right End of the Screen */}
      {stage === "idle" && (
        <aside
          aria-label="Sample test dataset"
          className="fixed z-50 right-8 top-1/2 -translate-y-1/2 w-84 bg-white/95 backdrop-blur-xl rounded-2xl border-t border-t-white border-x border-x-slate-200/90 border-b border-b-slate-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_16px_36px_-6px_rgba(15,23,42,0.14),0_4px_12px_rgba(15,23,42,0.06)] p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right-4 duration-200 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_4px_rgba(2,132,199,0.25)] border-t border-t-sky-300/60 border-x border-x-sky-600 border-b border-b-sky-800">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 tracking-tight">
                  Sample Dataset
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Pre-configured test batch
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-semibold text-emerald-700">
                Ready
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Drag into the central upload chamber or click <strong className="text-slate-800 font-semibold">Ingest</strong> for instant loading:
          </p>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5">
            {SAMPLE_DATASETS.map((sample) => (
              <div
                key={sample.name}
                draggable
                onDragStart={(e) => {
                  setIsDraggingSample(true);
                  e.dataTransfer.setData("text/plain", sample.name);
                  e.dataTransfer.setData("application/sample-dataset", sample.url);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => setIsDraggingSample(false)}
                className={clsx(
                  "relative p-3.5 rounded-xl bg-gradient-to-b from-white via-sky-50/40 to-sky-50/20 border border-t-white border-x-sky-200/90 border-b-sky-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_16px_rgba(2,132,199,0.12)] cursor-grab active:cursor-grabbing",
                  isDraggingSample && "opacity-60 scale-[0.98] border-sky-400 shadow-inner"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-sky-950 tracking-tight truncate">
                        {sample.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {sample.name}
                      </span>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
                      sample.badgeStyle
                    )}
                  >
                    {sample.badge}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug mb-3">
                  {sample.tagline}
                </p>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    <span className="crypto-mono text-[10px] font-semibold text-slate-500">
                      {sample.size}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={sample.url}
                      download={sample.name}
                      onClick={(e) => e.stopPropagation()}
                      title={`Download ${sample.name}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md bg-white border-t border-t-white border-x border-x-slate-200 border-b border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.05)] hover:bg-slate-50 active:translate-y-[0.5px] transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>Save CSV</span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadSampleDataset(sample.url, sample.name);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-md bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 text-white border-t border-t-sky-300/70 border-x border-x-sky-600 border-b border-b-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_5px_rgba(2,132,199,0.3)] hover:brightness-105 active:translate-y-[0.5px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-all cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-sky-200 fill-sky-200" />
                      <span>Ingest</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Drag Affordance Dock Bar */}
          <div className="flex items-center justify-center gap-2 py-2 px-3 text-[11px] font-semibold text-sky-800 bg-gradient-to-r from-sky-50 via-sky-100/70 to-sky-50 rounded-xl border-t border-t-white border-x border-x-sky-200/80 border-b border-b-sky-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(2,132,199,0.06)]">
            <ArrowLeft className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
            <span className="tracking-tight">Drag card across into center dropzone</span>
          </div>
        </aside>
      )}
    </>
  );
}

