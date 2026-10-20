// src/app/(app)/ops/fleet/page.tsx
// Fleet: where every vehicle and driver is right now, and the vehicle register.
'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Car, Gauge, Loader2, MapPin, Pencil, Plus, Radio, RefreshCw, Trash2, Truck, User, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { opsService, type FleetLive, type Vehicle, type VehicleStatus, type VehicleType } from '@/services/opsService'
import { teamService, type Member } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, FilterChips, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn, MotionRow } from '@/components/app/motion'
import { LiveMap, type MapMarker } from '@/components/ops/LiveMap'
import { VEHICLE_STATUS, VEHICLE_TYPES, VehiclePill, age, minutesSince } from '@/components/ops/status'
import { cn } from '@/lib/utils'
import { useLiveRefresh, useRealtime, useRealtimeStatus } from '@/lib/realtime'
import { timeAgo } from '@/lib/format'

type Unit = { id: string; kind: 'vehicle' | 'driver'; title: string; sub: string; status?: VehicleStatus; route: FleetLive['drivers'][number]['route']; ping: FleetLive['drivers'][number]['last_ping']; href?: string }
const EMPTY = { registration: '', name: '', vehicle_type: 'VAN' as VehicleType, status: 'AVAILABLE' as VehicleStatus, capacity_kg: '', capacity_m3: '', default_driver_id: '', notes: '' }

function VehicleDialog({ vehicle, open, onOpenChange, drivers, onSaved }: { vehicle: Vehicle | null; open: boolean; onOpenChange: (v: boolean) => void; drivers: Member[]; onSaved: () => void }) {
  const [f, setF] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setError(null)
    setF(vehicle ? { registration: vehicle.registration, name: vehicle.name, vehicle_type: vehicle.vehicle_type, status: vehicle.status, capacity_kg: vehicle.capacity_kg ?? '',
      capacity_m3: vehicle.capacity_m3 ?? '', default_driver_id: vehicle.default_driver_id ?? '', notes: vehicle.notes } : EMPTY)
  }, [open, vehicle])
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((x) => ({ ...x, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.registration.trim()) return setError('Enter the number plate.')
    setBusy(true); setError(null)
    const data = { ...f, capacity_kg: f.capacity_kg || null, capacity_m3: f.capacity_m3 || null, default_driver_id: f.default_driver_id || null }
    try {
      if (vehicle) await opsService.updateVehicle(vehicle.id, data); else await opsService.createVehicle(data)
      toast.success(vehicle ? 'Vehicle saved' : `${f.registration.toUpperCase()} added to the fleet`)
      onSaved(); onOpenChange(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t save the vehicle.') } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{vehicle ? `Edit ${vehicle.registration}` : 'Add a vehicle'}</DialogTitle>
          <DialogDescription>Vehicles are assigned to routes and shipments; their position comes from the driver’s phone.</DialogDescription></DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="v-reg">Number plate</Label><Input id="v-reg" value={f.registration} onChange={(e) => set('registration', e.target.value)} placeholder="KCD 214T" className="font-mono uppercase" autoFocus /></div>
          <div className="space-y-1.5"><Label htmlFor="v-name">Nickname</Label><Input id="v-name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Cold van 2" /></div>
          <div className="space-y-1.5"><Label htmlFor="v-type">Type</Label>
            <Select value={f.vehicle_type} onValueChange={(v) => set('vehicle_type', v as VehicleType)}><SelectTrigger id="v-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="v-status">Status</Label>
            <Select value={f.status} onValueChange={(v) => set('status', v as VehicleStatus)}><SelectTrigger id="v-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(VEHICLE_STATUS) as VehicleStatus[]).map((k) => <SelectItem key={k} value={k} disabled={k === 'IN_USE' && f.status !== 'IN_USE'}>{VEHICLE_STATUS[k].label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="v-kg">Payload (kg)</Label><Input id="v-kg" type="number" min={0} value={f.capacity_kg} onChange={(e) => set('capacity_kg', e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="v-m3">Volume (m³)</Label><Input id="v-m3" type="number" min={0} step="0.1" value={f.capacity_m3} onChange={(e) => set('capacity_m3', e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="v-driver">Usual driver</Label>
            <Select value={f.default_driver_id || 'none'} onValueChange={(v) => set('default_driver_id', v === 'none' ? '' : v)}><SelectTrigger id="v-driver" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nobody in particular</SelectItem>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="v-notes">Notes</Label><Textarea id="v-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Insurance renewal, service due…" /></div>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{vehicle ? 'Save' : 'Add vehicle'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FleetContent() {
  const params = useSearchParams()
  const [tab, setTab] = useState<'live' | 'vehicles'>(params.get('tab') === 'vehicles' ? 'vehicles' : 'live')
  const [live, setLive] = useState<FleetLive | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(params.get('vehicle'))
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [dialog, setDialog] = useState(false)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)
  const [busy, setBusy] = useState(false)
  const status = useRealtimeStatus()

  const load = useCallback(() => {
    Promise.all([opsService.fleetLive(), opsService.vehicles()]).then(([l, v]) => { setLive(l); setVehicles(v); setError(null) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load the fleet.'))
  }, [])
  useEffect(() => {
    load()
    teamService.members().then((m) => setMembers(m.filter((x) => x.is_active))).catch(() => {})
    const t = setInterval(() => document.visibilityState === 'visible' && status !== 'live' && opsService.fleetLive().then(setLive).catch(() => {}), 20000)
    return () => clearInterval(t)
  }, [load, status])
  useLiveRefresh(['fleet.vehicle', 'route.updated'], load)
  useRealtime('fleet.position', (m) => {
    const p = m.data as { driver_id: string; vehicle_id: string | null; latitude: number; longitude: number; speed_kmh: number | null; heading: number | null; recorded_at: string }
    const ping = { latitude: p.latitude, longitude: p.longitude, speed_kmh: p.speed_kmh, heading: p.heading, recorded_at: p.recorded_at, live: true }
    setLive((l) => l && {
      ...l, generated_at: new Date().toISOString(),
      vehicles: l.vehicles.map((v) => (v.id === p.vehicle_id ? { ...v, last_ping: ping } : v)),
      drivers: l.drivers.map((d) => (d.id === p.driver_id ? { ...d, last_ping: ping } : d)),
    })
  })

  // One entry per thing on the road: vehicles, plus drivers sharing location without a vehicle
  const units: Unit[] = useMemo(() => {
    if (!live) return []
    const onVehicles = new Set(live.vehicles.map((v) => v.driver?.id).filter(Boolean))
    return [
      ...live.vehicles.map((v): Unit => ({ id: v.id, kind: 'vehicle', title: v.registration, sub: [v.name || v.type_label, v.driver?.name].filter(Boolean).join(' · '), status: v.status, route: v.route, ping: v.last_ping })),
      ...live.drivers.filter((d) => !onVehicles.has(d.id) && (d.last_ping || d.route)).map((d): Unit => ({ id: d.id, kind: 'driver', title: d.name, sub: d.phone || 'Driver', route: d.route, ping: d.last_ping })),
    ]
  }, [live])
  const markers: MapMarker[] = units.filter((u) => u.ping).map((u) => ({
    id: u.id, latitude: u.ping!.latitude, longitude: u.ping!.longitude, label: u.title, sub: timeAgo(u.ping!.recorded_at), heading: u.ping!.heading, stale: !u.ping!.live,
  }))
  const focused = units.find((u) => u.id === focusId)
  const focus = focused?.ping ? [focused.ping.latitude, focused.ping.longitude] as [number, number] : null
  const liveCount = units.filter((u) => u.ping?.live).length

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try { await opsService.deleteVehicle(deleting.id); toast.success('Vehicle deleted'); load() } catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete it.') }
    finally { setBusy(false); setDeleting(null) }
  }
  const counts = (s: VehicleStatus) => (vehicles ?? []).filter((v) => v.status === s).length

  return (
    <div className="space-y-6">
      <PageHeader icon={Truck} title="Fleet" description="Where your vehicles and drivers are, and what they’re doing."
        actions={<>
          <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button onClick={() => { setEditing(null); setDialog(true) }} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Add vehicle</Button>
        </>} />
      {error && <ErrorBanner title="Couldn’t load the fleet" message={error} onRetry={load} />}
      {!vehicles ? <StatGridSkeleton count={4} /> : (
        <StatGrid>
          <StatCard label="Live now" value={liveCount} icon={Radio} tone="brand" hint="Sharing GPS in the last 15 min" />
          <StatCard label="On a route" value={counts('IN_USE')} icon={Truck} tone="info" />
          <StatCard label="Available" value={counts('AVAILABLE')} icon={Car} tone="success" />
          <StatCard label="In maintenance" value={counts('MAINTENANCE')} icon={Wrench} tone={counts('MAINTENANCE') ? 'warning' : 'neutral'} />
        </StatGrid>
      )}
      <FadeIn delay={0.05}><FilterChips id="fleet" options={[['live', 'Live map'], ['vehicles', 'Vehicles']] as const} value={tab} onChange={setTab} /></FadeIn>

      {tab === 'live' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2" bodyClassName="p-2" delay={0.1}>
            <LiveMap markers={markers} focus={focus} onSelect={setFocusId} className="h-[26rem] lg:h-[34rem]" />
          </Panel>
          <Panel title="On the road" description={live ? `Updated ${timeAgo(live.generated_at)}` : undefined} bodyClassName="p-0" delay={0.15}>
            {!live ? <div className="p-4"><TableSkeleton rows={4} cols={2} /></div> : units.length === 0 ? (
              <div className="space-y-3 px-5 py-8 text-center text-sm text-muted-foreground">
                <p>No vehicles or drivers yet.</p>
                <p>Add vehicles, then drivers share their location from the <Link href="/driver" className="font-medium text-brand hover:underline">driver app</Link> while a route is running.</p>
              </div>
            ) : (
              <AppStagger className="max-h-[34rem] divide-y overflow-y-auto">
                {units.map((u) => {
                  const seen = minutesSince(u.ping?.recorded_at)
                  return (
                    <AppStaggerItem key={u.id}>
                      <button onClick={() => setFocusId(u.id)} className={cn('w-full px-4 py-3 text-left transition-colors hover:bg-muted/40', focusId === u.id && 'bg-brand-soft/50')}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 font-medium">{u.kind === 'vehicle' ? <Truck className="h-4 w-4 text-brand" /> : <User className="h-4 w-4 text-brand" />}<span className={u.kind === 'vehicle' ? 'font-mono' : ''}>{u.title}</span></p>
                          {u.status ? <VehiclePill status={u.status} /> : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{u.sub}</p>
                        {u.route && <p className="mt-1.5 flex items-center gap-1 truncate text-xs"><MapPin className="h-3 w-3 text-brand" />{u.route.name} · {u.route.done}/{u.route.total}{u.route.next_stop ? ` · next ${u.route.next_stop.address}` : ''}</p>}
                        <p className={cn('mt-1 flex items-center gap-1 text-xs', u.ping?.live ? 'text-success' : 'text-muted-foreground')}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', u.ping?.live ? 'bg-success' : 'bg-muted-foreground/50')} />
                          {seen == null ? 'No position yet' : u.ping?.live ? `Live${u.ping.speed_kmh ? ` · ${Math.round(u.ping.speed_kmh)} km/h` : ''}` : `Last seen ${age(seen)} ago`}
                        </p>
                      </button>
                    </AppStaggerItem>
                  )
                })}
              </AppStagger>
            )}
          </Panel>
        </div>
      ) : !vehicles ? <TableSkeleton rows={4} cols={5} /> : vehicles.length === 0 ? (
        <EmptyState icon={<Truck />} title="No vehicles yet" description="Add your vans, trucks and bikes to assign them to routes and see them on the map."
          action={<Button onClick={() => { setEditing(null); setDialog(true) }} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />Add vehicle</Button>} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium sm:px-5">Vehicle</th><th className="px-3 py-3 font-medium">Status</th><th className="hidden px-3 py-3 font-medium md:table-cell">Capacity</th><th className="hidden px-3 py-3 font-medium sm:table-cell">Usual driver</th><th className="px-4 py-3 sm:px-5"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y">
                {vehicles.map((v, i) => (
                  <MotionRow key={v.id} index={i} className={v.status === 'INACTIVE' ? 'opacity-60' : ''}>
                    <td className="px-4 py-3 sm:px-5"><p className="font-mono font-medium">{v.registration}</p><p className="text-xs text-muted-foreground">{[v.name, v.type_label].filter(Boolean).join(' · ')}</p></td>
                    <td className="px-3 py-3"><VehiclePill status={v.status} /></td>
                    <td className="hidden px-3 py-3 text-muted-foreground md:table-cell"><span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />{[v.capacity_kg && `${Number(v.capacity_kg)} kg`, v.capacity_m3 && `${Number(v.capacity_m3)} m³`].filter(Boolean).join(' · ') || '—'}</span></td>
                    <td className="hidden px-3 py-3 sm:table-cell">{v.default_driver_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                      <Button size="icon" variant="ghost" aria-label={`Edit ${v.registration}`} onClick={() => { setEditing(v); setDialog(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-danger hover:text-danger" aria-label={`Delete ${v.registration}`} onClick={() => setDeleting(v)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}

      <VehicleDialog vehicle={editing} open={dialog} onOpenChange={setDialog} drivers={members} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)} loading={busy} variant="destructive" title={`Delete ${deleting?.registration}?`}
        description="Vehicles with delivery history can’t be deleted; set them to inactive instead." confirmText="Delete" cancelText="Keep it" onConfirm={remove} />
    </div>
  )
}

export default function FleetPage() {
  return <Suspense fallback={<TableSkeleton rows={4} cols={4} />}><FleetContent /></Suspense>
}
