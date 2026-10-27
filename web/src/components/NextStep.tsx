"use client";

import { nextStep } from "@vitals/shared";
import type { FormData, Metrics, MetricScores } from "@/lib/types";
import { useStore } from "@/lib/store";

// The next step as text. Used by the box below and passed to the AI story, so
// the two always give the same advice.
export function buildNextStep(formData: FormData, metrics: Metrics, metricScores: MetricScores): string {
  const breakdownTotal =
    formData.expensesRent + formData.expensesGroceries + formData.expensesTransport +
    formData.expensesSubscriptions + formData.expensesDining + formData.expensesShopping + formData.expensesOther;

  return nextStep({
    metrics,
    metricScores,
    income: formData.incomeMain + formData.incomeAdditional,
    monthlySpending: Math.max(breakdownTotal, formData.expensesTotalEstimate),
    savings: formData.savingsTotal,
  });
}

// "Your next step" box under the score. Worked out from the person's own
// numbers by packages/shared/src/nextStep.ts, not written by the AI.
export function NextStep({ metrics, metricScores }: { metrics: Metrics; metricScores: MetricScores }) {
  const { formData } = useStore();

  const text = buildNextStep(formData, metrics, metricScores);

  return (
    <div
      className="rounded-xl p-4 text-sm text-[var(--text)] leading-relaxed"
      style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}
    >
      <span className="font-semibold">Your next step: </span>
      {text}
    </div>
  );
}
