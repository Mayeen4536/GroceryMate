import { describe, expect, it, vi } from 'vitest'
import { AIProviderError } from '../errors'
import { createClaudeProvider } from './ClaudeProvider'

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

describe('createClaudeProvider', () => {
  it('sends the system prompt and user message in Anthropic\'s Messages API shape', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ content: [{ type: 'text', text: '{"items": []}' }] }))
    const provider = createClaudeProvider({ apiKey: 'test-key', model: 'claude-test', fetchImpl })

    await provider.complete({ systemPrompt: 'Extract groceries.', userMessage: 'Mayeen bought rice.' })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.headers['x-api-key']).toBe('test-key')
    expect(init.headers['anthropic-version']).toBeTruthy()
    const body = JSON.parse(init.body)
    expect(body.model).toBe('claude-test')
    expect(body.system).toBe('Extract groceries.')
    expect(body.messages).toEqual([{ role: 'user', content: 'Mayeen bought rice.' }])
  })

  it('extracts the text content block from the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ content: [{ type: 'text', text: 'hello' }] }))
    const provider = createClaudeProvider({ apiKey: 'k', model: 'm', fetchImpl })
    expect(await provider.complete({ systemPrompt: '', userMessage: '' })).toBe('hello')
  })

  it('uses a custom baseUrl when given, so calls can be routed through a backend proxy', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ content: [{ type: 'text', text: '{}' }] }))
    const provider = createClaudeProvider({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://my-backend.example.com/ai/claude',
      fetchImpl,
    })
    await provider.complete({ systemPrompt: '', userMessage: '' })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://my-backend.example.com/ai/claude')
  })

  it('throws AIProviderError on a non-2xx HTTP response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }))
    const provider = createClaudeProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('throws AIProviderError when the network request itself fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    const provider = createClaudeProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('throws AIProviderError when the response has no text content block', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ content: [] }))
    const provider = createClaudeProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('identifies itself as "claude"', () => {
    expect(createClaudeProvider({ apiKey: 'k', model: 'm' }).providerName).toBe('claude')
  })
})
