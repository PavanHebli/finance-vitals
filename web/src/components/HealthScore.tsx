"use client";

import { useState, useEffect } from "react";
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
  const { formData, snapshots } = useStore();
  const [displayScore, setDisplayScore] = useState(0);
  const [ringReady, setRingReady] = useState(false);

  // Count-up animation on every mount
  useEffect(() => {
    setDisplayScore(0);
    setRingReady(false);
    const ringTimer = setTimeout(() => setRingReady(true), 80);
    const duration = 900;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { clearTimeout(ringTimer); cancelAnimationFrame(raf); };
  }, [score]);

  // Previous snapshot = last one from a different month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevSnap = [...snapshots]
    .filter((s) => s.saved_at !== currentMonth)
    .sort((a, b) => a.saved_at.localeCompare(b.saved_at))
    .at(-1) ?? null;

  const delta = prevSnap !== null ? score - prevSnap.outputs.overall_score : null;
  const previousMetrics = prevSnap?.outputs.metrics ?? null;

  const color = SCORE_RING_COLOR[mirror.label] || "#6b7280";
  const circumference = 2 * Math.PI * 54;
  const targetOffset = circumference - (score / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 items-start">

      {/* Score ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 shrink-0">
          {/* Soft glow behind ring */}
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-1000"
            style={{ background: color }}
          />
          <svg className="relative w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={color} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={ringReady ? targetOffset : circumference}
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-5xl font-extrabold leading-none text-[var(--text)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {displayScore}
            </span>
            <span className="text-xs text-[var(--text-muted)] mt-0.5">/ 100</span>
          </div>
        </div>

        <div className="text-center space-y-1">
          <div className={`text-lg font-bold ${LABEL_COLORS[mirror.label] || "text-[var(--text)]"}`}>
            {mirror.label}
          </div>

          {/* Month-over-month delta */}
          {delta !== null && delta !== 0 && (
            <div className={`text-sm font-semibold ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
              {delta > 0 ? "↑" : "↓"} {Math.abs(delta)} from last check-in
            </div>
          )}
          {delta === 0 && (
            <div className="text-xs text-[var(--text-muted)]">Same as last month</div>
          )}

          <div className="text-xs text-[var(--text-muted)]">
            Net flow:{" "}
            <span className={metrics.net_monthly_flow >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              ${metrics.net_monthly_flow.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo
            </span>
          </div>
        </div>
      </div>

      {/* Right: description + metrics + chart */}
      <div className="space-y-5">
        <p className="text-[var(--text-muted)] leading-relaxed">{mirror.description}</p>
        <MetricCards metrics={metrics} metricScores={metricScores} previousMetrics={previousMetrics} />
        {formData.section2Open && <ExpenseChart />}
      </div>
    </div>
  );
}
