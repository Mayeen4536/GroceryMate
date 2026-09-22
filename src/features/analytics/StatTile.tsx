import type { LucideIcon } from 'lucide-react'
import { AnimatedNumber, Card, type CardAccent } from '@/components/ui'

export interface StatTileProps {
  icon: LucideIcon
  label: string
  accent?: CardAccent
  /** Primary numeric value, animated on change. Mutually exclusive with `valueLabel`. */
  value?: number
  format?: (value: number) => string
  /** Primary value as pre-formatted text (e.g. a name) instead of an animated number. */
  valueLabel?: string
  /** Muted line under the value. */
  sublabel?: string
}

/** One headline number (or fact) for the KPI row at the top of Analytics. */
export function StatTile({
  icon,
  label,
  accent = 'brand',
  value,
  format,
  valueLabel,
  sublabel,
}: StatTileProps) {
  return (
    <Card accent={accent} icon={icon} title={label} padding="md">
      <p className="truncate text-2xl font-semibold tracking-tight text-ink">
        {valueLabel ?? <AnimatedNumber value={value ?? 0} format={format} />}
      </p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
    </Card>
  )
}
