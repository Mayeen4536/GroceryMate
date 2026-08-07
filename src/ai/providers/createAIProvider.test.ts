import { describe, expect, it } from 'vitest'
import { createAIProvider } from './createAIProvider'

describe('createAIProvider', () => {
  it('builds a Claude provider for vendor "claude"', () => {
    expect(createAIProvider({ vendor: 'claude', apiKey: 'k', model: 'm' }).providerName).toBe('claude')
  })

  it('builds an OpenAI provider for vendor "openai"', () => {
    expect(createAIProvider({ vendor: 'openai', apiKey: 'k', model: 'm' }).providerName).toBe('openai')
  })

  it('builds a Gemini provider for vendor "gemini"', () => {
    expect(createAIProvider({ vendor: 'gemini', apiKey: 'k', model: 'm' }).providerName).toBe('gemini')
  })

  it('throws for an unsupported vendor value', () => {
    expect(() =>
      createAIProvider({ vendor: 'not-a-real-vendor' as never, apiKey: 'k', model: 'm' }),
    ).toThrow(/unsupported/i)
  })
})
