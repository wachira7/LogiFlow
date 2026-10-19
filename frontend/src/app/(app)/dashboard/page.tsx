// src/app/(app)/dashboard/page.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, ArrowRightLeft, BarChart3, ClipboardList, Factory, PackagePlus, Truck, UserPlus, Users, Wallet, Warehouse,
} from 'lucide-react'
import { PrivateRoute } from '@/components/auth/AuthGuard'
import { useAuth } from '@/context/AuthContext'
import { useDashboard } from '@/hooks/useDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionTile, ErrorBanner, StatCard, StatGrid, StatGridSkeleton } from '@/components/app/kit'
import { AppStagger } from '@/components/app/motion'
import { Greeting } from '@/components/dashboard/Greeting'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { ActivityFeed, AlertsList, MetricsStrip, SetupChecklist } from '@/components/dashboard/Feeds'
import { formatCount, formatMoney } from '@/lib/format'
import type { DashboardOverview } from '@/types/dashboard.types'

/** One sentence that sums up the day, from real numbers. */
function summarize(d: DashboardOverview) {
  const s = d.stats
  const parts: string[] = []
  if (s.production_in_progress) parts.push(`${s.production_in_progress} production ${s.production_in_progress === 1 ? 'run' : 'runs'} on the floor`)
  if (s.transfers_in_transit) parts.push(`${s.transfers_in_transit} ${s.transfers_in_transit === 1 ? 'transfer' : 'transfers'} on the road`)
  if (s.active_shipments) parts.push(`${s.active_shipments} ${s.active_shipments === 1 ? 'shipment' : 'shipments'} out`)
  if (s.pending_orders) parts.push(`${s.pending_orders} ${s.pending_orders === 1 ? 'order' : 'orders'} to process`)
  const urgent = d.alerts.filter((a) => a.type === 'critical' || a.type === 'warning').length
  const lead = parts.length ? `Right now: ${parts.join(', ')}.` : 'Things are quiet right now.'
  return urgent ? `${lead} ${urgent} ${urgent === 1 ? 'thing needs' : 'things need'} your attention.` : lead
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading dashboard">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <StatGridSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { data, isLoading, isRefreshing, error, reload } = useDashboard()
  const isPlatformAdmin = !!(user?.is_platform_admin || user?.role === 'platform_admin')

  useEffect(() => {
    if (isPlatformAdmin) router.replace('/platform-admin')
  }, [isPlatformAdmin, router])

  if (isPlatformAdmin || isLoading) return <DashboardSkeleton />

  if (!user?.company_id) {
    return <ErrorBanner title="No company on this account" message="Finish company setup or ask your company owner for an invitation." />
  }

  if (!data) return <ErrorBanner title="Couldn’t load the dashboard" message={error ?? 'Please try again.'} onRetry={reload} />

  const s = data.stats
  const firstName = user.first_name || data.user.name.split(' ')[0]
  const setupLeft = data.setup_progress.completed_steps < data.setup_progress.total_steps
  const isOwner = !!user.is_company_owner

  return (
    <div className="space-y-6">
      <Greeting
        firstName={firstName}
        company={data.company.name}
        summary={summarize(data)}
        updatedAt={data.generated_at}
        refreshing={isRefreshing}
        onRefresh={reload}
      />

      {error && <ErrorBanner title="Showing the last figures we loaded" message={error} onRetry={reload} />}

      <StatGrid>
        <StatCard label="Stock value" value={s.stock_value} icon={Wallet} tone="brand" hint={`${formatCount(s.stock_units)} units on hand`} href="/inventory" format={(n) => formatMoney(n, undefined, { maximumFractionDigits: 0 })} />
        <StatCard label="Orders to process" value={s.pending_orders} icon={ClipboardList} tone="warning" hint="New or processing" href="/distribution/orders" />
        <StatCard label="Shipments out" value={s.active_shipments} icon={Truck} tone="info" hint="Not yet delivered" href="/distribution/shipments" />
        <StatCard label="In production" value={s.production_in_progress} icon={Factory} tone="success" hint={`${s.production_planned} planned next`} href="/production" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActivityChart trend={data.trend ?? []} />
          <MetricsStrip metrics={data.performance_metrics} />
          {setupLeft && <SetupChecklist progress={data.setup_progress} />}
        </div>
        <div className="space-y-6">
          <AlertsList alerts={data.alerts} />
          <ActivityFeed items={data.recent_activity} />
        </div>
      </div>

      <AppStagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile href="/inventory/products/new" icon={PackagePlus} title="Add a product" description="With opening stock" />
        <ActionTile href="/warehousing/transfers/new" icon={ArrowRightLeft} title="Move stock" description={s.transfers_pending ? `${s.transfers_pending} transfers awaiting approval` : 'Between warehouses'} />
        <ActionTile href="/production/orders/new" icon={Factory} title="Plan production" description="Steps, materials and output" />
        {isOwner ? (
          <ActionTile href="/company/users" icon={UserPlus} title="Invite your team" description={`${s.total_users} ${s.total_users === 1 ? 'member' : 'members'} so far`} />
        ) : (
          <ActionTile href="/analytics" icon={BarChart3} title="Analytics" description="Trends across every module" />
        )}
      </AppStagger>

      {s.low_stock_items > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          {s.low_stock_items} stock {s.low_stock_items === 1 ? 'line is' : 'lines are'} at or below the reorder point.
          <Link href="/inventory/inventory-items" className="font-medium text-brand hover:underline">Review stock</Link>
          <span className="hidden sm:inline">· <Warehouse className="inline h-3 w-3" /> {s.transfers_in_transit} transfers on the road · <Users className="inline h-3 w-3" /> {s.total_users} team</span>
        </p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <PrivateRoute>
      <DashboardContent />
    </PrivateRoute>
  )
}
