import type { AICompletionRequest, AIProvider } from '../AIProvider'
import { AIProviderError } from '../errors'

export interface GeminiProviderConfig {
  readonly apiKey: string
  readonly model: string
  /**
   * Overridable on purpose: calling Gemini directly from a browser means
   * shipping `apiKey` in client-side code, which anyone can read out of
   * the network tab. Point this at a same-origin backend proxy that holds
   * the real key server-side for anything beyond local development.
   */
  readonly baseUrl?: string
  /** Injectable for testing; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiGenerateContentResponse {
  readonly candidates?: ReadonlyArray<{
    readonly content?: { readonly parts?: ReadonlyArray<{ readonly text?: string }> }
  }>
}

/** Adapts Gemini's `generateContent` API to the generic `AIProvider` contract. */
export function createGeminiProvider(config: GeminiProviderConfig): AIProvider {
  const fetchImpl = config.fetchImpl ?? fetch
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  return {
    providerName: 'gemini',

    async complete({ systemPrompt, userMessage }: AICompletionRequest): Promise<string> {
      const url = `${baseUrl}/${config.model}:generateContent?key=${config.apiKey}`
      let response: Response
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          }),
        })
      } catch (cause) {
        throw new AIProviderError('gemini', `request failed: ${String(cause)}`)
      }

      if (!response.ok) {
        throw new AIProviderError('gemini', `HTTP ${response.status}: ${await safeText(response)}`)
      }

      const body = (await response.json()) as GeminiGenerateContentResponse
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text
      if (text === undefined) {
        throw new AIProviderError('gemini', 'response contained no candidate text')
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
