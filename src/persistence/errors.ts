import type { HistorySessionId } from '@/domain/ids'

/** Base class for every error the persistence layer can throw. */
export class SessionPersistenceError extends Error {}

/** No stored session exists with the given id. */
export class SessionNotFoundError extends SessionPersistenceError {
  readonly sessionId: HistorySessionId

  constructor(sessionId: HistorySessionId) {
    super(`No stored session found with id "${sessionId}".`)
    this.name = 'SessionNotFoundError'
    this.sessionId = sessionId
  }
}

/** Can't resume a session that's archived — restore it first. */
export class SessionArchivedError extends SessionPersistenceError {
  readonly sessionId: HistorySessionId

  constructor(sessionId: HistorySessionId) {
    super(`Session "${sessionId}" is archived; restore it before resuming.`)
    this.name = 'SessionArchivedError'
    this.sessionId = sessionId
  }
}

/** Called `archive()` on a session that's already archived. */
export class SessionAlreadyArchivedError extends SessionPersistenceError {
  readonly sessionId: HistorySessionId

  constructor(sessionId: HistorySessionId) {
    super(`Session "${sessionId}" is already archived.`)
    this.name = 'SessionAlreadyArchivedError'
    this.sessionId = sessionId
  }
}

/** Called `restore()` on a session that isn't archived. */
export class SessionNotArchivedError extends SessionPersistenceError {
  readonly sessionId: HistorySessionId

  constructor(sessionId: HistorySessionId) {
    super(`Session "${sessionId}" isn't archived, so it can't be restored.`)
    this.name = 'SessionNotArchivedError'
    this.sessionId = sessionId
  }
}
