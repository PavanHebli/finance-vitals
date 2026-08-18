"use client";

import { useEffect } from "react";
import { ProgressTab } from "@/components/Progress";
import { analytics } from "@/lib/analytics";

export default function ProgressPage() {
  useEffect(() => {
    analytics.updateSession({ progress_viewed: true });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Progress</h1>
        <p className="text-[var(--text-muted)]">
          Your financial health over time — updated every time you check in.
        </p>
      </div>
      <ProgressTab />
    </div>
  );
}
