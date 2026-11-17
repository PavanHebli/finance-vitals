// Whole-dollar money text, e.g. 8500 becomes "$8,500".
export function money(value: number): string {
  return "$" + Math.round(value).toLocaleString("en-US");
}

// A "YYYY-MM-DD" date as "Fri, Nov 20". Read in UTC so the day never shifts
// with the phone's time zone (see packages/shared/src/paySchedule.ts).
export function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
