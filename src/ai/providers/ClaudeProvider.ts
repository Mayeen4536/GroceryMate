import type { AICompletionRequest, AIProvider } from '../AIProvider'
import { AIProviderError } from '../errors'

export interface ClaudeProviderConfig {
  readonly apiKey: string
  readonly model: string
  /**
   * Overridable on purpose: calling Anthropic directly from a browser
   * means shipping `apiKey` in client-side code, which anyone can read
   * out of the network tab. Point this at a same-origin backend proxy
   * that holds the real key server-side for anything beyond local
   * development.
   */
  readonly baseUrl?: string
  readonly maxTokens?: number
  /** Injectable for testing; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
}

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MAX_TOKENS = 1024

interface ClaudeMessagesResponse {
  readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>
}

/** Adapts Anthropic's Messages API to the generic `AIProvider` contract. */
export function createClaudeProvider(config: ClaudeProviderConfig): AIProvider {
  const fetchImpl = config.fetchImpl ?? fetch
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  return {
    providerName: 'claude',

    async complete({ systemPrompt, userMessage }: AICompletionRequest): Promise<string> {
      let response: Response
      try {
        response = await fetchImpl(baseUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
        })
      } catch (cause) {
        throw new AIProviderError('claude', `request failed: ${String(cause)}`)
      }

      if (!response.ok) {
        throw new AIProviderError('claude', `HTTP ${response.status}: ${await safeText(response)}`)
      }

      const body = (await response.json()) as ClaudeMessagesResponse
      const text = body.content?.find((block) => block.type === 'text')?.text
      if (text === undefined) {
        throw new AIProviderError('claude', 'response contained no text content block')
      }
      return text
    },
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return '<unreadable response body>'
  }
}
