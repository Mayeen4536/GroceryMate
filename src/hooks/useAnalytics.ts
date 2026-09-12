import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CATEGORIES } from '@/constants/groceryCategories'
import { monthKey, monthYearLabel } from '@/utils/date'
import type { CategoryId, GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'

export interface MonthlySpend {
  monthLabel: string
  total: number
}

export interface TopGroceryItem {
  name: string
  category: CategoryId
  total: number
  purchaseCount: number
}

export interface CategorySpend {
  category: CategoryId
  label: string
  icon: LucideIcon
  total: number
  /** Share of total household spend, 0–100. */
  percent: number
  /** Fixed index into `CATEGORIES` — the chart color slot. Tied to the category's identity, never to its rank, so a category keeps its color if the data changes. */
  colorSlot: number
}

export interface MemberSpend {
  memberId: string
  name: string
  tone: number
  total: number
  /** Share of total household spend, 0–100. */
  percent: number
  /** Fixed index into the roster passed to `useAnalytics` — the chart color slot. Tied to the member's identity, never to their rank, so a member keeps their color if the data changes. */
  colorSlot: number
}

export interface MemberPersonalShared {
  memberId: string
  name: string
  tone: number
  /** Their fair share of items only they consumed. */
  personal: number
  /** Their fair share of items split across multiple people. */
  shared: number
  total: number
}

export interface AnalyticsSummary {
  totalSpend: number
  totalItems: number
  topCategory: { label: string; total: number } | null
  topSpender: { name: string; total: number } | null
  personalTotal: number
  sharedTotal: number
}

export interface AnalyticsData {
  monthlySpend: MonthlySpend[]
  topGroceries: TopGroceryItem[]
  categoryBreakdown: CategorySpend[]
  memberContribution: MemberSpend[]
  memberPersonalShared: MemberPersonalShared[]
  summary: AnalyticsSummary
}

interface PricedItem extends GroceryItem {
  priceValue: number
}

function toNumber(price: string): number {
  return Number.parseFloat(price) || 0
}

function buildMonthlySpend(items: PricedItem[]): MonthlySpend[] {
  const totalsByKey = new Map<string, { monthLabel: string; total: number }>()
  for (const item of items) {
    const key = monthKey(item.createdAt)
    const existing = totalsByKey.get(key)
    if (existing) existing.total += item.priceValue
    else totalsByKey.set(key, { monthLabel: monthYearLabel(item.createdAt), total: item.priceValue })
  }
  return [...totalsByKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { monthLabel, total }]) => ({ monthLabel, total }))
}

function buildTopGroceries(items: PricedItem[], limit: number): TopGroceryItem[] {
  const byName = new Map<string, TopGroceryItem>()
  for (const item of items) {
    const existing = byName.get(item.name)
    if (existing) {
      existing.total += item.priceValue
      existing.purchaseCount += 1
    } else {
      byName.set(item.name, { name: item.name, category: item.category, total: item.priceValue, purchaseCount: 1 })
    }
  }
  return [...byName.values()].sort((a, b) => b.total - a.total).slice(0, limit)
}

function buildCategoryBreakdown(items: PricedItem[], totalSpend: number): CategorySpend[] {
  const totalsByCategory = new Map<CategoryId, number>()
  for (const item of items) {
    totalsByCategory.set(item.category, (totalsByCategory.get(item.category) ?? 0) + item.priceValue)
  }
  return CATEGORIES.map((config, colorSlot) => {
    const total = totalsByCategory.get(config.id) ?? 0
    return {
      category: config.id,
      label: config.label,
      icon: config.icon,
      total,
      percent: totalSpend === 0 ? 0 : (total / totalSpend) * 100,
      colorSlot,
    }
  }).filter((entry) => entry.total > 0)
}

/**
 * Keyed by the real, stable `paidByMemberId` — never by display name — so
 * two members who happen to share a name never merge into one bar (see
 * docs/HISTORY_INTEGRATION.md's identity notes). `members` is the full
 * roster passed in by the caller; an archived member who paid for something
 * historically still gets their own bar.
 */
function buildMemberContribution(items: PricedItem[], members: readonly Member[], totalSpend: number): MemberSpend[] {
  const totalsById = new Map<string, number>()
  for (const item of items) {
    totalsById.set(item.paidByMemberId, (totalsById.get(item.paidByMemberId) ?? 0) + item.priceValue)
  }
  return members
    .map((member, colorSlot) => {
      const total = totalsById.get(member.id) ?? 0
      return {
        memberId: member.id,
        name: member.name,
        tone: member.tone,
        total,
        percent: totalSpend === 0 ? 0 : (total / totalSpend) * 100,
        colorSlot,
      }
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
}

/** Splits every item's price evenly across who shared it (by member id), bucketed into personal (one consumer) vs shared (more than one). */
function buildMemberPersonalShared(items: PricedItem[], members: readonly Member[]): MemberPersonalShared[] {
  const personalById = new Map<string, number>()
  const sharedById = new Map<string, number>()

  for (const item of items) {
    if (item.sharedByMemberIds.length === 0) continue
    const share = item.priceValue / item.sharedByMemberIds.length
    const bucket = item.sharedByMemberIds.length === 1 ? personalById : sharedById
    for (const id of item.sharedByMemberIds) {
      bucket.set(id, (bucket.get(id) ?? 0) + share)
    }
  }

  return members
    .map((member) => {
      const personal = personalById.get(member.id) ?? 0
      const shared = sharedById.get(member.id) ?? 0
      return { memberId: member.id, name: member.name, tone: member.tone, personal, shared, total: personal + shared }
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
}

function buildSummary(
  items: PricedItem[],
  categoryBreakdown: CategorySpend[],
  memberContribution: MemberSpend[],
): AnalyticsSummary {
  const totalSpend = items.reduce((sum, item) => sum + item.priceValue, 0)
  const personalTotal = items
    .filter((item) => item.sharedByMemberIds.length === 1)
    .reduce((sum, item) => sum + item.priceValue, 0)
  const sharedTotal = totalSpend - personalTotal

  const topCategory = categoryBreakdown.length === 0 ? null : [...categoryBreakdown].sort((a, b) => b.total - a.total)[0]
  const topSpender = memberContribution.length === 0 ? null : memberContribution[0]

  return {
    totalSpend,
    totalItems: items.length,
    topCategory: topCategory ? { label: topCategory.label, total: topCategory.total } : null,
    topSpender: topSpender ? { name: topSpender.name, total: topSpender.total } : null,
    personalTotal,
    sharedTotal,
  }
}

/**
 * Derives every analytics view straight from the household's real, already-
 * loaded groceries and members — the same state `App.tsx` already threads to
 * Groceries/Members/Settlements, never a second query or second financial
 * source of truth (see docs/HISTORY_INTEGRATION.md). There is no "shopping
 * session" concept, so every chart is built directly from the flat
 * `grocery_items` list; `monthKey`/`monthYearLabel` (UTC-based, matching
 * member lifecycle labels) group entries into real calendar months. An empty
 * `groceries` array naturally produces empty chart data and a `summary`
 * whose `topCategory`/`topSpender` are `null` — an honest "nothing yet"
 * rather than a fabricated placeholder.
 */
export function useAnalytics(groceries: readonly GroceryItem[], members: readonly Member[]): AnalyticsData {
  return useMemo(() => {
    const items: PricedItem[] = groceries.map((item) => ({ ...item, priceValue: toNumber(item.price) }))
    const totalSpend = items.reduce((sum, item) => sum + item.priceValue, 0)

    const monthlySpend = buildMonthlySpend(items)
    const topGroceries = buildTopGroceries(items, 6)
    const categoryBreakdown = buildCategoryBreakdown(items, totalSpend)
    const memberContribution = buildMemberContribution(items, members, totalSpend)
    const memberPersonalShared = buildMemberPersonalShared(items, members)
    const summary = buildSummary(items, categoryBreakdown, memberContribution)

    return { monthlySpend, topGroceries, categoryBreakdown, memberContribution, memberPersonalShared, summary }
  }, [groceries, members])
}
