// src/components/ops/LiveMap.tsx
'use client'

import dynamic from 'next/dynamic'
import { Satellite } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export type MapMarker = { id: string; latitude: number; longitude: number; label: string; sub?: string; heading?: number | null; stale?: boolean; tone?: 'brand' | 'warning'; glyph?: 'truck' }
export type MapStop = { id: string; number: number; latitude: number | null; longitude: number | null; status: string; label: string }

const Inner = dynamic(() => import('./LiveMapInner'), { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-xl" /> })

/** Vehicles and drivers at their last position, optionally with a route's stops and GPS trail. OpenStreetMap tiles. */
export function LiveMap({ markers, stops, trail, focus, onSelect, className = 'h-96', empty = 'No live positions yet. Drivers appear here once they share their location from the driver app.' }: {
  markers: MapMarker[]; stops?: MapStop[]; trail?: [number, number][]; focus?: [number, number] | null; onSelect?: (id: string) => void; className?: string; empty?: string
}) {
  const hasPoints = markers.length > 0 || (stops ?? []).some((s) => s.latitude != null) || (trail ?? []).length > 0
  return (
    <div className={`relative isolate ${className}`}>
      {hasPoints ? <Inner markers={markers} stops={stops} trail={trail} focus={focus} onSelect={onSelect} /> : (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 text-center text-sm text-muted-foreground">
          <Satellite className="h-6 w-6 text-brand" />{empty}
        </div>
      )}
    </div>
  )
}
