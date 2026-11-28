// Tests for scoring the payday plan. Run with: bash packages/shared/test.sh
const test = require("node:test");
const assert = require("node:assert/strict");
const { planDebtMonthly, planStoryContext, planToFormData, scoreFormData } = require("../.test-build/planScore.js");

function card(id, label, extra = {}) {
  return {
    id, label, type: "custom", allocationMode: "fixed", allocationValue: 0,
    balance: 0, paused: false, color: "", createdAt: "", ...extra,
  };
}
const income = { id: "i", label: "Income", type: "income", allocationMode: "fixed", allocationValue: 0, balance: 0, paused: false, color: "", createdAt: "" };
const cash = { id: "c", label: "Spending money", type: "cash", allocationMode: "remainder", allocationValue: 0, balance: 0, paused: false, color: "", createdAt: "" };

// $2,000 every 2 weeks; rent $1,300, phone $100, internet $60 and a $600 car
// loan a month (stored per paycheck); Cushion goal $100 a paycheck.
const cards = [
  income,
  card("rent", "Rent", { kind: "bill", isHousing: true, allocationValue: 600 }),
  card("phone", "Phone", { kind: "bill", allocationValue: 46.15 }),
  card("net", "Internet", { kind: "bill", allocationValue: 27.69 }),
  card("loan", "Car loan", { kind: "bill", isDebt: true, allocationValue: 276.92 }),
  card("cush", "Cushion", { kind: "goal", allocationValue: 100, goalAmount: 3000, balance: 1200 }),
  cash,
];
const schedule = { frequency: "biweekly", nextPayday: "2026-12-02", paycheckAmount: 2000 };
// debtMonthly here is an old profile answer: with a plan, the loan bills win.
const profile = { debtTotal: 40000, debtMonthly: 999, savingsTotal: 12000, profileComplete: true };

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1, `${actual} is not about ${expected}`);

test("a paycheck every 2 weeks is scored as a monthly income", () => {
  const form = planToFormData(cards, schedule, profile, "2026-11-18");
  near(form.income_main, 4333.33);      // 2,000 x 26 / 12, not 2,000
  near(form.expenses_rent, 1300);       // 600 per paycheck -> 1,300 a month
});

test("loan bills are the debt payments, not spending, and count once", () => {
  const form = planToFormData(cards, schedule, profile, "2026-11-18");
  near(form.debt_monthly, 600); // the car loan bill, not the profile's 999
  // Spending money: 2,000 - 600 - 46.15 - 27.69 - 276.92 - 100 = 949.24 a paycheck = 2,056.69 a month,
  // plus phone and internet (160) = 2,216.69. The loan is not in it.
  near(form.expenses_other, 2216.69);
  // What's left each month = the goal: 100 a paycheck = 216.67 a month (5% of pay).
  const left = form.income_main - form.expenses_total_estimate - form.debt_monthly;
  near(left, 216.67);
});

test("twice a month means exactly double", () => {
  const form = planToFormData(cards, { ...schedule, frequency: "semimonthly" }, profile, "2026-11-18");
  near(form.income_main, 4000);
  near(form.expenses_rent, 1200);
  near(form.debt_monthly, 553.84); // 276.92 x 2
});

test("no loan bills means no debt payments, even if the profile has an old number", () => {
  const noLoan = cards.filter((c) => c.id !== "loan");
  const form = planToFormData(noLoan, schedule, profile, "2026-11-18");
  assert.equal(form.debt_monthly, 0);
});

test("without a pay schedule, the old budget cards are used unchanged", () => {
  const form = scoreFormData(cards, [], { ...profile }, null, "2026-11-18");
  assert.equal(form.income_main, 0); // the old Income card's balance
});

test("the monthly debt payment shown in the profile is the loan bills", () => {
  near(planDebtMonthly(cards, schedule, "2026-11-18"), 600);
  assert.equal(planDebtMonthly(cards.filter((c) => c.id !== "loan"), schedule, "2026-11-18"), 0);
});

test("the story context has the plan and the weekly spending number", () => {
  const text = planStoryContext(cards, schedule, "2026-11-18");
  assert.match(text, /PAYDAY PLAN/);
  assert.match(text, /Car loan \(loan\/credit card payment\): \$277 per paycheck/);
  // 949.24 a paycheck, every 2 weeks -> about 475 a week (same as the plan screen).
  assert.match(text, /Spending money after bills and goals: \$949 per paycheck, about \$475 a week\./);
});

test("the story context describes a once-in-a-while cost by its cost and due date", () => {
  const withInsurance = [...cards.slice(0, -1), card("ins", "Car insurance", { kind: "occasional", goalAmount: 600, balance: 200, dueDate: "2027-03-01" }), cash];
  const text = planStoryContext(withInsurance, schedule, "2026-11-18");
  assert.match(text, /Set aside: Car insurance: costs \$600, due 2027-03-01, \$200 set aside so far/);
});
