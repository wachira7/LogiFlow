// src/app/(app)/inventory/inventory-items/[id]/page.tsx
// One product in one warehouse: quantity, bin, adjustments and its own movement ledger.
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, ArrowDownToLine, Boxes, CalendarCheck, Check, History, MapPin, Pencil, SlidersHorizontal, Trash2, Wallet, X } from 'lucide-react'
import { stockService, type Movement, type StockLine } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid } from '@/components/app/kit'
import { AdjustStockDialog, type AdjustTarget } from '@/components/inventory/AdjustStockDialog'
import { MovementFeed, StockMeter, StockPill } from '@/components/inventory/status'
import { formatCount, formatDateTime, formatMoney, timeAgo, toNumber } from '@/lib/format'

function StockLineDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const params = useSearchParams()
  const [line, setLine] = useState<StockLine | null>(null)
  const [moves, setMoves] = useState<Movement[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adjust, setAdjust] = useState<AdjustTarget | null>(null)
  const [bin, setBin] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const l = await stockService.line(id)
      setLine(l); setError(null)
      const m = await stockService.movements({ product: l.product_id, warehouse: l.warehouse_id, page_size: 25 })
      setMoves(m.results)
      return l
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t load this stock line.') }
  }, [id])

  const target = (l: StockLine): AdjustTarget => ({ productId: l.product_id, productName: l.product_name, warehouseId: l.warehouse_id, warehouseName: l.warehouse_name, quantity: l.quantity, unit: l.unit_of_measure })
  useEffect(() => { load().then((l) => { if (l && params.get('adjust')) setAdjust(target(l)) }) }, [load, params])

  const saveBin = async () => {
    if (bin === null || !line) return
    try { await stockService.updateLine(id, { location: bin.trim() }); toast.success('Bin location saved'); setBin(null); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t save the bin.') }
  }
  const remove = async () => {
    setBusy(true)
    try { await stockService.deleteLine(id); toast.success('Stock line removed'); router.push('/inventory/inventory-items') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t remove it.'); setConfirm(false) }
    finally { setBusy(false) }
  }

  const back = { href: '/inventory/inventory-items', label: 'Stock levels' }
  if (error && !line) return <div className="space-y-6"><PageHeader icon={Boxes} title="Stock line" back={back} /><ErrorBanner message={error} onRetry={load} /></div>
  if (!line) return <div className="space-y-6"><Skeleton className="h-16 w-80" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div><Skeleton className="h-64 rounded-xl" /></div>

  const canDelete = line.quantity === 0 && (moves?.length ?? 0) === 0

  return (
    <div className="space-y-6">
      <PageHeader icon={Boxes} back={back} title={line.product_name}
        description={<span className="flex flex-wrap items-center gap-2"><StockPill quantity={line.quantity} reorderPoint={line.reorder_point} />
          <span>in <Link href={`/inventory/warehouses/${line.warehouse_id}`} className="font-medium text-foreground hover:underline">{line.warehouse_name}</Link></span><span className="font-mono text-xs">{line.product_sku}</span></span>}
        actions={<>
          <Button variant="outline" asChild><Link href={`/inventory/inventory-items/new?product=${line.product_id}&warehouse=${line.warehouse_id}`}><ArrowDownToLine className="mr-2 h-4 w-4" />Receive</Link></Button>
          <Button onClick={() => setAdjust(target(line))} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><SlidersHorizontal className="mr-2 h-4 w-4" />Adjust</Button>
          {canDelete && <Button variant="outline" size="icon" className="text-danger hover:text-danger" aria-label="Remove stock line" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /></Button>}
        </>} />

      {line.needs_reorder && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <p>{line.quantity === 0 ? 'None left here.' : `Down to ${formatCount(line.quantity)}, at or below the reorder point of ${formatCount(line.reorder_point)}.`} <Link href={`/inventory/products/${line.product_id}`} className="font-medium underline">See all warehouses</Link></p>
        </div>
      )}

      <StatGrid>
        <StatCard label="On hand" value={line.quantity} icon={Boxes} tone="brand" hint={line.unit_of_measure || 'units'} />
        <StatCard label="Value" value={toNumber(line.stock_value)} icon={Wallet} tone="info" format={(n) => formatMoney(n, undefined, { maximumFractionDigits: 0 })} hint={`${formatMoney(line.product_cost_price)} each at cost`} />
        <StatCard label="Reorder point" value={line.reorder_point} icon={AlertTriangle} tone="warning" hint={line.reorder_point ? 'Set on the product' : 'Not set'} href={`/inventory/products/${line.product_id}/edit`} />
        <StatCard label="Days since count" value={line.last_checked ? Math.floor((Date.now() - new Date(line.last_checked).getTime()) / 86400000) : 0} icon={CalendarCheck} tone="success"
          format={(n) => (line.last_checked ? formatCount(n) : '—')} hint={line.last_checked ? `Counted ${formatDateTime(line.last_checked)}` : 'Adjust with reason “Stock count”'} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={History} title="Movement ledger" description="Every change to this line, newest first" bodyClassName="p-0" delay={0.1}>
          {!moves ? <div className="p-5"><Skeleton className="h-32" /></div> : <MovementFeed rows={moves} showProduct={false} showWarehouse={false} empty="No movements yet." />}
        </Panel>
        <div className="space-y-6">
          <Panel icon={MapPin} title="Bin location" delay={0.15}>
            {bin === null ? (
              <div className="flex items-center justify-between gap-2">
                <p className={line.location ? 'font-mono text-lg font-semibold' : 'text-sm text-muted-foreground'}>{line.location || 'Not set'}</p>
                <Button size="sm" variant="ghost" onClick={() => setBin(line.location)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); saveBin() }} className="flex gap-2">
                <Input value={bin} onChange={(e) => setBin(e.target.value)} placeholder="A-03" autoFocus aria-label="Bin location" className="font-mono" />
                <Button type="submit" size="icon" className="shrink-0 bg-brand text-brand-foreground hover:bg-brand/90" aria-label="Save"><Check className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => setBin(null)} aria-label="Cancel"><X className="h-4 w-4" /></Button>
              </form>
            )}
          </Panel>
          <Panel title="Level" delay={0.2}>
            <StockMeter quantity={line.quantity} reorderPoint={line.reorder_point} className="h-2.5" />
            <p className="mt-3 text-xs text-muted-foreground">{line.reorder_point ? 'The tick marks the reorder point.' : 'Set a reorder point on the product to get warnings.'} Last change {timeAgo(line.updated_at)}.</p>
          </Panel>
        </div>
      </div>

      <AdjustStockDialog target={adjust} onClose={() => setAdjust(null)} onDone={load} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={busy} variant="destructive" title="Remove this stock line?"
        description={`${line.product_name} will no longer be listed in ${line.warehouse_name}. You can receive it there again later.`} confirmText="Remove" cancelText="Keep it" onConfirm={remove} />
    </div>
  )
}

export default function StockLinePage() {
  return <Suspense><StockLineDetail /></Suspense>
}
