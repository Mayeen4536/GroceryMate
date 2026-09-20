import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/auth/supabaseClient'
import { useHousehold } from '@/household/useHousehold'
import type { Member } from '@/types/member'
import { normalizeMemberError } from './errors'
import { mapHouseholdMemberRow, type HouseholdMemberRow } from './types'

const SELECT_COLUMNS = 'id, household_id, profile_id, display_name, invited_email, role, status, created_at, archived_at'

export interface MemberWriteResult {
  error?: string
}

export interface AddMemberResult extends MemberWriteResult {
  /** The new row's real id — used only for the one-shot "just added" highlight, never as a guess. */
  id?: string
}

interface MembersState {
  members: Member[]
  loading: boolean
  error: string | null
}

const IDLE_STATE: MembersState = { members: [], loading: true, error: null }

async function loadRoster(householdId: string): Promise<MembersState> {
  const { data, error } = await supabase
    .from('household_members')
    .select(SELECT_COLUMNS)
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
    .returns<HouseholdMemberRow[]>()

  if (error) {
    return { members: [], loading: false, error: normalizeMemberError(error) }
  }
  return { members: (data ?? []).map(mapHouseholdMemberRow), loading: false, error: null }
}

/**
 * Owns the current household's real roster (every household_members row,
 * not just the caller's own — see docs/MEMBER_INTEGRATION.md). A plain
 * hook, not a Context: unlike auth/household identity, the roster is only
 * ever needed by the pages App.tsx already prop-threads (Members,
 * Groceries, Settlements, Assistant) — exactly like the mock useMembers()
 * it replaces, just backed by Supabase internally.
 */
export function useHouseholdMembers() {
  const { household } = useHousehold()
  const [state, setState] = useState<MembersState>(IDLE_STATE)

  const householdId = household?.id

  // Reset immediately on any household/identity change — during render, not
  // an effect (same pattern as HouseholdProvider) — so a household switch
  // (were one ever added) or sign-out can never render the previous
  // household's roster, even for one frame.
  const lastHouseholdIdRef = useRef(householdId)
  if (householdId !== lastHouseholdIdRef.current) {
    lastHouseholdIdRef.current = householdId
    setState(IDLE_STATE)
  }

  const refresh = useCallback(async () => {
    if (!householdId) return
    setState((s) => ({ ...s, loading: true }))
    const result = await loadRoster(householdId)
    setState(result)
  }, [householdId])

  useEffect(() => {
    async function run() {
      await refresh()
    }
    run()
  }, [refresh])

  const addMember = useCallback(
    async (displayName: string): Promise<AddMemberResult> => {
      const trimmed = displayName.trim()
      if (!householdId) return { error: 'No household loaded yet.' }
      if (!trimmed) return { error: 'Give this member a name.' }

      const { data, error } = await supabase
        .from('household_members')
        .insert({
          household_id: householdId,
          display_name: trimmed,
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error || !data) return { error: normalizeMemberError(error) }
      await refresh()
      return { id: data.id }
    },
    [householdId, refresh],
  )

  const archiveMember = useCallback(
    async (memberId: string): Promise<MemberWriteResult> => {
      const { data, error } = await supabase
        .from('household_members')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', memberId)
        .select('id')
        .maybeSingle()

      if (error) return { error: normalizeMemberError(error) }
      // RLS silently excludes a row this caller isn't the owner for — the
      // UPDATE affects zero rows rather than erroring (see
      // docs/MEMBER_INTEGRATION.md). maybeSingle() returns null data here,
      // not an error, so this is checked explicitly.
      if (!data) return { error: 'You don’t have permission to do that.' }
      await refresh()
      return {}
    },
    [refresh],
  )

  const reactivateMember = useCallback(
    async (memberId: string): Promise<MemberWriteResult> => {
      const { data, error } = await supabase
        .from('household_members')
        .update({ status: 'active', archived_at: null })
        .eq('id', memberId)
        .select('id')
        .maybeSingle()

      if (error) return { error: normalizeMemberError(error) }
      if (!data) return { error: 'You don’t have permission to do that.' }
      await refresh()
      return {}
    },
    [refresh],
  )

  return {
    members: state.members,
    loading: state.loading,
    error: state.error,
    refresh,
    addMember,
    archiveMember,
    reactivateMember,
  }
}
