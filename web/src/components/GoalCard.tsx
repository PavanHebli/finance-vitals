"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import type { MetricGoal, SavingsGoal, UserGoal, Snapshot, MetricKey } from "@/lib/types";
import { useStore } from "@/lib/store";

// ── Shared helpers ────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

function monthsToTarget(
  snapshots: Snapshot[],
  metric: MetricKey,
  current: number,
  target: number,
  direction: "up" | "down",
): number | null {
  const sorted = [...snapshots].sort((a, b) => a.saved_at.localeCompare(b.saved_at));
  if (sorted.length < 2) return null;
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].outputs.metrics?.[metric] as number | undefined;
    const curr = sorted[i].outputs.metrics?.[metric] as number | undefined;
    if (prev !== undefined && curr !== undefined) deltas.push(curr - prev);
  }
  if (!deltas.length) return null;
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const monthlyProgress = direction === "up" ? avg : -avg;
  if (monthlyProgress <= 0) return null;
  const remaining = direction === "up" ? target - current : current - target;
  return remaining <= 0 ? 0 : Math.ceil(remaining / monthlyProgress);
}

// ── Metric goal card ──────────────────────────────────────────────────────────

const METRIC_CONFIG: Record<MetricKey, { label: string; format: (v: number) => string; color: string }> = {
  savings_rate:          { label: "Savings rate",    format: (v) => `${v}%`,   color: "#4f6ef7" },
  debt_to_income:        { label: "Debt-to-income",  format: (v) => `${v}%`,   color: "#dc3535" },
  emergency_fund_months: { label: "Emergency fund",  format: (v) => `${v} mo`, color: "#22c55e" },
  housing_ratio:         { label: "Housing ratio",   format: (v) => `${v}%`,   color: "#f59e0b" },
};

function MetricGoalCard({ goal, currentValue, snapshots, onRemove }: {
  goal: MetricGoal;
  currentValue: number;
  snapshots: Snapshot[];
  onRemove: () => void;
}) {
  const cfg      = METRIC_CONFIG[goal.metric];
  const achieved = goal.direction === "up"
    ? currentValue >= goal.target
    : currentValue <= goal.target;

  const pct = achieved ? 100 : goal.direction === "up"
    ? Math.min(100, (currentValue / goal.target) * 100)
    : Math.min(100, ((goal.baseline - currentValue) / (goal.baseline - goal.target)) * 100);

  const pace  = monthsToTarget(snapshots, goal.metric, currentValue, goal.target, goal.direction);
  const going = goal.direction === "up"
    ? currentValue > goal.baseline
    : currentValue < goal.baseline;

  return (
    <div className={`card border-t-2 relative ${achieved ? "border-green-400" : "border-[var(--brand)]"}`}>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
        aria-label="Remove goal"
      >
        <X size={13} />
      </button>

      <div className="flex items-center gap-1.5 mb-1 pr-6">
        {going ? <TrendingUp size={13} className="text-green-500" /> : <TrendingDown size={13} className="text-[var(--text-muted)]" />}
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {cfg.label}
        </span>
      </div>

      <p className="text-sm font-medium text-[var(--text)] mb-3">{goal.label}</p>

      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xl font-bold tabular-nums" style={{ color: cfg.color }}>
          {cfg.format(currentValue)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          target {cfg.format(goal.target)}
        </span>
      </div>

      <ProgressBar pct={pct} color={achieved ? "#22c55e" : cfg.color} />

      <p className="text-xs text-[var(--text-muted)] mt-2">
        {achieved
          ? "✓ Goal reached"
          : pace !== null
            ? `~${pace} month${pace === 1 ? "" : "s"} at your current pace`
            : "Check back next month to see your pace"}
      </p>
    </div>
  );
}

// ── Savings goal card ─────────────────────────────────────────────────────────

function SavingsGoalCard({ goal, onRemove, onUpdateSaved }: {
  goal: SavingsGoal;
  onRemove: () => void;
  onUpdateSaved: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(goal.saved_so_far.toString());

  const pct       = Math.min(100, (goal.saved_so_far / goal.target_amount) * 100);
  const remaining = Math.max(0, goal.target_amount - goal.saved_so_far);
  const achieved  = goal.saved_so_far >= goal.target_amount;

  // Months remaining to target date
  let targetMonthsLeft: number | null = null;
  if (goal.target_date) {
    const [ty, tm] = goal.target_date.split("-").map(Number);
    const now = new Date();
    targetMonthsLeft = Math.max(0, (ty - now.getFullYear()) * 12 + (tm - now.getMonth() - 1));
  }

  const monthsToGoal = goal.monthly_contribution > 0
    ? Math.ceil(remaining / goal.monthly_contribution)
    : null;

  const onTrack = targetMonthsLeft !== null && monthsToGoal !== null
    ? monthsToGoal <= targetMonthsLeft
    : null;

  function commitEdit() {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) onUpdateSaved(val);
    setEditing(false);
  }

  return (
    <div className={`card border-t-2 relative ${achieved ? "border-green-400" : "border-[var(--brand)]"}`}>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
        aria-label="Remove goal"
      >
        <X size={13} />
      </button>

      <div className="flex items-center gap-1.5 mb-1 pr-6">
        <PiggyBank size={13} className="text-[var(--brand)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Savings goal
        </span>
      </div>

      <p className="text-sm font-medium text-[var(--text)] mb-3">{goal.name}</p>

      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xl font-bold tabular-nums text-[var(--text)]">
          ${goal.saved_so_far.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          of ${goal.target_amount.toLocaleString()}
        </span>
      </div>

      <ProgressBar pct={pct} color={achieved ? "#22c55e" : "#4f6ef7"} />

      <p className="text-xs text-[var(--text-muted)] mt-2 mb-3">
        {achieved
          ? "✓ Goal reached"
          : monthsToGoal !== null
            ? onTrack !== null
              ? onTrack
                ? `On track · ${monthsToGoal} month${monthsToGoal === 1 ? "" : "s"} to goal`
                : `Behind · need $${Math.ceil(remaining / (targetMonthsLeft || 1)).toLocaleString()}/mo to hit target`
              : `${monthsToGoal} month${monthsToGoal === 1 ? "" : "s"} at $${goal.monthly_contribution.toLocaleString()}/mo`
            : `$${goal.monthly_contribution.toLocaleString()}/mo`}
      </p>

      {/* Update saved amount */}
      {!achieved && (
        editing ? (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-[var(--text-muted)]">$</span>
            <input
              type="number"
              min={0}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="input py-1 text-sm w-28"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            />
            <button type="button" onClick={commitEdit} className="btn-primary py-1 px-3 text-sm">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary py-1 px-3 text-sm">Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(goal.saved_so_far.toString()); setEditing(true); }}
            className="text-xs text-[var(--brand)] hover:underline"
          >
            Update saved amount
          </button>
        )
      )}
    </div>
  );
}

// ── Public export — renders the right card variant ────────────────────────────

export function GoalCard({ goal }: { goal: UserGoal }) {
  const { metrics, snapshots, removeGoal, updateSavingsProgress } = useStore();

  if (goal.type === "metric") {
    const currentValue = (metrics?.[goal.metric] as number | undefined) ?? goal.baseline;
    return (
      <MetricGoalCard
        goal={goal}
        currentValue={currentValue}
        snapshots={snapshots}
        onRemove={() => removeGoal(goal.id)}
      />
    );
  }

  return (
    <SavingsGoalCard
      goal={goal}
      onRemove={() => removeGoal(goal.id)}
      onUpdateSaved={(v) => updateSavingsProgress(goal.id, v)}
    />
  );
}
