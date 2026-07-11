import { EllipsisVertical } from 'lucide-react'
import { Avatar } from '../ui'
import { cn } from '../../lib/cn'
import type { MockUser } from '../../data/mock'

interface UserProfileProps {
  user: MockUser
  /** 'dark' styles the row for pine surfaces. */
  tone?: 'light' | 'dark'
  /** Avatar-only for the collapsed sidebar. */
  avatarOnly?: boolean
}

/** Placeholder user profile row for the sidebar footer. Visual only. */
export function UserProfile({ user, tone = 'light', avatarOnly = false }: UserProfileProps) {
  const dark = tone === 'dark'

  if (avatarOnly) {
    return (
      <button
        type="button"
        title={`${user.name} (account settings are coming soon)`}
        className={cn(
          'mx-auto flex rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2',
          dark
            ? 'hover:bg-white/[0.06] focus-visible:ring-pine-mint/50'
            : 'hover:bg-sand focus-visible:ring-brand-500/40',
        )}
      >
        <Avatar name={user.name} size="sm" />
      </button>
    )
  }

  return (
    <button
      type="button"
      title="Account settings are coming soon"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2',
        dark
          ? 'hover:bg-white/[0.06] focus-visible:ring-pine-mint/50'
          : 'hover:bg-sand focus-visible:ring-brand-500/40',
      )}
    >
      <Avatar name={user.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-medium',
            dark ? 'text-pine-text' : 'text-ink',
          )}
        >
          {user.name}
        </span>
        <span
          className={cn('block truncate text-xs', dark ? 'text-pine-muted' : 'text-muted')}
        >
          {user.email}
        </span>
      </span>
      <EllipsisVertical
        size={16}
        aria-hidden="true"
        className={cn('shrink-0', dark ? 'text-pine-muted' : 'text-muted')}
      />
    </button>
  )
}
