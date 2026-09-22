import { seriesBgClass } from './seriesColor'

export interface ChartLegendEntry {
  label: string
  colorSlot: number
}

/**
 * The dependable identity channel for any chart with 2+ series — color
 * alone is never enough. A single-series chart doesn't need this; its
 * title already says what's plotted.
 */
export function ChartLegend({ entries }: { entries: ChartLegendEntry[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
      {entries.map((entry) => (
        <li key={entry.label} className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${seriesBgClass(entry.colorSlot)}`}
          />
          {entry.label}
        </li>
      ))}
    </ul>
  )
}
