"use client";

import { ProgressTab } from "@/components/Progress";

export default function ProgressPage() {
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
