import { describe, expect, it } from 'vitest'
import type { HouseholdId, MemberId } from '@/domain'
import { createReceiptUploadService } from './receiptUploadService'

const HOUSEHOLD_ID = 'household-1' as HouseholdId
const MEMBER_ID = 'member-1' as MemberId
const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z')

describe('createReceiptUploadService', () => {
  it('builds a pending photo receipt from an uploaded image', () => {
    const service = createReceiptUploadService({ generateId: () => 'receipt-1', now: () => FIXED_NOW })

    const receipt = service.upload({
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      content: { kind: 'photo', imageUrl: 'blob:test-image' },
    })

    expect(receipt).toEqual({
      id: 'receipt-1',
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      uploadedAt: FIXED_NOW,
      source: 'photo',
      imageUrl: 'blob:test-image',
      processingStatus: 'pending',
    })
  })

  it('builds a pending pasted-text receipt, with no imageUrl at all', () => {
    const service = createReceiptUploadService({ generateId: () => 'receipt-2', now: () => FIXED_NOW })

    const receipt = service.upload({
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      content: { kind: 'pasted_text', text: 'Mayeen bought rice for 800.' },
    })

    expect(receipt).toEqual({
      id: 'receipt-2',
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      uploadedAt: FIXED_NOW,
      source: 'pasted_text',
      text: 'Mayeen bought rice for 800.',
      processingStatus: 'pending',
    })
    expect('imageUrl' in receipt).toBe(false)
  })

  it('defaults to crypto.randomUUID and the real clock when no overrides are given', () => {
    const service = createReceiptUploadService()
    const receipt = service.upload({
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      content: { kind: 'pasted_text', text: 'irrelevant' },
    })
    expect(receipt.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(receipt.uploadedAt).toBeInstanceOf(Date)
  })
})
