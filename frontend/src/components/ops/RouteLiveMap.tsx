// src/components/ops/RouteLiveMap.tsx
// A route's stops plus the driver's GPS trail and current position; falls back to the plain stops map.
'use client'

import { useEffect, useState } from 'react'
import { opsService, type RouteTrail } from '@/services/opsService'
import { StopsMap } from '@/components/distribution/StopsMap'
import { timeAgo } from '@/lib/format'
import type { RouteStop } from '@/types/distribution.types'
import { LiveMap } from './LiveMap'

export function RouteLiveMap({ routeId, stops, running, className }: { routeId: string; stops: RouteStop[]; running: boolean; className?: string }) {
  const [trail, setTrail] = useState<RouteTrail | null>(null)
  useEffect(() => {
    let alive = true
    const load = () => opsService.trail(routeId).then((t) => alive && setTrail(t)).catch(() => {})
    load()
    // Until realtime arrives, refresh a running route's position every 30 seconds
    const timer = running ? setInterval(load, 30000) : undefined
    return () => { alive = false; if (timer) clearInterval(timer) }
  }, [routeId, running])

  if (!trail || trail.trail.length === 0) return <StopsMap stops={stops} className={className} />
  const last = trail.last_position!
  const stale = Date.now() - new Date(last.recorded_at).getTime() > 15 * 60000
  return (
    <div className={`relative ${className}`}>
      <LiveMap className="h-full"
        markers={running ? [{ id: 'unit', latitude: last.latitude, longitude: last.longitude, label: trail.vehicle ?? trail.driver ?? 'Driver', sub: timeAgo(last.recorded_at), stale }] : []}
        stops={trail.stops.map((s) => ({ id: s.id, number: s.number, latitude: s.latitude, longitude: s.longitude, status: s.status, label: `${s.shipment_number} · ${s.address}` }))}
        trail={trail.trail.map((p) => [p.latitude, p.longitude] as [number, number])} />
      {running && <span className="absolute bottom-2 left-2 z-[500] rounded-full bg-card/90 px-2.5 py-1 text-xs shadow">{stale ? 'Last seen' : 'Live'} · {timeAgo(last.recorded_at)}</span>}
    </div>
  )
}
