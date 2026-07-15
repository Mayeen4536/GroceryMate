import type { BadgeTone } from '../components/ui'

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

export const STATUS_META: Record<MemberStatus, { label: string; tone: BadgeTone }> = {
  settled: { label: 'Settled up', tone: 'success' },
  owes: { label: 'Owes the house', tone: 'warning' },
  owed: { label: 'House owes', tone: 'mint' },
  invited: { label: 'Invite pending', tone: 'neutral' },
}

/** Mock data for visual display only. */
export const initialMembers: Member[] = [
  {
    id: 'm-1',
    name: 'Aisha Khan',
    email: 'aisha@flat4b.home',
    tone: 4,
    role: 'owner',
    status: 'owed',
    amountPaid: '2140',
    itemsAdded: 14,
    joinedLabel: 'Joined Jan 2026',
    order: 1,
  },
  {
    id: 'm-2',
    name: 'Bilal Ahmed',
    email: 'bilal@flat4b.home',
    tone: 3,
    role: 'member',
    status: 'owes',
    amountPaid: '1450',
    itemsAdded: 9,
    joinedLabel: 'Joined Jan 2026',
    order: 2,
  },
  {
    id: 'm-3',
    name: 'Chloe Lee',
    email: 'chloe@flat4b.home',
    tone: 1,
    role: 'member',
    status: 'settled',
    amountPaid: '980',
    itemsAdded: 7,
    joinedLabel: 'Joined Feb 2026',
    order: 3,
  },
  {
    id: 'm-4',
    name: 'Daniyal Raza',
    email: 'daniyal@flat4b.home',
    tone: 0,
    role: 'member',
    status: 'owes',
    amountPaid: '610',
    itemsAdded: 4,
    joinedLabel: 'Joined Mar 2026',
    order: 4,
  },
  {
    id: 'm-5',
    name: 'Fatima Noor',
    email: 'fatima@flat4b.home',
    tone: 5,
    role: 'member',
    status: 'invited',
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: 'Invited last week',
    order: 5,
  },
]
