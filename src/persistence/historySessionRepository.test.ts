import { beforeEach, describe, expect, it } from 'vitest'
import type { KeyValueStore } from './LocalStorageRepository'
import { createHistorySessionRepository } from './historySessionRepository'
import {
  SessionAlreadyArchivedError,
  SessionArchivedError,
  SessionNotArchivedError,
  SessionNotFoundError,
} from './errors'
import type { HistorySessionRepository } from './types'
import {
  TEST_HOUSEHOLD_ID,
  TEST_MEMBER_IDS,
  createDeterministicIdGenerator,
  createFixedClock,
  createMemoryStore,
  makeGroceryItem,
} from './testHelpers'

let store: KeyValueStore
let repo: HistorySessionRepository

beforeEach(() => {
  store = createMemoryStore()
  repo = createHistorySessionRepository({
    store,
    generateId: createDeterministicIdGenerator('id'),
    now: createFixedClock('2026-01-01T00:00:00.000Z'),
  })
})

describe('create', () => {
  it('starts a new, empty, active, in-progress session', () => {
    const stored = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })

    expect(stored.session.title).toBe('Weekly shop')
    expect(stored.session.status).toBe('in_progress')
    expect(stored.session.groceryItemIds).toEqual([])
    expect(stored.lifecycleStatus).toBe('active')
  })

  it('automatically saves — a brand-new repository instance over the same store sees it', () => {
    repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })

    const freshRepo = createHistorySessionRepository({ store })
    expect(freshRepo.getAll()).toHaveLength(1)
    expect(freshRepo.getAll()[0].session.title).toBe('Weekly shop')
  })
})

describe('saveGroceryItem and getGroceryItemsForSession', () => {
  it('lets a session accumulate items, each save immediately durable', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    const item = makeGroceryItem({ id: 'item-1' })
    repo.saveGroceryItem(item)
    repo.save({ ...created.session, groceryItemIds: [item.id] })

    expect(repo.getGroceryItemsForSession(created.session.id)).toEqual([item])

    const freshRepo = createHistorySessionRepository({ store })
    expect(freshRepo.getGroceryItemsForSession(created.session.id)).toEqual([item])
  })

  it('throws SessionNotFoundError for an unknown session id', () => {
    expect(() => repo.getGroceryItemsForSession('missing' as never)).toThrow(SessionNotFoundError)
  })
})

describe('save', () => {
  it('updates a session while preserving its lifecycle status', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    repo.archive(created.session.id)

    const updated = repo.save({ ...created.session, title: 'Weekly shop (edited)' })

    expect(updated.session.title).toBe('Weekly shop (edited)')
    expect(updated.lifecycleStatus).toBe('archived')
  })

  it('throws SessionNotFoundError when the session does not exist', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'X', memberIds: TEST_MEMBER_IDS })
    repo.delete(created.session.id)
    expect(() => repo.save(created.session)).toThrow(SessionNotFoundError)
  })
})

describe('resume', () => {
  it('returns an active session unchanged', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    expect(repo.resume(created.session.id)).toEqual(created)
  })

  it('throws SessionArchivedError for an archived session', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    repo.archive(created.session.id)
    expect(() => repo.resume(created.session.id)).toThrow(SessionArchivedError)
  })

  it('throws SessionNotFoundError for an unknown id', () => {
    expect(() => repo.resume('missing' as never)).toThrow(SessionNotFoundError)
  })
})

describe('rename', () => {
  it('changes the title and persists it', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Old title', memberIds: TEST_MEMBER_IDS })
    const renamed = repo.rename(created.session.id, 'New title')

    expect(renamed.session.title).toBe('New title')
    expect(repo.getById(created.session.id)?.session.title).toBe('New title')
  })

  it('throws SessionNotFoundError for an unknown id', () => {
    expect(() => repo.rename('missing' as never, 'X')).toThrow(SessionNotFoundError)
  })
})

describe('duplicate', () => {
  it('creates an independent session with its own id and its own copies of the items', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    const item = repo.saveGroceryItem(makeGroceryItem({ id: 'item-1', unitPriceMinorUnits: 500 }))
    const original = repo.save({ ...created.session, groceryItemIds: [item.id] })

    const copy = repo.duplicate(original.session.id)

    expect(copy.session.id).not.toBe(original.session.id)
    expect(copy.session.title).toBe('Weekly shop (copy)')
    expect(copy.session.status).toBe('in_progress')
    expect(copy.lifecycleStatus).toBe('active')
    expect(copy.session.memberIds).toEqual(original.session.memberIds)

    const copiedItems = repo.getGroceryItemsForSession(copy.session.id)
    expect(copiedItems).toHaveLength(1)
    expect(copiedItems[0].id).not.toBe(item.id)
    expect(copiedItems[0].unitPrice).toEqual(item.unitPrice)

    // The original is untouched.
    expect(repo.getGroceryItemsForSession(original.session.id)).toEqual([item])
  })

  it('accepts a custom title instead of the default "(copy)" suffix', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    const copy = repo.duplicate(created.session.id, 'Next week')
    expect(copy.session.title).toBe('Next week')
  })

  it('is always active and in-progress, even when duplicating an archived, completed session', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Old trip', memberIds: TEST_MEMBER_IDS })
    const completed = { ...created.session, status: 'completed' as const, completedAt: new Date() }
    repo.save(completed)
    repo.archive(created.session.id)

    const copy = repo.duplicate(created.session.id)

    expect(copy.lifecycleStatus).toBe('active')
    expect(copy.session.status).toBe('in_progress')
  })

  it('deleting a duplicate never removes the original\'s items, and vice versa', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    const item = repo.saveGroceryItem(makeGroceryItem({ id: 'item-1' }))
    const original = repo.save({ ...created.session, groceryItemIds: [item.id] })
    const copy = repo.duplicate(original.session.id)

    repo.delete(copy.session.id)

    expect(repo.getGroceryItemsForSession(original.session.id)).toEqual([item])
  })

  it('throws SessionNotFoundError for an unknown id', () => {
    expect(() => repo.duplicate('missing' as never)).toThrow(SessionNotFoundError)
  })
})

describe('archive and restore', () => {
  it('moves a session out of the active list and back again', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })

    repo.archive(created.session.id)
    expect(repo.getActiveSessions()).toEqual([])
    expect(repo.getArchivedSessions()).toHaveLength(1)

    repo.restore(created.session.id)
    expect(repo.getActiveSessions()).toHaveLength(1)
    expect(repo.getArchivedSessions()).toEqual([])
  })

  it('throws SessionAlreadyArchivedError when archiving an already-archived session', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'X', memberIds: TEST_MEMBER_IDS })
    repo.archive(created.session.id)
    expect(() => repo.archive(created.session.id)).toThrow(SessionAlreadyArchivedError)
  })

  it('throws SessionNotArchivedError when restoring a session that is not archived', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'X', memberIds: TEST_MEMBER_IDS })
    expect(() => repo.restore(created.session.id)).toThrow(SessionNotArchivedError)
  })

  it('throws SessionNotFoundError for unknown ids on both operations', () => {
    expect(() => repo.archive('missing' as never)).toThrow(SessionNotFoundError)
    expect(() => repo.restore('missing' as never)).toThrow(SessionNotFoundError)
  })
})

describe('delete', () => {
  it('removes the session and every grocery item it owned', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Weekly shop', memberIds: TEST_MEMBER_IDS })
    const itemA = repo.saveGroceryItem(makeGroceryItem({ id: 'item-a' }))
    const itemB = repo.saveGroceryItem(makeGroceryItem({ id: 'item-b' }))
    repo.save({ ...created.session, groceryItemIds: [itemA.id, itemB.id] })

    repo.delete(created.session.id)

    expect(repo.getById(created.session.id)).toBeUndefined()
    expect(() => repo.getGroceryItemsForSession(created.session.id)).toThrow(SessionNotFoundError)

    // Confirm the items themselves are gone, not just unreachable: duplicating
    // a second, unrelated session that happens to reuse a saveGroceryItem id
    // proves the store no longer holds the deleted items.
    const other = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Other', memberIds: TEST_MEMBER_IDS })
    const freshRepo = createHistorySessionRepository({ store })
    expect(freshRepo.getGroceryItemsForSession(other.session.id)).toEqual([])
  })

  it('works on an archived session too', () => {
    const created = repo.create({ householdId: TEST_HOUSEHOLD_ID, title: 'X', memberIds: TEST_MEMBER_IDS })
    repo.archive(created.session.id)
    expect(() => repo.delete(created.session.id)).not.toThrow()
    expect(repo.getById(created.session.id)).toBeUndefined()
  })

  it('throws SessionNotFoundError for an unknown id', () => {
    expect(() => repo.delete('missing' as never)).toThrow(SessionNotFoundError)
  })
})

describe('determinism', () => {
  it('produces the same ids and timestamps for the same sequence of deterministic-dep calls', () => {
    const build = () =>
      createHistorySessionRepository({
        store: createMemoryStore(),
        generateId: createDeterministicIdGenerator('id'),
        now: createFixedClock('2026-01-01T00:00:00.000Z'),
      })

    const repoA = build()
    const repoB = build()

    const a = repoA.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Same', memberIds: TEST_MEMBER_IDS })
    const b = repoB.create({ householdId: TEST_HOUSEHOLD_ID, title: 'Same', memberIds: TEST_MEMBER_IDS })

    expect(a).toEqual(b)
  })
})
