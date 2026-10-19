// src/app/(app)/distribution/shipments/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Plus, Search, Truck, X } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, FilterChips, PageHeader, TableSkeleton } from '@/components/app/kit'
import { FadeIn, MotionRow } from '@/components/app/motion'
import { ShipmentPill } from '@/components/distribution/status'
import { formatCount, formatDay, timeAgo } from '@/lib/format'
import type { Shipment, ShipmentStatus } from '@/types/distribution.types'

const FILTERS = [['', 'All'], ['PENDING', 'Waiting'], ['PICKED', 'Picked'], ['PACKED', 'Packed'], ['SHIPPED', 'On the way'], ['DELIVERED', 'Delivered'], ['RETURNED', 'Returned'], ['CANCELLED', 'Cancelled']] as const

function ShipmentsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [status, setStatus] = useState<'' | ShipmentStatus>((params.get('status') as ShipmentStatus) ?? '')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Shipment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(t) }, [query])
  useEffect(() => {
    distributionService.shipments({ status: status || undefined, search: search || undefined }).then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load shipments.'))
  }, [status, search])
  const choose = (s: '' | ShipmentStatus) => { setStatus(s); router.replace(s ? `${pathname}?status=${s}` : pathname, { scroll: false }) }

  return (
    <div className="space-y-6">
      <PageHeader icon={Truck} title="Shipments" description="Everything leaving your warehouses, step by step."
        actions={<Button variant="outline" onClick={() => router.push('/distribution/shipments/new')}><Plus className="mr-2 h-4 w-4" />Manual shipment</Button>} />
      <FadeIn delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips id="shipments" options={FILTERS} value={status} onChange={choose} />
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Shipment, tracking or order no…" className="bg-card pl-9 pr-9" aria-label="Search shipments" />
          {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </FadeIn>
      {error && <ErrorBanner title="Couldn’t load shipments" message={error} />}
      {!rows ? <TableSkeleton rows={6} cols={5} /> : rows.length === 0 ? (
        <EmptyState icon={<Truck />} title={status || search ? 'No matching shipments' : 'No shipments yet'} description={status || search ? 'Try another filter.' : 'Shipments are created from processed orders (or manually).'} />
      ) : (
        <FadeIn delay={0.1} className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y md:hidden">
            {rows.map((s) => (
              <li key={s.id}><button onClick={() => router.push(`/distribution/shipments/${s.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                <div className="min-w-0 flex-1 space-y-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{s.customer_name ?? s.recipient_name ?? s.shipment_number}</p><ShipmentPill status={s.status} delayed={s.is_delayed} /></div>
                  <p className="text-xs text-muted-foreground">{s.shipment_number} · {formatCount(s.item_count)} units · from {s.warehouse_name}</p></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" /></button></li>
            ))}
          </ul>
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Shipment</th><th className="px-3 py-3 font-medium">To</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">From</th><th className="px-3 py-3 font-medium">Carrier</th><th className="px-5 py-3 font-medium">ETA / delivered</th></tr></thead>
              <tbody className="divide-y">
                {rows.map((s, i) => (
                  <MotionRow key={s.id} index={i} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/distribution/shipments/${s.id}`)}>
                    <td className="px-5 py-3"><p className="font-medium">{s.shipment_number}</p><p className="text-xs text-muted-foreground">{s.order_number ?? 'Manual'} · {formatCount(s.item_count)} units</p></td>
                    <td className="max-w-56 px-3 py-3"><p className="truncate">{s.customer_name ?? s.recipient_name ?? '—'}</p><p className="truncate text-xs text-muted-foreground">{s.destination_address}</p></td>
                    <td className="px-3 py-3"><ShipmentPill status={s.status} delayed={s.is_delayed} /></td>
                    <td className="px-3 py-3 text-muted-foreground">{s.warehouse_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{s.carrier || s.driver_name || '—'}{s.tracking_number && <span className="block text-xs">{s.tracking_number}</span>}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.actual_delivery ? formatDay(s.actual_delivery) : s.estimated_delivery ? `ETA ${timeAgo(s.estimated_delivery)}` : '—'}</td>
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

export default function ShipmentsPage() {
  return <Suspense fallback={<TableSkeleton rows={6} cols={5} />}><ShipmentsContent /></Suspense>
}
