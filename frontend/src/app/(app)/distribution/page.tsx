// src/app/(app)/distribution/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, ClipboardList, MapPin, Plus, Route, Timer, Truck } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionTile, ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton } from '@/components/app/kit'
import { AppStagger, MotionRow } from '@/components/app/motion'
import { OrderPill, RoutePill, ShipmentPill } from '@/components/distribution/status'
import { formatCount, formatMoney, timeAgo } from '@/lib/format'
import type { DeliveryRoute, Order, Shipment } from '@/types/distribution.types'

interface Dash { new_orders: number; processing_orders: number; monthly_orders: number; monthly_revenue: number }
interface Report { shipped_shipments: number; delayed_shipments: number; average_delivery_days: number; on_time_percentage: number | null; pending_shipments: number; picked_shipments: number; packed_shipments: number }

export default function DistributionOverviewPage() {
  const router = useRouter()
  const [dash, setDash] = useState<Dash | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [moving, setMoving] = useState<Shipment[]>([])
  const [routes, setRoutes] = useState<DeliveryRoute[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<Dash>('/api/v1/distribution/orders/dashboard/').then((r) => r.success && setDash(r.data ?? null)),
      api.get<Report>('/api/v1/distribution/shipments/tracking_report/').then((r) => r.success && setReport(r.data ?? null)),
      distributionService.orders({ status: undefined, ordering: '-created_at' }).then((o) => setOrders(o.filter((x) => x.status === 'NEW' || x.status === 'PROCESSING').slice(0, 6))),
      distributionService.shipments({ status: 'SHIPPED' }).then((s) => setMoving(s.slice(0, 6))),
      distributionService.routes({ status: 'IN_PROGRESS' }).then(setRoutes),
    ]).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load distribution.')).finally(() => setReady(true))
  }, [])

  const toPack = report ? report.pending_shipments + report.picked_shipments + report.packed_shipments : 0

  return (
    <div className="space-y-6">
      <PageHeader icon={Truck} title="Distribution" description="Orders, shipments, routes and deliveries."
        actions={<Button onClick={() => router.push('/distribution/orders/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New order</Button>} />
      {error && <ErrorBanner title="Couldn’t load distribution" message={error} />}

      {!ready ? <StatGridSkeleton /> : (
        <StatGrid>
          <StatCard label="Orders to handle" value={(dash?.new_orders ?? 0) + (dash?.processing_orders ?? 0)} icon={ClipboardList} tone="warning" hint={`${dash?.new_orders ?? 0} new · ${dash?.processing_orders ?? 0} processing`} href="/distribution/orders" />
          <StatCard label="To pick & pack" value={toPack} icon={MapPin} tone="info" hint="Shipments still in the warehouse" href="/distribution/shipments?status=PENDING" />
          <StatCard label="On the road" value={report?.shipped_shipments ?? 0} icon={Truck} tone="brand" hint={report?.delayed_shipments ? `${report.delayed_shipments} running late` : 'All on time'} href="/distribution/shipments?status=SHIPPED" />
          <StatCard label="On-time delivery" value={report?.on_time_percentage ?? 0} icon={Timer} tone="success"
            format={(n) => (report?.on_time_percentage == null ? '—' : `${n.toFixed(0)}%`)} hint={report?.average_delivery_days ? `${report.average_delivery_days} days on average` : 'No deliveries with an ETA yet'} />
        </StatGrid>
      )}

      {ready && (report?.delayed_shipments ?? 0) > 0 && (
        <Link href="/distribution/shipments?status=SHIPPED" className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger hover:bg-danger/10">
          <AlertTriangle className="h-5 w-5" /><span className="flex-1 font-medium">{report?.delayed_shipments} {report?.delayed_shipments === 1 ? 'shipment is' : 'shipments are'} past the estimated delivery time.</span><ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel icon={ClipboardList} title="Orders waiting" description="New or being processed" bodyClassName="p-0" delay={0.1}
          action={<Link href="/distribution/orders" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">All orders <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {!ready ? <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
            : orders.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No orders waiting. Nice.</p> : (
              <table className="w-full text-sm"><tbody className="divide-y">
                {orders.map((o, i) => (
                  <MotionRow key={o.id} index={i} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/distribution/orders/${o.id}`)}>
                    <td className="px-5 py-3"><p className="font-medium">{o.customer_name}</p><p className="text-xs text-muted-foreground">{o.order_number} · {timeAgo(o.created_at)}</p></td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatMoney(o.total_amount)}</td>
                    <td className="px-5 py-3 text-right"><OrderPill status={o.status} /></td>
                  </MotionRow>
                ))}
              </tbody></table>
            )}
        </Panel>
        <Panel icon={Truck} title="On the road" description="Shipped, not yet delivered" bodyClassName="p-0" delay={0.15}
          action={<Link href="/distribution/tracking" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">Tracking <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {!ready ? <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
            : moving.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing on the road right now.</p> : (
              <table className="w-full text-sm"><tbody className="divide-y">
                {moving.map((s, i) => (
                  <MotionRow key={s.id} index={i} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/distribution/shipments/${s.id}`)}>
                    <td className="px-5 py-3"><p className="font-medium">{s.customer_name ?? s.recipient_name ?? s.shipment_number}</p><p className="text-xs text-muted-foreground">{s.shipment_number}{s.carrier ? ` · ${s.carrier}` : ''}</p></td>
                    <td className="px-3 py-3 text-right text-xs text-muted-foreground">{s.estimated_delivery ? `ETA ${timeAgo(s.estimated_delivery)}` : 'No ETA'}</td>
                    <td className="px-5 py-3 text-right"><ShipmentPill status={s.status} delayed={s.is_delayed} /></td>
                  </MotionRow>
                ))}
              </tbody></table>
            )}
        </Panel>
      </div>

      {routes.length > 0 && (
        <Panel icon={Route} title="Routes on the road" bodyClassName="p-0" delay={0.2}>
          <ul className="divide-y">
            {routes.map((r) => (
              <li key={r.id}><Link href={`/distribution/routes/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                <span><span className="font-medium">{r.route_name}</span><span className="block text-xs text-muted-foreground">{r.driver_name ?? 'No driver'} · {formatCount(r.stop_count)} stops</span></span>
                <RoutePill status={r.status} />
              </Link></li>
            ))}
          </ul>
        </Panel>
      )}

      <AppStagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile href="/distribution/orders" icon={ClipboardList} title="Orders" description="Take, process and ship orders" />
        <ActionTile href="/distribution/shipments" icon={Truck} title="Shipments" description="Pick, pack, ship and deliver" />
        <ActionTile href="/distribution/routes" icon={Route} title="Routes" description="Plan driver runs with stops" />
        <ActionTile href="/distribution/tracking" icon={MapPin} title="Tracking" description="Find any shipment fast" />
      </AppStagger>
      {dash && <p className="text-xs text-muted-foreground">{formatCount(dash.monthly_orders)} orders this month · {formatMoney(dash.monthly_revenue)} shipped or delivered.</p>}
    </div>
  )
}
