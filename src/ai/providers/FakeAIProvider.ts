import type { AICompletionRequest, AIProvider } from '../AIProvider'

/**
 * A deterministic, offline stand-in for a real `AIProvider`. Records
 * every request it received so tests can assert on the prompt that was
 * built, without needing real network access.
 *
 * Two modes, chosen by what you pass in:
 * - A single string: every call gets that same response, forever. For
 *   the common case of "this test only cares about one response."
 * - An array: each call consumes the next response in order; calling it
 *   more times than there are queued responses throws, since that
 *   usually means the code under test called the provider more times
 *   than the test expected.
 */
export interface FakeAIProvider extends AIProvider {
  readonly requests: readonly AICompletionRequest[]
}

export function createFakeAIProvider(responses: string | readonly string[]): FakeAIProvider {
  const requests: AICompletionRequest[] = []

  if (typeof responses === 'string') {
    return {
      providerName: 'fake',
      requests,
      async complete(request: AICompletionRequest): Promise<string> {
        requests.push(request)
        return responses
      },
    }
  }

  const queue = [...responses]
  return {
    providerName: 'fake',
    requests,
    async complete(request: AICompletionRequest): Promise<string> {
      requests.push(request)
      if (queue.length === 0) {
        throw new Error('FakeAIProvider has no more queued responses.')
      }
      return queue.shift()!
    },
  }
}
