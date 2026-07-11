import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { transitionFast, springPanel } from '../../lib/motion'

type DrawerSide = 'right' | 'bottom'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Edge the drawer slides from. Bottom reads as a sheet on mobile. */
  side?: DrawerSide
  /** Slot for actions pinned under the content. */
  footer?: ReactNode
}

const panelClasses: Record<DrawerSide, string> = {
  right: 'inset-y-0 right-0 h-full w-full max-w-sm rounded-l-2xl',
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
}

const panelMotion: Record<DrawerSide, { hidden: { x?: string; y?: string } }> = {
  right: { hidden: { x: '100%' } },
  bottom: { hidden: { y: '100%' } },
}

/** Sliding panel for secondary flows. Closes on Escape or backdrop click. */
export function Drawer({ open, onClose, title, children, side = 'right', footer }: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitionFast}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-ink/35"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ ...panelMotion[side].hidden, opacity: 1 }}
            animate={{ x: 0, y: 0, transition: springPanel }}
            exit={{ ...panelMotion[side].hidden, transition: { duration: 0.18, ease: 'easeIn' } }}
            className={cn(
              'absolute flex flex-col bg-surface shadow-lifted focus:outline-none',
              panelClasses[side],
            )}
          >
            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="group flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-sand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <X
                  size={16}
                  aria-hidden="true"
                  className="transition-transform duration-200 ease-soft group-hover:rotate-90"
                />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6">{children}</div>
            {footer && <div className="flex justify-end gap-2 p-6 pt-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
