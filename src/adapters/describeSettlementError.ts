import {
  DuplicateMemberError,
  DuplicateSharedByError,
  EmptySharedByError,
  InvalidAmountError,
  MixedCurrencyError,
  UnknownMemberError,
} from '@/engine'
import { AmbiguousMemberNameError, InvalidGroceryPriceError, UnresolvableMemberNameError } from './errors'

/**
 * Turns any error the settlement calculation can throw — from either the
 * engine itself or this adapter layer — into one clear, non-technical
 * sentence a household member could actually read. Never a stack trace,
 * never a class name, never an id.
 *
 * The full, technical error is a separate concern: callers (see
 * `useSettlementResult`) are expected to `console.error` it themselves for
 * whoever's developing against this, and only ever show this function's
 * output to the actual user.
 */
export function describeSettlementError(error: unknown): string {
  if (error instanceof AmbiguousMemberNameError) {
    return `Two members are both named "${error.memberName}", so GroceryMate can't tell them apart for this calculation. Rename one of them to continue.`
  }
  if (error instanceof UnresolvableMemberNameError) {
    return `A grocery item references someone who isn't a current member of this household.`
  }
  if (error instanceof InvalidGroceryPriceError) {
    return `A grocery item has a price GroceryMate can't read as an amount.`
  }
  if (error instanceof UnknownMemberError) {
    return `A grocery item references someone who isn't a current member of this household.`
  }
  if (error instanceof EmptySharedByError) {
    return `A grocery item has no one sharing its cost yet.`
  }
  if (error instanceof DuplicateSharedByError) {
    return `A grocery item lists the same person twice as sharing its cost.`
  }
  if (error instanceof DuplicateMemberError) {
    return `Two members in this household have conflicting records.`
  }
  if (error instanceof MixedCurrencyError) {
    return `A grocery item is priced in a different currency than this household uses.`
  }
  if (error instanceof InvalidAmountError) {
    return `A grocery item has an invalid price or quantity.`
  }
  return `Something went wrong while calculating the settlement.`
}
