import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain'
import { formatMinorUnits } from './moneyFormat'

describe('formatMinorUnits', () => {
  it('drops decimals for a whole-number amount', () => {
    expect(formatMinorUnits(60000, CURRENCIES.BDT)).toBe('৳600')
  })

  it('shows exact decimal precision for a fractional amount', () => {
    expect(formatMinorUnits(60050, CURRENCIES.BDT)).toBe('৳600.50')
  })

  it('groups thousands with commas, deterministically regardless of runtime locale', () => {
    expect(formatMinorUnits(100000000, CURRENCIES.BDT)).toBe('৳1,000,000')
  })

  it("uses the given currency's own symbol", () => {
    expect(formatMinorUnits(150000, CURRENCIES.USD)).toBe('$1,500')
  })

  it('renders zero as a plain whole amount', () => {
    expect(formatMinorUnits(0, CURRENCIES.BDT)).toBe('৳0')
  })
})
