import { downloadTextFile } from '@/services/downloadTextFile'
import { formatTaka } from '@/utils/currency'
import type { GroceryHistoryEntry } from '@/types/history'

function entryReport(entry: GroceryHistoryEntry): string {
  const lines = [
    `${entry.name}`,
    `${entry.dateLabel}`,
    '',
    `Category: ${entry.category}`,
    `Amount: ${formatTaka(Number.parseFloat(entry.amount) || 0)}`,
    `Paid by: ${entry.paidByName}`,
    `Shared by: ${entry.sharedByNames.join(', ')}`,
  ]
  if (entry.notes) lines.push('', `Notes: ${entry.notes}`)
  return lines.join('\n')
}

/** Downloads a single real grocery entry as a plain-text summary. Client-side only. */
export function exportEntry(entry: GroceryHistoryEntry): void {
  const filename = `grocerymate-${entry.createdAt.slice(0, 10)}-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`
  downloadTextFile(filename, entryReport(entry))
}

/** Downloads a combined summary of several real grocery entries. Client-side only. */
export function exportEntries(entries: readonly GroceryHistoryEntry[]): void {
  const content = entries.map(entryReport).join('\n\n' + '='.repeat(32) + '\n\n')
  downloadTextFile(`grocerymate-history-${entries.length}-entries.txt`, content)
}
