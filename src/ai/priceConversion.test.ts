import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import { majorUnitsToMoney } from './priceConversion'

describe('majorUnitsToMoney', () => {
  it('converts a whole-number major-unit price to minor units', () => {
    expect(majorUnitsToMoney(800, CURRENCIES.BDT)).toEqual({ minorUnits: 80000, currency: CURRENCIES.BDT })
  })

  it('converts a decimal price without floating-point drift', () => {
    // 19.99 * 100 is 1998.9999999999998 in IEEE754 double precision; Math.round must recover 1999.
    expect(majorUnitsToMoney(19.99, CURRENCIES.USD).minorUnits).toBe(1999)
  })

  it('is exact across a spread of classic floating-point-unfriendly values', () => {
    const cases: ReadonlyArray<[number, number]> = [
      [0.1, 10],
      [0.2, 20],
      [0.3, 30],
      [1.1, 110],
      [33.33, 3333],
      [49.99, 4999],
      [100.05, 10005],
    ]
    for (const [major, expectedMinor] of cases) {
      expect(majorUnitsToMoney(major, CURRENCIES.USD).minorUnits).toBe(expectedMinor)
    }
  })

  it('converts zero', () => {
    expect(majorUnitsToMoney(0, CURRENCIES.BDT).minorUnits).toBe(0)
  })

  it('always attaches the given currency', () => {
    expect(majorUnitsToMoney(5, CURRENCIES.EUR).currency).toEqual(CURRENCIES.EUR)
  })

  it('respects a currency with different minor-unit precision', () => {
    const threeDigitCurrency = { code: 'BDT' as const, symbol: '৳', minorUnitDigits: 3 }
    expect(majorUnitsToMoney(1.5, threeDigitCurrency).minorUnits).toBe(1500)
  })
})
