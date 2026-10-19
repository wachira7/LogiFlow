// src/components/analytics/Charts.tsx
// Building blocks for the analytics pages: KPI cards with change, trend chart, bar list and donut.
'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { toneChip, type Tone } from '@/components/app/kit'
import { AnimatedNumber, AppStaggerItem } from '@/components/app/motion'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Metric, Rate } from '@/types/analytics.types'

/** "+12% vs previous 30 days"; `lowerIsBetter` flips the colours (e.g. delivery time). */
export function Delta({ change, days, lowerIsBetter = false }: { change: number | null; days: number; lowerIsBetter?: boolean }) {
  if (change === null || !Number.isFinite(change)) {
    return <span className="text-xs text-muted-foreground">No earlier data to compare</span>
  }
  const flat = Math.abs(change) < 0.5
  const good = flat ? null : (change > 0) !== lowerIsBetter
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good === null ? 'text-muted-foreground' : good ? 'text-success' : 'text-danger')}>
      <Icon className="h-3.5 w-3.5" />
      {flat ? 'No change' : `${change > 0 ? '+' : ''}${change.toFixed(change % 1 ? 1 : 0)}%`}
      <span className="font-normal text-muted-foreground">&nbsp;vs previous {days} days</span>
    </span>
  )
}

/** Percent change between two rates, null when either is missing. */
export const rateChange = (r: Rate) => (r.value === null || !r.previous ? null : ((r.value - r.previous) / r.previous) * 100)

export function KpiCard({
  label, icon: Icon, tone = 'brand', metric, value, format, days, lowerIsBetter, hint,
}: {
  label: string
  icon: LucideIcon
  tone?: Tone
  metric?: Metric
  value?: number | null
  format?: (n: number) => string
  days: number
  lowerIsBetter?: boolean
  hint?: string
}) {
  const v = metric ? metric.value : value
  return (
    <AppStaggerItem className="h-full">
      <div className="card-lift h-full rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneChip[tone])}><Icon className="h-4 w-4" /></span>
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {v === null || v === undefined ? '—' : <AnimatedNumber value={v} format={format} />}
        </p>
        <div className="mt-1">{metric ? <Delta change={metric.change} days={days} lowerIsBetter={lowerIsBetter} /> : hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div>
      </div>
    </AppStaggerItem>
  )
}

export type SeriesDef = { key: string; label: string; color: string; values: number[] }

/** Area chart over the period's dates; one or two series. */
export function TrendChart({ dates, series, height = 260, format = formatCount }: { dates: string[]; series: SeriesDef[]; height?: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion()
  const short = dates.length > 31
  const data = dates.map((d, i) => {
    const row: Record<string, number | string> = {
      label: new Date(d).toLocaleDateString(undefined, short ? { month: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' }),
    }
    for (const s of series) row[s.key] = s.values[i] ?? 0
    return row
  })
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} minTickGap={20} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
          <Tooltip
            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--popover-foreground)' }}
            formatter={(v, name) => [format(Number(v)), series.find((s) => s.key === name)?.label ?? String(name)]}
          />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.25} fill={`url(#grad-${s.key})`}
              isAnimationActive={!reduce} animationDuration={900} activeDot={{ r: 4, strokeWidth: 0 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {series.map((s) => <span key={s.label} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}
    </div>
  )
}

/** Horizontal bars that grow in, longest first. */
export function BarList({ items, format = formatCount, empty = 'Nothing in this period.', color = 'bg-brand' }: {
  items: { label: string; sub?: string; value: number }[]
  format?: (n: number) => string
  empty?: string
  color?: string
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <motion.li key={`${item.label}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}{item.sub && <span className="ml-1.5 text-xs text-muted-foreground">{item.sub}</span>}</span>
            <span className="shrink-0 font-medium tabular-nums">{format(item.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full origin-left animate-[grow-x_0.9s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full', color)} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </motion.li>
      ))}
    </ul>
  )
}

const DONUT_COLORS = ['var(--brand)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--muted-foreground)']

/** Donut with a legend; slices with zero are left out. */
export function Donut({ data, center }: { data: { label: string; value: number }[]; center?: string }) {
  const reduce = useReducedMotion()
  const slices = data.filter((d) => d.value > 0)
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (!total) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this period.</p>
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={!reduce} animationDuration={800}>
              {slices.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums">{formatCount(total)}</span>
          {center && <span className="text-[11px] text-muted-foreground">{center}</span>}
        </span>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {slices.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums">{formatCount(d.value)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
