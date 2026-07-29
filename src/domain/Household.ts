import type { Currency } from './Currency'
import type { HouseholdId, MemberId } from './ids'

/**
 * The shared unit that groceries, settlements, and history belong to.
 * Responsibility: identify a household, the members in it, and the single
 * currency it settles in — nothing about any individual member's balance.
 */
export interface Household {
  readonly id: HouseholdId
  readonly name: string
  readonly currency: Currency
  readonly memberIds: readonly MemberId[]
  readonly createdAt: Date
}
