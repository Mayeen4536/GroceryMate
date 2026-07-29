import type { Brand } from './Brand'

/**
 * Every entity identity in the domain, gathered in one place so entity
 * files can reference each other's id types without circular imports.
 */
export type HouseholdId = Brand<string, 'HouseholdId'>
export type MemberId = Brand<string, 'MemberId'>
export type GroceryItemId = Brand<string, 'GroceryItemId'>
export type SettlementId = Brand<string, 'SettlementId'>
export type PaymentId = Brand<string, 'PaymentId'>
export type HistorySessionId = Brand<string, 'HistorySessionId'>
export type ReceiptId = Brand<string, 'ReceiptId'>
export type AIParsedItemId = Brand<string, 'AIParsedItemId'>
