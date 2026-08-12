import { motion } from 'framer-motion'
import { BarChart3, PieChart, Receipt, ShoppingBasket, Trophy, Wallet } from 'lucide-react'
import { Card } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild } from '@/animations/motion'
import { useAnalytics } from '@/hooks/useAnalytics'
import { formatTaka } from '@/utils/currency'
import { StatTile } from './StatTile'
import { CategoryBreakdownChart } from './charts/CategoryBreakdownChart'
import { MemberContributionChart } from './charts/MemberContributionChart'
import { MonthlySpendChart } from './charts/MonthlySpendChart'
import { PersonalSharedChart } from './charts/PersonalSharedChart'
import { TopGroceriesChart } from './charts/TopGroceriesChart'

/** The Analytics experience: household spending broken down by month, item, category, and member. */
export function AnalyticsPage({ direction = 1 }: { direction?: number }) {
  const { monthlySpend, topGroceries, categoryBreakdown, memberContribution, memberPersonalShared, summary } =
    useAnalytics()

  return (
    <PageTransition direction={direction}>
      <motion.div variants={riseChild}>
        <PageHeader title="Analytics" description="Where the household's money actually goes, month by month." />
      </motion.div>

      <motion.div variants={riseChild} className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={Wallet} label="Total spent" accent="brand" value={summary.totalSpend} format={formatTaka} />
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
          <Card icon={BarChart3} title="Monthly spending" subtitle="Total logged per month, oldest to newest.">
            <MonthlySpendChart data={monthlySpend} />
          </Card>
        </motion.div>

        <motion.div variants={riseChild} className="lg:col-span-2">
          <Card icon={PieChart} title="Category breakdown" subtitle="Share of total spend by grocery category.">
            <CategoryBreakdownChart data={categoryBreakdown} />
          </Card>
        </motion.div>

        <motion.div variants={riseChild}>
          <Card icon={Receipt} title="Most expensive groceries" subtitle="Ranked by total spent, across every session.">
            <TopGroceriesChart data={topGroceries} />
          </Card>
        </motion.div>

        <motion.div variants={riseChild}>
          <Card icon={Wallet} title="Member contribution" subtitle="Who paid for what, in total.">
            <MemberContributionChart data={memberContribution} />
          </Card>
        </motion.div>

        <motion.div variants={riseChild} className="lg:col-span-2">
          <Card
            icon={ShoppingBasket}
            title="Personal vs. shared spending"
            subtitle="Each member's fair share of items only they consumed vs. items split with others."
          >
            <PersonalSharedChart data={memberPersonalShared} />
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  )
}
