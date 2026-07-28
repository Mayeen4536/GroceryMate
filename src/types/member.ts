/**
 * Display-only member model. Amounts are placeholder strings; no math
 * happens in the UI layer.
 */
export type MemberStatus = 'settled' | 'owes' | 'owed' | 'invited'

export interface Member {
  id: string
  name: string
  email: string
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
}
