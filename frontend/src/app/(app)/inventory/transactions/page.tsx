// src/app/(app)/inventory/transactions/page.tsx
// The stock ledger: every receipt, shipment, adjustment, transfer, return and production movement.
'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { History, Search, X } from 'lucide-react'
import { stockService, type Movement, type MovementType, type Page, type StockWarehouse } from '@/services/stockService'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, FilterChips, PageHeader, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { MOVEMENT, MovementIcon, Pager, SignedQty } from '@/components/inventory/status'
import { formatCount, formatDateTime, timeAgo } from '@/lib/format'

const FILTERS = [['', 'All'], ...Object.entries(MOVEMENT).map(([k, v]) => [k, v.label] as const)] as readonly (readonly ['' | MovementType, string])[]
const csv: CsvColumn<Movement>[] = [
  { header: 'When', value: (m) => m.timestamp }, { header: 'Type', value: (m) => MOVEMENT[m.transaction_type]?.label ?? m.transaction_type },
  { header: 'SKU', value: (m) => m.product_sku }, { header: 'Product', value: (m) => m.product_name }, { header: 'Warehouse', value: (m) => m.warehouse_name },
  { header: 'Quantity', value: (m) => m.quantity }, { header: 'Balance after', value: (m) => m.balance_after }, { header: 'Reference', value: (m) => m.reference },
  { header: 'Notes', value: (m) => m.notes }, { header: 'By', value: (m) => m.performed_by_name },
]

function MovementsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const product = params.get('product') ?? ''
  const [type, setType] = useState<'' | MovementType>((params.get('type') as MovementType) ?? '')
  const [warehouse, setWarehouse] = useState(params.get('warehouse') ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<Movement> | null>(null)
  const [warehouses, setWarehouses] = useState<StockWarehouse[]>([])
  const [productName, setProductName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { stockService.warehouses().then(setWarehouses).catch(() => {}) }, [])
  useEffect(() => { if (product) stockService.product(product).then((p) => setProductName(p.name)).catch(() => setProductName('this product')); else setProductName(null) }, [product])
  useEffect(() => { const t = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300); return () => clearTimeout(t) }, [query])
  useEffect(() => {
    setError(null)
    stockService.movements({ page, search, product: product || undefined, transaction_type: type || undefined, warehouse: warehouse || undefined, date_from: from || undefined, date_to: to || undefined })
      .then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load movements.'))
  }, [page, search, product, type, warehouse, from, to])

  const reset = (fn: () => void) => { fn(); setPage(1) }
  const rows = data?.results
  const filtered = !!(type || warehouse || from || to || search || product)

  return (
    <div className="space-y-6">
      <PageHeader icon={History} title="Stock movements" description="The full ledger. Every change to stock lands here with who made it and the balance after."
        actions={<ExportButton filename={`stock-movements-${new Date().toISOString().slice(0, 10)}`} rows={rows ?? []} columns={csv} />} />

      <FadeIn delay={0.05} className="space-y-3">
        <FilterChips id="movements" options={FILTERS} value={type} onChange={(v) => reset(() => setType(v))} />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product, reference or note…" className="bg-card pl-9 pr-9" aria-label="Search movements" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={warehouse || 'all'} onValueChange={(v) => reset(() => setWarehouse(v === 'all' ? '' : v))}>
            <SelectTrigger className="w-full bg-card xl:w-48" aria-label="Warehouse"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All warehouses</SelectItem>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => reset(() => setFrom(e.target.value))} className="bg-card xl:w-40" aria-label="From date" />
          <Input type="date" value={to} min={from || undefined} onChange={(e) => reset(() => setTo(e.target.value))} className="bg-card xl:w-40" aria-label="To date" />
        </div>
        {product && (
          <button onClick={() => router.replace(pathname)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
            Product: {productName ?? '…'} <X className="h-3.5 w-3.5" /><span className="sr-only">Clear product filter</span>
          </button>
        )}
      </FadeIn>

      {error && <ErrorBanner title="Couldn’t load movements" message={error} />}
      {!rows ? <TableSkeleton rows={8} cols={5} /> : rows.length === 0 ? (
        <EmptyState icon={<History />} title={filtered ? 'No matching movements' : 'No movements yet'} description={filtered ? 'Try a wider date range or another filter.' : 'Receiving, shipping, adjusting or transferring stock records a movement here.'} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y md:hidden">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <MovementIcon type={m.transaction_type} />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.product_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{MOVEMENT[m.transaction_type]?.label} · {m.warehouse_name} · {timeAgo(m.timestamp)}</p></div>
                <div className="text-right"><SignedQty value={m.quantity} />{m.balance_after != null && <p className="text-xs tabular-nums text-muted-foreground">→ {formatCount(m.balance_after)}</p>}</div>
              </li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3 font-medium">Movement</th><th className="px-3 py-3 font-medium">Product</th><th className="px-3 py-3 font-medium">Warehouse</th><th className="px-3 py-3 text-right font-medium">Qty</th><th className="px-3 py-3 text-right font-medium">Balance</th><th className="px-3 py-3 font-medium">Reference</th><th className="px-5 py-3 font-medium">By</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((m, i) => (
                  <MotionRow key={m.id} index={i} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><MovementIcon type={m.transaction_type} />
                      <div><p className="font-medium">{MOVEMENT[m.transaction_type]?.label ?? m.transaction_type}</p><p className="text-xs text-muted-foreground" title={formatDateTime(m.timestamp)}>{timeAgo(m.timestamp)}</p></div></div></td>
                    <td className="px-3 py-3"><p className="font-medium">{m.product_name}</p><p className="font-mono text-xs text-muted-foreground">{m.product_sku}</p></td>
                    <td className="px-3 py-3 text-muted-foreground">{m.warehouse_name}</td>
                    <td className="px-3 py-3 text-right"><SignedQty value={m.quantity} /></td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{m.balance_before != null && m.balance_after != null ? <>{formatCount(m.balance_before)} → <span className="font-medium text-foreground">{formatCount(m.balance_after)}</span></> : '—'}</td>
                    <td className="max-w-56 px-3 py-3"><p className="truncate">{m.reference || '—'}</p>{m.notes && <p className="truncate text-xs text-muted-foreground" title={m.notes}>{m.notes}</p>}</td>
                    <td className="px-5 py-3 text-muted-foreground">{m.performed_by_name || 'System'}</td>
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

export default function MovementsPage() {
  return <Suspense fallback={<TableSkeleton rows={8} cols={5} />}><MovementsContent /></Suspense>
}
