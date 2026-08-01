import type { Currency } from '@/domain/Currency'
import type { GroceryItem } from '@/domain/GroceryItem'
import type { Member } from '@/domain/Member'
import type { MemberId } from '@/domain/ids'
import {
  DuplicateMemberError,
  DuplicateSharedByError,
  EmptySharedByError,
  InvalidAmountError,
  MixedCurrencyError,
  UnknownMemberError,
} from './errors'
import { splitEvenly } from './splitEvenly'
import type { MemberSettlementSummary } from './types'

/**
 * Computes, for every member, how much they spent (paid for groceries) and
 * how much they consumed (their fair share of what was bought), and the net
 * of the two. Responsibility: turn a household's raw grocery log into a
 * per-member financial summary — nothing about how any resulting debt gets
 * paid off, which is `minimizeTransactions`'s job.
 *
 * Every member appears in the result exactly once, sorted by id, including
 * members who neither paid for nor shared anything (all zeros for them).
 */
export function calculateMemberBalances(
  members: readonly Member[],
  groceries: readonly GroceryItem[],
  currency: Currency,
): readonly MemberSettlementSummary[] {
  const memberIds = new Set<MemberId>()
  for (const member of members) {
    if (memberIds.has(member.id)) throw new DuplicateMemberError(member.id)
    memberIds.add(member.id)
  }

  const spent = new Map<MemberId, number>()
  const consumed = new Map<MemberId, number>()
  for (const id of memberIds) {
    spent.set(id, 0)
    consumed.set(id, 0)
  }

  for (const item of groceries) {
    if (item.unitPrice.currency.code !== currency.code) {
      throw new MixedCurrencyError(item.id, currency.code, item.unitPrice.currency.code)
    }
    if (!Number.isInteger(item.unitPrice.minorUnits) || item.unitPrice.minorUnits < 0) {
      throw new InvalidAmountError(item.id, 'unitPrice.minorUnits must be a non-negative integer')
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new InvalidAmountError(item.id, 'quantity must be a positive integer')
    }
    if (!memberIds.has(item.paidByMemberId)) {
      throw new UnknownMemberError(item.paidByMemberId, `paid for item "${item.id}"`)
    }
    if (item.sharedByMemberIds.length === 0) {
      throw new EmptySharedByError(item.id)
    }

    const seenSharers = new Set<MemberId>()
    for (const sharerId of item.sharedByMemberIds) {
      if (seenSharers.has(sharerId)) throw new DuplicateSharedByError(item.id, sharerId)
      seenSharers.add(sharerId)
      if (!memberIds.has(sharerId)) {
        throw new UnknownMemberError(sharerId, `shares item "${item.id}"`)
      }
    }

    const totalMinorUnits = item.unitPrice.minorUnits * item.quantity

    spent.set(item.paidByMemberId, (spent.get(item.paidByMemberId) ?? 0) + totalMinorUnits)

    const shares = splitEvenly(totalMinorUnits, item.sharedByMemberIds)
    for (const [sharerId, shareMinorUnits] of shares) {
      consumed.set(sharerId, (consumed.get(sharerId) ?? 0) + shareMinorUnits)
    }
  }

  return [...memberIds].sort().map((id) => {
    const spentMinorUnits = spent.get(id) ?? 0
    const consumedMinorUnits = consumed.get(id) ?? 0
    return {
      memberId: id,
      spentMinorUnits,
      consumedMinorUnits,
      netBalanceMinorUnits: spentMinorUnits - consumedMinorUnits,
    }
  })
}
