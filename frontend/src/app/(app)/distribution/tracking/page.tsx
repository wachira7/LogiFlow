// src/app/(app)/distribution/tracking/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Loader2, MapPin, Search, Truck } from 'lucide-react'
import { distributionService } from '@/services/distributionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBanner, PageHeader, Panel, TableSkeleton } from '@/components/app/kit'
import { AppStagger, AppStaggerItem, FadeIn } from '@/components/app/motion'
import { ShipmentPill, ShipmentProgress } from '@/components/distribution/status'
import { formatDateTime, timeAgo } from '@/lib/format'
import type { Shipment, ShipmentDetail } from '@/types/distribution.types'

export default function TrackingPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<ShipmentDetail | null>(null)
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [moving, setMoving] = useState<Shipment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    distributionService.shipments({ status: 'SHIPPED', ordering: 'estimated_delivery' }).then(setMoving).catch((err) => setError(err instanceof Error ? err.message : 'Couldn’t load shipments.'))
  }, [])

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = q.trim()
    if (!value) return
    setSearching(true); setNotFound(null); setFound(null)
    try {
      setFound(await distributionService.track(value))
    } catch {
      // Not a tracking number: try shipment/order numbers too
      const hits = await distributionService.shipments({ search: value }).catch(() => [])
      if (hits.length === 1) router.push(`/distribution/shipments/${hits[0].id}`)
      else setNotFound(hits.length ? `${hits.length} shipments match “${value}”. Search the shipments list to choose one.` : `Nothing found for “${value}”.`)
    } finally {
      setSearching(false)
    }
  }

  const late = (moving ?? []).filter((s) => s.is_delayed)
  return (
    <div className="space-y-6">
      <PageHeader icon={MapPin} title="Tracking" description="Look up any shipment by tracking, shipment or order number." />
      <FadeIn delay={0.05}>
        <form onSubmit={lookup} className="flex gap-2 rounded-2xl border bg-gradient-to-br from-brand/10 via-card to-card p-4 shadow-sm sm:p-5">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. TRK-1042 or SH-20261019-003" className="h-11 bg-card pl-9 text-base" aria-label="Tracking number" /></div>
          <Button type="submit" disabled={searching} className="h-11 bg-brand px-5 text-brand-foreground hover:bg-brand/90">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}</Button>
        </form>
      </FadeIn>
      {notFound && <p className="text-sm text-muted-foreground">{notFound}</p>}
      {found && (
        <Panel delay={0} title={<span className="flex items-center gap-2">{found.shipment_number}<ShipmentPill status={found.status} delayed={found.is_delayed} /></span>}
          description={`${found.customer_name ?? found.recipient_name ?? ''}${found.carrier ? ` · ${found.carrier}` : ''}`}
          action={<Link href={`/distribution/shipments/${found.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">Open <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          <ShipmentProgress status={found.status} />
          <p className="mt-4 text-sm text-muted-foreground">{found.actual_delivery ? `Delivered ${formatDateTime(found.actual_delivery)}` : found.estimated_delivery ? `Expected ${formatDateTime(found.estimated_delivery)}` : 'No delivery estimate yet'}{found.destination_address ? ` · to ${found.destination_address}` : ''}</p>
        </Panel>
      )}
      {error && <ErrorBanner title="Couldn’t load shipments" message={error} />}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4 text-brand" />On the road now{moving ? ` (${moving.length})` : ''}{late.length > 0 && <span className="flex items-center gap-1 text-danger"><AlertTriangle className="h-3.5 w-3.5" />{late.length} late</span>}</h2>
        {!moving ? <TableSkeleton rows={3} cols={3} /> : moving.length === 0 ? <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing is on the road right now.</p> : (
          <AppStagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {moving.map((s) => (
              <AppStaggerItem key={s.id}>
                <Link href={`/distribution/shipments/${s.id}`} className={`card-lift block rounded-xl border bg-card p-4 ${s.is_delayed ? 'border-danger/40' : ''}`}>
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{s.customer_name ?? s.recipient_name ?? s.shipment_number}</p><ShipmentPill status={s.status} delayed={s.is_delayed} /></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{s.shipment_number}{s.tracking_number ? ` · ${s.tracking_number}` : ''}{s.carrier ? ` · ${s.carrier}` : ''}</p>
                  <p className="mt-2 text-xs">{s.estimated_delivery ? <>ETA <span className="font-medium">{timeAgo(s.estimated_delivery)}</span></> : 'No ETA'} · left {s.shipping_date ? timeAgo(s.shipping_date) : '—'}</p>
                </Link>
              </AppStaggerItem>
            ))}
          </AppStagger>
        )}
      </div>
    </div>
  )
}
