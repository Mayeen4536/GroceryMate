import { Avatar } from '../ui'
import { mockHousehold, mockUser } from '../../data/mock'
import { Brand } from './Brand'
import { HouseholdSwitcher } from './HouseholdSwitcher'

/** Mobile top bar: brand on the left, household switcher and profile on the right. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Brand />
        <div className="flex items-center gap-2">
          <HouseholdSwitcher household={mockHousehold} compact />
          <button
            type="button"
            title="Account settings are coming soon"
            aria-label={`Signed in as ${mockUser.name}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Avatar name={mockUser.name} size="sm" />
          </button>
        </div>
      </div>
    </header>
  )
}
