import { motion } from 'framer-motion'
import { AnimatedNumber, Avatar, Badge, Card } from '../../components/ui'
import { formatTaka, summaryMock } from '../../data/settlements'

const firstName = (name: string) => name.split(' ')[0]

function AmountRow({ name, amount, tone }: { name: string; amount: string; tone: 'receive' | 'owe' }) {
  return (
    <li className="flex items-center gap-2.5">
      <Avatar name={name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{firstName(name)}</span>
      <span
        className={
          tone === 'receive'
            ? 'text-sm font-semibold tabular-nums text-brand-700'
            : 'text-sm font-semibold tabular-nums text-warning-700'
        }
      >
        {formatTaka(Number.parseFloat(amount) || 0)}
      </span>
    </li>
  )
}

/** Outstanding-balance summary. Values are mock placeholders. */
export function SummaryCard({ pendingCount }: { pendingCount: number }) {
  return (
    <Card variant="highlighted" padding="lg" className="relative overflow-hidden">
      {/* Money quietly flowing along the top edge */}
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          className="absolute top-0 size-[3px] -translate-y-1/2 rounded-full bg-brand-400"
          initial={{ left: '-2%', opacity: 0 }}
          animate={{ left: ['-2%', '102%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.8, delay: index * 0.9, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs text-muted">Outstanding across Flat 4B</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-ink">
            <AnimatedNumber
              value={Number.parseFloat(summaryMock.outstanding) || 0}
              format={formatTaka}
            />
          </p>
          <div className="mt-3">
            <Badge tone="warning">
              {pendingCount} {pendingCount === 1 ? 'payment' : 'payments'} pending
            </Badge>
          </div>
        </div>

        <span aria-hidden="true" className="hidden w-px self-stretch bg-line md:block" />

        <div className="min-w-44">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Should receive
          </p>
          <ul className="space-y-2">
            {summaryMock.receivers.map((entry) => (
              <AmountRow key={entry.name} name={entry.name} amount={entry.amount} tone="receive" />
            ))}
          </ul>
        </div>

        <span aria-hidden="true" className="hidden w-px self-stretch bg-line md:block" />

        <div className="min-w-44">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Owe the house
          </p>
          <ul className="space-y-2">
            {summaryMock.owers.map((entry) => (
              <AmountRow key={entry.name} name={entry.name} amount={entry.amount} tone="owe" />
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
