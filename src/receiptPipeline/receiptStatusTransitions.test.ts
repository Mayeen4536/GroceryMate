import { describe, expect, it } from 'vitest'
import type { AIParsedItemId, HouseholdId, MemberId, Receipt, ReceiptId } from '@/domain'
import { markReceiptFailed, markReceiptProcessed } from './receiptStatusTransitions'

const HOUSEHOLD_ID = 'household-1' as HouseholdId
const MEMBER_ID = 'member-1' as MemberId
const UPLOADED_AT = new Date('2026-01-01T00:00:00.000Z')
const LATER = new Date('2026-01-01T00:05:00.000Z')

function pendingPhotoReceipt(): Receipt {
  return {
    id: 'receipt-1' as ReceiptId,
    householdId: HOUSEHOLD_ID,
    uploadedByMemberId: MEMBER_ID,
    uploadedAt: UPLOADED_AT,
    source: 'photo',
    imageUrl: 'blob:test-image',
    processingStatus: 'pending',
  }
}

function pendingPastedReceipt(): Receipt {
  return {
    id: 'receipt-2' as ReceiptId,
    householdId: HOUSEHOLD_ID,
    uploadedByMemberId: MEMBER_ID,
    uploadedAt: UPLOADED_AT,
    source: 'pasted_text',
    text: 'Mayeen bought rice for 800.',
    processingStatus: 'pending',
  }
}

describe('markReceiptProcessed', () => {
  it('moves a pending photo receipt to processed, keeping its identity and image untouched', () => {
    const updated = markReceiptProcessed(pendingPhotoReceipt(), ['parsed-1' as AIParsedItemId], () => LATER)

    expect(updated).toEqual({
      id: 'receipt-1',
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      uploadedAt: UPLOADED_AT,
      source: 'photo',
      imageUrl: 'blob:test-image',
      processingStatus: 'processed',
      processedAt: LATER,
      parsedItemIds: ['parsed-1'],
    })
  })

  it('preserves a pasted-text receipt\'s text rather than an image url', () => {
    const updated = markReceiptProcessed(pendingPastedReceipt(), [], () => LATER)
    expect(updated.source).toBe('pasted_text')
    expect('text' in updated && updated.text).toBe('Mayeen bought rice for 800.')
    expect('imageUrl' in updated).toBe(false)
  })
})

describe('markReceiptFailed', () => {
  it('moves a pending receipt to failed with a reason, dropping no identity fields', () => {
    const updated = markReceiptFailed(pendingPhotoReceipt(), 'OCR provider unavailable', () => LATER)

    expect(updated).toEqual({
      id: 'receipt-1',
      householdId: HOUSEHOLD_ID,
      uploadedByMemberId: MEMBER_ID,
      uploadedAt: UPLOADED_AT,
      source: 'photo',
      imageUrl: 'blob:test-image',
      processingStatus: 'failed',
      failedAt: LATER,
      reason: 'OCR provider unavailable',
    })
  })
})
