import { GROCERY_CATEGORIES } from '@/domain/GroceryItem'
import type { GroceryCategory } from '@/domain/GroceryItem'
import type { SuggestedSharing } from '@/domain/AIParsedItem'
import { AIResponseFormatError, AIResponseSchemaError } from './errors'

export const CATEGORY_IDS: readonly GroceryCategory[] = GROCERY_CATEGORIES
const CATEGORY_ID_SET = new Set<string>(CATEGORY_IDS)
const DEFAULT_CATEGORY: GroceryCategory = 'pantry'

/** One grocery line, after coercion and defaulting — still untrusted in the sense that it's the AI's guess, but shape-safe. */
export interface ValidatedGroceryLine {
  readonly itemName: string
  readonly quantity: number
  /** The price exactly as stated in the text, or null if none was mentioned. Never derived or computed. */
  readonly statedPrice: number | null
  readonly category: GroceryCategory
  readonly payerName: string
  readonly sharedBy: SuggestedSharing
  /** False when `sharedBy` had to be defaulted because the AI didn't mention any sharing arrangement. */
  readonly sharedByWasExplicit: boolean
}

export interface SkippedLine {
  readonly raw: unknown
  readonly reason: string
}

export interface ValidatedGroceryParseResponse {
  readonly validLines: readonly ValidatedGroceryLine[]
  readonly skipped: readonly SkippedLine[]
}

/**
 * Turns raw AI response text into a JS value, tolerating the most common
 * way models ignore "no markdown" instructions: wrapping the JSON in a
 * ```json fenced code block. Throws `AIResponseFormatError` if the result
 * still isn't valid JSON.
 */
export function parseAIResponseText(rawText: string): unknown {
  const withoutFences = stripCodeFences(rawText.trim())
  try {
    return JSON.parse(withoutFences)
  } catch {
    throw new AIResponseFormatError(rawText)
  }
}

function stripCodeFences(text: string): string {
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text)
  return fenceMatch ? fenceMatch[1] : text
}

/**
 * Validates the AI's parsed JSON against exactly the fields grocery
 * extraction is allowed to produce. This is the actual enforcement of
 * "AI should never calculate money, only extract": nothing here reads a
 * "total", "amountPerPerson", or any other derived field, so even if a
 * model ignored its instructions and invented one, it can never reach the
 * rest of the app — this function simply never looks at it.
 *
 * Individual malformed lines are skipped (with a reason) rather than
 * failing the whole response, so one bad line doesn't discard everything
 * else the AI got right.
 */
export function validateGroceryParseResponse(raw: unknown): ValidatedGroceryParseResponse {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new AIResponseSchemaError('response is not a JSON object', raw)
  }
  const items = (raw as Record<string, unknown>).items
  if (!Array.isArray(items)) {
    throw new AIResponseSchemaError('response has no "items" array', raw)
  }

  const validLines: ValidatedGroceryLine[] = []
  const skipped: SkippedLine[] = []

  for (const rawLine of items) {
    const result = validateLine(rawLine)
    if (result.ok) validLines.push(result.line)
    else skipped.push({ raw: rawLine, reason: result.reason })
  }

  return { validLines, skipped }
}

type LineValidationResult = { readonly ok: true; readonly line: ValidatedGroceryLine } | { readonly ok: false; readonly reason: string }

function validateLine(rawLine: unknown): LineValidationResult {
  if (typeof rawLine !== 'object' || rawLine === null || Array.isArray(rawLine)) {
    return { ok: false, reason: 'line is not an object' }
  }
  const line = rawLine as Record<string, unknown>

  const itemName = typeof line.itemName === 'string' ? line.itemName.trim() : ''
  if (itemName.length === 0) {
    return { ok: false, reason: 'missing or empty "itemName"' }
  }

  const payerName = typeof line.payerName === 'string' ? line.payerName.trim() : ''
  if (payerName.length === 0) {
    return { ok: false, reason: 'missing or empty "payerName"' }
  }

  const quantity = toPositiveInteger(line.quantity) ?? 1
  const statedPrice = toNonNegativeFinite(line.statedPrice)
  const category = toGroceryCategory(line.category)
  const { sharedBy, wasExplicit } = toSuggestedSharing(line.sharedBy, payerName)

  return {
    ok: true,
    line: { itemName, quantity, statedPrice, category, payerName, sharedBy, sharedByWasExplicit: wasExplicit },
  }
}

function toPositiveInteger(value: unknown): number | null {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.round(num)
}

function toNonNegativeFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

function toGroceryCategory(value: unknown): GroceryCategory {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (CATEGORY_ID_SET.has(normalized)) return normalized as GroceryCategory
  }
  return DEFAULT_CATEGORY
}

function toSuggestedSharing(
  value: unknown,
  payerName: string,
): { readonly sharedBy: SuggestedSharing; readonly wasExplicit: boolean } {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if (obj.scope === 'everyone') {
      return { sharedBy: { scope: 'everyone' }, wasExplicit: true }
    }
    if (obj.scope === 'specific' && Array.isArray(obj.names)) {
      const names = obj.names
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .map((name) => name.trim())
      if (names.length > 0) {
        return { sharedBy: { scope: 'specific', names }, wasExplicit: true }
      }
    }
  }
  // No usable sharing info: default to "just the payer", i.e. a personal item.
  return { sharedBy: { scope: 'specific', names: [payerName] }, wasExplicit: false }
}
