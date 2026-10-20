// src/app/(app)/billing/plans/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Layers, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { billingService } from '@/services/billingService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorBanner, PageHeader } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { CYCLE, PROVIDER, PayNowDialog } from '@/components/billing/shared'
import { formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BillingCycle, BillingOverview, Provider, SubscriptionDetail, SubscriptionPlan } from '@/types/billing.types'

const CYCLES: BillingCycle[] = ['MONTHLY', 'QUARTERLY', 'ANNUAL']
const MONTHS: Record<BillingCycle, number> = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 }
const limit = (n: number) => (n >= 999 ? 'Unlimited' : n.toLocaleString())
const featureList = (f: SubscriptionPlan['features']) => (Array.isArray(f) ? f.map(String) : Object.values(f ?? {}).filter((v) => typeof v === 'string') as string[])

function SubscribeDialog({ plan, overview, onClose }: { plan: SubscriptionPlan | null; overview: BillingOverview | null; onClose: () => void }) {
  const router = useRouter()
  const [provider, setProvider] = useState<Provider>('STRIPE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payFor, setPayFor] = useState<SubscriptionDetail | null>(null)
  const trial = !!overview?.trial_available
  const switching = !!overview?.subscription

  useEffect(() => {
    setError(null)
    setProvider(overview?.stripe_enabled === false ? 'MPESA' : 'STRIPE')
  }, [plan, overview])

  const go = async () => {
    if (!plan) return
    setBusy(true)
    setError(null)
    try {
      if (provider === 'STRIPE') {
        const res = await billingService.stripeCheckout(plan.id)
        window.location.assign(res.checkout_url)
        return
      }
      const sub = await billingService.subscribe(plan.id, provider, !trial || switching)
      if (sub.status === 'TRIALING') {
        toast.success(`Your 14-day free trial of ${plan.name} has started.`)
        router.push('/billing')
      } else {
        setPayFor(sub)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t start the subscription.')
    } finally {
      setBusy(false)
    }
  }

  const options: { key: Provider; hint: string; disabled?: boolean }[] = [
    { key: 'STRIPE', hint: 'Visa, Mastercard and more via Stripe', disabled: overview?.stripe_enabled === false },
    { key: 'MPESA', hint: 'Pay from your phone with a PIN prompt' },
    { key: 'CRYPTO', hint: 'USDT, BTC and other coins' },
  ]

  return (
    <>
      <Dialog open={!!plan && !payFor} onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent className="sm:max-w-md">
          {plan && (
            <>
              <DialogHeader>
                <DialogTitle>{switching ? `Switch to ${plan.name}` : `Subscribe to ${plan.name}`}</DialogTitle>
                <DialogDescription>
                  {formatMoney(plan.price, 'USD')} per {CYCLE[plan.billing_cycle].per}
                  {trial && !switching ? ' · first 14 days free' : ''}
                  {switching ? ' · replaces your current plan' : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                {options.map((o) => {
                  const P = PROVIDER[o.key]
                  const selected = provider === o.key
                  return (
                    <button key={o.key} type="button" role="radio" aria-checked={selected} disabled={o.disabled} onClick={() => setProvider(o.key)}
                      className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50', selected ? 'border-brand bg-brand-soft/60' : 'hover:bg-muted/60')}>
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', selected ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground')}><P.icon className="h-4 w-4" /></span>
                      <span className="flex-1"><span className="block text-sm font-medium">{P.label}</span><span className="block text-xs text-muted-foreground">{o.disabled ? 'Not available yet' : o.hint}</span></span>
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', selected && 'border-brand bg-brand')}>{selected && <Check className="h-3 w-3 text-brand-foreground" />}</span>
                    </button>
                  )
                })}
              </div>
              {provider !== 'STRIPE' && (
                <p className="text-xs text-muted-foreground">
                  {trial && !switching ? 'No payment today. When the trial ends we’ll send a payment request; you can pay any time before.' : 'You’ll pay for the first period now; access starts as soon as the payment confirms.'}
                </p>
              )}
              {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
              <Button onClick={go} disabled={busy} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {provider === 'STRIPE' ? 'Continue to secure checkout' : trial && !switching ? 'Start free trial' : 'Continue to payment'}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      {payFor && (
        <PayNowDialog subscription={payFor} open onOpenChange={(o) => { if (!o) { setPayFor(null); onClose(); router.push('/billing') } }} onPaid={() => toast.success('Payment received. Your plan is active.')} />
      )}
    </>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null)
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null)

  useEffect(() => {
    Promise.all([billingService.plans(), billingService.overview()])
      .then(([p, o]) => {
        setPlans(p)
        setOverview(o)
        if (o.subscription) setCycle(o.subscription.billing_cycle)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load plans.'))
  }, [])

  const visible = useMemo(() => (plans ?? []).filter((p) => p.billing_cycle === cycle).sort((a, b) => toNumber(a.price) - toNumber(b.price)), [plans, cycle])
  const monthlyPrice = (name: string) => toNumber(plans?.find((p) => p.name === name && p.billing_cycle === 'MONTHLY')?.price)
  const current = overview?.subscription
  // Highlight the mid-tier plan (Professional when present)
  const popular = (visible.find((p) => /professional/i.test(p.name)) ?? (visible.length >= 3 ? visible[Math.floor(visible.length / 2)] : null))?.id ?? null

  return (
    <div className="space-y-8">
      <PageHeader icon={Layers} back={{ href: '/billing', label: 'Billing' }} title="Plans"
        description={overview?.trial_available ? 'Every plan starts with a 14-day free trial. Cancel any time.' : 'Switch plans any time; the new plan replaces your current one.'} />

      {error && <ErrorBanner title="Couldn’t load plans" message={error} />}

      <FadeIn className="flex justify-center">
        <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm" role="tablist" aria-label="Billing cycle">
          {CYCLES.map((c) => (
            <button key={c} role="tab" aria-selected={cycle === c} onClick={() => setCycle(c)}
              className={cn('relative rounded-lg px-4 py-1.5 text-sm font-medium transition-colors', cycle === c ? 'text-brand' : 'text-muted-foreground hover:text-foreground')}>
              {cycle === c && <motion.span layoutId="plan-cycle" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{CYCLE[c].label}{c === 'ANNUAL' && <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">Save 20%</span>}</span>
            </button>
          ))}
        </div>
      </FadeIn>

      {!plans ? (
        <div className="grid gap-6 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[28rem] rounded-2xl" />)}</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={cycle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AppStagger className={cn('grid gap-6', visible.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : visible.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
              {visible.map((p) => {
                const isCurrent = current?.plan_id === p.id
                const isPopular = p.id === popular
                const perMonth = toNumber(p.price) / MONTHS[cycle]
                const full = monthlyPrice(p.name) * MONTHS[cycle]
                const saving = full > toNumber(p.price) ? Math.round((1 - toNumber(p.price) / full) * 100) : 0
                return (
                  <AppStaggerItem key={p.id} className="h-full">
                    <div className={cn('card-lift relative flex h-full flex-col rounded-2xl border bg-card p-6', isPopular && 'border-brand shadow-lg shadow-brand/10 lg:-translate-y-2')}>
                      {isPopular && <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground"><Sparkles className="h-3 w-3" />Most popular</span>}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold">{p.name}</h3>
                        {isCurrent && <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Current plan</span>}
                      </div>
                      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{p.description}</p>
                      <div className="mt-5">
                        <span className="text-4xl font-semibold tracking-tight">{formatMoney(perMonth, 'USD', { maximumFractionDigits: perMonth % 1 ? 2 : 0 })}</span>
                        <span className="text-sm text-muted-foreground"> / month</span>
                      </div>
                      <p className="mt-1 h-5 text-xs text-muted-foreground">
                        {cycle !== 'MONTHLY' && <>{formatMoney(p.price, 'USD')} billed {CYCLE[cycle].label.toLowerCase()}{saving > 0 && <span className="font-medium text-success"> · save {saving}%</span>}</>}
                      </p>
                      <ul className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center text-xs">
                        <li><span className="block text-sm font-semibold">{limit(p.max_users)}</span>users</li>
                        <li><span className="block text-sm font-semibold">{limit(p.max_warehouses)}</span>warehouses</li>
                        <li><span className="block text-sm font-semibold">{limit(p.max_products)}</span>products</li>
                      </ul>
                      <ul className="mt-5 flex-1 space-y-2 text-sm">
                        {featureList(p.features).map((f) => (
                          <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{f}</li>
                        ))}
                      </ul>
                      <Button onClick={() => setSelected(p)} disabled={isCurrent && current?.auto_renew}
                        className={cn('mt-6 w-full', isPopular ? 'btn-shine bg-brand text-brand-foreground hover:bg-brand/90' : '')} variant={isPopular ? 'default' : 'outline'}>
                        {isCurrent ? (current?.auto_renew ? 'Your plan' : 'Resubscribe') : current ? 'Switch to this plan' : overview?.trial_available ? 'Start free trial' : 'Choose plan'}
                      </Button>
                    </div>
                  </AppStaggerItem>
                )
              })}
            </AppStagger>
          </motion.div>
        </AnimatePresence>
      )}
      <p className="text-center text-xs text-muted-foreground">Prices in US dollars. M-Pesa payments are charged in Kenyan shillings at the day’s exchange rate.</p>

      <SubscribeDialog plan={selected} overview={overview} onClose={() => setSelected(null)} />
    </div>
  )
}
