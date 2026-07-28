import { motion } from 'framer-motion'
import { CalendarClock, Download, HandCoins } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge, Card } from '@/components/ui'
import { springGentle } from '@/animations/motion'
import { formatTaka } from '@/utils/currency'
import { SESSION_STATUS_META, settlementStatusMeta } from '@/constants/historyStatus'
import type { HistorySession } from '@/types/history'

interface HistoryCardProps {
  session: HistorySession
  onOpen: (id: string) => void
  onExport: (session: HistorySession) => void
}

/** A single grocery session as a rich timeline card: date, members, total, settlement and completion. */
export function HistoryCard({ session, onOpen, onExport }: HistoryCardProps) {
  const shownAvatars = session.members.slice(0, 4)
  const extraMembers = session.members.length - shownAvatars.length

  return (
    <Card
      variant="interactive"
      onClick={() => onOpen(session.id)}
      aria-label={`Open ${session.title} from ${session.dateLabel}`}
      className="group relative"
    >
      <div className="relative flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-linear-to-br from-brand-100 to-mint-100 text-brand-700 shadow-soft ring-1 ring-ink/5"
        >
          <span className="text-[0.625rem] font-semibold uppercase tracking-wide">
            {session.monthShort}
          </span>
          <span className="text-lg font-bold leading-tight tabular-nums">{session.day}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                {session.title}
              </p>
              <p className="text-xs text-muted">{session.dateLabel}</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              <Badge tone={SESSION_STATUS_META[session.status].tone} icon={CalendarClock}>
                {SESSION_STATUS_META[session.status].label}
              </Badge>
              <Badge tone={settlementStatusMeta(session).tone} icon={HandCoins}>
                {settlementStatusMeta(session).label}
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {shownAvatars.map((name) => (
                  <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
                ))}
                {extraMembers > 0 && (
                  <span className="flex size-8 items-center justify-center rounded-full bg-sand text-[0.6875rem] font-semibold text-ink-soft ring-2 ring-surface">
                    +{extraMembers}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">
                {session.items.length} {session.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <motion.button
                type="button"
                aria-label={`Export ${session.title}`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={springGentle}
                onClick={(event) => {
                  event.stopPropagation()
                  onExport(session)
                }}
                className="flex size-8 items-center justify-center rounded-md text-muted opacity-0 transition-[background-color,color,opacity] duration-200 hover:bg-sand hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 group-hover:opacity-100"
              >
                <Download size={15} aria-hidden="true" />
              </motion.button>
              <p className="text-lg font-bold tabular-nums tracking-tight text-ink">
                <AnimatedNumber value={Number.parseFloat(session.total) || 0} format={formatTaka} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
