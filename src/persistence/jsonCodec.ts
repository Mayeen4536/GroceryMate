/**
 * Date-aware JSON round-tripping. Plain `JSON.stringify`/`JSON.parse`
 * silently turn `Date` fields into strings and never turn them back, which
 * would corrupt every domain entity that carries a `Date` (GroceryItem's
 * `addedAt`, HistorySession's `startedAt`/`completedAt`, and so on) the
 * moment it round-trips through storage. Responsibility: make that
 * round-trip lossless — nothing about what gets stored or when.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export function toJson(value: unknown): string {
  return JSON.stringify(value)
}

export function fromJson<T>(json: string): T {
  return JSON.parse(json, (_key, value) => {
    if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
      return new Date(value)
    }
    return value
  }) as T
}
