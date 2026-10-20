// src/components/production/MaterialsList.tsx
// What upcoming production runs need from stock, and where it falls short.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Layers, PackageCheck, PackageX } from 'lucide-react'
import { useProductionMaterials, useProductionOrders } from '@/hooks/useProduction'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportButton, type CsvColumn } from '@/components/shared/ExportButton'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { MotionRow } from '@/components/app/motion'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MaterialRequirement } from '@/types/production.types'

const columns: CsvColumn<MaterialRequirement>[] = [
  { header: 'Material', value: (r) => r.product_name },
  { header: 'SKU', value: (r) => r.product_sku },
  { header: 'Warehouse', value: (r) => r.warehouse_name },
  { header: 'Orders', value: (r) => r.order_count },
  { header: 'Needed', value: (r) => r.required_quantity },
  { header: 'In stock', value: (r) => r.available_stock },
  { header: 'Short by', value: (r) => r.shortage },
]

export function MaterialsList() {
  const { materialRequirements, error, fetchMaterialRequirements } = useProductionOrders()
  const { insufficientStock, fetchInsufficientStock } = useProductionMaterials()
  const [ready, setReady] = useState(false)

  const load = () => Promise.allSettled([fetchMaterialRequirements(), fetchInsufficientStock()]).finally(() => setReady(true))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = materialRequirements?.material_requirements ?? []
  const blocked = insufficientStock?.materials_with_insufficient_stock ?? []
  const blockedOrders = new Map(blocked.map((b) => [b.production_order_id, b.production_order]))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="Materials"
        description="Raw materials needed by orders that haven’t started yet. Started orders already took theirs from stock."
        actions={<ExportButton filename={`material-requirements-${today}`} rows={rows} columns={columns} />}
      />

      {error && ready && <ErrorBanner title="Couldn’t load material requirements" message={error} onRetry={load} />}

      {!ready ? (
        <StatGridSkeleton count={3} className="lg:grid-cols-3" />
      ) : (
        <StatGrid className="lg:grid-cols-3">
          <StatCard label="Materials needed" value={materialRequirements?.total_materials ?? 0} icon={Layers} tone="brand" hint="Product and warehouse pairs" />
          <StatCard label="Short" value={materialRequirements?.materials_with_shortage ?? 0} icon={PackageX} tone={(materialRequirements?.materials_with_shortage ?? 0) > 0 ? 'danger' : 'success'} hint="Need restocking" />
          <StatCard label="Orders blocked" value={blockedOrders.size} icon={AlertTriangle} tone={blockedOrders.size ? 'warning' : 'success'} hint="Can’t start until restocked" />
        </StatGrid>
      )}

      {ready && blockedOrders.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Blocked:</span>
          {[...blockedOrders.entries()].map(([id, number]) => (
            <Link key={id} href={`/production/orders/${id}`} className="rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm hover:text-brand">{number}</Link>
          ))}
        </div>
      )}

      {!ready ? (
        <TableSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<PackageCheck />} title="Nothing needed right now" description="Planned production orders with raw materials will show their requirements here." />
      ) : (
        <Panel bodyClassName="p-0" delay={0.1}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Material</th>
                  <th className="px-3 py-3 font-medium">Warehouse</th>
                  <th className="px-3 py-3 text-right font-medium">Orders</th>
                  <th className="px-3 py-3 font-medium">Coverage</th>
                  <th className="px-5 py-3 text-right font-medium">Short by</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => {
                  const coverage = r.required_quantity ? Math.min(100, (r.available_stock / r.required_quantity) * 100) : 100
                  return (
                    <MotionRow key={`${r.product_id}-${r.warehouse_id}`} index={i} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <p className="font-medium">{r.product_name}</p>
                        <p className="text-xs text-muted-foreground">{r.product_sku}</p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{r.warehouse_name}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.order_count}</td>
                      <td className="w-64 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <span className={cn('block h-full origin-left animate-[grow-x_0.9s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full', r.shortage ? 'bg-danger' : 'bg-success')} style={{ width: `${coverage}%` }} />
                          </span>
                          <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{formatCount(r.available_stock)} / {formatCount(r.required_quantity)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.shortage ? <span className="font-semibold tabular-nums text-danger">{formatCount(r.shortage)}</span> : <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                      </td>
                    </MotionRow>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
