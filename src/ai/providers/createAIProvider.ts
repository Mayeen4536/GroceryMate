import type { AIProvider } from '../AIProvider'
import { createClaudeProvider } from './ClaudeProvider'
import { createOpenAIProvider } from './OpenAIProvider'
import { createGeminiProvider } from './GeminiProvider'

export type AIProviderVendor = 'claude' | 'openai' | 'gemini'

export interface AIProviderConfig {
  readonly vendor: AIProviderVendor
  readonly apiKey: string
  readonly model: string
  readonly baseUrl?: string
  readonly fetchImpl?: typeof fetch
}

/**
 * The one place that knows all three vendors exist. Everything else in
 * this codebase — `groceryParser.ts` above all — depends only on the
 * `AIProvider` interface and is handed an already-constructed provider;
 * nothing calls `createClaudeProvider` or its siblings directly. Which
 * vendor is active is a runtime config value passed in here, never a
 * hardcoded import somewhere in business logic.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.vendor) {
    case 'claude':
      return createClaudeProvider(config)
    case 'openai':
      return createOpenAIProvider(config)
    case 'gemini':
      return createGeminiProvider(config)
    default: {
      const unreachable: never = config.vendor
      throw new Error(`Unsupported AI provider vendor: ${String(unreachable)}`)
    }
  }
}
