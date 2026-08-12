import { motion } from 'framer-motion'
import type { TopGroceryItem } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import { transitionBase } from '@/animations/motion'
import { TableView } from './TableView'

/** Ranked magnitude, single series — length alone shows the ranking, so every bar takes the same flat hue. */
export function TopGroceriesChart({ data }: { data: TopGroceryItem[] }) {
  const max = Math.max(...data.map((item) => item.total), 1)

  return (
    <div>
      <ol className="space-y-3.5">
        {data.map((item, index) => (
          <li key={item.name}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-ink">
                <span className="mr-1.5 tabular-nums text-xs font-medium text-muted">{index + 1}.</span>
                {item.name}
                {item.purchaseCount > 1 && (
                  <span className="ml-1.5 text-xs text-muted">bought {item.purchaseCount}×</span>
                )}
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">{formatTaka(item.total)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-sand">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.total / max) * 100}%` }}
                transition={transitionBase}
                className="h-full rounded-full bg-series-1"
              />
            </div>
          </li>
        ))}
      </ol>
      <TableView
        caption="Most expensive groceries"
        columns={[
          { key: 'rank', label: '#' },
          { key: 'name', label: 'Item' },
          { key: 'total', label: 'Total spent' },
          { key: 'count', label: 'Times bought' },
        ]}
        rows={data.map((item, index) => ({
          rank: String(index + 1),
          name: item.name,
          total: formatTaka(item.total),
          count: String(item.purchaseCount),
        }))}
      />
    </div>
  )
}
