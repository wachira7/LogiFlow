// src/app/platform-admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowRight, Building2, Repeat, ScrollText, Sparkles, UserCheck, Users, Wallet } from 'lucide-react'
import { adminService, type AdminOverview, type Health } from '@/services/adminService'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, StatusPill } from '@/components/app/kit'
import { Legend, TrendChart } from '@/components/analytics/Charts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCount, formatMoney, timeAgo } from '@/lib/format'
import { formatTotals } from '@/components/billing/shared'

const HEALTH_TONE = { HEALTHY: 'success', WARNING: 'warning', CRITICAL: 'danger' } as const

export default function PlatformOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminService.overview().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load the overview.'))
    adminService.health().then(setHealth).catch(() => {})
  }, [])

  const months = data?.monthly ?? []
  const currencies = [...new Set(months.flatMap((m) => Object.keys(m.revenue)))]
  const main = currencies.includes('USD') ? 'USD' : currencies[0] ?? 'USD'

  return (
    <div className="space-y-6">
      <PageHeader icon={Sparkles} title="Platform overview" description="Every company on LogiFlow at a glance."
        actions={health && (
          <Link href="/platform-admin/system-health" className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm shadow-sm hover:border-brand/40">
            <Activity className="h-4 w-4 text-brand" />System
            <StatusPill tone={HEALTH_TONE[health.overall_status]} pulse={health.overall_status !== 'HEALTHY'}>{health.overall_status.toLowerCase()}</StatusPill>
          </Link>
        )} />

      {error && <ErrorBanner title="Couldn’t load the overview" message={error} />}

      {!data ? <StatGridSkeleton /> : (
        <StatGrid>
          <StatCard label="Companies" value={data.total_companies} icon={Building2} tone="brand" hint={`${data.new_companies_30d} new in 30 days · ${data.suspended_companies} suspended`} href="/platform-admin/companies" />
          <StatCard label="Monthly recurring" value={data.mrr_usd} icon={Repeat} tone="success" hint={`${data.paying_subscriptions} paying · ${data.trials} on trial`} format={(n) => formatMoney(n, 'USD', { maximumFractionDigits: 0 })} href="/platform-admin/subscriptions" />
          <StatCard label="Revenue (30 days)" value={Object.values(data.revenue_30d).reduce((a, b) => a + b, 0)} icon={Wallet} tone="info" format={() => formatTotals(data.revenue_30d)} hint={`All time: ${formatTotals(data.revenue_total)}`} href="/platform-admin/analytics" />
          <StatCard label="People signed in (30 days)" value={data.users_signed_in_30d} icon={UserCheck} tone="warning" hint={`${formatCount(data.active_users)} active accounts · ${data.engaged_companies_30d} companies`} />
        </StatGrid>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Growth" description="Last 12 months" delay={0.1}
          action={<Legend series={[{ label: `Revenue (${main})`, color: 'var(--brand)' }, { label: 'New companies', color: 'var(--info)' }]} />}>
          {!data ? <Skeleton className="h-64" /> : (
            <div className="grid gap-6 sm:grid-cols-2">
              <TrendChart height={220} dates={months.map((m) => `${m.month}-01`)} format={(n) => formatMoney(n, main, { maximumFractionDigits: 0 })}
                series={[{ key: 'rev', label: `Revenue (${main})`, color: 'var(--brand)', values: months.map((m) => m.revenue[main] ?? 0) }]} />
              <TrendChart height={220} dates={months.map((m) => `${m.month}-01`)}
                series={[{ key: 'signups', label: 'New companies', color: 'var(--info)', values: months.map((m) => m.signups) }]} />
            </div>
          )}
        </Panel>

        <Panel icon={ScrollText} title="Recent admin actions" bodyClassName="p-0" delay={0.15}
          action={<Link href="/platform-admin/audit-logs" className="text-sm font-medium text-brand hover:underline">All</Link>}>
          {!data ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            : data.recent_activity.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No admin actions yet.</p> : (
              <ul className="divide-y">
                {data.recent_activity.map((a, i) => (
                  <li key={i} className="px-5 py-3 text-sm">
                    <p className="line-clamp-2">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.admin} · {timeAgo(a.timestamp)}</p>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel icon={Users} title="People" delay={0.2}>
            <dl className="grid grid-cols-3 gap-4 text-center">
              <div><dt className="text-xs text-muted-foreground">Accounts</dt><dd className="text-2xl font-semibold tabular-nums">{formatCount(data.total_users)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Active</dt><dd className="text-2xl font-semibold tabular-nums">{formatCount(data.active_users)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Churned (30d)</dt><dd className="text-2xl font-semibold tabular-nums">{formatCount(data.churned_30d)}</dd></div>
            </dl>
          </Panel>
          <Panel icon={Building2} title="Companies needing attention" delay={0.25}>
            <ul className="space-y-2 text-sm">
              {[
                ['Payment due', data.subscription_breakdown.past_due ?? 0, 'past_due'],
                ['On trial', data.trials, 'trialing'],
                ['No plan', Math.max(0, data.total_companies - Object.entries(data.subscription_breakdown).filter(([k]) => ['active', 'trialing', 'past_due'].includes(k)).reduce((a, [, v]) => a + v, 0)), 'none'],
                ['Suspended', data.suspended_companies, 'suspended'],
              ].map(([label, n, status]) => (
                <li key={label as string}>
                  <Link href={`/platform-admin/companies?status=${status}`} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted">
                    <span>{label}</span><span className="flex items-center gap-2 font-semibold tabular-nums">{n as number}<ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  )
}
