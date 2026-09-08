"use client";

import { useCallback, useRef, useState } from "react";
import { clsx } from "clsx";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadIngestFile, fetchIngestStatus, ApiError } from "@/lib/api";

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // triggers alert table refresh
}

type Stage = "idle" | "uploading" | "polling" | "success" | "error";

const ACCEPTED = ".csv,.json,.xml";

export default function IngestModal({
  isOpen,
  onClose,
  onSuccess,
}: IngestModalProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setStage("idle");
    setProgress(0);
    setSelectedFile(null);
    setStatusText("");
    setErrorMsg("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

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
        const msg =
          err instanceof ApiError ? err.detail : "Upload failed. Check file format.";
        setErrorMsg(msg);
        setStage("error");
        toast.error(`Ingest failed: ${msg}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pollStatus = (taskId: string, attempts: number) => {
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
          pollStatus(taskId, attempts + 1);
        } else if (status.status === "SUCCESS") {
          setProgress(100);
          setStage("success");
          const result = status.result as Record<string, number> | undefined;
          const inserted = result?.total_inserted ?? "?";
          setStatusText(`Successfully ingested ${inserted.toLocaleString?.()} rows`);
          toast.success(`Batch ingested: ${inserted} rows processed`);
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        } else if (status.status === "FAILURE") {
          setErrorMsg(status.error ?? "Celery task failed");
          setStage("error");
          toast.error(`Ingest task failed: ${status.error}`);
        } else {
          // PENDING or STARTED
          setProgress((p) => Math.min(p + 2, 45));
          pollStatus(taskId, attempts + 1);
        }
      } catch (err) {
        setErrorMsg("Failed to poll task status");
        setStage("error");
      }
    }, 2000);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) startUpload(file);
    },
    [startUpload],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startUpload(file);
  };

  if (!isOpen) return null;

  const isWorking = stage === "uploading" || stage === "polling";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ingest batch file"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-drawer overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-800">
              Ingest Batch File
            </span>
          </div>
          <button
            id="ingest-modal-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Dropzone — only show when idle */}
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
                "flex flex-col items-center justify-center gap-3 h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                dragOver
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100",
              )}
            >
              <Upload
                className={clsx(
                  "w-8 h-8 transition-colors",
                  dragOver ? "text-sky-500" : "text-slate-400",
                )}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-0.5 crypto-mono">
                  Accepts .csv, .json, .xml — max 500 MB
                </p>
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

          {/* File info */}
          {selectedFile && stage !== "idle" && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded bg-slate-50 border border-slate-200">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 truncate">
                  {selectedFile.name}
                </p>
                <p className="crypto-mono text-[11px] text-slate-500">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isWorking && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{statusText}</span>
                <span className="crypto-mono">{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success */}
          {stage === "success" && (
            <div className="flex items-center gap-3 px-3 py-3 rounded bg-emerald-50 border border-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  Ingestion complete
                </p>
                <p className="text-[11px] text-emerald-600">{statusText}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {stage === "error" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 px-3 py-3 rounded bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">
                    Ingestion failed
                  </p>
                  <p className="crypto-mono text-[11px] text-red-600 break-all">
                    {errorMsg}
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="text-xs px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
              >
                Try Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
