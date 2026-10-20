// src/app/(app)/distribution/orders/[id]/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, ClipboardList, Edit, Loader2, Mail, MapPin, Package, Phone, Play, Trash2, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { distributionService } from '@/services/distributionService'
import { useWarehouses } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel } from '@/components/app/kit'
import { OrderPill, ShipmentPill } from '@/components/distribution/status'
import { formatCount, formatDay, formatMoney, timeAgo } from '@/lib/format'
import type { OrderDetail } from '@/types/distribution.types'

const STEPS = ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { warehouses = [] } = useWarehouses()
  const [o, setO] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState(false)
  const [warehouse, setWarehouse] = useState('')
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const load = useCallback(() => distributionService.order(id).then(setO).catch((err) => setError(err instanceof Error ? err.message : 'Not found')), [id])
  useEffect(() => { load() }, [load])

  const run = async (fn: () => Promise<unknown>, done: string, after?: (r: unknown) => void) => {
    setBusy(true)
    try { const r = await fn(); toast.success(done); if (after) after(r); else await load() } catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') } finally { setBusy(false); setConfirm(null) }
  }

  if (error) return <div className="space-y-6"><PageHeader title="Order" back={{ href: '/distribution/orders', label: 'Orders' }} /><ErrorBanner title="Couldn’t load this order" message={error} /></div>
  if (!o) return <div className="space-y-6"><Skeleton className="h-16 w-72" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>

  const live = o.shipments.find((s) => !['CANCELLED', 'RETURNED'].includes(s.status))
  const step = STEPS.indexOf(o.status as typeof STEPS[number])
  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} back={{ href: '/distribution/orders', label: 'Orders' }} title={o.order_number}
        description={<span className="flex flex-wrap items-center gap-2"><OrderPill status={o.status} /><span>{o.customer_name} · created {timeAgo(o.created_at)}</span></span>}
        actions={<>
          {['NEW', 'PROCESSING'].includes(o.status) && !live && <Button variant="outline" size="sm" onClick={() => router.push(`/distribution/orders/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>}
          {['NEW', 'CANCELLED'].includes(o.status) && !live && <Button variant="outline" size="sm" className="text-danger hover:text-danger" onClick={() => setConfirm('delete')}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
          {['NEW', 'PROCESSING'].includes(o.status) && <Button variant="outline" size="sm" onClick={() => setConfirm('cancel')}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>}
          {o.status === 'NEW' && <Button size="sm" disabled={busy} onClick={() => run(() => distributionService.processOrder(id), 'Order is being processed')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Play className="mr-2 h-4 w-4" />Start processing</Button>}
          {o.status === 'PROCESSING' && !live && <Button size="sm" onClick={() => { setWarehouse(warehouses[0]?.id ?? ''); setPick(true) }} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Truck className="mr-2 h-4 w-4" />Create shipment</Button>}
          {live && <Button size="sm" variant="outline" onClick={() => router.push(`/distribution/shipments/${live.id}`)}><Truck className="mr-2 h-4 w-4" />Open shipment</Button>}
        </>} />

      {o.status !== 'CANCELLED' && (
        <Panel delay={0.05}>
          <ol className="grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="space-y-1.5">
                <span className={`block h-1.5 rounded-full transition-colors duration-700 ${i <= step ? 'bg-brand' : 'bg-muted'}`} />
                <span className={i <= step ? 'font-medium' : 'text-muted-foreground'}>{['Received', 'Processing', 'Shipped', 'Delivered'][i]}</span>
              </li>
            ))}
          </ol>
          {o.status === 'PROCESSING' && live && <p className="mt-3 text-center text-xs text-muted-foreground">Shipment {live.shipment_number} is being prepared; the order counts as shipped once it leaves the warehouse.</p>}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={Package} title={`Products (${o.item_count})`} bodyClassName="p-0" delay={0.1}>
          <ul className="divide-y">
            {o.order_items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium">{i.product_name}</span><span className="text-xs text-muted-foreground">{i.product_sku} · {formatCount(i.quantity)} × {formatMoney(i.unit_price)}</span></span>
                <span className="font-medium tabular-nums">{formatMoney(i.total_price)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t bg-muted/30 px-5 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><dt>Products</dt><dd className="tabular-nums">{formatMoney(o.order_items.reduce((s, i) => s + Number(i.total_price), 0))}</dd></div>
            {Number(o.tax_amount) > 0 && <div className="flex justify-between text-muted-foreground"><dt>Tax</dt><dd className="tabular-nums">{formatMoney(o.tax_amount)}</dd></div>}
            {Number(o.shipping_amount) > 0 && <div className="flex justify-between text-muted-foreground"><dt>Delivery</dt><dd className="tabular-nums">{formatMoney(o.shipping_amount)}</dd></div>}
            {Number(o.discount_amount) > 0 && <div className="flex justify-between text-muted-foreground"><dt>Discount</dt><dd className="tabular-nums">−{formatMoney(o.discount_amount)}</dd></div>}
            <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(o.total_amount)}</dd></div>
          </dl>
        </Panel>
        <div className="space-y-6">
          <Panel title="Customer" delay={0.15}>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{o.customer_name}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><a href={`mailto:${o.customer_email}`} className="hover:text-brand">{o.customer_email}</a></p>
              {o.customer_phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><a href={`tel:${o.customer_phone}`} className="hover:text-brand">{o.customer_phone}</a></p>}
              <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{o.shipping_address}</p>
            </div>
          </Panel>
          <Panel icon={Truck} title="Shipments" bodyClassName="p-0" delay={0.2}>
            {o.shipments.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">{o.status === 'NEW' ? 'Start processing, then create the shipment.' : 'No shipment yet.'}</p> : (
              <ul className="divide-y">{o.shipments.map((s) => (
                <li key={s.id}><Link href={`/distribution/shipments/${s.id}`} className="flex items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-muted/40">
                  <span><span className="font-medium">{s.shipment_number}</span><span className="block text-xs text-muted-foreground">From {s.warehouse_name}{s.actual_delivery ? ` · delivered ${formatDay(s.actual_delivery)}` : ''}</span></span>
                  <span className="flex items-center gap-1.5"><ShipmentPill status={s.status} /><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></span>
                </Link></li>
              ))}</ul>
            )}
          </Panel>
          {o.notes && <Panel title="Notes" delay={0.25}><p className="whitespace-pre-wrap text-sm text-muted-foreground">{o.notes}</p></Panel>}
        </div>
      </div>

      <Dialog open={pick} onOpenChange={(v) => !busy && setPick(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create the shipment</DialogTitle><DialogDescription>Choose where it ships from. Stock is taken from that warehouse when the shipment leaves.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="ship-wh">Warehouse</Label>
            <Select value={warehouse} onValueChange={setWarehouse}><SelectTrigger id="ship-wh" className="w-full"><SelectValue placeholder="Choose a warehouse" /></SelectTrigger>
              <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <Button disabled={!warehouse || busy} className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => run(() => distributionService.createShipmentForOrder(id, warehouse), 'Shipment created', (r) => router.push(`/distribution/shipments/${(r as { shipment_id: string }).shipment_id}`))}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Create shipment
          </Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)} loading={busy} variant="destructive"
        title={confirm === 'delete' ? 'Delete this order?' : 'Cancel this order?'}
        description={confirm === 'delete' ? 'It will be removed for good.' : 'Any shipment still in the warehouse is cancelled too. Nothing has left stock yet.'}
        confirmText={confirm === 'delete' ? 'Delete' : 'Cancel order'} cancelText="Keep it"
        onConfirm={async () => { if (confirm === 'delete') await run(() => distributionService.deleteOrder(id), 'Order deleted', () => router.push('/distribution/orders')); else await run(() => distributionService.cancelOrder(id), 'Order cancelled') }} />
    </div>
  )
}
