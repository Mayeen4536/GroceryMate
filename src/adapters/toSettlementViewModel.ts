import type { MemberId } from '@/domain/ids'
import type { SettlementResult } from '@/engine'
import type { MemberStatus } from '@/types/member'
import type { Settlement as UISettlement } from '@/types/settlement'
import type { Member as UIMember } from '@/types/member'

/**
 * Turns the engine's id-keyed, minor-unit result back into the shapes the
 * existing UI already knows how to render — name-keyed, major-unit-as-a-
 * plain-number-string — so the display components themselves (`JourneyCard`,
 * `AmountRow`, `MemberCard`) don't need to know the engine exists at all.
 * This is the mirror image of `toEngineInput`: that one strips names and
 * decimal strings out; this one puts them back for display.
 *
 * Numbers stay unformatted (no "৳", no thousands separator) here — the
 * existing `formatTaka`/`AnimatedNumber` components already do that at
 * render time, exactly as they do for the mock data today. This layer
 * only ever produces the number to be formatted, never a formatted string.
 */

function toMajorUnits(minorUnits: number, minorUnitDigits: number): number {
  return minorUnits / 10 ** minorUnitDigits
}

function nameOf(membersById: ReadonlyMap<MemberId, UIMember>, id: MemberId): string {
  // Falls back to the id itself only if a member vanished between computing
  // the result and rendering it (shouldn't happen within one render pass,
  // since both come from the same `members` snapshot) — never blank.
  return membersById.get(id)?.name ?? id
}

export interface SettlementSummaryViewModel {
  readonly outstanding: string
  readonly receivers: readonly { readonly name: string; readonly amount: string }[]
  readonly owers: readonly { readonly name: string; readonly amount: string }[]
}

export interface MemberFinancialsViewModel {
  readonly memberId: MemberId
  readonly amountPaid: string
  readonly amountConsumed: string
  readonly netBalance: string
  readonly status: MemberStatus
}

export interface SettlementViewModel {
  readonly summary: SettlementSummaryViewModel
  /** Shaped exactly like the existing `Settlement` type, so `JourneyCard` needs no changes. */
  readonly transfers: readonly UISettlement[]
  readonly memberFinancials: readonly MemberFinancialsViewModel[]
}

function statusFor(member: UIMember, netBalanceMinorUnits: number): MemberStatus {
  if (member.status === 'invited') return 'invited'
  if (netBalanceMinorUnits > 0) return 'owed'
  if (netBalanceMinorUnits < 0) return 'owes'
  return 'settled'
}

export function toSettlementViewModel(
  result: SettlementResult,
  members: readonly UIMember[],
): SettlementViewModel {
  const digits = result.currency.minorUnitDigits
  const membersById = new Map(members.map((member) => [member.id as MemberId, member]))
  const major = (minorUnits: number) => String(toMajorUnits(minorUnits, digits))

  const receivers = result.memberBalances
    .filter((balance) => balance.netBalanceMinorUnits > 0)
    .map((balance) => ({ name: nameOf(membersById, balance.memberId), amount: major(balance.netBalanceMinorUnits) }))

  const owers = result.memberBalances
    .filter((balance) => balance.netBalanceMinorUnits < 0)
    .map((balance) => ({ name: nameOf(membersById, balance.memberId), amount: major(-balance.netBalanceMinorUnits) }))

  const outstandingMinorUnits = result.memberBalances
    .filter((balance) => balance.netBalanceMinorUnits > 0)
    .reduce((sum, balance) => sum + balance.netBalanceMinorUnits, 0)

  const transfers: UISettlement[] = result.transfers.map((transfer) => ({
    // Includes the amount, not just the from/to pair: a household-level "mark as
    // paid" dismissal (see useSettlements) is keyed by this id and is session-local,
    // not persisted — if the same two people's balance changes to a genuinely
    // different amount, this must read as a new, undismissed transfer rather than
    // silently staying hidden because a prior, different-sized debt shared their pair.
    id: `${transfer.from}::${transfer.to}::${transfer.amountMinorUnits}`,
    from: nameOf(membersById, transfer.from),
    to: nameOf(membersById, transfer.to),
    amount: major(transfer.amountMinorUnits),
  }))

  const memberFinancials: MemberFinancialsViewModel[] = result.memberBalances.map((balance) => {
    const member = membersById.get(balance.memberId)
    return {
      memberId: balance.memberId,
      amountPaid: major(balance.spentMinorUnits),
      amountConsumed: major(balance.consumedMinorUnits),
      netBalance: major(balance.netBalanceMinorUnits),
      status: member ? statusFor(member, balance.netBalanceMinorUnits) : 'settled',
    }
  })

  return {
    summary: { outstanding: major(outstandingMinorUnits), receivers, owers },
    transfers,
    memberFinancials,
  }
}
