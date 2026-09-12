import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { AnimatedNumber, Avatar, Card } from '@/components/ui'
import { springGentle } from '@/animations/motion'
import { formatTaka } from '@/utils/currency'
import { categoryById } from '@/utils/groceryCategory'
import { firstName } from '@/utils/name'
import type { GroceryHistoryEntry } from '@/types/history'

interface HistoryCardProps {
  entry: GroceryHistoryEntry
  onOpen: (id: string) => void
  onExport: (entry: GroceryHistoryEntry) => void
}

/** A single real, persisted grocery as a timeline card: date, category, who paid/shared, amount. */
export function HistoryCard({ entry, onOpen, onExport }: HistoryCardProps) {
  const category = categoryById(entry.category)
  const shownNames = entry.sharedByNames.slice(0, 4)
  const extraShared = entry.sharedByNames.length - shownNames.length

  return (
    <Card
      variant="interactive"
      onClick={() => onOpen(entry.id)}
      aria-label={`Open ${entry.name} from ${entry.dateLabel}`}
      className="group relative"
    >
      <div className="relative flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-linear-to-br from-brand-100 to-mint-100 text-brand-700 shadow-soft ring-1 ring-ink/5"
        >
          <span className="text-[0.625rem] font-semibold uppercase tracking-wide">{entry.monthShort}</span>
          <span className="text-lg font-bold leading-tight tabular-nums">{entry.day}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">{entry.name}</p>
              <p className="text-xs text-muted">{entry.dateLabel}</p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${category.chip}`}
            >
              <category.icon size={13} aria-hidden="true" />
              {category.label}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {shownNames.map((name, index) => (
                  <Avatar key={`${name}-${index}`} name={name} size="sm" className="ring-2 ring-surface" />
                ))}
                {extraShared > 0 && (
                  <span className="flex size-8 items-center justify-center rounded-full bg-sand text-[0.6875rem] font-semibold text-ink-soft ring-2 ring-surface">
                    +{extraShared}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">Paid by {firstName(entry.paidByName)}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <motion.button
                type="button"
                aria-label={`Export ${entry.name}`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={springGentle}
                onClick={(event) => {
                  event.stopPropagation()
                  onExport(entry)
                }}
                className="flex size-8 items-center justify-center rounded-md text-muted transition-[background-color,color,opacity] duration-200 hover:bg-sand hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Download size={15} aria-hidden="true" />
              </motion.button>
              <p className="text-lg font-bold tabular-nums tracking-tight text-ink">
                <AnimatedNumber value={Number.parseFloat(entry.amount) || 0} format={formatTaka} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
