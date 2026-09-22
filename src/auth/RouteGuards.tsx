import { useState, type ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { isSafeJoinRedirect } from '@/invite/routes'
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

/**
 * Gates /sign-in and /sign-up: an already-authenticated visitor is sent
 * into the app — or, if this exact page load carried a safe
 * `?redirect=/join/:token` (e.g. a second tab, or landing here already
 * signed in), back to that invite instead. See src/invite/routes.ts.
 *
 * The redirect target is captured ONCE, on this component's first render,
 * via `useState`'s lazy initializer — never re-read from the live
 * `location.search` on later renders. That matters because App.tsx keeps
 * this component mounted for a moment during its own exit animation after
 * SignInPage/SignUpPage's *own* successful-submit `navigate()` has already
 * fired: without freezing the value, this component would re-render with
 * the *new* (post-navigate) location — which has no `redirect` param
 * anymore — and fire a second, competing `<Navigate>` to '/groceries'
 * that clobbers the correct destination just set.
 */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [searchParams] = useSearchParams()
  const [redirect] = useState(() => searchParams.get('redirect'))

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'signed-in')
    return <Navigate to={isSafeJoinRedirect(redirect) ? redirect : '/groceries'} replace />
  return <>{children}</>
}
