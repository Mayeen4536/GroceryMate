/**
 * Real, RLS-governed household identity — the persisted counterpart to
 * src/types/household.ts's MockHousehold, which display-only code
 * (Members/Groceries/Settlements) still uses for this slice. See
 * docs/AUTH_INTEGRATION.md / docs/HOUSEHOLD_INTEGRATION.md for the split.
 */
export interface Household {
  id: string
  name: string
  currencyCode: string
  status: 'active' | 'archived'
  createdAt: string
  /** Count of active household_members rows — a read, not a migration of the member list itself. */
  memberCount: number
}

export interface HouseholdRow {
  id: string
  name: string
  currency_code: string
  status: string
  created_at: string
}

/** The current authenticated user's own household_members row — never another member's. */
export interface Membership {
  id: string
  householdId: string
  profileId: string
  displayName: string
  role: 'owner' | 'member'
  status: 'active' | 'invited' | 'archived'
}

export interface MembershipRow {
  id: string
  household_id: string
  profile_id: string | null
  display_name: string
  role: string
  status: string
}

export function mapHouseholdRow(row: HouseholdRow, memberCount: number): Household {
  return {
    id: row.id,
    name: row.name,
    currencyCode: row.currency_code,
    status: row.status === 'archived' ? 'archived' : 'active',
    createdAt: row.created_at,
    memberCount,
  }
}

export function mapMembershipRow(row: MembershipRow): Membership {
  return {
    id: row.id,
    householdId: row.household_id,
    // profile_id is only ever null after the owning profile is deleted —
    // never the case for the CURRENT authenticated user's own row, since a
    // user can't query as themselves once their profile is gone. Falls
    // back to '' defensively rather than widening the type to `| null`
    // everywhere a caller only ever needs their own live id.
    profileId: row.profile_id ?? '',
    displayName: row.display_name,
    role: row.role === 'owner' ? 'owner' : 'member',
    status: row.status === 'archived' ? 'archived' : row.status === 'invited' ? 'invited' : 'active',
  }
}
