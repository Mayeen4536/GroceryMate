/** Display formatter for amounts; presentation only. */
export function formatTaka(value: number): string {
  return `৳${Math.round(value).toLocaleString()}`
}
