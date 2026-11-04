"use client";

import { useCallback } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/shared/Brand";
import { FileDropzone } from "./FileDropzone";
import { useDataset } from "@/hooks/useDataset";
import { useDataStore } from "@/stores/data-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { getSampleDataset } from "@/lib/analytics/sample-data";
import type { UploadResult } from "@/types/upload";

export function UploadPanel({
  onBackToLanding,
}: {
  onBackToLanding?: () => void;
}) {
  const { dataset, loadParsedData } = useDataset();
  const setDataset = useDataStore((s) => s.setDataset);
  const reset = useDashboardStore((s) => s.reset);
  const handleUploadComplete = useCallback(
    (result: UploadResult) => {
      reset();
      loadParsedData(result);
    },
    [loadParsedData, reset],
  );
  if (dataset) return null;
  return (
    <div className="upload-shell">
      <header className="site-header page-width">
        <button onClick={onBackToLanding} aria-label="Vanguard home">
          <Brand />
        </button>
        <button className="button button-outline" onClick={onBackToLanding}>
          <ArrowLeft size={15} />
          Back to home
        </button>
      </header>
      <main className="upload-grid page-width">
        <div className="upload-copy">
          <span className="section-pill">Your next step</span>
          <h1>
            Bring the numbers.
            <br />
            <span className="green-text">Find the clarity.</span>
          </h1>
          <p>
            Give your bank statement a fresh perspective. Upload a file to
            explore your cash flow, spending patterns, and financial health.
          </p>
          <div className="upload-checklist">
            <div>
              <Check />
              PDF, CSV, and Excel supported
            </div>
            <div>
              <Check />
              No account or API key needed
            </div>
            <div>
              <ShieldCheck />
              Processed locally in your browser
            </div>
          </div>
        </div>
        <section className="upload-card" aria-label="Upload your statement">
          <div className="upload-card-header">
            <span>01 / YOUR STATEMENT</span>
            <span>Up to 50 MB</span>
          </div>
          <FileDropzone onUploadComplete={handleUploadComplete} />
          <p className="upload-help">
            <LockKeyhole size={15} />
            Your file stays on this device. Refreshing clears the loaded data.
          </p>
          <div className="upload-demo">
            <span>Just taking a look?</span>
            <button
              className="text-button"
              onClick={() => {
                reset();
                setDataset(getSampleDataset());
              }}
            >
              Explore sample data <ArrowUpRight size={15} />
            </button>
          </div>
          <p className="upload-help">
            For best results, include dates, descriptions, and amount or
            debit/credit columns. Scanned PDFs require OCR before upload.
          </p>
        </section>
      </main>
    </div>
  );
}
