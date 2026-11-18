// Tests for src/paySchedule.ts. Run with: bash packages/shared/test.sh
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  paydayAfter,
  nextPaydayFrom,
  paychecksBefore,
  weeksUntil,
  daysBetween,
  perPaycheckToMonthly,
  monthlyToPerPaycheck,
  perPaycheckToWeekly,
  addDays,
  paydayDue,
  todayString,
  todayInTimezone,
} = require("../.test-build/paySchedule.js");

test("biweekly paydays are 14 days apart, across month and year ends", () => {
  assert.equal(paydayAfter("2026-11-06", "biweekly"), "2026-11-20");
  assert.equal(paydayAfter("2026-12-25", "biweekly"), "2027-01-08");
});

test("semi-monthly paydays are the 15th and the last day of the month", () => {
  assert.equal(paydayAfter("2026-11-15", "semimonthly"), "2026-11-30");
  assert.equal(paydayAfter("2026-11-30", "semimonthly"), "2026-12-15");
  assert.equal(paydayAfter("2027-02-15", "semimonthly"), "2027-02-28");
  assert.equal(paydayAfter("2028-02-15", "semimonthly"), "2028-02-29"); // leap year
  assert.equal(paydayAfter("2026-12-31", "semimonthly"), "2027-01-15");
  // A date that isn't a semi-monthly payday moves to the next one.
  assert.equal(paydayAfter("2026-11-03", "semimonthly"), "2026-11-15");
});

test("monthly paydays keep the day, or the last day when it doesn't exist", () => {
  assert.equal(paydayAfter("2026-11-01", "monthly"), "2026-12-01");
  assert.equal(paydayAfter("2026-12-10", "monthly"), "2027-01-10");
  assert.equal(paydayAfter("2027-01-31", "monthly"), "2027-02-28");
  assert.equal(paydayAfter("2027-02-28", "monthly"), "2027-03-31"); // last day stays last day
  assert.equal(paydayAfter("2027-03-30", "monthly"), "2027-04-30");
});

test("a payday that has passed rolls forward to today or later", () => {
  const schedule = { frequency: "biweekly", nextPayday: "2026-10-09" };
  assert.equal(nextPaydayFrom(schedule, "2026-11-10"), "2026-11-20");
  assert.equal(nextPaydayFrom(schedule, "2026-10-09"), "2026-10-09"); // today is payday
});

test("paychecks before a due date count the first payday, not one on the due date", () => {
  // Biweekly from Nov 20: Nov 20, Dec 4, Dec 18, Jan 1, Jan 15, Jan 29 -> 6 before Feb 1.
  assert.equal(paychecksBefore("2026-11-20", "biweekly", "2027-02-01"), 6);
  assert.equal(paychecksBefore("2026-11-20", "biweekly", "2026-12-04"), 1);
  assert.equal(paychecksBefore("2026-11-20", "biweekly", "2026-11-20"), 0);
  assert.equal(paychecksBefore("2026-11-15", "semimonthly", "2027-01-01"), 4); // Nov 15, Nov 30, Dec 15, Dec 31
});

test("weeks until payday never drop below one day", () => {
  assert.equal(weeksUntil("2026-11-06", "2026-11-20"), 2);
  assert.equal(weeksUntil("2026-11-20", "2026-11-20"), 1 / 7);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});

test("per-paycheck amounts convert to monthly", () => {
  assert.equal(perPaycheckToMonthly(1200, "biweekly"), 2600);
  assert.equal(perPaycheckToMonthly(1500, "semimonthly"), 3000);
  assert.equal(perPaycheckToMonthly(3000, "monthly"), 3000);
});

test("today is the device's local calendar date", () => {
  assert.equal(todayString(new Date(2026, 10, 10, 23, 30)), "2026-11-10");
});

test("monthly bills as each paycheck's share", () => {
  assert.equal(monthlyToPerPaycheck(1300, "biweekly"), 600);
  assert.equal(monthlyToPerPaycheck(1300, "semimonthly"), 650);
  assert.equal(monthlyToPerPaycheck(1300, "monthly"), 1300);
  assert.equal(monthlyToPerPaycheck(100, "biweekly"), 46.15);
});

test("today in the pay time zone, not where the phone is", () => {
  // 2026-11-20 03:00 UTC is still Nov 19 in Austin, already Nov 20 in Tokyo.
  const moment = new Date(Date.UTC(2026, 10, 20, 3, 0));
  assert.equal(todayInTimezone("America/Chicago", moment), "2026-11-19");
  assert.equal(todayInTimezone("Asia/Tokyo", moment), "2026-11-20");
  // An unknown time zone falls back to the device's date instead of crashing.
  assert.equal(todayInTimezone("Not/AZone", moment), todayString(moment));
  assert.equal(todayInTimezone(undefined, moment), todayString(moment));
});

test("adding days and weekly amounts", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(perPaycheckToWeekly(1000, "biweekly"), 500);
  assert.equal(perPaycheckToWeekly(1300, "semimonthly"), 600);
  assert.equal(perPaycheckToWeekly(2600, "monthly"), 600);
});

test("which payday a check-in is for", () => {
  const schedule = { frequency: "biweekly", nextPayday: "2026-11-20" };
  assert.equal(paydayDue(schedule, "2026-11-19"), null);          // not yet
  assert.equal(paydayDue(schedule, "2026-11-20"), "2026-11-20");  // payday itself
  assert.equal(paydayDue(schedule, "2026-11-25"), "2026-11-20");  // a few days late
  assert.equal(paydayDue(schedule, "2026-12-10"), "2026-12-04");  // missed one: the latest
  assert.equal(paydayDue({ frequency: "semimonthly", nextPayday: "2026-11-30" }, "2026-12-15"), "2026-12-15");
});
