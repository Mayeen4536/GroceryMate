import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Banknote,
  Bell,
  ChevronRight,
  Database,
  Info,
  MessageSquare,
  Palette,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, Dropdown, Switch } from '../../components/ui'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageTransition } from '../../components/layout/PageTransition'
import { riseChild } from '../../lib/motion'
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, NOTIFICATION_SETTINGS } from '../../data/settings'
import { DarkModeToggle } from './DarkModeToggle'
import { ThemeAccentPicker } from './ThemeAccentPicker'
import { DataSection } from './DataSection'
import { InfoDrawer, type InfoVariant } from './InfoDrawer'
import { exportAllData } from './exportAllData'

const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  push: true,
  reminders: true,
  digest: false,
}

interface SettingsPageProps {
  direction?: number
  onBack: () => void
}

function LinkRow({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: LucideIcon
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sand text-ink-soft">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block truncate text-xs text-muted">{description}</span>
      </span>
      <ChevronRight
        size={16}
        aria-hidden="true"
        className="shrink-0 text-muted transition-transform duration-200 ease-soft group-hover:translate-x-0.5"
      />
    </button>
  )
}

/** The Settings experience: appearance, preferences, notifications, data, and support. */
export function SettingsPage({ direction = 1, onBack }: SettingsPageProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [accent, setAccent] = useState('brand')
  const [animations, setAnimations] = useState(true)
  const [currency, setCurrency] = useState('BDT')
  const [language, setLanguage] = useState('en')
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [infoVariant, setInfoVariant] = useState<InfoVariant | null>(null)

  const toggleNotification = (key: string) =>
    setNotifications((current) => ({ ...current, [key]: !current[key] }))

  const resetPreferences = () => {
    setDarkMode(false)
    setAccent('brand')
    setAnimations(true)
    setCurrency('BDT')
    setLanguage('en')
    setNotifications(DEFAULT_NOTIFICATIONS)
  }

  return (
    <>
      <PageTransition direction={direction}>
        <motion.div variants={riseChild}>
          <PageHeader
            title="Settings"
            description="Make GroceryMate feel like yours."
            action={
              <Button variant="ghost" size="sm" iconLeft={ArrowLeft} onClick={onBack}>
                Back
              </Button>
            }
          />
        </motion.div>

        <div className="space-y-5">
          <motion.div variants={riseChild}>
            <Card
              title="Appearance"
              subtitle="How GroceryMate looks on this device."
              icon={Palette}
              accent="violet"
            >
              <div className="divide-y divide-line">
                <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Dark mode</p>
                    <p className="mt-0.5 text-sm text-muted">Switch to a darker palette.</p>
                  </div>
                  <DarkModeToggle checked={darkMode} onChange={setDarkMode} />
                </div>
                <div className="flex flex-col gap-2.5 py-3.5">
                  <p className="text-sm font-medium text-ink">Theme</p>
                  <ThemeAccentPicker value={accent} onChange={setAccent} />
                </div>
                <div className="py-3.5 last:pb-0">
                  <Switch
                    label="Animations"
                    description="Motion and micro-interactions throughout the app."
                    checked={animations}
                    onChange={setAnimations}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card
              title="Preferences"
              subtitle="Currency and language for your household."
              icon={Banknote}
              accent="sky"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Dropdown
                  label="Currency"
                  value={currency}
                  onChange={setCurrency}
                  options={CURRENCY_OPTIONS}
                />
                <Dropdown
                  label="Language"
                  value={language}
                  onChange={setLanguage}
                  options={LANGUAGE_OPTIONS}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card
              title="Notifications"
              subtitle="Choose what GroceryMate lets you know about."
              icon={Bell}
              accent="gold"
            >
              <div className="divide-y divide-line">
                {NOTIFICATION_SETTINGS.map((setting) => (
                  <div key={setting.key} className="py-3.5 first:pt-0 last:pb-0">
                    <Switch
                      label={setting.label}
                      description={setting.description}
                      checked={notifications[setting.key] ?? false}
                      onChange={() => toggleNotification(setting.key)}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                Notifications are illustrative until push and email delivery are connected.
              </p>
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card
              title="Your data"
              subtitle="Export a snapshot, or clear preferences on this page."
              icon={Database}
              accent="brand"
            >
              <DataSection onExportAll={exportAllData} onConfirmDelete={resetPreferences} />
            </Card>
          </motion.div>

          <motion.div variants={riseChild}>
            <Card
              title="Support"
              subtitle="Learn more, or tell us what you think."
              icon={Info}
              accent="rose"
            >
              <div className="divide-y divide-line">
                <LinkRow
                  icon={Info}
                  label="About"
                  description="Version, credits, and what GroceryMate is."
                  onClick={() => setInfoVariant('about')}
                />
                <LinkRow
                  icon={MessageSquare}
                  label="Feedback"
                  description="Tell us what's working and what's not."
                  onClick={() => setInfoVariant('feedback')}
                />
                <LinkRow
                  icon={ShieldCheck}
                  label="Privacy"
                  description="How your household's data is handled."
                  onClick={() => setInfoVariant('privacy')}
                />
              </div>
            </Card>
          </motion.div>
        </div>
      </PageTransition>

      <InfoDrawer variant={infoVariant} onClose={() => setInfoVariant(null)} />
    </>
  )
}
