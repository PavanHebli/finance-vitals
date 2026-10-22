import type { BudgetCard, Metrics } from "@vitals/shared";
import type { MetricName } from "@/lib/completeness";

// What each card would receive if Split were pressed right now. Used for the
// "Next split: +$X" lines. Same rules as the Split button itself.
export function previewSplit(cards: BudgetCard[]): Map<string, number> {
  const preview = new Map<string, number>();
  const income = cards.find((c) => c.type === "income")?.balance ?? 0;
  if (income <= 0) return preview;

  const active = cards.filter((c) => c.type === "custom" && !c.paused);
  const totalFixed = active.filter((c) => c.allocationMode === "fixed").reduce((sum, c) => sum + c.allocationValue, 0);
  const remaining = income - totalFixed;
  const totalPercent = active.filter((c) => c.allocationMode === "percent").reduce((sum, c) => sum + c.allocationValue, 0);
  if (totalFixed > income || totalPercent > 100) return preview;

  for (const card of active) {
    preview.set(card.id, card.allocationMode === "fixed" ? card.allocationValue : (remaining * card.allocationValue) / 100);
  }
  const cash = cards.find((c) => c.type === "cash");
  if (cash) preview.set(cash.id, remaining * (1 - totalPercent / 100));
  return preview;
}

// The real value of one metric, in words, e.g. "18% of income saved".
export function describeMetric(name: MetricName, metrics: Metrics): string {
  switch (name) {
    case "savingsRate":
      return `${metrics.savings_rate}% of income saved`;
    case "debtToIncome":
      return `${metrics.debt_to_income}% of income goes to debt`;
    case "emergencyFund":
      return `${metrics.emergency_fund_months} months of expenses covered`;
    case "housingRatio":
      return `${metrics.housing_ratio}% of income goes to housing`;
  }
}

// Color for a metric's status word from the score API.
export function statusColor(status: string): string {
  if (status === "good") return "#00a043";
  if (status === "ok") return "#3b82f6";
  if (status === "warning") return "#dc6e00";
  return "#dc3535";
}

export function statusWord(status: string): string {
  if (status === "good") return "Healthy";
  if (status === "ok") return "OK";
  if (status === "warning") return "Needs attention";
  return "Danger";
}

// Colors for the score label ("Good", "Fair", ...).
export function labelColor(label: string | null): string {
  if (label === "Healthy") return "#00a043";
  if (label === "Good") return "#3b82f6";
  if (label === "Fair") return "#dc6e00";
  return "#dc3535";
}
