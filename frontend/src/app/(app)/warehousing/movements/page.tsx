// src/app/(app)/warehousing/movements/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Boxes, Route, Truck, Wallet } from 'lucide-react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem } from '@/components/app/motion'
import { formatCount, formatMoney, timeAgo, toNumber } from '@/lib/format'

export default function StockMovementsPage() {
  const { stockMovements, error, fetchStockMovements } = useWarehouseTransfers()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchStockMovements().catch(() => {}).finally(() => setReady(true))
  }, [fetchStockMovements])

  const routes = stockMovements?.stock_movements ?? []
  const totals = routes.reduce(
    (acc, r) => ({ transfers: acc.transfers + r.transfer_count, units: acc.units + (r.total_quantity ?? 0), value: acc.value + toNumber(r.total_value) }),
    { transfers: 0, units: 0, value: 0 },
  )
  const busiest = Math.max(1, ...routes.map((r) => r.transfer_count))

  return (
    <div className="space-y-6">
      <PageHeader icon={Route} title="Stock movements" description="Completed transfers grouped by route, busiest first." />

      {error && ready && <ErrorBanner title="Couldn’t load movements" message={error} onRetry={() => fetchStockMovements()} />}

      {!ready ? (
        <StatGridSkeleton count={4} />
      ) : (
        <StatGrid>
          <StatCard label="Routes used" value={stockMovements?.total_movement_pairs ?? 0} icon={Route} tone="brand" hint="Warehouse pairs" />
          <StatCard label="Completed transfers" value={totals.transfers} icon={Truck} tone="info" />
          <StatCard label="Units moved" value={totals.units} icon={Boxes} tone="success" />
          <StatCard label="Value moved" value={totals.value} icon={Wallet} tone="warning" format={(n) => formatMoney(n, undefined, { maximumFractionDigits: 0 })} />
        </StatGrid>
      )}

      {!ready ? (
        <TableSkeleton rows={4} cols={4} />
      ) : routes.length === 0 ? (
        <EmptyState icon={<Route />} title="No completed transfers yet" description="Once transfers are marked received, the routes they used show up here." />
      ) : (
        <Panel icon={Truck} title="Routes" description="Bars compare how often each route is used" bodyClassName="p-0">
          <AppStagger className="divide-y">
            {routes.map((r) => (
              <AppStaggerItem key={`${r.source_warehouse}-${r.destination_warehouse}`} className="space-y-2.5 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex min-w-0 items-center gap-2 font-medium">
                    <span className="truncate">{r.source_warehouse}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
                    <span className="truncate">{r.destination_warehouse}</span>
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {r.transfer_count} {r.transfer_count === 1 ? 'transfer' : 'transfers'} · {formatCount(r.total_quantity)} units · {formatMoney(r.total_value)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full origin-left animate-[grow-x_0.9s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-brand" style={{ width: `${(r.transfer_count / busiest) * 100}%` }} />
                  </div>
                  {r.last_transfer_at && <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">Last {timeAgo(r.last_transfer_at)}</span>}
                </div>
              </AppStaggerItem>
            ))}
          </AppStagger>
        </Panel>
      )}
    </div>
  )
}
