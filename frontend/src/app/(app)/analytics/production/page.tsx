// src/app/(app)/analytics/production/page.tsx
'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, Factory, Layers, Timer } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger } from '@/components/app/motion'
import { BarList, KpiCard, TrendChart, rateChange } from '@/components/analytics/Charts'
import { ReportShell } from '@/components/analytics/ReportShell'
import { formatCount } from '@/lib/format'

export default function ProductionAnalyticsPage() {
  return (
    <ReportShell>
      {({ production: p, series }, days) => (
        <>
          <AppStagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label="Units produced" icon={Factory} metric={p.units_produced} days={days} />
            <KpiCard label="Runs completed" icon={CheckCircle2} tone="success" metric={p.runs_completed} days={days} />
            <KpiCard label="Avg cycle time" icon={Timer} tone="info" days={days} lowerIsBetter
              metric={p.avg_cycle_hours.value === null ? undefined : { value: p.avg_cycle_hours.value, previous: p.avg_cycle_hours.previous ?? 0, change: rateChange(p.avg_cycle_hours) }}
              value={p.avg_cycle_hours.value} format={(n) => (n < 0.1 ? '< 0.1 h' : `${n.toFixed(1)} h`)} hint="No completed runs yet" />
            <KpiCard label="On the floor" icon={Clock} tone="warning" value={p.in_progress} days={days} hint={`${p.planned} planned next`} />
          </AppStagger>

          {p.overdue > 0 && (
            <Link href="/production/orders?status=IN_PROGRESS" className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertTriangle className="h-4 w-4" />{p.overdue} {p.overdue === 1 ? 'run is' : 'runs are'} past the target end date.
            </Link>
          )}

          <Panel title="Units produced" description="Each day, counted when a run completes" delay={0.1}>
            <TrendChart dates={series.dates} series={[{ key: 'units_produced', label: 'Units produced', color: 'var(--success)', values: series.units_produced }]} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel icon={Factory} title="What you made most" delay={0.15}>
              <BarList items={p.top_products.map((t) => ({ label: t.name, sub: `${t.runs} ${t.runs === 1 ? 'run' : 'runs'}`, value: t.units }))} color="bg-success" empty="No runs completed in this period." />
            </Panel>
            <Panel icon={Layers} title="Materials used" description="By completed runs" delay={0.2}>
              <BarList items={p.materials_used.map((m) => ({ label: m.name, value: m.units }))} color="bg-warning" empty="No materials used in this period." />
            </Panel>
          </div>
          <p className="text-xs text-muted-foreground">{formatCount(p.runs_completed.previous)} runs completed in the {days} days before.</p>
        </>
      )}
    </ReportShell>
  )
}
