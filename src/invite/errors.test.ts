import { describe, expect, it, vi } from 'vitest'
import { normalizeInviteError } from './errors'

describe('normalizeInviteError', () => {
  it.each([
    ['Not authenticated.', 'not-authenticated'],
    ['This household is archived.', 'household-archived'],
    ['Only the household owner can create an invite.', 'not-owner'],
    ['Only the household owner can revoke an invite.', 'not-owner'],
    ['Invalid invite.', 'not-found'],
    ['Household not found.', 'not-found'],
    ['Invite not found.', 'not-found'],
    ['This invite has been revoked.', 'revoked'],
    ['This invite has already been used or revoked.', 'revoked'],
    ['This invite has expired.', 'expired'],
    ['This invite has already been used.', 'already-used'],
    [
      'You were previously a member of this household. Ask the household owner to reactivate your membership.',
      'same-household-conflict',
    ],
    ['You already belong to a household.', 'already-member'],
  ])('maps %j to code %j', (rawMessage, expectedCode) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = normalizeInviteError({ message: rawMessage })
    expect(result.code).toBe(expectedCode)
    expect(result.message.length).toBeGreaterThan(0)
    spy.mockRestore()
  })

  it('maps an unrecognized message to a generic, safe fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = normalizeInviteError({ message: 'permission denied for table household_invites' })
    expect(result.code).toBe('unknown')
    expect(result.message).not.toContain('permission denied')
    expect(result.message).not.toContain('household_invites')
  })

  it('maps a message-less error (network failure) to the network code', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = normalizeInviteError(new TypeError('Failed to fetch'))
    expect(result.code).toBe('network')
  })

  it('never throws on a completely unexpected input shape', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => normalizeInviteError(null)).not.toThrow()
    expect(() => normalizeInviteError(undefined)).not.toThrow()
    expect(() => normalizeInviteError('a plain string')).not.toThrow()
  })

  it('logs the raw error for diagnostics without ever putting it in the returned message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const raw = { message: 'This invite has expired.', code: 'P0001', details: 'internal detail' }
    const result = normalizeInviteError(raw)
    expect(spy).toHaveBeenCalledWith('[invite]', raw)
    expect(result.message).not.toContain('P0001')
    expect(result.message).not.toContain('internal detail')
    spy.mockRestore()
  })
})
