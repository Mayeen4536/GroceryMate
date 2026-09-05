import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/auth/useAuth'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'
import { validateEmail, validatePassword } from './validation'

/** Shown after a successful signUp() call that returned no session — hosted Supabase requires email confirmation. */
function ConfirmationRequired({ email }: { email: string }) {
  return (
    <AuthLayout
      title="Check your email"
      subtitle="One more step before you're in."
      footer={
        <>
          Already confirmed?{' '}
          <Link to="/sign-in" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-mint-100 text-mint-700">
          <MailCheck size={22} aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm text-ink-soft">
          We’ve sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Open it
          to activate your account, then come back and sign in.
        </p>
      </div>
    </AuthLayout>
  )
}

export function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [passwordError, setPasswordError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState<string>()

  if (confirmationEmail) return <ConfirmationRequired email={confirmationEmail} />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    setFormError(undefined)
    if (nextEmailError || nextPasswordError) return

    setSubmitting(true)
    const result = await signUp(email.trim(), password, displayName.trim())
    setSubmitting(false)

    if (result.kind === 'error') {
      setFormError(result.message)
    } else if (result.kind === 'confirmation-required') {
      setConfirmationEmail(email.trim())
    } else {
      navigate('/groceries', { replace: true })
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Split groceries fairly with your household."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
            {formError}
          </p>
        )}

        <Input
          label="Display name"
          helperText="Optional — you can add this later in Settings."
          placeholder="e.g. Alex"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={submitting}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={emailError}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) setEmailError(undefined)
          }}
          disabled={submitting}
        />
        <PasswordInput
          label="Password"
          helperText="At least 6 characters."
          autoComplete="new-password"
          value={password}
          error={passwordError}
          onChange={(e) => {
            setPassword(e.target.value)
            if (passwordError) setPasswordError(undefined)
          }}
          disabled={submitting}
        />

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
