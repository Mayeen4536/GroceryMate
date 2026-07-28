import type { BadgeTone } from '@/components/ui'
import type { HistorySession, SessionStatus } from '@/types/history'

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; tone: BadgeTone }> = {
  completed: { label: 'Completed', tone: 'success' },
  'in-progress': { label: 'In progress', tone: 'warning' },
}

/** Settlement label depends on the pending count, so it's a function rather than a static record. */
export function settlementStatusMeta(
  session: Pick<HistorySession, 'settlement' | 'payments'>,
): { label: string; tone: BadgeTone } {
  if (session.settlement === 'settled') return { label: 'All settled', tone: 'mint' }
  return { label: `${session.payments.length} pending`, tone: 'warning' }
}
