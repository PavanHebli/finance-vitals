import type { Metrics, MetricScores } from "./types";

// One plain-English next step, worked out from the person's own numbers.
// The weakest of the four metrics decides what it talks about. Code does the
// math here; no AI is involved, so the numbers can always be checked.

interface NextStepInput {
  metrics: Metrics;
  metricScores: MetricScores;
  income: number;           // monthly take-home pay, all sources
  monthlySpending: number;  // what they spend in a month, rent included
  savings: number;          // money saved right now
}

function dollars(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("en-US");
}

export function nextStep(input: NextStepInput): string {
  const { metrics, metricScores, income, monthlySpending, savings } = input;

  const points = {
    cushion: metricScores.emergency_fund_months.score,
    savings: metricScores.savings_rate.score,
    debt: metricScores.debt_to_income.score,
    housing: metricScores.housing_ratio.score,
  };

  // The lowest score wins. On a tie, the first one in this list wins, because
  // a missing cushion matters most (see the cushion rule in api/core/health.py).
  const order = ["cushion", "savings", "debt", "housing"] as const;
  let weakest: (typeof order)[number] = order[0];
  for (const name of order) {
    if (points[name] < points[weakest]) weakest = name;
  }

  if (points[weakest] === 25) {
    return "You have full marks on all four. Keep doing what you are doing, and check in again next month.";
  }

  // Spending more than you earn (debt payments included) comes before everything else.
  const surplus = metrics.net_monthly_flow;
  if (surplus < 0) {
    return `You are spending about ${dollars(-surplus)} more each month than you earn, debt payments included. Closing that gap comes before anything else: look for the one or two costs you can cut or pause.`;
  }

  if (weakest === "cushion") {
    const months = metrics.emergency_fund_months;
    const goal = months < 1 ? 1 : months < 3 ? 3 : 6;
    const goalAmount = goal * monthlySpending;
    let text = `Your biggest gap is your cushion: you have ${months} months of spending saved. `;
    if (goal === 1) {
      text += `Reaching 1 month (about ${dollars(goalAmount)}) lifts the cap that keeps your score at 50 or below. Three months is the usual goal. `;
    } else if (goal === 3) {
      text += `The usual goal is 3 months, about ${dollars(goalAmount)}. `;
    } else {
      text += `Full marks start at 6 months, about ${dollars(goalAmount)}. `;
    }
    const gap = goalAmount - savings;
    if (surplus > 0 && gap > 0) {
      text += `At your current surplus of ${dollars(surplus)} a month, that takes about ${Math.ceil(gap / surplus)} months.`;
    } else if (surplus === 0) {
      text += "Right now you spend as much as you earn, so there is nothing left over to save. Freeing up even a little each month is the first step.";
    }
    return text;
  }

  if (weakest === "savings") {
    const extra = ((20 - metrics.savings_rate) / 100) * income;
    return `You keep ${metrics.savings_rate}% of your pay. Full marks start at 20%, which means keeping about ${dollars(extra)} more each month.`;
  }

  if (weakest === "debt") {
    return `${metrics.debt_to_income}% of your pay goes to debt payments. Full marks start under 10%, about ${dollars(income * 0.1)} a month. Paying extra on the debt with the highest interest rate first usually gets you there fastest.`;
  }

  return `${metrics.housing_ratio}% of your pay goes to rent. Full marks start under 25%, about ${dollars(income * 0.25)} a month. That is often only changeable at your next lease, so treat it as a longer-term goal.`;
}
