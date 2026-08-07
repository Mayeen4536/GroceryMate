import type { AIParsedItem } from '@/domain/AIParsedItem'
import type { Currency } from '@/domain/Currency'
import type { AIParsedItemId, HouseholdId } from '@/domain/ids'
import type { AIProvider } from './AIProvider'
import { computeConfidence } from './confidence'
import { buildGroceryParsingSystemPrompt } from './groceryParsingPrompt'
import { majorUnitsToMoney } from './priceConversion'
import { parseAIResponseText, validateGroceryParseResponse } from './rawResponseSchema'
import type { SkippedLine } from './rawResponseSchema'

export interface GroceryParseInput {
  readonly householdId: HouseholdId
  /** The free-form text a member typed, e.g. "Mayeen bought rice for 800. Everyone shared it." */
  readonly text: string
  /** Given as context so the AI can recognize who's being referred to; never used to resolve ids here. */
  readonly knownMemberNames: readonly string[]
  /** The household's settlement currency, used only to convert a stated major-unit price into `Money`. */
  readonly currency: Currency
}

export interface GroceryParseResult {
  readonly items: readonly AIParsedItem[]
  /** Lines the AI returned that didn't have enough structure to use (e.g. no payer). Not fatal to the batch. */
  readonly skipped: readonly SkippedLine[]
}

export interface GroceryParser {
  parse(input: GroceryParseInput): Promise<GroceryParseResult>
}

export interface GroceryParserDeps {
  readonly provider: AIProvider
  /** Defaults to `crypto.randomUUID`; override in tests for deterministic ids. */
  readonly generateId?: () => string
}

/**
 * The grocery-parsing use case: turn free text into candidate
 * `AIParsedItem`s. Responsibility: prompt construction, response
 * validation, and the (non-AI, deterministic) conversion from "price as
 * written" to `Money` — never any settlement math, and never trusting the
 * AI's output further than the schema in `rawResponseSchema.ts` allows.
 */
export function createGroceryParser(deps: GroceryParserDeps): GroceryParser {
  const generateId = deps.generateId ?? (() => crypto.randomUUID())

  return {
    async parse(input: GroceryParseInput): Promise<GroceryParseResult> {
      const systemPrompt = buildGroceryParsingSystemPrompt(input.knownMemberNames)
      const rawText = await deps.provider.complete({ systemPrompt, userMessage: input.text })

      const rawJson = parseAIResponseText(rawText)
      const { validLines, skipped } = validateGroceryParseResponse(rawJson)

      const knownNamesLower = new Set(input.knownMemberNames.map((name) => name.toLowerCase()))

      const items: AIParsedItem[] = validLines.map((line) => {
        const confidence = computeConfidence({
          hasStatedPrice: line.statedPrice !== null,
          sharedByWasExplicit: line.sharedByWasExplicit,
          payerMatchesKnownMember: knownNamesLower.has(line.payerName.toLowerCase()),
        })

        const base = {
          id: generateId() as AIParsedItemId,
          householdId: input.householdId,
          parsedName: line.itemName,
          parsedCategory: line.category,
          parsedQuantity: line.quantity,
          parsedPayerName: line.payerName,
          parsedSharedBy: line.sharedBy,
          confidence,
          reviewed: false,
          origin: 'prompt' as const,
          promptText: input.text,
        }

        return line.statedPrice === null
          ? base
          : { ...base, parsedUnitPrice: majorUnitsToMoney(line.statedPrice, input.currency) }
      })

      return { items, skipped }
    },
  }
}
