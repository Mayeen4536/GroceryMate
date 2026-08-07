/**
 * A single request to an LLM: a system prompt (the instructions) and a
 * user message (the content to act on). Deliberately generic — this
 * interface has no idea grocery parsing exists. Responsibility: describe
 * "send a prompt, get text back," nothing about what the prompt says or
 * how the response gets used.
 */
export interface AICompletionRequest {
  readonly systemPrompt: string
  readonly userMessage: string
}

/**
 * Any large-language-model backend that can complete a prompt. This is
 * the entire abstraction boundary: swapping Claude for OpenAI for Gemini
 * (or a test double) means swapping which `AIProvider` gets constructed,
 * never touching anything that depends on this interface.
 */
export interface AIProvider {
  readonly providerName: string
  complete(request: AICompletionRequest): Promise<string>
}
