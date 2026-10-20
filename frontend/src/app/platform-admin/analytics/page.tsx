// src/app/platform-admin/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Building2, Repeat, Wallet } from 'lucide-react'
import { adminService, type AdminOverview } from '@/services/adminService'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton } from '@/components/app/kit'
import { BarList, TrendChart } from '@/components/analytics/Charts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTotals } from '@/components/billing/shared'
import { formatMoney } from '@/lib/format'

export default function PlatformAnalyticsPage() {
  const [d, setD] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    adminService.overview().then(setD).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load analytics.'))
  }, [])

  const months = d?.monthly ?? []
  const dates = months.map((m) => `${m.month}-01`)
  const currencies = [...new Set(months.flatMap((m) => Object.keys(m.revenue)))]

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Platform analytics" description="Revenue and growth across every company. Each currency is shown on its own." />
      {error && <ErrorBanner title="Couldn’t load analytics" message={error} />}
      {!d ? <StatGridSkeleton /> : (
        <StatGrid>
          <StatCard label="Monthly recurring (USD)" value={d.mrr_usd} icon={Repeat} tone="success" format={(n) => formatMoney(n, 'USD', { maximumFractionDigits: 0 })} hint={`${d.paying_subscriptions} paying subscriptions`} />
          <StatCard label="Revenue, 30 days" value={1} icon={Wallet} tone="brand" format={() => formatTotals(d.revenue_30d)} />
          <StatCard label="Revenue, all time" value={1} icon={Wallet} tone="info" format={() => formatTotals(d.revenue_total)} />
          <StatCard label="New companies, 30 days" value={d.new_companies_30d} icon={Building2} tone="warning" hint={`${d.churned_30d} subscriptions ended`} />
        </StatGrid>
      )}
      {!d ? <Skeleton className="h-72 rounded-xl" /> : currencies.length === 0 ? (
        <Panel title="Revenue by month"><p className="py-8 text-center text-sm text-muted-foreground">No completed payments yet.</p></Panel>
      ) : currencies.map((cur, i) => (
        <Panel key={cur} title={`Revenue by month · ${cur}`} delay={0.05 + i * 0.05}>
          <TrendChart dates={dates} format={(n) => formatMoney(n, cur, { maximumFractionDigits: 0 })}
            series={[{ key: `rev-${cur}`, label: cur, color: i % 2 ? 'var(--info)' : 'var(--brand)', values: months.map((m) => m.revenue[cur] ?? 0) }]} />
        </Panel>
      ))}
      {d && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="New companies by month" delay={0.15}>
            <TrendChart height={220} dates={dates} series={[{ key: 'signups', label: 'New companies', color: 'var(--info)', values: months.map((m) => m.signups) }]} />
          </Panel>
          <Panel title="Live subscriptions by plan" delay={0.2}>
            <BarList items={d.plan_breakdown.map((p) => ({ label: p.plan, sub: p.cycle.toLowerCase(), value: p.count }))} empty="No live subscriptions." />
          </Panel>
        </div>
      )}
    </div>
  )
}
