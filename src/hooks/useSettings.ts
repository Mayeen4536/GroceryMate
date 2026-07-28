import { useState } from 'react'
import { exportAllData } from '@/services/settingsExportService'

export type InfoVariant = 'about' | 'privacy' | 'feedback'

const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  push: true,
  reminders: true,
  digest: false,
}

/** Owns the Settings feature's state: every toggle/dropdown, and the export/reset actions. */
export function useSettings() {
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

  return {
    darkMode,
    setDarkMode,
    accent,
    setAccent,
    animations,
    setAnimations,
    currency,
    setCurrency,
    language,
    setLanguage,
    notifications,
    toggleNotification,
    infoVariant,
    setInfoVariant,
    resetPreferences,
    exportAllData,
  }
}
