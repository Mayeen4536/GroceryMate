import type { GroceryItem } from '@/domain/GroceryItem'
import type { HistorySession } from '@/domain/HistorySession'
import type { GroceryItemId, HistorySessionId } from '@/domain/ids'
import {
  SessionAlreadyArchivedError,
  SessionArchivedError,
  SessionNotArchivedError,
  SessionNotFoundError,
} from './errors'
import { LocalStorageRepository } from './LocalStorageRepository'
import type { KeyValueStore } from './LocalStorageRepository'
import { STORAGE_KEYS } from './storageKeys'
import type { CreateSessionInput, HistorySessionRepository, StoredHistorySession } from './types'

export interface HistorySessionRepositoryDeps {
  readonly store: KeyValueStore
  /** Defaults to `crypto.randomUUID`; override in tests for deterministic ids. */
  readonly generateId?: () => string
  /** Defaults to `() => new Date()`; override in tests for a deterministic clock. */
  readonly now?: () => Date
}

/**
 * Wires up local persistence for grocery sessions. Responsibility: the
 * session lifecycle (create/save/resume/rename/duplicate/archive/restore/
 * delete) and cascading a session's owned grocery items along with it —
 * nothing about settlement math, which stays entirely in `@/engine`.
 */
export function createHistorySessionRepository(deps: HistorySessionRepositoryDeps): HistorySessionRepository {
  const generateId = deps.generateId ?? (() => crypto.randomUUID())
  const now = deps.now ?? (() => new Date())

  const sessions = new LocalStorageRepository<StoredHistorySession, HistorySessionId>(
    deps.store,
    STORAGE_KEYS.historySessions,
    (stored) => stored.session.id,
  )
  const items = new LocalStorageRepository<GroceryItem, GroceryItemId>(
    deps.store,
    STORAGE_KEYS.groceryItems,
    (item) => item.id,
  )

  function requireSession(id: HistorySessionId): StoredHistorySession {
    const found = sessions.getById(id)
    if (!found) throw new SessionNotFoundError(id)
    return found
  }

  return {
    getAll: () => sessions.getAll(),
    getActiveSessions: () => sessions.getAll().filter((stored) => stored.lifecycleStatus === 'active'),
    getArchivedSessions: () => sessions.getAll().filter((stored) => stored.lifecycleStatus === 'archived'),
    getById: (id) => sessions.getById(id),

    create(input: CreateSessionInput): StoredHistorySession {
      const session: HistorySession = {
        id: generateId() as HistorySessionId,
        householdId: input.householdId,
        title: input.title,
        memberIds: input.memberIds,
        groceryItemIds: [],
        startedAt: now(),
        status: 'in_progress',
      }
      const stored: StoredHistorySession = { session, lifecycleStatus: 'active', savedAt: now() }
      sessions.save(stored)
      return stored
    },

    save(session: HistorySession): StoredHistorySession {
      const existing = requireSession(session.id)
      const updated: StoredHistorySession = { session, lifecycleStatus: existing.lifecycleStatus, savedAt: now() }
      sessions.save(updated)
      return updated
    },

    saveGroceryItem(item: GroceryItem): GroceryItem {
      items.save(item)
      return item
    },

    getGroceryItemsForSession(id: HistorySessionId): readonly GroceryItem[] {
      const stored = requireSession(id)
      const idSet = new Set(stored.session.groceryItemIds)
      return items.getAll().filter((item) => idSet.has(item.id))
    },

    resume(id: HistorySessionId): StoredHistorySession {
      const stored = requireSession(id)
      if (stored.lifecycleStatus === 'archived') throw new SessionArchivedError(id)
      return stored
    },

    rename(id: HistorySessionId, title: string): StoredHistorySession {
      const stored = requireSession(id)
      const updated: StoredHistorySession = {
        ...stored,
        session: { ...stored.session, title },
        savedAt: now(),
      }
      sessions.save(updated)
      return updated
    },

    duplicate(id: HistorySessionId, title?: string): StoredHistorySession {
      const stored = requireSession(id)
      const originalItems = items.getAll().filter((item) => stored.session.groceryItemIds.includes(item.id))

      const duplicatedItems: GroceryItem[] = originalItems.map((item) => {
        const duplicatedItemBase = {
          id: generateId() as GroceryItemId,
          householdId: item.householdId,
          name: item.name,
          category: item.category,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          paidByMemberId: item.paidByMemberId,
          sharedByMemberIds: item.sharedByMemberIds,
          addedAt: now(),
        }
        return item.notes === undefined ? duplicatedItemBase : { ...duplicatedItemBase, notes: item.notes }
      })
      items.saveMany(duplicatedItems)

      const newSessionBase = {
        id: generateId() as HistorySessionId,
        householdId: stored.session.householdId,
        title: title ?? `${stored.session.title} (copy)`,
        memberIds: stored.session.memberIds,
        groceryItemIds: duplicatedItems.map((item) => item.id),
        startedAt: now(),
        status: 'in_progress' as const,
      }
      const newSession: HistorySession =
        stored.session.notes === undefined
          ? newSessionBase
          : { ...newSessionBase, notes: stored.session.notes }
      const newStored: StoredHistorySession = { session: newSession, lifecycleStatus: 'active', savedAt: now() }
      sessions.save(newStored)
      return newStored
    },

    archive(id: HistorySessionId): StoredHistorySession {
      const stored = requireSession(id)
      if (stored.lifecycleStatus === 'archived') throw new SessionAlreadyArchivedError(id)
      const updated: StoredHistorySession = { ...stored, lifecycleStatus: 'archived', savedAt: now() }
      sessions.save(updated)
      return updated
    },

    restore(id: HistorySessionId): StoredHistorySession {
      const stored = requireSession(id)
      if (stored.lifecycleStatus === 'active') throw new SessionNotArchivedError(id)
      const updated: StoredHistorySession = { ...stored, lifecycleStatus: 'active', savedAt: now() }
      sessions.save(updated)
      return updated
    },

    delete(id: HistorySessionId): void {
      const stored = requireSession(id)
      items.deleteMany(stored.session.groceryItemIds)
      sessions.delete(id)
    },
  }
}
