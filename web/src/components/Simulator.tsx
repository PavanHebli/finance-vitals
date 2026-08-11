"use client";

import { useState, useCallback, useRef } from "react";
import * as Slider from "@radix-ui/react-slider";
import { useStore, toApiFormData } from "@/lib/store";
import { fetchSimulate } from "@/lib/api";
import type { Metrics, MetricScores } from "@/lib/types";
import { MetricCards } from "./MetricCards";

interface SliderConfig {
  key: string;
  label: string;
  field: string;
  min: number;
  step: number;
  getMax: (formData: ReturnType<typeof useStore.getState>["formData"]) => number;
  format: (v: number) => string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: "income", label: "Monthly Income", field: "income_main",
    min: 0, step: 100,
    getMax: (fd) => Math.max((fd.incomeMain + fd.incomeAdditional) * 2, 15000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "rent", label: "Rent / Mortgage", field: "expenses_rent",
    min: 0, step: 50,
    getMax: (fd) => Math.max(fd.expensesRent * 2, 5000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "dining", label: "Dining Out", field: "expenses_dining",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesDining * 3, 2000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "shopping", label: "Shopping", field: "expenses_shopping",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesShopping * 3, 2000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "debt", label: "Monthly Debt Payments", field: "debt_monthly",
    min: 0, step: 50,
    getMax: (fd) => Math.max(fd.debtMonthly * 3, 3000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "savings", label: "Total Savings", field: "savings_total",
    min: 0, step: 500,
    getMax: (fd) => Math.max(fd.savingsTotal * 3, 50000),
    format: (v) => `$${v.toLocaleString()}`,
  },
];

const FORM_TO_SLIDER_KEY: Record<string, keyof ReturnType<typeof useStore.getState>["formData"]> = {
  income_main:      "incomeMain",
  expenses_rent:    "expensesRent",
  expenses_dining:  "expensesDining",
  expenses_shopping:"expensesShopping",
  debt_monthly:     "debtMonthly",
  savings_total:    "savingsTotal",
};

export function Simulator() {
  const { formData, overallScore, metricScores } = useStore();

  // Slider values — initialised from current form data
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      SLIDERS.map((s) => [s.key, (formData[FORM_TO_SLIDER_KEY[s.field]] as number) || 0])
    )
  );

  const [simScore, setSimScore]               = useState<number | null>(null);
  const [simMetrics, setSimMetrics]           = useState<Metrics | null>(null);
  const [simMetricScores, setSimMetricScores] = useState<MetricScores | null>(null);
  const [loading, setLoading]                 = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSimulate = useCallback(
    async (newValues: Record<string, number>) => {
      const overrides: Record<string, number | null> = {};
      SLIDERS.forEach((s) => {
        overrides[s.field] = newValues[s.key];
      });

      setLoading(true);
      try {
        const result = await fetchSimulate(toApiFormData(formData), overrides);
        setSimScore(result.sim_score);
        setSimMetrics(result.sim_metrics);
        setSimMetricScores(result.sim_metric_scores);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [formData]
  );

  function handleSliderChange(key: string, value: number) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSimulate(next), 400);
  }

  function handleReset() {
    const reset = Object.fromEntries(
      SLIDERS.map((s) => [s.key, (formData[FORM_TO_SLIDER_KEY[s.field]] as number) || 0])
    );
    setValues(reset);
    setSimScore(null);
    setSimMetrics(null);
    setSimMetricScores(null);
  }

  const displayScore    = simScore ?? overallScore ?? 0;
  const scoreDelta      = simScore !== null && overallScore !== null ? simScore - overallScore : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--text)]">What If?</h2>
          <p className="text-sm text-[var(--text-muted)]">Drag the sliders to see how changes affect your score.</p>
        </div>
        <button type="button" onClick={handleReset} className="btn-secondary text-sm">
          Reset
        </button>
      </div>

      {/* Score readout */}
      <div className="card flex items-center gap-6">
        <div className="text-5xl font-bold text-[var(--text)]">{displayScore}</div>
        <div>
          <div className="text-sm text-[var(--text-muted)]">
            {simScore !== null ? "Simulated score" : "Current score"}
          </div>
          {scoreDelta !== null && (
            <div className={`text-lg font-semibold ${scoreDelta > 0 ? "text-green-500" : scoreDelta < 0 ? "text-red-500" : "text-[var(--text-muted)]"}`}>
              {scoreDelta > 0 ? "+" : ""}{scoreDelta} vs current
            </div>
          )}
          {loading && <div className="text-xs text-[var(--text-muted)] animate-pulse">Calculating…</div>}
        </div>
      </div>

      {/* Sliders */}
      <div className="card space-y-6">
        {SLIDERS.map((s) => {
          const max   = s.getMax(formData);
          const value = values[s.key] ?? 0;
          return (
            <div key={s.key}>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text)]">{s.label}</label>
                <span className="text-sm font-mono text-[var(--brand)]">{s.format(value)}</span>
              </div>
              <Slider.Root
                min={s.min}
                max={max}
                step={s.step}
                value={[value]}
                onValueChange={([v]) => handleSliderChange(s.key, v)}
                className="relative flex items-center w-full h-5 select-none touch-none"
              >
                <Slider.Track className="relative grow h-1.5 rounded-full bg-[var(--border)]">
                  <Slider.Range className="absolute h-full rounded-full bg-[var(--brand)]" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-[var(--brand)] rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1" />
              </Slider.Root>
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>{s.format(s.min)}</span>
                <span>{s.format(max)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulated metric cards */}
      {simMetrics && simMetricScores && (
        <div>
          <div className="text-sm font-medium text-[var(--text-muted)] mb-3">Simulated metrics</div>
          <MetricCards metrics={simMetrics} metricScores={simMetricScores} />
        </div>
      )}
    </div>
  );
}
