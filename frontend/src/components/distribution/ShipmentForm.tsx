// src/components/distribution/ShipmentForm.tsx
// Manual shipments (not from an order) and editing a shipment before it leaves.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Truck } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { useWarehouses } from '@/hooks/useInventory'
import { AuthService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import type { ShipmentDetail } from '@/types/distribution.types'

type Driver = { id: string; first_name?: string; last_name?: string; email: string; role?: string; is_driver?: boolean }
const toLocal = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

export function ShipmentForm({ shipmentId }: { shipmentId?: string }) {
  const router = useRouter()
  const { warehouses = [], isLoading } = useWarehouses()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loaded, setLoaded] = useState<ShipmentDetail | null>(null)
  const [f, setF] = useState({ shipment_number: '', warehouse_id: '', driver_id: '', recipient_name: '', recipient_phone: '', destination_address: '', carrier: '', tracking_number: '', eta: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    AuthService.getCompanyUsers().then((r) => {
      const d = r.data as unknown
      const all = (Array.isArray(d) ? d : (d as { results?: Driver[] })?.results ?? []) as Driver[]
      setDrivers(all.filter((u) => u.is_driver || u.role === 'driver'))
    })
    if (shipmentId) distributionService.shipment(shipmentId).then((s) => {
      setLoaded(s)
      setF({ shipment_number: s.shipment_number, warehouse_id: s.warehouse_id, driver_id: s.driver_id ?? '', recipient_name: s.recipient_name, recipient_phone: s.recipient_phone,
        destination_address: s.destination_address, carrier: s.carrier, tracking_number: s.tracking_number, eta: toLocal(s.estimated_delivery), notes: s.notes })
    })
  }, [shipmentId])
  useEffect(() => { if (!shipmentId && !f.warehouse_id && warehouses[0]) setF((x) => ({ ...x, warehouse_id: warehouses[0].id })) }, [warehouses, shipmentId, f.warehouse_id])

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.warehouse_id) return setError('Choose the warehouse it leaves from.')
    setSaving(true)
    setError(null)
    const data = { ...f, driver_id: f.driver_id || null, estimated_delivery: f.eta ? new Date(f.eta).toISOString() : null } as Record<string, unknown>
    delete data.eta
    try {
      const saved = shipmentId ? await distributionService.updateShipment(shipmentId, data) : await distributionService.createShipment(data)
      router.push(`/distribution/shipments/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the shipment.')
      setSaving(false)
    }
  }

  const back = shipmentId ? { href: `/distribution/shipments/${shipmentId}`, label: 'Back to shipment' } : { href: '/distribution/shipments', label: 'Shipments' }
  if (isLoading || (shipmentId && !loaded)) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-96 rounded-xl" /></div>
  if (loaded && !['PENDING', 'PICKED', 'PACKED'].includes(loaded.status)) {
    return <div className="space-y-6"><PageHeader icon={Truck} title={`Edit ${loaded.shipment_number}`} back={back} /><ErrorBanner title="This shipment has left" message="Update the carrier, tracking or ETA from the shipment page." /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Truck} back={back} title={shipmentId ? `Edit ${f.shipment_number}` : 'Manual shipment'} description={shipmentId ? 'Change delivery details before it leaves.' : 'For deliveries that aren’t tied to an order. Shipments for orders are created from the order.'} />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={MapPin} title="Delivery" delay={0.05}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="s-wh">Leaves from</Label>
              <Select value={f.warehouse_id} onValueChange={(v) => set('warehouse_id', v)} disabled={!!loaded?.order_id}><SelectTrigger id="s-wh" className="w-full"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="s-driver">Driver</Label>
              <Select value={f.driver_id || 'none'} onValueChange={(v) => set('driver_id', v === 'none' ? '' : v)}><SelectTrigger id="s-driver" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No driver / external carrier</SelectItem>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{`${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || d.email}</SelectItem>)}</SelectContent></Select>
              {drivers.length === 0 && <p className="text-xs text-muted-foreground">Invite people with the Driver role to assign them.</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="s-rname">Recipient</Label><Input id="s-rname" value={f.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-rphone">Recipient phone</Label><Input id="s-rphone" inputMode="tel" value={f.recipient_phone} onChange={(e) => set('recipient_phone', e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-addr">Address</Label><Textarea id="s-addr" rows={2} value={f.destination_address} onChange={(e) => set('destination_address', e.target.value)} /></div>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Carrier" delay={0.1}>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="s-num">Shipment number <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="s-num" value={f.shipment_number} onChange={(e) => set('shipment_number', e.target.value)} placeholder="Numbered automatically" disabled={!!shipmentId} /></div>
              <div className="space-y-1.5"><Label htmlFor="s-car">Carrier</Label><Input id="s-car" value={f.carrier} onChange={(e) => set('carrier', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="s-trk">Tracking number</Label><Input id="s-trk" value={f.tracking_number} onChange={(e) => set('tracking_number', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="s-eta">Expected delivery</Label><Input id="s-eta" type="datetime-local" value={f.eta} onChange={(e) => set('eta', e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="s-notes">Notes</Label><Textarea id="s-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
              {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={saving} className="btn-shine w-full bg-brand text-brand-foreground hover:bg-brand/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{shipmentId ? 'Save changes' : 'Create shipment'}</Button>
            </div>
          </Panel>
        </div>
      </form>
    </div>
  )
}
