const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Client-side checks only catch obviously-empty or malformed input before a
 * network round trip — Supabase/GoTrue remains the authoritative validator
 * (real deliverability, password-strength policy, uniqueness) via
 * normalizeAuthError.
 */
export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim()
  if (!trimmed) return 'Email is required.'
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.'
  return undefined
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.'
  if (password.length < 6) return 'Password must be at least 6 characters.'
  return undefined
}
