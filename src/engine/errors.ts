import type { GroceryItemId, MemberId } from '@/domain/ids'

/** Base class for every error the settlement engine can throw. */
export class SettlementEngineError extends Error {}

/** The same member id appears more than once in the members list. */
export class DuplicateMemberError extends SettlementEngineError {
  readonly memberId: MemberId

  constructor(memberId: MemberId) {
    super(`Member "${memberId}" appears more than once in the members list.`)
    this.name = 'DuplicateMemberError'
    this.memberId = memberId
  }
}

/** A grocery item refers to a member id that isn't in the provided members list. */
export class UnknownMemberError extends SettlementEngineError {
  readonly memberId: MemberId
  readonly context: string

  constructor(memberId: MemberId, context: string) {
    super(`Member "${memberId}" (${context}) is not in the provided members list.`)
    this.name = 'UnknownMemberError'
    this.memberId = memberId
    this.context = context
  }
}

/** A grocery item's cost can't be split because nobody is listed as sharing it. */
export class EmptySharedByError extends SettlementEngineError {
  readonly groceryItemId: GroceryItemId

  constructor(groceryItemId: GroceryItemId) {
    super(
      `Grocery item "${groceryItemId}" has no members in sharedByMemberIds; its cost can't be split among zero people.`,
    )
    this.name = 'EmptySharedByError'
    this.groceryItemId = groceryItemId
  }
}

/** A grocery item lists the same member more than once as a sharer. */
export class DuplicateSharedByError extends SettlementEngineError {
  readonly groceryItemId: GroceryItemId
  readonly memberId: MemberId

  constructor(groceryItemId: GroceryItemId, memberId: MemberId) {
    super(`Grocery item "${groceryItemId}" lists member "${memberId}" more than once in sharedByMemberIds.`)
    this.name = 'DuplicateSharedByError'
    this.groceryItemId = groceryItemId
    this.memberId = memberId
  }
}

/** A grocery item is priced in a currency other than the one the settlement is computed in. */
export class MixedCurrencyError extends SettlementEngineError {
  readonly groceryItemId: GroceryItemId
  readonly expectedCurrencyCode: string
  readonly actualCurrencyCode: string

  constructor(groceryItemId: GroceryItemId, expectedCurrencyCode: string, actualCurrencyCode: string) {
    super(
      `Grocery item "${groceryItemId}" is priced in ${actualCurrencyCode}, but this settlement is being computed in ${expectedCurrencyCode}.`,
    )
    this.name = 'MixedCurrencyError'
    this.groceryItemId = groceryItemId
    this.expectedCurrencyCode = expectedCurrencyCode
    this.actualCurrencyCode = actualCurrencyCode
  }
}

/** A grocery item's price or quantity isn't a valid non-negative integer amount. */
export class InvalidAmountError extends SettlementEngineError {
  readonly groceryItemId: GroceryItemId

  constructor(groceryItemId: GroceryItemId, reason: string) {
    super(`Grocery item "${groceryItemId}" has an invalid amount: ${reason}.`)
    this.name = 'InvalidAmountError'
    this.groceryItemId = groceryItemId
  }
}

/**
 * Internal safety check: the computed balances didn't sum to zero, so no
 * sequence of transfers can settle them. This should never happen for
 * balances produced by `calculateMemberBalances` — if it does, it points
 * to a bug rather than bad input.
 */
export class UnbalancedInputError extends SettlementEngineError {
  readonly totalMinorUnits: number

  constructor(totalMinorUnits: number) {
    super(
      `Member balances sum to ${totalMinorUnits} instead of 0; balances must net to zero before transfers can be computed.`,
    )
    this.name = 'UnbalancedInputError'
    this.totalMinorUnits = totalMinorUnits
  }
}
