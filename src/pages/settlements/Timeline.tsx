import { AnimatePresence, motion } from 'framer-motion'
import { HandCoins, ShoppingBasket, Sparkles, type LucideIcon } from 'lucide-react'
import { Card } from '../../components/ui'
import { cn } from '../../lib/cn'
import { transitionBase } from '../../lib/motion'
import type { TimelineEvent, TimelineKind } from '../../data/settlements'

const kindMeta: Record<TimelineKind, { icon: LucideIcon; chip: string }> = {
  payment: { icon: HandCoins, chip: 'bg-mint-100 text-brand-700' },
  session: { icon: ShoppingBasket, chip: 'bg-sand text-ink-soft' },
  square: { icon: Sparkles, chip: 'bg-member-gold-soft text-member-gold-strong' },
}

/** Vertical payment timeline; new events slide in at the top. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card padding="lg">
      <h2 className="text-base font-semibold tracking-tight text-ink">Payment timeline</h2>
      <ol className="relative mt-4 space-y-4">
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-3.5 top-2 w-px bg-line"
        />
        <AnimatePresence initial={false}>
          {events.map((event) => {
            const meta = kindMeta[event.kind]
            return (
              <motion.li
                key={event.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={transitionBase}
                className="relative flex items-center gap-3"
              >
                <span
                  className={cn(
                    'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface',
                    meta.chip,
                  )}
                >
                  <meta.icon size={13} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{event.title}</span>
                <span className="shrink-0 text-xs text-muted">{event.when}</span>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </Card>
  )
}
