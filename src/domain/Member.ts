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
 * A member who has been removed from active participation. Never hard
 * deleted — household_members rows with any grocery history are protected
 * by a database FK (ON DELETE RESTRICT), so archiving is the only removal
 * path. Still present here (not filtered out of the engine's member list)
 * so historical grocery references stay resolvable; excluded only from
 * new-selection UI.
 */
export interface ArchivedMember {
  readonly membershipStatus: 'archived'
  readonly archivedAt: Date
}

/**
 * A person sharing a household. Responsibility: identity, role, and where
 * they are in the membership lifecycle — never financial standing, which
 * is derived from Settlements rather than stored on the member.
 *
 * `membershipStatus` is a discriminated union rather than optional
 * `joinedAt`/`invitedAt`/`archivedAt` fields: exactly one is always
 * present, never more than one and never none.
 */
export type Member = {
  readonly id: MemberId
  readonly householdId: HouseholdId
  readonly name: string
  /** Non-account participants have no email — see docs/MEMBER_INTEGRATION.md. */
  readonly email: string | null
  readonly role: MemberRole
} & (ActiveMember | InvitedMember | ArchivedMember)
