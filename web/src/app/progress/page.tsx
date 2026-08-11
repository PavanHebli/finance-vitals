"use client";

import { ProgressTab } from "@/components/Progress";

export default function ProgressPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Progress</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Track how your financial health improves over time.
      </p>
      <ProgressTab />
    </div>
  );
}
