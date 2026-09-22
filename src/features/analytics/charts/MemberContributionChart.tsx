import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui'
import type { MemberSpend } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import { transitionBase } from '@/animations/motion'
import { TableView } from './TableView'
import { seriesBgClass } from './seriesColor'

/** Tell distinct series apart — each member keeps their own fixed color slot, ranked by what they paid. */
export function MemberContributionChart({ data }: { data: MemberSpend[] }) {
  const max = Math.max(...data.map((member) => member.total), 1)

  return (
    <div>
      <ol className="space-y-3.5">
        {data.map((member) => (
          <li key={member.memberId}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={member.name} tone={member.tone} size="sm" />
                <span className="truncate text-sm text-ink">{member.name}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                {formatTaka(member.total)}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-sand">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={transitionBase}
                style={{ width: `${(member.total / max) * 100}%`, transformOrigin: 'left' }}
                className={`h-full rounded-full ${seriesBgClass(member.colorSlot)}`}
              />
            </div>
          </li>
        ))}
      </ol>
      <TableView
        caption="Member contribution"
        columns={[
          { key: 'name', label: 'Member' },
          { key: 'total', label: 'Total paid' },
          { key: 'percent', label: 'Share' },
        ]}
        rows={data.map((member) => ({
          name: member.name,
          total: formatTaka(member.total),
          percent: `${member.percent.toFixed(1)}%`,
        }))}
      />
    </div>
  )
}
