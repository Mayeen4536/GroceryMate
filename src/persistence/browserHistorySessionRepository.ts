import { createHistorySessionRepository } from './historySessionRepository'
import type { HistorySessionRepository } from './types'

/**
 * The one place this module touches a real browser. Everything else in
 * `@/persistence` is storage-agnostic and runs the same way in a test as
 * it does in a browser tab — this function just plugs `window.localStorage`
 * in as the `KeyValueStore`.
 */
export function createBrowserHistorySessionRepository(): HistorySessionRepository {
  return createHistorySessionRepository({ store: window.localStorage })
}
