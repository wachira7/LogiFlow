// src/app/(app)/inventory/products/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Boxes, Building2, Edit, History, MoreHorizontal, Package, Plus, Power, Tag, Trash2, Wallet } from 'lucide-react'
import { stockService, type Movement, type StockProductDetail } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatusPill } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { AdjustStockDialog, type AdjustTarget } from '@/components/inventory/AdjustStockDialog'
import { MovementFeed, StockMeter, StockPill, TextLink } from '@/components/inventory/status'
import { formatCount, formatMoney, timeAgo, toNumber } from '@/lib/format'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [p, setP] = useState<StockProductDetail | null>(null)
  const [moves, setMoves] = useState<Movement[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adjust, setAdjust] = useState<AdjustTarget | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [prod, m] = await Promise.all([stockService.product(id), stockService.movements({ product: id, page_size: 12 })])
      setP(prod); setMoves(m.results); setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t load this product.') }
  }, [id])
  useEffect(() => { load() }, [load])

  const toggleActive = async () => {
    if (!p) return
    try { await stockService.updateProduct(id, { is_active: !p.is_active }); toast.success(p.is_active ? 'Product deactivated' : 'Product reactivated'); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') }
  }
  const remove = async () => {
    setBusy(true)
    try { await stockService.deleteProduct(id); toast.success('Product deleted'); router.push('/inventory/products') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete it.'); setConfirm(false) }
    finally { setBusy(false) }
  }

  if (error && !p) return <div className="space-y-6"><PageHeader icon={Package} title="Product" back={{ href: '/inventory/products', label: 'Products' }} /><ErrorBanner title="Couldn’t load this product" message={error} onRetry={load} /></div>
  if (!p) return <div className="space-y-6"><Skeleton className="h-16 w-80" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div><Skeleton className="h-72 rounded-xl" /></div>

  const value = p.total_stock * toNumber(p.cost_price)
  const facts: [string, React.ReactNode][] = [
    ['SKU', <span key="s" className="font-mono">{p.sku}</span>], ['Category', p.category_full_path || p.category_name || '—'], ['Unit', p.unit_of_measure || 'ea'],
    ['Barcode', p.barcode || '—'], ['Weight', p.weight ? `${toNumber(p.weight)} kg` : '—'], ['Dimensions', p.dimensions || '—'],
    ['Min / max stock', `${formatCount(p.min_stock_level)} / ${p.max_stock_level ? formatCount(p.max_stock_level) : '—'}`], ['Lead time', p.lead_time_days ? `${p.lead_time_days} days` : '—'],
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} back={{ href: '/inventory/products', label: 'Products' }}
        title={p.name}
        description={<span className="flex flex-wrap items-center gap-2">{p.is_active ? <StockPill quantity={p.total_stock} reorderPoint={p.reorder_point} max={p.max_stock_level} /> : <StatusPill tone="neutral">Inactive</StatusPill>}<span className="font-mono text-xs">{p.sku}</span></span>}
        actions={<>
          <Button variant="outline" onClick={() => router.push(`/inventory/products/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleActive}><Power className="mr-2 h-4 w-4" />{p.is_active ? 'Deactivate' : 'Reactivate'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => setConfirm(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>} />

      {p.needs_reorder && p.is_active && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p><span className="font-medium">Time to reorder.</span> {formatCount(p.total_stock)} on hand against a reorder point of {formatCount(p.reorder_point)}
            {p.max_stock_level ? `; ordering ${formatCount(Math.max(p.max_stock_level - p.total_stock, 0))} brings it back to max stock` : ''}.</p>
        </div>
      )}

      <StatGrid>
        <StatCard label="On hand" value={p.total_stock} icon={Boxes} tone="brand" hint={`${p.unit_of_measure || 'units'} across ${p.stock_by_warehouse.length} ${p.stock_by_warehouse.length === 1 ? 'warehouse' : 'warehouses'}`} />
        <StatCard label="Stock value" value={value} icon={Wallet} tone="info" format={(n) => formatMoney(n, undefined, { maximumFractionDigits: 0 })} hint="At cost" />
        <StatCard label="Price" value={toNumber(p.unit_price)} icon={Tag} tone="success" format={(n) => formatMoney(n)} hint={`Cost ${formatMoney(p.cost_price)}`} />
        <StatCard label="Markup" value={p.profit_margin ?? 0} icon={Wallet} tone={p.profit_margin < 0 ? 'danger' : 'warning'} format={(n) => `${n.toFixed(1)}%`} hint="Price over cost" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" icon={Building2} title="Stock by warehouse" bodyClassName="p-0" delay={0.1}
          action={<Button size="sm" variant="outline" asChild><Link href={`/inventory/inventory-items/new?product=${id}`}><Plus className="mr-1 h-3.5 w-3.5" />Stock elsewhere</Link></Button>}>
          {p.stock_by_warehouse.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Not stocked anywhere yet. <Link href={`/inventory/inventory-items/new?product=${id}`} className="font-medium text-brand hover:underline">Receive stock</Link> to start tracking it.</p>
          ) : (
            <AppStagger className="divide-y">
              {p.stock_by_warehouse.map((s) => (
                <AppStaggerItem key={s.warehouse_id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/inventory/warehouses/${s.warehouse_id}`} className="truncate font-medium hover:underline">{s.warehouse_name}</Link>
                      <span className="shrink-0 font-semibold tabular-nums">{formatCount(s.quantity)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{[s.location && `Bin ${s.location}`, s.last_checked && `Checked ${timeAgo(s.last_checked)}`].filter(Boolean).join(' · ') || 'No bin location'}</p>
                    <StockMeter className="mt-2" quantity={s.quantity} reorderPoint={p.reorder_point} max={p.max_stock_level} />
                  </div>
                  <Button size="sm" variant="ghost" className="text-brand" onClick={() => setAdjust({ productId: p.id, productName: p.name, warehouseId: s.warehouse_id, warehouseName: s.warehouse_name, quantity: s.quantity, unit: p.unit_of_measure })}>Adjust</Button>
                </AppStaggerItem>
              ))}
            </AppStagger>
          )}
        </Panel>
        <Panel className="lg:col-span-2" title="Details" delay={0.15}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 truncate font-medium">{v}</dd></div>)}
          </dl>
          {p.description && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{p.description}</p>}
        </Panel>
      </div>

      <Panel icon={History} title="Movement history" bodyClassName="p-0" delay={0.2} action={<TextLink href={`/inventory/transactions?product=${id}`}>All movements</TextLink>}>
        {!moves ? <div className="p-5"><Skeleton className="h-24" /></div> : <MovementFeed rows={moves} showProduct={false} empty="No movements yet." />}
      </Panel>

      <AdjustStockDialog target={adjust} onClose={() => setAdjust(null)} onDone={load} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={busy} variant="destructive" title={`Delete ${p.name}?`}
        description="Only products with no stock history can be deleted. If it has history, deactivate it instead." confirmText="Delete" cancelText="Keep it" onConfirm={remove} />
    </div>
  )
}
