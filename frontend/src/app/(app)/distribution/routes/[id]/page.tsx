// src/app/(app)/distribution/routes/[id]/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, Edit, Flag, Loader2, MapPin, Navigation, Play, Plus, Route, Trash2, User, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { distributionService } from '@/services/distributionService'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { RoutePill, StopPill } from '@/components/distribution/status'
import { RouteLiveMap } from '@/components/ops/RouteLiveMap'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DeliveryRouteDetail, RouteStop, Shipment } from '@/types/distribution.types'

export default function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [r, setR] = useState<DeliveryRouteDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [candidates, setCandidates] = useState<Shipment[]>([])
  const [pick, setPick] = useState('')
  const [address, setAddress] = useState('')
  const [failing, setFailing] = useState<RouteStop | null>(null)
  const [failNote, setFailNote] = useState('')
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const load = useCallback(() => distributionService.route(id).then(setR).catch((err) => setError(err instanceof Error ? err.message : 'Not found')), [id])
  useEffect(() => { load() }, [load])

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key)
    try { await fn(); toast.success(done); await load() } catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') } finally { setBusy(null) }
  }

  const openAdd = async () => {
    setAdding(true); setPick(''); setAddress('')
    const all = await distributionService.shipments().catch(() => [] as Shipment[])
    const onRoute = new Set(r?.route_stops.map((s) => s.shipment_id))
    setCandidates(all.filter((s) => ['PENDING', 'PICKED', 'PACKED', 'SHIPPED'].includes(s.status) && !onRoute.has(s.id)))
  }

  if (error) return <div className="space-y-6"><PageHeader title="Route" back={{ href: '/distribution/routes', label: 'Routes' }} /><ErrorBanner title="Couldn’t load this route" message={error} /></div>
  if (!r) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-72 rounded-xl" /></div>

  const stops = [...r.route_stops].sort((a, b) => a.stop_number - b.stop_number)
  const done = stops.filter((s) => s.status === 'COMPLETED' || s.status === 'FAILED').length
  const open = r.status === 'PLANNED' || r.status === 'IN_PROGRESS'
  const running = r.status === 'IN_PROGRESS'
  const nextStop = stops.find((s) => s.status === 'PENDING' || s.status === 'ARRIVED')

  return (
    <div className="space-y-6">
      <PageHeader icon={Route} back={{ href: '/distribution/routes', label: 'Routes' }} title={r.route_name}
        description={<span className="flex flex-wrap items-center gap-2"><RoutePill status={r.status} /><span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{r.driver_name ?? 'No driver'}{(r.fleet_vehicle_registration || r.vehicle_id) ? ` · ${r.fleet_vehicle_registration || r.vehicle_id}` : ''}</span></span>}
        actions={<>
          {open && <Button size="sm" variant="outline" onClick={() => router.push(`/distribution/routes/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>}
          {['PLANNED', 'CANCELLED'].includes(r.status) && <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={() => setConfirm('delete')}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          {open && <Button size="sm" variant="outline" onClick={() => setConfirm('cancel')}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}
          {r.status === 'PLANNED' && <Button size="sm" disabled={!stops.length || !!busy} onClick={() => run('start', () => distributionService.routeAction(id, 'start'), 'Route started')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Play className="mr-2 h-4 w-4" />Start route</Button>}
          {running && <Button size="sm" disabled={done < stops.length || !!busy} onClick={() => run('complete', () => distributionService.routeAction(id, 'complete'), 'Route completed')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Flag className="mr-2 h-4 w-4" />Finish route</Button>}
        </>} />

      <Panel delay={0.05} bodyClassName="p-0">
        <div className="grid lg:grid-cols-5">
          <RouteLiveMap routeId={id} stops={stops} running={r.status === 'IN_PROGRESS'} className="h-72 lg:col-span-3 lg:h-96" />
          <div className="flex flex-col justify-between gap-4 p-5 lg:col-span-2">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{r.start_location ? `Starts from ${r.start_location}` : 'No start location set'}</p>
              <div>
                <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{done} of {stops.length} stops done</span><span className="text-muted-foreground">{stops.length ? Math.round((done / stops.length) * 100) : 0}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${stops.length ? (done / stops.length) * 100 : 0}%` }} transition={{ duration: 0.9 }} /></div>
              </div>
              {running && nextStop && <p className="flex items-start gap-2 rounded-lg bg-brand-soft/60 p-3 text-sm"><Navigation className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span><span className="font-medium">Next: stop {nextStop.stop_number}</span> · {nextStop.customer_name ?? nextStop.shipment_number}<span className="block text-xs text-muted-foreground">{nextStop.address}</span></span></p>}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Distance</dt><dd className="font-medium">{r.total_distance ? `${Number(r.total_distance)} km` : '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{r.end_time ? 'Took' : 'Estimated'}</dt><dd className="font-medium">{r.duration_hours != null ? `${r.duration_hours.toFixed(1)} h` : r.estimated_duration ? `${Number(r.estimated_duration)} h` : '—'}</dd></div>
            </dl>
          </div>
        </div>
      </Panel>

      <Panel icon={MapPin} title="Stops" description={open ? 'Deliver in order; finishing a stop delivers its shipment (and ships it if needed)' : undefined} bodyClassName="p-0" delay={0.1}
        action={open && <Button size="sm" variant="outline" onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" />Add stop</Button>}>
        {stops.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No stops yet. Add shipments to deliver on this route.</p> : (
          <ol className="divide-y">
            {stops.map((s, i) => (
              <motion.li key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }} className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', s.id === nextStop?.id && running && 'bg-brand-soft/30')}>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold', s.status === 'COMPLETED' ? 'bg-brand text-brand-foreground' : s.status === 'FAILED' ? 'bg-danger-soft text-danger' : 'bg-muted')}>
                  {s.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4" /> : s.status === 'FAILED' ? <X className="h-4 w-4" /> : s.stop_number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">{s.customer_name ?? s.shipment_number}<StopPill status={s.status} /></p>
                  <p className="text-sm text-muted-foreground">{s.address}</p>
                  <p className="text-xs text-muted-foreground"><Link href={`/distribution/shipments/${s.shipment_id}`} className="hover:text-brand">{s.shipment_number}</Link>{s.actual_arrival ? ` · arrived ${timeAgo(s.actual_arrival)}` : ''}{s.notes ? ` · ${s.notes}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  {running && s.status === 'PENDING' && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(s.id, () => distributionService.stopAction(s.id, 'arrive_at'), `Arrived at stop ${s.stop_number}`)}>Arrived</Button>}
                  {running && s.status === 'ARRIVED' && <Button size="sm" disabled={!!busy} className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => run(s.id, () => distributionService.stopAction(s.id, 'complete'), `Stop ${s.stop_number} delivered`)}>{busy === s.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}Delivered</Button>}
                  {running && ['PENDING', 'ARRIVED'].includes(s.status) && <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-danger" onClick={() => { setFailing(s); setFailNote('') }}>Couldn’t deliver</Button>}
                  {open && s.status === 'PENDING' && !running && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-danger" aria-label={`Remove stop ${s.stop_number}`} onClick={() => run(s.id, () => distributionService.removeStop(s.id), 'Stop removed')}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </Panel>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add a stop</DialogTitle><DialogDescription>Pick a shipment that still needs delivering. The address is placed on the map automatically.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="st-ship">Shipment</Label>
              <Select value={pick} onValueChange={(v) => { setPick(v); const sh = candidates.find((c) => c.id === v); if (sh?.destination_address) setAddress(sh.destination_address) }}>
                <SelectTrigger id="st-ship" className="w-full"><SelectValue placeholder={candidates.length ? 'Choose a shipment' : 'No shipments waiting'} /></SelectTrigger>
                <SelectContent>{candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.shipment_number} · {c.customer_name ?? c.recipient_name ?? 'manual'}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label htmlFor="st-addr">Address</Label><Textarea id="st-addr" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Building, street, town" /></div>
            <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90" disabled={!pick || !address.trim() || busy === 'add'}
              onClick={async () => { await run('add', () => distributionService.addStop(id, pick, address.trim()), 'Stop added'); setAdding(false) }}>
              {busy === 'add' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add stop</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!failing} onOpenChange={(v) => !v && setFailing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Couldn’t deliver stop {failing?.stop_number}</DialogTitle><DialogDescription>The shipment stays out for another attempt. Record what happened.</DialogDescription></DialogHeader>
          <Textarea rows={2} value={failNote} onChange={(e) => setFailNote(e.target.value)} placeholder="e.g. Gate closed, customer not reachable" aria-label="What happened" />
          <Button variant="destructive" disabled={!!busy} onClick={async () => { if (failing) { await run(failing.id, () => distributionService.stopAction(failing.id, 'fail', { notes: failNote }), 'Recorded'); setFailing(null) } }}>Record failed attempt</Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)} variant="destructive" loading={!!busy}
        title={confirm === 'delete' ? 'Delete this route?' : 'Cancel this route?'} description={confirm === 'delete' ? 'The route and its stops are removed. Shipments aren’t affected.' : 'Its stops stop counting; shipments stay as they are.'}
        confirmText={confirm === 'delete' ? 'Delete' : 'Cancel route'} cancelText="Keep it"
        onConfirm={async () => { if (confirm === 'delete') { try { await distributionService.deleteRoute(id); toast.success('Route deleted'); router.push('/distribution/routes') } catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete.') } } else { await run('cancel', () => distributionService.routeAction(id, 'cancel'), 'Route cancelled') } setConfirm(null) }} />
    </div>
  )
}
