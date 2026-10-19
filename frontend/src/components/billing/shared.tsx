// src/components/billing/shared.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bitcoin, CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, Smartphone, XCircle } from 'lucide-react'
import { StatusPill, type Tone } from '@/components/app/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { billingService } from '@/services/billingService'
import { formatMoney } from '@/lib/format'
import type { CryptoPayResponse, Provider, Subscription, SubscriptionStatus, TransactionStatus } from '@/types/billing.types'

export const SUB_STATUS: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  TRIALING: { label: 'Free trial', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'success' },
  PAST_DUE: { label: 'Payment due', tone: 'warning' },
  UNPAID: { label: 'Unpaid', tone: 'danger' },
  CANCELLED: { label: 'Ended', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
}

export const TX_STATUS: Record<TransactionStatus, { label: string; tone: Tone }> = {
  COMPLETED: { label: 'Paid', tone: 'success' },
  PENDING: { label: 'Pending', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
}

export const PROVIDER: Record<Provider, { label: string; icon: typeof CreditCard }> = {
  STRIPE: { label: 'Card', icon: CreditCard },
  MPESA: { label: 'M-Pesa', icon: Smartphone },
  CRYPTO: { label: 'Crypto', icon: Bitcoin },
}

export const CYCLE: Record<string, { label: string; per: string }> = {
  MONTHLY: { label: 'Monthly', per: 'month' },
  QUARTERLY: { label: 'Quarterly', per: 'quarter' },
  ANNUAL: { label: 'Annual', per: 'year' },
}

export function SubscriptionPill({ sub }: { sub: Pick<Subscription, 'status' | 'cancels_at_period_end'> }) {
  if (sub.cancels_at_period_end) return <StatusPill tone="warning">Ends at period end</StatusPill>
  const s = SUB_STATUS[sub.status] ?? SUB_STATUS.ACTIVE
  return <StatusPill tone={s.tone} pulse={sub.status === 'PAST_DUE'}>{s.label}</StatusPill>
}

/** {"USD": 40, "KES": 2600} → "$40.00 · KES 2,600.00"; empty → em dash. */
export function formatTotals(totals: Record<string, number> | undefined) {
  const entries = Object.entries(totals ?? {}).filter(([, v]) => v)
  return entries.length ? entries.map(([cur, v]) => formatMoney(v, cur)).join(' · ') : formatMoney(0, 'USD')
}

type PayState =
  | { step: 'form' }
  | { step: 'waiting'; ref: string; message: string; crypto?: CryptoPayResponse }
  | { step: 'paid' }
  | { step: 'failed'; message: string }

/**
 * Pay for an M-Pesa or crypto subscription now. M-Pesa sends a PIN prompt to the phone; crypto shows an address.
 * Either way the status is polled until the payment completes or fails.
 */
export function PayNowDialog({ subscription, open, onOpenChange, onPaid, defaultPhone }: {
  subscription: Subscription
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaid: () => void
  defaultPhone?: string
}) {
  const provider = subscription.payment_provider
  const [phone, setPhone] = useState(defaultPhone ?? '')
  const [state, setState] = useState<PayState>({ step: 'form' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const polls = useRef(0)

  useEffect(() => {
    if (!open) {
      setState({ step: 'form' })
      setError(null)
      polls.current = 0
    }
  }, [open])

  // Poll every 4 s for up to ~3 minutes (M-Pesa) or 30 minutes (crypto)
  useEffect(() => {
    if (state.step !== 'waiting') return
    const limit = provider === 'MPESA' ? 45 : 450
    const t = setInterval(async () => {
      polls.current += 1
      try {
        const res = provider === 'MPESA' ? await billingService.mpesaStatus(state.ref) : await billingService.cryptoStatus(state.ref)
        if (res.status === 'COMPLETED') {
          setState({ step: 'paid' })
          onPaid()
        } else if (res.status === 'FAILED') {
          setState({ step: 'failed', message: provider === 'MPESA' ? 'The payment was cancelled or failed on the phone.' : 'The crypto payment failed or expired.' })
        } else if (polls.current >= limit) {
          setState({ step: 'failed', message: 'We haven’t received confirmation yet. If you paid, it will show up shortly.' })
        }
      } catch {
        /* keep polling */
      }
    }, 4000)
    return () => clearInterval(t)
  }, [state, provider, onPaid])

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      if (provider === 'MPESA') {
        const res = await billingService.payMpesa(subscription.id, phone || undefined)
        setState({ step: 'waiting', ref: res.checkout_request_id, message: `Enter your M-Pesa PIN on ${res.phone_number} to pay ${formatMoney(res.amount, 'KES', { maximumFractionDigits: 0 })}.` })
      } else {
        const res = await billingService.payCrypto(subscription.id)
        setState({ step: 'waiting', ref: res.payment_id, message: 'Send the exact amount below. This page updates when the payment confirms.', crypto: res })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t start the payment.')
    } finally {
      setBusy(false)
    }
  }

  const Icon = PROVIDER[provider].icon
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-brand" />Pay with {PROVIDER[provider].label}</DialogTitle>
          <DialogDescription>{subscription.plan_name} · {CYCLE[subscription.billing_cycle]?.label ?? ''}{subscription.next_payment ? ` · ${formatMoney(subscription.next_payment.amount, subscription.next_payment.currency)}` : ''}</DialogDescription>
        </DialogHeader>
        <AnimatePresence mode="wait">
          <motion.div key={state.step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
            {state.step === 'form' && (
              <>
                {provider === 'MPESA' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-phone">M-Pesa number</Label>
                    <Input id="pay-phone" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <p className="text-xs text-muted-foreground">You’ll get a prompt on this phone to enter your PIN.</p>
                  </div>
                )}
                {provider === 'CRYPTO' && <p className="text-sm text-muted-foreground">We’ll create a payment address for this period’s amount in USDT.</p>}
                {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
                <Button onClick={start} disabled={busy || (provider === 'MPESA' && !phone.trim())} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{provider === 'MPESA' ? 'Send payment prompt' : 'Get payment address'}
                </Button>
              </>
            )}
            {state.step === 'waiting' && (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-brand-soft/60 p-4 text-sm">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand/40 motion-reduce:hidden" /><Icon className="relative h-5 w-5" />
                  </span>
                  <p>{state.message}</p>
                </div>
                {state.crypto && (
                  <div className="space-y-2 rounded-xl border p-3 text-sm">
                    <p className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{state.crypto.pay_amount} {state.crypto.pay_currency?.toUpperCase()}</span></p>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{state.crypto.payment_address}</code>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigator.clipboard?.writeText(state.crypto!.payment_address)} aria-label="Copy address"><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                    {state.crypto.payment_url && <a href={state.crypto.payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">Open payment page <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                )}
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Waiting for confirmation…</p>
              </>
            )}
            {state.step === 'paid' && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-7 w-7" /></motion.span>
                <p className="font-medium">Payment received</p>
                <p className="text-sm text-muted-foreground">Your subscription is active. A receipt is in your payment history.</p>
                <Button onClick={() => onOpenChange(false)} className="mt-1">Done</Button>
              </div>
            )}
            {state.step === 'failed' && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger"><XCircle className="h-7 w-7" /></span>
                <p className="text-sm text-muted-foreground">{state.message}</p>
                <Button variant="outline" onClick={() => setState({ step: 'form' })}>Try again</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
