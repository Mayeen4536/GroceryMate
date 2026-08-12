import { useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui'
import type { MemberPersonalShared } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import { transitionBase } from '@/animations/motion'
import { BarTooltip } from './BarTooltip'
import { ChartLegend } from './ChartLegend'
import { TableView } from './TableView'
import { seriesBgClass } from './seriesColor'

const PERSONAL_SLOT = 0
const SHARED_SLOT = 1

/** Part-to-whole per member: bar length is their total, split into what only they consumed vs. their fair share of what was shared. */
export function PersonalSharedChart({ data }: { data: MemberPersonalShared[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const max = Math.max(...data.map((member) => member.total), 1)

  return (
    <div>
      <div className="mb-4">
        <ChartLegend
          entries={[
            { label: 'Personal', colorSlot: PERSONAL_SLOT },
            { label: 'Shared', colorSlot: SHARED_SLOT },
          ]}
        />
      </div>

      <ol className="space-y-4">
        {data.map((member) => {
          const widthPercent = (member.total / max) * 100
          return (
            <li key={member.memberId}>
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar name={member.name} tone={member.tone} size="sm" />
                <span className="truncate text-sm text-ink">{member.name}</span>
                <span className="ml-auto shrink-0 text-sm font-semibold text-ink tabular-nums">
                  {formatTaka(member.total)}
                </span>
              </div>
              <div
                className="grid h-5 gap-0.5 overflow-hidden rounded-full"
                style={{
                  width: `${widthPercent}%`,
                  gridTemplateColumns: `${member.personal}fr ${member.shared}fr`,
                }}
              >
                {member.personal > 0 && (
                  <div
                    className="relative h-full"
                    onMouseEnter={() => setActiveKey(`${member.memberId}-personal`)}
                    onMouseLeave={() => setActiveKey(null)}
                  >
                    <motion.div
                      tabIndex={0}
                      aria-label={`Personal: ${formatTaka(member.personal)}`}
                      onFocus={() => setActiveKey(`${member.memberId}-personal`)}
                      onBlur={() => setActiveKey(null)}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={transitionBase}
                      style={{ transformOrigin: 'left' }}
                      className={`h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${seriesBgClass(PERSONAL_SLOT)}`}
                    />
                    <BarTooltip active={activeKey === `${member.memberId}-personal`}>
                      <span className="font-semibold">{formatTaka(member.personal)}</span>{' '}
                      <span className="text-canvas/70">· Personal</span>
                    </BarTooltip>
                  </div>
                )}
                {member.shared > 0 && (
                  <div
                    className="relative h-full"
                    onMouseEnter={() => setActiveKey(`${member.memberId}-shared`)}
                    onMouseLeave={() => setActiveKey(null)}
                  >
                    <motion.div
                      tabIndex={0}
                      aria-label={`Shared: ${formatTaka(member.shared)}`}
                      onFocus={() => setActiveKey(`${member.memberId}-shared`)}
                      onBlur={() => setActiveKey(null)}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={transitionBase}
                      style={{ transformOrigin: 'left' }}
                      className={`h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${seriesBgClass(SHARED_SLOT)}`}
                    />
                    <BarTooltip active={activeKey === `${member.memberId}-shared`}>
                      <span className="font-semibold">{formatTaka(member.shared)}</span>{' '}
                      <span className="text-canvas/70">· Shared</span>
                    </BarTooltip>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <TableView
        caption="Personal vs. shared spending per member"
        columns={[
          { key: 'name', label: 'Member' },
          { key: 'personal', label: 'Personal' },
          { key: 'shared', label: 'Shared' },
          { key: 'total', label: 'Total' },
        ]}
        rows={data.map((member) => ({
          name: member.name,
          personal: formatTaka(member.personal),
          shared: formatTaka(member.shared),
          total: formatTaka(member.total),
        }))}
      />
    </div>
  )
}
