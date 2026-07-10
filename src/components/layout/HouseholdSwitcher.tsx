import { ChevronsUpDown, House } from 'lucide-react'
import type { MockHousehold } from '../../data/mock'

interface HouseholdSwitcherProps {
  household: MockHousehold
  /** Tighter layout for the mobile top bar. */
  compact?: boolean
}

/** Placeholder household switcher. Visual only; switching arrives with real data. */
export function HouseholdSwitcher({ household, compact = false }: HouseholdSwitcherProps) {
  if (compact) {
    return (
      <button
        type="button"
        title="Household switching is coming soon"
        className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-ink transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <House size={14} aria-hidden="true" className="text-brand-600" />
        <span className="max-w-24 truncate">{household.name}</span>
        <ChevronsUpDown size={13} aria-hidden="true" className="text-muted" />
      </button>
    )
  }

  return (
    <button
      type="button"
      title="Household switching is coming soon"
      className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-canvas px-3 py-2.5 text-left transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-100 text-mint-700">
        <House size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{household.name}</span>
        <span className="block text-xs text-muted">{household.memberCount} members</span>
      </span>
      <ChevronsUpDown size={14} aria-hidden="true" className="shrink-0 text-muted" />
    </button>
  )
}
