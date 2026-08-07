import { fromJson, toJson } from './jsonCodec'

/**
 * The minimal slice of the Web Storage API (`localStorage`/`sessionStorage`)
 * this module actually needs. `window.localStorage` satisfies this
 * interface as-is, but nothing here refers to `window` — a plain in-memory
 * implementation works just as well, which is what keeps this module
 * testable without a browser and reusable if the backing store ever
 * changes.
 */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A generic "one JSON array per key" repository over a `KeyValueStore`.
 * Responsibility: read/write/find/upsert/delete entities by id, and make
 * every write immediately durable — there is no separate "save" step to
 * forget to call. It has no idea what a grocery session or a member is;
 * that meaning lives in the callers that configure it with a storage key
 * and an id accessor.
 */
export class LocalStorageRepository<T, Id extends string> {
  constructor(
    private readonly store: KeyValueStore,
    private readonly storageKey: string,
    private readonly getId: (entity: T) => Id,
  ) {}

  getAll(): readonly T[] {
    const raw = this.store.getItem(this.storageKey)
    if (raw === null) return []
    try {
      const parsed = fromJson<T[]>(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // Corrupted or hand-edited storage shouldn't take the whole app down;
      // treat it as empty rather than throwing on every read.
      console.warn(`[LocalStorageRepository] Ignoring unreadable data at "${this.storageKey}".`)
      return []
    }
  }

  getById(id: Id): T | undefined {
    return this.getAll().find((entity) => this.getId(entity) === id)
  }

  /** Inserts a new entity or replaces the existing one with the same id. */
  save(entity: T): void {
    this.saveMany([entity])
  }

  /** Upserts several entities in a single read-modify-write pass. */
  saveMany(entities: readonly T[]): void {
    if (entities.length === 0) return
    const all = [...this.getAll()]
    for (const entity of entities) {
      const id = this.getId(entity)
      const index = all.findIndex((existing) => this.getId(existing) === id)
      if (index === -1) all.push(entity)
      else all[index] = entity
    }
    this.writeAll(all)
  }

  delete(id: Id): void {
    this.deleteMany([id])
  }

  /** Removes several entities by id in a single read-modify-write pass. */
  deleteMany(ids: readonly Id[]): void {
    if (ids.length === 0) return
    const idsToRemove = new Set<Id>(ids)
    const remaining = this.getAll().filter((entity) => !idsToRemove.has(this.getId(entity)))
    this.writeAll(remaining)
  }

  /** Removes every entity under this repository's key. */
  clear(): void {
    this.store.removeItem(this.storageKey)
  }

  private writeAll(entities: readonly T[]): void {
    this.store.setItem(this.storageKey, toJson(entities))
  }
}
