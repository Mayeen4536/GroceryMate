import { describe, expect, it } from 'vitest'
import {
  DuplicateMemberError,
  DuplicateSharedByError,
  EmptySharedByError,
  InvalidAmountError,
  MixedCurrencyError,
  UnbalancedInputError,
  UnknownMemberError,
} from '@/engine'
import type { GroceryItemId, MemberId } from '@/domain/ids'
import { describeSettlementError } from './describeSettlementError'
import { AmbiguousMemberNameError, InvalidGroceryPriceError, UnresolvableMemberNameError } from './errors'

describe('describeSettlementError', () => {
  it('never includes a stack trace, class name, or raw id in its output', () => {
    const errors = [
      new AmbiguousMemberNameError('Sam'),
      new UnresolvableMemberNameError('Ghost', 'test'),
      new InvalidGroceryPriceError('g-1', 'nope'),
      new UnknownMemberError('m-99' as MemberId, 'test'),
      new EmptySharedByError('g-1' as GroceryItemId),
      new DuplicateSharedByError('g-1' as GroceryItemId, 'm-1' as MemberId),
      new DuplicateMemberError('m-1' as MemberId),
      new MixedCurrencyError('g-1' as GroceryItemId, 'BDT', 'USD'),
      new InvalidAmountError('g-1' as GroceryItemId, 'negative'),
      new UnbalancedInputError(5),
    ]
    for (const error of errors) {
      const message = describeSettlementError(error)
      expect(message.length).toBeGreaterThan(0)
      expect(message).not.toMatch(/Error$/) // no bare class name leaking through
      expect(message).not.toContain('at ') // no stack-trace-looking fragment
    }
  })

  it('names the duplicated name in the ambiguous-member message so the household knows what to fix', () => {
    expect(describeSettlementError(new AmbiguousMemberNameError('Sam'))).toContain('Sam')
  })

  it('falls back to a generic message for an unrecognized error', () => {
    expect(describeSettlementError(new Error('some unrelated crash'))).toBe(
      'Something went wrong while calculating the settlement.',
    )
    expect(describeSettlementError('not even an Error object')).toBe(
      'Something went wrong while calculating the settlement.',
    )
  })
})
