import type { Currency } from '@/domain/Currency'
import type { MemberId } from '@/domain/ids'

/**
 * One member's financial summary for a settlement calculation.
 * Responsibility: report what a member paid, what they owe for what they
 * consumed, and the net of the two — nothing about how to resolve it.
 */
export interface MemberSettlementSummary {
  readonly memberId: MemberId
  /** Total the member paid for groceries, regardless of who consumed them. */
  readonly spentMinorUnits: number
  /** The member's fair share of everything consumed, regardless of who paid. */
  readonly consumedMinorUnits: number
  /**
   * `spentMinorUnits - consumedMinorUnits`.
   * Positive: the member covered more than their share and is owed money.
   * Negative: the member consumed more than they covered and owes money.
   * Zero: the member is settled up.
   */
  readonly netBalanceMinorUnits: number
}

/** A single payment that moves the household toward everyone being settled up. */
export interface DebtTransfer {
  readonly from: MemberId
  readonly to: MemberId
  readonly amountMinorUnits: number
}

/** The full result of running the settlement engine over a household's groceries. */
export interface SettlementResult {
  readonly currency: Currency
  readonly memberBalances: readonly MemberSettlementSummary[]
  readonly transfers: readonly DebtTransfer[]
}
