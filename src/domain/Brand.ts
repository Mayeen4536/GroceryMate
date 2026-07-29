/**
 * Nominal ("branded") type helper. Two branded types built from the same
 * underlying type (e.g. `string`) are not assignable to each other, so a
 * MemberId can never be passed where a HouseholdId is expected even though
 * both are plain strings at runtime. Purely a compile-time construct — it
 * adds no runtime representation or behavior.
 */
export type Brand<Value, BrandName extends string> = Value & { readonly __brand: BrandName }
