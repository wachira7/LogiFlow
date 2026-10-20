// src/app/(app)/analytics/warehousing/page.tsx
'use client'

import { ArrowRightLeft, Boxes, Clock, Route, Timer, Truck } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger } from '@/components/app/motion'
import { BarList, KpiCard, TrendChart, rateChange } from '@/components/analytics/Charts'
import { ReportShell } from '@/components/analytics/ReportShell'
import { formatCount } from '@/lib/format'

export default function WarehousingAnalyticsPage() {
  return (
    <ReportShell>
      {({ warehousing: w, series }, days) => (
        <>
          <AppStagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label="Transfers completed" icon={ArrowRightLeft} metric={w.transfers_completed} days={days} />
            <KpiCard label="Units moved" icon={Boxes} tone="success" metric={w.units_moved} days={days} />
            <KpiCard label="Avg transfer time" icon={Timer} tone="info" days={days} lowerIsBetter
              metric={w.avg_transfer_days.value === null ? undefined : { value: w.avg_transfer_days.value, previous: w.avg_transfer_days.previous ?? 0, change: rateChange(w.avg_transfer_days) }}
              value={w.avg_transfer_days.value} format={(n) => (n < 0.1 ? 'Same day' : `${n.toFixed(1)} d`)} hint="No completed transfers yet" />
            <KpiCard label="On the road" icon={Truck} tone="warning" value={w.in_transit} days={days} hint={`${w.pending} awaiting approval`} />
          </AppStagger>

          <Panel title="Transfers completed" description="Each day" delay={0.1}>
            <TrendChart dates={series.dates} series={[{ key: 'transfers', label: 'Transfers', color: 'var(--brand)', values: series.transfers }]} />
          </Panel>

          <Panel icon={Route} title="Busiest routes" description={`Last ${days} days, by number of transfers`} delay={0.15}>
            <BarList items={w.routes.map((r) => ({ label: `${r.from} → ${r.to}`, sub: `${formatCount(r.units)} units`, value: r.transfers }))} empty="No transfers completed in this period." />
          </Panel>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />Transfer time runs from request to receipt.</p>
        </>
      )}
    </ReportShell>
  )
}
