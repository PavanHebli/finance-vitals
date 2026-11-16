// Tests for card kinds, the rent card and the budget-to-score conversion.
// Run with: bash packages/shared/test.sh
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cardKind,
  kindForPurpose,
  findHousingCard,
  budgetCardToRow,
  rowToBudgetCard,
  budgetToFormData,
} = require("../.test-build/budgetFormat.js");

function card(id, label, extra = {}) {
  return {
    id, label, type: "custom", allocationMode: "fixed", allocationValue: 0,
    balance: 0, paused: false, color: "", createdAt: "", ...extra,
  };
}
const income = { id: "i", label: "Income", type: "income", allocationMode: "fixed", allocationValue: 0, balance: 4000, paused: false, color: "", createdAt: "" };
const cash = { id: "c", label: "Cash in Hand", type: "cash", allocationMode: "remainder", allocationValue: 0, balance: 0, paused: false, color: "", createdAt: "" };
const profile = { debtTotal: 0, debtMonthly: 0, savingsTotal: 3000, profileComplete: true };

test("old cards get a kind from their purpose; a saved kind wins", () => {
  assert.equal(cardKind(card("a", "Phone", { purpose: "expense" })), "bill");
  assert.equal(cardKind(card("b", "Trip", { purpose: "saving" })), "goal");
  assert.equal(cardKind(card("c", "Phone")), "bill");
  assert.equal(cardKind(card("d", "Insurance", { purpose: "expense", kind: "occasional" })), "occasional");
  assert.equal(kindForPurpose("saving"), "goal");
  assert.equal(kindForPurpose("expense"), "bill");
});

test("the rent card: a marked card wins, names match whole words only", () => {
  const parents = card("p", "Parents gift");
  const rent = card("r", "Rent");
  const flat = card("f", "Flat", { isHousing: true });
  assert.equal(findHousingCard([parents]), undefined); // "Parents" is not rent
  assert.equal(findHousingCard([parents, rent]).id, "r");
  assert.equal(findHousingCard([rent, flat]).id, "f"); // marked beats the name
  assert.equal(findHousingCard([card("m", "Mortgage payment")]).id, "m");
  assert.equal(findHousingCard([card("g", "Rent deposit fund", { purpose: "saving" })]), undefined); // goals aren't rent
  assert.equal(findHousingCard([card("x", "Rent", { paused: true })]), undefined);
});

test("new fields survive a round trip to the database row and back", () => {
  const original = card("o", "Car insurance", { kind: "occasional", dueDate: "2027-02-01", isHousing: false, purpose: "expense" });
  const row = budgetCardToRow(original, "user-1", 2);
  assert.equal(row.kind, "occasional");
  assert.equal(row.due_date, "2027-02-01");
  const back = rowToBudgetCard({ ...row, created_at: "" });
  assert.equal(back.kind, "occasional");
  assert.equal(back.dueDate, "2027-02-01");
  assert.equal(back.isHousing, false);
  // Income and Cash in Hand have no kind.
  assert.equal(budgetCardToRow(cash, "user-1", 1).kind, null);
  // An old card without a kind is saved with the kind its purpose implies.
  assert.equal(budgetCardToRow(card("s", "Trip", { purpose: "saving" }), "user-1", 3).kind, "goal");
});

test("score inputs: goals are savings, bills and occasional costs are spending", () => {
  const cards = [
    income, cash,
    card("r", "Flat", { allocationValue: 1250, kind: "bill", isHousing: true }),
    card("ins", "Car insurance", { allocationValue: 120, kind: "occasional" }),
    card("t", "Trip", { allocationValue: 400, kind: "goal" }),
  ];
  const form = budgetToFormData(cards, [], profile);
  assert.equal(form.expenses_rent, 1250);                        // found through isHousing, not the name
  assert.equal(form.expenses_total_estimate, 1250 + 120 + 2230); // rent + insurance + Cash in Hand (4000 - 1770)
  assert.equal(form.savings_total, 3000 + 400);                  // the goal's contribution is saving
});
