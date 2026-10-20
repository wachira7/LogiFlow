// src/components/distribution/RouteForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Route } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { AuthService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, Panel } from '@/components/app/kit'

type Driver = { id: string; first_name?: string; last_name?: string; email: string; role?: string; is_driver?: boolean }

export function RouteForm({ routeId }: { routeId?: string }) {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(!!routeId)
  const [f, setF] = useState({ route_name: '', driver_id: '', vehicle_id: '', start_location: '', total_distance: '', estimated_duration: '', description: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    AuthService.getCompanyUsers().then((r) => {
      const d = r.data as unknown
      setDrivers(((Array.isArray(d) ? d : (d as { results?: Driver[] })?.results ?? []) as Driver[]).filter((u) => u.is_driver || u.role === 'driver'))
    })
    if (routeId) distributionService.route(routeId).then((r) => setF({
      route_name: r.route_name, driver_id: r.driver_id ?? '', vehicle_id: r.vehicle_id, start_location: r.start_location,
      total_distance: r.total_distance ?? '', estimated_duration: r.estimated_duration ?? '', description: r.description, notes: r.notes,
    })).finally(() => setLoading(false))
  }, [routeId])

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.route_name.trim()) return setError('Name the route, e.g. “Westlands Tuesday run”.')
    setSaving(true)
    setError(null)
    const data = { ...f, route_name: f.route_name.trim(), driver_id: f.driver_id || null, total_distance: f.total_distance || null, estimated_duration: f.estimated_duration || null }
    try {
      const saved = routeId ? await distributionService.updateRoute(routeId, data) : await distributionService.createRoute(data)
      router.push(`/distribution/routes/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the route.')
      setSaving(false)
    }
  }

  const back = routeId ? { href: `/distribution/routes/${routeId}`, label: 'Back to route' } : { href: '/distribution/routes', label: 'Routes' }
  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-80 rounded-xl" /></div>
  return (
    <div className="space-y-6">
      <PageHeader icon={Route} back={back} title={routeId ? `Edit ${f.route_name}` : 'New route'} description="Add stops after saving; each stop delivers a shipment." />
      <form onSubmit={submit} noValidate>
        <Panel delay={0.05}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-name">Route name</Label><Input id="r-name" value={f.route_name} onChange={(e) => set('route_name', e.target.value)} placeholder="Westlands Tuesday run" /></div>
            <div className="space-y-1.5"><Label htmlFor="r-driver">Driver</Label>
              <Select value={f.driver_id || 'none'} onValueChange={(v) => set('driver_id', v === 'none' ? '' : v)}><SelectTrigger id="r-driver" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Assign later</SelectItem>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || d.email}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="r-veh">Vehicle</Label><Input id="r-veh" value={f.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} placeholder="KCD 214T" /></div>
            <div className="space-y-1.5"><Label htmlFor="r-start">Starts from</Label><Input id="r-start" value={f.start_location} onChange={(e) => set('start_location', e.target.value)} placeholder="Nairobi Central warehouse" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="r-km">Distance (km)</Label><Input id="r-km" type="number" min={0} step="0.1" value={f.total_distance} onChange={(e) => set('total_distance', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="r-hrs">Est. hours</Label><Input id="r-hrs" type="number" min={0} step="0.25" value={f.estimated_duration} onChange={(e) => set('estimated_duration', e.target.value)} /></div>
            </div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-notes">Notes for the driver</Label><Textarea id="r-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => router.push(back.href)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{routeId ? 'Save changes' : 'Create route'}</Button>
          </div>
        </Panel>
      </form>
    </div>
  )
}
