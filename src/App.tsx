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

export default function App() {
  const showDesignSystem = useShowDesignSystem()
  const [activePage, setActivePage] = useState<PageId>('overview')
  const activeItem = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0]

  return (
    <MotionConfig reducedMotion="user">
      {showDesignSystem ? (
        <DesignSystemShowcase />
      ) : (
        <AppShell activePage={activePage} onNavigate={setActivePage}>
          <AnimatePresence mode="wait" initial={false}>
            <PagePlaceholder key={activePage} item={activeItem} />
          </AnimatePresence>
        </AppShell>
      )}
    </MotionConfig>
  )
}
