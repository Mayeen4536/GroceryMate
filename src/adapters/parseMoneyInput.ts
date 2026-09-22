/**
 * Parses a user-entered decimal money string (e.g. from the grocery price
 * field) into an exact integer minor-unit amount — deterministically, with
 * no floating-point multiplication of the decimal value anywhere in the
 * conversion. This is the single place "what did the user type" becomes
 * "an integer the engine can use"; nothing else in the app should
 * reimplement this conversion.
 *
 * Why not `Number(value) * 100`: floating-point numbers can't represent
 * every decimal exactly, so multiplying a parsed decimal by 100 risks
 * off-by-a-fraction results for some inputs. Instead, the whole-unit and
 * fractional-unit parts are parsed as separate integer strings and
 * combined with integer arithmetic — never constructing a float from the
 * decimal value at all.
 */

export type MoneyInputRejectionReason = 'empty' | 'negative' | 'too-many-decimals' | 'malformed' | 'too-large'

export type ParseMoneyInputResult =
  | { readonly ok: true; readonly minorUnits: number }
  | { readonly ok: false; readonly reason: MoneyInputRejectionReason }

/** Digits-only-with-at-most-one-decimal-point shape; rejects letters, commas, and multiple dots. */
const SHAPE_PATTERN = /^\d*\.?\d*$/

/**
 * @param minorUnitDigits How many fractional digits the target currency's
 * minor unit represents — 2 for BDT (paisa). Defaults to 2 since this
 * integration is BDT-only for now; the domain's `Currency.minorUnitDigits`
 * is the source of truth if a caller ever needs a different currency.
 */
export function parseMoneyInput(raw: string, minorUnitDigits = 2): ParseMoneyInputResult {
  const trimmed = raw.trim()

  if (trimmed === '') return { ok: false, reason: 'empty' }
  if (trimmed.startsWith('-')) return { ok: false, reason: 'negative' }
  if (!SHAPE_PATTERN.test(trimmed)) return { ok: false, reason: 'malformed' }

  const [wholePart, fractionPart] = trimmed.split('.')
  // The shape pattern alone still lets "." (no digits at all) through.
  if (!wholePart && !fractionPart) return { ok: false, reason: 'empty' }
  if (fractionPart !== undefined && fractionPart.length > minorUnitDigits) {
    return { ok: false, reason: 'too-many-decimals' }
  }

  const wholeUnits = wholePart ? Number(wholePart) : 0
  const fractionUnits = fractionPart ? Number(fractionPart.padEnd(minorUnitDigits, '0')) : 0
  const minorUnits = wholeUnits * 10 ** minorUnitDigits + fractionUnits

  if (!Number.isSafeInteger(minorUnits)) return { ok: false, reason: 'too-large' }
  return { ok: true, minorUnits }
}

/**
 * The inverse of `parseMoneyInput`: turns a persisted integer minor-units
 * amount (e.g. `grocery_items.amount_minor`) back into the decimal string
 * every existing form/display component already expects (`GroceryItem.price`).
 * Same reasoning as the parser — whole-unit and fractional-unit parts are
 * combined via integer arithmetic, never a float division of the decimal
 * value, so a round trip through this and `parseMoneyInput` is always exact.
 */
export function formatMinorUnitsInput(minorUnits: number, minorUnitDigits = 2): string {
  if (minorUnitDigits <= 0) return String(minorUnits)
  const divisor = 10 ** minorUnitDigits
  const whole = Math.trunc(minorUnits / divisor)
  const fraction = Math.abs(minorUnits % divisor)
  // A whole amount round-trips as a whole number ("240", not "240.00") —
  // both parse back to the identical minorUnits via parseMoneyInput, so
  // this is a cosmetic choice, not a correctness one: it's what a user
  // would actually have typed for a whole-currency price.
  if (fraction === 0) return String(whole)
  return `${whole}.${String(fraction).padStart(minorUnitDigits, '0')}`
}
