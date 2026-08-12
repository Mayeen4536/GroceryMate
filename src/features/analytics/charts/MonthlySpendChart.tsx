import { useState } from 'react'
import { motion } from 'framer-motion'
import type { MonthlySpend } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import { transitionBase } from '@/animations/motion'
import { BarTooltip } from './BarTooltip'
import { TableView } from './TableView'

function shortMonth(monthLabel: string): string {
  return monthLabel.slice(0, 3)
}

/** Trend over time, single series — a column per month, one flat hue, no legend needed. */
export function MonthlySpendChart({ data }: { data: MonthlySpend[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const max = Math.max(...data.map((point) => point.total), 1)

  return (
    <div>
      <div className="flex h-40 items-end justify-around gap-6 border-b border-line sm:justify-center sm:gap-10">
        {data.map((point, index) => (
          <div
            key={point.monthLabel}
            className="relative flex h-full flex-col items-center justify-end gap-2"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <BarTooltip active={activeIndex === index}>
              <span className="font-semibold">{formatTaka(point.total)}</span>{' '}
              <span className="text-canvas/70">· {point.monthLabel}</span>
            </BarTooltip>
            <span className="text-xs font-medium text-ink-soft tabular-nums">{formatTaka(point.total)}</span>
            <motion.div
              tabIndex={0}
              aria-label={`${point.monthLabel}: ${formatTaka(point.total)}`}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              initial={{ height: 0 }}
              animate={{ height: `${(point.total / max) * 100}%` }}
              transition={transitionBase}
              className="w-6 rounded-t-[4px] bg-series-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-6 pt-2 sm:justify-center sm:gap-10">
        {data.map((point) => (
          <span key={point.monthLabel} className="w-6 text-center text-xs text-muted">
            {shortMonth(point.monthLabel)}
          </span>
        ))}
      </div>
      <TableView
        caption="Monthly spending"
        columns={[
          { key: 'month', label: 'Month' },
          { key: 'total', label: 'Total spent' },
        ]}
        rows={data.map((point) => ({ month: point.monthLabel, total: formatTaka(point.total) }))}
      />
    </div>
  )
}
