// Whole-dollar money text, e.g. 8500 becomes "$8,500".
export function money(value: number): string {
  return "$" + Math.round(value).toLocaleString("en-US");
}
