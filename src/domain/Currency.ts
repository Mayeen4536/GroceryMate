/** ISO 4217 currency codes a GroceryMate household can settle in. */
export type CurrencyCode = 'BDT' | 'USD' | 'EUR' | 'GBP' | 'INR'

/**
 * A currency: its code, display symbol, and minor-unit precision.
 * Responsibility: describe how amounts in this currency are represented —
 * nothing about formatting or conversion behavior.
 */
export interface Currency {
  readonly code: CurrencyCode
  readonly symbol: string
  /** Digits after the decimal point in the currency's minor unit (e.g. 2 for cents). */
  readonly minorUnitDigits: number
}

/** The currencies a household can be configured to use. */
export const CURRENCIES: Readonly<Record<CurrencyCode, Currency>> = {
  BDT: { code: 'BDT', symbol: '৳', minorUnitDigits: 2 },
  USD: { code: 'USD', symbol: '$', minorUnitDigits: 2 },
  EUR: { code: 'EUR', symbol: '€', minorUnitDigits: 2 },
  GBP: { code: 'GBP', symbol: '£', minorUnitDigits: 2 },
  INR: { code: 'INR', symbol: '₹', minorUnitDigits: 2 },
}
