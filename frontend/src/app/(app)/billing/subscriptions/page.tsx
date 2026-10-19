// src/app/(app)/billing/subscriptions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, History, Layers } from 'lucide-react'
import { billingService } from '@/services/billingService'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { CYCLE, PROVIDER, SubscriptionPill } from '@/components/billing/shared'
import { formatDay, formatMoney } from '@/lib/format'
import type { Subscription } from '@/types/billing.types'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    billingService.subscriptions().then(setSubs).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load subscriptions.'))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader icon={History} back={{ href: '/billing', label: 'Billing' }} title="Subscriptions" description="Your current plan and the plans you had before." />
      {error && <ErrorBanner title="Couldn’t load subscriptions" message={error} />}
      {!subs ? (
        <TableSkeleton rows={3} cols={4} />
      ) : subs.length === 0 ? (
        <EmptyState icon={<Layers />} title="No subscriptions yet" description="Choose a plan to start your free trial." action={<Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/billing/plans">See plans</Link></Button>} />
      ) : (
        <AppStagger className="space-y-3">
          {subs.map((s) => {
            const P = PROVIDER[s.payment_provider]
            return (
              <AppStaggerItem key={s.id}>
                <Link href={`/billing/subscriptions/${s.id}`} className="card-lift group flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Layers className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{s.plan_name}</p>
                      <SubscriptionPill sub={s} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(s.plan_price, 'USD')} / {CYCLE[s.billing_cycle]?.per} · <P.icon className="inline h-3.5 w-3.5" /> {P.label} · {formatDay(s.start_date)} – {formatDay(s.end_date)}
                    </p>
                  </div>
                  <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" />
                </Link>
              </AppStaggerItem>
            )
          })}
        </AppStagger>
      )}
    </div>
  )
}
