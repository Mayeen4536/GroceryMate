import type { AIParsedItemId, Receipt } from '@/domain'

function identityAndContent(receipt: Receipt) {
  const identity = {
    id: receipt.id,
    householdId: receipt.householdId,
    uploadedByMemberId: receipt.uploadedByMemberId,
    uploadedAt: receipt.uploadedAt,
  }
  const content =
    receipt.source === 'photo'
      ? { source: 'photo' as const, imageUrl: receipt.imageUrl }
      : { source: 'pasted_text' as const, text: receipt.text }
  return { ...identity, ...content }
}

/**
 * Advances a pending `Receipt` to `processed` once the pipeline has
 * produced candidates for it. A pure, deterministic transform — persisting
 * the result is the caller's concern, same as `receiptUploadService.ts`.
 */
export function markReceiptProcessed(
  receipt: Receipt,
  parsedItemIds: readonly AIParsedItemId[],
  now: () => Date = () => new Date(),
): Receipt {
  return { ...identityAndContent(receipt), processingStatus: 'processed', processedAt: now(), parsedItemIds }
}

/** Advances a pending `Receipt` to `failed` when OCR, cleanup, or parsing couldn't be completed. */
export function markReceiptFailed(receipt: Receipt, reason: string, now: () => Date = () => new Date()): Receipt {
  return { ...identityAndContent(receipt), processingStatus: 'failed', failedAt: now(), reason }
}
