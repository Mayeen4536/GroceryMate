export interface ReceiptTextCleanupResult {
  readonly cleanedText: string
}

/**
 * The "AI Cleanup" stage: take raw OCR text — often noisy, with misread
 * characters and broken line structure — and produce the most likely
 * intended text, before it's handed to grocery parsing.
 *
 * Deliberately a separate stage from parsing (`ai/groceryParser.ts`)
 * rather than folded into it: cleanup fixes *text*, parsing extracts
 * *structure*, and keeping them apart means each is independently
 * replaceable and testable, matching every other stage in this pipeline.
 * Like grocery parsing, a real implementation must never infer, remove,
 * or calculate anything — only reconstruct what the text most likely said.
 */
export interface ReceiptTextCleanupService {
  clean(rawText: string): Promise<ReceiptTextCleanupResult>
}

/**
 * The current default: passes text through unchanged. A real
 * implementation would call an `AIProvider` (see `ai/AIProvider.ts`) with
 * a cleanup-specific prompt, exactly as `ai/groceryParser.ts` does for
 * extraction — that's deliberately not built yet, since this task is
 * architecture only. A passthrough is a safe default in the meantime:
 * "don't clean" is a valid degraded mode (parsing still runs on whatever
 * text it's given), unlike OCR, which has no such fallback.
 */
export function createPassthroughTextCleaner(): ReceiptTextCleanupService {
  return {
    async clean(rawText: string): Promise<ReceiptTextCleanupResult> {
      return { cleanedText: rawText }
    },
  }
}
