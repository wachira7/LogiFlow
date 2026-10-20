// src/app/(app)/inventory/products/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Package, Plus, Search, X } from 'lucide-react'
import { stockService, type Page, type StockCategory, type StockProduct } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, FilterChips, PageHeader, StatusPill, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { Pager, StockMeter, StockPill } from '@/components/inventory/status'
import { formatCount, formatMoney } from '@/lib/format'

type Filter = '' | 'low' | 'inactive'
const FILTERS = [['', 'All'], ['low', 'To reorder'], ['inactive', 'Inactive']] as const
const SORTS = [['name', 'Name'], ['stock_on_hand', 'Lowest stock'], ['-stock_on_hand', 'Most stock'], ['-created_at', 'Newest']] as const
const csv: CsvColumn<StockProduct>[] = [
  { header: 'SKU', value: (p) => p.sku }, { header: 'Name', value: (p) => p.name }, { header: 'Category', value: (p) => p.category_name },
  { header: 'Unit', value: (p) => p.unit_of_measure }, { header: 'On hand', value: (p) => p.total_stock }, { header: 'Reorder point', value: (p) => p.reorder_point },
  { header: 'Cost', value: (p) => p.cost_price }, { header: 'Price', value: (p) => p.unit_price }, { header: 'Active', value: (p) => (p.is_active ? 'Yes' : 'No') },
]

function ProductsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) ?? '')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [ordering, setOrdering] = useState('name')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<StockProduct> | null>(null)
  const [categories, setCategories] = useState<StockCategory[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { stockService.categories().then(setCategories).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [query])
  useEffect(() => {
    setError(null)
    stockService.products({
      page, ordering, search, category: category || undefined,
      low_stock: filter === 'low' || undefined, is_active: filter === 'inactive' ? 'false' : undefined,
    }).then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load products.'))
  }, [filter, category, ordering, search, page])

  const choose = (f: Filter) => { setFilter(f); setPage(1); router.replace(f ? `${pathname}?filter=${f}` : pathname, { scroll: false }) }
  const rows = data?.results
  const filtered = !!(filter || category || search)
  const open = (id: string) => router.push(`/inventory/products/${id}`)

  return (
    <div className="space-y-6">
      <PageHeader icon={Package} title="Products" description={data ? `${formatCount(data.count)} ${data.count === 1 ? 'product' : 'products'}${filtered ? ' match' : ' in your catalogue'}` : 'Everything you buy, make or sell.'}
        actions={<><ExportButton filename={`products-${new Date().toISOString().slice(0, 10)}`} rows={rows ?? []} columns={csv} />
          <Button onClick={() => router.push('/inventory/products/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New product</Button></>} />

      <FadeIn delay={0.05} className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterChips id="products" options={FILTERS} value={filter} onChange={choose} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, SKU or barcode…" className="bg-card pl-9 pr-9" aria-label="Search products" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={category || 'all'} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full bg-card sm:w-44" aria-label="Category"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_path || c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ordering} onValueChange={(v) => { setOrdering(v); setPage(1) }}>
            <SelectTrigger className="w-full bg-card sm:w-40" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </FadeIn>

      {error && <ErrorBanner title="Couldn’t load products" message={error} />}
      {!rows ? <TableSkeleton rows={6} cols={5} /> : rows.length === 0 ? (
        <EmptyState icon={<Package />} title={filtered ? 'No matching products' : 'No products yet'}
          description={filtered ? 'Try another filter or search.' : 'Add the products you stock. Then receive stock into a warehouse.'}
          action={!filtered ? <Button onClick={() => router.push('/inventory/products/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New product</Button> : undefined} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y md:hidden">
            {rows.map((p) => (
              <li key={p.id}><button onClick={() => open(p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{p.name}</p>
                    {p.is_active ? <StockPill quantity={p.total_stock} reorderPoint={p.reorder_point} max={p.max_stock_level} /> : <StatusPill tone="neutral">Inactive</StatusPill>}</div>
                  <p className="text-xs text-muted-foreground">{p.sku} · {formatCount(p.total_stock)} {p.unit_of_measure} · {formatMoney(p.unit_price)}</p>
                  <StockMeter quantity={p.total_stock} reorderPoint={p.reorder_point} max={p.max_stock_level} />
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Product</th><th className="px-3 py-3 font-medium">Category</th><th className="w-48 px-3 py-3 font-medium">On hand</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 text-right font-medium">Cost</th><th className="px-5 py-3 text-right font-medium">Price</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p, i) => (
                  <MotionRow key={p.id} index={i} className={`cursor-pointer transition-colors hover:bg-muted/40 ${p.is_active ? '' : 'opacity-60'}`} onClick={() => open(p.id)}>
                    <td className="px-5 py-3"><p className="font-medium">{p.name}</p><p className="font-mono text-xs text-muted-foreground">{p.sku}</p></td>
                    <td className="px-3 py-3 text-muted-foreground">{p.category_name ?? '—'}</td>
                    <td className="px-3 py-3"><p className="tabular-nums"><span className="font-medium">{formatCount(p.total_stock)}</span> <span className="text-xs text-muted-foreground">{p.unit_of_measure}{p.reorder_point ? ` · reorder at ${formatCount(p.reorder_point)}` : ''}</span></p>
                      <StockMeter className="mt-1.5" quantity={p.total_stock} reorderPoint={p.reorder_point} max={p.max_stock_level} /></td>
                    <td className="px-3 py-3">{p.is_active ? <StockPill quantity={p.total_stock} reorderPoint={p.reorder_point} max={p.max_stock_level} /> : <StatusPill tone="neutral">Inactive</StatusPill>}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatMoney(p.cost_price)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{formatMoney(p.unit_price)}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
      {data && <Pager page={page} count={data.count} onPage={setPage} />}
    </div>
  )
}

export default function ProductsPage() {
  return <Suspense fallback={<TableSkeleton rows={6} cols={5} />}><ProductsContent /></Suspense>
}
