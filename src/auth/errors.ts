import { isAuthApiError } from '@supabase/supabase-js'

/**
 * Maps Supabase/GoTrue errors to short, user-facing copy. Keyed on
 * `error.code` (a stable machine-readable string GoTrue attaches to auth
 * errors) rather than `error.message`, which is a human sentence meant for
 * logs, not necessarily for end users, and can change wording across
 * GoTrue versions. Unrecognized errors fall back to a generic message —
 * the raw error is always logged to the console for developer diagnostics,
 * never shown to the user, so nothing backend-specific leaks into the UI.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email or password is incorrect.',
  email_not_confirmed: 'Please confirm your email before signing in — check your inbox for the confirmation link.',
  user_already_exists: 'An account with that email already exists. Try signing in instead.',
  email_exists: 'An account with that email already exists. Try signing in instead.',
  email_address_invalid: 'That doesn’t look like a valid email address.',
  email_address_not_authorized: 'That email address can’t be used to sign up.',
  weak_password: 'That password is too weak. Try a longer one with a mix of characters.',
  over_email_send_rate_limit: 'Too many attempts — please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts — please wait a moment and try again.',
  signup_disabled: 'Sign-up is currently unavailable. Please try again later.',
  same_password: 'That’s already your current password.',
}

export function normalizeAuthError(error: unknown): string {
  // Developer diagnostics only — the raw error never reaches the UI.
  console.error('[auth]', error)

  if (isAuthApiError(error)) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code]
    if (error.status === 0) return 'Network error — check your connection and try again.'
  }
  if (error instanceof Error && /fetch|network/i.test(error.message)) {
    return 'Network error — check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}
