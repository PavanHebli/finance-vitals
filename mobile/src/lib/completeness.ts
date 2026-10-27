import type { BudgetCard, DistributionLogEntry, FinancialProfile, MetricScores } from "@vitals/shared";

// Which of the four metrics have enough information to be shown, and the
// partial score built from only those. Ported from the web budget page, so
// keep the two in step if the rules change.

const HOUSING_PATTERNS = [/rent/i, /mortgage/i, /housing/i, /home\s*loan/i, /hoa/i];

export type MetricName = "savingsRate" | "debtToIncome" | "emergencyFund" | "housingRatio";

export interface MetricStatus {
  complete: boolean;
  hint: string | null;
}

export type Completeness = Record<MetricName, MetricStatus>;

export const METRIC_LABELS: Record<MetricName, string> = {
  savingsRate: "Savings",
  debtToIncome: "Debt",
  emergencyFund: "Emergency",
  housingRatio: "Housing",
};

// Each pill is tied to one key in the score API's metric results.
export const METRIC_KEYS: Record<MetricName, keyof MetricScores> = {
  savingsRate: "savings_rate",
  debtToIncome: "debt_to_income",
  emergencyFund: "emergency_fund_months",
  housingRatio: "housing_ratio",
};

export const METRIC_ORDER: MetricName[] = ["savingsRate", "debtToIncome", "housingRatio", "emergencyFund"];

export function monthlyIncome(cards: BudgetCard[], log: DistributionLogEntry[]): number {
  return log[0]?.incomeAmount ?? cards.find((c) => c.type === "income")?.balance ?? 0;
}

export function findHousingCard(cards: BudgetCard[]): BudgetCard | undefined {
  return cards.find(
    (c) =>
      c.type === "custom" &&
      (c.purpose ?? "expense") === "expense" &&
      HOUSING_PATTERNS.some((p) => p.test(c.label + " " + (c.description ?? "")))
  );
}

export function checkCompleteness(
  cards: BudgetCard[],
  log: DistributionLogEntry[],
  profile: FinancialProfile
): Completeness {
  const hasIncome = monthlyIncome(cards, log) > 0;
  const custom = cards.filter((c) => c.type === "custom");
  const expenseCards = custom.filter((c) => (c.purpose ?? "expense") === "expense");
  const savingCards = custom.filter((c) => c.purpose === "saving");

  const hasSavings = savingCards.length > 0 || (profile.profileComplete && profile.savingsTotal > 0);
  // A card always counts as an answer. The profile's manual rent/expenses
  // fields only count when no card exists. undefined means "never answered",
  // while 0 is a real answer.
  const hasHousing = findHousingCard(cards) !== undefined || (profile.profileComplete && profile.housingMonthly !== undefined);
  const hasExpenses = expenseCards.length > 0 || (profile.profileComplete && profile.expensesMonthly !== undefined);

  return {
    savingsRate: {
      complete: hasIncome && hasSavings,
      hint: !hasSavings ? "Add a savings card, or enter your total savings in the profile." : null,
    },
    debtToIncome: {
      complete: hasIncome && profile.profileComplete,
      hint: !profile.profileComplete ? "Complete your financial profile to include debt payments." : null,
    },
    emergencyFund: {
      complete: profile.profileComplete && hasExpenses,
      hint: !profile.profileComplete
        ? "Complete your financial profile to include total savings."
        : !hasExpenses
        ? "Add expense cards, or enter your monthly expenses in the profile."
        : null,
    },
    housingRatio: {
      complete: hasIncome && hasHousing,
      hint: !hasHousing ? "Add a Rent or Mortgage card, or enter it in the profile." : null,
    },
  };
}

// Where each metric's input came from. Shown when a pill is opened so a
// confident number is never just a bare digit.
export function metricSources(cards: BudgetCard[], profile: FinancialProfile): Record<MetricName, string> {
  const custom = cards.filter((c) => c.type === "custom");
  const expenseCards = custom.filter((c) => (c.purpose ?? "expense") === "expense");
  const savingCards = custom.filter((c) => c.purpose === "saving");
  const housingCard = findHousingCard(cards);

  return {
    savingsRate:
      savingCards.length > 0
        ? `${savingCards.length} saving card${savingCards.length > 1 ? "s" : ""}`
        : profile.profileComplete
        ? "Your profile's total savings"
        : "Not answered yet",
    debtToIncome: profile.profileComplete ? "Your profile's debt fields" : "Not answered yet",
    emergencyFund:
      expenseCards.length > 0
        ? `${expenseCards.length} expense card${expenseCards.length > 1 ? "s" : ""}`
        : profile.expensesMonthly !== undefined
        ? "Your profile's monthly expenses"
        : "Not answered yet",
    housingRatio: housingCard
      ? `Your "${housingCard.label}" card`
      : profile.housingMonthly !== undefined
      ? "Your profile's monthly rent or mortgage"
      : "Not answered yet",
  };
}

// Each metric scores 0 to 25. Adding only the answered ones and scaling to a
// 0 to 100 basis keeps the partial score on the same scale as the full one.
export function partialScore(scores: MetricScores, completeness: Completeness): { score: number; count: number } {
  const answered = METRIC_ORDER.filter((name) => completeness[name].complete);
  if (answered.length === 0) return { score: 0, count: 0 };
  let sum = 0;
  for (const name of answered) {
    const entry = scores[METRIC_KEYS[name]];
    if ("score" in entry) sum += entry.score;
  }
  let score = Math.round((sum / (answered.length * 25)) * 100);
  // Same rule as the full score: under 1 month saved caps the score at 50.
  const emergency = scores.emergency_fund_months;
  if (completeness.emergencyFund.complete && "score" in emergency && emergency.score === 0) {
    score = Math.min(score, 50);
  }
  return { score, count: answered.length };
}
