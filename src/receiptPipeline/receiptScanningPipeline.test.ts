import { describe, expect, it, vi } from 'vitest'
import { createFakeAIProvider, createGroceryParser } from '@/ai'
import { CURRENCIES } from '@/domain'
import type { HouseholdId, MemberId, Receipt, ReceiptId } from '@/domain'
import type { OCRProvider } from '@/ocr'
import { createReceiptScanningPipeline } from './receiptScanningPipeline'
import type { ReceiptTextCleanupService } from './receiptTextCleanupService'

const HOUSEHOLD_ID = 'household-1' as HouseholdId
const MEMBER_ID = 'member-1' as MemberId

function photoReceipt(imageUrl = 'blob:test-image'): Receipt {
  return {
    id: 'receipt-1' as ReceiptId,
    householdId: HOUSEHOLD_ID,
    uploadedByMemberId: MEMBER_ID,
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
    source: 'photo',
    imageUrl,
    processingStatus: 'pending',
  }
}

function pastedReceipt(text: string): Receipt {
  return {
    id: 'receipt-2' as ReceiptId,
    householdId: HOUSEHOLD_ID,
    uploadedByMemberId: MEMBER_ID,
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
    source: 'pasted_text',
    text,
    processingStatus: 'pending',
  }
}

function fakeOCRProvider(rawText: string): { provider: OCRProvider; extractText: ReturnType<typeof vi.fn> } {
  const extractText = vi.fn().mockResolvedValue({ rawText })
  return { provider: { providerName: 'fake', extractText }, extractText }
}

function fakeTextCleaner(transform: (raw: string) => string): {
  cleaner: ReceiptTextCleanupService
  clean: ReturnType<typeof vi.fn>
} {
  const clean = vi.fn().mockImplementation(async (rawText: string) => ({ cleanedText: transform(rawText) }))
  return { cleaner: { clean }, clean }
}

const EMPTY_PARSE_RESPONSE = JSON.stringify({ items: [] })

describe('createReceiptScanningPipeline', () => {
  it('for a photo receipt: runs OCR, feeds its raw text to the cleaner, then the cleaned text to the parser', async () => {
    const { provider: ocrProvider, extractText } = fakeOCRProvider('R1ce .... 8O0')
    const { cleaner: textCleaner, clean } = fakeTextCleaner((raw) => raw.replace(/8O0/, '800'))
    const groceryParser = createGroceryParser({ provider: createFakeAIProvider(EMPTY_PARSE_RESPONSE) })
    const pipeline = createReceiptScanningPipeline({ ocrProvider, textCleaner, groceryParser })

    const result = await pipeline.run({
      receipt: photoReceipt(),
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })

    expect(extractText).toHaveBeenCalledWith({ imageUrl: 'blob:test-image' })
    expect(clean).toHaveBeenCalledWith('R1ce .... 8O0')
    expect(result.rawOcrText).toBe('R1ce .... 8O0')
    expect(result.cleanedText).toBe('R1ce .... 800')
  })

  it('for a pasted-text receipt: skips OCR entirely and cleans the pasted text directly', async () => {
    const { provider: ocrProvider, extractText } = fakeOCRProvider('should never be called')
    const { cleaner: textCleaner, clean } = fakeTextCleaner((raw) => raw)
    const groceryParser = createGroceryParser({ provider: createFakeAIProvider(EMPTY_PARSE_RESPONSE) })
    const pipeline = createReceiptScanningPipeline({ ocrProvider, textCleaner, groceryParser })

    const result = await pipeline.run({
      receipt: pastedReceipt('Mayeen bought rice for 800.'),
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })

    expect(extractText).not.toHaveBeenCalled()
    expect(clean).toHaveBeenCalledWith('Mayeen bought rice for 800.')
    expect(result.rawOcrText).toBeNull()
    expect(result.cleanedText).toBe('Mayeen bought rice for 800.')
  })

  it('passes the cleaned text — not the raw OCR text — to the grocery parser', async () => {
    const { provider: ocrProvider } = fakeOCRProvider('raw noisy text')
    const { cleaner: textCleaner } = fakeTextCleaner(() => 'Mayeen bought rice for 800. Everyone shared it.')
    const fakeAI = createFakeAIProvider(
      JSON.stringify({
        items: [{ itemName: 'rice', payerName: 'Mayeen', statedPrice: 800, sharedBy: { scope: 'everyone' } }],
      }),
    )
    const groceryParser = createGroceryParser({ provider: fakeAI })
    const pipeline = createReceiptScanningPipeline({ ocrProvider, textCleaner, groceryParser })

    await pipeline.run({ receipt: photoReceipt(), knownMemberNames: ['Mayeen'], currency: CURRENCIES.BDT })

    expect(fakeAI.requests).toHaveLength(1)
    expect(fakeAI.requests[0].userMessage).toBe('Mayeen bought rice for 800. Everyone shared it.')
  })

  it('returns the parser candidates and any skipped lines end-to-end', async () => {
    const { provider: ocrProvider } = fakeOCRProvider('rice / Mayeen / 800')
    const { cleaner: textCleaner } = fakeTextCleaner((raw) => raw)
    const fakeAI = createFakeAIProvider(
      JSON.stringify({
        items: [
          { itemName: 'rice', payerName: 'Mayeen', statedPrice: 800, sharedBy: { scope: 'everyone' } },
          { itemName: 'mystery item with no payer' },
        ],
      }),
    )
    const groceryParser = createGroceryParser({ provider: fakeAI, generateId: () => 'parsed-1' })
    const pipeline = createReceiptScanningPipeline({ ocrProvider, textCleaner, groceryParser })

    const result = await pipeline.run({
      receipt: photoReceipt(),
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })

    expect(result.parsedItems).toHaveLength(1)
    expect(result.parsedItems[0].parsedName).toBe('rice')
    expect(result.skipped).toHaveLength(1)
  })

  it('propagates an OCR failure without calling the cleaner or the parser', async () => {
    const ocrError = new Error('OCR provider unavailable')
    const ocrProvider: OCRProvider = { providerName: 'fake', extractText: vi.fn().mockRejectedValue(ocrError) }
    const { cleaner: textCleaner, clean } = fakeTextCleaner((raw) => raw)
    const groceryParser = createGroceryParser({ provider: createFakeAIProvider(EMPTY_PARSE_RESPONSE) })
    const pipeline = createReceiptScanningPipeline({ ocrProvider, textCleaner, groceryParser })

    await expect(
      pipeline.run({ receipt: photoReceipt(), knownMemberNames: ['Mayeen'], currency: CURRENCIES.BDT }),
    ).rejects.toThrow('OCR provider unavailable')
    expect(clean).not.toHaveBeenCalled()
  })
})
