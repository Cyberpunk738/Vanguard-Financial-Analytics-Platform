"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseFile } from "@/lib/parsing/parse-file";
import type {
  FileDropzoneProps,
  UploadProgress,
  UploadResult,
  UploadError,
  UploadState,
} from "@/types/upload";

export function FileDropzone({
  onUploadComplete,
  onUploadError,
  onProgress,
  accept,
  maxSize,
  maxRows,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const jobRef = useRef(0);
  useEffect(
    () => () => {
      jobRef.current += 1;
    },
    [],
  );

  const reset = useCallback(() => {
    jobRef.current += 1;
    setUploadState({ status: "idle" });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      reset();
      const job = jobRef.current;
      setUploadState({ status: "validating" });

      const handleProgress = (progress: UploadProgress) => {
        if (job !== jobRef.current) return;
        setUploadState({
          status: progress.stage === "analyzing" ? "analyzing" : "parsing",
          progress,
        });
        onProgress?.(progress);
      };

      try {
        const result = await parseFile(file, handleProgress, {
          accept,
          maxSize,
          maxRows,
        });

        if (job !== jobRef.current) return;
        setUploadState({ status: "complete", result });
        onUploadComplete(result);
      } catch (error) {
        if (job !== jobRef.current) return;
        const uploadError: UploadError =
          error && typeof error === "object" && "code" in error
            ? (error as UploadError)
            : {
                code: "PARSE_ERROR",
                message:
                  error instanceof Error
                    ? error.message
                    : "An unexpected error occurred during parsing.",
              };

        setUploadState({ status: "error", error: uploadError });
        onUploadError?.(uploadError);
      }
    },
    [
      onUploadComplete,
      onUploadError,
      onProgress,
      accept,
      maxSize,
      maxRows,
      reset,
    ],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (
        disabled ||
        ["validating", "parsing", "analyzing"].includes(uploadState.status)
      )
        return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled, uploadState.status],
  );

  const handleClick = useCallback(() => {
    if (
      disabled ||
      ["validating", "parsing", "analyzing"].includes(uploadState.status)
    )
      return;
    inputRef.current?.click();
  }, [disabled, uploadState.status]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const acceptString = (
    accept ?? [
      ".csv",
      ".xlsx",
      ".xls",
      ".pdf",
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
  ).join(",");

  const isInteractive =
    !disabled &&
    !["validating", "parsing", "analyzing"].includes(uploadState.status);

  return (
    <div className={cn("relative", className)} aria-live="polite">
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
      />

      <div
        role="button"
        tabIndex={isInteractive ? 0 : -1}
        aria-label="Upload file"
        aria-disabled={!isInteractive}
        aria-busy={["validating", "parsing", "analyzing"].includes(
          uploadState.status,
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200",
          isDragging && !disabled
            ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(0,0,0,0.05)]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
          !isInteractive && "pointer-events-none opacity-60",
          uploadState.status === "complete" &&
            "border-emerald-500/50 bg-emerald-50/50 dark:border-emerald-400/30 dark:bg-emerald-950/20",
          uploadState.status === "error" &&
            "border-destructive/50 bg-destructive/5",
        )}
      >
        {uploadState.status === "idle" && <IdleState />}
        {uploadState.status === "validating" && <ValidatingState />}
        {(uploadState.status === "parsing" ||
          uploadState.status === "analyzing") && (
          <ParsingState progress={uploadState.progress} />
        )}
        {uploadState.status === "complete" && (
          <CompleteState result={uploadState.result} onReset={reset} />
        )}
        {uploadState.status === "error" && (
          <ErrorState error={uploadState.error} onRetry={reset} />
        )}
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-full bg-primary/10 p-4">
        <Upload className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">Drop your file here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse &middot; CSV, Excel, or PDF Bank Statement up to
          50MB
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
          <FileText className="h-3.5 w-3.5" />
          .csv
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
          <FileText className="h-3.5 w-3.5" />
          .xlsx
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
          <FileText className="h-3.5 w-3.5" />
          .pdf
        </span>
      </div>
    </div>
  );
}

function ValidatingState() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      <p className="text-sm font-medium text-muted-foreground">
        Validating file...
      </p>
    </div>
  );
}

function ParsingState({ progress }: { progress: UploadProgress }) {
  const label =
    progress.stage === "analyzing" ? "Analyzing columns..." : "Parsing rows...";

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {progress.percent}% &middot; {formatBytes(progress.bytesLoaded)} /{" "}
            {formatBytes(progress.bytesTotal)}
          </p>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

function CompleteState({
  result,
  onReset,
}: {
  result: UploadResult;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/50">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
          {result.fileName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.rowCount.toLocaleString()} rows &middot;{" "}
          {result.columns.length} columns &middot;{" "}
          {formatBytes(result.fileSize)}
        </p>
      </div>
      {result.parseErrors.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {result.parseErrors.length} parse warning
          {result.parseErrors.length !== 1 ? "s" : ""}
        </p>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onReset();
        }}
        className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        <X className="h-3.5 w-3.5" />
        Remove
      </button>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: UploadError;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-destructive">{error.message}</p>
        {error.code === "PARSE_ERROR" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Check that your file is formatted correctly and try again.
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
