// src/components/dashboard/OpsToday.tsx
// The operations picture on the overview: deliveries today, exceptions, routes on the road and a live map.
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Clock, Radar, Route, Truck } from 'lucide-react'
import { Panel } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, AnimatedNumber, ease } from '@/components/app/motion'
import { LiveMap } from '@/components/ops/LiveMap'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'
import type { OpsToday as Ops } from '@/types/dashboard.types'

function Tile({ href, icon: Icon, label, value, hint, tone }: { href: string; icon: typeof Truck; label: string; value: number; hint: string; tone: string }) {
  return (
    <AppStaggerItem>
      <Link href={href} className="card-lift flex h-full items-start gap-3 rounded-xl border bg-card p-3.5">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tone)}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums"><AnimatedNumber value={value} /></p>
          <p className="mt-1 text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </Link>
    </AppStaggerItem>
  )
}

export function OpsToday({ ops }: { ops: Ops }) {
  const quiet = !ops.in_flight && !ops.delivered_today && !ops.open_exceptions && !ops.routes_running
  return (
    <Panel icon={Radar} title="Operations today" description={quiet ? 'Nothing on the road yet today' : `${ops.in_flight} shipments in flight · ${ops.routes_running} ${ops.routes_running === 1 ? 'route' : 'routes'} running`}
      delay={0.08} action={<Link href="/ops" className="text-sm font-medium text-brand hover:underline">Ops board</Link>}>
      <div className="space-y-5">
        <AppStagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile href="/distribution/shipments?status=SHIPPED" icon={Truck} label="Out for delivery" value={ops.out_for_delivery} hint={`${ops.in_flight} in flight overall`} tone="bg-info-soft text-info" />
          <Tile href="/ops" icon={Clock} label="Late" value={ops.late} hint={ops.late ? 'Past their ETA' : 'All on time'} tone={ops.late ? 'bg-danger-soft text-danger' : 'bg-muted text-muted-foreground'} />
          <Tile href="/distribution/shipments?status=DELIVERED" icon={CheckCircle2} label="Delivered today" value={ops.delivered_today} hint={ops.on_time_today == null ? 'No ETAs to compare' : `${ops.on_time_today}% on time`} tone="bg-success-soft text-success" />
          <Tile href="/ops/exceptions" icon={AlertTriangle} label="Open exceptions" value={ops.open_exceptions}
            hint={ops.urgent_exceptions ? `${ops.urgent_exceptions} urgent` : ops.unassigned_exceptions ? `${ops.unassigned_exceptions} without an owner` : 'Nothing urgent'}
            tone={ops.urgent_exceptions ? 'bg-danger-soft text-danger' : ops.open_exceptions ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground'} />
        </AppStagger>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Route className="h-3.5 w-3.5" />On the road</p>
            {ops.routes.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">No routes running. <Link href="/distribution/routes" className="font-medium text-brand hover:underline">Plan one</Link></p>
            ) : ops.routes.map((r) => (
              <Link key={r.id} href={`/distribution/routes/${r.id}`} className="block rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{r.name}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{r.done}/{r.total}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%` }} transition={{ duration: 0.8, ease }} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{[r.driver, r.vehicle].filter(Boolean).join(' · ') || 'No driver'}{r.started_at ? ` · started ${timeAgo(r.started_at)}` : ''}</p>
              </Link>
            ))}
          </div>
          <div className="lg:col-span-3">
            <LiveMap className="h-56 lg:h-full lg:min-h-56" empty="Drivers appear here while they share location from the driver app."
              markers={ops.live_units.map((u) => ({ id: u.id, latitude: u.latitude, longitude: u.longitude, label: u.label, sub: timeAgo(u.recorded_at), heading: u.heading }))} />
          </div>
        </div>
      </div>
    </Panel>
  )
}
