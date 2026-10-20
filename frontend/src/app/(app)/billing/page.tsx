// src/app/(app)/billing/page.tsx
'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarClock, CreditCard, Layers, Loader2, Receipt, RotateCcw, Sparkles, Wallet, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { billingService } from '@/services/billingService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatusPill } from '@/components/app/kit'
import { FadeIn, ease } from '@/components/app/motion'
import { CYCLE, PROVIDER, PayNowDialog, SubscriptionPill, TX_STATUS, formatTotals } from '@/components/billing/shared'
import { formatDay, formatMoney, timeAgo } from '@/lib/format'
import type { BillingOverview, SubscriptionDetail } from '@/types/billing.types'

function CurrentPlan({ sub, onCancel, onResume, onPay, busy }: {
  sub: SubscriptionDetail
  onCancel: () => void
  onResume: () => void
  onPay: () => void
  busy: boolean
}) {
  const Provider = PROVIDER[sub.payment_provider]
  const trialLeft = sub.is_trial && sub.trial_end ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / 86400000)) : null
  const pastDue = sub.status === 'PAST_DUE'
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand/15 via-card to-card p-6 sm:p-8"
    >
      <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 animate-float-slow rounded-full bg-brand/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SubscriptionPill sub={sub} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Provider.icon className="h-3.5 w-3.5" />Paid by {Provider.label}</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{sub.plan_name}</h2>
            <p className="text-muted-foreground">{formatMoney(sub.plan_price, 'USD')} per {CYCLE[sub.billing_cycle]?.per ?? 'period'}</p>
          </div>
          <p className="text-sm">
            {pastDue ? (
              <span className="font-medium text-warning">Payment is due. Pay now to keep your account active.</span>
            ) : sub.cancels_at_period_end ? (
              <>Ends on <span className="font-medium">{formatDay(sub.end_date)}</span>. You keep full access until then.</>
            ) : trialLeft !== null ? (
              <>Free trial: <span className="font-medium">{trialLeft} {trialLeft === 1 ? 'day' : 'days'} left</span>{sub.next_payment && <> · then {formatMoney(sub.next_payment.amount, sub.next_payment.currency)}</>}</>
            ) : sub.next_payment ? (
              <>Renews on <span className="font-medium">{formatDay(sub.next_payment.date)}</span> for {formatMoney(sub.next_payment.amount, sub.next_payment.currency)}</>
            ) : null}
          </p>
          {trialLeft !== null && (
            <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${((14 - trialLeft) / 14) * 100}%` }} transition={{ duration: 0.9, ease, delay: 0.2 }} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {pastDue && sub.payment_provider !== 'STRIPE' && (
            <Button onClick={onPay} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Wallet className="mr-2 h-4 w-4" />Pay now</Button>
          )}
          <Button asChild variant="outline"><Link href="/billing/plans"><Layers className="mr-2 h-4 w-4" />Change plan</Link></Button>
          {sub.cancels_at_period_end ? (
            <Button variant="outline" onClick={onResume} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}Keep my plan</Button>
          ) : (
            <Button variant="ghost" onClick={onCancel} disabled={busy} className="text-muted-foreground hover:text-danger"><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
          )}
        </div>
      </div>
    </motion.section>
  )
}

function NoPlan({ trial }: { trial: boolean }) {
  return (
    <FadeIn className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-brand/15 via-card to-card p-8 text-center sm:p-10">
      <span aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 animate-float-slow rounded-full bg-brand/20 blur-3xl" />
      <div className="relative mx-auto max-w-lg space-y-3">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground"><Sparkles className="h-6 w-6" /></span>
        <h2 className="text-2xl font-semibold tracking-tight">{trial ? 'Start your 14-day free trial' : 'Choose a plan'}</h2>
        <p className="text-muted-foreground">{trial ? 'Full access to every module. Pay by card, M-Pesa or crypto when the trial ends; cancel any time.' : 'Pick the plan that fits your team. Pay by card, M-Pesa or crypto.'}</p>
        <Button asChild className="btn-shine mt-2 bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/billing/plans">See plans <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </FadeIn>
  )
}

function BillingOverviewContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [data, setData] = useState<BillingOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const handledCheckout = useRef(false)

  const load = useCallback(async () => {
    try {
      setData(await billingService.overview())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load billing.')
    }
  }, [])

  // Coming back from Stripe Checkout: confirm it (safe to repeat), then clean the URL
  useEffect(() => {
    const sessionId = params.get('session_id')
    if (params.get('checkout') === 'success' && sessionId && !handledCheckout.current) {
      handledCheckout.current = true
      billingService.stripeCheckoutComplete(sessionId)
        .then((res) => toast.success(res.message))
        .catch((err) => toast.error(err instanceof Error ? err.message : 'Couldn’t confirm the checkout.'))
        .finally(() => {
          router.replace('/billing', { scroll: false })
          load()
        })
    } else {
      load()
    }
  }, [params, router, load])

  const sub = data?.subscription
  const run = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true)
    try {
      const res = await fn()
      toast.success(res.message)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusy(false)
      setConfirmCancel(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={CreditCard} title="Billing" description="Your plan, payments and payment methods." />

      {error && <ErrorBanner title="Couldn’t load billing" message={error} onRetry={load} />}

      {!data ? (
        <div className="space-y-6" aria-busy aria-label="Loading billing">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        </div>
      ) : (
        <>
          {sub ? (
            <CurrentPlan sub={sub} busy={busy} onCancel={() => setConfirmCancel(true)} onResume={() => run(() => billingService.resume(sub.id))} onPay={() => setPayOpen(true)} />
          ) : (
            <NoPlan trial={data.trial_available} />
          )}

          <StatGrid>
            <StatCard label="Paid in total" value={Object.values(data.spent_total).reduce((a, b) => a + b, 0)} icon={Wallet} tone="brand" hint={`${data.completed_payments} payments`} format={() => formatTotals(data.spent_total)} href="/billing/transactions" />
            <StatCard label="This month" value={Object.values(data.spent_this_month).reduce((a, b) => a + b, 0)} icon={CalendarClock} tone="info" format={() => formatTotals(data.spent_this_month)} />
            <StatCard label="Pending payments" value={data.pending_payments} icon={Loader2} tone={data.pending_payments ? 'warning' : 'success'} hint="Waiting for confirmation" href="/billing/transactions?status=PENDING" />
            <StatCard label="Payment methods" value={data.payment_methods} icon={CreditCard} tone="neutral" hint={data.default_payment_method?.display_info ?? 'None saved'} href="/billing/payment-methods" />
          </StatGrid>

          <Panel icon={Receipt} title="Recent payments" bodyClassName="p-0" delay={0.15}
            action={<Link href="/billing/transactions" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">All payments <ArrowRight className="h-3.5 w-3.5" /></Link>}>
            {data.recent_transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No payments yet.{data.subscription?.is_trial ? ' Your trial is free.' : ''}</p>
            ) : (
              <ul className="divide-y">
                {data.recent_transactions.map((t, i) => {
                  const s = TX_STATUS[t.status]
                  const P = PROVIDER[t.provider]
                  return (
                    <motion.li key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><P.icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.plan_name ? `${t.plan_name} subscription` : t.description || 'Payment'}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(t.created_at)} · {t.provider_payment_method || P.label}</p>
                      </div>
                      <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">{formatMoney(t.amount, t.currency)}</span>
                    </motion.li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      {sub && (
        <>
          <ConfirmDialog
            open={confirmCancel}
            onOpenChange={(o) => !busy && setConfirmCancel(o)}
            title="Cancel your subscription?"
            description={`It won’t renew. You keep full access until ${formatDay(sub.end_date)}, and you can change your mind before then.`}
            confirmText="Cancel subscription"
            cancelText="Keep it"
            onConfirm={() => run(() => billingService.cancel(sub.id))}
            loading={busy}
            variant="destructive"
          />
          <PayNowDialog subscription={sub} open={payOpen} onOpenChange={setPayOpen} onPaid={load}
            defaultPhone={data?.default_payment_method?.type === 'MPESA' ? data.default_payment_method.phone_number : undefined} />
        </>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
      <BillingOverviewContent />
    </Suspense>
  )
}
