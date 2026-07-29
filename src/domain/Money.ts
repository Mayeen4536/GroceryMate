import type { Currency } from './Currency'

/**
 * An exact monetary amount, stored as an integer in the currency's minor
 * unit (e.g. cents) rather than a floating-point major-unit number, so
 * amounts can never accumulate rounding error. Responsibility: represent
 * "how much, in what currency" — no arithmetic, formatting, or conversion.
 */
export interface Money {
  /** Non-negative integer amount in `currency`'s minor unit. */
  readonly minorUnits: number
  readonly currency: Currency
}
