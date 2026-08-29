/**
 * Errors this adapter layer can throw, distinct from the engine's own
 * `SettlementEngineError` family (`@/engine/errors`). These cover failure
 * modes that only exist at the UI/domain boundary — a name that doesn't
 * resolve to a member, a name two members share — which the engine itself
 * has no concept of, since it only ever sees ids.
 */
export class AdapterError extends Error {}

/**
 * A grocery item's `paidBy`/`sharedBy` name doesn't match any current
 * member. Thrown rather than silently dropping the item or the reference,
 * since either would understate real spending or misattribute it.
 */
export class UnresolvableMemberNameError extends AdapterError {
  readonly memberName: string
  readonly context: string

  constructor(memberName: string, context: string) {
    super(`"${memberName}" (${context}) doesn't match any current member.`)
    this.name = 'UnresolvableMemberNameError'
    this.memberName = memberName
    this.context = context
  }
}

/**
 * Two or more current members share the exact same display name, so a
 * grocery item's `paidBy`/`sharedBy` name can't be resolved to a single
 * member without guessing. Never guess — surface this instead.
 */
export class AmbiguousMemberNameError extends AdapterError {
  readonly memberName: string

  constructor(memberName: string) {
    super(`"${memberName}" matches more than one current member; rename one of them to continue.`)
    this.name = 'AmbiguousMemberNameError'
    this.memberName = memberName
  }
}

/** A grocery item's `price` string couldn't be parsed into a valid monetary amount. */
export class InvalidGroceryPriceError extends AdapterError {
  readonly groceryItemId: string
  readonly rawPrice: string

  constructor(groceryItemId: string, rawPrice: string) {
    super(`Grocery item "${groceryItemId}" has an unparseable price: "${rawPrice}".`)
    this.name = 'InvalidGroceryPriceError'
    this.groceryItemId = groceryItemId
    this.rawPrice = rawPrice
  }
}
