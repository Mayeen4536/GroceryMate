import { AnimatePresence, motion } from 'framer-motion'
import { HandCoins } from 'lucide-react'
import { Card } from '@/components/ui'
import { transitionBase } from '@/animations/motion'
import type { TimelineEvent } from '@/types/settlement'

/**
 * Vertical payment timeline; new events slide in at the top. There is no
 * persisted payment history yet (see docs/HISTORY_INTEGRATION.md) — every
 * entry here is a real "Mark as paid" dismissal from this browser session,
 * never a fabricated record, so an empty list gets an honest empty state
 * rather than an invented event.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card padding="lg">
      <h2 className="text-base font-semibold tracking-tight text-ink">Payment timeline</h2>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No recorded payments yet.</p>
      ) : (
        <ol className="relative mt-4 space-y-4">
          <span aria-hidden="true" className="absolute bottom-2 left-3.5 top-2 w-px bg-line" />
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.li
                key={event.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={transitionBase}
                className="relative flex items-center gap-3"
              >
                <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-mint-100 text-brand-700 ring-4 ring-surface">
                  <HandCoins size={13} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{event.title}</span>
                <span className="shrink-0 text-xs text-muted">{event.when}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </Card>
  )
}
