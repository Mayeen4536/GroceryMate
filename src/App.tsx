import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { PagePlaceholder } from '@/components/PagePlaceholder'
import { AssistantPage } from '@/features/assistant/AssistantPage'
import { GroceriesPage } from '@/features/groceries/GroceriesPage'
import { MembersPage } from '@/features/members/MembersPage'
import { SettlementsPage } from '@/features/settlements/SettlementsPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { Landing } from '@/features/landing/Landing'
import { useAppNavigation } from '@/hooks/useAppNavigation'
import { useShowDesignSystem } from '@/hooks/useShowDesignSystem'
import { easeSoft } from '@/animations/motion'
import { DesignSystemShowcase } from '@/showcase/DesignSystemShowcase'

export default function App() {
  const showDesignSystem = useShowDesignSystem()
  const { entered, enter, activePage, activeItem, direction, priorPage, navigate, openSettings } =
    useAppNavigation()

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
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  {activePage === 'assistant' ? (
                    <AssistantPage
                      key="assistant"
                      direction={direction}
                      onAddGroceries={() => navigate('groceries')}
                    />
                  ) : activePage === 'groceries' ? (
                    <GroceriesPage key="groceries" direction={direction} />
                  ) : activePage === 'members' ? (
                    <MembersPage key="members" direction={direction} />
                  ) : activePage === 'settlements' ? (
                    <SettlementsPage
                      key="settlements"
                      direction={direction}
                      onAddGroceries={() => navigate('groceries')}
                    />
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
              </AppShell>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MotionConfig>
  )
}
