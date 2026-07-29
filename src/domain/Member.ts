import type { HouseholdId, MemberId } from './ids'

export type MemberRole = 'owner' | 'member'

/** A member who has joined and can use the household. */
export interface ActiveMember {
  readonly membershipStatus: 'active'
  readonly joinedAt: Date
}

/** A member who has been invited but hasn't joined yet. */
export interface InvitedMember {
  readonly membershipStatus: 'invited'
  readonly invitedAt: Date
}

/**
 * A person sharing a household. Responsibility: identity, role, and where
 * they are in the membership lifecycle — never financial standing, which
 * is derived from Settlements rather than stored on the member.
 *
 * `membershipStatus` is a discriminated union rather than an optional
 * `joinedAt`/`invitedAt` pair: an invited member has no join date yet, and
 * an active member's invite date isn't meaningful, so exactly one of the
 * two is always present, never both and never neither.
 */
export type Member = {
  readonly id: MemberId
  readonly householdId: HouseholdId
  readonly name: string
  readonly email: string
  readonly role: MemberRole
} & (ActiveMember | InvitedMember)
