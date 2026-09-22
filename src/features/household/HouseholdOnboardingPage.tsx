import { useState, type FormEvent } from 'react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/auth/useAuth'
import { useHousehold } from '@/household/useHousehold'
import { AuthLayout } from '@/features/auth/AuthLayout'

/** Shown when the authenticated user has no household membership at all — see HouseholdGate. */
export function HouseholdOnboardingPage() {
  const { signOut } = useAuth()
  const { createHousehold } = useHousehold()

  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return // belt-and-suspenders against a double Enter+click race; disabled below is the primary guard
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give your household a name.')
      return
    }

    setSubmitting(true)
    setError(undefined)
    const result = await createHousehold(trimmed)
    // On success, <HouseholdGate> stops rendering this page at all (status
    // moves on to 'ready' or, if the follow-up refresh failed, 'error' —
    // never back to 'needs-setup') — so there is no path back to this form
    // that could invoke create_household() a second time.
    if (result.error) {
      setSubmitting(false)
      setError(result.error)
    }
  }

  return (
    <AuthLayout
      title="Create your household"
      subtitle="Give your shared space a name."
      footer={
        <>
          Signed in with the wrong account?{' '}
          <button
            type="button"
            onClick={() => void signOut()}
            className="font-medium text-brand-700 hover:underline"
          >
            Sign out
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
            {error}
          </p>
        )}

        <Input
          label="Household name"
          placeholder="Our Flat, Bashundhara Apartment, Uni Mess…"
          autoComplete="off"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(undefined)
          }}
          disabled={submitting}
        />

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creating household…' : 'Create household'}
        </Button>
      </form>
    </AuthLayout>
  )
}
