import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain'
import type { AIParsedItemId, HouseholdId, MemberId } from '@/domain'
import { createReceiptConfirmationService } from './receiptConfirmationService'

const HOUSEHOLD_ID = 'household-1' as HouseholdId
const MAYEEN = 'member-mayeen' as MemberId
const RAHIM = 'member-rahim' as MemberId
const PARSED_ITEM_ID = 'parsed-1' as AIParsedItemId
const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z')

describe('createReceiptConfirmationService', () => {
  it('assembles a confirmed candidate into a real GroceryItem', () => {
    const service = createReceiptConfirmationService({ generateId: () => 'grocery-1', now: () => FIXED_NOW })

    const { groceryItem, parsedItemId } = service.confirm(
      {
        parsedItemId: PARSED_ITEM_ID,
        name: 'Rice',
        category: 'pantry',
        quantity: 1,
        unitPrice: { minorUnits: 80000, currency: CURRENCIES.BDT },
        paidByMemberId: MAYEEN,
        sharedByMemberIds: [MAYEEN, RAHIM],
      },
      HOUSEHOLD_ID,
    )

    expect(groceryItem).toEqual({
      id: 'grocery-1',
      householdId: HOUSEHOLD_ID,
      name: 'Rice',
      category: 'pantry',
      unitPrice: { minorUnits: 80000, currency: CURRENCIES.BDT },
      quantity: 1,
      paidByMemberId: MAYEEN,
      sharedByMemberIds: [MAYEEN, RAHIM],
      addedAt: FIXED_NOW,
    })
    expect(parsedItemId).toBe(PARSED_ITEM_ID)
  })

  it('includes notes only when the confirmation provided them', () => {
    const service = createReceiptConfirmationService({ generateId: () => 'grocery-1', now: () => FIXED_NOW })

    const withoutNotes = service.confirm(
      {
        parsedItemId: PARSED_ITEM_ID,
        name: 'Rice',
        category: 'pantry',
        quantity: 1,
        unitPrice: { minorUnits: 80000, currency: CURRENCIES.BDT },
        paidByMemberId: MAYEEN,
        sharedByMemberIds: [MAYEEN],
      },
      HOUSEHOLD_ID,
    )
    expect('notes' in withoutNotes.groceryItem).toBe(false)

    const withNotes = service.confirm(
      {
        parsedItemId: PARSED_ITEM_ID,
        name: 'Rice',
        category: 'pantry',
        quantity: 1,
        unitPrice: { minorUnits: 80000, currency: CURRENCIES.BDT },
        paidByMemberId: MAYEEN,
        sharedByMemberIds: [MAYEEN],
        notes: 'brand X',
      },
      HOUSEHOLD_ID,
    )
    expect(withNotes.groceryItem.notes).toBe('brand X')
  })

  it('lets a member correct the AI-guessed name, category, quantity, and price', () => {
    const service = createReceiptConfirmationService({ generateId: () => 'grocery-1', now: () => FIXED_NOW })

    const { groceryItem } = service.confirm(
      {
        parsedItemId: PARSED_ITEM_ID,
        name: 'Basmati Rice (5kg)',
        category: 'produce',
        quantity: 2,
        unitPrice: { minorUnits: 90000, currency: CURRENCIES.BDT },
        paidByMemberId: RAHIM,
        sharedByMemberIds: [RAHIM],
      },
      HOUSEHOLD_ID,
    )

    expect(groceryItem.name).toBe('Basmati Rice (5kg)')
    expect(groceryItem.category).toBe('produce')
    expect(groceryItem.quantity).toBe(2)
    expect(groceryItem.paidByMemberId).toBe(RAHIM)
  })
})
