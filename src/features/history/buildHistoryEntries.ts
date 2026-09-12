import { buildMemberNameResolver } from '@/members/resolveMemberName'
import { dayOfMonth, fullDateLabel, monthShort, monthYearLabel } from '@/utils/date'
import type { GroceryItem } from '@/types/grocery'
import type { GroceryHistoryEntry } from '@/types/history'
import type { Member } from '@/types/member'

/**
 * Turns the household's real, currently-loaded groceries into History
 * entries — one per grocery, no fabricated "session" grouping. Preserves
 * whatever order `groceries` is already in (the persistence layer loads
 * newest-first), so this never re-sorts; a caller relying on chronological
 * order should pass already-ordered data in.
 *
 * `members` is the *full* roster (including archived) — an id that no
 * longer resolves falls back to "Unknown member" rather than guessing;
 * this never merges two different member ids just because they share a
 * display name (see docs/HISTORY_INTEGRATION.md's identity notes).
 */
export function buildHistoryEntries(
  groceries: readonly GroceryItem[],
  members: readonly Member[],
): GroceryHistoryEntry[] {
  const nameOf = buildMemberNameResolver(members)
  return groceries.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    amount: item.price,
    notes: item.notes,
    createdAt: item.createdAt,
    day: dayOfMonth(item.createdAt),
    monthShort: monthShort(item.createdAt),
    dateLabel: fullDateLabel(item.createdAt),
    monthLabel: monthYearLabel(item.createdAt),
    paidByMemberId: item.paidByMemberId,
    paidByName: nameOf(item.paidByMemberId),
    sharedByMemberIds: item.sharedByMemberIds,
    sharedByNames: item.sharedByMemberIds.map(nameOf),
  }))
}
