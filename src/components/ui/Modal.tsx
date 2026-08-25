import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { transitionFast, springPanel, easeSoft } from '@/animations/motion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/utils/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Slot for actions, right-aligned under the content. */
  footer?: ReactNode
  /**
   * Keeps the modal centered even on narrow viewports, instead of anchoring
   * to the bottom like a sheet. Use this when the modal can be opened while
   * a bottom-anchored `Drawer` is already open — two stacked bottom sheets
   * visually collide, so the topmost confirmation needs to stay unambiguous.
   */
  alwaysCentered?: boolean
}

/** Centered dialog. Scales in naturally, closes on Escape or backdrop click. */
export function Modal({ open, onClose, title, children, footer, alwaysCentered = false }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const { isTopOverlay } = useFocusTrap(open, panelRef)

  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      // Only the front-most overlay reacts, so Escape backs out one dialog
      // at a time instead of closing every open Modal/Drawer at once.
      if (event.key === 'Escape' && isTopOverlay()) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose, isTopOverlay])

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex justify-center p-4',
            alwaysCentered ? 'items-center' : 'items-end sm:items-center',
          )}
        >
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
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springPanel }}
            exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.12, ease: easeSoft } }}
            className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-surface p-6 shadow-lifted focus:outline-none"
          >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
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
            <div className="min-h-0 overflow-y-auto">{children}</div>
            {footer && <div className="mt-6 flex shrink-0 justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
