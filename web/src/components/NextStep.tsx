"use client";

import { nextStep } from "@vitals/shared";
import type { Metrics, MetricScores } from "@/lib/types";
import { useStore } from "@/lib/store";

// "Your next step" box under the score. Worked out from the person's own
// numbers by packages/shared/src/nextStep.ts, not written by the AI.
export function NextStep({ metrics, metricScores }: { metrics: Metrics; metricScores: MetricScores }) {
  const { formData } = useStore();

  const breakdownTotal =
    formData.expensesRent + formData.expensesGroceries + formData.expensesTransport +
    formData.expensesSubscriptions + formData.expensesDining + formData.expensesShopping + formData.expensesOther;

  const text = nextStep({
    metrics,
    metricScores,
    income: formData.incomeMain + formData.incomeAdditional,
    monthlySpending: Math.max(breakdownTotal, formData.expensesTotalEstimate),
    savings: formData.savingsTotal,
  });

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
