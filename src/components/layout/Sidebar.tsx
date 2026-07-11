import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'
import { NAV_ITEMS, type NavItem, type PageId } from '../../lib/navigation'
import { mockHousehold, mockUser } from '../../data/mock'
import { Brand } from './Brand'
import { HouseholdSwitcher } from './HouseholdSwitcher'
import { UserProfile } from './UserProfile'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

function SidebarNavItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate: (page: PageId) => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-mint/50',
        active ? 'text-white' : 'text-pine-muted hover:bg-white/[0.05] hover:text-pine-text',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          transition={springSnappy}
          aria-hidden="true"
          className="absolute inset-0 rounded-md bg-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
        />
      )}
      <Icon
        size={18}
        aria-hidden="true"
        className={cn('relative shrink-0 transition-colors', active && 'text-pine-mint')}
      />
      <span className="relative">{item.label}</span>
    </button>
  )
}

/** Desktop-only sidebar on the dark pine surface: brand, household, nav, profile. */
export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-pine-950 lg:flex">
      <div className="px-5 pb-5 pt-6">
        <Brand withTagline tone="dark" />
      </div>
      <div className="px-3 pb-5">
        <HouseholdSwitcher household={mockHousehold} tone="dark" />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={item.id === activePage}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-white/[0.07] p-3">
        <UserProfile user={mockUser} tone="dark" />
      </div>
    </aside>
  )
}
