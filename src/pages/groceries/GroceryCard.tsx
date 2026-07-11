import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { AnimatedNumber, Avatar, Button } from '../../components/ui'
import { cn } from '../../lib/cn'
import { springGentle, springSnappy } from '../../lib/motion'
import { categoryById, type GroceryItem } from '../../data/groceries'

interface GroceryCardProps {
  item: GroceryItem
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  /** Live-preview mode: no hover lift, no actions. */
  preview?: boolean
  /** One-shot mint flash for freshly added items. */
  highlight?: boolean
}

const firstName = (name: string) => name.split(' ')[0]

export function GroceryCard({ item, onEdit, onDelete, preview = false, highlight = false }: GroceryCardProps) {
  const category = categoryById(item.category)
  const shownAvatars = item.sharedBy.slice(0, 4)
  const extraShared = item.sharedBy.length - shownAvatars.length

  const subline = [
    item.paidBy ? `Paid by ${firstName(item.paidBy)}` : 'Paid by …',
    item.sharedBy.length > 0 ? `${item.sharedBy.length} sharing` : 'not shared yet',
    item.notes || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <motion.div
      whileHover={preview ? undefined : { y: -2 }}
      transition={springGentle}
      className={cn(
        'card-surface group relative flex items-center gap-3 rounded-lg px-4 py-3 shadow-soft',
        !preview && 'transition-shadow duration-200 hover:shadow-panel-hover',
      )}
    >
      {highlight && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-lg bg-mint-100"
        />
      )}

      {/* Category gem; swaps with a small twist when the category changes */}
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={category.id}
            initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 12 }}
            transition={springSnappy}
            className={cn(
              'flex size-10 items-center justify-center rounded-lg bg-linear-to-br shadow-soft ring-1 ring-ink/5',
              category.tile,
            )}
          >
            <category.icon size={18} aria-hidden="true" />
          </motion.span>
        </AnimatePresence>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {item.name || 'New grocery'}
          {item.quantity > 1 && (
            <span className="font-normal text-muted"> × {item.quantity}</span>
          )}
        </p>
        <p className="truncate text-xs text-muted">{subline}</p>
      </div>

      <div className="relative hidden -space-x-1.5 sm:flex">
        {shownAvatars.map((name) => (
          <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
        ))}
        {extraShared > 0 && (
          <span className="flex size-8 items-center justify-center rounded-full bg-sand text-[0.6875rem] font-semibold text-ink-soft ring-2 ring-surface">
            +{extraShared}
          </span>
        )}
      </div>

      <p className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
        <AnimatedNumber value={Number.parseFloat(item.price) || 0} />
      </p>

      {!preview && (
        <div className="flex gap-1 transition-all duration-200 sm:translate-x-1 sm:opacity-0 sm:group-focus-within:translate-x-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Pencil}
            aria-label={`Edit ${item.name}`}
            className="w-9 px-0"
            onClick={() => onEdit?.(item.id)}
          />
          <Button
            variant="ghost"
            size="sm"
            iconLeft={Trash2}
            aria-label={`Delete ${item.name}`}
            className="w-9 px-0 text-danger-600 hover:bg-danger-50 hover:text-danger-700"
            onClick={() => onDelete?.(item.id)}
          />
        </div>
      )}
    </motion.div>
  )
}
