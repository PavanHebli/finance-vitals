// Tests for the pay cycle. Run with: bash packages/shared/test.sh
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  amountThisPaycheck,
  planPaycheck,
  startPaycheck,
  spendingPerWeek,
} = require("../.test-build/payCycle.js");

function card(id, label, extra = {}) {
  return {
    id, label, type: "custom", allocationMode: "fixed", allocationValue: 0,
    balance: 0, paused: false, color: "", createdAt: "", ...extra,
  };
}
const income = { id: "i", label: "Income", type: "income", allocationMode: "fixed", allocationValue: 0, balance: 2000, paused: false, color: "", createdAt: "" };
const cash = { id: "c", label: "Spending money", type: "cash", allocationMode: "remainder", allocationValue: 0, balance: 37, paused: false, color: "", createdAt: "" };

// Maya: paid $2,000 every two weeks, next payday Fri Nov 20 2026.
const rent = card("rent", "Rent", { kind: "bill", allocationValue: 600, balance: 600 });
const phone = card("phone", "Phone", { kind: "bill", allocationValue: 40, balance: 40 });
const insurance = card("ins", "Car insurance", { kind: "occasional", goalAmount: 720, dueDate: "2027-02-26" });
const cushion = card("cush", "Cushion", { kind: "goal", allocationValue: 100, goalAmount: 3000, balance: 1200 });
const trip = card("trip", "Trip", { kind: "goal", allocationMode: "percent", allocationValue: 5 });
const maya = [income, rent, phone, insurance, cushion, trip, cash];

test("bills take their fixed amount; percent goals use the paycheck", () => {
  assert.equal(amountThisPaycheck(rent, 2000, "2026-11-20", "biweekly"), 600);
  assert.equal(amountThisPaycheck(trip, 2000, "2026-11-20", "biweekly"), 100); // 5% of 2,000
});

test("once-in-a-while costs are spread over the paychecks before the due date", () => {
  // Biweekly from Nov 20: Nov 20, Dec 4, Dec 18, Jan 1, Jan 15, Jan 29, Feb 12 -> 7 before Feb 26.
  assert.equal(amountThisPaycheck(insurance, 2000, "2026-11-20", "biweekly"), 102.86); // 720 / 7
  // Half already saved: only the rest is spread.
  assert.equal(amountThisPaycheck({ ...insurance, balance: 360 }, 2000, "2026-11-20", "biweekly"), 51.43);
  // Fully saved: nothing more.
  assert.equal(amountThisPaycheck({ ...insurance, balance: 720 }, 2000, "2026-11-20", "biweekly"), 0);
  // Due before the next paycheck could help: everything still needed, now.
  assert.equal(amountThisPaycheck({ ...insurance, dueDate: "2026-11-20" }, 2000, "2026-11-20", "biweekly"), 720);
  // No due date yet: nothing to spread.
  assert.equal(amountThisPaycheck({ ...insurance, dueDate: undefined }, 2000, "2026-11-20", "biweekly"), 0);
});

test("goals stop at their target", () => {
  assert.equal(amountThisPaycheck({ ...cushion, balance: 2950 }, 2000, "2026-11-20", "biweekly"), 50);
  assert.equal(amountThisPaycheck({ ...cushion, balance: 3000 }, 2000, "2026-11-20", "biweekly"), 0);
});

test("paused cards and the income and cash cards take nothing", () => {
  assert.equal(amountThisPaycheck({ ...rent, paused: true }, 2000, "2026-11-20", "biweekly"), 0);
  assert.equal(amountThisPaycheck(cash, 2000, "2026-11-20", "biweekly"), 0);
});

test("spending money is what the plan leaves", () => {
  const plan = planPaycheck(maya, 2000, "2026-11-20", "biweekly");
  // 600 + 40 + 102.86 + 100 + 100 = 942.86
  assert.equal(plan.spendingMoney, 1057.14);
  assert.equal(plan.allocations.length, 5);
});

test("a plan bigger than the paycheck shows a negative, not a hidden zero", () => {
  const plan = planPaycheck([rent, card("car", "Car", { kind: "bill", allocationValue: 1600 })], 2000, "2026-11-20", "biweekly");
  assert.equal(plan.spendingMoney, -200);
});

test("starting a paycheck: bills reset, set-asides and goals build up, spending resets", () => {
  const result = startPaycheck(maya, 2000, "2026-11-20", "biweekly");
  const byId = Object.fromEntries(result.cards.map(c => [c.id, c.balance]));
  assert.equal(byId.rent, 600);        // reset, not 1,200
  assert.equal(byId.phone, 40);
  assert.equal(byId.ins, 102.86);      // building toward $720
  assert.equal(byId.cush, 1300);       // 1,200 + 100
  assert.equal(byId.trip, 100);
  assert.equal(byId.c, 1057.14);       // spending money reset, old $37 not carried
  assert.equal(byId.i, 0);
  assert.equal(result.nextPayday, "2026-12-04");
  // The input cards are left as they were.
  assert.equal(maya.find(c => c.id === "cush").balance, 1200);
});

test("weekly spending number", () => {
  assert.equal(spendingPerWeek(1057.14, "2026-11-20", "2026-12-04"), 528.57); // two weeks
  assert.equal(spendingPerWeek(-200, "2026-11-20", "2026-12-04"), -100);
});
