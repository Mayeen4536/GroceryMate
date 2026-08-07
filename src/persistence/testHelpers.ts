import { CURRENCIES } from '@/domain/Currency'
import type { GroceryItem } from '@/domain/GroceryItem'
import type { GroceryItemId, HouseholdId, MemberId } from '@/domain/ids'
import type { KeyValueStore } from './LocalStorageRepository'

/** Fixture factories and fakes shared by the persistence test suites. Not itself a test file. */

export const TEST_HOUSEHOLD_ID = 'household-1' as HouseholdId
export const TEST_MEMBER_IDS = ['aisha', 'bilal'] as MemberId[]

/** A plain in-memory `KeyValueStore` — same contract as `window.localStorage`, no browser required. */
export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

/** A deterministic id generator: `${prefix}-1`, `${prefix}-2`, ... */
export function createDeterministicIdGenerator(prefix: string): () => string {
  let counter = 0
  return () => {
    counter += 1
    return `${prefix}-${counter}`
  }
}

/** A deterministic clock that advances by one millisecond on every call, so ordering assertions never tie. */
export function createFixedClock(startIso: string): () => Date {
  let currentMillis = new Date(startIso).getTime()
  return () => {
    const snapshot = new Date(currentMillis)
    currentMillis += 1
    return snapshot
  }
}

export function makeGroceryItem(overrides: {
  id: string
  paidBy?: string
  sharedBy?: readonly string[]
  unitPriceMinorUnits?: number
}): GroceryItem {
  return {
    id: overrides.id as GroceryItemId,
    householdId: TEST_HOUSEHOLD_ID,
    name: 'Test item',
    category: 'pantry',
    unitPrice: { minorUnits: overrides.unitPriceMinorUnits ?? 100, currency: CURRENCIES.BDT },
    quantity: 1,
    paidByMemberId: (overrides.paidBy ?? TEST_MEMBER_IDS[0]) as MemberId,
    sharedByMemberIds: (overrides.sharedBy ?? TEST_MEMBER_IDS).map((id) => id as MemberId),
    addedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}
