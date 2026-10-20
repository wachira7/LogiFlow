// src/app/(app)/inventory/inventory-items/page.tsx
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownToLine, Boxes, Search, X } from 'lucide-react'
import { stockService, type Page, type StockLine, type StockWarehouse } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, FilterChips, PageHeader, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { AdjustStockDialog, type AdjustTarget } from '@/components/inventory/AdjustStockDialog'
import { Pager, StockMeter, StockPill } from '@/components/inventory/status'
import { formatCount, formatMoney, timeAgo } from '@/lib/format'

type Filter = '' | 'low' | 'out'
const FILTERS = [['', 'All'], ['low', 'To reorder'], ['out', 'Out of stock']] as const
const SORTS = [['', 'Product'], ['quantity', 'Lowest first'], ['-quantity', 'Highest first'], ['-last_checked', 'Recently counted']] as const
const csv: CsvColumn<StockLine>[] = [
  { header: 'SKU', value: (l) => l.product_sku }, { header: 'Product', value: (l) => l.product_name }, { header: 'Warehouse', value: (l) => l.warehouse_name },
  { header: 'Bin', value: (l) => l.location }, { header: 'Quantity', value: (l) => l.quantity }, { header: 'Unit', value: (l) => l.unit_of_measure },
  { header: 'Reorder point', value: (l) => l.reorder_point }, { header: 'Value at cost', value: (l) => l.stock_value }, { header: 'Last counted', value: (l) => l.last_checked },
]

function StockContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) ?? '')
  const [warehouse, setWarehouse] = useState(params.get('warehouse') ?? '')
  const [ordering, setOrdering] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<StockLine> | null>(null)
  const [warehouses, setWarehouses] = useState<StockWarehouse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adjust, setAdjust] = useState<AdjustTarget | null>(null)

  useEffect(() => { stockService.warehouses().then(setWarehouses).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [query])
  const load = useCallback(() => {
    setError(null)
    stockService.lines({ page, search, ordering: ordering || undefined, warehouse: warehouse || undefined, low_stock: filter === 'low' || undefined, out_of_stock: filter === 'out' || undefined })
      .then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load stock.'))
  }, [page, search, ordering, warehouse, filter])
  useEffect(() => { load() }, [load])

  const choose = (f: Filter) => { setFilter(f); setPage(1); router.replace(f ? `${pathname}?filter=${f}` : pathname, { scroll: false }) }
  const rows = data?.results
  const filtered = !!(filter || warehouse || search)
  const adjustLine = (l: StockLine) => setAdjust({ productId: l.product_id, productName: l.product_name, warehouseId: l.warehouse_id, warehouseName: l.warehouse_name, quantity: l.quantity, unit: l.unit_of_measure })

  return (
    <div className="space-y-6">
      <PageHeader icon={Boxes} title="Stock levels" description="Every product in every warehouse. Adjust after a count; every change is logged."
        actions={<><ExportButton filename={`stock-${new Date().toISOString().slice(0, 10)}`} rows={rows ?? []} columns={csv} />
          <Button onClick={() => router.push('/inventory/inventory-items/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><ArrowDownToLine className="mr-2 h-4 w-4" />Receive stock</Button></>} />

      <FadeIn delay={0.05} className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterChips id="stock" options={FILTERS} value={filter} onChange={choose} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product, SKU or bin…" className="bg-card pl-9 pr-9" aria-label="Search stock" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={warehouse || 'all'} onValueChange={(v) => { setWarehouse(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full bg-card sm:w-48" aria-label="Warehouse"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All warehouses</SelectItem>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ordering || 'product'} onValueChange={(v) => { setOrdering(v === 'product' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full bg-card sm:w-44" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([k, l]) => <SelectItem key={k || 'product'} value={k || 'product'}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </FadeIn>

      {error && <ErrorBanner title="Couldn’t load stock" message={error} onRetry={load} />}
      {!rows ? <TableSkeleton rows={6} cols={5} /> : rows.length === 0 ? (
        <EmptyState icon={<Boxes />} title={filtered ? 'Nothing matches' : 'No stock yet'}
          description={filtered ? (filter ? 'Good news: nothing is in this state right now.' : 'Try another search or warehouse.') : 'Receive stock to start tracking a product in a warehouse.'}
          action={!filtered ? <Button onClick={() => router.push('/inventory/inventory-items/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><ArrowDownToLine className="mr-2 h-4 w-4" />Receive stock</Button> : undefined} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y md:hidden">
            {rows.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/inventory/inventory-items/${l.id}`} className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{l.product_name}</p><span className="shrink-0 font-semibold tabular-nums">{formatCount(l.quantity)}</span></div>
                  <p className="truncate text-xs text-muted-foreground">{l.warehouse_name}{l.location ? ` · Bin ${l.location}` : ''} · {l.product_sku}</p>
                  <StockMeter quantity={l.quantity} reorderPoint={l.reorder_point} />
                </Link>
                <Button size="sm" variant="outline" onClick={() => adjustLine(l)}>Adjust</Button>
              </li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Product</th><th className="px-3 py-3 font-medium">Warehouse</th><th className="w-48 px-3 py-3 font-medium">On hand</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 text-right font-medium">Value</th><th className="px-3 py-3 font-medium">Counted</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((l, i) => (
                  <MotionRow key={l.id} index={i} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3"><Link href={`/inventory/inventory-items/${l.id}`} className="font-medium hover:underline">{l.product_name}</Link><p className="font-mono text-xs text-muted-foreground">{l.product_sku}</p></td>
                    <td className="px-3 py-3"><p>{l.warehouse_name}</p>{l.location && <p className="text-xs text-muted-foreground">Bin {l.location}</p>}</td>
                    <td className="px-3 py-3"><p className="tabular-nums"><span className="font-medium">{formatCount(l.quantity)}</span> <span className="text-xs text-muted-foreground">{l.unit_of_measure}</span></p><StockMeter className="mt-1.5" quantity={l.quantity} reorderPoint={l.reorder_point} /></td>
                    <td className="px-3 py-3"><StockPill quantity={l.quantity} reorderPoint={l.reorder_point} /></td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatMoney(l.stock_value, undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-3 text-muted-foreground">{l.last_checked ? timeAgo(l.last_checked) : '—'}</td>
                    <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost" className="text-brand" onClick={() => adjustLine(l)}>Adjust</Button></td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
      {data && <Pager page={page} count={data.count} onPage={setPage} />}
      <AdjustStockDialog target={adjust} onClose={() => setAdjust(null)} onDone={load} />
    </div>
  )
}

export default function StockLevelsPage() {
  return <Suspense fallback={<TableSkeleton rows={6} cols={5} />}><StockContent /></Suspense>
}
