export { LocalStorageRepository } from './LocalStorageRepository'
export type { KeyValueStore } from './LocalStorageRepository'

export { fromJson, toJson } from './jsonCodec'

export { STORAGE_KEYS } from './storageKeys'

export { createHistorySessionRepository } from './historySessionRepository'
export type { HistorySessionRepositoryDeps } from './historySessionRepository'

export { createBrowserHistorySessionRepository } from './browserHistorySessionRepository'

export type {
  CreateSessionInput,
  HistorySessionRepository,
  SessionLifecycleStatus,
  StoredHistorySession,
} from './types'

export {
  SessionPersistenceError,
  SessionNotFoundError,
  SessionArchivedError,
  SessionAlreadyArchivedError,
  SessionNotArchivedError,
} from './errors'
