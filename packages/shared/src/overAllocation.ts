// When the plan is bigger than the paycheck.
//
// Adding a card is never blocked. Instead the app says, plainly, "your plan
// is $85 more than your paycheck" and offers fixes, each one previewed before
// anything changes:
// 1. Take it from Spending money anyway (no card changes; the UI just accepts it).
// 2. Shrink all goals evenly                 -> shrinkGoalsEvenly()
// 3. Pick which goals give                    -> reduceGoalBy()
// 4. Start the new goal smaller               -> roomForNewGoal() says how much fits
// Bills and once-in-a-while costs are never touched by a fix.
//
// The weekly floor is the least the user wants left for everyday spending,
// per paycheck here. 0 means they haven't set one.

import type { BudgetCard } from "./types";
import { cardKind } from "./budgetFormat";
import { type PayFrequency } from "./paySchedule";
import { type PaycheckPlan, amountThisPaycheck } from "./payCycle";

export interface Shortfall {
  overPaycheckBy: number; // how much the plan is bigger than the paycheck (0 if it fits)
  belowFloorBy: number;   // how much Spending money is under the floor (0 if not)
}

function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// How far the plan is over the paycheck, and under the floor.
export function planShortfall(plan: PaycheckPlan, floor: number = 0): Shortfall {
  return {
    overPaycheckBy: cents(Math.max(0, -plan.spendingMoney)),
    belowFloorBy: cents(Math.max(0, floor - plan.spendingMoney)),
  };
}

// The most a new goal can take per paycheck without pushing Spending money
// under the floor. 0 when there's no room.
export function roomForNewGoal(plan: PaycheckPlan, floor: number = 0): number {
  return cents(Math.max(0, plan.spendingMoney - floor));
}

// Set a goal to take `amount` per paycheck, keeping its own mode:
// a percent goal stays a percent of the paycheck, a fixed goal stays fixed.
function withAmountPerPaycheck(card: BudgetCard, amount: number, paycheck: number): BudgetCard {
  if (card.allocationMode === "percent") {
    const percent = paycheck > 0 ? (amount / paycheck) * 100 : 0;
    return { ...card, allocationValue: Math.round(percent * 100) / 100 };
  }
  return { ...card, allocationValue: cents(amount) };
}

// Fix 2: free `amountToFree` per paycheck by shrinking every active goal by
// the same share. Goals in `keepIds` (for example the starter cushion) are
// left alone. Returns the new cards and how much was actually freed, which is
// less than asked when the goals together don't have that much.
export function shrinkGoalsEvenly(
  cards: BudgetCard[],
  amountToFree: number,
  paycheck: number,
  payday: string,
  frequency: PayFrequency,
  keepIds: string[] = [],
): { cards: BudgetCard[]; freed: number } {
  const isShrinkable = (c: BudgetCard) =>
    c.type === "custom" && !c.paused && cardKind(c) === "goal" && !keepIds.includes(c.id);

  const goalsTotal = cards
    .filter(isShrinkable)
    .reduce((sum, c) => sum + amountThisPaycheck(c, paycheck, payday, frequency), 0);

  if (goalsTotal <= 0 || amountToFree <= 0) return { cards, freed: 0 };

  // Every goal keeps the same share of what it had: freeing $100 out of
  // $400 of goals leaves each goal at 75%.
  const keepShare = Math.max(0, (goalsTotal - amountToFree) / goalsTotal);

  const updated = cards.map(card => {
    if (!isShrinkable(card)) return card;
    const current = amountThisPaycheck(card, paycheck, payday, frequency);
    return withAmountPerPaycheck(card, current * keepShare, paycheck);
  });

  return { cards: updated, freed: cents(Math.min(amountToFree, goalsTotal)) };
}

// Fix 3: the user picks a goal and how much less it should take per paycheck.
// Never goes below zero. Cards that aren't goals are returned unchanged.
export function reduceGoalBy(
  card: BudgetCard,
  amount: number,
  paycheck: number,
  payday: string,
  frequency: PayFrequency,
): BudgetCard {
  if (card.type !== "custom" || cardKind(card) !== "goal") return card;
  const current = amountThisPaycheck(card, paycheck, payday, frequency);
  return withAmountPerPaycheck(card, Math.max(0, current - amount), paycheck);
}
