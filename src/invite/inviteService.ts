import { supabase } from '@/auth/supabaseClient'
import { normalizeInviteError, type InviteErrorCode } from './errors'
import type { AcceptedInvite, CreatedInvite, InviteResolveStatus, ResolveInviteResult } from './types'

export interface CreateInviteResult {
  error?: string
  invite?: CreatedInvite
}

export interface ResolveInviteOutcome {
  error?: string
  result?: ResolveInviteResult
}

export interface AcceptInviteResult {
  error?: string
  code?: InviteErrorCode
  result?: AcceptedInvite
}

export interface RevokeInviteResult {
  error?: string
}

interface CreateInviteRow {
  invite_id: string
  token: string
  expires_at: string
}

interface ResolveInviteRow {
  status: InviteResolveStatus
  household_name: string | null
}

interface AcceptInviteRow {
  household_id: string
  member_id: string
}

/**
 * The invite/join client layer — every call this app makes to the Slice 8B
 * RPCs (supabase/migrations/20260919080821_household_invites.sql) goes
 * through exactly these four functions, never a raw `supabase.rpc(...)`
 * call from a component. No financial logic lives here; this only ever
 * moves a token and a household id/name around.
 */
export async function createHouseholdInvite(householdId: string): Promise<CreateInviteResult> {
  const { data, error } = await supabase
    .rpc('create_household_invite', { p_household_id: householdId })
    .single<CreateInviteRow>()
  if (error || !data) return { error: normalizeInviteError(error).message }
  return { invite: { inviteId: data.invite_id, token: data.token, expiresAt: data.expires_at } }
}

/** Safe to call while signed out — this is the one RPC `anon` is allowed to execute. */
export async function resolveHouseholdInvite(token: string): Promise<ResolveInviteOutcome> {
  const { data, error } = await supabase
    .rpc('resolve_household_invite', { p_token: token })
    .single<ResolveInviteRow>()
  if (error || !data) return { error: normalizeInviteError(error).message }
  return { result: { status: data.status, householdName: data.household_name } }
}

/**
 * The token is the only input — there is no parameter for household_id,
 * role, profile_id, or status, matching the RPC's own signature exactly.
 * Identity and membership are derived entirely server-side from the
 * caller's session.
 */
export async function acceptHouseholdInvite(token: string): Promise<AcceptInviteResult> {
  const { data, error } = await supabase
    .rpc('accept_household_invite', { p_token: token })
    .single<AcceptInviteRow>()
  if (error || !data) {
    const normalized = normalizeInviteError(error)
    return { error: normalized.message, code: normalized.code }
  }
  return { result: { householdId: data.household_id, memberId: data.member_id } }
}

export async function revokeHouseholdInvite(inviteId: string): Promise<RevokeInviteResult> {
  const { error } = await supabase.rpc('revoke_household_invite', { p_invite_id: inviteId })
  if (error) return { error: normalizeInviteError(error).message }
  return {}
}
