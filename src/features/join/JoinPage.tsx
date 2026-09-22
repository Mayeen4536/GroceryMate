import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CalendarClock, CircleSlash, PartyPopper, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/auth/useAuth'
import { useHousehold } from '@/household/useHousehold'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { acceptHouseholdInvite, resolveHouseholdInvite } from '@/invite/inviteService'
import { joinPath } from '@/invite/routes'
import type { InviteResolveStatus } from '@/invite/types'
import type { InviteErrorCode } from '@/invite/errors'

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

function StatusIcon({ tone, icon: Icon }: { tone: 'warning' | 'danger'; icon: typeof Ban }) {
  return (
    <span
      className={
        tone === 'warning'
          ? 'mx-auto flex size-12 items-center justify-center rounded-full bg-warning-50 text-warning-600'
          : 'mx-auto flex size-12 items-center justify-center rounded-full bg-danger-50 text-danger-600'
      }
    >
      <Icon size={22} aria-hidden="true" />
    </span>
  )
}

const TERMINAL_STATUS_COPY: Record<
  Exclude<InviteResolveStatus, 'valid'>,
  { title: string; subtitle: string; icon: typeof Ban; tone: 'warning' | 'danger' }
> = {
  invalid: {
    title: "This invite link isn't valid",
    subtitle: 'Double-check the link, or ask the household owner for a new one.',
    icon: CircleSlash,
    tone: 'danger',
  },
  expired: {
    title: 'This invite has expired',
    subtitle: 'Ask the household owner for a new invite link.',
    icon: CalendarClock,
    tone: 'warning',
  },
  revoked: {
    title: 'This invite is no longer active',
    subtitle: 'Ask the household owner for a new invite link.',
    icon: Ban,
    tone: 'danger',
  },
  accepted: {
    title: 'This invite has already been used',
    subtitle: 'Ask the household owner for a new invite link if you still need one.',
    icon: Ban,
    tone: 'warning',
  },
}

/**
 * The real join page for Slice 8C: `/join/:token`, reachable while signed
 * out (see App.tsx — this never sits behind ProtectedRoute or
 * HouseholdGate). Resolves the token via the anon-callable
 * resolve_household_invite RPC, then either prompts sign-in/sign-up
 * (preserving this exact destination — see src/invite/routes.ts) or, once
 * authenticated, requires an explicit Join action before ever calling
 * accept_household_invite. See docs/INVITE_JOIN_DESIGN.md.
 */
export function JoinPage({ token }: { token: string }) {
  const { status: authStatus } = useAuth()
  const { refresh: refreshHousehold } = useHousehold()
  const navigate = useNavigate()

  const [resolvePhase, setResolvePhase] = useState<'loading' | 'done' | 'error'>('loading')
  const [resolveStatus, setResolveStatus] = useState<InviteResolveStatus | null>(null)
  const [householdName, setHouseholdName] = useState<string | null>(null)
  const [resolveErrorMessage, setResolveErrorMessage] = useState<string | null>(null)
  const [resolveAttempt, setResolveAttempt] = useState(0)

  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<{ code?: InviteErrorCode; message: string } | null>(null)

  const resolve = useCallback(
    async (signal: { cancelled: boolean }) => {
      setResolvePhase('loading')
      const outcome = await resolveHouseholdInvite(token)
      if (signal.cancelled) return
      if (outcome.error || !outcome.result) {
        setResolveErrorMessage(outcome.error ?? 'Something went wrong.')
        setResolvePhase('error')
        return
      }
      setResolveStatus(outcome.result.status)
      setHouseholdName(outcome.result.householdName)
      setResolvePhase('done')
    },
    [token],
  )

  useEffect(() => {
    const signal = { cancelled: false }
    async function run() {
      await resolve(signal)
    }
    run()
    return () => {
      signal.cancelled = true
    }
  }, [resolve, resolveAttempt])

  const handleAccept = async () => {
    if (accepting) return
    setAccepting(true)
    setAcceptError(null)
    const result = await acceptHouseholdInvite(token)
    setAccepting(false)
    if (result.error) {
      setAcceptError({ code: result.code, message: result.error })
      return
    }
    // Real, Supabase-backed membership — not inserted optimistically. The
    // smallest refresh that makes HouseholdGate see it: re-run its own
    // load(), then navigate. No full page reload required.
    await refreshHousehold()
    navigate('/groceries', { replace: true })
  }

  if (resolvePhase === 'loading') return <FullScreenSpinner />

  if (resolvePhase === 'error') {
    return (
      <AuthLayout title="Couldn't check this invite" subtitle={resolveErrorMessage ?? 'Please try again.'}>
        <Button variant="primary" fullWidth onClick={() => setResolveAttempt((n) => n + 1)}>
          Try again
        </Button>
      </AuthLayout>
    )
  }

  if (resolveStatus && resolveStatus !== 'valid') {
    const copy = TERMINAL_STATUS_COPY[resolveStatus]
    return (
      <AuthLayout title={copy.title} subtitle={copy.subtitle}>
        <div className="flex flex-col items-center gap-3 text-center">
          <StatusIcon tone={copy.tone} icon={copy.icon} />
        </div>
      </AuthLayout>
    )
  }

  const name = householdName ?? 'this household'
  const redirectTarget = joinPath(token)

  if (authStatus === 'loading') return <FullScreenSpinner />

  if (authStatus !== 'signed-in') {
    return (
      <AuthLayout
        title={`You've been invited to join ${name}`}
        subtitle="Sign in or create an account to accept."
      >
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            onClick={() => navigate(`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`)}
          >
            Sign in to join
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate(`/sign-up?redirect=${encodeURIComponent(redirectTarget)}`)}
          >
            Create account to join
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={`You've been invited to join ${name}`} subtitle="Accept to enter this household.">
      <div className="flex flex-col gap-4">
        {acceptError && (
          <div role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
            <div className="flex items-start gap-2">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{acceptError.message}</span>
            </div>
            {acceptError.code === 'already-member' && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('/groceries')}>
                Go to your household
              </Button>
            )}
          </div>
        )}

        <Button fullWidth iconLeft={PartyPopper} onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Joining…' : `Join ${name}`}
        </Button>
      </div>
    </AuthLayout>
  )
}
