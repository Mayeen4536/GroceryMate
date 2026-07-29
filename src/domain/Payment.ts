import type { Money } from './Money'
import type { HouseholdId, MemberId, PaymentId, SettlementId } from './ids'

/**
 * A completed transfer of money from one member to another that resolves
 * a specific Settlement. Responsibility: record that a payment happened,
 * how much, and which debt it settled — not how "paid" gets detected or
 * confirmed, which is business logic for later.
 */
export interface Payment {
  readonly id: PaymentId
  readonly householdId: HouseholdId
  readonly settlementId: SettlementId
  readonly payerId: MemberId
  readonly payeeId: MemberId
  readonly amount: Money
  readonly paidAt: Date
}
