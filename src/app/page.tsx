"use client";

import { useState } from "react";
import { LandingPage } from "@/components/features/landing/LandingPage";
import { UploadPanel } from "@/components/features/upload/UploadPanel";
import { FintechDashboard } from "@/components/features/fintech/FintechDashboard";
import { useDataStore } from "@/stores/data-store";

export default function Home() {
  const dataset = useDataStore((s) => s.dataset);
  const clearDataset = useDataStore((s) => s.clearDataset);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleReturnHome = () => {
    clearDataset();
    setShowUploadModal(false);
  };

  if (dataset) {
    return (
      <FintechDashboard
        onReturnHome={handleReturnHome}
        onUploadNew={() => {
          clearDataset();
          setShowUploadModal(true);
        }}
      />
    );
  }

  if (showUploadModal) {
    return <UploadPanel onBackToLanding={() => setShowUploadModal(false)} />;
  }

  return <LandingPage onStartUpload={() => setShowUploadModal(true)} />;
}
