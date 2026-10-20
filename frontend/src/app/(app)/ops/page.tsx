// src/app/(app)/ops/page.tsx
// Ops board: every shipment in flight by stage, running routes, open exceptions and the activity feed.
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Activity, AlertTriangle, CheckCircle2, Clock, MapPin, Radar, RefreshCw, Route, Siren, Truck, User } from 'lucide-react'
import { opsService, type Board, type BoardCard, type OpsEvent } from '@/services/opsService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton, StatusPill } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, ease } from '@/components/app/motion'
import { EventIcon, SeverityPill, age, minutesSince } from '@/components/ops/status'
import { cn } from '@/lib/utils'
import { useLiveRefresh, useRealtime, useRealtimeStatus } from '@/lib/realtime'
import { formatDateTime, timeAgo } from '@/lib/format'

const COLUMN_TONE: Record<string, string> = {
  PENDING: 'bg-muted-foreground', PICKED: 'bg-info', PACKED: 'bg-brand', SHIPPED: 'bg-warning', DELIVERED: 'bg-success', FAILED: 'bg-danger',
}
const REFRESH_MS = 30000

function Card({ c }: { c: BoardCard }) {
  const reduce = useReducedMotion()
  return (
    <motion.div layout={!reduce} layoutId={reduce ? undefined : c.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease }}>
      <Link href={`/distribution/shipments/${c.id}`}
        className={cn('card-lift block rounded-xl border bg-card p-3 text-sm shadow-sm', c.is_delayed && 'border-danger/40', c.open_exceptions > 0 && !c.is_delayed && 'border-warning/50')}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium">{c.number}</span>
          <span className="flex gap-1">
            {c.open_exceptions > 0 && <StatusPill tone="warning"><AlertTriangle className="h-3 w-3" />{c.open_exceptions}</StatusPill>}
            {c.is_delayed && <StatusPill tone="danger" pulse>Late</StatusPill>}
          </span>
        </div>
        <p className="mt-1.5 truncate font-medium">{c.customer || 'No customer'}</p>
        {c.destination && <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{c.destination}</p>}
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1 truncate">{c.driver || c.vehicle ? <><User className="h-3 w-3 shrink-0" />{[c.driver, c.vehicle].filter(Boolean).join(' · ')}</> : <span className="text-warning">No driver yet</span>}</p>
          {(c.route || c.actual_delivery || c.estimated_delivery) && (
            <p className="flex items-center justify-between gap-2">
              <span className="truncate">{c.route ? `${c.route.name} · stop ${c.route.stop}` : ''}</span>
              <span className={cn('shrink-0', c.is_delayed && 'font-medium text-danger')} title={formatDateTime(c.actual_delivery ?? c.estimated_delivery)}>
                {c.actual_delivery ? timeAgo(c.actual_delivery) : c.estimated_delivery ? `ETA ${timeAgo(c.estimated_delivery)}` : ''}
              </span>
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

export default function OpsBoardPage() {
  const [board, setBoard] = useState<Board | null>(null)
  const [feed, setFeed] = useState<OpsEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [, tick] = useState(0)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const [b, a] = await Promise.all([opsService.board(), opsService.activity({ limit: '15' })])
      setBoard(b); setFeed(a.results); setError(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Couldn’t load the board.') }
    finally { setRefreshing(false) }
  }, [])

  // Live events refresh the board straight away; polling is the fallback when the socket is down
  const status = useRealtimeStatus()
  useLiveRefresh(['shipment.event', 'exception.updated', 'route.updated'], load)
  useRealtime('fleet.position', (m) => {
    const p = m.data as { route_id: string | null; latitude: number; longitude: number; recorded_at: string; speed_kmh: number | null; heading: number | null }
    if (!p.route_id) return
    setBoard((b) => b && { ...b, routes: b.routes.map((r) => r.id === p.route_id ? { ...r, last_position: { ...p, live: true } } : r) })
  })
  useEffect(() => {
    load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); else tick((n) => n + 1) }, status === 'live' ? REFRESH_MS * 4 : REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [load, status])

  const s = board?.summary
  return (
    <div className="space-y-6">
      <PageHeader icon={Radar} title="Ops board" description={board ? <>Everything in flight right now · updated {timeAgo(board.generated_at)}</> : 'Everything in flight right now.'}
        actions={<>
          <Button variant="outline" onClick={load} disabled={refreshing}><RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />Refresh</Button>
          <Button asChild className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/ops/exceptions"><Siren className="mr-2 h-4 w-4" />Exceptions</Link></Button>
        </>} />
      {error && <ErrorBanner title="Couldn’t load the board" message={error} onRetry={load} />}

      {!s ? <StatGridSkeleton count={4} /> : (
        <StatGrid>
          <StatCard label="In flight" value={s.in_flight} icon={Truck} tone="brand" hint={`${s.routes_running} ${s.routes_running === 1 ? 'route' : 'routes'} on the road`} />
          <StatCard label="Late" value={s.late} icon={Clock} tone={s.late ? 'danger' : 'neutral'} hint="Past their ETA" href="/distribution/shipments?status=SHIPPED" />
          <StatCard label="Delivered today" value={s.delivered_today} icon={CheckCircle2} tone="success" hint={s.on_time_today == null ? 'No ETAs to compare' : `${s.on_time_today}% on time`} />
          <StatCard label="Open exceptions" value={s.open_exceptions} icon={AlertTriangle} tone={s.critical_exceptions ? 'danger' : 'warning'} hint={s.critical_exceptions ? `${s.critical_exceptions} high or critical` : 'Nothing urgent'} href="/ops/exceptions" />
        </StatGrid>
      )}

      {/* Stage columns: scroll sideways on small screens */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {!board ? (
          <div className="grid auto-cols-[15.5rem] grid-flow-col gap-3 xl:grid-flow-row xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
        ) : (
          <LayoutGroup>
            <div className="grid snap-x snap-mandatory auto-cols-[15.5rem] grid-flow-col gap-3 xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-6">
              {board.columns.map((col) => (
                <section key={col.key} aria-label={col.label} className="flex max-h-[34rem] snap-start flex-col rounded-xl border bg-muted/30">
                  <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-semibold"><span className={cn('h-2 w-2 rounded-full', COLUMN_TONE[col.key])} />{col.label}</span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums shadow-sm">{col.count}</span>
                  </header>
                  <div className="flex-1 space-y-2 overflow-y-auto p-2">
                    <AnimatePresence initial={false}>
                      {col.cards.map((c) => <Card key={c.id} c={c} />)}
                    </AnimatePresence>
                    {col.count === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nothing here</p>}
                    {col.count > col.cards.length && <Link href={`/distribution/shipments?status=${col.key}`} className="block py-1 text-center text-xs font-medium text-brand hover:underline">+{col.count - col.cards.length} more</Link>}
                  </div>
                </section>
              ))}
            </div>
          </LayoutGroup>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel icon={Route} title="Routes on the road" bodyClassName="p-0" delay={0.1} action={<Link href="/ops/fleet" className="text-sm font-medium text-brand hover:underline">Live map</Link>}>
          {!board ? <div className="p-5"><Skeleton className="h-24" /></div> : board.routes.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No routes running.</p> : (
            <AppStagger className="divide-y">
              {board.routes.map((r) => {
                const seen = minutesSince(r.last_position?.recorded_at)
                return (
                  <AppStaggerItem key={r.id}>
                    <Link href={`/distribution/routes/${r.id}`} className="block px-4 py-3 hover:bg-muted/40 sm:px-5">
                      <div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{r.name}</p><span className="text-xs tabular-nums text-muted-foreground">{r.done}/{r.total} stops</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%` }} transition={{ duration: 0.8, ease }} /></div>
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">{[r.driver, r.vehicle].filter(Boolean).join(' · ') || 'No driver'} · {seen == null ? 'no GPS yet' : seen > 15 ? <span className="text-warning">last seen {age(seen)} ago</span> : 'live'}
                        {r.next_stop ? ` · next: ${r.next_stop.address}` : ''}</p>
                    </Link>
                  </AppStaggerItem>
                )
              })}
            </AppStagger>
          )}
        </Panel>

        <Panel icon={AlertTriangle} title="Needs attention" bodyClassName="p-0" delay={0.15} action={<Link href="/ops/exceptions" className="text-sm font-medium text-brand hover:underline">All</Link>}>
          {!board ? <div className="p-5"><Skeleton className="h-24" /></div> : board.exceptions.length === 0 ? (
            <p className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-muted-foreground"><CheckCircle2 className="h-6 w-6 text-success" />No open exceptions.</p>
          ) : (
            <AppStagger className="divide-y">
              {board.exceptions.map((e) => (
                <AppStaggerItem key={e.id}>
                  <Link href={`/ops/exceptions?open=${e.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/40 sm:px-5">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.type_label} · open {age(e.age_minutes)}{e.owner_name ? ` · ${e.owner_name}` : ' · unassigned'}</p></div>
                    <SeverityPill severity={e.severity} />
                  </Link>
                </AppStaggerItem>
              ))}
            </AppStagger>
          )}
        </Panel>

        <Panel icon={Activity} title="Activity" bodyClassName="p-0" delay={0.2}>
          {!feed ? <div className="p-5"><Skeleton className="h-24" /></div> : feed.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing has happened yet today.</p> : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {feed.map((e) => (
                <li key={e.id}><Link href={`/distribution/shipments/${e.shipment.id}`} className="flex gap-3 px-4 py-2.5 hover:bg-muted/40 sm:px-5">
                  <EventIcon type={e.type} toStatus={e.to_status} className="h-7 w-7 ring-0" />
                  <div className="min-w-0"><p className="truncate text-sm"><span className="font-mono text-xs font-medium">{e.shipment.number}</span> {e.message}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(e.occurred_at)}{e.actor ? ` · ${e.actor}` : ''}</p></div>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
