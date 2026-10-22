// Guesses whether a new card is an expense or a saving from its name and
// description. The user can always flip it. Ported from the web budget page.

const SAVING_SIGNALS = [
  /\bsav(e|ing|ings)?\b/, /\bfund\b/, /\bgoal\b/, /\bdream\b/, /\bfuture\b/,
  /\bdown\s*payment\b/, /\bvacation\b/, /\bholiday\b/, /\btrip\b/,
  /\bwedding\b/, /\bretire(ment)?\b/, /\bemergency\b/, /\binvest(ment)?\b/,
  /\bcollege\b/, /\buniversity\b/,
  /\bbuy\b/, /\bpurchas/,
  /\bnew\s+(car|house|home|phone|laptop|bike)\b/,
  /\b(car|house|home|laptop|phone|bike)\s+(fund|goal|sav)/,
];

const EXPENSE_SIGNALS = [
  /\brent\b/, /\bmortgage\b/, /\bgroceries?\b/, /\bfood\b/,
  /\butilities?\b/, /\belectric(ity)?\b/, /\bwater bill\b/, /\binternet\b/,
  /\bphone\s*bill\b/, /\bsubscription\b/, /\bnetflix\b/, /\bspotify\b/,
  /\bgym\b/, /\bfitness\b/, /\binsurance\b/, /\bdining\b/, /\brestaurant\b/,
  /\btransport\b/, /\bcommute?\b/, /\bfuel\b/, /\bpetrol\b/, /\bgas\s*bill\b/,
  /\bclothing\b/, /\bshopping\b/, /\bentertainment\b/, /\bparking\b/,
  /\bmedical\b/, /\bhealthcare?\b/, /\bdental\b/, /\bloan\s*payment\b/,
  /\bmonthly\s*(bill|payment|expense)\b/,
];

export function classifyCard(name: string, description = ""): "expense" | "saving" {
  const text = `${name} ${description}`.toLowerCase();
  const savingScore = SAVING_SIGNALS.filter((p) => p.test(text)).length;
  const expenseScore = EXPENSE_SIGNALS.filter((p) => p.test(text)).length;
  return savingScore > 0 && savingScore >= expenseScore ? "saving" : "expense";
}

// Colors offered when creating a card.
export const CARD_COLORS = [
  "#5572f4", "#22c55e", "#f59e0b", "#a855f7",
  "#ec4899", "#ef4444", "#14b8a6", "#f97316",
];
