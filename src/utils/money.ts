/**
 * Centralized amount/money formatting — presentation only. Never mutates,
 * rounds, or otherwise touches a stored or calculated value; callers should
 * keep passing the raw number through and only format it here, right before
 * display. Not an arithmetic utility — the future settlement domain should
 * do its own math on raw numbers and only reach for this at render time.
 *
 * A whole amount renders without decimals (100 -> "100"). An amount with a
 * genuine fractional part always renders with exactly 2 decimal places, so
 * a small value like 0.01 can never silently collapse into "0" the way
 * `Math.round(value)` used to.
 */

const AMOUNT_LOCALE = 'en-US'

/** Rounds to whole-paisa (cent) precision first, so float noise (e.g. 0.1 + 0.2) can't produce a spurious decimal. */
function toCentPrecision(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

/** Formats a plain amount, no currency symbol: thousands separators, 2 decimals only when the amount isn't whole. */
export function formatAmount(value: number): string {
  const amount = toCentPrecision(value)
  const isWhole = Number.isInteger(amount)
  return amount.toLocaleString(AMOUNT_LOCALE, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  })
}

/** Formats an amount in Bangladeshi Taka, e.g. formatTaka(0.01) -> "৳0.01", formatTaka(100) -> "৳100". */
export function formatTaka(value: number): string {
  return `৳${formatAmount(value)}`
}
