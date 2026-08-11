import type { Currency } from '@/domain'

/**
 * Renders a minor-units amount as display text (e.g. `৳420`, `৳420.50`).
 * Whole amounts drop the decimal places; fractional amounts show exactly
 * the currency's own precision. Always formatted with the `en-US` digit
 * grouping regardless of runtime locale, so the same amount always
 * renders as the same string — this text gets compared against verbatim
 * elsewhere (`explanationVerification.ts`), so it must be deterministic.
 */
export function formatMinorUnits(minorUnits: number, currency: Currency): string {
  const scale = 10 ** currency.minorUnitDigits
  const majorAmount = minorUnits / scale
  const fractionDigits = Number.isInteger(majorAmount) ? 0 : currency.minorUnitDigits
  const formatted = majorAmount.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return `${currency.symbol}${formatted}`
}
