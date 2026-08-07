import { describe, expect, it } from 'vitest'
import { fromJson, toJson } from './jsonCodec'

describe('jsonCodec', () => {
  it('round-trips plain data unchanged', () => {
    const data = { a: 1, b: 'two', c: [1, 2, 3], d: null, e: true }
    expect(fromJson(toJson(data))).toEqual(data)
  })

  it('round-trips a Date as an actual Date instance, not a string', () => {
    const original = { startedAt: new Date('2026-01-15T09:30:00.000Z') }
    const restored = fromJson<typeof original>(toJson(original))

    expect(restored.startedAt).toBeInstanceOf(Date)
    expect(restored.startedAt.getTime()).toBe(original.startedAt.getTime())
  })

  it('round-trips dates nested inside arrays and nested objects', () => {
    const original = {
      session: {
        startedAt: new Date('2026-02-01T00:00:00.000Z'),
        items: [
          { addedAt: new Date('2026-02-02T00:00:00.000Z') },
          { addedAt: new Date('2026-02-03T00:00:00.000Z') },
        ],
      },
    }
    const restored = fromJson<typeof original>(toJson(original))

    expect(restored.session.startedAt).toBeInstanceOf(Date)
    expect(restored.session.items[0].addedAt).toBeInstanceOf(Date)
    expect(restored.session.items[1].addedAt.getTime()).toBe(original.session.items[1].addedAt.getTime())
  })

  it('leaves an ordinary date-shaped string alone if it is not ISO-8601 with milliseconds', () => {
    const original = { note: '2026-02-01', otherNote: '2026-02-01T00:00:00Z' }
    const restored = fromJson<typeof original>(toJson(original))
    expect(restored.note).toBe('2026-02-01')
    expect(restored.otherNote).toBe('2026-02-01T00:00:00Z')
  })

  it('preserves undefined-dropping JSON semantics (optional fields stay absent)', () => {
    const original: { notes?: string } = {}
    const restored = fromJson<{ notes?: string }>(toJson(original))
    expect('notes' in restored).toBe(false)
  })
})
