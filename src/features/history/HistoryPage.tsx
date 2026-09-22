import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Download, HandCoins, History, Receipt, Search } from 'lucide-react'
import { Badge, Button, Card, Dropdown, Input } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useHistory } from '@/hooks/useHistory'
import { categoryById } from '@/utils/groceryCategory'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import { HistoryCard } from './HistoryCard'
import { HistoryPreviewDrawer } from './HistoryPreviewDrawer'

interface HistoryPageProps {
  direction?: number
  groceries: readonly GroceryItem[]
  members: readonly Member[]
  /** Same load state `GroceriesPage` shows — History is built from this exact data, never a second query, so it must be just as honest on a failed load (see docs/HISTORY_INTEGRATION.md). */
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

/** The Grocery History experience: a searchable, filterable timeline of real, persisted groceries. */
export function HistoryPage({
  direction = 1,
  groceries,
  members,
  loading = false,
  error = null,
  onRetry,
}: HistoryPageProps) {
  const {
    entries,
    search,
    setSearch,
    monthFilter,
    setMonthFilter,
    previewEntry,
    setPreviewId,
    monthOptions,
    filtered,
    groups,
    clearFilters,
    exportEntry,
    exportEntries,
  } = useHistory(groceries, members)

  return (
    <>
      <PageTransition direction={direction}>
        <motion.div variants={riseChild}>
          <PageHeader
            title="History"
            description="Every grocery your household has logged, in one real timeline."
            action={
              <>
                <Badge tone="neutral" icon={History}>
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </Badge>
                {entries.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={Download}
                    onClick={() => exportEntries(entries)}
                  >
                    Export all
                  </Button>
                )}
              </>
            }
          />
        </motion.div>

        {loading ? (
          <motion.div variants={riseChild} className="flex justify-center py-16">
            <div
              role="status"
              aria-label="Loading history"
              className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600"
            />
          </motion.div>
        ) : error ? (
          <motion.div variants={riseChild}>
            <Card padding="lg">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm font-semibold text-ink">Couldn't load history</p>
                <p className="text-sm text-ink-soft">{error}</p>
                {onRetry && (
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    Try again
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div variants={riseChild}>
            <EmptyState
              icon={History}
              tileClassName="from-member-sky-soft to-mint-50 text-member-sky-strong"
              glowClassName="bg-member-sky-strong/10"
              ringClassName="border-member-sky-strong/30"
              orbitChips={[
                { icon: Receipt, toneClassName: 'text-member-gold-strong' },
                { icon: HandCoins, toneClassName: 'text-brand-600' },
                { icon: CalendarClock, toneClassName: 'text-member-sky-strong' },
              ]}
              title="No groceries logged yet."
              description="Once your household adds a grocery, it'll show up here as a timeline entry."
            />
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={riseChild}
              className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Input
                placeholder="Search groceries, members, notes…"
                iconLeft={Search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:max-w-xs"
                aria-label="Search history"
              />
              <Dropdown
                value={monthFilter}
                onChange={setMonthFilter}
                options={monthOptions}
                className="w-40"
              />
            </motion.div>

            <motion.div variants={riseChild}>
              {filtered.length === 0 ? (
                <div className="card-surface flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center shadow-soft">
                  <p className="text-sm font-medium text-ink">No entries match your filters</p>
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-10">
                  {groups.map(([monthLabel, monthEntries]) => (
                    <div key={monthLabel}>
                      <div className="mb-4 flex items-center gap-3">
                        <h2 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
                          {monthLabel}
                        </h2>
                        <span aria-hidden="true" className="h-px flex-1 bg-line" />
                        <span className="shrink-0 text-xs text-muted">
                          {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      <ol className="relative space-y-4">
                        <span aria-hidden="true" className="absolute bottom-2 left-4 top-2 w-px bg-line" />
                        <AnimatePresence initial={false}>
                          {monthEntries.map((entry) => {
                            const category = categoryById(entry.category)
                            return (
                              <motion.li
                                key={entry.id}
                                layout
                                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                                transition={transitionBase}
                                className="relative flex gap-4"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`relative z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br ring-4 ring-canvas ${category.tile}`}
                                >
                                  <category.icon size={14} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <HistoryCard entry={entry} onOpen={setPreviewId} onExport={exportEntry} />
                                </div>
                              </motion.li>
                            )
                          })}
                        </AnimatePresence>
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </PageTransition>

      <HistoryPreviewDrawer entry={previewEntry} onClose={() => setPreviewId(null)} onExport={exportEntry} />
    </>
  )
}
