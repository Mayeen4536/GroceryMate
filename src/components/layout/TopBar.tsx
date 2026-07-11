import { useEffect, useState } from 'react'
import { Avatar } from '../ui'
import { cn } from '../../lib/cn'
import { mockHousehold, mockUser } from '../../data/mock'
import { Brand } from './Brand'
import { HouseholdSwitcher } from './HouseholdSwitcher'

/** Mobile top bar: brand on the left, household switcher and profile on the right. */
export function TopBar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-canvas/85 backdrop-blur-md transition-shadow duration-200 lg:hidden',
        scrolled && 'shadow-[0_1px_0_rgb(30_26_22/0.08),0_4px_16px_-8px_rgb(30_26_22/0.1)]',
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Brand />
        <div className="flex items-center gap-2">
          <HouseholdSwitcher household={mockHousehold} compact />
          <button
            type="button"
            title="Account settings are coming soon"
            aria-label={`Signed in as ${mockUser.name}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <Avatar name={mockUser.name} size="sm" />
          </button>
        </div>
      </div>
    </header>
  )
}
