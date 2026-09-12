import { buildHistoryEntries } from '@/features/history/buildHistoryEntries'
import { downloadTextFile } from '@/services/downloadTextFile'
import { formatTaka } from '@/utils/currency'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import type { Settlement } from '@/types/settlement'

export interface ExportAllDataInput {
  householdId: string
  householdName: string
  members: readonly Member[]
  groceries: readonly GroceryItem[]
  /** Real, engine-derived pending transfers (see `useSettlementResult`) — `[]` when the settlement calculation itself failed, never a guess. */
  transfers: readonly Settlement[]
}

/**
 * Downloads a plain-text snapshot of the household's real, persisted data —
 * members, groceries, real settlement transfers, and the same real grocery
 * history shown on the History page (see docs/HISTORY_INTEGRATION.md).
 * Deliberately excluded: appearance/notification preferences (device-local,
 * not household data) and the settlement "payment timeline" (nothing
 * persisted exists yet for it — see `useSettlements`). Nothing here is
 * fabricated to fill a section; an empty section says so honestly.
 */
export function exportAllData({ householdId, householdName, members, groceries, transfers }: ExportAllDataInput): void {
  const nameOf = new Map(members.map((member) => [member.id, member.name] as const))
  const historyEntries = buildHistoryEntries(groceries, members)

  const lines = [
    `GroceryMate export — ${householdName}`,
    '',
    'Members',
    '-------',
    ...(members.length > 0
      ? members.map((member) => `${member.name}${member.email ? ` (${member.email})` : ''} — ${member.role}`)
      : ['No members yet.']),
    '',
    'Groceries',
    '---------',
    ...(groceries.length > 0
      ? groceries.map(
          (item) =>
            `${item.name} × ${item.quantity} — ${formatTaka(Number.parseFloat(item.price) || 0)} (paid by ${nameOf.get(item.paidByMemberId) ?? 'Unknown member'})`,
        )
      : ['No groceries logged yet.']),
    '',
    'Pending settlements',
    '--------------------',
    ...(transfers.length > 0
      ? transfers.map(
          (settlement) => `${settlement.from} owes ${settlement.to} ${formatTaka(Number.parseFloat(settlement.amount) || 0)}`,
        )
      : ['Everyone is settled up.']),
    '',
    'Grocery history',
    '---------------',
    ...(historyEntries.length > 0
      ? historyEntries.map(
          (entry) => `${entry.dateLabel} — ${entry.name} — ${formatTaka(Number.parseFloat(entry.amount) || 0)}`,
        )
      : ['No history yet.']),
  ]

  downloadTextFile(`grocerymate-${householdId}-export.txt`, lines.join('\n'))
}
