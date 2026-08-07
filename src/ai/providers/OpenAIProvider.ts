import type { AICompletionRequest, AIProvider } from '../AIProvider'
import { AIProviderError } from '../errors'

export interface OpenAIProviderConfig {
  readonly apiKey: string
  readonly model: string
  /**
   * Overridable on purpose: calling OpenAI directly from a browser means
   * shipping `apiKey` in client-side code, which anyone can read out of
   * the network tab. Point this at a same-origin backend proxy that holds
   * the real key server-side for anything beyond local development.
   */
  readonly baseUrl?: string
  /** Injectable for testing; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions'

interface OpenAIChatCompletionsResponse {
  readonly choices?: ReadonlyArray<{ readonly message?: { readonly content?: string } }>
}

/** Adapts OpenAI's Chat Completions API to the generic `AIProvider` contract. */
export function createOpenAIProvider(config: OpenAIProviderConfig): AIProvider {
  const fetchImpl = config.fetchImpl ?? fetch
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  return {
    providerName: 'openai',

    async complete({ systemPrompt, userMessage }: AICompletionRequest): Promise<string> {
      let response: Response
      try {
        response = await fetchImpl(baseUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
          }),
        })
      } catch (cause) {
        throw new AIProviderError('openai', `request failed: ${String(cause)}`)
      }

      if (!response.ok) {
        throw new AIProviderError('openai', `HTTP ${response.status}: ${await safeText(response)}`)
      }

      const body = (await response.json()) as OpenAIChatCompletionsResponse
      const text = body.choices?.[0]?.message?.content
      if (text === undefined) {
        throw new AIProviderError('openai', 'response contained no message content')
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
