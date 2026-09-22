import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, WifiOff, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui'
import { transitionBase } from '@/animations/motion'

/**
 * Surfaces the two states `vite-plugin-pwa`'s service worker registration can
 * reach: a new version waiting (reload to update — `registerType: 'prompt'`
 * means this never happens silently mid-session) and "ready to work offline"
 * right after the first successful install. Rendered once at the app root.
 */
export function PWAUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={transitionBase}
          role="status"
          className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-canvas shadow-panel-hover sm:inset-x-auto sm:right-6"
        >
          {needRefresh ? (
            <>
              <RefreshCw size={18} className="shrink-0 text-mint-100" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm">A new version of GroceryMate is ready.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateServiceWorker(true)}
                className="shrink-0"
              >
                Reload
              </Button>
            </>
          ) : (
            <>
              <WifiOff size={18} className="shrink-0 text-mint-100" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm">GroceryMate is ready to work offline.</p>
            </>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 text-canvas/60 hover:bg-white/10 hover:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
