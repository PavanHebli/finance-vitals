"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { MetricKey, MetricGoal, SavingsGoal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { GoalCard } from "./GoalCard";

// ── Metric goal presets ───────────────────────────────────────────────────────

const METRIC_PRESETS: {
  metric: MetricKey;
  label: string;
  description: string;
  target: number;
  direction: "up" | "down";
  format: (v: number) => string;
}[] = [
  {
    metric: "emergency_fund_months",
    label: "Build an emergency fund",
    description: "Reach 3 months of expenses saved",
    target: 3,
    direction: "up",
    format: (v) => `${v} mo`,
  },
  {
    metric: "savings_rate",
    label: "Grow my savings rate",
    description: "Save at least 20% of income each month",
    target: 20,
    direction: "up",
    format: (v) => `${v}%`,
  },
  {
    metric: "debt_to_income",
    label: "Pay down debt",
    description: "Bring debt payments below 20% of income",
    target: 20,
    direction: "down",
    format: (v) => `${v}%`,
  },
  {
    metric: "housing_ratio",
    label: "Keep housing costs healthy",
    description: "Keep rent/mortgage below 30% of income",
    target: 30,
    direction: "down",
    format: (v) => `${v}%`,
  },
];

// ── Goal picker ───────────────────────────────────────────────────────────────

function GoalPicker({ onClose }: { onClose: () => void }) {
  const { metrics, goals, addGoal } = useStore();
  const [mode, setMode] = useState<"metric" | "savings">("metric");

  // Savings form state
  const [name, setName]               = useState("");
  const [targetAmount, setTargetAmt]  = useState("");
  const [monthlySaving, setMonthly]   = useState("");
  const [targetDate, setTargetDate]   = useState("");

  const trackedMetrics = new Set(
    goals.filter((g) => g.type === "metric").map((g) => (g as MetricGoal).metric)
  );

  function addMetricGoal(preset: typeof METRIC_PRESETS[number]) {
    const baseline = (metrics?.[preset.metric] as number | undefined) ?? 0;
    const already  = goals.some((g) => g.type === "metric" && (g as MetricGoal).metric === preset.metric);
    if (already) return;
    const goal: MetricGoal = {
      type: "metric",
      id: `${preset.metric}-${Date.now()}`,
      metric: preset.metric,
      label: preset.label,
      target: preset.target,
      direction: preset.direction,
      baseline,
      set_month: new Date().toISOString().slice(0, 7),
    };
    addGoal(goal);
    onClose();
  }

  function addSavingsGoal() {
    if (!name.trim() || !targetAmount) return;
    const goal: SavingsGoal = {
      type: "savings",
      id: `savings-${Date.now()}`,
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      saved_so_far: 0,
      monthly_contribution: parseFloat(monthlySaving) || 0,
      target_date: targetDate || undefined,
      set_month: new Date().toISOString().slice(0, 7),
    };
    addGoal(goal);
    onClose();
  }

  return (
    <div className="card border border-[var(--brand)]/30 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text)]">Add a goal</span>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-2)] text-[var(--text-muted)]">
          <X size={15} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["metric", "savings"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[var(--brand)] text-white"
                : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-2)]"
            }`}
          >
            {m === "metric" ? "Improve a metric" : "Save for something"}
          </button>
        ))}
      </div>

      {/* Metric presets */}
      {mode === "metric" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {METRIC_PRESETS.map((p) => {
            const current  = (metrics?.[p.metric] as number | undefined) ?? null;
            const tracking = trackedMetrics.has(p.metric);
            const achieved = current !== null && (
              p.direction === "up" ? current >= p.target : current <= p.target
            );

            return (
              <button
                key={p.metric}
                type="button"
                disabled={tracking || achieved === true}
                onClick={() => addMetricGoal(p)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  tracking || achieved
                    ? "border-[var(--border)] opacity-40 cursor-not-allowed"
                    : "border-[var(--border)] hover:border-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]"
                }`}
              >
                <div className="text-sm font-medium text-[var(--text)] mb-0.5">{p.label}</div>
                <div className="text-xs text-[var(--text-muted)]">{p.description}</div>
                {current !== null && (
                  <div className="text-xs text-[var(--brand)] mt-1 font-medium">
                    {tracking ? "Already tracking" : achieved ? "Already achieved" : `Now: ${p.format(current)} → ${p.format(p.target)}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Savings form */}
      {mode === "savings" && (
        <div className="space-y-3">
          <div>
            <label className="label">What are you saving for?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Car, Vacation, Wedding"
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={targetAmount}
                  onChange={(e) => setTargetAmt(e.target.value)}
                  placeholder="15,000"
                  className="input pl-7"
                />
              </div>
            </div>
            <div>
              <label className="label">Monthly savings</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={monthlySaving}
                  onChange={(e) => setMonthly(e.target.value)}
                  placeholder="300"
                  className="input pl-7"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Target date <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
            <input
              type="month"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input"
            />
          </div>
          <button
            type="button"
            onClick={addSavingsGoal}
            disabled={!name.trim() || !targetAmount}
            className="btn-primary w-full py-2 text-sm disabled:opacity-40"
          >
            Set this goal
          </button>
        </div>
      )}
    </div>
  );
}

// ── GoalSection — public component ────────────────────────────────────────────

export function GoalSection() {
  const { goals } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="my-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Your goals
          {goals.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{goals.length} active</span>
          )}
        </h2>
        {!pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            <Plus size={13} />
            Add goal
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="mb-4">
          <GoalPicker onClose={() => setPickerOpen(false)} />
        </div>
      )}

      {goals.length === 0 && !pickerOpen && (
        <p className="text-sm text-[var(--text-muted)]">
          No goals yet.{" "}
          <button type="button" onClick={() => setPickerOpen(true)} className="text-[var(--brand)] hover:underline">
            Add your first goal
          </button>
          {" "}and track it every time you check in.
        </p>
      )}

      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
