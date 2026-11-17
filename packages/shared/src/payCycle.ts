// The pay cycle: what happens to each card when a paycheck arrives, and the
// "you can spend $X a week until payday" number.
//
// One cycle runs from one payday to the next. On payday:
// - bill        is set back to its amount (last cycle's money paid the bill)
// - occasional  adds its share toward a bill that's due later
// - goal        adds its contribution toward a target
// - Cash in Hand (Spending money) is set to whatever is left
//
// Plain functions only: they take cards in and give new cards back, so the
// web and mobile stores can both use them and they can be tested.

import type { BudgetCard } from "./types";
import { cardKind } from "./budgetFormat";
import { type PayFrequency, paychecksBefore, paydayAfter, weeksUntil } from "./paySchedule";

export interface PaycheckAllocation {
  cardId: string;
  label: string;
  amount: number;
}

export interface PaycheckPlan {
  allocations: PaycheckAllocation[]; // one per active custom card
  spendingMoney: number;             // what's left; negative when the plan is bigger than the paycheck
}

// Money is rounded to cents so sums don't pick up floating-point noise.
function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// How much one card takes from this paycheck.
// `payday` is the date this paycheck arrives ("YYYY-MM-DD").
export function amountThisPaycheck(
  card: BudgetCard,
  paycheck: number,
  payday: string,
  frequency: PayFrequency,
): number {
  if (card.type !== "custom" || card.paused) return 0;

  const kind = cardKind(card);

  if (kind === "occasional") {
    // goalAmount is what the bill will cost; balance is what's already put aside.
    const stillNeeded = (card.goalAmount ?? 0) - card.balance;
    if (stillNeeded <= 0) return 0;
    if (!card.dueDate) return 0; // no due date yet, nothing to spread
    const paychecksLeft = paychecksBefore(payday, frequency, card.dueDate);
    // Due before this paycheck could help: everything still needed, now.
    if (paychecksLeft <= 0) return cents(stillNeeded);
    return cents(stillNeeded / paychecksLeft);
  }

  // Bills and goals: a fixed amount, or a percent of this paycheck.
  // (Older cards may still have percent bills.)
  const planned = card.allocationMode === "percent"
    ? (card.allocationValue / 100) * paycheck
    : card.allocationValue;

  if (kind === "goal" && card.goalAmount !== undefined && card.goalAmount > 0) {
    // Stop at the target instead of overshooting it.
    const remaining = card.goalAmount - card.balance;
    return cents(Math.max(0, Math.min(planned, remaining)));
  }

  return cents(planned);
}

// What this paycheck would do, without changing anything.
export function planPaycheck(
  cards: BudgetCard[],
  paycheck: number,
  payday: string,
  frequency: PayFrequency,
): PaycheckPlan {
  const allocations: PaycheckAllocation[] = [];
  for (const card of cards) {
    if (card.type !== "custom" || card.paused) continue;
    allocations.push({
      cardId: card.id,
      label: card.label,
      amount: amountThisPaycheck(card, paycheck, payday, frequency),
    });
  }
  const committed = allocations.reduce((sum, a) => sum + a.amount, 0);
  return { allocations, spendingMoney: cents(paycheck - committed) };
}

// Apply a paycheck: returns the cards with their new balances, what went
// where, and the next payday. The input cards are not changed.
export function startPaycheck(
  cards: BudgetCard[],
  paycheck: number,
  payday: string,
  frequency: PayFrequency,
): { cards: BudgetCard[]; plan: PaycheckPlan; nextPayday: string } {
  const plan = planPaycheck(cards, paycheck, payday, frequency);
  const amountById = new Map(plan.allocations.map(a => [a.cardId, a.amount]));

  const updated = cards.map(card => {
    if (card.type === "income") return { ...card, balance: 0 };
    if (card.type === "cash") return { ...card, balance: plan.spendingMoney };
    if (card.paused) return card;

    const amount = amountById.get(card.id) ?? 0;
    if (cardKind(card) === "bill") return { ...card, balance: amount };
    return { ...card, balance: cents(card.balance + amount) };
  });

  return { cards: updated, plan, nextPayday: paydayAfter(payday, frequency) };
}

// "You can spend $X a week until payday." Negative when the plan is bigger
// than the paycheck, so the shortfall is shown, not hidden.
export function spendingPerWeek(spendingMoney: number, today: string, nextPayday: string): number {
  return cents(spendingMoney / weeksUntil(today, nextPayday));
}
