import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '@/config/navigation'
import type { PageId } from '@/types/navigation'

const pageIndex = (page: PageId) => NAV_ITEMS.findIndex((item) => item.id === page)

const pageIdFromPath = (pathname: string): PageId => {
  const id = pathname.slice(1)
  return (NAV_ITEMS.some((item) => item.id === id) || id === 'settings' ? id : 'groceries') as PageId
}

/**
 * Owns the app shell's top-level navigation: active page, slide direction,
 * and the "return to" page for Settings — backed by real browser routes
 * (via react-router) so Back/Forward, refresh, and direct links all work.
 * `entered`/`enter` reflect the landing gate (path "/" vs an app route).
 */
export function useAppNavigation() {
  const location = useLocation()
  const rrNavigate = useNavigate()

  const entered = location.pathname !== '/'
  const activePage = pageIdFromPath(location.pathname)
  const activeItem = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0]

  // 1 = navigating forward in the nav order, -1 = backward; drives the slide direction.
  const [direction, setDirection] = useState(1)
  // Settings isn't a nav-order destination; remember where to return on "Back".
  const [priorPage, setPriorPage] = useState<PageId>('groceries')
  const prevPageRef = useRef(activePage)

  // Recomputes on every route change, whether it came from our own navigate()
  // below or from the browser's Back/Forward buttons.
  useEffect(() => {
    const prevPage = prevPageRef.current
    if (prevPage === activePage) return
    const isSettingsTransition = activePage === 'settings' || prevPage === 'settings'
    setDirection(isSettingsTransition ? 1 : pageIndex(activePage) >= pageIndex(prevPage) ? 1 : -1)
    if (prevPage !== 'settings') setPriorPage(prevPage)
    prevPageRef.current = activePage
  }, [activePage])

  const navigate = (page: PageId) => {
    if (page === activePage) return
    rrNavigate(`/${page}`)
  }

  const openSettings = () => {
    if (activePage === 'settings') return
    rrNavigate('/settings')
  }

  return {
    entered,
    enter: () => rrNavigate('/groceries'),
    activePage,
    activeItem,
    direction,
    priorPage,
    navigate,
    openSettings,
  }
}
