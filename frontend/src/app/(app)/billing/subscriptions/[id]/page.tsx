// src/app/(app)/billing/subscriptions/[id]/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Layers, Receipt } from 'lucide-react'
import { billingService } from '@/services/billingService'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBanner, PageHeader, Panel, StatusPill } from '@/components/app/kit'
import { CYCLE, PROVIDER, SubscriptionPill, TX_STATUS } from '@/components/billing/shared'
import { formatDateTime, formatDay, formatMoney } from '@/lib/format'
import type { SubscriptionDetail } from '@/types/billing.types'

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sub, setSub] = useState<SubscriptionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => billingService.subscription(id).then(setSub).catch((err) => setError(err instanceof Error ? err.message : 'Not found')), [id])
  useEffect(() => {
    load()
  }, [load])

  if (error) return <div className="space-y-6"><PageHeader title="Subscription" back={{ href: '/billing/subscriptions', label: 'Subscriptions' }} /><ErrorBanner title="Couldn’t load this subscription" message={error} onRetry={load} /></div>
  if (!sub) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-48 rounded-xl" /></div>

  const P = PROVIDER[sub.payment_provider]
  const facts: [string, string][] = [
    ['Price', `${formatMoney(sub.plan_price, 'USD')} / ${CYCLE[sub.billing_cycle]?.per}`],
    ['Paid with', P.label],
    ['Started', formatDay(sub.start_date)],
    [sub.cancels_at_period_end || ['CANCELLED', 'EXPIRED'].includes(sub.status) ? 'Ends' : 'Renews', formatDay(sub.end_date)],
    ['Trial', sub.trial_end ? `Until ${formatDay(sub.trial_end)}` : 'No'],
    ['Next payment', sub.next_payment ? `${formatMoney(sub.next_payment.amount, sub.next_payment.currency)} on ${formatDay(sub.next_payment.date)}` : '—'],
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={Layers} back={{ href: '/billing/subscriptions', label: 'Subscriptions' }} title={sub.plan_name}
        description={<span className="flex flex-wrap items-center gap-2"><SubscriptionPill sub={sub} /><span>Started by {sub.user_email}</span></span>} />
      <Panel delay={0.05}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
        </dl>
      </Panel>
      <Panel icon={Receipt} title="Payments for this subscription" bodyClassName="p-0" delay={0.1}>
        {sub.recent_transactions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ul className="divide-y">
            {sub.recent_transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1">{formatDateTime(t.created_at)}<span className="block text-xs text-muted-foreground">{t.invoice_number || t.provider_payment_method}</span></span>
                <StatusPill tone={TX_STATUS[t.status].tone}>{TX_STATUS[t.status].label}</StatusPill>
                <span className="w-28 text-right font-semibold tabular-nums">{formatMoney(t.amount, t.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
