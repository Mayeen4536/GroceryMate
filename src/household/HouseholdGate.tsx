import type { ReactNode } from 'react'
import { Archive, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/auth/useAuth'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { HouseholdOnboardingPage } from '@/features/household/HouseholdOnboardingPage'
import { useHousehold } from './useHousehold'

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

function SignOutFooter() {
  const { signOut } = useAuth()
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="font-medium text-brand-700 hover:underline"
    >
      Sign out
    </button>
  )
}

function ArchivedHouseholdScreen({ name }: { name: string }) {
  return (
    <AuthLayout
      title="This household is archived"
      subtitle={`"${name}" is no longer active.`}
      footer={<SignOutFooter />}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-sand text-ink-soft">
          <Archive size={22} aria-hidden="true" />
        </span>
        <p className="text-sm text-ink-soft">
          You can no longer make changes here, and this MVP doesn't yet support creating another household
          from this state.
        </p>
      </div>
    </AuthLayout>
  )
}

function UnsupportedHouseholdScreen() {
  return (
    <AuthLayout
      title="Multiple households aren't supported yet"
      subtitle="Your account belongs to more than one household."
      footer={<SignOutFooter />}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-warning-50 text-warning-600">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <p className="text-sm text-ink-soft">
          GroceryMate doesn't have a household switcher yet, so it can't guess which one to show. This is a
          known limitation — see docs/HOUSEHOLD_INTEGRATION.md.
        </p>
      </div>
    </AuthLayout>
  )
}

function HouseholdLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <AuthLayout title="We couldn’t load your household" subtitle={message} footer={<SignOutFooter />}>
      <Button variant="primary" fullWidth onClick={onRetry}>
        Try again
      </Button>
    </AuthLayout>
  )
}

/**
 * Gates the app shell on household state, nested inside the existing
 * <ProtectedRoute> (auth/profile already resolved by the time this
 * renders) — see App.tsx. Never navigates; a status other than 'ready'
 * renders a full replacement screen in place, so there's no redirect loop
 * to avoid in the first place.
 */
export function HouseholdGate({ children }: { children: ReactNode }) {
  const { status, household, error, refresh } = useHousehold()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'needs-setup') return <HouseholdOnboardingPage />
  if (status === 'archived') return <ArchivedHouseholdScreen name={household?.name ?? 'Household'} />
  if (status === 'unsupported') return <UnsupportedHouseholdScreen />
  if (status === 'error')
    return <HouseholdLoadError message={error ?? 'Please try again.'} onRetry={refresh} />
  return <>{children}</>
}
