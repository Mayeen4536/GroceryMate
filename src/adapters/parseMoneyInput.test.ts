import { describe, expect, it } from 'vitest'
import { parseMoneyInput } from './parseMoneyInput'

function minorUnitsOf(raw: string): number {
  const result = parseMoneyInput(raw)
  if (!result.ok) throw new Error(`Expected "${raw}" to parse, but it was rejected: ${result.reason}`)
  return result.minorUnits
}

function rejectionReasonOf(raw: string): string {
  const result = parseMoneyInput(raw)
  if (result.ok) throw new Error(`Expected "${raw}" to be rejected, but it parsed to ${result.minorUnits}`)
  return result.reason
}

describe('parseMoneyInput', () => {
  describe('valid amounts', () => {
    it('parses a whole Taka amount with no decimal point', () => {
      expect(minorUnitsOf('100')).toBe(10000)
      expect(minorUnitsOf('1')).toBe(100)
      expect(minorUnitsOf('0')).toBe(0)
    })

    it('parses a one-paisa amount without it rounding away', () => {
      expect(minorUnitsOf('0.01')).toBe(1)
    })

    it('parses a single decimal digit as if it were zero-padded', () => {
      expect(minorUnitsOf('1.5')).toBe(150)
    })

    it('parses two decimal digits exactly', () => {
      expect(minorUnitsOf('1.50')).toBe(150)
    })

    it('treats a trailing decimal point with no digits as a whole amount', () => {
      expect(minorUnitsOf('100.')).toBe(10000)
    })

    it('treats a leading decimal point with no whole-part digits as a sub-unit amount', () => {
      expect(minorUnitsOf('.5')).toBe(50)
    })

    it('trims surrounding whitespace', () => {
      expect(minorUnitsOf('  100  ')).toBe(10000)
      expect(minorUnitsOf('\t42.5\n')).toBe(4250)
    })

    it('parses a large but realistic amount without losing precision', () => {
      expect(minorUnitsOf('999999.99')).toBe(99999999)
    })
  })

  describe('rejected input', () => {
    it('rejects an empty string', () => {
      expect(rejectionReasonOf('')).toBe('empty')
    })

    it('rejects whitespace-only input', () => {
      expect(rejectionReasonOf('   ')).toBe('empty')
    })

    it('rejects a bare decimal point with no digits at all', () => {
      expect(rejectionReasonOf('.')).toBe('empty')
    })

    it('rejects negative amounts', () => {
      expect(rejectionReasonOf('-5')).toBe('negative')
      expect(rejectionReasonOf('-0.01')).toBe('negative')
    })

    it('rejects more decimal digits than the currency supports', () => {
      expect(rejectionReasonOf('100.999')).toBe('too-many-decimals')
    })

    it('rejects internal spaces', () => {
      expect(rejectionReasonOf('1 00')).toBe('malformed')
    })

    it('rejects thousands-separator commas — unsupported in this MVP parser', () => {
      expect(rejectionReasonOf('1,000')).toBe('malformed')
    })

    it('rejects non-numeric strings', () => {
      expect(rejectionReasonOf('abc')).toBe('malformed')
      expect(rejectionReasonOf('12a')).toBe('malformed')
    })

    it('rejects more than one decimal point', () => {
      expect(rejectionReasonOf('1.2.3')).toBe('malformed')
    })
  })

  describe('separate responsibility from formatting', () => {
    it('is a pure parse with no currency symbol or locale formatting involved', () => {
      // parseMoneyInput never produces or expects a "৳"-prefixed string —
      // that belongs to src/utils/money.ts, the display-layer formatter.
      expect(rejectionReasonOf('৳100')).toBe('malformed')
    })
  })
})
