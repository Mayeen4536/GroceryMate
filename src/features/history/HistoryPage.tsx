import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  HandCoins,
  History,
  Receipt,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { Badge, Button, Dropdown, Input, SegmentedControl } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useHistory } from '@/hooks/useHistory'
import type { HistorySession } from '@/types/history'
import { HistoryCard } from './HistoryCard'
import { HistoryPreviewDrawer } from './HistoryPreviewDrawer'

/** Dot marker on the timeline spine: reflects how "done" a session is. */
function timelineMeta(session: HistorySession): { icon: LucideIcon; chip: string } {
  if (session.status === 'in-progress') return { icon: Clock, chip: 'bg-sand text-ink-soft' }
  if (session.settlement === 'pending') return { icon: HandCoins, chip: 'bg-warning-500/15 text-warning-700' }
  return { icon: CheckCircle2, chip: 'bg-mint-100 text-brand-700' }
}

/** The Grocery History experience: a searchable, filterable timeline of past sessions. */
export function HistoryPage({ direction = 1 }: { direction?: number }) {
  const {
    sessions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    monthFilter,
    setMonthFilter,
    previewSession,
    setPreviewId,
    monthOptions,
    filtered,
    groups,
    clearFilters,
    exportSession,
    exportSessions,
  } = useHistory()

  return (
    <>
      <PageTransition direction={direction}>
        <motion.div variants={riseChild}>
          <PageHeader
            title="History"
            description="Past grocery sessions, saved for reference."
            action={
              <>
                <Badge tone="neutral" icon={History}>
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </Badge>
                {sessions.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={Download}
                    onClick={() => exportSessions(sessions)}
                  >
                    Export all
                  </Button>
                )}
              </>
            }
          />
        </motion.div>

        {sessions.length === 0 ? (
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
              title="No sessions logged yet."
              description="Once your household checks out a grocery run, it'll show up here as a timeline card."
            />
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={riseChild}
              className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Input
                placeholder="Search sessions, members, items…"
                iconLeft={Search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:max-w-xs"
                aria-label="Search history"
              />
              <div className="flex items-center gap-3">
                <SegmentedControl
                  aria-label="Filter by settlement"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'settled', label: 'Settled' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                />
                <Dropdown
                  value={monthFilter}
                  onChange={setMonthFilter}
                  options={monthOptions}
                  className="w-40"
                />
              </div>
            </motion.div>

            <motion.div variants={riseChild}>
              {filtered.length === 0 ? (
                <div className="card-surface flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center shadow-soft">
                  <p className="text-sm font-medium text-ink">No sessions match your filters</p>
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-10">
                  {groups.map(([monthLabel, monthSessions]) => (
                    <div key={monthLabel}>
                      <div className="mb-4 flex items-center gap-3">
                        <h2 className="shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">
                          {monthLabel}
                        </h2>
                        <span aria-hidden="true" className="h-px flex-1 bg-line" />
                        <span className="shrink-0 text-xs text-muted">
                          {monthSessions.length} {monthSessions.length === 1 ? 'session' : 'sessions'}
                        </span>
                      </div>

                      <ol className="relative space-y-4">
                        <span
                          aria-hidden="true"
                          className="absolute bottom-2 left-4 top-2 w-px bg-line"
                        />
                        <AnimatePresence initial={false}>
                          {monthSessions.map((session) => {
                            const meta = timelineMeta(session)
                            return (
                              <motion.li
                                key={session.id}
                                layout
                                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                                transition={transitionBase}
                                className="relative flex gap-4"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`relative z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-canvas ${meta.chip}`}
                                >
                                  <meta.icon size={14} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <HistoryCard
                                    session={session}
                                    onOpen={setPreviewId}
                                    onExport={exportSession}
                                  />
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

      <HistoryPreviewDrawer
        session={previewSession}
        onClose={() => setPreviewId(null)}
        onExport={exportSession}
      />
    </>
  )
}
