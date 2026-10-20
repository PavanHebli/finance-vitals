import type { BudgetCard, UserGoal, MetricKey, DistributionLogEntry, FinancialProfile, FormData } from "./types";

// ── Supabase row mapping ────────────────────────────────────────────────────
// Converts between the store's camelCase shapes and the DB's snake_case
// columns (see supabase/migrations/0001_core_schema.sql). Exported so
// AccountHydrator can reuse the same mapping when reading rows back in.

interface BudgetCardRow {
  id: string;
  label: string;
  type: "income" | "cash" | "custom";
  allocation_mode: "percent" | "fixed" | "remainder";
  allocation_value: number;
  balance: number;
  paused: boolean;
  color: string;
  purpose: "expense" | "saving" | null;
  description: string | null;
  goal_amount: number | null;
  saved_so_far: number | null;
  created_at: string;
}

export function budgetCardToRow(card: BudgetCard, userId: string, sortOrder: number): Record<string, unknown> {
  return {
    id: card.id,
    user_id: userId,
    label: card.label,
    type: card.type,
    allocation_mode: card.allocationMode,
    allocation_value: card.allocationValue,
    balance: card.balance,
    paused: card.paused,
    color: card.color,
    purpose: card.purpose ?? null,
    description: card.description ?? null,
    goal_amount: card.goalAmount ?? null,
    saved_so_far: card.savedSoFar ?? null,
    sort_order: sortOrder,
  };
}

export function rowToBudgetCard(row: BudgetCardRow): BudgetCard {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    allocationMode: row.allocation_mode,
    allocationValue: row.allocation_value,
    balance: row.balance,
    paused: row.paused,
    color: row.color,
    createdAt: row.created_at,
    purpose: row.purpose ?? undefined,
    description: row.description ?? undefined,
    goalAmount: row.goal_amount ?? undefined,
    savedSoFar: row.saved_so_far ?? undefined,
  };
}

interface GoalRow {
  id: string;
  type: "metric" | "savings";
  metric: string | null;
  label: string | null;
  target: number | null;
  direction: "up" | "down" | null;
  baseline: number | null;
  name: string | null;
  target_amount: number | null;
  saved_so_far: number | null;
  monthly_contribution: number | null;
  target_date: string | null;
  set_month: string | null;
}

export function goalToRow(goal: UserGoal, userId: string): Record<string, unknown> {
  const base = { id: goal.id, user_id: userId, type: goal.type, set_month: goal.set_month };
  if (goal.type === "metric") {
    return {
      ...base,
      metric: goal.metric,
      label: goal.label,
      target: goal.target,
      direction: goal.direction,
      baseline: goal.baseline,
    };
  }
  return {
    ...base,
    name: goal.name,
    target_amount: goal.target_amount,
    saved_so_far: goal.saved_so_far,
    monthly_contribution: goal.monthly_contribution,
    target_date: goal.target_date ?? null,
  };
}

export function rowToGoal(row: GoalRow): UserGoal {
  if (row.type === "metric") {
    return {
      type: "metric",
      id: row.id,
      metric: (row.metric ?? "savings_rate") as MetricKey,
      label: row.label ?? "",
      target: row.target ?? 0,
      direction: row.direction ?? "up",
      baseline: row.baseline ?? 0,
      set_month: row.set_month ?? "",
    };
  }
  return {
    type: "savings",
    id: row.id,
    name: row.name ?? "",
    target_amount: row.target_amount ?? 0,
    saved_so_far: row.saved_so_far ?? 0,
    monthly_contribution: row.monthly_contribution ?? 0,
    target_date: row.target_date ?? undefined,
    set_month: row.set_month ?? "",
  };
}

interface DistributionLogRow {
  id: string;
  income_amount: number;
  allocations: DistributionLogEntry["allocations"];
  timestamp: string;
}

export function rowToDistributionEntry(row: DistributionLogRow): DistributionLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    incomeAmount: row.income_amount,
    allocations: row.allocations,
  };
}

/** Serialises the budget planner state into a string for chat context injection */
export function formatBudgetContext(budgetCards: BudgetCard[], distributionLog: DistributionLogEntry[]): string {
  const customCards = budgetCards.filter(c => c.type === "custom");
  if (customCards.length === 0 && distributionLog.length === 0) return "";

  const lines: string[] = ["BUDGET PLANNER (user-configured envelopes):"];

  const incomeCard = budgetCards.find(c => c.type === "income");
  if (incomeCard && incomeCard.balance > 0)
    lines.push(`- Income available to distribute: $${incomeCard.balance.toFixed(0)}`);

  for (const card of customCards) {
    const alloc = card.allocationMode === "percent"
      ? `${card.allocationValue}% of income`
      : `$${card.allocationValue.toFixed(0)} fixed`;
    const paused = card.paused ? " (paused)" : "";
    lines.push(`- ${card.label}: ${alloc} — $${card.balance.toFixed(0)} accumulated${paused}`);
  }

  const cashCard = budgetCards.find(c => c.type === "cash");
  if (cashCard)
    lines.push(`- Cash in Hand (unallocated remainder): $${cashCard.balance.toFixed(0)} accumulated`);

  if (distributionLog.length > 0) {
    const total = distributionLog.reduce((sum, e) => sum + e.incomeAmount, 0);
    lines.push(`\nDistributions made: ${distributionLog.length} | Total distributed: $${total.toFixed(0)}`);
    const latest = distributionLog[0];
    lines.push(`Most recent: $${latest.incomeAmount.toFixed(0)} on ${new Date(latest.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
  }

  return lines.join("\n");
}

/**
 * Maps budget planner state + financial profile to the snake_case dict the score API expects.
 * Uses the last distribution's amounts when available (most accurate monthly figures).
 * Pattern-matches card labels to expense categories; unmatched cards go into expenses_other.
 */
export function budgetToFormData(
  budgetCards: BudgetCard[],
  distributionLog: DistributionLogEntry[],
  profile: FinancialProfile
): Record<string, unknown> {
  const incomeCard  = budgetCards.find(c => c.type === "income")!;
  const customCards = budgetCards.filter(c => c.type === "custom" && !c.paused);

  // Use last split amount as monthly income proxy; fall back to pending balance
  const income = distributionLog.length > 0
    ? distributionLog[0].incomeAmount
    : incomeCard.balance;

  // Use actual split amounts when available — more accurate than formula
  const lastAlloc = distributionLog.length > 0
    ? new Map(distributionLog[0].allocations.map(a => [a.cardId, a.amount]))
    : null;

  function cardAmount(card: BudgetCard): number {
    if (lastAlloc) return lastAlloc.get(card.id) ?? 0;
    if (card.allocationMode === "fixed")   return card.allocationValue;
    if (card.allocationMode === "percent") return (card.allocationValue / 100) * income;
    return 0;
  }

  // Split by user-confirmed purpose — saving cards never pollute expense ratios
  const expenseCards = customCards.filter(c => (c.purpose ?? "expense") === "expense");
  const savingCards  = customCards.filter(c => c.purpose === "saving");

  // Within expense cards, pattern-match for specific buckets
  const housing   = expenseCards.find(c => /rent|hous|mortg/i.test(c.label));
  const transport = expenseCards.find(c => /transport|commut|fuel|petrol|gas/i.test(c.label));
  const groceries = expenseCards.find(c => /grocer|food|supermark/i.test(c.label));
  const dining    = expenseCards.find(c => /din|restaur|eat.?out|takeout/i.test(c.label));
  const subs      = expenseCards.find(c => /subscri|netflix|spotify|stream/i.test(c.label));

  const classifiedExpenseIds = new Set(
    [housing, transport, groceries, dining, subs]
      .filter((c): c is BudgetCard => Boolean(c))
      .map(c => c.id)
  );
  const unclassifiedCardTotal = expenseCards
    .filter(c => !classifiedExpenseIds.has(c.id))
    .reduce((sum, c) => sum + cardAmount(c), 0);

  // A card always wins when one exists; the Financial Profile's manual
  // housingMonthly/expensesMonthly are only a fallback for whatever isn't
  // represented by a card yet, so a real card never gets silently
  // overridden by a stale manually-entered number.
  const rentAmount       = housing ? cardAmount(housing) : (profile.housingMonthly ?? 0);
  const groceriesAmount  = groceries ? cardAmount(groceries) : 0;
  const transportAmount  = transport ? cardAmount(transport) : 0;
  const diningAmount     = dining    ? cardAmount(dining)    : 0;
  const subsAmount       = subs      ? cardAmount(subs)      : 0;
  // The manual "monthly expenses" fallback only applies when there are no
  // expense cards at all — once even one exists, we trust the cards.
  const otherAmount = unclassifiedCardTotal + (expenseCards.length === 0 ? (profile.expensesMonthly ?? 0) : 0);

  const expensesTotal = rentAmount + groceriesAmount + transportAmount + diningAmount + subsAmount + otherAmount;

  // Monthly savings contributions from saving cards (informs savings rate)
  const monthlySavingsContribution = savingCards.reduce((sum, c) => sum + cardAmount(c), 0);

  return {
    income_main:             income,
    income_additional:       0,
    expenses_rent:           rentAmount,
    expenses_groceries:      groceriesAmount,
    expenses_transport:      transportAmount,
    expenses_subscriptions:  subsAmount,
    expenses_dining:         diningAmount,
    expenses_shopping:       0,
    expenses_other:          otherAmount,
    expenses_total_estimate: expensesTotal,
    savings_total:           profile.savingsTotal + monthlySavingsContribution,
    investments_total:       0,
    debt_total:              profile.debtTotal,
    debt_monthly:            profile.debtMonthly,
    age:                     null,
    employment:              null,
    has_health_insurance:    false,
    has_emergency_fund:      profile.savingsTotal > 0 ? "yes" : "no",
    contributing_401k:       null,
    section2_visible:        true,
    section3_visible:        true,
    section4_visible:        false,
  };
}

/** Converts the Zustand formData to the snake_case dict the API expects */
export function toApiFormData(fd: FormData): Record<string, unknown> {
  return {
    income_main:             fd.incomeMain,
    income_additional:       fd.incomeAdditional,
    expenses_rent:           fd.expensesRent,
    expenses_groceries:      fd.expensesGroceries,
    expenses_transport:      fd.expensesTransport,
    expenses_subscriptions:  fd.expensesSubscriptions,
    expenses_dining:         fd.expensesDining,
    expenses_shopping:       fd.expensesShopping,
    expenses_other:          fd.expensesOther,
    expenses_total_estimate: fd.expensesTotalEstimate || (fd.expensesRent + fd.expensesGroceries + fd.expensesTransport + fd.expensesSubscriptions + fd.expensesDining + fd.expensesShopping + fd.expensesOther),
    savings_total:           fd.savingsTotal,
    investments_total:       fd.investmentsTotal,
    debt_total:              fd.debtTotal,
    debt_monthly:            fd.debtMonthly,
    age:                     fd.age,
    employment:              fd.employment,
    has_health_insurance:    fd.hasHealthInsurance,
    has_emergency_fund:      fd.hasEmergencyFund,
    contributing_401k:       fd.contributing401k,
    section2_visible:        fd.section2Open,
    section3_visible:        fd.section3Open,
    section4_visible:        fd.section4Open,
  };
}
