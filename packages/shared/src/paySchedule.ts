// Pay schedule math for the payday plan.
//
// Dates are plain "YYYY-MM-DD" strings, not Date objects. A payday is a
// calendar day, not a moment in time, and Date objects shift by a day
// depending on the phone's time zone. Internally we do the arithmetic in UTC,
// where a day is always exactly 24 hours.

export type PayFrequency = "biweekly" | "semimonthly" | "monthly";

export interface PaySchedule {
  frequency: PayFrequency;
  nextPayday: string; // "YYYY-MM-DD"
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Number of days in a month. month is 0-11.
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Today's date on this device, as "YYYY-MM-DD" in the user's own time zone.
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Whole days from one date to another (negative if `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

// The payday that comes after `payday`.
// - biweekly: 14 days later.
// - semimonthly: paid on the 15th and on the last day of the month.
// - monthly: the same day next month. If that day doesn't exist (the 31st in
//   a 30-day month) or the payday was the last day of its month, use the last
//   day of next month. Known limit: someone paid on the 30th gets the 31st
//   after a February payday.
export function paydayAfter(payday: string, frequency: PayFrequency): string {
  const date = parse(payday);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (frequency === "biweekly") {
    return format(new Date(date.getTime() + 14 * DAY_MS));
  }

  if (frequency === "semimonthly") {
    const lastDay = daysInMonth(year, month);
    if (day < 15) return format(new Date(Date.UTC(year, month, 15)));
    if (day < lastDay) return format(new Date(Date.UTC(year, month, lastDay)));
    return format(new Date(Date.UTC(year, month + 1, 15)));
  }

  // monthly
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;
  const nextLastDay = daysInMonth(nextYear, nextMonth);
  const wasLastDay = day === daysInMonth(year, month);
  const nextDay = wasLastDay ? nextLastDay : Math.min(day, nextLastDay);
  return format(new Date(Date.UTC(nextYear, nextMonth, nextDay)));
}

// The next payday on or after `today`. If the saved payday has already
// passed (the user hasn't opened the app for a while), roll it forward.
export function nextPaydayFrom(schedule: PaySchedule, today: string): string {
  let payday = schedule.nextPayday;
  while (daysBetween(today, payday) < 0) {
    payday = paydayAfter(payday, schedule.frequency);
  }
  return payday;
}

// How many paychecks arrive before a due date, counting `firstPayday` itself.
// Used to spread a once-in-a-while bill: $720 due in Feb with 6 paychecks
// before it is $120 a paycheck. A paycheck that lands on the due date itself
// is too late to count.
export function paychecksBefore(firstPayday: string, frequency: PayFrequency, dueDate: string): number {
  let count = 0;
  let payday = firstPayday;
  while (daysBetween(payday, dueDate) > 0) {
    count += 1;
    payday = paydayAfter(payday, frequency);
  }
  return count;
}

// Weeks from today until the next payday, for "you can spend $X a week".
// Never less than one day, so the day before payday doesn't divide by zero.
export function weeksUntil(today: string, nextPayday: string): number {
  const days = Math.max(1, daysBetween(today, nextPayday));
  return days / 7;
}

// Paychecks in a year, for turning per-paycheck amounts into monthly ones.
export function paychecksPerYear(frequency: PayFrequency): number {
  if (frequency === "biweekly") return 26;
  if (frequency === "semimonthly") return 24;
  return 12;
}

// A per-paycheck amount as a monthly amount (the score works in months).
export function perPaycheckToMonthly(amount: number, frequency: PayFrequency): number {
  return (amount * paychecksPerYear(frequency)) / 12;
}
