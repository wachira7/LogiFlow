// src/app/(app)/distribution/orders/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ClipboardList, Plus, Search, X } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, FilterChips, PageHeader, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { OrderPill, ORDER } from '@/components/distribution/status'
import { formatDay, formatMoney } from '@/lib/format'
import type { Order, OrderStatus } from '@/types/distribution.types'

const FILTERS = [['', 'All'], ['NEW', 'New'], ['PROCESSING', 'Processing'], ['SHIPPED', 'Shipped'], ['DELIVERED', 'Delivered'], ['CANCELLED', 'Cancelled']] as const
const csv: CsvColumn<Order>[] = [
  { header: 'Order', value: (o) => o.order_number }, { header: 'Customer', value: (o) => o.customer_name }, { header: 'Email', value: (o) => o.customer_email },
  { header: 'Status', value: (o) => ORDER[o.status][0] }, { header: 'Items', value: (o) => o.item_count }, { header: 'Total', value: (o) => o.total_amount }, { header: 'Created', value: (o) => o.created_at },
]

function OrdersContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [status, setStatus] = useState<'' | OrderStatus>((params.get('status') as OrderStatus) ?? '')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(t) }, [query])
  useEffect(() => {
    distributionService.orders({ status: status || undefined, search: search || undefined }).then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load orders.'))
  }, [status, search])

  const choose = (s: '' | OrderStatus) => { setStatus(s); router.replace(s ? `${pathname}?status=${s}` : pathname, { scroll: false }) }

  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Orders" description="Customer orders from first contact to delivery."
        actions={<><ExportButton filename={`orders-${new Date().toISOString().slice(0, 10)}`} rows={rows ?? []} columns={csv} />
          <Button onClick={() => router.push('/distribution/orders/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New order</Button></>} />
      <FadeIn delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips id="orders" options={FILTERS} value={status} onChange={choose} />
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order, customer or email…" className="bg-card pl-9 pr-9" aria-label="Search orders" />
          {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </FadeIn>
      {error && <ErrorBanner title="Couldn’t load orders" message={error} />}
      {!rows ? <TableSkeleton rows={6} cols={5} /> : rows.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title={status || search ? 'No matching orders' : 'No orders yet'} description={status || search ? 'Try another filter.' : 'Create an order, process it, then create its shipment.'}
          action={!status && !search ? <Button onClick={() => router.push('/distribution/orders/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New order</Button> : undefined} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y md:hidden">
            {rows.map((o) => (
              <li key={o.id}><button onClick={() => router.push(`/distribution/orders/${o.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                <div className="min-w-0 flex-1 space-y-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{o.customer_name}</p><OrderPill status={o.status} /></div>
                  <p className="text-xs text-muted-foreground">{o.order_number} · {o.item_count} items · {formatMoney(o.total_amount)}</p></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" /></button></li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Order</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 text-right font-medium">Items</th><th className="px-3 py-3 text-right font-medium">Total</th><th className="px-5 py-3 font-medium">Created</th></tr></thead>
              <tbody className="divide-y">
                {rows.map((o, i) => (
                  <MotionRow key={o.id} index={i} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/distribution/orders/${o.id}`)}>
                    <td className="px-5 py-3 font-medium">{o.order_number}</td>
                    <td className="px-3 py-3"><p>{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.customer_email}</p></td>
                    <td className="px-3 py-3"><OrderPill status={o.status} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{o.item_count}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{formatMoney(o.total_amount)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDay(o.created_at)}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return <Suspense fallback={<TableSkeleton rows={6} cols={5} />}><OrdersContent /></Suspense>
}
