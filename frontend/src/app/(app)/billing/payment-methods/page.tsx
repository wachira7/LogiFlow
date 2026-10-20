// src/app/(app)/billing/payment-methods/page.tsx
'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bitcoin, CreditCard, Loader2, Plus, ShieldCheck, Smartphone, Star, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { billingService } from '@/services/billingService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types/billing.types'

const ICON = { CARD: CreditCard, MPESA: Smartphone, CRYPTO: Bitcoin }

function AddMethodDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const [kind, setKind] = useState<'CARD' | 'MPESA' | 'CRYPTO'>('MPESA')
  const [phone, setPhone] = useState('')
  const [coin, setCoin] = useState('usdttrc20')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (kind === 'CARD') {
        const res = await billingService.stripeCardSetup()
        window.location.assign(res.checkout_url)
        return
      }
      await billingService.addPaymentMethod(kind === 'MPESA' ? { type: 'MPESA', phone_number: phone } : { type: 'CRYPTO', currency: coin })
      toast.success('Payment method added')
      onAdded()
      onOpenChange(false)
      setPhone('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add it.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a payment method</DialogTitle>
          <DialogDescription>Used for renewals. You can change the default any time.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {(['MPESA', 'CARD', 'CRYPTO'] as const).map((k) => {
            const I = ICON[k]
            return (
              <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
                className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors', kind === k ? 'border-brand bg-brand-soft/60 text-brand' : 'text-muted-foreground hover:bg-muted/60')}>
                <I className="h-5 w-5" />{k === 'MPESA' ? 'M-Pesa' : k === 'CARD' ? 'Card' : 'Crypto'}
              </button>
            )
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={kind} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {kind === 'MPESA' && (
              <div className="space-y-1.5">
                <Label htmlFor="pm-phone">M-Pesa number</Label>
                <Input id="pm-phone" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}
            {kind === 'CARD' && (
              <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />You’ll enter the card on Stripe’s secure page. We never see or store the full card number.</p>
            )}
            {kind === 'CRYPTO' && (
              <div className="space-y-1.5">
                <Label htmlFor="pm-coin">Coin</Label>
                <select id="pm-coin" value={coin} onChange={(e) => setCoin(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  <option value="usdttrc20">USDT (TRC-20)</option><option value="usdterc20">USDT (ERC-20)</option><option value="btc">Bitcoin</option><option value="eth">Ethereum</option>
                </select>
                <p className="text-xs text-muted-foreground">Each payment gets its own address; nothing is charged automatically.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <Button onClick={save} disabled={busy || (kind === 'MPESA' && !phone.trim())} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{kind === 'CARD' ? 'Continue to Stripe' : 'Save'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function PaymentMethodsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<PaymentMethod | null>(null)
  const handled = useRef(false)

  const load = useCallback(() => billingService.paymentMethods().then(setMethods).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load payment methods.')), [])

  // Back from Stripe card setup: store the card (safe to repeat), then clean the URL
  useEffect(() => {
    const sessionId = params.get('session_id')
    if (params.get('setup') === 'success' && sessionId && !handled.current) {
      handled.current = true
      billingService.stripeCardSetupComplete(sessionId)
        .then(() => toast.success('Card saved'))
        .catch((err) => toast.error(err instanceof Error ? err.message : 'Couldn’t save the card.'))
        .finally(() => { router.replace('/billing/payment-methods', { scroll: false }); load() })
    } else {
      if (params.get('setup') === 'cancelled') toast('Card setup was cancelled')
      load()
    }
  }, [params, router, load])

  const act = async (id: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(id)
    try {
      await fn()
      toast.success(message)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusy(null)
      setToRemove(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Wallet} back={{ href: '/billing', label: 'Billing' }} title="Payment methods" description="How renewals are paid. The default is used first."
        actions={<Button onClick={() => setAdding(true)} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Add method</Button>} />
      {error && <ErrorBanner title="Couldn’t load payment methods" message={error} onRetry={load} />}
      {!methods ? (
        <TableSkeleton rows={2} cols={3} />
      ) : methods.length === 0 ? (
        <EmptyState icon={<Wallet />} title="No payment methods yet" description="Add an M-Pesa number, a card or a crypto preference so renewals go smoothly."
          action={<Button onClick={() => setAdding(true)} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Add method</Button>} />
      ) : (
        <AppStagger className="grid gap-4 sm:grid-cols-2">
          {methods.map((m) => {
            const I = ICON[m.type]
            const expiry = m.type === 'CARD' && m.expiry_month ? `Expires ${m.expiry_month}/${m.expiry_year.slice(-2)}` : null
            return (
              <AppStaggerItem key={m.id}>
                <div className={cn('card-lift relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-5', m.is_default && 'border-brand/50')}>
                  {m.type === 'CARD' && <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />}
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><I className="h-5 w-5" /></span>
                    {m.is_default && <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-brand-foreground"><Star className="h-3 w-3" />Default</span>}
                  </div>
                  <div>
                    <p className="font-semibold tracking-wide">{m.display_info}</p>
                    <p className="text-xs text-muted-foreground">{expiry ?? (m.type === 'MPESA' ? 'PIN prompt on this phone' : m.type === 'CRYPTO' ? 'Address created for each payment' : '')}</p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    {!m.is_default && <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => act(m.id, () => billingService.setDefault(m.id), 'Default updated')}>Make default</Button>}
                    <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-danger" disabled={busy === m.id} onClick={() => setToRemove(m)} aria-label={`Remove ${m.display_info}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AppStaggerItem>
            )
          })}
        </AppStagger>
      )}
      <AddMethodDialog open={adding} onOpenChange={setAdding} onAdded={load} />
      <ConfirmDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)} title="Remove this payment method?"
        description={toRemove?.is_default ? 'It’s your default; another saved method becomes the default.' : 'It won’t be used for future payments.'}
        confirmText="Remove" variant="destructive" loading={!!busy} onConfirm={async () => { if (toRemove) await act(toRemove.id, () => billingService.removePaymentMethod(toRemove.id), 'Payment method removed') }} />
    </div>
  )
}

export default function PaymentMethodsPage() {
  return <Suspense fallback={<TableSkeleton rows={2} cols={3} />}><PaymentMethodsContent /></Suspense>
}
