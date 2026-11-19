import { fetchScore, scoreFormData, streamNarrative, toApiFormData, todayInTimezone } from "@vitals/shared";
import type { BudgetCard, DistributionLogEntry, FinancialProfile, PaySchedule } from "@vitals/shared";
import { useStore } from "@/lib/store";

// The numbers to score, in monthly amounts: from the payday plan when there
// is one (converted from per paycheck), otherwise from the old budget cards.
export function currentScoreForm(
  cards: BudgetCard[],
  log: DistributionLogEntry[],
  profile: FinancialProfile,
  schedule: PaySchedule | null
): Record<string, unknown> {
  const today = schedule ? todayInTimezone(schedule.payTimezone) : "";
  return scoreFormData(cards, log, profile, schedule, today);
}

// Sends numbers to the backend, stores the score, then starts the AI
// narrative streaming in the background. Throws if the score call fails, so
// the screen can show the real error instead of staying silent.
async function runScore(form: Record<string, unknown>) {
  const store = useStore.getState();
  store.setNarrativeText("");

  const result = await fetchScore(form);
  store.setResults(result.metrics, result.metric_scores, result.overall_score, result.mirror);

  store.setNarrativeLoading(true);
  streamNarrative(
    {
      form_data: form,
      metrics: result.metrics,
      metric_scores: result.metric_scores,
      overall_score: result.overall_score,
      mirror: result.mirror,
      provider: "",
      api_key: "",
    },
    (chunk) => useStore.getState().appendNarrative(chunk)
  )
    .catch(() => {})
    .finally(() => useStore.getState().setNarrativeLoading(false));

  return { form, result };
}

// Score from the budget cards and financial profile (Budget tab).
export async function calculateFromBudget() {
  const { budgetCards, distributionLog, financialProfile, paySchedule } = useStore.getState();
  await runScore(currentScoreForm(budgetCards, distributionLog, financialProfile, paySchedule));
}

// Score from the "Check your score" form. Also saves a check-in for Progress.
export async function calculateFromForm() {
  const { formData } = useStore.getState();
  const { form, result } = await runScore(toApiFormData(formData));
  const month = new Date().toISOString().slice(0, 7);
  useStore.getState().addSnapshot({
    saved_at: month,
    version: "1",
    inputs: form,
    outputs: {
      overall_score: result.overall_score,
      mirror_label: result.mirror.label,
      metrics: result.metrics,
      metric_scores: result.metric_scores,
      narrative: "",
      goal: null,
    },
  });
}

// What a What-if slider changes. Debt payments of $0 while still owing money
// would hit the "you forgot to enter payments" rule and score 0 for debt, so
// on the slider $0 means "debt paid off".
export function sliderChange(field: string, value: number): Record<string, number> {
  if (field === "debt_monthly" && value === 0) return { debt_monthly: 0, debt_total: 0 };
  return { [field]: value };
}
