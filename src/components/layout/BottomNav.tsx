import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { transitionBase } from '../../lib/motion'
import { NAV_ITEMS, type PageId } from '../../lib/navigation'

interface BottomNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

/** Mobile-only fixed bottom navigation with thumb-sized targets. */
export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.id === activePage
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 pb-2 pt-1.5 text-[0.6875rem] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40',
                active ? 'text-brand-700' : 'text-muted',
              )}
            >
              <span className="relative flex h-7 w-12 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    transition={transitionBase}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-brand-100"
                  />
                )}
                <Icon size={19} aria-hidden="true" className="relative" />
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
