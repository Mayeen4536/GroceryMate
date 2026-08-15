import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CATEGORIES } from '@/constants/groceryCategories'
import { initialHistory } from '@/store/history'
import { initialMembers } from '@/store/members'
import type { CategoryId } from '@/types/grocery'
import type { HistoryItem } from '@/types/history'

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
  /** Fixed index into `initialMembers` — the chart color slot. Tied to the member's identity, never to their rank, so a member keeps their color if the data changes. */
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

interface FlatItem extends HistoryItem {
  monthLabel: string
  sortKey: string
  priceValue: number
}

function toNumber(price: string): number {
  return Number.parseFloat(price) || 0
}

/** Every item across every session, in chronological order, prices coerced to numbers once. */
function flattenItems(): FlatItem[] {
  return initialHistory.flatMap((session) =>
    session.items.map((item) => ({
      ...item,
      monthLabel: session.monthLabel,
      sortKey: session.sortKey,
      priceValue: toNumber(item.price),
    })),
  )
}

function buildMonthlySpend(items: FlatItem[]): MonthlySpend[] {
  const totalsByMonth = new Map<string, { total: number; earliestSortKey: string }>()
  for (const item of items) {
    const existing = totalsByMonth.get(item.monthLabel)
    if (existing) {
      existing.total += item.priceValue
      if (item.sortKey < existing.earliestSortKey) existing.earliestSortKey = item.sortKey
    } else {
      totalsByMonth.set(item.monthLabel, { total: item.priceValue, earliestSortKey: item.sortKey })
    }
  }
  return [...totalsByMonth.entries()]
    .sort(([, a], [, b]) => a.earliestSortKey.localeCompare(b.earliestSortKey))
    .map(([monthLabel, { total }]) => ({ monthLabel, total }))
}

function buildTopGroceries(items: FlatItem[], limit: number): TopGroceryItem[] {
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

function buildCategoryBreakdown(items: FlatItem[], totalSpend: number): CategorySpend[] {
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

function buildMemberContribution(items: FlatItem[], totalSpend: number): MemberSpend[] {
  const totalsByName = new Map<string, number>()
  for (const item of items) {
    totalsByName.set(item.paidBy, (totalsByName.get(item.paidBy) ?? 0) + item.priceValue)
  }
  return initialMembers
    .map((member, colorSlot) => ({
      memberId: member.id,
      name: member.name,
      tone: member.tone,
      total: totalsByName.get(member.name) ?? 0,
      percent: totalSpend === 0 ? 0 : ((totalsByName.get(member.name) ?? 0) / totalSpend) * 100,
      colorSlot,
    }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
}

/** Splits every item's price evenly across who shared it, bucketed into personal (one consumer) vs shared (more than one) per member. */
function buildMemberPersonalShared(items: FlatItem[]): MemberPersonalShared[] {
  const personalByName = new Map<string, number>()
  const sharedByName = new Map<string, number>()

  for (const item of items) {
    const share = item.priceValue / item.sharedBy.length
    const bucket = item.sharedBy.length === 1 ? personalByName : sharedByName
    for (const name of item.sharedBy) {
      bucket.set(name, (bucket.get(name) ?? 0) + share)
    }
  }

  return initialMembers
    .map((member) => {
      const personal = personalByName.get(member.name) ?? 0
      const shared = sharedByName.get(member.name) ?? 0
      return { memberId: member.id, name: member.name, tone: member.tone, personal, shared, total: personal + shared }
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total)
}

function buildSummary(
  items: FlatItem[],
  categoryBreakdown: CategorySpend[],
  memberContribution: MemberSpend[],
): AnalyticsSummary {
  const totalSpend = items.reduce((sum, item) => sum + item.priceValue, 0)
  const personalTotal = items.filter((item) => item.sharedBy.length === 1).reduce((sum, item) => sum + item.priceValue, 0)
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
 * Derives every analytics view from the household's grocery history — pure
 * aggregation over the existing mock store, no new state. `initialHistory`
 * is a fixed constant today, so this only ever runs once per mount
 * (`useMemo` with an empty dependency array); the moment it's replaced by
 * real per-household data, that data belongs in the dependency array so
 * this recomputes when it actually changes rather than on every render.
 */
export function useAnalytics(): AnalyticsData {
  return useMemo(() => {
    const items = flattenItems()
    const totalSpend = items.reduce((sum, item) => sum + item.priceValue, 0)

    const monthlySpend = buildMonthlySpend(items)
    const topGroceries = buildTopGroceries(items, 6)
    const categoryBreakdown = buildCategoryBreakdown(items, totalSpend)
    const memberContribution = buildMemberContribution(items, totalSpend)
    const memberPersonalShared = buildMemberPersonalShared(items)
    const summary = buildSummary(items, categoryBreakdown, memberContribution)

    return { monthlySpend, topGroceries, categoryBreakdown, memberContribution, memberPersonalShared, summary }
  }, [])
}
