import { describe, expect, it } from 'vitest'
import type { MemberId } from '@/domain/ids'
import { splitEvenly } from './splitEvenly'

const ids = (...names: string[]) => names as MemberId[]

function sumOf(shares: ReadonlyMap<MemberId, number>): number {
  return [...shares.values()].reduce((sum, share) => sum + share, 0)
}

describe('splitEvenly', () => {
  it('splits an evenly divisible amount into equal shares', () => {
    const shares = splitEvenly(300, ids('a', 'b', 'c'))
    expect(shares.get('a' as MemberId)).toBe(100)
    expect(shares.get('b' as MemberId)).toBe(100)
    expect(shares.get('c' as MemberId)).toBe(100)
    expect(sumOf(shares)).toBe(300)
  })

  it('hands the leftover minor units to the ids earliest in sort order', () => {
    // 100 / 3 = 33 remainder 1; sorted ids are a, b, c, so "a" gets the extra cent.
    const shares = splitEvenly(100, ids('c', 'a', 'b'))
    expect(shares.get('a' as MemberId)).toBe(34)
    expect(shares.get('b' as MemberId)).toBe(33)
    expect(shares.get('c' as MemberId)).toBe(33)
    expect(sumOf(shares)).toBe(100)
  })

  it('gives the whole amount to a single participant', () => {
    const shares = splitEvenly(4999, ids('a'))
    expect(shares.get('a' as MemberId)).toBe(4999)
  })

  it('never loses or fabricates a minor unit, across many participant counts', () => {
    for (let count = 1; count <= 11; count += 1) {
      for (const total of [0, 1, 2, 3, 10, 33, 100, 4999, 1_000_003]) {
        const participants = Array.from({ length: count }, (_, index) => `m${index}`) as MemberId[]
        const shares = splitEvenly(total, participants)
        expect(sumOf(shares)).toBe(total)
        expect(shares.size).toBe(count)
      }
    }
  })

  it('never gives two participants shares more than one minor unit apart', () => {
    const shares = splitEvenly(101, ids('a', 'b', 'c', 'd', 'e', 'f', 'g'))
    const values = [...shares.values()]
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })

  it('is deterministic regardless of input order', () => {
    const first = splitEvenly(1000, ids('bilal', 'aisha', 'daniyal', 'chloe'))
    const second = splitEvenly(1000, ids('chloe', 'daniyal', 'aisha', 'bilal'))
    expect([...second.entries()].sort()).toEqual([...first.entries()].sort())
  })

  it('splits a zero-cost item into all-zero shares', () => {
    const shares = splitEvenly(0, ids('a', 'b'))
    expect(shares.get('a' as MemberId)).toBe(0)
    expect(shares.get('b' as MemberId)).toBe(0)
  })
})
