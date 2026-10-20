// src/app/platform-admin/subscriptions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { adminService, type AdminOverview } from '@/services/adminService'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton } from '@/components/app/kit'
import { BarList, Donut } from '@/components/analytics/Charts'
import { formatMoney } from '@/lib/format'
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'

const LABEL: Record<string, string> = { active: 'Paying', trialing: 'On trial', past_due: 'Payment due', unpaid: 'Unpaid', cancelled: 'Ended', expired: 'Expired' }
const LINK: Record<string, string> = { active: 'active_plan', trialing: 'trialing', past_due: 'past_due' }

export default function AdminSubscriptionsPage() {
  const [d, setD] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    adminService.overview().then(setD).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load subscriptions.'))
  }, [])
  const b = d?.subscription_breakdown ?? {}

  return (
    <div className="space-y-6">
      <PageHeader icon={Layers} title="Subscriptions" description="Plans across every company. Open a group to see the companies in it." />
      {error && <ErrorBanner title="Couldn’t load subscriptions" message={error} />}
      {!d ? <StatGridSkeleton /> : (
        <StatGrid>
          <StatCard label="Paying" value={b.active ?? 0} icon={CheckCircle2} tone="success" hint={`${formatMoney(d.mrr_usd, 'USD', { maximumFractionDigits: 0 })} a month`} href="/platform-admin/companies?status=active_plan" />
          <StatCard label="On trial" value={b.trialing ?? 0} icon={Clock} tone="info" href="/platform-admin/companies?status=trialing" />
          <StatCard label="Payment due" value={b.past_due ?? 0} icon={AlertTriangle} tone="warning" href="/platform-admin/companies?status=past_due" />
          <StatCard label="Ended, 30 days" value={d.churned_30d} icon={XCircle} tone="neutral" />
        </StatGrid>
      )}
      {d && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="By status" delay={0.1}>
            <Donut data={Object.entries(b).map(([k, v]) => ({ label: LABEL[k] ?? k, value: v }))} center="subscriptions" />
            <ul className="mt-4 space-y-1 text-sm">
              {Object.entries(LINK).map(([k, s]) => (
                <li key={k}><Link href={`/platform-admin/companies?status=${s}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted"><span>{LABEL[k]}</span><span className="flex items-center gap-1 text-muted-foreground">{b[k] ?? 0}<ArrowRight className="h-3.5 w-3.5" /></span></Link></li>
              ))}
            </ul>
          </Panel>
          <Panel title="Live subscriptions by plan" delay={0.15}>
            <BarList items={d.plan_breakdown.map((p) => ({ label: p.plan, sub: p.cycle.toLowerCase(), value: p.count }))} empty="No live subscriptions yet." />
          </Panel>
        </div>
      )}
    </div>
  )
}
