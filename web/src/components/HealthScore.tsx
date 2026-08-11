"use client";

import type { Metrics, MetricScores, Mirror } from "@/lib/types";
import { MetricCards } from "./MetricCards";
import { ExpenseChart } from "./ExpenseChart";
import { useStore } from "@/lib/store";

const LABEL_COLORS: Record<string, string> = {
  Critical: "text-red-500",
  "At Risk": "text-orange-500",
  Fair:     "text-yellow-600 dark:text-yellow-400",
  Good:     "text-blue-500",
  Healthy:  "text-green-500",
};

const SCORE_RING_COLOR: Record<string, string> = {
  Critical: "#dc3535",
  "At Risk": "#dc6e00",
  Fair:     "#a08200",
  Good:     "#3b82f6",
  Healthy:  "#22c55e",
};

export function HealthScore({
  score,
  mirror,
  metrics,
  metricScores,
}: {
  score: number;
  mirror: Mirror;
  metrics: Metrics;
  metricScores: MetricScores;
}) {
  const { formData } = useStore();
  const color = SCORE_RING_COLOR[mirror.label] || "#6b7280";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-8 items-start">
      {/* Score ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-36 h-36 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={color} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-[var(--text)]">{score}</span>
            <span className="text-xs text-[var(--text-muted)]">/ 100</span>
          </div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${LABEL_COLORS[mirror.label] || "text-[var(--text)]"}`}>
            {mirror.label}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            Net flow:{" "}
            <span className={metrics.net_monthly_flow >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              ${metrics.net_monthly_flow.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo
            </span>
          </div>
        </div>
      </div>

      {/* Right: description + metric cards + expense chart */}
      <div className="space-y-5">
        <p className="text-[var(--text-muted)]">{mirror.description}</p>
        <MetricCards metrics={metrics} metricScores={metricScores} />
        {formData.section2Open && <ExpenseChart />}
      </div>
    </div>
  );
}
