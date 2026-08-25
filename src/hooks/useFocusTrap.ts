import { useCallback, useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Module-level: every Modal/Drawer instance in the app shares one stack, so
// a dialog opened on top of another (e.g. a confirmation Modal inside a
// Drawer) can tell it's the front-most one. A React Context would work too,
// but there's nothing to configure per-subtree here — every overlay in the
// app should coordinate with every other one — so a shared module value is
// the simplest correct option.
let overlayStack: symbol[] = []

/**
 * Standard dialog behavior, shared by every Modal and Drawer in the app:
 * keeps Tab/Shift+Tab cycling within the panel while it's open, returns
 * focus to whatever opened it once it closes, and tracks this instance's
 * position in the stack of currently-open overlays. The returned
 * `isTopOverlay()` lets a caller check, at the moment a key is pressed,
 * whether it's the front-most open overlay — used so Escape closes only
 * the top-most dialog when one is nested inside another, instead of every
 * open overlay's own Escape handler firing for the same keypress.
 */
export function useFocusTrap(open: boolean, panelRef: RefObject<HTMLElement | null>) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const idRef = useRef(Symbol())

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    overlayStack = [...overlayStack, id]
    triggerRef.current = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      overlayStack = overlayStack.filter((entry) => entry !== id)
      triggerRef.current?.focus?.()
    }
  }, [open, panelRef])

  // Stable across renders (reads idRef/overlayStack at call time, not closure
  // time) so effects that depend on it don't re-subscribe every render.
  const isTopOverlay = useCallback(
    () => overlayStack.length > 0 && overlayStack[overlayStack.length - 1] === idRef.current,
    [],
  )

  return { isTopOverlay }
}
