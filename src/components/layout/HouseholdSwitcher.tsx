import { motion } from 'framer-motion'
import { House } from 'lucide-react'
import { cn } from '@/utils/cn'
import { springSnappy } from '@/animations/motion'

/** Only what this display-only component actually needs — deliberately not the full Household/MockHousehold shape. */
export interface HouseholdSummary {
  name: string
  memberCount: number
}

interface HouseholdSwitcherProps {
  household: HouseholdSummary
  /** Tighter layout for the mobile top bar. */
  compact?: boolean
  /** 'dark' styles the switcher for pine surfaces. */
  tone?: 'light' | 'dark'
  /** Icon-only tile for the collapsed sidebar. */
  iconOnly?: boolean
}

/** Placeholder household switcher. Visual only; switching arrives with real data. */
export function HouseholdSwitcher({
  household,
  compact = false,
  tone = 'light',
  iconOnly = false,
}: HouseholdSwitcherProps) {
  const dark = tone === 'dark'

  if (iconOnly) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={springSnappy}
        type="button"
        disabled
        aria-label={`${household.name} — household switching is coming soon`}
        title={`${household.name} (household switching is coming soon)`}
        className={cn(
          'mx-auto flex size-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-70',
          dark ? 'bg-pine-mint/15 text-pine-mint' : 'bg-mint-100 text-mint-700',
        )}
      >
        <House size={17} aria-hidden="true" />
      </motion.button>
    )
  }

  if (compact) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={springSnappy}
        type="button"
        disabled
        aria-label={`${household.name} — household switching is coming soon`}
        title="Household switching is coming soon"
        className="flex h-9 items-center gap-1.5 rounded-md bg-surface px-2.5 text-sm font-medium text-ink shadow-button disabled:cursor-not-allowed disabled:opacity-70"
      >
        <House size={14} aria-hidden="true" className="text-brand-600" />
        <span className="max-w-24 truncate">{household.name}</span>
        <span className="rounded-full bg-sand px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-muted">
          Soon
        </span>
      </motion.button>
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={springSnappy}
      type="button"
      disabled
      aria-label={`${household.name}, ${household.memberCount} members — household switching is coming soon`}
      title="Household switching is coming soon"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-80',
        dark ? 'bg-white/[0.06] ring-1 ring-white/10' : 'bg-canvas ring-1 ring-line',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-md',
          dark ? 'bg-pine-mint/15 text-pine-mint' : 'bg-mint-100 text-mint-700',
        )}
      >
        <House size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-semibold',
            dark ? 'text-pine-text' : 'text-ink',
          )}
        >
          {household.name}
        </span>
        <span className={cn('block text-xs', dark ? 'text-pine-muted' : 'text-muted')}>
          {household.memberCount} members
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide',
          dark ? 'bg-white/10 text-pine-muted' : 'bg-sand text-muted',
        )}
      >
        Soon
      </span>
    </motion.button>
  )
}
