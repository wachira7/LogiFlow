// src/app/(app)/inventory/warehouses/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, ArrowDownToLine, ArrowLeftRight, Boxes, Building2, Edit, History, Mail, MapPin, MoreHorizontal, Phone, Power, Search, Trash2, UserRound, Wallet } from 'lucide-react'
import { stockService, type Movement, type StockLine, type StockWarehouse } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatusPill } from '@/components/app/kit'
import { MotionRow } from '@/components/app/motion'
import { AdjustStockDialog, type AdjustTarget } from '@/components/inventory/AdjustStockDialog'
import { UtilizationRing } from '@/components/inventory/UtilizationRing'
import { MovementFeed, StockMeter, StockPill, TextLink } from '@/components/inventory/status'
import { formatCount, formatMoney, toNumber } from '@/lib/format'

const csv: CsvColumn<StockLine>[] = [
  { header: 'SKU', value: (l) => l.product_sku }, { header: 'Product', value: (l) => l.product_name }, { header: 'Bin', value: (l) => l.location },
  { header: 'Quantity', value: (l) => l.quantity }, { header: 'Unit', value: (l) => l.unit_of_measure }, { header: 'Value at cost', value: (l) => l.stock_value },
]

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [w, setW] = useState<StockWarehouse | null>(null)
  const [lines, setLines] = useState<StockLine[] | null>(null)
  const [moves, setMoves] = useState<Movement[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adjust, setAdjust] = useState<AdjustTarget | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [wh, l, m] = await Promise.all([stockService.warehouse(id), stockService.lines({ warehouse: id }), stockService.movements({ warehouse: id, page_size: 10 })])
      setW(wh); setLines(l.results); setMoves(m.results); setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t load this warehouse.') }
  }, [id])
  useEffect(() => { load() }, [load])

  const toggleActive = async () => {
    if (!w) return
    try { await stockService.updateWarehouse(id, { is_active: !w.is_active }); toast.success(w.is_active ? 'Warehouse deactivated' : 'Warehouse reactivated'); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'That didn’t work.') }
  }
  const remove = async () => {
    setBusy(true)
    try { await stockService.deleteWarehouse(id); toast.success('Warehouse deleted'); router.push('/inventory/warehouses') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t delete it.'); setConfirm(false) }
    finally { setBusy(false) }
  }

  if (error && !w) return <div className="space-y-6"><PageHeader icon={Building2} title="Warehouse" back={{ href: '/inventory/warehouses', label: 'Warehouses' }} /><ErrorBanner message={error} onRetry={load} /></div>
  if (!w) return <div className="space-y-6"><Skeleton className="h-16 w-80" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div><Skeleton className="h-72 rounded-xl" /></div>

  const all = lines ?? []
  const units = all.reduce((s, l) => s + l.quantity, 0)
  const low = all.filter((l) => l.needs_reorder).length
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((l) => `${l.product_name} ${l.product_sku} ${l.location}`.toLowerCase().includes(q)) : all
  const address = [w.address, w.city, w.state, w.postal_code, w.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} back={{ href: '/inventory/warehouses', label: 'Warehouses' }} title={w.name}
        description={<span className="flex flex-wrap items-center gap-2">{!w.is_active && <StatusPill tone="neutral">Inactive</StatusPill>}{w.code && <span className="font-mono text-xs">{w.code}</span>}{address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{address}</span>}</span>}
        actions={<>
          <Button variant="outline" asChild><Link href={`/inventory/inventory-items/new?warehouse=${id}`}><ArrowDownToLine className="mr-2 h-4 w-4" />Receive</Link></Button>
          <Button variant="outline" onClick={() => router.push(`/inventory/warehouses/${id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href="/warehousing/transfers/new"><ArrowLeftRight className="mr-2 h-4 w-4" />Transfer stock</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={toggleActive}><Power className="mr-2 h-4 w-4" />{w.is_active ? 'Deactivate' : 'Reactivate'}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => setConfirm(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>} />

      <StatGrid>
        <StatCard label="Stock value" value={toNumber(w.total_stock_value)} icon={Wallet} tone="brand" format={(n) => formatMoney(n, undefined, { maximumFractionDigits: 0 })} hint="At cost" />
        <StatCard label="Units on hand" value={units} icon={Boxes} tone="info" hint={w.capacity ? `of ${formatCount(w.capacity)} capacity` : 'No capacity set'} />
        <StatCard label="Products" value={w.total_products} icon={Boxes} tone="success" hint="Stock lines" />
        <StatCard label="To reorder" value={low} icon={AlertTriangle} tone={low ? 'warning' : 'neutral'} hint="At or below reorder point" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={Boxes} title="Stock here" bodyClassName="p-0" delay={0.1}
          action={<ExportButton filename={`${(w.code || w.name).toLowerCase().replace(/\s+/g, '-')}-stock`} rows={shown} columns={csv} label="CSV" />}>
          {all.length > 6 && (
            <div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product, SKU or bin…" className="pl-9" aria-label="Search stock in this warehouse" /></div></div>
          )}
          {!lines ? <div className="p-5"><Skeleton className="h-40" /></div> : shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{q ? 'Nothing matches.' : <>Nothing stocked here yet. <Link href={`/inventory/inventory-items/new?warehouse=${id}`} className="font-medium text-brand hover:underline">Receive stock</Link>.</>}</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2.5 font-medium sm:px-5">Product</th><th className="w-40 px-3 py-2.5 font-medium">On hand</th><th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Value</th><th className="px-4 py-2.5 sm:px-5"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody className="divide-y">
                  {shown.map((l, i) => (
                    <MotionRow key={l.id} index={i}>
                      <td className="px-4 py-3 sm:px-5"><Link href={`/inventory/inventory-items/${l.id}`} className="font-medium hover:underline">{l.product_name}</Link>
                        <p className="text-xs text-muted-foreground"><span className="font-mono">{l.product_sku}</span>{l.location ? ` · Bin ${l.location}` : ''}</p></td>
                      <td className="px-3 py-3"><div className="flex items-center justify-between gap-2"><span className="font-medium tabular-nums">{formatCount(l.quantity)} <span className="text-xs font-normal text-muted-foreground">{l.unit_of_measure}</span></span>
                        {l.quantity <= 0 || l.needs_reorder ? <StockPill quantity={l.quantity} reorderPoint={l.reorder_point} /> : null}</div>
                        <StockMeter className="mt-1.5" quantity={l.quantity} reorderPoint={l.reorder_point} /></td>
                      <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">{formatMoney(l.stock_value, undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right sm:px-5"><Button size="sm" variant="ghost" className="text-brand"
                        onClick={() => setAdjust({ productId: l.product_id, productName: l.product_name, warehouseId: id, warehouseName: w.name, quantity: l.quantity, unit: l.unit_of_measure })}>Adjust</Button></td>
                    </MotionRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Capacity" delay={0.15}>
            <div className="flex items-center gap-4">
              <UtilizationRing value={w.utilization_percentage} size={72} />
              <p className="text-sm text-muted-foreground">{w.capacity ? <>{formatCount(units)} of {formatCount(w.capacity)} units used. {w.utilization_percentage != null && w.utilization_percentage >= 90 ? 'It’s nearly full.' : ''}</> : <>Set a capacity in <Link href={`/inventory/warehouses/${id}/edit`} className="text-brand hover:underline">settings</Link> to see how full it is.</>}</p>
            </div>
          </Panel>
          <Panel title="Contact" delay={0.2}>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" />{w.manager_name || <span className="text-muted-foreground">No manager</span>}</li>
              {w.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${w.phone}`} className="hover:underline">{w.phone}</a></li>}
              {w.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${w.email}`} className="truncate hover:underline">{w.email}</a></li>}
            </ul>
            {w.description && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{w.description}</p>}
          </Panel>
        </div>
      </div>

      <Panel icon={History} title="Recent movements" bodyClassName="p-0" delay={0.25} action={<TextLink href={`/inventory/transactions?warehouse=${id}`}>All movements</TextLink>}>
        {!moves ? <div className="p-5"><Skeleton className="h-24" /></div> : <MovementFeed rows={moves} showWarehouse={false} />}
      </Panel>

      <AdjustStockDialog target={adjust} onClose={() => setAdjust(null)} onDone={load} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} loading={busy} variant="destructive" title={`Delete ${w.name}?`}
        description="Warehouses with stock or history can’t be deleted; deactivate them instead." confirmText="Delete" cancelText="Keep it" onConfirm={remove} />
    </div>
  )
}
