/**
 * Display-only member model. Amounts are placeholder strings; no math
 * happens in the UI layer. `'settled' | 'owes' | 'owed'` are financial
 * statuses computed from the real settlement engine (see
 * MembersPage.tsx's withRealFinancials) and only ever apply to an active
 * member; `'invited'` and `'archived'` are membership-lifecycle statuses
 * from the real household_members row and are never overwritten by
 * financial calculation.
 */
export type MemberStatus = 'settled' | 'owes' | 'owed' | 'invited' | 'archived'

export interface Member {
  id: string
  name: string
  /** Non-account participants (see docs/MEMBER_INTEGRATION.md) have no email. */
  email: string | null
  /** Index into MEMBER_TONES; the member's color theme. */
  tone: number
  role: 'owner' | 'member'
  status: MemberStatus
  /** Placeholder display value. */
  amountPaid: string
  /** Placeholder display value. */
  itemsAdded: number
  joinedLabel: string
  /** Higher = joined more recently; drives the "Newest" sort. */
  order: number
  /** Present only when status === 'archived'. */
  archivedAt?: string
}
