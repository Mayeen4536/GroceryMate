import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import { PagePlaceholder } from './pages/PagePlaceholder'
import { Landing } from './pages/landing/Landing'
import { NAV_ITEMS, type PageId } from './lib/navigation'
import { easeSoft } from './lib/motion'
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
  const [entered, setEntered] = useState(false)
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
        <AnimatePresence mode="wait" initial={false}>
          {!entered ? (
            <motion.div
              key="landing"
              exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(4px)' }}
              transition={{ duration: 0.16, ease: easeSoft }}
            >
              <Landing onEnter={() => setEntered(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0, y: 10, scale: 0.99, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.28, ease: easeSoft }}
            >
              <AppShell activePage={activePage} onNavigate={navigate}>
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  <PagePlaceholder key={activePage} item={activeItem} direction={direction} />
                </AnimatePresence>
              </AppShell>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MotionConfig>
  )
}
