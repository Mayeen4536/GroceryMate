import { downloadTextFile } from '@/services/downloadTextFile'
import { initialGroceries } from '@/store/groceries'
import { initialMembers } from '@/store/members'
import { initialSettlements } from '@/store/settlements'
import { initialHistory } from '@/store/history'
import { mockHousehold } from '@/store/household'
import { formatTaka } from '@/utils/currency'

/** Downloads a plain-text snapshot of the household's mock data. Client-side only. */
export function exportAllData(): void {
  const lines = [
    `GroceryMate export — ${mockHousehold.name}`,
    '',
    'Members',
    '-------',
    ...initialMembers.map((member) => `${member.name} (${member.email}) — ${member.role}`),
    '',
    'Groceries',
    '---------',
    ...initialGroceries.map(
      (item) =>
        `${item.name} × ${item.quantity} — ${formatTaka(Number.parseFloat(item.price) || 0)} (paid by ${item.paidBy})`,
    ),
    '',
    'Pending settlements',
    '--------------------',
    ...(initialSettlements.length > 0
      ? initialSettlements.map(
          (settlement) =>
            `${settlement.from} owes ${settlement.to} ${formatTaka(Number.parseFloat(settlement.amount) || 0)}`,
        )
      : ['Everyone is settled up.']),
    '',
    'Session history',
    '---------------',
    ...initialHistory.map(
      (session) =>
        `${session.dateLabel} — ${session.title} — ${formatTaka(Number.parseFloat(session.total) || 0)}`,
    ),
  ]

  downloadTextFile(`grocerymate-${mockHousehold.id}-export.txt`, lines.join('\n'))
}
