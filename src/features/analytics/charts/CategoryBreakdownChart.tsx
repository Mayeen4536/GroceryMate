import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CategorySpend } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import { transitionBase } from '@/animations/motion'
import { BarTooltip } from './BarTooltip'
import { ChartLegend } from './ChartLegend'
import { TableView } from './TableView'
import { seriesBgClass } from './seriesColor'

/** Part-to-whole across categories: one 100%-wide stacked bar, safer to read at a glance than a donut once segments get close in size. */
export function CategoryBreakdownChart({ data }: { data: CategorySpend[] }) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null)

  return (
    <div>
      <div
        className="grid h-5 w-full gap-0.5 overflow-hidden rounded-full"
        style={{ gridTemplateColumns: data.map((entry) => `${entry.percent}fr`).join(' ') }}
      >
        {data.map((entry) => (
          <div
            key={entry.category}
            className="relative h-full"
            onMouseEnter={() => setActiveSlot(entry.colorSlot)}
            onMouseLeave={() => setActiveSlot(null)}
          >
            <motion.div
              tabIndex={0}
              aria-label={`${entry.label}: ${formatTaka(entry.total)}, ${entry.percent.toFixed(1)} percent of spend`}
              onFocus={() => setActiveSlot(entry.colorSlot)}
              onBlur={() => setActiveSlot(null)}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={transitionBase}
              style={{ transformOrigin: 'left' }}
              className={`flex h-full w-full items-center justify-center text-[11px] font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${seriesBgClass(entry.colorSlot)}`}
            >
              {entry.percent >= 15 && `${Math.round(entry.percent)}%`}
            </motion.div>
            <BarTooltip active={activeSlot === entry.colorSlot}>
              <span className="font-semibold">{formatTaka(entry.total)}</span>{' '}
              <span className="text-canvas/70">
                · {entry.label} ({entry.percent.toFixed(1)}%)
              </span>
            </BarTooltip>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <ChartLegend
          entries={data.map((entry) => ({
            label: `${entry.label} · ${entry.percent.toFixed(0)}%`,
            colorSlot: entry.colorSlot,
          }))}
        />
      </div>

      <TableView
        caption="Category breakdown"
        columns={[
          { key: 'category', label: 'Category' },
          { key: 'total', label: 'Total spent' },
          { key: 'percent', label: 'Share' },
        ]}
        rows={data.map((entry) => ({
          category: entry.label,
          total: formatTaka(entry.total),
          percent: `${entry.percent.toFixed(1)}%`,
        }))}
      />
    </div>
  )
}
