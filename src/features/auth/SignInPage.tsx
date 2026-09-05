import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/auth/useAuth'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'
import { validateEmail, validatePassword } from './validation'

export function SignInPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [passwordError, setPasswordError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    setFormError(undefined)
    if (nextEmailError || nextPasswordError) return

    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)

    if (result.kind === 'error') {
      setFormError(result.message)
    } else {
      navigate('/groceries', { replace: true })
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your household."
      footer={
        <>
          New to GroceryMate?{' '}
          <Link to="/sign-up" className="font-medium text-brand-700 hover:underline">
            Create an account
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
          autoComplete="current-password"
          value={password}
          error={passwordError}
          onChange={(e) => {
            setPassword(e.target.value)
            if (passwordError) setPasswordError(undefined)
          }}
          disabled={submitting}
        />

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
