import { Download } from 'lucide-react'
import { AnimatedNumber, Avatar, Button, Drawer } from '@/components/ui'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { categoryById } from '@/utils/groceryCategory'
import { formatTaka } from '@/utils/currency'
import { firstName } from '@/utils/name'
import type { GroceryHistoryEntry } from '@/types/history'

interface HistoryPreviewDrawerProps {
  entry: GroceryHistoryEntry | null
  onClose: () => void
  onExport: (entry: GroceryHistoryEntry) => void
}

/** Full detail for one real, persisted grocery: amount, category, who paid, who shared, and any notes. */
export function HistoryPreviewDrawer({ entry, onClose, onExport }: HistoryPreviewDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const category = entry ? categoryById(entry.category) : null

  return (
    <Drawer
      open={entry != null}
      onClose={onClose}
      title="Grocery details"
      side={isDesktop ? 'right' : 'bottom'}
      panelClassName="sm:max-w-md"
      footer={
        entry ? (
          <Button iconLeft={Download} onClick={() => onExport(entry)}>
            Export
          </Button>
        ) : undefined
      }
    >
      {entry && category && (
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br shadow-soft ring-1 ring-ink/5 ${category.tile}`}
              >
                <category.icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight text-ink">{entry.name}</p>
                <p className="text-sm text-muted">{entry.dateLabel}</p>
              </div>
            </div>
            {entry.notes && <p className="mt-3 text-sm text-ink-soft">{entry.notes}</p>}
          </div>

          <div className="card-surface rounded-lg p-4 shadow-soft">
            <p className="text-xs text-muted">Amount</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-ink">
              <AnimatedNumber value={Number.parseFloat(entry.amount) || 0} format={formatTaka} />
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Paid by</span>
            <span className="flex items-center gap-2 rounded-full bg-sand py-1 pl-1 pr-3 text-sm text-ink-soft">
              <Avatar name={entry.paidByName} size="sm" />
              {entry.paidByName}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Shared by ({entry.sharedByNames.length})</span>
            <div className="flex flex-wrap gap-2">
              {entry.sharedByNames.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="flex items-center gap-2 rounded-full bg-sand py-1 pl-1 pr-3 text-sm text-ink-soft"
                >
                  <Avatar name={name} size="sm" />
                  {firstName(name)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
