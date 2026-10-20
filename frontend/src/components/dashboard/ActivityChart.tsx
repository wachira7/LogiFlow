// src/components/dashboard/ActivityChart.tsx
// Last 14 days of operations as an area chart; pick which series to show.
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TrendPoint } from '@/types/dashboard.types'

const SERIES = [
  { key: 'stock_movements', label: 'Stock moves', color: 'var(--brand)' },
  { key: 'orders', label: 'Orders', color: 'var(--info)' },
  { key: 'units_produced', label: 'Units made', color: 'var(--success)' },
  { key: 'deliveries', label: 'Deliveries', color: 'var(--warning)' },
] as const

type SeriesKey = (typeof SERIES)[number]['key']

export function ActivityChart({ trend }: { trend: TrendPoint[] }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<SeriesKey>('stock_movements')
  const series = SERIES.find((s) => s.key === active)!
  const total = trend.reduce((sum, p) => sum + (p[active] ?? 0), 0)
  const data = trend.map((p) => ({ ...p, label: new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }))

  return (
    <Panel
      icon={Activity}
      title="Last 14 days"
      description={`${formatCount(total)} ${series.label.toLowerCase()} in total`}
      delay={0.1}
      action={
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Chart series">
          {SERIES.map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={active === s.key}
              onClick={() => setActive(s.key)}
              className={cn('relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors', active === s.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {active === s.key && <motion.span layoutId="chart-series" className="absolute inset-0 rounded-md bg-card shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
            </button>
          ))}
        </div>
      }
    >
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${active}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={series.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={40} />
            <Tooltip
              cursor={{ stroke: series.color, strokeOpacity: 0.3 }}
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--popover-foreground)' }}
              formatter={(v) => [formatCount(Number(v)), series.label]}
            />
            <Area
              key={active}
              type="monotone"
              dataKey={active}
              stroke={series.color}
              strokeWidth={2.5}
              fill={`url(#fill-${active})`}
              isAnimationActive={!reduce}
              animationDuration={900}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
