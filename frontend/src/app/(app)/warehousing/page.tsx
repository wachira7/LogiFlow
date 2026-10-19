// src/app/(app)/warehousing/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowRightLeft, BarChart3, CheckCircle2, Clock, Plus, Route, Timer, Truck, Wallet, Warehouse } from 'lucide-react'
import { useWarehouseTransfers } from '@/hooks/useWarehousing'
import { Button } from '@/components/ui/button'
import { ActionTile, ErrorBanner, PageHeader, Panel, StatCard, StatGrid, StatGridSkeleton } from '@/components/app/kit'
import { AppStagger, MotionRow } from '@/components/app/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { TransferStatusPill } from '@/components/warehousing/status'
import { formatCount, formatMoney, timeAgo } from '@/lib/format'

export default function WarehousingPage() {
  const router = useRouter()
  const { dashboard, transfers, error, fetchDashboard, fetchTransfers } = useWarehouseTransfers()
  const [ready, setReady] = useState(false)

  const load = () =>
    Promise.allSettled([fetchDashboard(), fetchTransfers()]).finally(() => setReady(true))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const d = dashboard
  const active = transfers.filter((t) => t.status === 'PENDING' || t.status === 'IN_TRANSIT').slice(0, 6)
  const statusTotal = d ? d.pending_transfers + d.in_transit_transfers + d.completed_transfers + d.cancelled_transfers : 0
  const mix = d
    ? [
        { label: 'Pending', value: d.pending_transfers, className: 'bg-warning' },
        { label: 'In transit', value: d.in_transit_transfers, className: 'bg-info' },
        { label: 'Completed', value: d.completed_transfers, className: 'bg-success' },
        { label: 'Cancelled', value: d.cancelled_transfers, className: 'bg-muted-foreground/40' },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Warehouse}
        title="Warehousing"
        description="Move stock between your warehouses and see what’s on the road."
        actions={
          <Button onClick={() => router.push('/warehousing/transfers/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="mr-2 h-4 w-4" />New transfer
          </Button>
        }
      />

      {error && ready && <ErrorBanner title="Couldn’t load warehousing data" message={error} onRetry={load} />}

      {!ready ? (
        <StatGridSkeleton />
      ) : (
        <StatGrid>
          <StatCard label="Awaiting approval" value={d?.pending_transfers ?? 0} icon={Clock} tone="warning" hint="Pending transfers" href="/warehousing/transfers?status=PENDING" />
          <StatCard label="On the road" value={d?.in_transit_transfers ?? 0} icon={Truck} tone="info" hint={`${formatMoney(d?.in_transit_value ?? 0)} of stock`} href="/warehousing/transfers?status=IN_TRANSIT" />
          <StatCard label="Completed" value={d?.completed_transfers ?? 0} icon={CheckCircle2} tone="success" hint={`${d?.monthly_completed ?? 0} this month`} href="/warehousing/transfers?status=COMPLETED" />
          <StatCard label="Avg. transfer time" value={d?.average_transfer_days ?? 0} icon={Timer} tone="brand" hint="From request to receipt"
            format={(n) => (d?.completed_transfers ? (n < 0.05 ? 'Same day' : `${n.toFixed(1)} days`) : '—')} />
        </StatGrid>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          icon={ArrowRightLeft}
          title="Active transfers"
          description="Pending approval or on the road"
          bodyClassName="p-0"
          action={
            <Link href="/warehousing/transfers" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              All transfers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {!ready ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : active.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Route className="h-6 w-6" /></span>
              <p className="font-medium">Nothing in motion</p>
              <p className="max-w-sm text-sm text-muted-foreground">Start a transfer to move stock between warehouses. Approving it takes the stock out of the source straight away.</p>
              <Button size="sm" variant="outline" onClick={() => router.push('/warehousing/transfers/new')}><Plus className="mr-2 h-4 w-4" />New transfer</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {active.map((t, i) => (
                  <MotionRow key={t.id} index={i} onClick={() => router.push(`/warehousing/transfers/${t.id}`)} className="cursor-pointer transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium">{t.transfer_number}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.source_warehouse_name} → {t.destination_warehouse_name}
                      </p>
                    </td>
                    <td className="hidden px-3 py-3 text-right text-muted-foreground sm:table-cell">
                      {formatCount(t.total_quantity)} units
                    </td>
                    <td className="px-3 py-3 text-right"><TransferStatusPill transfer={t} /></td>
                    <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell sm:px-5">{timeAgo(t.initiated_at)}</td>
                  </MotionRow>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel icon={BarChart3} title="Status mix" description={`${formatCount(statusTotal)} transfers all time`} delay={0.15}>
            {!ready ? (
              <Skeleton className="h-24 w-full" />
            ) : statusTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No transfers yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                  {mix.map((m) => (
                    <span key={m.label} className={`${m.className} h-full transition-[width] duration-700`} style={{ width: `${(m.value / statusTotal) * 100}%` }} />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {mix.map((m) => (
                    <li key={m.label} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${m.className}`} />
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="ml-auto font-medium tabular-nums">{m.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
          <Panel icon={Wallet} title="This month" delay={0.2}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{d?.monthly_transfers ?? 0}</p>
                <p className="text-xs text-muted-foreground">Requested</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{d?.monthly_completed ?? 0}</p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <AppStagger className="grid gap-3 sm:grid-cols-3">
        <ActionTile href="/warehousing/transfers" icon={ArrowRightLeft} title="All transfers" description="Search, filter and manage every transfer" />
        <ActionTile href="/warehousing/movements" icon={Route} title="Stock movements" description="Which routes move the most stock" />
        <ActionTile href="/warehousing/reports" icon={BarChart3} title="Reports" description="Shortages and most-moved products" />
      </AppStagger>
    </div>
  )
}
