// src/app/(app)/inventory/warehouses/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, MapPin, Plus, UserRound } from 'lucide-react'
import { stockService, type StockWarehouse } from '@/services/stockService'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, FilterChips, PageHeader, StatusPill, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { UtilizationRing } from '@/components/inventory/UtilizationRing'
import { formatCount, formatMoney } from '@/lib/format'

const FILTERS = [['active', 'Active'], ['all', 'All'], ['inactive', 'Inactive']] as const

export default function WarehousesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<StockWarehouse[] | null>(null)
  const [filter, setFilter] = useState<'active' | 'all' | 'inactive'>('active')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { stockService.warehouses().then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load warehouses.')) }, [])
  const shown = (rows ?? []).filter((w) => filter === 'all' || (filter === 'active') === w.is_active)

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} title="Warehouses" description="Where your stock is kept, and how full each place is."
        actions={<Button onClick={() => router.push('/inventory/warehouses/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New warehouse</Button>} />
      {rows && rows.some((w) => !w.is_active) && <FadeIn delay={0.05}><FilterChips id="warehouses" options={FILTERS} value={filter} onChange={setFilter} /></FadeIn>}
      {error && <ErrorBanner title="Couldn’t load warehouses" message={error} />}
      {!rows ? <TableSkeleton rows={3} cols={3} /> : rows.length === 0 ? (
        <EmptyState icon={<Building2 />} title="No warehouses yet" description="Add the places you keep stock. Each product can be stocked in several."
          action={<Button onClick={() => router.push('/inventory/warehouses/new')} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New warehouse</Button>} />
      ) : (
        <AppStagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((w) => (
            <AppStaggerItem key={w.id}>
              <Link href={`/inventory/warehouses/${w.id}`} className={`card-lift flex h-full flex-col gap-4 rounded-xl border bg-card p-5 ${w.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="truncate font-semibold">{w.name}</p>{w.code && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{w.code}</span>}</div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{[w.city, w.country].filter(Boolean).join(', ') || w.address || 'No address'}</p>
                  </div>
                  {w.is_active ? <UtilizationRing value={w.utilization_percentage} /> : <StatusPill tone="neutral">Inactive</StatusPill>}
                </div>
                <div className="mt-auto grid grid-cols-2 gap-3 border-t pt-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Stock value</p><p className="font-semibold tabular-nums">{formatMoney(w.total_stock_value, undefined, { maximumFractionDigits: 0 })}</p></div>
                  <div><p className="text-xs text-muted-foreground">Products</p><p className="font-semibold tabular-nums">{formatCount(w.total_products)}</p></div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />{w.manager_name || 'No manager assigned'}</p>
              </Link>
            </AppStaggerItem>
          ))}
        </AppStagger>
      )}
    </div>
  )
}
