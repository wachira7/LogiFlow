// src/app/(app)/driver/page.tsx
// The driver's phone view: today's route, one stop at a time, with proof of delivery.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Camera, CheckCircle2, ChevronDown, Flag, Loader2, LocateFixed, MapPin, Navigation, Package, Phone, Play, Radio, Route, Smartphone, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { distributionService } from '@/services/distributionService'
import { opsService, type DriverDay, type DriverStop } from '@/services/opsService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, StatusPill } from '@/components/app/kit'
import { ease } from '@/components/app/motion'
import { SignaturePad } from '@/components/ops/SignaturePad'
import { useLocationSharing } from '@/components/ops/useLocationSharing'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'

const FAIL_REASONS = [['CUSTOMER_UNAVAILABLE', 'Nobody to receive it'], ['ADDRESS_ISSUE', 'Couldn’t find the address'], ['DAMAGED', 'Goods damaged'], ['FAILED_DELIVERY', 'Other reason']] as const

const navUrl = (s: DriverStop) => s.latitude != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`
  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`

function here(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({})
    navigator.geolocation.getCurrentPosition((p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => resolve({}), { timeout: 8000, maximumAge: 60000 })
  })
}

function DeliverSheet({ stop, onClose, onDone }: { stop: DriverStop | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (stop) { setName(stop.shipment.recipient); setSignature(null); setPhoto(null); setError(null) } }, [stop])
  const onSign = useCallback((v: string | null) => setSignature(v), [])

  const submit = async () => {
    if (!stop) return
    if (!name.trim() && !signature && !photo) return setError('Add who received it, a signature or a photo.')
    setBusy(true); setError(null)
    try {
      const pos = await here()
      await opsService.captureProof(stop.shipment.id, { recipient_name: name.trim(), signature: signature ?? undefined, stop_id: stop.id, ...pos }, photo)
      await distributionService.stopAction(stop.id, 'complete')
      toast.success(`Stop ${stop.number} delivered`)
      onDone(); onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t save the delivery.') } finally { setBusy(false) }
  }

  return (
    <Sheet open={!!stop} onOpenChange={(v) => !v && !busy && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader><SheetTitle>Proof of delivery</SheetTitle><SheetDescription>Stop {stop?.number} · {stop?.shipment.number}</SheetDescription></SheetHeader>
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-6">
          <div className="space-y-1.5"><Label htmlFor="pod-name">Received by</Label><Input id="pod-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of the person" autoComplete="off" /></div>
          <div className="space-y-1.5"><Label>Signature</Label><SignaturePad onChange={onSign} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="pod-photo">Photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <label htmlFor="pod-photo" className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-sm hover:bg-muted/40">
              <Camera className="h-5 w-5 text-brand" /><span className="truncate">{photo ? photo.name : 'Take a photo of the goods at the door'}</span>
            </label>
            <input id="pod-photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button onClick={submit} disabled={busy} className="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90">{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}Confirm delivery</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FailSheet({ stop, onClose, onDone }: { stop: DriverStop | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<string>('CUSTOMER_UNAVAILABLE')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (stop) { setReason('CUSTOMER_UNAVAILABLE'); setNotes('') } }, [stop])
  const submit = async () => {
    if (!stop) return
    setBusy(true)
    try {
      await distributionService.stopAction(stop.id, 'fail', { reason, notes })
      toast.success('Recorded. The office has been alerted.')
      onDone(); onClose()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t record it.') } finally { setBusy(false) }
  }
  return (
    <Sheet open={!!stop} onOpenChange={(v) => !v && !busy && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader><SheetTitle>Couldn’t deliver</SheetTitle><SheetDescription>Stop {stop?.number}. This raises an exception for the office to follow up.</SheetDescription></SheetHeader>
        <div className="mx-auto w-full max-w-lg space-y-3 px-4 pb-6">
          <div className="grid gap-2" role="radiogroup" aria-label="Reason">
            {FAIL_REASONS.map(([k, l]) => (
              <button key={k} role="radio" aria-checked={reason === k} onClick={() => setReason(k)}
                className={cn('rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors', reason === k ? 'border-brand bg-brand-soft text-brand' : 'hover:bg-muted/40')}>{l}</button>
            ))}
          </div>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the office should know" aria-label="Notes" />
          <Button onClick={submit} disabled={busy} variant="destructive" className="h-12 w-full text-base">{busy && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Mark as not delivered</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function DriverPage() {
  const reduce = useReducedMotion()
  const [day, setDay] = useState<DriverDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [deliver, setDeliver] = useState<DriverStop | null>(null)
  const [fail, setFail] = useState<DriverStop | null>(null)
  const [openDone, setOpenDone] = useState(false)
  const sharing = useLocationSharing()

  const load = useCallback(() => opsService.driverToday().then((d) => { setDay(d); setError(null) }).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load your route.')), [])
  useEffect(() => { load() }, [load])

  const route = day?.route
  // Share location automatically once the route is running (the browser asks for permission once)
  const { state: shareState, start: startSharing } = sharing
  useEffect(() => { if (route?.status === 'IN_PROGRESS' && shareState === 'off') startSharing() }, [route?.status, shareState, startSharing])

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key)
    try { await fn(); toast.success(done); await load() } catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') } finally { setBusy(null) }
  }

  if (error && !day) return <div className="space-y-6"><PageHeader icon={Smartphone} title="My route" /><ErrorBanner message={error} onRetry={load} /></div>
  if (!day) return <div className="mx-auto max-w-xl space-y-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div>
  if (!route) return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader icon={Smartphone} title="My route" description="Your deliveries for the day show up here." />
      <EmptyState icon={<Route />} title="No route assigned" description="When the office assigns you a route, it appears here with every stop in order." />
    </div>
  )

  const stops = day.stops
  const active = stops.filter((s) => s.status === 'PENDING' || s.status === 'ARRIVED')
  const current = active[0]
  const finished = stops.filter((s) => s.status === 'COMPLETED' || s.status === 'FAILED')
  const pct = stops.length ? Math.round((finished.length / stops.length) * 100) : 0
  const share = {
    on: { text: `Sharing location${sharing.lastSent ? ` · sent ${timeAgo(sharing.lastSent.toISOString())}` : ''}`, cls: 'bg-success-soft text-success' },
    starting: { text: 'Finding your position…', cls: 'bg-info-soft text-info' },
    denied: { text: 'Location blocked. Allow it in your browser settings so the office and customers can follow the delivery.', cls: 'bg-warning-soft text-warning' },
    unsupported: { text: 'This device can’t share location.', cls: 'bg-muted text-muted-foreground' },
    error: { text: 'Can’t get a GPS fix right now. It will keep trying.', cls: 'bg-warning-soft text-warning' },
    off: { text: 'Location sharing is off', cls: 'bg-muted text-muted-foreground' },
  }[sharing.state]

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-10">
      <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
        className="overflow-hidden rounded-2xl border bg-gradient-to-br from-brand to-brand/80 p-5 text-brand-foreground shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs uppercase tracking-wider opacity-80">{route.status === 'IN_PROGRESS' ? 'On the road' : 'Ready to start'}</p>
            <h1 className="truncate text-2xl font-bold">{route.name}</h1>
            <p className="mt-0.5 text-sm opacity-90">{[route.vehicle, route.start_location && `from ${route.start_location}`].filter(Boolean).join(' · ') || `${stops.length} stops`}</p></div>
          <div className="text-right"><p className="text-3xl font-bold tabular-nums">{finished.length}<span className="text-lg opacity-70">/{stops.length}</span></p><p className="text-xs opacity-80">stops done</p></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease }} /></div>
        {route.status === 'PLANNED' && (
          <Button onClick={() => run('start', () => distributionService.routeAction(route.id, 'start'), 'Route started. Drive safe!')} disabled={!!busy || stops.length === 0}
            className="mt-4 h-12 w-full bg-white text-base font-semibold text-brand hover:bg-white/90">{busy === 'start' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}Start route</Button>
        )}
      </motion.section>

      {route.status === 'IN_PROGRESS' && (
        <div className={cn('flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm', share.cls)}>
          <span className="flex items-center gap-2">{sharing.state === 'on' ? <Radio className="h-4 w-4 animate-pulse motion-reduce:animate-none" /> : <LocateFixed className="h-4 w-4" />}{share.text}</span>
          {sharing.state === 'on' ? <button onClick={sharing.stop} className="text-xs font-medium underline">Pause</button>
            : ['off', 'error'].includes(sharing.state) ? <button onClick={sharing.start} className="text-xs font-medium underline">Turn on</button> : null}
        </div>
      )}
      {route.notes && <p className="rounded-xl border bg-card px-4 py-3 text-sm"><span className="font-medium">From the office: </span>{route.notes}</p>}

      <AnimatePresence mode="popLayout">
        {current ? (
          <motion.section key={current.id} layout={!reduce} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease }} className="rounded-2xl border-2 border-brand bg-card p-5 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-brand"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs text-brand-foreground">{current.number}</span>{current.status === 'ARRIVED' ? 'You’re here' : 'Next stop'}</span>
              <StatusPill tone={current.status === 'ARRIVED' ? 'info' : 'neutral'} pulse={current.status === 'ARRIVED'}>{current.status === 'ARRIVED' ? 'Arrived' : `${active.length} to go`}</StatusPill>
            </div>
            <p className="mt-3 text-xl font-semibold leading-snug">{current.shipment.recipient || 'Recipient'}</p>
            <p className="mt-1 flex items-start gap-1.5 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{current.address}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm"><Package className="h-4 w-4 text-brand" />{current.shipment.items} items · <span className="font-mono text-xs">{current.shipment.number}</span></p>
            {(current.notes || current.shipment.notes) && <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-sm">{current.notes || current.shipment.notes}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" asChild><a href={navUrl(current)} target="_blank" rel="noreferrer"><Navigation className="mr-2 h-4 w-4" />Navigate</a></Button>
              <Button variant="outline" className="h-11" disabled={!current.shipment.phone} asChild={!!current.shipment.phone}>
                {current.shipment.phone ? <a href={`tel:${current.shipment.phone}`}><Phone className="mr-2 h-4 w-4" />Call</a> : <span><Phone className="mr-2 h-4 w-4" />No phone</span>}
              </Button>
            </div>
            {route.status === 'IN_PROGRESS' && (current.status === 'PENDING' ? (
              <Button onClick={() => run(`arrive-${current.id}`, () => distributionService.stopAction(current.id, 'arrive_at'), 'Arrival recorded')} disabled={!!busy}
                className="mt-3 h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90">{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MapPin className="mr-2 h-5 w-5" />}I’ve arrived</Button>
            ) : (
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <Button onClick={() => setDeliver(current)} className="h-12 bg-brand text-base text-brand-foreground hover:bg-brand/90"><CheckCircle2 className="mr-2 h-5 w-5" />Deliver</Button>
                <Button onClick={() => setFail(current)} variant="outline" className="h-12 text-danger hover:text-danger" aria-label="Couldn’t deliver"><XCircle className="h-5 w-5" /></Button>
              </div>
            ))}
          </motion.section>
        ) : stops.length > 0 && (
          <motion.section key="done" initial={reduce ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <p className="mt-2 text-lg font-semibold">All stops done</p>
            <p className="text-sm text-muted-foreground">{finished.filter((s) => s.status === 'COMPLETED').length} delivered{finished.some((s) => s.status === 'FAILED') ? `, ${finished.filter((s) => s.status === 'FAILED').length} not delivered` : ''}.</p>
            {route.status === 'IN_PROGRESS' && <Button onClick={() => run('finish', async () => { await distributionService.routeAction(route.id, 'complete'); sharing.stop() }, 'Route finished. Great work!')} disabled={!!busy}
              className="mt-4 h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90">{busy === 'finish' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Flag className="mr-2 h-5 w-5" />}Finish route</Button>}
          </motion.section>
        )}
      </AnimatePresence>

      {active.length > 1 && (
        <section className="rounded-2xl border bg-card">
          <p className="border-b px-4 py-2.5 text-sm font-semibold">Coming up</p>
          <ol className="divide-y">
            {active.slice(1).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{s.number}</span>
                <div className="min-w-0"><p className="truncate font-medium">{s.shipment.recipient || s.shipment.number}</p><p className="truncate text-xs text-muted-foreground">{s.address}</p></div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {finished.length > 0 && (
        <section className="rounded-2xl border bg-card">
          <button onClick={() => setOpenDone((v) => !v)} className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold" aria-expanded={openDone}>
            Done ({finished.length})<ChevronDown className={cn('h-4 w-4 transition-transform', openDone && 'rotate-180')} />
          </button>
          {openDone && (
            <ol className="divide-y border-t">
              {finished.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  {s.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <XCircle className="h-5 w-5 shrink-0 text-danger" />}
                  <div className="min-w-0"><p className="truncate font-medium">{s.shipment.recipient || s.shipment.number}</p><p className="truncate text-xs text-muted-foreground">{s.status === 'COMPLETED' ? `Delivered ${timeAgo(s.departure_time)}` : 'Not delivered'}</p></div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      {day.upcoming > 0 && <p className="text-center text-xs text-muted-foreground">{day.upcoming} more {day.upcoming === 1 ? 'route' : 'routes'} planned after this one.</p>}

      <DeliverSheet stop={deliver} onClose={() => setDeliver(null)} onDone={load} />
      <FailSheet stop={fail} onClose={() => setFail(null)} onDone={load} />
    </div>
  )
}
