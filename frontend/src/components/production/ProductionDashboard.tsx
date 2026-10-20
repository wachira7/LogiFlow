// src/components/production/ProductionDashboard.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Clock, Factory, Layers, ListChecks, Plus, Timer } from 'lucide-react'
import { useProductionOrders } from '@/hooks/useProduction'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionTile, ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton } from '@/components/app/kit'
import { AppStagger, MotionRow } from '@/components/app/motion'
import { formatCount, timeAgo } from '@/lib/format'
import { OrderStatusPill, ProgressRing } from './status'

export function ProductionDashboard() {
  const router = useRouter()
  const { orders, dashboard, materialRequirements, error, fetchOrders, fetchDashboard, fetchMaterialRequirements } = useProductionOrders()
  const [ready, setReady] = useState(false)

  const load = () =>
    Promise.allSettled([fetchDashboard(), fetchMaterialRequirements(), fetchOrders({ ordering: '-created_at' })]).finally(() => setReady(true))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const d = dashboard
  const active = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'PLANNED').slice(0, 6)
  const shortages = (materialRequirements?.material_requirements ?? []).filter((m) => m.shortage > 0)
  const cycle = d?.average_cycle_hours ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Factory}
        title="Production"
        description="Plan runs, track each step on the floor, and stock the finished goods."
        actions={
          <Button onClick={() => router.push('/production/orders/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="mr-2 h-4 w-4" />New production order
          </Button>
        }
      />

      {error && ready && <ErrorBanner title="Couldn’t load production data" message={error} onRetry={load} />}

      {!ready ? (
        <StatGridSkeleton />
      ) : (
        <StatGrid>
          <StatCard label="In production" value={d?.in_progress_orders ?? 0} icon={Factory} tone="info" hint={`${d?.steps_in_progress ?? 0} steps being worked on`} href="/production/orders?status=IN_PROGRESS" />
          <StatCard label="Planned" value={d?.planned_orders ?? 0} icon={Clock} tone="warning" hint="Waiting to start" href="/production/orders?status=PLANNED" />
          <StatCard label="Completed this month" value={d?.monthly_completed ?? 0} icon={CheckCircle2} tone="success" hint={`${formatCount(d?.monthly_units ?? 0)} units made`} href="/production/orders?status=COMPLETED" />
          <StatCard
            label="Avg. cycle time" value={cycle} icon={Timer} tone="brand" hint="Start to finish"
            format={(n) => (!d?.completed_orders ? '—' : cycle < 0.1 ? '< 0.1 h' : cycle >= 48 ? `${(n / 24).toFixed(1)} days` : `${n.toFixed(1)} h`)}
          />
        </StatGrid>
      )}

      {ready && (d?.overdue_orders ?? 0) > 0 && (
        <Link href="/production/orders?status=IN_PROGRESS" className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger transition-colors hover:bg-danger/10">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="flex-1"><span className="font-medium">{d?.overdue_orders} {d?.overdue_orders === 1 ? 'order is' : 'orders are'} past the target end date.</span> Review them to keep deliveries on time.</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          icon={ClipboardList}
          title="On the floor"
          description="Orders in production or planned next"
          bodyClassName="p-0"
          action={<Link href="/production/orders" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">All orders <ArrowRight className="h-3.5 w-3.5" /></Link>}
        >
          {!ready ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Factory className="h-6 w-6" /></span>
              <p className="font-medium">Nothing scheduled</p>
              <p className="max-w-sm text-sm text-muted-foreground">Create a production order with its steps and raw materials. Starting it takes the materials from stock; completing it stocks the finished goods.</p>
              <Button size="sm" variant="outline" onClick={() => router.push('/production/orders/new')}><Plus className="mr-2 h-4 w-4" />New production order</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {active.map((o, i) => (
                  <MotionRow key={o.id} index={i} onClick={() => router.push(`/production/orders/${o.id}`)} className="cursor-pointer transition-colors hover:bg-muted/50">
                    <td className="w-16 py-3 pl-4 sm:pl-5"><ProgressRing value={o.progress_percentage} size={42} stroke={4} /></td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{o.product_name} <span className="font-normal text-muted-foreground">× {formatCount(o.quantity)}</span></p>
                      <p className="text-xs text-muted-foreground">{o.order_number} · {o.steps_done}/{o.steps_total} steps</p>
                    </td>
                    <td className="px-3 py-3 text-right"><OrderStatusPill status={o.status} /></td>
                    <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell sm:px-5">{timeAgo(o.start_date ?? o.created_at)}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          icon={Layers}
          title="Material shortages"
          description="For orders not started yet"
          delay={0.15}
          bodyClassName="p-0"
          action={<Link href="/production/materials" className="text-sm font-medium text-brand hover:underline">Details</Link>}
        >
          {!ready ? (
            <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : shortages.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-6 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-muted-foreground">Every planned order has the materials it needs.</span>
            </div>
          ) : (
            <ul className="divide-y">
              {shortages.slice(0, 5).map((m) => (
                <li key={`${m.product_id}-${m.warehouse_id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.product_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.warehouse_name} · have {formatCount(m.available_stock)}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-danger">−{formatCount(m.shortage)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AppStagger className="grid gap-3 sm:grid-cols-3">
        <ActionTile href="/production/orders" icon={ClipboardList} title="Production orders" description="Plan, start and complete runs" />
        <ActionTile href="/production/steps" icon={ListChecks} title="Work queue" description="Every step being worked on or up next" />
        <ActionTile href="/production/materials" icon={Layers} title="Materials" description="What upcoming runs need from stock" />
      </AppStagger>
    </div>
  )
}
