import { AnimatedNumber, Avatar, Badge, Card } from '@/components/ui'
import { FlowDots } from '@/components/experience'
import { useHousehold } from '@/household/useHousehold'
import { formatTaka } from '@/utils/currency'
import { firstName } from '@/utils/name'
import type { SettlementSummaryViewModel } from '@/adapters'

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

interface SummaryCardProps {
  pendingCount: number
  summary: SettlementSummaryViewModel
}

/** Outstanding-balance summary, derived from the real settlement engine result. */
export function SummaryCard({ pendingCount, summary }: SummaryCardProps) {
  const { household } = useHousehold()

  return (
    <Card variant="highlighted" padding="lg" className="relative overflow-hidden">
      {/* Money quietly flowing along the top edge */}
      <FlowDots axis="x" duration={2.8} staggerDelay={0.9} />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs text-muted">Outstanding across {household?.name ?? 'your household'}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-ink">
            <AnimatedNumber value={Number.parseFloat(summary.outstanding) || 0} format={formatTaka} />
          </p>
          <div className="mt-3">
            <Badge tone="warning">
              {pendingCount} {pendingCount === 1 ? 'payment' : 'payments'} pending
            </Badge>
          </div>
        </div>

        <span aria-hidden="true" className="hidden w-px self-stretch bg-line md:block" />

        <div className="min-w-44">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Should receive</p>
          <ul className="space-y-2">
            {summary.receivers.map((entry) => (
              <AmountRow key={entry.name} name={entry.name} amount={entry.amount} tone="receive" />
            ))}
          </ul>
        </div>

        <span aria-hidden="true" className="hidden w-px self-stretch bg-line md:block" />

        <div className="min-w-44">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Owe the house</p>
          <ul className="space-y-2">
            {summary.owers.map((entry) => (
              <AmountRow key={entry.name} name={entry.name} amount={entry.amount} tone="owe" />
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
