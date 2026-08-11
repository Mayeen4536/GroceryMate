import type { Currency, GroceryItem, Member, MemberId } from '@/domain'
import type { SettlementResult } from '@/engine'
import { MemberNotInSettlementError } from './errors'

export type SettlementDirection = 'owes' | 'is_owed' | 'settled'

/** One payment involving this member, resolved from the engine's minimum-transaction solver. */
export interface DebtTransferFact {
  readonly counterpartyMemberId: MemberId
  readonly counterpartyName: string
  readonly amountMinorUnits: number
}

/**
 * Every fact a fairness explanation is allowed to state, derived only
 * from what `engine/settlementEngine.ts` already computed and the
 * `GroceryItem`s it was computed from. Nothing in this type is inferred
 * or estimated — a `FairnessExplanationService` is handed exactly this
 * and nothing else, so it has no way to state a number, name, or item
 * that isn't already true.
 */
export interface SettlementExplanationFacts {
  readonly memberId: MemberId
  readonly memberName: string
  readonly currency: Currency
  readonly direction: SettlementDirection
  /** The magnitude of the net balance. Always non-negative — `direction` carries the sign. */
  readonly amountMinorUnits: number
  readonly spentMinorUnits: number
  readonly consumedMinorUnits: number
  /** Names of items this member paid for, in grocery-list order. */
  readonly itemsPaidFor: readonly string[]
  /** Names of items this member shared in (consumed), in grocery-list order. */
  readonly itemsSharedIn: readonly string[]
  /** How the net balance actually resolves into payments. Empty when settled or when the engine found no transfer needed. */
  readonly transfers: readonly DebtTransferFact[]
}

export interface BuildFairnessExplanationFactsInput {
  readonly memberId: MemberId
  readonly members: readonly Member[]
  readonly groceries: readonly GroceryItem[]
  readonly settlement: SettlementResult
}

/**
 * The deterministic core of the fairness explanation feature: turns an
 * already-computed `SettlementResult` into the fact set for one member.
 * A pure function — same inputs always produce the same facts, with no AI,
 * no I/O, and no dependency on anything but the engine's own output and
 * the grocery records it summarized. This is what "the explanation should
 * always come from deterministic calculation data" means in code: every
 * `FairnessExplanationService` consumes this, never the raw settlement or
 * grocery data itself, so there is exactly one place amounts and item
 * lists are derived.
 */
export function buildFairnessExplanationFacts(input: BuildFairnessExplanationFactsInput): SettlementExplanationFacts {
  const { memberId, members, groceries, settlement } = input

  const balance = settlement.memberBalances.find((b) => b.memberId === memberId)
  if (balance === undefined) throw new MemberNotInSettlementError(memberId)

  const nameById = new Map(members.map((m) => [m.id, m.name] as const))
  const memberName = nameById.get(memberId) ?? memberId

  const direction: SettlementDirection =
    balance.netBalanceMinorUnits < 0 ? 'owes' : balance.netBalanceMinorUnits > 0 ? 'is_owed' : 'settled'

  const transfers: DebtTransferFact[] = settlement.transfers
    .filter((t) => t.from === memberId || t.to === memberId)
    .map((t) => {
      const counterpartyMemberId = t.from === memberId ? t.to : t.from
      return {
        counterpartyMemberId,
        counterpartyName: nameById.get(counterpartyMemberId) ?? counterpartyMemberId,
        amountMinorUnits: t.amountMinorUnits,
      }
    })

  return {
    memberId,
    memberName,
    currency: settlement.currency,
    direction,
    amountMinorUnits: Math.abs(balance.netBalanceMinorUnits),
    spentMinorUnits: balance.spentMinorUnits,
    consumedMinorUnits: balance.consumedMinorUnits,
    itemsPaidFor: groceries.filter((g) => g.paidByMemberId === memberId).map((g) => g.name),
    itemsSharedIn: groceries.filter((g) => g.sharedByMemberIds.includes(memberId)).map((g) => g.name),
    transfers,
  }
}
