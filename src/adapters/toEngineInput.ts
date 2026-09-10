import type { Currency } from '@/domain/Currency'
import type { GroceryCategory, GroceryItem as DomainGroceryItem } from '@/domain/GroceryItem'
import type { Member as DomainMember } from '@/domain/Member'
import type { GroceryItemId, HouseholdId, MemberId } from '@/domain/ids'
import type { GroceryItem as UIGroceryItem } from '@/types/grocery'
import type { Member as UIMember } from '@/types/member'
import { InvalidGroceryPriceError } from './errors'
import { parseMoneyInput } from './parseMoneyInput'

/**
 * The domain `Member`/`GroceryItem` types carry a `householdId` and real
 * join/added timestamps that the current UI has no equivalent of
 * (`Member.joinedLabel` is a display string like "Joined Jan 2026", not a
 * parseable date, and `GroceryItem` doesn't carry its persisted timestamp
 * through this layer). The engine's calculation never reads either field —
 * `calculateMemberBalances` only ever touches `.id` on a member and
 * `.unitPrice`/`.quantity`/`.paidByMemberId`/`.sharedByMemberIds` on a
 * grocery item — so a fixed placeholder is harmless here. Kept as an
 * explicit, named constant rather than an inline `new Date(0)` so its
 * purpose (satisfy the type, not represent a real moment) reads clearly at
 * every call site.
 */
const PLACEHOLDER_TIMESTAMP = new Date(0)

/** UI `CategoryId` and the domain's `GroceryCategory` are the same literal set; this cast documents that rather than silently relying on structural luck. */
function toDomainCategory(category: UIGroceryItem['category']): GroceryCategory {
  return category as GroceryCategory
}

/**
 * An exhaustive switch, not a ternary: the UI's `MemberStatus` has more
 * cases than the domain's membership lifecycle (`'settled'|'owes'|'owed'`
 * are financial sub-states of 'active', never their own domain status).
 * Written this way specifically so adding a new UI status that isn't yet
 * mapped is a compile error here, not a silent fall-through — exactly
 * what a two-armed ternary would have done when 'archived' was added.
 */
function toDomainMember(member: UIMember, householdId: HouseholdId): DomainMember {
  const base = {
    id: member.id as MemberId,
    householdId,
    name: member.name,
    email: member.email,
    role: member.role,
  }
  switch (member.status) {
    case 'invited':
      return { ...base, membershipStatus: 'invited', invitedAt: PLACEHOLDER_TIMESTAMP }
    case 'archived':
      return { ...base, membershipStatus: 'archived', archivedAt: PLACEHOLDER_TIMESTAMP }
    case 'settled':
    case 'owes':
    case 'owed':
      return { ...base, membershipStatus: 'active', joinedAt: PLACEHOLDER_TIMESTAMP }
  }
}

/**
 * `item.price` is already the persisted line's final total (`grocery_items
 * .amount_minor`, round-tripped through `formatMinorUnitsInput` — see
 * docs/GROCERY_INTEGRATION.md), never a per-unit price — so this always
 * feeds the engine `quantity: 1`. `item.quantity` itself is carried through
 * to `grocery_items.quantity` for display only ("× 2" on a grocery card);
 * re-multiplying it into the engine's `unitPrice × quantity` here would
 * double-count the line, exactly the mistake
 * docs/SUPABASE_SCHEMA_DESIGN.md's "Engine reconstruction" section (written
 * at Migration 2 time, before any of this integration existed) already
 * calls out and guards against.
 */
function toDomainGroceryItem(item: UIGroceryItem, currency: Currency, householdId: HouseholdId): DomainGroceryItem {
  const parsedPrice = parseMoneyInput(item.price, currency.minorUnitDigits)
  if (!parsedPrice.ok) throw new InvalidGroceryPriceError(item.id, item.price)

  return {
    id: item.id as GroceryItemId,
    householdId,
    name: item.name,
    category: toDomainCategory(item.category),
    unitPrice: { minorUnits: parsedPrice.minorUnits, currency },
    quantity: 1,
    paidByMemberId: item.paidByMemberId as MemberId,
    sharedByMemberIds: item.sharedByMemberIds as MemberId[],
    addedAt: PLACEHOLDER_TIMESTAMP,
    notes: item.notes || undefined,
  }
}

export interface EngineInput {
  readonly members: readonly DomainMember[]
  readonly groceries: readonly DomainGroceryItem[]
}

/**
 * Converts the app's live UI-shaped state (decimal-string prices, already
 * id-keyed member references) into validated domain input the settlement
 * engine can run on. This is the ONLY place that translation happens —
 * neither the engine nor any page component should parse a price string
 * itself.
 *
 * Grocery member references are no longer resolved from a display name —
 * `paidByMemberId`/`sharedByMemberIds` are real, persisted
 * `household_members.id` values by the time they reach this function (see
 * `src/groceries/useHouseholdGroceries.ts`). A reference to a member id
 * that genuinely doesn't exist in `members` (e.g. corrupted state) is still
 * caught, just one layer down — `calculateMemberBalances` itself throws
 * `UnknownMemberError` for any id it can't find, so this function doesn't
 * need its own redundant validation pass to preserve the "never silently
 * repair" guarantee.
 *
 * Throws (never silently repairs) on a `price` string that doesn't parse to
 * a valid amount (`InvalidGroceryPriceError`). Callers should run this
 * inside the same try/catch that handles the engine's own
 * `SettlementEngineError` family — see `useSettlementResult`.
 */
export function toEngineInput(
  members: readonly UIMember[],
  groceries: readonly UIGroceryItem[],
  currency: Currency,
  householdId: HouseholdId,
): EngineInput {
  return {
    members: members.map((member) => toDomainMember(member, householdId)),
    groceries: groceries.map((item) => toDomainGroceryItem(item, currency, householdId)),
  }
}
