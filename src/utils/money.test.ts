import { describe, expect, it } from 'vitest'
import { formatAmount, formatTaka } from './money'

describe('formatAmount', () => {
  it('formats zero as a whole number', () => {
    expect(formatAmount(0)).toBe('0')
  })

  it('never lets a small decimal amount collapse into a whole number', () => {
    expect(formatAmount(0.01)).toBe('0.01')
  })

  it('preserves a decimal amount under one unit', () => {
    expect(formatAmount(0.1)).toBe('0.10')
  })

  it('formats a whole number without decimals', () => {
    expect(formatAmount(1)).toBe('1')
  })

  it('preserves meaningful decimals on a larger amount', () => {
    expect(formatAmount(1.5)).toBe('1.50')
  })

  it('formats a round hundred without decimals', () => {
    expect(formatAmount(100)).toBe('100')
  })

  it('preserves decimals on a non-round hundred', () => {
    expect(formatAmount(100.5)).toBe('100.50')
  })

  it('adds thousands separators for a large whole amount', () => {
    expect(formatAmount(999999)).toBe('999,999')
  })

  it('remains readable for a very large amount, decimals included', () => {
    expect(formatAmount(12345678.9)).toBe('12,345,678.90')
  })

  it('rounds to whole-paisa precision so float noise cannot leak into the display', () => {
    // A classic floating point artifact: 0.1 + 0.2 !== 0.3 in IEEE 754.
    expect(formatAmount(0.1 + 0.2)).toBe('0.30')
  })

  it('treats non-finite input as zero rather than throwing or printing NaN/Infinity', () => {
    expect(formatAmount(Number.NaN)).toBe('0')
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe('0')
  })

  it('does not mutate or alter the value it is given', () => {
    const value = 42.5
    formatAmount(value)
    expect(value).toBe(42.5)
  })
})

describe('formatTaka', () => {
  it('prefixes the Taka symbol onto a whole amount', () => {
    expect(formatTaka(100)).toBe('৳100')
  })

  it('prefixes the Taka symbol and preserves decimals', () => {
    expect(formatTaka(100.5)).toBe('৳100.50')
  })

  it('never displays a one-paisa amount as free', () => {
    expect(formatTaka(0.01)).toBe('৳0.01')
  })

  it('formats a very large Taka amount readably', () => {
    expect(formatTaka(999999)).toBe('৳999,999')
  })
})
