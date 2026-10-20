// src/app/(app)/analytics/distribution/page.tsx
'use client'

import { CheckCircle2, ClipboardList, Timer, Truck, Users, Wallet } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger } from '@/components/app/motion'
import { BarList, Donut, KpiCard, Legend, TrendChart, rateChange } from '@/components/analytics/Charts'
import { ReportShell } from '@/components/analytics/ReportShell'
import { formatCount, formatMoney } from '@/lib/format'

const money0 = (n: number) => formatMoney(n, undefined, { maximumFractionDigits: 0 })
const STATUS_LABEL: Record<string, string> = { NEW: 'New', PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' }

export default function DistributionAnalyticsPage() {
  return (
    <ReportShell>
      {({ distribution: d, series }, days) => (
        <>
          <AppStagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label="Revenue" icon={Wallet} metric={d.revenue} days={days} format={money0} />
            <KpiCard label="Orders" icon={ClipboardList} tone="info" metric={d.orders} days={days} />
            <KpiCard label="On-time delivery" icon={CheckCircle2} tone="success" days={days}
              metric={d.on_time_rate.value === null ? undefined : { value: d.on_time_rate.value, previous: d.on_time_rate.previous ?? 0, change: rateChange(d.on_time_rate) }}
              value={d.on_time_rate.value} format={(n) => `${n.toFixed(1)}%`} hint="No deliveries with an ETA yet" />
            <KpiCard label="Avg delivery time" icon={Timer} tone="warning" days={days} lowerIsBetter
              metric={d.avg_delivery_days.value === null ? undefined : { value: d.avg_delivery_days.value, previous: d.avg_delivery_days.previous ?? 0, change: rateChange(d.avg_delivery_days) }}
              value={d.avg_delivery_days.value} format={(n) => `${n.toFixed(1)} d`} hint="No deliveries yet" />
          </AppStagger>

          <Panel title="Orders and deliveries" description="Each day" delay={0.1}
            action={<Legend series={[{ label: 'Orders', color: 'var(--info)' }, { label: 'Deliveries', color: 'var(--success)' }]} />}>
            <TrendChart dates={series.dates} series={[
              { key: 'orders', label: 'Orders', color: 'var(--info)', values: series.orders },
              { key: 'deliveries', label: 'Deliveries', color: 'var(--success)', values: series.deliveries },
            ]} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel icon={ClipboardList} title="Orders by status" description={`Created in the last ${days} days`} delay={0.15}>
              <Donut data={Object.entries(d.orders_by_status).map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v }))} center="orders" />
            </Panel>
            <Panel icon={Users} title="Top customers" description="By order value" delay={0.2}>
              <BarList items={d.top_customers.map((c) => ({ label: c.name, sub: `${c.orders} ${c.orders === 1 ? 'order' : 'orders'}`, value: c.revenue }))} format={money0} empty="No orders in this period." />
            </Panel>
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="h-4 w-4 text-brand" />{formatCount(d.open_shipments)} shipments are on their way right now.</p>
        </>
      )}
    </ReportShell>
  )
}
