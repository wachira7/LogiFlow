// src/app/(app)/analytics/page.tsx
'use client'

import Link from 'next/link'
import { ArrowRight, Boxes, ClipboardList, Factory, Package, Truck, Wallet, Warehouse } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger } from '@/components/app/motion'
import { KpiCard, Legend, TrendChart } from '@/components/analytics/Charts'
import { ReportShell } from '@/components/analytics/ReportShell'
import { formatCount, formatMoney } from '@/lib/format'
import type { AnalyticsReport } from '@/types/analytics.types'

const money0 = (n: number) => formatMoney(n, undefined, { maximumFractionDigits: 0 })

function ModuleCard({ href, icon: Icon, title, lines }: { href: string; icon: typeof Package; title: string; lines: [string, string][] }) {
  return (
    <Link href={href} className="card-lift group block rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon className="h-4 w-4" /></span>{title}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {lines.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Link>
  )
}

function Overview({ r, days }: { r: AnalyticsReport; days: number }) {
  const { distribution: d, inventory: inv, production: p, warehousing: w, series } = r
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`)
  return (
    <>
      <AppStagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue" icon={Wallet} metric={d.revenue} days={days} format={money0} />
        <KpiCard label="Orders" icon={ClipboardList} tone="info" metric={d.orders} days={days} />
        <KpiCard label="Units produced" icon={Factory} tone="success" metric={p.units_produced} days={days} />
        <KpiCard label="Units transferred" icon={Warehouse} tone="warning" metric={w.units_moved} days={days} />
      </AppStagger>

      <Panel title="Orders and revenue" description={`Daily, last ${days} days`} delay={0.1}
        action={<Legend series={[{ label: 'Revenue', color: 'var(--brand)' }, { label: 'Orders', color: 'var(--info)' }]} />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <TrendChart dates={series.dates} series={[{ key: 'revenue', label: 'Revenue', color: 'var(--brand)', values: series.revenue }]} format={money0} />
          <TrendChart dates={series.dates} series={[{ key: 'orders', label: 'Orders', color: 'var(--info)', values: series.orders }]} />
        </div>
      </Panel>

      <Panel title="Stock flow" description="Units into and out of your warehouses each day" delay={0.15}
        action={<Legend series={[{ label: 'In', color: 'var(--success)' }, { label: 'Out', color: 'var(--danger)' }]} />}>
        <TrendChart dates={series.dates} series={[
          { key: 'stock_in', label: 'Units in', color: 'var(--success)', values: series.stock_in },
          { key: 'stock_out', label: 'Units out', color: 'var(--danger)', values: series.stock_out },
        ]} />
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleCard href={`/analytics/inventory?days=${days}`} icon={Package} title="Inventory" lines={[
          ['Stock value', money0(inv.stock_value)], ['Units on hand', formatCount(inv.stock_units)],
          ['Low-stock lines', formatCount(inv.low_stock)], ['Movements', formatCount(inv.movements.value)],
        ]} />
        <ModuleCard href={`/analytics/distribution?days=${days}`} icon={Truck} title="Distribution" lines={[
          ['Deliveries', formatCount(d.deliveries.value)], ['On time', pct(d.on_time_rate.value)],
          ['Avg delivery', d.avg_delivery_days.value === null ? '—' : `${d.avg_delivery_days.value} days`], ['Open shipments', formatCount(d.open_shipments)],
        ]} />
        <ModuleCard href={`/analytics/production?days=${days}`} icon={Factory} title="Production" lines={[
          ['Runs completed', formatCount(p.runs_completed.value)], ['In progress', formatCount(p.in_progress)],
          ['Avg cycle', p.avg_cycle_hours.value === null ? '—' : `${p.avg_cycle_hours.value} h`], ['Overdue', formatCount(p.overdue)],
        ]} />
        <ModuleCard href={`/analytics/warehousing?days=${days}`} icon={Boxes} title="Warehousing" lines={[
          ['Transfers done', formatCount(w.transfers_completed.value)], ['On the road', formatCount(w.in_transit)],
          ['Avg transfer', w.avg_transfer_days.value === null ? '—' : `${w.avg_transfer_days.value} days`], ['Awaiting approval', formatCount(w.pending)],
        ]} />
      </div>
    </>
  )
}

export default function AnalyticsOverviewPage() {
  return <ReportShell>{(r, days) => <Overview r={r} days={days} />}</ReportShell>
}
