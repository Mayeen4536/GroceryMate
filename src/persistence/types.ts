import type { GroceryItem } from '@/domain/GroceryItem'
import type { HistorySession } from '@/domain/HistorySession'
import type { HouseholdId, MemberId, HistorySessionId } from '@/domain/ids'

/**
 * Whether a stored session shows up in the active list or the archive.
 * This lives here rather than on the domain `HistorySession` itself: being
 * archived is a storage/organizational concern, not a fact about the
 * shopping trip the session represents.
 */
export type SessionLifecycleStatus = 'active' | 'archived'

/** A HistorySession as the persistence layer knows it: the entity plus its storage metadata. */
export interface StoredHistorySession {
  readonly session: HistorySession
  readonly lifecycleStatus: SessionLifecycleStatus
  /** When this record was last written to storage. */
  readonly savedAt: Date
}

/** What's needed to start logging a new grocery session. */
export interface CreateSessionInput {
  readonly householdId: HouseholdId
  readonly title: string
  readonly memberIds: readonly MemberId[]
}

/**
 * Local persistence for grocery sessions: every write is immediately
 * durable, so there is no separate "save" action for callers to remember —
 * `create`, `save`, `rename`, `duplicate`, `archive`, and `restore` all
 * leave storage up to date the moment they return.
 */
export interface HistorySessionRepository {
  getAll(): readonly StoredHistorySession[]
  getActiveSessions(): readonly StoredHistorySession[]
  getArchivedSessions(): readonly StoredHistorySession[]
  getById(id: HistorySessionId): StoredHistorySession | undefined

  /** Starts a new, empty, in-progress session. */
  create(input: CreateSessionInput): StoredHistorySession

  /** Persists an updated session (e.g. after changing its title or item list). Preserves its lifecycle status. */
  save(session: HistorySession): StoredHistorySession

  /**
   * Persists a grocery item that belongs to one of this repository's
   * sessions. Saving the item and linking it into a session's
   * `groceryItemIds` are separate steps — call `save()` on the session too
   * once the item is written.
   */
  saveGroceryItem(item: GroceryItem): GroceryItem

  /** The grocery items currently referenced by a session's `groceryItemIds`. */
  getGroceryItemsForSession(id: HistorySessionId): readonly GroceryItem[]

  /** Fetches a session for continued editing. Throws if it's archived. */
  resume(id: HistorySessionId): StoredHistorySession

  rename(id: HistorySessionId, title: string): StoredHistorySession

  /** Creates an independent copy of a session — its own id, its own copies of its items, always active and in-progress. */
  duplicate(id: HistorySessionId, title?: string): StoredHistorySession

  archive(id: HistorySessionId): StoredHistorySession
  restore(id: HistorySessionId): StoredHistorySession

  /** Permanently removes the session and the grocery items it owns. */
  delete(id: HistorySessionId): void
}
