import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui'

/**
 * Shown instead of a page's real content when `useSettlementResult` can't
 * produce a settlement from the current data (see its own doc comment).
 * Deliberately plain and non-animated — this is a fault state, not the
 * "nothing here yet" `EmptyState` — reusing the same danger icon-tile
 * pattern already used for the Remove Member confirmation, rather than
 * inventing a new visual language for errors.
 */
export function FinancialDataError({ message }: { message: string }) {
  return (
    <Card padding="lg">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
          <AlertTriangle size={19} aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Can't calculate this right now</p>
          <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
        </div>
      </div>
    </Card>
  )
}
