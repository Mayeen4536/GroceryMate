import { lazy, Suspense } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { PagePlaceholder } from '@/components/PagePlaceholder'
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt'
import { Landing } from '@/features/landing/Landing'
import { useAppNavigation } from '@/hooks/useAppNavigation'
import { useGroceries } from '@/hooks/useGroceries'
import { useShowDesignSystem } from '@/hooks/useShowDesignSystem'
import { MOCK_GENERATED_ITEMS } from '@/store/assistantGenerated'
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

export default function App() {
  const showDesignSystem = useShowDesignSystem()
  const { entered, enter, activePage, activeItem, direction, priorPage, navigate, openSettings } =
    useAppNavigation()
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
          {!entered ? (
            <motion.div
              key="landing"
              exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(4px)' }}
              transition={{ duration: 0.16, ease: easeSoft }}
            >
              <Landing onEnter={enter} />
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
              <AppShell activePage={activePage} onNavigate={navigate} onOpenSettings={openSettings}>
                <Suspense fallback={<PageLoading />}>
                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    {activePage === 'assistant' ? (
                      <AssistantPage
                        key="assistant"
                        direction={direction}
                        onAddGroceries={() => {
                          groceries.addGenerated(MOCK_GENERATED_ITEMS)
                          navigate('groceries')
                        }}
                      />
                    ) : activePage === 'groceries' ? (
                      <GroceriesPage key="groceries" direction={direction} {...groceries} />
                    ) : activePage === 'members' ? (
                      <MembersPage key="members" direction={direction} />
                    ) : activePage === 'settlements' ? (
                      <SettlementsPage
                        key="settlements"
                        direction={direction}
                        onAddGroceries={() => navigate('groceries')}
                      />
                    ) : activePage === 'analytics' ? (
                      <AnalyticsPage key="analytics" direction={direction} />
                    ) : activePage === 'history' ? (
                      <HistoryPage key="history" direction={direction} />
                    ) : activePage === 'settings' ? (
                      <SettingsPage
                        key="settings"
                        direction={direction}
                        onBack={() => navigate(priorPage)}
                      />
                    ) : (
                      <PagePlaceholder key={activePage} item={activeItem} direction={direction} />
                    )}
                  </AnimatePresence>
                </Suspense>
              </AppShell>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MotionConfig>
  )
}
