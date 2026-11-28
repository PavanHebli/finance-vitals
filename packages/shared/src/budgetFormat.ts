import type { BudgetCard, CardKind, UserGoal, MetricKey, DistributionLogEntry, FinancialProfile, FormData } from "./types";
import { type PaySchedule, perPaycheckToMonthly } from "./paySchedule";

// ── Card kinds ─────────────────────────────────────────────────────────────

// The kind of a custom card. Cards saved before kinds existed only have a
// purpose: expense counts as a bill, saving as a goal.
export function cardKind(card: BudgetCard): CardKind {
  if (card.kind) return card.kind;
  return card.purpose === "saving" ? "goal" : "bill";
}

// The kind that matches a purpose, used while the card screens still ask
// "expense or saving" instead of the kind directly.
export function kindForPurpose(purpose: "expense" | "saving"): CardKind {
  return purpose === "saving" ? "goal" : "bill";
}

// Word boundaries matter: a plain /rent/ also matched "Parents" and "Current".
const HOUSING_NAME = /\b(rent|mortgage|housing|home\s*loan|hoa)\b/i;

// The bill that is rent or mortgage. A card the user marked as housing wins;
// otherwise fall back to guessing from the card's name and description.
export function findHousingCard(cards: BudgetCard[]): BudgetCard | undefined {
  const bills = cards.filter(c => c.type === "custom" && !c.paused && cardKind(c) === "bill");
  const marked = bills.find(c => c.isHousing);
  if (marked) return marked;
  return bills.find(c => HOUSING_NAME.test(c.label + " " + (c.description ?? "")));
}

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
  kind: CardKind | null;
  due_date: string | null;
  target_date: string | null;
  is_housing: boolean | null;
  is_debt: boolean | null;
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
    kind: card.type === "custom" ? cardKind(card) : null,
    due_date: card.dueDate ?? null,
    target_date: card.targetDate ?? null,
    is_housing: card.isHousing ?? false,
    is_debt: card.isDebt ?? false,
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
    kind: row.kind ?? undefined,
    dueDate: row.due_date ?? undefined,
    targetDate: row.target_date ?? undefined,
    isHousing: row.is_housing ?? false,
    isDebt: row.is_debt ?? false,
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
export function formatBudgetContext(
  budgetCards: BudgetCard[],
  distributionLog: DistributionLogEntry[],
  paySchedule: PaySchedule | null = null
): string {
  const customCards = budgetCards.filter(c => c.type === "custom");
  // Payday plan: amounts are per paycheck, so say so, with the monthly figure
  // next to them (otherwise the AI reads them as monthly).
  if (paySchedule) return formatPlanContext(customCards, paySchedule);
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

const FREQUENCY_WORDS = { biweekly: "every 2 weeks", semimonthly: "twice a month", monthly: "once a month" } as const;

function formatPlanContext(customCards: BudgetCard[], schedule: PaySchedule): string {
  const pay = schedule.paycheckAmount ?? 0;
  const perMonth = (amount: number) => perPaycheckToMonthly(amount, schedule.frequency).toFixed(0);
  const lines: string[] = [
    "PAYDAY PLAN (amounts are per paycheck unless marked as a month):",
    `- Paid $${pay.toFixed(0)} ${FREQUENCY_WORDS[schedule.frequency]} (about $${perMonth(pay)} a month). Next payday: ${schedule.nextPayday}.`,
  ];
  for (const card of customCards) {
    const kind = cardKind(card);
    const perPaycheck = card.allocationMode === "percent" ? (card.allocationValue / 100) * pay : card.allocationValue;
    const name = kind === "goal" ? "Goal" : kind === "occasional" ? "Set aside" : "Bill";
    if (kind === "occasional") {
      // The per-paycheck share depends on the due date, so give the facts instead.
      const due = card.dueDate ? `, due ${card.dueDate}` : ", no due date yet";
      const paused = card.paused ? " (paused)" : "";
      lines.push(`- ${name}: ${card.label}: costs $${(card.goalAmount ?? 0).toFixed(0)}${due}, $${card.balance.toFixed(0)} set aside so far, spread over the paychecks before it is due${paused}`);
      continue;
    }
    let line = `- ${name}: ${card.label}${card.isHousing ? " (rent/mortgage)" : ""}${card.isDebt ? " (loan/credit card payment)" : ""}: $${perPaycheck.toFixed(0)} per paycheck (about $${perMonth(perPaycheck)} a month)`;
    if (kind !== "bill") line += `, $${card.balance.toFixed(0)} saved so far`;
    if (kind !== "bill" && card.goalAmount) line += ` of $${card.goalAmount.toFixed(0)}`;
    if (card.paused) line += " (paused)";
    lines.push(line);
  }
  lines.push("- Whatever is left after bills and goals is spending money until the next payday.");
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
  const cashCard    = budgetCards.find(c => c.type === "cash");
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

  // Bills and once-in-a-while costs are spending; goals are saving, so they
  // never pollute expense ratios.
  const expenseCards = customCards.filter(c => cardKind(c) !== "goal");
  const savingCards  = customCards.filter(c => cardKind(c) === "goal");

  // Within expense cards, pattern-match for specific buckets
  const housing   = findHousingCard(expenseCards);
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

  // Money left in Cash in Hand gets spent (groceries, eating out, fun), so it
  // counts as spending. Counting it as saved made the budget page score far
  // higher than the check-up for the same person.
  let cashAmount = 0;
  if (lastAlloc && cashCard) {
    cashAmount = lastAlloc.get(cashCard.id) ?? 0;
  } else {
    const allocatedTotal = customCards.reduce((sum, c) => sum + cardAmount(c), 0);
    cashAmount = Math.max(0, income - allocatedTotal);
  }

  // A card always wins when one exists; the Financial Profile's manual
  // housingMonthly/expensesMonthly are only a fallback for whatever isn't
  // represented by a card yet, so a real card never gets silently
  // overridden by a stale manually-entered number.
  const rentAmount       = housing ? cardAmount(housing) : (profile.housingMonthly ?? 0);
  const groceriesAmount  = groceries ? cardAmount(groceries) : 0;
  const transportAmount  = transport ? cardAmount(transport) : 0;
  const diningAmount     = dining    ? cardAmount(dining)    : 0;
  const subsAmount       = subs      ? cardAmount(subs)      : 0;
  // With no expense cards, a manual "monthly expenses" answer is the user's
  // own figure for everyday spending, so it wins over the Cash in Hand guess
  // (counting both would count the same spending twice). Once even one
  // expense card exists, we trust the cards plus Cash in Hand.
  const otherAmount = expenseCards.length === 0
    ? (profile.expensesMonthly ?? cashAmount)
    : unclassifiedCardTotal + cashAmount;

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
