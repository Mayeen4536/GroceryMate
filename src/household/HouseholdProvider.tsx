import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/auth/supabaseClient'
import { useAuth } from '@/auth/useAuth'
import { HouseholdContext, type CreateHouseholdResult, type HouseholdStatus } from './HouseholdContext'
import { normalizeHouseholdError } from './errors'
import {
  mapHouseholdRow,
  mapMembershipRow,
  type Household,
  type HouseholdRow,
  type Membership,
  type MembershipRow,
} from './types'

interface HouseholdState {
  status: HouseholdStatus
  household: Household | null
  currentMembership: Membership | null
  error: string | null
}

const IDLE_STATE: HouseholdState = {
  status: 'loading',
  household: null,
  currentMembership: null,
  error: null,
}

async function loadHouseholdDetail(
  membershipRow: MembershipRow,
  status: 'ready' | 'archived',
): Promise<HouseholdState> {
  const [householdResult, countResult] = await Promise.all([
    supabase
      .from('households')
      .select('id, name, currency_code, status, created_at')
      .eq('id', membershipRow.household_id)
      .single<HouseholdRow>(),
    supabase
      .from('household_members')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', membershipRow.household_id)
      .eq('status', 'active'),
  ])

  if (householdResult.error || !householdResult.data) {
    return {
      status: 'error',
      household: null,
      currentMembership: null,
      error: normalizeHouseholdError(householdResult.error),
    }
  }

  return {
    status,
    household: mapHouseholdRow(householdResult.data, countResult.count ?? 0),
    currentMembership: mapMembershipRow(membershipRow),
    error: null,
  }
}

/**
 * Classifies the current user's own household_members rows (never another
 * member's — always filtered by profile_id) into exactly one of: needs
 * setup, a single usable membership, or an ambiguous state this MVP
 * deliberately refuses to guess at. See docs/HOUSEHOLD_INTEGRATION.md for
 * the full decision table.
 */
async function loadHousehold(profileId: string): Promise<HouseholdState> {
  const { data, error } = await supabase
    .from('household_members')
    .select('id, household_id, profile_id, display_name, role, status')
    .eq('profile_id', profileId)
    .returns<MembershipRow[]>()

  if (error) {
    return {
      status: 'error',
      household: null,
      currentMembership: null,
      error: normalizeHouseholdError(error),
    }
  }

  const rows = data ?? []
  const active = rows.filter((row) => row.status === 'active')
  const archived = rows.filter((row) => row.status === 'archived')

  if (active.length > 1 || archived.length > 1) {
    // Ambiguous: the schema permits multiple households per profile, but
    // there's no switcher yet — never silently pick one.
    return { status: 'unsupported', household: null, currentMembership: null, error: null }
  }
  if (active.length === 1) {
    return loadHouseholdDetail(active[0], 'ready')
  }
  if (archived.length === 1) {
    return loadHouseholdDetail(archived[0], 'archived')
  }
  // Zero active, zero archived (any 'invited' row is not yet a usable
  // membership — Migration 4 doesn't implement invite-acceptance).
  return { status: 'needs-setup', household: null, currentMembership: null, error: null }
}

/**
 * Owns household + current-membership state, the same shape of exception
 * to this codebase's "hook + props" convention that AuthProvider already
 * is, and for the same reason: needed in the route gate, Sidebar, TopBar,
 * and Settings, none of which share a parent-child relationship. Depends
 * on useAuth() — must render inside <AuthProvider>.
 */
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, profile } = useAuth()
  const [state, setState] = useState<HouseholdState>(IDLE_STATE)

  const profileId = authStatus === 'signed-in' ? profile?.id : undefined

  // Reset immediately on sign-out or user switch — during render, not an
  // effect (React's documented pattern for resetting derived state:
  // https://react.dev/learn/you-might-not-need-an-effect) — so a new
  // session can never render the previous user's household, even for one
  // frame.
  const lastProfileIdRef = useRef(profileId)
  if (profileId !== lastProfileIdRef.current) {
    lastProfileIdRef.current = profileId
    // Any identity change clears stale state, not just sign-out — without
    // this, switching directly from User A to User B would keep rendering
    // A's household until B's own load() resolves.
    setState(IDLE_STATE)
  }

  // Tracks the identity a load() should still apply to, updated only from
  // an effect (never during render) — this is what lets a load() started
  // for a previous/now-superseded identity discover it's stale once it
  // resolves, so it can no-op instead of clobbering state for whoever is
  // current by then.
  const currentProfileIdRef = useRef(profileId)
  useEffect(() => {
    currentProfileIdRef.current = profileId
  }, [profileId])

  const load = useCallback(async () => {
    if (!profileId) return
    const requestedFor = profileId
    setState((s) => ({ ...s, status: 'loading' }))
    const result = await loadHousehold(profileId)
    if (currentProfileIdRef.current !== requestedFor) return // superseded by a user switch
    setState(result)
  }, [profileId])

  useEffect(() => {
    async function run() {
      await load()
    }
    run()
  }, [load])

  const createHousehold = useCallback(
    async (name: string): Promise<CreateHouseholdResult> => {
      const trimmed = name.trim()
      if (!trimmed) return { error: 'Give your household a name.' }

      const { error } = await supabase.rpc('create_household', { p_name: trimmed })
      if (error) return { error: normalizeHouseholdError(error) }

      // The RPC succeeded — a household now exists. Never call it again
      // after this point, even if the refresh below fails: that failure
      // surfaces as status 'error', whose only recovery action is
      // refresh() itself, never a second create_household() call.
      await load()
      return {}
    },
    [load],
  )

  return (
    <HouseholdContext.Provider
      value={{
        status: state.status,
        household: state.household,
        currentMembership: state.currentMembership,
        loading: state.status === 'loading',
        error: state.error,
        needsHouseholdSetup: state.status === 'needs-setup',
        refresh: load,
        createHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}
