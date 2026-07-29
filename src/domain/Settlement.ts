import type { Money } from './Money'
import type { HouseholdId, MemberId, PaymentId, SettlementId } from './ids'

/** A debt still waiting to be paid. */
export interface PendingSettlement {
  readonly status: 'pending'
}

/** A debt that has been paid off, linked to the Payment that resolved it. */
export interface SettledSettlement {
  readonly status: 'settled'
  readonly settledAt: Date
  readonly paymentId: PaymentId
}

/**
 * An amount one member owes another. Responsibility: track a single debt
 * from creation through to payment — not how the amount was calculated,
 * which is the job of a future balance-calculation service, not this type.
 *
 * `status` is a discriminated union rather than an optional `settledAt`/
 * `paymentId` pair: those fields are only meaningful once a debt is
 * actually settled, so they can't exist on a still-pending settlement.
 */
export type Settlement = {
  readonly id: SettlementId
  readonly householdId: HouseholdId
  readonly debtorId: MemberId
  readonly creditorId: MemberId
  readonly amount: Money
  readonly createdAt: Date
} & (PendingSettlement | SettledSettlement)
