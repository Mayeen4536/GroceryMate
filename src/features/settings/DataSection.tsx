import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, Download, Trash2 } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { transitionBase } from '@/animations/motion'

interface DataSectionProps {
  onExportAll: () => void
  onConfirmDelete: () => void
}

/** Export and delete actions. Delete resets this page's own preferences only. */
export function DataSection({ onExportAll, onConfirmDelete }: DataSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [justCleared, setJustCleared] = useState(false)

  const confirm = () => {
    setModalOpen(false)
    onConfirmDelete()
    setJustCleared(true)
    window.setTimeout(() => setJustCleared(false), 3200)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Export your data</p>
          <p className="mt-0.5 text-sm text-muted">
            Download a text snapshot of groceries, members, settlements, and history.
          </p>
        </div>
        <Button variant="secondary" iconLeft={Download} onClick={onExportAll} className="shrink-0">
          Export all data
        </Button>
      </div>

      <div className="my-5 h-px bg-line" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Delete all data</p>
          <p className="mt-0.5 text-sm text-muted">
            Resets currency, language, appearance, and notification preferences to their defaults.
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {justCleared ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={transitionBase}
              className="flex shrink-0 items-center gap-2 rounded-md bg-mint-100 px-3.5 py-2.5 text-sm font-medium text-brand-800"
            >
              <Check size={16} aria-hidden="true" />
              Preferences reset
            </motion.div>
          ) : (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitionBase}
              className="shrink-0"
            >
              <Button variant="danger" iconLeft={Trash2} onClick={() => setModalOpen(true)}>
                Delete all data
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Delete all data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" iconLeft={Trash2} onClick={confirm}>
              Yes, delete everything
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-ink-soft">
            This clears every preference on this page — currency, language, appearance, and
            notifications — back to their defaults. It doesn't touch your groceries, members, or
            settlement history; those live on their own pages.
          </p>
        </div>
      </Modal>
    </>
  )
}
