import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A minimal thenable stand-in for the `.rpc(name, args).single()` chain the service calls. */
function makeRpcChain(result: unknown) {
  return {
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  }
}

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('@/auth/supabaseClient', () => ({
  supabase: { rpc: mocks.rpc },
}))

const { acceptHouseholdInvite, createHouseholdInvite, resolveHouseholdInvite, revokeHouseholdInvite } =
  await import('./inviteService')

beforeEach(() => {
  mocks.rpc.mockReset()
})

describe('createHouseholdInvite', () => {
  it('calls create_household_invite with the household id and maps the row to a CreatedInvite', async () => {
    mocks.rpc.mockReturnValue(
      makeRpcChain({
        data: { invite_id: 'inv-1', token: 'raw-token-abc', expires_at: '2026-09-26T00:00:00Z' },
        error: null,
      }),
    )

    const result = await createHouseholdInvite('household-1')

    expect(mocks.rpc).toHaveBeenCalledWith('create_household_invite', { p_household_id: 'household-1' })
    expect(result.error).toBeUndefined()
    expect(result.invite).toEqual({
      inviteId: 'inv-1',
      token: 'raw-token-abc',
      expiresAt: '2026-09-26T00:00:00Z',
    })
  })

  it('maps an owner-only rejection to a safe error message, never the raw one', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockReturnValue(
      makeRpcChain({ data: null, error: { message: 'Only the household owner can create an invite.' } }),
    )

    const result = await createHouseholdInvite('household-1')

    expect(result.invite).toBeUndefined()
    expect(result.error).toBe('Only the household owner can do that.')
  })
})

describe('resolveHouseholdInvite', () => {
  it('calls resolve_household_invite with the token and maps a valid result', async () => {
    mocks.rpc.mockReturnValue(
      makeRpcChain({ data: { status: 'valid', household_name: 'Flat 4B' }, error: null }),
    )

    const result = await resolveHouseholdInvite('sometoken')

    expect(mocks.rpc).toHaveBeenCalledWith('resolve_household_invite', { p_token: 'sometoken' })
    expect(result.result).toEqual({ status: 'valid', householdName: 'Flat 4B' })
  })

  it.each(['invalid', 'expired', 'revoked', 'accepted'] as const)(
    'passes through a %s status with a null household name unchanged',
    async (status) => {
      mocks.rpc.mockReturnValue(makeRpcChain({ data: { status, household_name: null }, error: null }))
      const result = await resolveHouseholdInvite('sometoken')
      expect(result.result).toEqual({ status, householdName: null })
    },
  )

  it('surfaces a network/unknown failure as an error, not a fabricated status', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockReturnValue(makeRpcChain({ data: null, error: {} }))

    const result = await resolveHouseholdInvite('sometoken')

    expect(result.result).toBeUndefined()
    expect(result.error).toBeTruthy()
  })
})

describe('acceptHouseholdInvite', () => {
  it('calls accept_household_invite with only the token and maps the resulting membership', async () => {
    mocks.rpc.mockReturnValue(
      makeRpcChain({ data: { household_id: 'household-1', member_id: 'member-1' }, error: null }),
    )

    const result = await acceptHouseholdInvite('sometoken')

    // The token is the only argument — accept_household_invite's own
    // signature has no household_id/role/profile_id/status parameter at
    // all (see supabase/migrations/20260919080821_household_invites.sql),
    // so there is nothing else this call could even pass.
    expect(mocks.rpc).toHaveBeenCalledWith('accept_household_invite', { p_token: 'sometoken' })
    expect(result.result).toEqual({ householdId: 'household-1', memberId: 'member-1' })
  })

  it('maps "already belong to a household" to the already-member code', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockReturnValue(
      makeRpcChain({ data: null, error: { message: 'You already belong to a household.' } }),
    )

    const result = await acceptHouseholdInvite('sometoken')

    expect(result.code).toBe('already-member')
    expect(result.error).toBe('You already belong to a household.')
  })

  it('maps an expired invite to the expired code with a safe message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockReturnValue(makeRpcChain({ data: null, error: { message: 'This invite has expired.' } }))

    const result = await acceptHouseholdInvite('sometoken')

    expect(result.code).toBe('expired')
  })
})

describe('revokeHouseholdInvite', () => {
  it('calls revoke_household_invite with the invite id', async () => {
    mocks.rpc.mockReturnValue(Promise.resolve({ error: null }))

    const result = await revokeHouseholdInvite('inv-1')

    expect(mocks.rpc).toHaveBeenCalledWith('revoke_household_invite', { p_invite_id: 'inv-1' })
    expect(result.error).toBeUndefined()
  })

  it('maps a non-owner rejection to a safe error message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockReturnValue(
      Promise.resolve({ error: { message: 'Only the household owner can revoke an invite.' } }),
    )

    const result = await revokeHouseholdInvite('inv-1')

    expect(result.error).toBe('Only the household owner can do that.')
  })
})
