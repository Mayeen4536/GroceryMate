import { createContext } from 'react'
import type { Household, Membership } from './types'

export type HouseholdStatus =
  | 'loading'
  | 'needs-setup'
  | 'ready'
  /** Exactly one archived membership, no active one — historical/read-only, not a new-user state. */
  | 'archived'
  /** More than one active (or ambiguous archived) membership — no switcher yet, so refuse to guess. */
  | 'unsupported'
  | 'error'

export interface CreateHouseholdResult {
  error?: string
}

export interface HouseholdContextValue {
  status: HouseholdStatus
  household: Household | null
  currentMembership: Membership | null
  /** Convenience for status === 'loading'. */
  loading: boolean
  error: string | null
  /** Convenience for status === 'needs-setup'. */
  needsHouseholdSetup: boolean
  /** Re-runs the membership/household lookup. Never re-invokes create_household. */
  refresh: () => Promise<void>
  /** The only path that may create a household — calls create_household() once, then refresh()es. */
  createHousehold: (name: string) => Promise<CreateHouseholdResult>
}

export const HouseholdContext = createContext<HouseholdContextValue | null>(null)
