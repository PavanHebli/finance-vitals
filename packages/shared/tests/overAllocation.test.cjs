// Tests for over-allocation fixes. Run with: bash packages/shared/test.sh
const test = require("node:test");
const assert = require("node:assert/strict");
const { planPaycheck } = require("../.test-build/payCycle.js");
const {
  planShortfall,
  roomForNewGoal,
  shrinkGoalsEvenly,
  reduceGoalBy,
} = require("../.test-build/overAllocation.js");

function card(id, label, extra = {}) {
  return {
    id, label, type: "custom", allocationMode: "fixed", allocationValue: 0,
    balance: 0, paused: false, color: "", createdAt: "", ...extra,
  };
}
const PAY = 2000, DAY = "2026-11-20", FREQ = "biweekly";

// $1,700 of bills, two goals ($200 fixed + 10% = $200), so the plan is $2,100: $100 over.
const rent = card("rent", "Rent", { kind: "bill", allocationValue: 1500 });
const phone = card("phone", "Phone", { kind: "bill", allocationValue: 200 });
const cushion = card("cush", "Cushion", { kind: "goal", allocationValue: 200 });
const trip = card("trip", "Trip", { kind: "goal", allocationMode: "percent", allocationValue: 10 });
const cards = [rent, phone, cushion, trip];

test("shortfall: how far over the paycheck, and under the floor", () => {
  const plan = planPaycheck(cards, PAY, DAY, FREQ);
  assert.equal(plan.spendingMoney, -100);
  assert.deepEqual(planShortfall(plan), { overPaycheckBy: 100, belowFloorBy: 100 });
  assert.deepEqual(planShortfall(plan, 300), { overPaycheckBy: 100, belowFloorBy: 400 });
  // A plan that fits but leaves less than the floor.
  const fits = planPaycheck([rent, cushion], PAY, DAY, FREQ); // 300 left
  assert.deepEqual(planShortfall(fits, 400), { overPaycheckBy: 0, belowFloorBy: 100 });
});

test("room for a new goal respects the floor", () => {
  const fits = planPaycheck([rent, cushion], PAY, DAY, FREQ); // 300 left
  assert.equal(roomForNewGoal(fits), 300);
  assert.equal(roomForNewGoal(fits, 250), 50);
  assert.equal(roomForNewGoal(fits, 400), 0);
});

test("shrinking goals evenly frees the amount and keeps each goal's mode", () => {
  const { cards: after, freed } = shrinkGoalsEvenly(cards, 100, PAY, DAY, FREQ);
  assert.equal(freed, 100);
  const byId = Object.fromEntries(after.map(c => [c.id, c]));
  assert.equal(byId.cush.allocationValue, 150);          // 200 -> 150 (75%)
  assert.equal(byId.trip.allocationMode, "percent");
  assert.equal(byId.trip.allocationValue, 7.5);          // 10% -> 7.5% ($150)
  assert.equal(byId.rent.allocationValue, 1500);         // bills untouched
  assert.equal(planPaycheck(after, PAY, DAY, FREQ).spendingMoney, 0);
});

test("a kept goal (like the starter cushion) is not shrunk", () => {
  const { cards: after, freed } = shrinkGoalsEvenly(cards, 100, PAY, DAY, FREQ, ["cush"]);
  assert.equal(freed, 100);
  const byId = Object.fromEntries(after.map(c => [c.id, c]));
  assert.equal(byId.cush.allocationValue, 200);
  assert.equal(byId.trip.allocationValue, 5);            // the trip gives the whole $100
});

test("asking for more than the goals have frees only what's there", () => {
  const { cards: after, freed } = shrinkGoalsEvenly(cards, 1000, PAY, DAY, FREQ);
  assert.equal(freed, 400);
  assert.ok(after.filter(c => c.kind === "goal").every(c => c.allocationValue === 0));
});

test("reducing one picked goal, never below zero", () => {
  assert.equal(reduceGoalBy(cushion, 50, PAY, DAY, FREQ).allocationValue, 150);
  assert.equal(reduceGoalBy(trip, 100, PAY, DAY, FREQ).allocationValue, 5); // $200 -> $100 = 5%
  assert.equal(reduceGoalBy(cushion, 500, PAY, DAY, FREQ).allocationValue, 0);
  assert.equal(reduceGoalBy(rent, 50, PAY, DAY, FREQ).allocationValue, 1500); // bills unchanged
});
