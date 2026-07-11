import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import { PagePlaceholder } from './pages/PagePlaceholder'
import { NAV_ITEMS, type PageId } from './lib/navigation'
import { DesignSystemShowcase } from './showcase/DesignSystemShowcase'

/** The design-system showcase stays reachable at /#design-system for component review. */
function useShowDesignSystem(): boolean {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash === '#design-system'
}

const pageIndex = (page: PageId) => NAV_ITEMS.findIndex((item) => item.id === page)

export default function App() {
  const showDesignSystem = useShowDesignSystem()
  const [activePage, setActivePage] = useState<PageId>('overview')
  // 1 = navigating forward in the nav order, -1 = backward; drives the slide direction.
  const [direction, setDirection] = useState(1)
  const activeItem = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0]

  const navigate = (page: PageId) => {
    if (page === activePage) return
    setDirection(pageIndex(page) >= pageIndex(activePage) ? 1 : -1)
    setActivePage(page)
  }

  return (
    <MotionConfig reducedMotion="user">
      {showDesignSystem ? (
        <DesignSystemShowcase />
      ) : (
        <AppShell activePage={activePage} onNavigate={navigate}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <PagePlaceholder key={activePage} item={activeItem} direction={direction} />
          </AnimatePresence>
        </AppShell>
      )}
    </MotionConfig>
  )
}
