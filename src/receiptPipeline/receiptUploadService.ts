import type { HouseholdId, MemberId, Receipt, ReceiptId } from '@/domain'

/** A photo the member just took or picked, already available at some URL (a blob URL, a data URL, or eventually a hosted one). */
export interface PhotoUploadContent {
  readonly kind: 'photo'
  readonly imageUrl: string
}

/** Receipt text the member pasted in directly — no OCR stage needed for this one. */
export interface PastedTextUploadContent {
  readonly kind: 'pasted_text'
  readonly text: string
}

export type ReceiptUploadContent = PhotoUploadContent | PastedTextUploadContent

export interface ReceiptUploadInput {
  readonly householdId: HouseholdId
  readonly uploadedByMemberId: MemberId
  readonly content: ReceiptUploadContent
}

/**
 * The pipeline's first stage: turn whatever a member just submitted into a
 * `Receipt` record, pending processing. Responsibility ends there —
 * persisting the result is a separate concern (a future `ReceiptRepository`
 * following the same pattern as `persistence/historySessionRepository.ts`),
 * kept out of this stage so upload doesn't have to know about storage.
 */
export interface ReceiptUploadService {
  upload(input: ReceiptUploadInput): Receipt
}

export interface ReceiptUploadServiceDeps {
  /** Defaults to `crypto.randomUUID`; override in tests for deterministic ids. */
  readonly generateId?: () => string
  /** Defaults to `() => new Date()`; override in tests for a deterministic timestamp. */
  readonly now?: () => Date
}

export function createReceiptUploadService(deps: ReceiptUploadServiceDeps = {}): ReceiptUploadService {
  const generateId = deps.generateId ?? (() => crypto.randomUUID())
  const now = deps.now ?? (() => new Date())

  return {
    upload(input: ReceiptUploadInput): Receipt {
      const base = {
        id: generateId() as ReceiptId,
        householdId: input.householdId,
        uploadedByMemberId: input.uploadedByMemberId,
        uploadedAt: now(),
        processingStatus: 'pending' as const,
      }

      return input.content.kind === 'photo'
        ? { ...base, source: 'photo' as const, imageUrl: input.content.imageUrl }
        : { ...base, source: 'pasted_text' as const, text: input.content.text }
    },
  }
}
