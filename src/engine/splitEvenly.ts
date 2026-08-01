import type { MemberId } from '@/domain/ids'

/**
 * Splits a whole amount into as-equal-as-possible integer shares across the
 * given participants, with the shares always summing back to exactly
 * `totalMinorUnits` — never a cent more, never a cent less, never a
 * fraction of one.
 *
 * `totalMinorUnits / participantCount` is integer division here (via
 * `Math.floor` on two non-negative integers within JS's safe integer
 * range), not floating-point money math — the quotient is always the
 * mathematically exact truncated result, unlike computing with fractional
 * currency amounts. The remainder left over (at most `participantCount - 1`
 * minor units) is handed out one each, in a fixed, sorted order of
 * participant id, so the same participants always receive the extra cent
 * regardless of what order they were passed in.
 */
export function splitEvenly(
  totalMinorUnits: number,
  participantIds: readonly MemberId[],
): ReadonlyMap<MemberId, number> {
  const sortedIds = [...participantIds].sort()
  const count = sortedIds.length
  const baseShare = Math.floor(totalMinorUnits / count)
  const remainder = totalMinorUnits - baseShare * count

  const shares = new Map<MemberId, number>()
  sortedIds.forEach((id, index) => {
    shares.set(id, baseShare + (index < remainder ? 1 : 0))
  })
  return shares
}
