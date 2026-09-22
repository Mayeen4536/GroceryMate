import { motion } from 'framer-motion'
import {
  BarChart3,
  ChartNoAxesCombined,
  PieChart,
  Receipt,
  ShoppingBasket,
  Trophy,
  Wallet,
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild } from '@/animations/motion'
import { useAnalytics } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import { StatTile } from './StatTile'
import { CategoryBreakdownChart } from './charts/CategoryBreakdownChart'
import { MemberContributionChart } from './charts/MemberContributionChart'
import { MonthlySpendChart } from './charts/MonthlySpendChart'
import { PersonalSharedChart } from './charts/PersonalSharedChart'
import { TopGroceriesChart } from './charts/TopGroceriesChart'

interface AnalyticsPageProps {
  direction?: number
  groceries: readonly GroceryItem[]
  members: readonly Member[]
  /** Same load state `GroceriesPage` shows — every chart here is derived from this exact data, so a failed load must read as an error, not a fabricated "no spending" empty state. */
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

/** The Analytics experience: household spending broken down by month, item, category, and member — derived entirely from real, persisted groceries. */
export function AnalyticsPage({
  direction = 1,
  groceries,
  members,
  loading = false,
  error = null,
  onRetry,
}: AnalyticsPageProps) {
  const { monthlySpend, topGroceries, categoryBreakdown, memberContribution, memberPersonalShared, summary } =
    useAnalytics(groceries, members)

  return (
    <PageTransition direction={direction}>
      <motion.div variants={riseChild}>
        <PageHeader
          title="Analytics"
          description="Where the household's money actually goes, month by month."
        />
      </motion.div>

      {loading ? (
        <motion.div variants={riseChild} className="flex justify-center py-16">
          <div
            role="status"
            aria-label="Loading analytics"
            className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600"
          />
        </motion.div>
      ) : error ? (
        <motion.div variants={riseChild}>
          <Card padding="lg">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm font-semibold text-ink">Couldn't load analytics</p>
              <p className="text-sm text-ink-soft">{error}</p>
              {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Try again
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      ) : groceries.length === 0 ? (
        <motion.div variants={riseChild}>
          <EmptyState
            icon={ChartNoAxesCombined}
            tileClassName="from-member-violet-soft to-mint-50 text-member-violet-strong"
            glowClassName="bg-member-violet-strong/10"
            ringClassName="border-member-violet-strong/30"
            orbitChips={[
              { icon: Wallet, toneClassName: 'text-brand-600' },
              { icon: PieChart, toneClassName: 'text-member-gold-strong' },
              { icon: Trophy, toneClassName: 'text-member-violet-strong' },
            ]}
            title="Nothing to analyze yet."
            description="Once your household logs a few groceries, real spending trends will show up here."
          />
        </motion.div>
      ) : (
        <>
          <motion.div variants={riseChild} className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              icon={Wallet}
              label="Total spent"
              accent="brand"
              value={summary.totalSpend}
              format={formatTaka}
            />
            <StatTile icon={ShoppingBasket} label="Items logged" accent="mint" value={summary.totalItems} />
            <StatTile
              icon={PieChart}
              label="Top category"
              accent="violet"
              valueLabel={summary.topCategory?.label ?? '—'}
              sublabel={summary.topCategory ? formatTaka(summary.topCategory.total) : undefined}
            />
            <StatTile
              icon={Trophy}
              label="Top spender"
              accent="gold"
              valueLabel={summary.topSpender?.name ?? '—'}
              sublabel={summary.topSpender ? formatTaka(summary.topSpender.total) : undefined}
            />
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <motion.div variants={riseChild} className="lg:col-span-2">
              <Card
                icon={BarChart3}
                title="Monthly spending"
                headingLevel={2}
                subtitle="Total logged per month, oldest to newest."
              >
                <MonthlySpendChart data={monthlySpend} />
              </Card>
            </motion.div>

            <motion.div variants={riseChild} className="lg:col-span-2">
              <Card
                icon={PieChart}
                title="Category breakdown"
                headingLevel={2}
                subtitle="Share of total spend by grocery category."
              >
                <CategoryBreakdownChart data={categoryBreakdown} />
              </Card>
            </motion.div>

            <motion.div variants={riseChild}>
              <Card
                icon={Receipt}
                title="Most expensive groceries"
                headingLevel={2}
                subtitle="Ranked by total spent, across every real grocery logged."
              >
                <TopGroceriesChart data={topGroceries} />
              </Card>
            </motion.div>

            <motion.div variants={riseChild}>
              <Card
                icon={Wallet}
                title="Member contribution"
                headingLevel={2}
                subtitle="Who paid for what, in total."
              >
                <MemberContributionChart data={memberContribution} />
              </Card>
            </motion.div>

            <motion.div variants={riseChild} className="lg:col-span-2">
              <Card
                icon={ShoppingBasket}
                title="Personal vs. shared spending"
                headingLevel={2}
                subtitle="Each member's fair share of items only they consumed vs. items split with others."
              >
                <PersonalSharedChart data={memberPersonalShared} />
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </PageTransition>
  )
}
