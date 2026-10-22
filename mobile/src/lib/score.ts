import { budgetToFormData, fetchScore, streamNarrative, toApiFormData } from "@vitals/shared";
import { useStore } from "@/lib/store";

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
  const { budgetCards, distributionLog, financialProfile } = useStore.getState();
  await runScore(budgetToFormData(budgetCards, distributionLog, financialProfile));
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
