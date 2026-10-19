// src/app/(app)/analytics/inventory/page.tsx
'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, History, Wallet } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger, MotionRow } from '@/components/app/motion'
import { BarList, Donut, KpiCard, Legend, TrendChart } from '@/components/analytics/Charts'
import { ReportShell } from '@/components/analytics/ReportShell'
import { formatCount, formatMoney } from '@/lib/format'

const money0 = (n: number) => formatMoney(n, undefined, { maximumFractionDigits: 0 })
const TYPE_LABEL: Record<string, string> = {
  RECEIPT: 'Receipts', SHIPMENT: 'Shipments', ADJUSTMENT: 'Adjustments', TRANSFER: 'Transfers', RETURN: 'Returns', PRODUCTION: 'Production',
}

export default function InventoryAnalyticsPage() {
  return (
    <ReportShell>
      {({ inventory: inv, series }, days) => (
        <>
          <AppStagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label="Stock value" icon={Wallet} value={inv.stock_value} format={money0} days={days} hint={`${formatCount(inv.products)} active products`} />
            <KpiCard label="Stock movements" icon={History} tone="info" metric={inv.movements} days={days} />
            <KpiCard label="Units in" icon={ArrowDownToLine} tone="success" value={inv.units_in} days={days} hint={`Last ${days} days`} />
            <KpiCard label="Units out" icon={ArrowUpFromLine} tone="warning" value={inv.units_out} days={days} hint={`Last ${days} days`} />
          </AppStagger>

          <Panel title="Stock flow" description="Units in and out each day" delay={0.1}
            action={<Legend series={[{ label: 'In', color: 'var(--success)' }, { label: 'Out', color: 'var(--danger)' }]} />}>
            <TrendChart dates={series.dates} series={[
              { key: 'stock_in', label: 'Units in', color: 'var(--success)', values: series.stock_in },
              { key: 'stock_out', label: 'Units out', color: 'var(--danger)', values: series.stock_out },
            ]} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel icon={Boxes} title="Value by warehouse" delay={0.15}>
              <BarList items={inv.by_warehouse.map((w) => ({ label: w.name, sub: `${formatCount(w.units)} units`, value: w.value }))} format={money0} empty="No warehouses yet." />
            </Panel>
            <Panel icon={History} title="Movements by type" description={`Last ${days} days`} delay={0.2}>
              <Donut data={Object.entries(inv.movements_by_type).map(([k, v]) => ({ label: TYPE_LABEL[k] ?? k, value: v }))} center="movements" />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel icon={Wallet} title="Most valuable stock" delay={0.25}>
              <BarList items={inv.top_products_by_value.map((p) => ({ label: p.name, sub: `${formatCount(p.units)} units`, value: p.value }))} format={money0} empty="No stock yet." />
            </Panel>
            <Panel icon={AlertTriangle} title="Low stock" description={`${inv.low_stock} at or below reorder point`} delay={0.3} bodyClassName="p-0"
              action={<Link href="/inventory/inventory-items" className="text-sm font-medium text-brand hover:underline">Restock</Link>}>
              {inv.low_stock_items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Everything is above its reorder point.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {inv.low_stock_items.map((i, idx) => (
                      <MotionRow key={`${i.sku}-${i.warehouse}`} index={idx}>
                        <td className="px-5 py-2.5"><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.warehouse}</p></td>
                        <td className="px-5 py-2.5 text-right tabular-nums"><span className="font-semibold text-danger">{formatCount(i.quantity)}</span><span className="text-xs text-muted-foreground"> / {formatCount(i.reorder_point)}</span></td>
                      </MotionRow>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </>
      )}
    </ReportShell>
  )
}
