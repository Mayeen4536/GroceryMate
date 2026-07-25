import { Download } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge, Button, Drawer } from '../../components/ui'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { categoryById } from '../../data/groceries'
import { formatTaka } from '../../data/settlements'
import type { HistorySession } from '../../data/history'

interface HistoryPreviewDrawerProps {
  session: HistorySession | null
  onClose: () => void
  onExport: (session: HistorySession) => void
}

const firstName = (name: string) => name.split(' ')[0]

/** Full detail for one grocery session: items, members, and any pending payments. */
export function HistoryPreviewDrawer({ session, onClose, onExport }: HistoryPreviewDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <Drawer
      open={session != null}
      onClose={onClose}
      title="Session details"
      side={isDesktop ? 'right' : 'bottom'}
      panelClassName="sm:max-w-md"
      footer={
        session ? (
          <Button iconLeft={Download} onClick={() => onExport(session)}>
            Export session
          </Button>
        ) : undefined
      }
    >
      {session && (
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <p className="text-lg font-semibold tracking-tight text-ink">{session.title}</p>
            <p className="text-sm text-muted">{session.dateLabel}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={session.status === 'completed' ? 'success' : 'warning'}>
                {session.status === 'completed' ? 'Completed' : 'In progress'}
              </Badge>
              <Badge tone={session.settlement === 'settled' ? 'mint' : 'warning'}>
                {session.settlement === 'settled' ? 'All settled' : `${session.payments.length} pending`}
              </Badge>
            </div>
            {session.notes && <p className="mt-3 text-sm text-ink-soft">{session.notes}</p>}
          </div>

          <div className="card-surface rounded-lg p-4 shadow-soft">
            <p className="text-xs text-muted">Total</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-ink">
              <AnimatedNumber value={Number.parseFloat(session.total) || 0} format={formatTaka} />
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">
              Members ({session.members.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {session.members.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-2 rounded-full bg-sand py-1 pl-1 pr-3 text-sm text-ink-soft"
                >
                  <Avatar name={name} size="sm" />
                  {firstName(name)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Items ({session.items.length})</span>
            <ul className="space-y-1.5">
              {session.items.map((item) => {
                const category = categoryById(item.category)
                return (
                  <li
                    key={item.name}
                    className="card-surface flex items-center gap-3 rounded-lg px-3.5 py-2.5 shadow-soft"
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-md bg-linear-to-br ${category.tile}`}
                    >
                      <category.icon size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      {item.name}
                      <span className="text-muted"> · paid by {firstName(item.paidBy)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                      {formatTaka(Number.parseFloat(item.price) || 0)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {session.payments.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Pending payments</span>
              <ul className="space-y-1.5">
                {session.payments.map((payment) => (
                  <li
                    key={`${payment.from}-${payment.to}`}
                    className="card-surface flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 shadow-soft"
                  >
                    <Avatar name={payment.from} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      {firstName(payment.from)} owes {firstName(payment.to)}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-warning-700">
                      {formatTaka(Number.parseFloat(payment.amount) || 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
