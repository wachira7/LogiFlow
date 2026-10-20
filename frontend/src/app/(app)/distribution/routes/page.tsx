// src/app/(app)/distribution/routes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, Route, User } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorBanner, FilterChips, PageHeader, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { RoutePill } from '@/components/distribution/status'
import { formatDay, timeAgo } from '@/lib/format'
import type { DeliveryRoute, RouteStatus } from '@/types/distribution.types'

const FILTERS = [['', 'All'], ['PLANNED', 'Planned'], ['IN_PROGRESS', 'On the road'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']] as const

export default function RoutesPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'' | RouteStatus>('')
  const [rows, setRows] = useState<DeliveryRoute[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { distributionService.routes({ status: status || undefined }).then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load routes.')) }, [status])

  return (
    <div className="space-y-6">
      <PageHeader icon={Route} title="Routes" description="Driver runs: a list of stops delivered in order."
        actions={<Button onClick={() => router.push('/distribution/routes/new')} className="btn-shine bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-2 h-4 w-4" />New route</Button>} />
      <FadeIn delay={0.05}><FilterChips id="routes" options={FILTERS} value={status} onChange={setStatus} /></FadeIn>
      {error && <ErrorBanner title="Couldn’t load routes" message={error} />}
      {!rows ? <TableSkeleton rows={4} cols={3} /> : rows.length === 0 ? (
        <EmptyState icon={<Route />} title="No routes here" description="Plan a route, add shipments as stops, then start it when the driver leaves." />
      ) : (
        <AppStagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <AppStaggerItem key={r.id}>
              <Link href={`/distribution/routes/${r.id}`} className="card-lift flex h-full flex-col gap-3 rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-2"><p className="font-semibold">{r.route_name}</p><RoutePill status={r.status} /></div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><User className="h-3.5 w-3.5" />{r.driver_name ?? 'No driver yet'}{r.vehicle_id ? ` · ${r.vehicle_id}` : ''}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-brand" />{r.stop_count} {r.stop_count === 1 ? 'stop' : 'stops'}{r.total_distance ? ` · ${Number(r.total_distance)} km` : ''}</span>
                  <span>{r.start_time ? `Started ${timeAgo(r.start_time)}` : `Created ${formatDay(r.created_at)}`}</span>
                </div>
              </Link>
            </AppStaggerItem>
          ))}
        </AppStagger>
      )}
    </div>
  )
}
