import { useState } from 'react'
import { NAV_ITEMS } from '@/config/navigation'
import type { PageId } from '@/types/navigation'

const pageIndex = (page: PageId) => NAV_ITEMS.findIndex((item) => item.id === page)

/** Owns the app shell's top-level navigation state: landing gate, active page, and slide direction. */
export function useAppNavigation() {
  const [entered, setEntered] = useState(false)
  const [activePage, setActivePage] = useState<PageId>('overview')
  // 1 = navigating forward in the nav order, -1 = backward; drives the slide direction.
  const [direction, setDirection] = useState(1)
  // Settings isn't a nav-order destination; remember where to return on "Back".
  const [priorPage, setPriorPage] = useState<PageId>('overview')
  const activeItem = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0]

  const navigate = (page: PageId) => {
    if (page === activePage) return
    const isSettingsTransition = page === 'settings' || activePage === 'settings'
    setDirection(isSettingsTransition ? 1 : pageIndex(page) >= pageIndex(activePage) ? 1 : -1)
    setActivePage(page)
  }

  const openSettings = () => {
    if (activePage === 'settings') return
    setPriorPage(activePage)
    navigate('settings')
  }

  return {
    entered,
    enter: () => setEntered(true),
    activePage,
    activeItem,
    direction,
    priorPage,
    navigate,
    openSettings,
  }
}
