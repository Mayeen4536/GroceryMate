import type { Currency } from '@/domain/Currency'
import type { Money } from '@/domain/Money'

/**
 * The only arithmetic anywhere in this module: converting a price stated
 * in major units (e.g. `800` meaning ৳800.00, or `19.99`) into `Money`'s
 * integer minor units. This is a unit conversion the AI never performs —
 * it reports numbers exactly as written; this function is what turns
 * that into a domain `Money` value, deterministically and outside the
 * AI's influence entirely.
 *
 * A single multiply followed immediately by `Math.round` is the standard,
 * safe way to do this: floating-point multiplication can land a hair off
 * the exact integer (`19.99 * 100` is `1998.9999999999998`, not `1999`),
 * but the error is many orders of magnitude smaller than the 0.5 needed
 * to round to the wrong integer, so `Math.round` always recovers the
 * exact intended value for realistic currency amounts.
 */
export function majorUnitsToMoney(majorUnitsAmount: number, currency: Currency): Money {
  const scale = 10 ** currency.minorUnitDigits
  return {
    minorUnits: Math.round(majorUnitsAmount * scale),
    currency,
  }
}
