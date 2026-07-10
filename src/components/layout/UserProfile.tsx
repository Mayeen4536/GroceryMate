import { EllipsisVertical } from 'lucide-react'
import { Avatar } from '../ui'
import type { MockUser } from '../../data/mock'

/** Placeholder user profile row for the sidebar footer. Visual only. */
export function UserProfile({ user }: { user: MockUser }) {
  return (
    <button
      type="button"
      title="Account settings are coming soon"
      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <Avatar name={user.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
        <span className="block truncate text-xs text-muted">{user.email}</span>
      </span>
      <EllipsisVertical size={16} aria-hidden="true" className="shrink-0 text-muted" />
    </button>
  )
}
