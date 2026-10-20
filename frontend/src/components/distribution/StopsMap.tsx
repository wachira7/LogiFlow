// src/components/distribution/StopsMap.tsx
'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { RouteStop } from '@/types/distribution.types'

const Inner = dynamic(() => import('./StopsMapInner'), { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> })

/** Numbered stops on a map, joined in order. Stops without coordinates are listed but not drawn. */
export function StopsMap({ stops, className = 'h-72' }: { stops: RouteStop[]; className?: string }) {
  const located = stops.filter((s) => s.latitude && s.longitude).length
  return (
    <div className={`relative ${className}`}>
      {located ? <Inner stops={stops} /> : (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 text-center text-sm text-muted-foreground">
          <MapPin className="h-6 w-6 text-brand" />
          {stops.length ? 'These addresses couldn’t be placed on the map yet.' : 'Add stops to see the route on the map.'}
        </div>
      )}
      {located > 0 && located < stops.length && (
        <span className="absolute bottom-2 left-2 z-[500] rounded-full bg-card/90 px-2 py-0.5 text-xs shadow">{stops.length - located} stop(s) not on the map</span>
      )}
    </div>
  )
}
