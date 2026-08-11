"use client";

import * as Progress from "@radix-ui/react-progress";
import { useStore } from "@/lib/store";
import type { Goal, Metrics, MetricScores, Snapshot } from "@/lib/types";

const METRIC_LABELS: Record<string, string> = {
  savings_rate:          "Savings Rate",
  debt_to_income:        "Debt-to-Income",
  emergency_fund_months: "Emergency Fund",
  housing_ratio:         "Housing Ratio",
};

const METRIC_FORMAT: Record<string, (v: number) => string> = {
  savings_rate:          (v) => `${v}%`,
  debt_to_income:        (v) => `${v}%`,
  emergency_fund_months: (v) => `${v} mo`,
  housing_ratio:         (v) => `${v}%`,
};

const BENCHMARKS: Record<string, { label: string; achieved: (v: number) => boolean }> = {
  savings_rate:          { label: "Target: ≥ 20%",    achieved: (v) => v >= 20 },
  debt_to_income:        { label: "Safe zone: < 20%", achieved: (v) => v <= 20 },
  emergency_fund_months: { label: "Goal: 3–6 months", achieved: (v) => v >= 3 },
  housing_ratio:         { label: "HUD limit: ≤ 30%", achieved: (v) => v <= 30 },
};

export function GoalCard({
  goal,
  currentMetrics,
  metricScores,
  previousSnapshot,
}: {
  goal: Goal;
  currentMetrics: Metrics;
  metricScores: MetricScores;
  previousSnapshot: Snapshot | null;
}) {
  const { setGoal, setGoalDismissed } = useStore();
  const { metric, action, direction } = goal;

  const currentVal = currentMetrics[metric as keyof Metrics] as number;
  const fmt        = METRIC_FORMAT[metric];
  const label      = METRIC_LABELS[metric];
  const benchmark  = BENCHMARKS[metric];
  const achieved   = benchmark.achieved(currentVal);

  // Progress: score 0–25 → 0–100%
  const ms          = metricScores[metric as keyof MetricScores] as { score: number };
  const progressPct = Math.min(100, ((ms?.score || 0) / 25) * 100);

  // Timeline
  let timelineText = "";
  let deadlinePassed = false;
  if (goal.set_month && goal.target_months) {
    const [setYear, setMo] = goal.set_month.split("-").map(Number);
    const now = new Date();
    const elapsed = (now.getFullYear() - setYear) * 12 + (now.getMonth() + 1 - setMo);
    const remaining = goal.target_months - elapsed;
    if (remaining <= 0) {
      deadlinePassed = true;
      timelineText = `⏰ Deadline passed (${goal.target_months}-month goal)`;
    } else {
      timelineText = `${remaining} month${remaining === 1 ? "" : "s"} remaining of ${goal.target_months}`;
    }
  }

  if (achieved) {
    return (
      <div className="card border-l-4 border-green-400 bg-green-50 dark:bg-green-950/30">
        <p className="font-semibold text-green-700 dark:text-green-400">
          ✅ Goal achieved! {label} is now {fmt(currentVal)}.
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Scroll down to set a new goal from this month's story.</p>
      </div>
    );
  }

  return (
    <div className={`card border-l-4 ${deadlinePassed ? "border-orange-400" : "border-[var(--brand)]"}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">🎯 Your goal</div>
      <p className="text-[var(--text)] mb-3">{action}</p>
      <p className="text-sm text-[var(--text-muted)] mb-3">
        Tracking: <strong>{label}</strong> · {benchmark.label}
      </p>

      {timelineText && (
        <p className={`text-sm mb-3 ${deadlinePassed ? "text-orange-500 font-medium" : "text-[var(--text-muted)]"}`}>
          {timelineText}
        </p>
      )}

      <Progress.Root value={progressPct} className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--border)] mb-1">
        <Progress.Indicator
          className="h-full bg-[var(--brand)] transition-all duration-500"
          style={{ transform: `translateX(-${100 - progressPct}%)` }}
        />
      </Progress.Root>
      <p className="text-xs text-[var(--text-muted)] mb-4">{label}: {fmt(currentVal)}</p>

      {/* Delta vs previous snapshot */}
      {previousSnapshot && (() => {
        const prevVal = previousSnapshot.outputs.metrics?.[metric as keyof typeof previousSnapshot.outputs.metrics] as number | undefined;
        if (prevVal === undefined) return null;
        const delta   = Math.round((currentVal - prevVal) * 10) / 10;
        const isGood  = (direction === "up" && delta > 0) || (direction === "down" && delta < 0);
        const sign    = delta > 0 ? "+" : "";
        return (
          <p className={`text-sm mb-4 ${isGood ? "text-green-500" : delta !== 0 ? "text-red-500" : "text-[var(--text-muted)]"}`}>
            vs last snapshot: {fmt(prevVal)} → {fmt(currentVal)}
            {delta !== 0 ? ` (${sign}${fmt(Math.abs(delta))})` : " — no change yet"}
          </p>
        );
      })()}

      <div className="flex gap-2">
        <button type="button" onClick={() => setGoal(null)} className="btn-secondary text-sm">
          Change goal
        </button>
        <button type="button" onClick={() => { setGoal(null); setGoalDismissed(true); }} className="btn-secondary text-sm">
          Cancel tracking
        </button>
      </div>
    </div>
  );
}
