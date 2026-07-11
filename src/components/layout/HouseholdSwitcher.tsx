import { motion } from 'framer-motion'
import { ChevronsUpDown, House } from 'lucide-react'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'
import type { MockHousehold } from '../../data/mock'

interface HouseholdSwitcherProps {
  household: MockHousehold
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
        title={`${household.name} (household switching is coming soon)`}
        className={cn(
          'mx-auto flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2',
          dark
            ? 'bg-pine-mint/15 text-pine-mint hover:bg-pine-mint/25 focus-visible:ring-pine-mint/50'
            : 'bg-mint-100 text-mint-700 hover:bg-mint-200 focus-visible:ring-brand-500/40',
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
        title="Household switching is coming soon"
        className="flex h-9 items-center gap-1.5 rounded-md bg-surface px-2.5 text-sm font-medium text-ink shadow-button transition-colors hover:bg-sand/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <House size={14} aria-hidden="true" className="text-brand-600" />
        <span className="max-w-24 truncate">{household.name}</span>
        <ChevronsUpDown size={13} aria-hidden="true" className="text-muted" />
      </motion.button>
    )
  }

  return (
    <motion.button
        whileTap={{ scale: 0.97 }}
        transition={springSnappy}
      type="button"
      title="Household switching is coming soon"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2',
        dark
          ? 'bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.09] focus-visible:ring-pine-mint/50'
          : 'bg-canvas ring-1 ring-line hover:ring-brand-300 focus-visible:ring-brand-500/40',
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
      <ChevronsUpDown
        size={14}
        aria-hidden="true"
        className={cn('shrink-0', dark ? 'text-pine-muted' : 'text-muted')}
      />
    </motion.button>
  )
}
