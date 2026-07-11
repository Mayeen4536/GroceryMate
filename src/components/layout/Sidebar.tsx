import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
  collapsed: boolean
  onToggleCollapsed: () => void
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onNavigate: (page: PageId) => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex h-10 w-full items-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-mint/50',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
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
      {!collapsed && <span className="relative whitespace-nowrap">{item.label}</span>}
    </button>
  )
}

/** Desktop-only sidebar on the dark pine surface. Collapses to an icon rail. */
export function Sidebar({ activePage, onNavigate, collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col bg-pine-950 lg:flex',
        'transition-[width] duration-300 ease-soft',
        collapsed ? 'w-[4.5rem]' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex items-center pb-5 pt-6',
          collapsed ? 'flex-col gap-3 px-0' : 'justify-between pl-5 pr-3',
        )}
      >
        <Brand withTagline tone="dark" markOnly={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-pine-muted transition-colors hover:bg-white/[0.06] hover:text-pine-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-mint/50"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      <div className={cn('pb-5', collapsed ? 'px-3' : 'px-3')}>
        <HouseholdSwitcher household={mockHousehold} tone="dark" iconOnly={collapsed} />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={item.id === activePage}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="border-t border-white/[0.07] p-3">
        <UserProfile user={mockUser} tone="dark" avatarOnly={collapsed} />
      </div>
    </aside>
  )
}
