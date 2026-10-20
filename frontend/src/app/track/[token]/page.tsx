// src/app/track/[token]/page.tsx
// Public delivery tracking for the customer: no login, no driver details, area-level address only.
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, CheckCircle2, Clock, MapPin, Package, Phone, Truck } from 'lucide-react'
import { opsService, type PublicTracking } from '@/services/opsService'
import { Skeleton } from '@/components/ui/skeleton'
import { LiveMap } from '@/components/ops/LiveMap'
import { Logo } from '@/components/landing/Logo'
import { ease } from '@/components/app/motion'
import { cn } from '@/lib/utils'
import { formatDateTime, timeAgo } from '@/lib/format'

function etaText(t: PublicTracking) {
  if (t.status === 'DELIVERED') return { big: 'Delivered', small: t.actual_delivery ? formatDateTime(t.actual_delivery) : '' }
  if (t.live?.arrived) return { big: 'Arriving now', small: 'The driver is at your address' }
  if (t.live?.eta_minutes != null) {
    const m = t.live.eta_minutes
    return { big: m < 60 ? `About ${Math.max(m, 2)} min` : `About ${Math.round(m / 60)} h`, small: t.live.stops_before_you ? `${t.live.stops_before_you} ${t.live.stops_before_you === 1 ? 'stop' : 'stops'} before yours` : 'You’re next' }
  }
  if (t.estimated_delivery) return { big: new Date(t.estimated_delivery).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }), small: `Expected by ${new Date(t.estimated_delivery).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` }
  return { big: t.status_label, small: 'We’ll update this as it moves' }
}

export default function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const reduce = useReducedMotion()
  const [t, setT] = useState<PublicTracking | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => opsService.publicTrack(token).then((d) => { setT(d); setError(null) }).catch((err) => setError(err instanceof Error ? err.message : 'We couldn’t load this shipment.')), [token])
  useEffect(() => { load() }, [load])
  // Refresh more often while it's on the road
  useEffect(() => {
    if (!t || ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(t.status)) return
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), t.live ? 30000 : 120000)
    return () => clearInterval(timer)
  }, [t, load])

  const eta = t ? etaText(t) : null
  const done = t?.status === 'DELIVERED'
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand/10 via-background to-background">
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-3">
          {t?.company.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={t.company.logo_url} alt={t.company.name} className="h-9 max-w-40 object-contain" />
            : t ? <p className="text-lg font-semibold">{t.company.name}</p> : <Skeleton className="h-6 w-32" />}
          {t?.company.phone && <a href={`tel:${t.company.phone}`} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium shadow-sm"><Phone className="h-3.5 w-3.5 text-brand" />Call</a>}
        </header>

        {error && !t ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Shipment not found</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !t || !eta ? (
          <><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></>
        ) : (
          <>
            <motion.section initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}
              className={cn('rounded-2xl p-6 text-white shadow-lg', done ? 'bg-gradient-to-br from-success to-success/80' : 'bg-gradient-to-br from-brand to-brand/80')}>
              <p className="text-sm opacity-90">{t.recipient_first_name ? `Hi ${t.recipient_first_name}, your delivery` : 'Your delivery'}{t.destination_area ? ` to ${t.destination_area}` : ''}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{eta.big}</p>
              <p className="mt-1 text-sm opacity-90">{eta.small}</p>
              {t.is_delayed && !done && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium"><AlertTriangle className="h-3.5 w-3.5" />Running later than planned</p>}
              <p className="mt-4 font-mono text-xs opacity-75">{t.shipment_number}{t.tracking_number ? ` · ${t.tracking_number}` : ''}{t.carrier ? ` · ${t.carrier}` : ''}</p>
            </motion.section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm" aria-label="Progress">
              <ol className="flex items-start justify-between">
                {t.steps.map((s, i) => {
                  const current = s.done && !t.steps[i + 1]?.done
                  return (
                    <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
                      {i > 0 && <span className="absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 bg-muted"><motion.span className="block h-full bg-brand" initial={{ width: 0 }} animate={{ width: s.done ? '100%' : 0 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.4, ease }} /></span>}
                      <motion.span initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + i * 0.12 }}
                        className={cn('relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs', s.done ? 'border-brand bg-brand text-white' : 'border-muted bg-card text-muted-foreground', current && !done && 'ring-4 ring-brand/20')}>
                        {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </motion.span>
                      <span className={cn('mt-2 text-[11px] leading-tight sm:text-xs', s.done ? 'font-medium' : 'text-muted-foreground')}>{s.label}</span>
                    </li>
                  )
                })}
              </ol>
            </section>

            {t.live && (
              <section className="overflow-hidden rounded-2xl border bg-card p-2 shadow-sm">
                <LiveMap className="h-64" markers={[{ id: 'van', latitude: t.live.latitude, longitude: t.live.longitude, label: 'Your delivery', sub: `updated ${timeAgo(t.live.recorded_at)}`, glyph: 'truck' }]} />
                <p className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-xs text-muted-foreground"><Truck className="h-3.5 w-3.5 text-brand" />Approximate position · updated {timeAgo(t.live.recorded_at)}</p>
              </section>
            )}

            {t.proof && (
              <section className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success-soft p-4 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                <p>Received{t.proof.recipient_name ? ` by ${t.proof.recipient_name}` : ''} · {formatDateTime(t.proof.captured_at)}</p>
              </section>
            )}

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-brand" />Updates</h2>
              <ol className="relative mt-4 space-y-4 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-border">
                {t.events.map((e, i) => (
                  <motion.li key={`${e.occurred_at}-${i}`} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }} className="relative flex gap-3 pl-0">
                    <span className={cn('relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-card', i === 0 ? 'bg-brand' : 'bg-muted-foreground/40')} />
                    <div><p className={cn('text-sm', i === 0 && 'font-medium')}>{e.message}</p><p className="text-xs text-muted-foreground">{formatDateTime(e.occurred_at)}</p></div>
                  </motion.li>
                ))}
                {t.events.length === 0 && <li className="pl-6 text-sm text-muted-foreground">We’ve received your order.</li>}
              </ol>
            </section>
            {t.destination_area && <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Delivering to {t.destination_area}</p>}
          </>
        )}
        <footer className="flex items-center justify-center gap-2 pt-4 text-xs text-muted-foreground">Tracking by <Logo className="h-4" /></footer>
      </div>
    </div>
  )
}
