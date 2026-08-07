export type { AICompletionRequest, AIProvider } from './AIProvider'

export { createClaudeProvider } from './providers/ClaudeProvider'
export type { ClaudeProviderConfig } from './providers/ClaudeProvider'
export { createOpenAIProvider } from './providers/OpenAIProvider'
export type { OpenAIProviderConfig } from './providers/OpenAIProvider'
export { createGeminiProvider } from './providers/GeminiProvider'
export type { GeminiProviderConfig } from './providers/GeminiProvider'
export { createFakeAIProvider } from './providers/FakeAIProvider'
export type { FakeAIProvider } from './providers/FakeAIProvider'
export { createAIProvider } from './providers/createAIProvider'
export type { AIProviderConfig, AIProviderVendor } from './providers/createAIProvider'

export { buildGroceryParsingSystemPrompt } from './groceryParsingPrompt'

export { parseAIResponseText, validateGroceryParseResponse, CATEGORY_IDS } from './rawResponseSchema'
export type { SkippedLine, ValidatedGroceryLine, ValidatedGroceryParseResponse } from './rawResponseSchema'

export { majorUnitsToMoney } from './priceConversion'
export { computeConfidence } from './confidence'
export type { ConfidenceSignals } from './confidence'

export { createGroceryParser } from './groceryParser'
export type { GroceryParseInput, GroceryParseResult, GroceryParser, GroceryParserDeps } from './groceryParser'

export {
  GroceryParserError,
  AIProviderError,
  AIResponseFormatError,
  AIResponseSchemaError,
} from './errors'
