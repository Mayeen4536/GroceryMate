import { downloadTextFile } from '../../lib/downloadTextFile'
import { initialGroceries } from '../../data/groceries'
import { initialMembers } from '../../data/members'
import { initialSettlements, formatTaka } from '../../data/settlements'
import { initialHistory } from '../../data/history'
import { mockHousehold } from '../../data/mock'

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
