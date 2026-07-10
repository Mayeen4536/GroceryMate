import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { transitionBase } from '../../lib/motion'
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        active ? 'text-brand-800' : 'text-ink-soft hover:bg-sand hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          transition={transitionBase}
          aria-hidden="true"
          className="absolute inset-0 rounded-md bg-brand-100"
        />
      )}
      <Icon size={18} aria-hidden="true" className="relative shrink-0" />
      <span className="relative">{item.label}</span>
    </button>
  )
}

/** Desktop-only sidebar: brand, household switcher, primary nav, user profile. */
export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 pb-5 pt-6">
        <Brand withTagline />
      </div>
      <div className="px-3 pb-5">
        <HouseholdSwitcher household={mockHousehold} />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={item.id === activePage}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <UserProfile user={mockUser} />
      </div>
    </aside>
  )
}
