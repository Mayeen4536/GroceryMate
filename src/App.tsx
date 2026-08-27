import { lazy, Suspense } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt'
import { Landing } from '@/features/landing/Landing'
import { useAppNavigation } from '@/hooks/useAppNavigation'
import { useGroceries } from '@/hooks/useGroceries'
import { useShowDesignSystem } from '@/hooks/useShowDesignSystem'
import { easeSoft } from '@/animations/motion'

// Code-split every destination past the landing page: a first visit only
// needs Landing + whichever one page it lands on, not all seven feature
// pages plus the internal design-system showcase in a single bundle.
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const AssistantPage = lazy(() => import('@/features/assistant/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const GroceriesPage = lazy(() => import('@/features/groceries/GroceriesPage').then((m) => ({ default: m.GroceriesPage })))
const MembersPage = lazy(() => import('@/features/members/MembersPage').then((m) => ({ default: m.MembersPage })))
const SettlementsPage = lazy(() => import('@/features/settlements/SettlementsPage').then((m) => ({ default: m.SettlementsPage })))
const HistoryPage = lazy(() => import('@/features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DesignSystemShowcase = lazy(() =>
  import('@/showcase/DesignSystemShowcase').then((m) => ({ default: m.DesignSystemShowcase })),
)

/** Shown only while a page's chunk is still downloading — near-instant after its first visit. */
function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
    </div>
  )
}

/**
 * The seven app-shell routes. A real path per page (rather than in-memory
 * state) is what makes browser Back/Forward and refresh-on-route work.
 */
function AppRoutes({ groceries }: { groceries: ReturnType<typeof useGroceries> }) {
  const location = useLocation()
  const { activePage, direction, priorPage, navigate, openSettings } = useAppNavigation()

  return (
    <AppShell activePage={activePage} onNavigate={navigate} onOpenSettings={openSettings}>
      <Suspense fallback={<PageLoading />}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/assistant"
              element={
                <AssistantPage
                  key="assistant"
                  direction={direction}
                  onAddGroceries={(items) => {
                    groceries.addGenerated(items)
                    navigate('groceries')
                  }}
                />
              }
            />
            <Route
              path="/groceries"
              element={<GroceriesPage key="groceries" direction={direction} {...groceries} />}
            />
            <Route path="/members" element={<MembersPage key="members" direction={direction} />} />
            <Route
              path="/settlements"
              element={
                <SettlementsPage
                  key="settlements"
                  direction={direction}
                  onAddGroceries={() => navigate('groceries')}
                />
              }
            />
            <Route path="/analytics" element={<AnalyticsPage key="analytics" direction={direction} />} />
            <Route path="/history" element={<HistoryPage key="history" direction={direction} />} />
            <Route
              path="/settings"
              element={
                <SettingsPage key="settings" direction={direction} onBack={() => navigate(priorPage)} />
              }
            />
            {/* Any other path under the app shell falls back to the default page. */}
            <Route path="*" element={<Navigate to="/groceries" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  const showDesignSystem = useShowDesignSystem()
  const location = useLocation()
  const navigate = useNavigate()
  const isLanding = location.pathname === '/'
  // Owned here, not inside GroceriesPage: the Assistant page adds to this same
  // list, so both pages need to share one instance rather than each holding
  // their own copy.
  const groceries = useGroceries()

  return (
    <MotionConfig reducedMotion="user">
      <PWAUpdatePrompt />
      {showDesignSystem ? (
        <Suspense fallback={<PageLoading />}>
          <DesignSystemShowcase />
        </Suspense>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {isLanding ? (
            <motion.div
              key="landing"
              exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(4px)' }}
              transition={{ duration: 0.16, ease: easeSoft }}
            >
              <Landing onEnter={() => navigate('/groceries')} />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0, y: 10, scale: 0.99, filter: 'blur(6px)' }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                transitionEnd: { filter: 'none' },
              }}
              transition={{ duration: 0.28, ease: easeSoft }}
            >
              <AppRoutes groceries={groceries} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MotionConfig>
  )
}
