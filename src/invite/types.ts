/**
 * Real, RPC-backed household invite/join. See docs/INVITE_JOIN_DESIGN.md and
 * the Slice 8B migration (supabase/migrations/20260919080821_household_invites.sql)
 * for the approved design and the exact backend contract this wraps.
 */

/** `resolve_household_invite`'s own status vocabulary — never expanded client-side. */
export type InviteResolveStatus = 'valid' | 'invalid' | 'expired' | 'revoked' | 'accepted'

export interface ResolveInviteResult {
  status: InviteResolveStatus
  /** Only ever non-null when status is 'valid' — the RPC itself withholds it otherwise. */
  householdName: string | null
}

export interface CreatedInvite {
  inviteId: string
  /** The raw token — exists in plaintext only here, for exactly as long as this value is held. Never persisted client-side. */
  token: string
  expiresAt: string
}

export interface AcceptedInvite {
  householdId: string
  memberId: string
}
