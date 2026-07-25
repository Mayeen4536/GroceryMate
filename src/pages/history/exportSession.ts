import { downloadTextFile } from '../../lib/downloadTextFile'
import { formatTaka } from '../../data/settlements'
import type { HistorySession } from '../../data/history'

function sessionReport(session: HistorySession): string {
  const lines = [
    `${session.title}`,
    `${session.dateLabel}`,
    '',
    `Members: ${session.members.join(', ')}`,
    `Status: ${session.status === 'completed' ? 'Completed' : 'In progress'}`,
    `Settlement: ${session.settlement === 'settled' ? 'All settled' : `${session.payments.length} pending`}`,
    '',
    'Items',
    '-----',
    ...session.items.map((item) => `${item.name} — ${formatTaka(Number.parseFloat(item.price) || 0)} (paid by ${item.paidBy})`),
    '',
    `Total: ${formatTaka(Number.parseFloat(session.total) || 0)}`,
  ]

  if (session.payments.length > 0) {
    lines.push(
      '',
      'Pending payments',
      '----------------',
      ...session.payments.map(
        (payment) => `${payment.from} owes ${payment.to} ${formatTaka(Number.parseFloat(payment.amount) || 0)}`,
      ),
    )
  }

  return lines.join('\n')
}

/** Downloads a single session as a plain-text summary. Client-side only. */
export function exportSession(session: HistorySession): void {
  const filename = `grocerymate-${session.sortKey}-${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
  downloadTextFile(filename, sessionReport(session))
}

/** Downloads a combined summary of several sessions. Client-side only. */
export function exportSessions(sessions: HistorySession[]): void {
  const content = sessions.map(sessionReport).join('\n\n' + '='.repeat(32) + '\n\n')
  downloadTextFile(`grocerymate-history-${sessions.length}-sessions.txt`, content)
}
