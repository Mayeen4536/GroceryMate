import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from './useAuth'

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600"
      />
    </div>
  )
}

function ProfileLoadError({ onRetry, onSignOut }: { onRetry: () => void; onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">We couldn’t load your profile</h1>
        <p className="mt-1.5 text-sm text-muted">
          You’re signed in, but something went wrong fetching your account details.
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Gates the main application. Unauthenticated visitors are sent to sign
 * in; an authenticated session with no profile yet (still loading, or a
 * fetch failure) shows a loading/error state rather than rendering the
 * shell with a fabricated identity — Sidebar/TopBar/SettingsPage can
 * therefore assume `profile` is always present once their children
 * actually render.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, profile, profileLoading, profileError, retryProfile, signOut } = useAuth()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'signed-out') return <Navigate to="/sign-in" replace />
  if (profileError) return <ProfileLoadError onRetry={retryProfile} onSignOut={signOut} />
  if (profileLoading || !profile) return <FullScreenSpinner />
  return <>{children}</>
}

/** Gates /sign-in and /sign-up: an already-authenticated visitor is sent into the app. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'signed-in') return <Navigate to="/groceries" replace />
  return <>{children}</>
}
