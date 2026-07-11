import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'
import { NAV_ITEMS, type PageId } from '../../lib/navigation'

interface BottomNavProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

/** Mobile-only floating dock on the pine surface, thumb-sized targets. */
export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 z-40 mx-auto max-w-sm rounded-xl bg-pine-950/95 p-1.5 shadow-dock backdrop-blur lg:hidden"
      style={{ bottom: 'calc(0.875rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.id === activePage
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.93 }}
              transition={springSnappy}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.625rem] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine-mint/50',
                active ? 'text-white' : 'text-pine-muted hover:text-pine-text',
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  transition={springSnappy}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg bg-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
                />
              )}
              <Icon
                size={19}
                aria-hidden="true"
                className={cn('relative transition-colors', active && 'text-pine-mint')}
              />
              <span className="relative max-w-full truncate px-1">{item.label}</span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
