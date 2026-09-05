import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, LogOut } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/auth/useAuth'
import { transitionBase } from '@/animations/motion'

/** Real display_name (editable, saves on blur) and email (read-only) from Migration 4's auth profile, plus sign out. */
export function AccountSection() {
  const { profile, updateDisplayName, signOut } = useAuth()

  const [draft, setDraft] = useState(profile?.displayName ?? '')
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Re-seed the draft when the saved display name itself changes (a
  // successful save elsewhere, or the profile just finished loading) —
  // adjusted during render, not via an effect, so it doesn't clobber
  // whatever the user is actively typing:
  // https://react.dev/learn/you-might-not-need-an-effect
  const lastSavedNameRef = useRef(profile?.displayName)
  if (profile?.displayName !== lastSavedNameRef.current) {
    lastSavedNameRef.current = profile?.displayName
    setDraft(profile?.displayName ?? '')
  }

  useEffect(() => () => clearTimeout(savedTimer.current), [])

  async function commit() {
    const trimmed = draft.trim()
    if (!profile || trimmed === profile.displayName) {
      setDraft(profile?.displayName ?? '')
      return
    }
    if (!trimmed) {
      setError('Display name can’t be empty.')
      setDraft(profile.displayName)
      return
    }
    const result = await updateDisplayName(trimmed)
    if (result.error) {
      setError(result.error)
      setDraft(profile.displayName)
      return
    }
    setError(undefined)
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    setSigningOut(true)
    // No explicit navigation after this: as soon as the session clears,
    // <ProtectedRoute> (already wrapping wherever this renders) redirects
    // to /sign-in on its own — an explicit navigate('/') here would race
    // that redirect and make the destination nondeterministic.
    await signOut()
  }

  if (!profile) return null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Input
          label="Display name"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(undefined)
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          error={error}
          className="flex-1"
        />
        <div className="pt-7 sm:pt-8">
          <AnimatePresence mode="wait" initial={false}>
            {saved && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={transitionBase}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700"
              >
                <Check size={15} aria-hidden="true" />
                Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Input label="Email" value={profile.email} disabled readOnly />

      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Sign out</p>
          <p className="mt-0.5 text-sm text-muted">End your session on this device.</p>
        </div>
        <Button variant="secondary" iconLeft={LogOut} onClick={handleSignOut} disabled={signingOut} className="shrink-0">
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </div>
  )
}
