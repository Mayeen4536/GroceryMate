import { describe, expect, it, vi } from 'vitest'
import { AuthApiError } from '@supabase/supabase-js'
import { normalizeAuthError } from './errors'

describe('normalizeAuthError', () => {
  it('maps known error codes to friendly copy', () => {
    expect(
      normalizeAuthError(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')),
    ).toBe('That email or password is incorrect.')
    expect(normalizeAuthError(new AuthApiError('User already registered', 422, 'user_already_exists'))).toBe(
      'An account with that email already exists. Try signing in instead.',
    )
    expect(normalizeAuthError(new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'))).toMatch(
      /confirm your email/i,
    )
    expect(normalizeAuthError(new AuthApiError('Rate limited', 429, 'over_email_send_rate_limit'))).toMatch(
      /wait/i,
    )
  })

  it('falls back to a generic message for an unrecognized code', () => {
    expect(normalizeAuthError(new AuthApiError('Something obscure', 400, 'some_new_unmapped_code'))).toBe(
      'Something went wrong. Please try again.',
    )
  })

  it('falls back to a generic message for a non-auth error, without leaking its detail', () => {
    const message = normalizeAuthError(new Error('relation "profiles" does not exist'))
    expect(message).toBe('Something went wrong. Please try again.')
    expect(message).not.toContain('relation')
  })

  it('recognizes a network-shaped error message', () => {
    expect(normalizeAuthError(new Error('Failed to fetch'))).toMatch(/network/i)
  })

  it('always logs the raw error for developer diagnostics without surfacing it', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const raw = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')
    const message = normalizeAuthError(raw)
    expect(spy).toHaveBeenCalledWith('[auth]', raw)
    expect(message).not.toBe(raw.message)
    spy.mockRestore()
  })
})
