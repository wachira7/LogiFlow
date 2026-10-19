// src/app/(app)/distribution/shipments/[id]/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ClipboardList, Copy, Edit, Hand, History, Loader2, MapPin, Package, Phone, Route, RotateCcw, Trash2, Truck, Warehouse, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { distributionService } from '@/services/distributionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { ShipmentPill, ShipmentProgress, SHIPMENT, StopPill } from '@/components/distribution/status'
import { formatCount, formatDateTime, timeAgo } from '@/lib/format'
import type { ShipmentDetail } from '@/types/distribution.types'

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [s, setS] = useState<ShipmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)
  const [ship, setShip] = useState({ carrier: '', tracking: '', eta: '' })
  const [reasonFor, setReasonFor] = useState<'cancel' | 'return' | null>(null)
  const [reason, setReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(() => distributionService.shipment(id).then(setS).catch((err) => setError(err instanceof Error ? err.message : 'Not found')), [id])
  useEffect(() => { load() }, [load])

  const act = async (action: Parameters<typeof distributionService.shipmentAction>[1], data: Record<string, unknown> = {}) => {
    setBusy(true)
    try {
      const r = await distributionService.shipmentAction(id, action, data)
      toast.success(r.message)
      setS(r.shipment)
      setShipOpen(false); setReasonFor(null); setReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That didn’t work.')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="space-y-6"><PageHeader title="Shipment" back={{ href: '/distribution/shipments', label: 'Shipments' }} /><ErrorBanner title="Couldn’t load this shipment" message={error} /></div>
  if (!s) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>

  const preShip = ['PENDING', 'PICKED', 'PACKED'].includes(s.status)
  const next: Record<string, { label: string; icon: typeof Hand; run: () => void }> = {
    PENDING: { label: 'Mark picked', icon: Hand, run: () => act('pick') },
    PICKED: { label: 'Mark packed', icon: Package, run: () => act('pack') },
    PACKED: { label: 'Ship it', icon: Truck, run: () => { setShip({ carrier: s.carrier, tracking: s.tracking_number, eta: '' }); setShipOpen(true) } },
    SHIPPED: { label: 'Mark delivered', icon: CheckCircle2, run: () => act('deliver') },
  }
  const primary = next[s.status]

  return (
    <div className="space-y-6">
      <PageHeader icon={Truck} back={{ href: '/distribution/shipments', label: 'Shipments' }} title={s.shipment_number}
        description={<span className="flex flex-wrap items-center gap-2"><ShipmentPill status={s.status} delayed={s.is_delayed} /><span>{s.customer_name ?? s.recipient_name ?? 'Manual shipment'} · from {s.warehouse_name}</span></span>}
        actions={<>
          {preShip && <Button size="sm" variant="outline" onClick={() => router.push(`/distribution/shipments/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>}
          {['PENDING', 'CANCELLED'].includes(s.status) && <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          {preShip && <Button size="sm" variant="outline" onClick={() => setReasonFor('cancel')}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}
          {['SHIPPED', 'DELIVERED', 'FAILED'].includes(s.status) && <Button size="sm" variant="outline" onClick={() => setReasonFor('return')}><RotateCcw className="mr-2 h-4 w-4" />Record return</Button>}
          {primary && <Button size="sm" disabled={busy} onClick={primary.run} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <primary.icon className="mr-2 h-4 w-4" />}{primary.label}</Button>}
        </>} />

      {s.is_delayed && <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"><AlertTriangle className="h-5 w-5" />Past the estimated delivery time ({formatDateTime(s.estimated_delivery)}).</div>}

      {['CANCELLED', 'RETURNED'].includes(s.status) ? (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">{s.status === 'CANCELLED' ? 'This shipment was cancelled before it left; no stock moved.' : 'Returned to the warehouse; the stock was added back.'}</div>
      ) : (
        <Panel delay={0.05} bodyClassName="p-5 sm:p-6"><ShipmentProgress status={s.status} />
          {preShip && <p className="mt-4 text-center text-xs text-muted-foreground">Stock is taken from {s.warehouse_name} when you ship it.</p>}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel icon={Package} title={`Items (${formatCount(s.shipment_items.reduce((a, i) => a + i.quantity, 0))} units)`} bodyClassName="p-0" delay={0.1}>
            {s.shipment_items.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">No items listed (manual shipment).</p> : (
              <ul className="divide-y">{s.shipment_items.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-5 py-3 text-sm"><span><span className="font-medium">{i.product_name}</span><span className="block text-xs text-muted-foreground">{i.product_sku}</span></span><span className="font-semibold tabular-nums">× {formatCount(i.quantity)}</span></li>
              ))}</ul>
            )}
          </Panel>
          <Panel icon={History} title="History" delay={0.15}>
            {s.events.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : (
              <ol className="relative space-y-4 border-l pl-5">
                {s.events.map((e, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }} className="relative">
                    <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-card" />
                    <p className="text-sm font-medium">{e.to_status ? SHIPMENT[e.to_status as keyof typeof SHIPMENT]?.[0] ?? e.to_status : e.type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">{e.message}{e.actor ? ` · ${e.actor}` : ''} · {timeAgo(e.occurred_at)}</p>
                  </motion.li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel icon={MapPin} title="Delivery" delay={0.12}>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{s.recipient_name || s.customer_name || '—'}</p>
              {s.recipient_phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><a href={`tel:${s.recipient_phone}`} className="hover:text-brand">{s.recipient_phone}</a></p>}
              <p className="text-muted-foreground">{s.destination_address || 'No address'}</p>
              <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div><dt className="text-muted-foreground">Carrier</dt><dd className="font-medium">{s.carrier || s.driver_name || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Tracking</dt><dd className="flex items-center gap-1 font-medium">{s.tracking_number || '—'}{s.tracking_number && <button onClick={() => { navigator.clipboard?.writeText(s.tracking_number); toast.success('Copied') }} aria-label="Copy tracking number"><Copy className="h-3 w-3" /></button>}</dd></div>
                <div><dt className="text-muted-foreground">Shipped</dt><dd className="font-medium">{s.shipping_date ? formatDateTime(s.shipping_date) : '—'}</dd></div>
                <div><dt className="text-muted-foreground">{s.actual_delivery ? 'Delivered' : 'ETA'}</dt><dd className="font-medium">{formatDateTime(s.actual_delivery ?? s.estimated_delivery)}</dd></div>
              </dl>
            </div>
          </Panel>
          <Panel title="Linked" delay={0.18}>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Warehouse className="h-4 w-4 text-brand" />From {s.warehouse_name}</li>
              {s.order_id && <li><Link href={`/distribution/orders/${s.order_id}`} className="flex items-center gap-2 hover:text-brand"><ClipboardList className="h-4 w-4 text-brand" />Order {s.order_number}</Link></li>}
              {s.route_stop && <li><Link href={`/distribution/routes/${s.route_stop.route_id}`} className="flex items-center gap-2 hover:text-brand"><Route className="h-4 w-4 text-brand" />{s.route_stop.route_name} · stop {s.route_stop.stop_number} <StopPill status={s.route_stop.status} /></Link></li>}
            </ul>
          </Panel>
          {s.notes && <Panel title="Notes" delay={0.22}><p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.notes}</p></Panel>}
        </div>
      </div>

      <Dialog open={shipOpen} onOpenChange={(v) => !busy && setShipOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Ship {s.shipment_number}</DialogTitle><DialogDescription>The items are taken out of {s.warehouse_name}’s stock now.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="sh-carrier">Carrier or driver</Label><Input id="sh-carrier" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} placeholder="e.g. G4S, own van" /></div>
            <div className="space-y-1.5"><Label htmlFor="sh-track">Tracking number <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="sh-track" value={ship.tracking} onChange={(e) => setShip({ ...ship, tracking: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sh-eta">Expected delivery</Label><Input id="sh-eta" type="datetime-local" value={ship.eta} onChange={(e) => setShip({ ...ship, eta: e.target.value })} /></div>
            <Button disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => act('ship', { carrier: ship.carrier, tracking_number: ship.tracking, estimated_delivery: ship.eta ? new Date(ship.eta).toISOString() : '' })}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}Ship now</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!reasonFor} onOpenChange={(v) => !busy && !v && setReasonFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{reasonFor === 'cancel' ? 'Cancel shipment' : 'Record a return'}</DialogTitle>
            <DialogDescription>{reasonFor === 'cancel' ? 'It hasn’t left yet, so no stock changes. The order can be shipped again.' : `The items go back into ${s.warehouse_name}’s stock.`}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="sh-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="sh-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={reasonFor === 'return' ? 'e.g. Damaged on arrival' : ''} /></div>
            <Button disabled={busy} variant={reasonFor === 'cancel' ? 'destructive' : 'default'} className="w-full" onClick={() => act(reasonFor === 'cancel' ? 'cancel' : 'return', { reason })}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{reasonFor === 'cancel' ? 'Cancel shipment' : 'Record return'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this shipment?" description="It will be removed for good." confirmText="Delete" variant="destructive" loading={busy}
        onConfirm={async () => { try { await distributionService.deleteShipment(id); toast.success('Shipment deleted'); router.push('/distribution/shipments') } catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete.') } }} />
    </div>
  )
}
