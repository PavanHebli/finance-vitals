// The score works in monthly numbers. The payday plan works per paycheck.
// This turns the plan into one month and hands it to budgetToFormData, so the
// score, the AI insight and the chat all see monthly numbers.
//
// Example: $2,000 every 2 weeks is about $4,333 a month (26 paychecks / 12),
// and a $46 phone share per paycheck is $100 a month.

import type { BudgetCard, DistributionLogEntry, FinancialProfile } from "./types";
import { budgetToFormData } from "./budgetFormat";
import { amountThisPaycheck, planPaycheck } from "./payCycle";
import { type PaySchedule, nextPaydayFrom, perPaycheckToMonthly } from "./paySchedule";

export function planToFormData(
  cards: BudgetCard[],
  schedule: PaySchedule,
  profile: FinancialProfile,
  today: string
): Record<string, unknown> {
  const paycheck = schedule.paycheckAmount ?? 0;
  const plan = planPaycheck(cards, paycheck, nextPaydayFrom(schedule, today), schedule.frequency);
  const monthly = (amount: number) => perPaycheckToMonthly(amount, schedule.frequency);

  // Loan and credit card payments are bills on the plan, marked as debt.
  // They are the score's "debt payments", not everyday spending, so they are
  // left out of the cards the spending is worked out from.
  const debtIds = new Set(cards.filter((c) => c.isDebt).map((c) => c.id));
  const debtMonthly = plan.allocations
    .filter((a) => debtIds.has(a.cardId))
    .reduce((sum, a) => sum + monthly(a.amount), 0);

  const allocations = plan.allocations
    .filter((a) => !debtIds.has(a.cardId))
    .map((a) => ({ ...a, amount: monthly(a.amount) }));
  const cash = cards.find((c) => c.type === "cash");
  if (cash) allocations.push({ cardId: cash.id, label: cash.label, amount: monthly(Math.max(0, plan.spendingMoney)) });

  // One made-up month, shaped like a split, so budgetToFormData uses these amounts.
  const month: DistributionLogEntry = {
    id: "plan-month",
    timestamp: "",
    incomeAmount: monthly(paycheck),
    allocations,
  };
  const nonDebtCards = cards.filter((c) => !debtIds.has(c.id));
  const form = budgetToFormData(nonDebtCards, [month], profile);
  // The profile keeps only the total owed; the monthly payments come from the plan.
  return { ...form, debt_monthly: debtMonthly };
}

// Monthly loan and credit card payments on the plan: the bills marked as debt.
export function planDebtMonthly(cards: BudgetCard[], schedule: PaySchedule, today: string): number {
  const paycheck = schedule.paycheckAmount ?? 0;
  const payday = nextPaydayFrom(schedule, today);
  return cards
    .filter((c) => c.isDebt)
    .reduce((sum, c) => sum + perPaycheckToMonthly(amountThisPaycheck(c, paycheck, payday, schedule.frequency), schedule.frequency), 0);
}

// The numbers to score: from the payday plan when there is one, otherwise
// from the old budget cards.
export function scoreFormData(
  cards: BudgetCard[],
  log: DistributionLogEntry[],
  profile: FinancialProfile,
  schedule: PaySchedule | null,
  today: string
): Record<string, unknown> {
  return schedule ? planToFormData(cards, schedule, profile, today) : budgetToFormData(cards, log, profile);
}
